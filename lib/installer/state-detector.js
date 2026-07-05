// lib/installer/state-detector.js — detect existing VIBEKIT-VN install in cwd
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { loadPlatforms } from './platforms.js';
import { getProjectBundleRoot } from './paths.js';

export function detectState(targetDir) {
  const root = getProjectBundleRoot(targetDir);
  const exists = fs.existsSync(root);

  let coreConfig = null;
  const coreConfigPath = path.join(root, 'core', 'config.yaml');
  if (fs.existsSync(coreConfigPath)) {
    try {
      coreConfig = yaml.load(fs.readFileSync(coreConfigPath, 'utf8')) || null;
    } catch {
      coreConfig = null;
    }
  }

  const skillsDir = path.join(root, 'skills');
  let installedSkills = [];
  if (fs.existsSync(skillsDir)) {
    installedSkills = fs.readdirSync(skillsDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  }

  // Platform configured = has at least 1 skill folder with SKILL.md inside target_dir
  const installedPlatforms = [];
  if (exists) {
    try {
      const { list } = loadPlatforms(root);
      for (const platform of list) {
        const dirs = [platform.target_dir, ...(platform.legacy_targets || [])]
          .map((dir) => path.join(targetDir, dir));
        const skillNames = new Set();
        for (const dir of dirs) {
          if (!fs.existsSync(dir)) continue;
          for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (entry.isDirectory() && fs.existsSync(path.join(dir, entry.name, 'SKILL.md'))) {
              skillNames.add(entry.name);
            }
          }
        }
        const skillCount = skillNames.size;
        if (skillCount > 0) installedPlatforms.push({ platform, skillCount });
      }
    } catch {
      /* bundle may be incomplete — skip platform scan */
    }
  }

  return {
    exists,
    root,
    coreConfig,
    installedSkills,
    installedPlatforms,
    version: coreConfig?.version || null,
    installedAt: coreConfig?.installed_at || null,
  };
}
