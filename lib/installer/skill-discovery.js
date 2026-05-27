// lib/installer/skill-discovery.js — list skills inside the extracted bundle
//
// Bundle layout:
//   _vibekitvn/skills/<skill-name>/SKILL.md
//   _vibekitvn/manifest.json   (skills: [{name, module, phase}])
//
// Each skill object returned contains:
//   { id, name, description, category, version, sourcePath, skillDir, content }

import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { readManifest } from './paths.js';

const MODULE_TO_CATEGORY = {
  'core-skills': 'core',
  'vbk-ky-nang': 'vbk-dev',
  'vbk-dev': 'vbk',
  'vbk-marketing': 'vbk',
};

const MODULE_ID_ALIASES = {
  'core-skills': 'core',
  'vbk-ky-nang': 'vbk-dev',
};

export function discoverSkills(bundleRoot) {
  const skillsDir = path.join(bundleRoot, 'skills');
  if (!fs.existsSync(skillsDir)) return [];

  const manifest = readManifest(bundleRoot);
  const moduleByName = new Map();
  if (manifest?.skills) {
    for (const s of manifest.skills) {
      moduleByName.set(s.name, normalizeModuleId(s.module));
    }
  }

  const skills = [];
  for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillDir = path.join(skillsDir, entry.name);
    const skillFile = path.join(skillDir, 'SKILL.md');
    if (!fs.existsSync(skillFile)) continue;
    const parsed = parseSkillFile(skillFile, skillDir, moduleByName.get(entry.name));
    if (parsed) skills.push(parsed);
  }
  return skills;
}

/**
 * Parse SKILL.md frontmatter.
 * Note: `module` (core|vbk) comes from manifest.json (which module folder the
 * skill lives in). `category` is the domain category from frontmatter (e.g.
 * 'analysis', 'implementation') — keep them separate so install filter can
 * pick by module, not by domain.
 */
function parseSkillFile(skillPath, skillDir, manifestModule) {
  try {
    const content = fs.readFileSync(skillPath, 'utf8');
    const fm = extractFrontmatter(content);
    if (!fm || !fm.name) {
      console.warn(`Warning: ${skillPath} missing name in frontmatter`);
      return null;
    }
    return {
      id: fm.name,
      name: fm.name,
      description: fm.description || '',
      category: fm.category || MODULE_TO_CATEGORY[manifestModule] || manifestModule || 'unknown',
      module: manifestModule || normalizeModuleId(fm.module),
      version: fm.version || '1.0.0',
      sourcePath: skillPath,
      skillDir,
      content,
    };
  } catch (err) {
    console.error(`Error parsing ${skillPath}:`, err.message);
    return null;
  }
}

function extractFrontmatter(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  try {
    return yaml.load(m[1]);
  } catch {
    return null;
  }
}

function normalizeModuleId(moduleId) {
  if (!moduleId) return 'unknown';
  return MODULE_ID_ALIASES[moduleId] || moduleId;
}
