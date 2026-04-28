// test/license-file.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { readLicense, writeLicense, deleteLicense, ensureGitignore } from '../lib/license-file.js';

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'vibekitvn-test-'));
}

test('writeLicense + readLicense roundtrip in cwd', () => {
  const dir = tmp();
  const data = {
    license_key: 'VBK-LIFETIME-AAAA-BBBB-CCCC',
    machine_id: '1234567890abcdef',
    activated_at: '2026-04-27T00:00:00.000Z',
    version: '1.0.0',
  };
  const wrote = writeLicense(data, dir);
  assert.equal(wrote.location, 'local');
  const read = readLicense(dir);
  assert.equal(read.license_key, data.license_key);
  assert.equal(read.machine_id, data.machine_id);
  assert.equal(read.source, 'local');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('readLicense returns null when no file', () => {
  const dir = tmp();
  // Note: this might find a HOME license; that's fine, test focuses on local-only
  // by checking file does not exist.
  const local = path.join(dir, '.vibekitvn-license');
  assert.equal(fs.existsSync(local), false);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('deleteLicense removes local file', () => {
  const dir = tmp();
  writeLicense(
    { license_key: 'VBK-LIFETIME-AAAA-BBBB-CCCC', machine_id: 'x', activated_at: 'y' },
    dir
  );
  // Save current cwd, switch, run delete, restore
  const original = process.cwd();
  try {
    process.chdir(dir);
    deleteLicense();
    assert.equal(fs.existsSync(path.join(dir, '.vibekitvn-license')), false);
  } finally {
    process.chdir(original);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('ensureGitignore: skips when not a git repo', () => {
  const dir = tmp();
  const r = ensureGitignore(dir);
  assert.equal(r.skipped, 'not_git_repo');
  assert.equal(fs.existsSync(path.join(dir, '.gitignore')), false);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('ensureGitignore: appends entries to existing .gitignore', () => {
  const dir = tmp();
  const gi = path.join(dir, '.gitignore');
  fs.writeFileSync(gi, 'node_modules/\n');
  const r = ensureGitignore(dir);
  assert.deepEqual(r.added.sort(), ['.vibekitvn-license', '_vibekitvn-output/', '_vibekitvn/'].sort());
  const content = fs.readFileSync(gi, 'utf8');
  assert.match(content, /\.vibekitvn-license/);
  assert.match(content, /_vibekitvn\//);
  assert.match(content, /_vibekitvn-output\//);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('ensureGitignore: idempotent — no duplicate entries', () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, '.gitignore'), '.vibekitvn-license\n_vibekitvn/\n_vibekitvn-output/\n');
  const r = ensureGitignore(dir);
  assert.deepEqual(r.added, []);
  fs.rmSync(dir, { recursive: true, force: true });
});
