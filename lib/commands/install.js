// lib/commands/install.js — public install command entry
//
// Two paths:
//   - installCommand({ silent: true })    → headless minimal sync (used by activate.js)
//   - installCommand(opts)                → full interactive installer
//
// `syncSkills` is preserved for backward compat with activate.js auto-sync;
// it does a minimal sync to a fixed set of preferred IDEs (5 popular ones).
// For the rich 23-IDE picker, use installFull() via the CLI directly.

import path from 'node:path';
import fs from 'node:fs';
import { installFull } from './install-full.js';
import { installSkillsForPlatform } from '../installer/platform-installer.js';
import { discoverSkills } from '../installer/skill-discovery.js';
import { loadPlatforms, getPreferredTools, validateTools } from '../installer/platforms.js';
import { generateConfigs } from '../installer/config-generator.js';
import { bundleExists, getBundleRoot, readManifest } from '../installer/paths.js';

export async function installCommand(opts = {}) {
  if (opts.silent) {
    return syncSkills(opts);
  }
  return installFull(opts);
}

/**
 * Headless minimal sync — used by `activate.js` after download.
 * Installs all skills into the "preferred" platforms (Claude Code + Cursor)
 * without prompting. User can run `vibekitvn install` later for full setup.
 */
export async function syncSkills(opts = {}) {
  const cwd = opts.cwd || process.cwd();
  if (!bundleExists(cwd)) {
    throw new Error(
      `Bundle chưa tải về (${path.join(cwd, '_vibekitvn')}). Chạy \`vibekitvn activate\` trước.`
    );
  }
  const bundleRoot = getBundleRoot(cwd);
  const skills = discoverSkills(bundleRoot);

  const preferred = getPreferredTools(bundleRoot);
  const platforms = preferred.length
    ? validateTools(bundleRoot, preferred)
    : loadPlatforms(bundleRoot).list.slice(0, 1);

  const manifest = readManifest(bundleRoot) || {};

  // Generate basic configs (no answer snapshot — that's the full installer's job)
  generateConfigs(cwd, skills, platforms, {
    version: manifest.version || '1.0.0',
    outputFolder: '_vibekitvn-output',
  });

  const platformResults = [];
  for (const platform of platforms) {
    const results = installSkillsForPlatform(cwd, platform, skills, { force: false });
    platformResults.push({ platform, results });
  }

  return {
    skillCount: skills.length,
    platforms: platforms.map((p) => p.name),
    platformResults,
  };
}
