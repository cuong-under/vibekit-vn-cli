// lib/download.js — download tarball, verify sha256, extract to _vibekitvn/
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { x as tarExtract } from 'tar';

const DOWNLOAD_TIMEOUT_MS = 60_000; // 60s per attempt
const MAX_ATTEMPTS = 3;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Download tarball from signed URL, verify sha256, extract to <cwd>/_vibekitvn/
 * Auto-retry transient network errors (3 lần, exponential backoff).
 *
 * @param {object} opts
 * @param {string} opts.url       presigned download URL
 * @param {string} opts.sha256    expected sha256 (hex)
 * @param {string} [opts.cwd]     defaults to process.cwd()
 * @param {(msg:string,pct?:number)=>void} [opts.onProgress]
 * @returns {Promise<{extractedTo: string, version?: string}>}
 */
export async function downloadAndExtract({ url, sha256, cwd = process.cwd(), onProgress }) {
  if (!url) throw new Error('Missing download URL');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vibekitvn-'));
  const tarballPath = path.join(tmpDir, 'skills.tgz');

  let lastErr;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      onProgress?.(
        attempt === 1
          ? 'Đang tải skill content…'
          : `Đang thử lại tải… (lần ${attempt}/${MAX_ATTEMPTS})`
      );
      await downloadOnce({ url, sha256, tarballPath, onProgress });
      lastErr = null;
      break;
    } catch (e) {
      lastErr = e;
      // SHA256 mismatch = file đã download trọn vẹn nhưng sai → không retry
      if (e?.code === 'SHA256_MISMATCH') break;
      if (attempt < MAX_ATTEMPTS) {
        const wait = 1000 * Math.pow(2, attempt - 1); // 1s, 2s
        await sleep(wait);
      }
    }
  }
  if (lastErr) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    throw lastErr;
  }

  // Extract to <cwd>/_vibekitvn/
  const targetDir = path.join(cwd, '_vibekitvn');
  fs.mkdirSync(targetDir, { recursive: true });

  onProgress?.('Đang giải nén…');
  await tarExtract({
    file: tarballPath,
    cwd: targetDir,
    // Strip top-level directory if tarball wraps in one
    // (we'll set this convention in the build script)
  });

  // Cleanup tmp
  fs.rmSync(tmpDir, { recursive: true, force: true });

  return { extractedTo: targetDir };
}

/**
 * Một lần download + verify sha256. Throw để retry caller xử lý.
 * Errors có `e.code = 'SHA256_MISMATCH'` để báo "không retry".
 */
async function downloadOnce({ url, sha256, tarballPath, onProgress }) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), DOWNLOAD_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ac.signal });
    if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);

    const total = Number(res.headers.get('content-length') || 0);
    let received = 0;
    const hash = crypto.createHash('sha256');
    const ws = fs.createWriteStream(tarballPath);
    const nodeStream = Readable.fromWeb(res.body);

    nodeStream.on('data', (chunk) => {
      hash.update(chunk);
      received += chunk.length;
      if (total && onProgress) {
        const pct = Math.round((received / total) * 100);
        onProgress(`Đang tải… ${pct}%`, pct);
      }
    });
    await pipeline(nodeStream, ws);

    const actualSha = hash.digest('hex');
    if (sha256 && actualSha !== sha256) {
      const err = new Error(
        `SHA256 mismatch — expected ${sha256}, got ${actualSha}. Tarball corrupted or tampered.`
      );
      err.code = 'SHA256_MISMATCH';
      throw err;
    }
  } catch (e) {
    if (e?.name === 'AbortError') {
      throw new Error(`Download timeout sau ${DOWNLOAD_TIMEOUT_MS / 1000}s`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
