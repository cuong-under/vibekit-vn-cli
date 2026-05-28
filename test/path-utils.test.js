import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {
  isAbsoluteAnyPlatform,
  resolveProjectPath,
  toProjectRelativePath,
} from '../lib/installer/path-utils.js';

test('isAbsoluteAnyPlatform detects current OS, Windows drive, and UNC paths', () => {
  assert.equal(isAbsoluteAnyPlatform('/home/user/app'), true);
  assert.equal(isAbsoluteAnyPlatform('D:\\1212'), true);
  assert.equal(isAbsoluteAnyPlatform('D:/1212'), true);
  assert.equal(isAbsoluteAnyPlatform('\\\\server\\share'), true);
  assert.equal(isAbsoluteAnyPlatform('_vibekitvn-output'), false);
});

test('resolveProjectPath keeps absolute Windows paths even on POSIX', () => {
  assert.equal(resolveProjectPath('D:\\1212', 'D:\\1212\\_vibekitvn-output'), 'D:\\1212\\_vibekitvn-output');
  assert.equal(resolveProjectPath('/mnt/d/1212', '/mnt/d/1212/_vibekitvn-output'), '/mnt/d/1212/_vibekitvn-output');
  assert.equal(resolveProjectPath('/home/u/app', '_vibekitvn-output'), path.join('/home/u/app', '_vibekitvn-output'));
});

test('toProjectRelativePath strips duplicated project root across Windows slash styles', () => {
  assert.equal(toProjectRelativePath('D:\\1212', 'D:\\1212\\_vibekitvn-output'), '_vibekitvn-output');
  assert.equal(toProjectRelativePath('D:\\1212', 'D:/1212/_vibekitvn-output'), '_vibekitvn-output');
  assert.equal(
    toProjectRelativePath('D:\\1212', 'D:\\1212\\_vibekitvn-output\\planning-artifacts'),
    '_vibekitvn-output\\planning-artifacts'
  );
  assert.equal(
    toProjectRelativePath('D:\\1212', 'D:\\1212\\D:\\1212\\_vibekitvn-output\\marketing-artifacts'),
    '_vibekitvn-output\\marketing-artifacts'
  );
  assert.equal(toProjectRelativePath('/mnt/d/1212', '/mnt/d/1212/_vibekitvn-output'), '_vibekitvn-output');
  assert.equal(toProjectRelativePath('/mnt/d/1212', '_vibekitvn-output'), '_vibekitvn-output');
});

test('toProjectRelativePath preserves external absolute paths', () => {
  assert.equal(toProjectRelativePath('D:\\1212', 'E:\\shared\\out'), 'E:\\shared\\out');
  assert.equal(toProjectRelativePath('/home/u/app', '/tmp/vbk-output'), '/tmp/vbk-output');
});
