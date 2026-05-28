// lib/installer/project-bundle.js — copy cached content into one project
import fs from 'node:fs';
import path from 'node:path';
import { ensureDir, copyDir } from './file-ops.js';

export function materializeProjectBundle(targetDir, bundleRoot, skills) {
  const projectBundle = path.join(targetDir, '_vibekitvn');
  if (path.resolve(projectBundle) === path.resolve(bundleRoot)) return;
  ensureDir(projectBundle);

  for (const rel of ['manifest.json', 'platforms.yaml']) {
    const src = path.join(bundleRoot, rel);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(projectBundle, rel));
  }

  for (const rel of ['modules']) {
    const src = path.join(bundleRoot, rel);
    const dest = path.join(projectBundle, rel);
    if (!fs.existsSync(src)) continue;
    fs.rmSync(dest, { recursive: true, force: true });
    copyDir(src, dest);
  }

  const skillsDest = path.join(projectBundle, 'skills');
  fs.rmSync(skillsDest, { recursive: true, force: true });
  ensureDir(skillsDest);
  for (const skill of skills) {
    copyDir(skill.skillDir, path.join(skillsDest, skill.id));
  }
}
