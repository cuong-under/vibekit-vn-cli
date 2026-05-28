// lib/installer/paths.js — locate extracted skill bundles
//
// After `vibekitvn activate`, tarball is extracted to ~/.vibekitvn/bundle/ with:
//   _vibekitvn/skills/<skill-name>/...
//   _vibekitvn/modules/<core-skills|vbk-ky-nang>/module.yaml
//   _vibekitvn/platforms.yaml
//   _vibekitvn/manifest.json
//
// Project-local _vibekitvn/ is still used for per-project config and legacy
// bundles created by older CLI versions.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export function getProjectBundleRoot(targetDir = process.cwd()) {
  return path.join(targetDir, '_vibekitvn');
}

export function getGlobalBundleRoot() {
  return path.join(os.homedir(), '.vibekitvn', 'bundle');
}

export function isBundleRoot(root) {
  return fs.existsSync(path.join(root, 'skills')) &&
    fs.existsSync(path.join(root, 'manifest.json'));
}

export function getBundleRoot(targetDir = process.cwd()) {
  const globalRoot = getGlobalBundleRoot();
  if (isBundleRoot(globalRoot)) return globalRoot;
  const projectRoot = getProjectBundleRoot(targetDir);
  if (isBundleRoot(projectRoot)) return projectRoot;
  return globalRoot;
}

export function bundleExists(targetDir = process.cwd()) {
  return isBundleRoot(getProjectBundleRoot(targetDir)) || isBundleRoot(getGlobalBundleRoot());
}

export function readManifest(bundleRoot) {
  const p = path.join(bundleRoot, 'manifest.json');
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}
