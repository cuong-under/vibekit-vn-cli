// test/watermark.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  applyWatermark,
  computeFileHmac,
  readWatermarks,
} from '../lib/watermark.js';

function makeBundle() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vbk-wm-'));
  const skillsDir = path.join(dir, '_vibekitvn', 'skills');
  fs.mkdirSync(path.join(skillsDir, 'mod-a', 'skill-1'), { recursive: true });
  fs.mkdirSync(path.join(skillsDir, 'mod-b'), { recursive: true });
  fs.writeFileSync(
    path.join(skillsDir, 'mod-a', 'skill-1', 'SKILL.md'),
    '# Skill 1\n\nBody A.\n'
  );
  fs.writeFileSync(
    path.join(skillsDir, 'mod-a', 'skill-1', 'reference.md'),
    '# Ref\n\nSomething.\n'
  );
  fs.writeFileSync(
    path.join(skillsDir, 'mod-b', 'SKILL.md'),
    '# Skill 2\n\nBody B.\n'
  );
  // non-md file should be ignored
  fs.writeFileSync(path.join(skillsDir, 'mod-b', 'data.json'), '{}\n');
  fs.writeFileSync(
    path.join(dir, '_vibekitvn', 'manifest.json'),
    JSON.stringify({ version: '1.0.0' })
  );
  return { tmp: dir, bundleRoot: path.join(dir, '_vibekitvn') };
}

test('computeFileHmac: deterministic + 8 hex chars', () => {
  const a = computeFileHmac('VBK-LIFETIME-AAAA-BBBB-CCCC', 'skills/x/SKILL.md');
  const b = computeFileHmac('VBK-LIFETIME-AAAA-BBBB-CCCC', 'skills/x/SKILL.md');
  assert.equal(a, b);
  assert.match(a, /^[0-9a-f]{8}$/);
});

test('computeFileHmac: differs by key', () => {
  const a = computeFileHmac('VBK-LIFETIME-AAAA-BBBB-CCCC', 'skills/x.md');
  const b = computeFileHmac('VBK-LIFETIME-DDDD-EEEE-FFFF', 'skills/x.md');
  assert.notEqual(a, b);
});

test('computeFileHmac: differs by path (path-bound)', () => {
  const a = computeFileHmac('VBK-LIFETIME-AAAA-BBBB-CCCC', 'skills/a.md');
  const b = computeFileHmac('VBK-LIFETIME-AAAA-BBBB-CCCC', 'skills/b.md');
  assert.notEqual(a, b);
});

test('applyWatermark: stamps every .md and skips non-md', () => {
  const { tmp, bundleRoot } = makeBundle();
  try {
    const key = 'VBK-LIFETIME-1111-2222-3333';
    const result = applyWatermark({ bundleRoot, licenseKey: key });
    assert.equal(result.total, 3);
    assert.equal(result.stamped, 3);

    const skill1 = fs.readFileSync(
      path.join(bundleRoot, 'skills', 'mod-a', 'skill-1', 'SKILL.md'),
      'utf8'
    );
    assert.match(skill1, /<!-- vbk-wm: VBK-LIFETIME-1111-2222-3333 · [0-9a-f]{8} -->/);

    // Non-md untouched
    const json = fs.readFileSync(
      path.join(bundleRoot, 'skills', 'mod-b', 'data.json'),
      'utf8'
    );
    assert.equal(json, '{}\n');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('applyWatermark: idempotent on re-run with same key', () => {
  const { tmp, bundleRoot } = makeBundle();
  try {
    const key = 'VBK-LIFETIME-1111-2222-3333';
    applyWatermark({ bundleRoot, licenseKey: key });
    const after1 = fs.readFileSync(
      path.join(bundleRoot, 'skills', 'mod-a', 'skill-1', 'SKILL.md'),
      'utf8'
    );

    const result2 = applyWatermark({ bundleRoot, licenseKey: key });
    const after2 = fs.readFileSync(
      path.join(bundleRoot, 'skills', 'mod-a', 'skill-1', 'SKILL.md'),
      'utf8'
    );

    // Content unchanged after second apply with same key
    assert.equal(after1, after2);
    assert.equal(result2.stamped, 0);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('applyWatermark: re-watermark with new key replaces old marker', () => {
  const { tmp, bundleRoot } = makeBundle();
  try {
    applyWatermark({ bundleRoot, licenseKey: 'VBK-LIFETIME-AAAA-BBBB-CCCC' });
    applyWatermark({ bundleRoot, licenseKey: 'VBK-LIFETIME-DDDD-EEEE-FFFF' });

    const content = fs.readFileSync(
      path.join(bundleRoot, 'skills', 'mod-b', 'SKILL.md'),
      'utf8'
    );
    // Only one watermark line, with the new key
    const matches = content.match(/<!-- vbk-wm: [^\n]*-->/g) || [];
    assert.equal(matches.length, 1);
    assert.match(matches[0], /VBK-LIFETIME-DDDD-EEEE-FFFF/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('applyWatermark: stamps manifest + writes .watermark.json', () => {
  const { tmp, bundleRoot } = makeBundle();
  try {
    const key = 'VBK-FOUNDING-7777-8888-9999';
    applyWatermark({ bundleRoot, licenseKey: key, machineId: 'abc123def456' });

    const manifest = JSON.parse(
      fs.readFileSync(path.join(bundleRoot, 'manifest.json'), 'utf8')
    );
    assert.equal(manifest.watermark.license_key, key);
    assert.equal(manifest.watermark.machine_id, 'abc123def456');
    assert.equal(manifest.watermark.files_stamped, 3);
    assert.ok(manifest.watermark.applied_at);

    const audit = JSON.parse(
      fs.readFileSync(path.join(bundleRoot, '.watermark.json'), 'utf8')
    );
    assert.equal(audit.license_key, key);
    assert.equal(audit.files_total, 3);
    assert.match(audit.notice, /redistribution is prohibited/i);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('readWatermarks: traces leaked bundle', () => {
  const { tmp, bundleRoot } = makeBundle();
  try {
    const key = 'VBK-LIFETIME-LEAK-AAAA-BBBB';
    applyWatermark({ bundleRoot, licenseKey: key });

    const traces = readWatermarks(bundleRoot);
    assert.equal(traces.length, 1);
    assert.equal(traces[0].license_key, key);
    assert.equal(traces[0].count, 3);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('applyWatermark: throws when bundleRoot missing', () => {
  assert.throws(
    () => applyWatermark({ bundleRoot: '/no/such/path', licenseKey: 'VBK-X' }),
    /not found/
  );
});

test('applyWatermark: throws without licenseKey', () => {
  const { tmp, bundleRoot } = makeBundle();
  try {
    assert.throws(() => applyWatermark({ bundleRoot, licenseKey: '' }), /licenseKey/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
