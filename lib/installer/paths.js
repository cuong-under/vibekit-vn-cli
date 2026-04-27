// lib/installer/paths.js — locate the extracted skill bundle in user's project
//
// After `vibekitvn activate`, tarball is extracted to <cwd>/_vibekitvn/ with:
//   _vibekitvn/skills/<skill-name>/...
//   _vibekitvn/modules/<core-skills|vbk-ky-nang>/module.yaml
//   _vibekitvn/platforms.yaml
//   _vibekitvn/manifest.json
//
// All installer-related lib functions take a `bundleRoot` parameter pointing
// to <cwd>/_vibekitvn/.

import fs from 'node:fs';
import path from 'node:path';

export function getBundleRoot(targetDir = process.cwd()) {
  return path.join(targetDir, '_vibekitvn');
}

export function bundleExists(targetDir = process.cwd()) {
  const root = getBundleRoot(targetDir);
  return fs.existsSync(path.join(root, 'skills')) &&
    fs.existsSync(path.join(root, 'manifest.json'));
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
