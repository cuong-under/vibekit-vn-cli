// lib/installer/platform-installer.js — copy skill folders into AI IDE target dirs
import fs from 'node:fs';
import path from 'node:path';
import { ensureDir, copyDir, remove } from './file-ops.js';

export function installSkillsForPlatform(projectRoot, platform, skillFolders, options = {}) {
  const targetDir = path.join(projectRoot, platform.target_dir);
  ensureDir(targetDir);

  const installed = [];
  for (const skill of skillFolders) {
    const dest = path.join(targetDir, skill.id);
    if (fs.existsSync(dest) && !options.force) {
      installed.push({ skill: skill.id, path: dest, status: 'skipped' });
      continue;
    }
    copyDir(skill.skillDir, dest);
    installed.push({ skill: skill.id, path: dest, status: 'installed' });
  }
  return installed;
}

export function cleanupPlatform(projectRoot, platform, installedSkillNames) {
  const targetDir = path.join(projectRoot, platform.target_dir);
  for (const skillName of installedSkillNames) {
    remove(path.join(targetDir, skillName));
  }
  if (fs.existsSync(targetDir) && fs.readdirSync(targetDir).length === 0) {
    remove(targetDir);
  }
}

export function statusForPlatform(projectRoot, platform) {
  const targetDir = path.join(projectRoot, platform.target_dir);
  if (!fs.existsSync(targetDir)) {
    return { platform, exists: false, count: 0, targetDir };
  }
  const count = fs.readdirSync(targetDir, { withFileTypes: true }).filter((e) => {
    return e.isDirectory() && fs.existsSync(path.join(targetDir, e.name, 'SKILL.md'));
  }).length;
  return { platform, exists: true, count, targetDir };
}
