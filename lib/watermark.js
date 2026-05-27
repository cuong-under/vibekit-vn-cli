// lib/watermark.js — stamp extracted skill bundle with license fingerprint
//
// Why: skill content is plain markdown shipped to user's machine. We can't
// prevent copying, but we CAN make every leaked copy traceable to the buyer.
//
// What gets stamped:
//   1. Every .md file under _vibekitvn/skills/ → HTML comment at EOF:
//        <!-- vbk-wm: <license_fingerprint> · <hmac8> -->
//      hmac8 = first 8 hex chars of HMAC-SHA256(license_key, relative_path).
//      Path-bound HMAC means even if attacker grep-removes one marker, the
//      others still trace; and renaming files doesn't help (HMAC won't match).
//   2. _vibekitvn/manifest.json → `watermark` field with non-secret metadata.
//   3. _vibekitvn/.watermark.json → standalone audit file.
//
// AI safety: HTML comments at EOF are ignored by markdown renderers and do
// not influence skill body context for AI IDEs (Claude/Cursor/Windsurf treat
// rules files as text but comments are visually invisible).
//
// Idempotency: re-running on already-watermarked file replaces the marker
// (so re-activate after license rotation updates the trace).

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const MARKER_PREFIX = '<!-- vbk-wm:';
const MARKER_RE = /\n?<!-- vbk-wm:[^\n]*-->\s*$/;

/**
 * Compute path-bound HMAC for a file.
 * @returns {string} 8 hex chars
 */
export function computeFileHmac(licenseKey, relPath) {
  const normalized = relPath.split(path.sep).join('/');
  return crypto
    .createHmac('sha256', licenseKey)
    .update(normalized)
    .digest('hex')
    .slice(0, 8);
}

/**
 * Recursively collect all .md files under a directory.
 */
function walkMd(root, base = root, out = []) {
  if (!fs.existsSync(root)) return out;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      walkMd(full, base, out);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      out.push({ full, rel: path.relative(base, full) });
    }
  }
  return out;
}

/**
 * Stamp a single .md file with watermark (idempotent).
 * @returns {boolean} true if file was modified
 */
function stampFile(filePath, relPath, licenseKey) {
  const hmac = computeFileHmac(licenseKey, relPath);
  const marker = `${MARKER_PREFIX} ${fingerprintLicense(licenseKey)} · ${hmac} -->`;

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return false;
  }

  // Strip any existing watermark line at EOF (idempotent / re-watermark)
  const stripped = content.replace(MARKER_RE, '').replace(/\s+$/, '');
  const next = `${stripped}\n\n${marker}\n`;

  if (next === content) return false;
  fs.writeFileSync(filePath, next, 'utf8');
  return true;
}

/**
 * Apply watermark to extracted bundle.
 *
 * @param {object} opts
 * @param {string} opts.bundleRoot   absolute path to _vibekitvn/
 * @param {string} opts.licenseKey
 * @param {string} [opts.machineId]
 * @returns {{ stamped: number, total: number }}
 */
export function applyWatermark({ bundleRoot, licenseKey, machineId }) {
  if (!licenseKey) throw new Error('applyWatermark: missing licenseKey');
  if (!fs.existsSync(bundleRoot)) {
    throw new Error(`applyWatermark: bundleRoot not found: ${bundleRoot}`);
  }

  const skillsDir = path.join(bundleRoot, 'skills');
  const files = walkMd(skillsDir, bundleRoot);

  let stamped = 0;
  for (const { full, rel } of files) {
    if (stampFile(full, rel, licenseKey)) stamped++;
  }

  const appliedAt = new Date().toISOString();

  // Stamp manifest.json
  const manifestPath = path.join(bundleRoot, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    try {
      const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      m.watermark = {
        license_fingerprint: fingerprintLicense(licenseKey),
        machine_id: machineId || null,
        applied_at: appliedAt,
        files_stamped: stamped,
      };
      fs.writeFileSync(manifestPath, JSON.stringify(m, null, 2) + '\n', 'utf8');
    } catch {
      // best-effort
    }
  }

  // Standalone audit file
  const auditPath = path.join(bundleRoot, '.watermark.json');
  fs.writeFileSync(
    auditPath,
    JSON.stringify(
      {
        license_fingerprint: fingerprintLicense(licenseKey),
        machine_id: machineId || null,
        applied_at: appliedAt,
        files_stamped: stamped,
        files_total: files.length,
        notice:
          'This bundle is licensed to the fingerprint above. Redistribution is prohibited per LICENSE.md. ' +
          'Each .md file is HMAC-stamped for forensic traceability.',
      },
      null,
      2
    ) + '\n',
    'utf8'
  );

  return { stamped, total: files.length };
}

/**
 * Extract watermark info from a (possibly leaked) bundle directory.
 * Returns license fingerprint candidates found across files.
 */
export function readWatermarks(bundleRoot) {
  const skillsDir = path.join(bundleRoot, 'skills');
  const files = walkMd(skillsDir, bundleRoot);
  const counts = new Map();
  for (const { full } of files) {
    try {
      const content = fs.readFileSync(full, 'utf8');
      const m = content.match(/<!-- vbk-wm: (\S+) · ([0-9a-f]{8}) -->/);
      if (m) {
        const fingerprint = m[1];
        counts.set(fingerprint, (counts.get(fingerprint) || 0) + 1);
      }
    } catch {
      // skip
    }
  }
  return [...counts.entries()]
    .map(([license_fingerprint, count]) => ({ license_fingerprint, count }))
    .sort((a, b) => b.count - a.count);
}

function fingerprintLicense(licenseKey) {
  return crypto.createHash('sha256').update(String(licenseKey)).digest('hex').slice(0, 16);
}
