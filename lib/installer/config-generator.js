// lib/installer/config-generator.js — write _vibekitvn/{core,vbk,_config}/* config files
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { writeFile, ensureDir } from './file-ops.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function generateConfigs(targetDir, skills, platforms = [], options = {}) {
  ensureDir(path.join(targetDir, '_vibekitvn/core'));
  ensureDir(path.join(targetDir, '_vibekitvn/vbk'));
  ensureDir(path.join(targetDir, '_vibekitvn/_config'));
  ensureDir(path.join(targetDir, options.outputFolder || '_vibekitvn-output'));

  const tools = platforms.map((p) => p.id);
  const targetDirs = platforms.map((p) => p.target_dir);
  const toolsValue = tools.join('|');
  const targetDirsValue = targetDirs.join('|');

  const coreConfig = {
    version: options.version || '1.0.0',
    installed_at: new Date().toISOString(),
    tools,
    paths: {
      skills: '_vibekitvn/skills',
      output: options.outputFolder || '_vibekitvn-output',
      config: '_vibekitvn/_config',
    },
  };
  writeFile(path.join(targetDir, '_vibekitvn/core/config.yaml'), yaml.dump(coreConfig));

  const vbkConfig = {
    version: options.version || '1.0.0',
    categories: {
      analysis: 'Phân tích sản phẩm',
      planning: 'Lập kế hoạch',
      solutioning: 'Thiết kế giải pháp',
      implementation: 'Triển khai',
    },
  };
  writeFile(path.join(targetDir, '_vibekitvn/vbk/config.yaml'), yaml.dump(vbkConfig));

  const manifestLines = ['skill_id,source_path,description,category,tools,target_dirs'];
  for (const skill of skills) {
    const sourcePath = `_vibekitvn/skills/${skill.id}/SKILL.md`;
    const desc = (skill.description || '').replace(/,/g, ';');
    manifestLines.push(
      `${skill.id},${sourcePath},${desc},${skill.category},${toolsValue},${targetDirsValue}`
    );
  }
  writeFile(
    path.join(targetDir, '_vibekitvn/_config/skill-manifest.csv'),
    manifestLines.join('\n')
  );

  const platformLines = ['tool_id,name,target_dir,skill_count'];
  for (const platform of platforms) {
    platformLines.push(`${platform.id},${platform.name},${platform.target_dir},${skills.length}`);
  }
  writeFile(
    path.join(targetDir, '_vibekitvn/_config/platform-manifest.csv'),
    platformLines.join('\n')
  );

  // Setup Claude Code PostToolUse hook for session logging (Tier 2 session memory)
  const hasClaudeCode = platforms.some((p) => p.id === 'claude-code');
  if (hasClaudeCode) {
    setupClaudeHooks(targetDir);
  }
}

function setupClaudeHooks(targetDir) {
  try {
    const hookSrc = path.join(__dirname, '../hooks/post-tool-use.js');
    if (!fs.existsSync(hookSrc)) return;

    const hookDest = path.join(targetDir, '.claude', 'hooks', 'post-tool-use.js');
    ensureDir(path.dirname(hookDest));
    fs.copyFileSync(hookSrc, hookDest);

    const settingsPath = path.join(targetDir, '.claude', 'settings.json');
    let settings = {};
    if (fs.existsSync(settingsPath)) {
      try {
        settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      } catch {
        settings = {};
      }
    }

    if (!settings.hooks) settings.hooks = {};
    if (!settings.hooks.PostToolUse) settings.hooks.PostToolUse = [];

    const hookEntry = {
      matcher: 'Write|Edit|Bash|NotebookEdit',
      hooks: [{ type: 'command', command: 'node .claude/hooks/post-tool-use.js' }],
    };

    // Add only if not already present (idempotent install)
    const alreadySet = settings.hooks.PostToolUse.some(
      (h) => h.hooks?.some?.((c) => c.command === hookEntry.hooks[0].command)
    );
    if (!alreadySet) {
      settings.hooks.PostToolUse.push(hookEntry);
    }

    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf8');
  } catch {
    // Hook setup failure must not break the main install
  }
}
