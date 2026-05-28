// lib/license-file.js — read/write machine-level license state
//
// License is machine-scoped, not project-scoped. New installs store it in
// ~/.vibekitvn/license.json. We still read the old project-local file as a
// legacy fallback so existing users can update without losing state.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const LOCAL_FILE = '.vibekitvn-license';

function homeDir() {
  return path.join(os.homedir(), '.vibekitvn');
}

function homeFile() {
  return path.join(homeDir(), 'license.json');
}

export function getLicensePaths(cwd = process.cwd()) {
  return {
    homeDir: homeDir(),
    homeFile: homeFile(),
    localFile: path.join(cwd, LOCAL_FILE),
  };
}

/**
 * @returns {{ license_key: string, machine_id: string, activated_at: string,
 *            version?: string, source?: 'home'|'local-legacy' } | null}
 */
export function readLicense(cwd = process.cwd()) {
  const hf = homeFile();
  if (fs.existsSync(hf)) {
    return { ...parse(hf), source: 'home' };
  }
  const local = path.join(cwd, LOCAL_FILE);
  if (fs.existsSync(local)) {
    return { ...parse(local), source: 'local-legacy' };
  }
  return null;
}

/**
 * Write machine-level license state to ~/.vibekitvn/license.json.
 */
export function writeLicense(data, cwd = process.cwd()) {
  const payload = {
    license_key: data.license_key,
    machine_id: data.machine_id,
    activated_at: data.activated_at || new Date().toISOString(),
    version: data.version || null,
  };
  const hd = homeDir();
  const hf = homeFile();
  fs.mkdirSync(hd, { recursive: true });
  const tmp = hf + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(payload, null, 2));
  fs.renameSync(tmp, hf);
  ensureGitignore(cwd);
  return { path: hf, location: 'home' };
}

/**
 * Ensure project-level .gitignore loại trừ artifact của vibekitvn.
 * - `.vibekitvn-license` (chứa license key – KHÔNG commit)
 * - `_vibekitvn/` (skill content extracted, có watermark)
 * - `_vibekitvn-output/` (AI sinh PRD/design, không nên trong source)
 *
 * Best-effort: nếu không có git repo / không write được .gitignore → skip silent.
 */
export function ensureGitignore(cwd = process.cwd()) {
  const ENTRIES = ['.vibekitvn-license', '_vibekitvn/', '_vibekitvn-output/'];
  const gitDir = path.join(cwd, '.git');
  const gitignorePath = path.join(cwd, '.gitignore');
  // Chỉ thao tác nếu là git repo (có .git dir hoặc đã có .gitignore)
  const isGitRepo = fs.existsSync(gitDir);
  const hasGitignore = fs.existsSync(gitignorePath);
  if (!isGitRepo && !hasGitignore) return { skipped: 'not_git_repo' };

  let content = '';
  try {
    if (hasGitignore) content = fs.readFileSync(gitignorePath, 'utf8');
  } catch {
    return { skipped: 'read_failed' };
  }

  const lines = content.split(/\r?\n/);
  const present = new Set(lines.map((l) => l.trim()));
  const missing = ENTRIES.filter((e) => !present.has(e));
  if (missing.length === 0) return { added: [] };

  const block =
    (content && !content.endsWith('\n') ? '\n' : '') +
    '\n# vibekitvn (auto-added)\n' +
    missing.join('\n') +
    '\n';
  try {
    fs.appendFileSync(gitignorePath, block);
    return { added: missing };
  } catch {
    return { skipped: 'write_failed' };
  }
}

export function deleteLicense(cwd = process.cwd()) {
  const local = path.join(cwd, LOCAL_FILE);
  const hf = homeFile();
  if (fs.existsSync(hf)) fs.unlinkSync(hf);
  if (fs.existsSync(local)) fs.unlinkSync(local);
}

function parse(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    throw new Error(`Failed to parse license file ${file}: ${e.message}`);
  }
}
