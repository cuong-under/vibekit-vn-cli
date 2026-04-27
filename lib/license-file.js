// lib/license-file.js — read/write the local .vibekitvn-license file
//
// Stored in the project root (cwd) so different projects can use different
// licenses (rare but supported). Falls back to ~/.vibekitvn/license.json
// if cwd is not writable.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const LOCAL_FILE = '.vibekitvn-license';
const HOME_DIR = path.join(os.homedir(), '.vibekitvn');
const HOME_FILE = path.join(HOME_DIR, 'license.json');

/**
 * @returns {{ license_key: string, machine_id: string, activated_at: string,
 *            version?: string, source?: 'local'|'home' } | null}
 */
export function readLicense(cwd = process.cwd()) {
  const local = path.join(cwd, LOCAL_FILE);
  if (fs.existsSync(local)) {
    return { ...parse(local), source: 'local' };
  }
  if (fs.existsSync(HOME_FILE)) {
    return { ...parse(HOME_FILE), source: 'home' };
  }
  return null;
}

/**
 * Write to cwd if writable, otherwise to ~/.vibekitvn/license.json.
 */
export function writeLicense(data, cwd = process.cwd()) {
  const payload = {
    license_key: data.license_key,
    machine_id: data.machine_id,
    activated_at: data.activated_at || new Date().toISOString(),
    version: data.version || null,
  };
  const local = path.join(cwd, LOCAL_FILE);
  try {
    fs.writeFileSync(local, JSON.stringify(payload, null, 2));
    return { path: local, location: 'local' };
  } catch {
    fs.mkdirSync(HOME_DIR, { recursive: true });
    fs.writeFileSync(HOME_FILE, JSON.stringify(payload, null, 2));
    return { path: HOME_FILE, location: 'home' };
  }
}

export function deleteLicense(cwd = process.cwd()) {
  const local = path.join(cwd, LOCAL_FILE);
  if (fs.existsSync(local)) fs.unlinkSync(local);
  if (fs.existsSync(HOME_FILE)) fs.unlinkSync(HOME_FILE);
}

function parse(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    throw new Error(`Failed to parse license file ${file}: ${e.message}`);
  }
}
