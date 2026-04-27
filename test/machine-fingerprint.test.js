// test/machine-fingerprint.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeMachineId, getMachineMetadata } from '../lib/machine-fingerprint.js';

test('computeMachineId: returns 16 hex chars', () => {
  const id = computeMachineId();
  assert.match(id, /^[0-9a-f]{16}$/);
});

test('computeMachineId: deterministic across calls', () => {
  const a = computeMachineId();
  const b = computeMachineId();
  assert.equal(a, b);
});

test('getMachineMetadata: shape', () => {
  const m = getMachineMetadata();
  assert.equal(typeof m.machine_id, 'string');
  assert.equal(typeof m.hostname, 'string');
  assert.equal(typeof m.platform, 'string');
  assert.equal(typeof m.arch, 'string');
});
