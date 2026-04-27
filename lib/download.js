// lib/download.js — download tarball, verify sha256, extract to _vibekitvn/
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { x as tarExtract } from 'tar';

/**
 * Download tarball from signed URL, verify sha256, extract to <cwd>/_vibekitvn/
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

  onProgress?.('Đang tải skill content…');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);

  const total = Number(res.headers.get('content-length') || 0);
  let received = 0;
  const hash = crypto.createHash('sha256');

  const ws = fs.createWriteStream(tarballPath);
  const reader = res.body;
  // Web ReadableStream → Node Readable
  const nodeStream = Readable.fromWeb(reader);

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
    fs.rmSync(tmpDir, { recursive: true, force: true });
    throw new Error(
      `SHA256 mismatch — expected ${sha256}, got ${actualSha}. Tarball corrupted or tampered.`
    );
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
