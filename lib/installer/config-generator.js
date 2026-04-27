// lib/installer/config-generator.js — write _vibekitvn/{core,vbk,_config}/* config files
import path from 'node:path';
import yaml from 'js-yaml';
import { writeFile, ensureDir } from './file-ops.js';

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
}
