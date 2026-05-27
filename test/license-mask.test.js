import test from 'node:test';
import assert from 'node:assert/strict';

import { maskLicenseKey } from '../lib/license-mask.js';

test('maskLicenseKey hides middle groups', () => {
  assert.equal(maskLicenseKey('VBK-COMBO-AAAA-BBBB-CCCC'), 'VBK-COMBO-AA...CCCC');
});

test('maskLicenseKey handles empty or short values', () => {
  assert.equal(maskLicenseKey(''), '***');
  assert.equal(maskLicenseKey(null), '***');
  assert.equal(maskLicenseKey('VBK-SHORT'), '***');
});
