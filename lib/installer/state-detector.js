// lib/installer/state-detector.js — detect existing VIBEKIT-VN install in cwd
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { loadPlatforms } from './platforms.js';
import { getBundleRoot } from './paths.js';

export function detectState(targetDir) {
  const root = getBundleRoot(targetDir);
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
        const dir = path.join(targetDir, platform.target_dir);
        if (!fs.existsSync(dir)) continue;
        const skillCount = fs.readdirSync(dir, { withFileTypes: true })
          .filter((e) => e.isDirectory() && fs.existsSync(path.join(dir, e.name, 'SKILL.md')))
          .length;
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
