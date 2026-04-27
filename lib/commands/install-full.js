// lib/commands/install-full.js — full interactive installer (replacement for install.js stub)
//
// Sources skills from <cwd>/_vibekitvn/ (extracted by `vibekitvn activate`).
// Two modes:
//   - Interactive (TTY + no --yes): banner + module/config/tools prompts + confirm
//   - Headless (--yes or no TTY):    use defaults from module.yaml + CLI flags
//
// Ported from VIBEKIT-VN tools/installer/commands/install.js (CommonJS → ESM).
// Adapted: package source removed; everything reads from the bundle root.

import path from 'node:path';
import fs from 'node:fs';
import yaml from 'js-yaml';
import { fileURLToPath } from 'node:url';

import { discoverSkills } from '../installer/skill-discovery.js';
import { generateConfigs } from '../installer/config-generator.js';
import { ensureDir, copyDir, writeFile } from '../installer/file-ops.js';
import {
  loadPlatforms,
  parseToolsOption,
  validateTools,
  getPreferredTools,
} from '../installer/platforms.js';
import { installSkillsForPlatform } from '../installer/platform-installer.js';
import {
  listModules,
  loadModulePrompts,
  loadModuleDirectories,
} from '../installer/config-loader.js';
import { detectState } from '../installer/state-detector.js';
import { getBundleRoot, bundleExists, readManifest } from '../installer/paths.js';
import { readLicense } from '../license-file.js';
import * as ui from '../installer/ui.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf8'));

function isInteractive(options) {
  if (options.yes) return false;
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

export async function installFull(options = {}) {
  const targetDir = path.resolve(options.directory || process.cwd());
  const interactive = isInteractive(options);

  // Verify bundle exists (i.e. activate was run)
  if (!bundleExists(targetDir)) {
    const lic = readLicense();
    const msg = lic
      ? `Skill content chưa được tải về. Chạy: ${ui.color.cyan('vibekitvn activate ' + lic.license_key)}`
      : `Chưa activate license. Chạy: ${ui.color.cyan('vibekitvn activate <KEY>')}\n\nMua key qua: ${ui.color.cyan('https://t.me/vibekitvn_bot')}`;
    if (interactive) {
      await ui.intro('Cài đặt VIBEKIT-VN');
      await ui.note(msg, 'Chưa sẵn sàng cài');
      await ui.outro('Activate trước rồi cài.');
    } else {
      console.error(msg);
    }
    process.exit(1);
  }

  const bundleRoot = getBundleRoot(targetDir);
  const manifest = readManifest(bundleRoot) || {};
  const contentVersion = manifest.version || PKG.version;

  if (interactive) {
    await ui.showBanner(PKG.version);
    await ui.intro('Cài đặt VIBEKIT-VN');
  } else {
    console.log(`Cài đặt VIBEKIT-VN vào: ${targetDir}`);
  }

  // ─── Phase 1: collect config ────────────────────────────────────
  const state = detectState(targetDir);
  let actionType = 'install';
  const hasInstalledPlatforms = state.installedPlatforms.length > 0;

  if (interactive && hasInstalledPlatforms) {
    actionType = await ui.askSelect({
      message: `Đã thấy bản cài cũ (v${state.version || '?'}, ${state.installedSkills.length} skill, ${state.installedPlatforms.length} tool). Bạn muốn?`,
      options: [
        ui.option('update', 'Cập nhật', 'cài đè + bổ sung skill mới + giữ config'),
        ui.option('reinstall', 'Cài lại từ đầu', 'gỡ + cài như mới'),
        ui.option('quick-update', 'Cập nhật nhanh', 'chỉ refresh skill, không hỏi config'),
        ui.option('cancel', 'Hủy', 'không thay đổi gì'),
      ],
      initialValue: 'update',
    });
    if (actionType === 'cancel') {
      await ui.outro('Đã hủy. Tạm biệt!');
      return;
    }
  }

  // Modules
  const allModules = listModules(bundleRoot);
  let chosenModules = pickModulesFromOptions(allModules, options);

  if (interactive && actionType !== 'quick-update') {
    if (allModules.length > 1) {
      const values = await ui.askMultiSelect({
        message: 'Chọn module skill muốn cài',
        options: allModules.map((m) => ui.option(m.id, m.name, m.description)),
        initialValues: chosenModules.length
          ? chosenModules.map((m) => m.id)
          : allModules.filter((m) => m.defaultSelected).map((m) => m.id),
        required: true,
      });
      chosenModules = allModules.filter((m) => values.includes(m.id));
    } else {
      chosenModules = allModules;
    }
  } else if (chosenModules.length === 0) {
    chosenModules = allModules.filter((m) => m.defaultSelected);
    if (chosenModules.length === 0) chosenModules = allModules;
  }

  // Answers
  const answers = {
    'project-root': targetDir,
    directory_name: path.basename(targetDir),
  };

  if (actionType === 'quick-update' && state.coreConfig) {
    Object.assign(answers, state.coreConfig.answers || {});
  } else {
    applyCliOverrides(answers, options);

    for (const m of chosenModules) {
      const prompts = loadModulePrompts(m, answers);
      for (const p of prompts) {
        if (p.key in answers) continue;
        if (interactive) {
          let value;
          if (p.kind === 'select') {
            value = await ui.askSelect({
              message: p.message + (p.hint ? `\n  ${ui.color.dim(p.hint)}` : ''),
              options: p.options,
              initialValue: p.default,
            });
          } else {
            value = await ui.askText({
              message: p.message + (p.hint ? `\n  ${ui.color.dim(p.hint)}` : ''),
              defaultValue: p.default != null ? String(p.default) : '',
              placeholder: p.default != null ? String(p.default) : '',
            });
            if (!value) value = p.default;
          }
          answers[p.key] = value;
        } else {
          answers[p.key] = p.default;
        }
      }
    }
  }

  // Tools
  let platforms;
  if (options.tools) {
    platforms = validateTools(bundleRoot, parseToolsOption(bundleRoot, options.tools));
  } else if (interactive && actionType !== 'quick-update') {
    const { list } = loadPlatforms(bundleRoot);
    const values = await ui.askMultiSelect({
      message: 'Chọn AI IDE/tool bạn đang dùng (space = toggle, enter = xác nhận)',
      options: list.map((p) => ui.option(p.id, p.name, p.target_dir)),
      initialValues: state.installedPlatforms.length
        ? state.installedPlatforms.map((s) => s.platform.id)
        : [],
      required: true,
    });
    platforms = validateTools(bundleRoot, values);
  } else if (state.installedPlatforms.length) {
    platforms = state.installedPlatforms.map((s) => s.platform);
  } else {
    platforms = validateTools(bundleRoot, getPreferredTools(bundleRoot));
  }

  // ─── Phase 2: confirm ─────────────────────────────────────────────
  const allSkills = discoverSkills(bundleRoot);
  const skills = filterSkillsForModules(allSkills, chosenModules);

  if (skills.length === 0) {
    if (interactive) await ui.logError('Không tìm thấy skill nào trong bundle.');
    else console.error('Không tìm thấy skill nào trong bundle.');
    process.exit(1);
  }

  if (interactive && actionType !== 'quick-update') {
    const summary = [
      `Thư mục:        ${targetDir}`,
      `Skill bundle:   v${contentVersion}`,
      `Module:         ${chosenModules.map((m) => m.name).join(', ')}`,
      `Tổng skill:     ${skills.length}`,
      `IDE/tool:       ${platforms.length ? platforms.map((p) => p.name).join(', ') : '(không cấu hình tool nào)'}`,
      ``,
      `User name:      ${answers.user_name || '-'}`,
      `Ngôn ngữ thoại: ${answers.communication_language || '-'}`,
      `Ngôn ngữ doc:   ${answers.document_output_language || '-'}`,
      `Output folder:  ${answers.output_folder || '-'}`,
    ].join('\n');
    await ui.note(summary, 'Tóm tắt cài đặt');

    const proceed = await ui.askConfirm({ message: 'Tiếp tục cài?', initialValue: true });
    if (!proceed) {
      await ui.outro('Đã hủy. Không thay đổi gì.');
      return;
    }
  }

  // ─── Phase 3: copy + configure ────────────────────────────────────
  const runSteps = async () => {
    // _vibekitvn/skills/ already exists (extracted by activate). Skip re-copying.
    const outputFolder = answers.output_folder || '_vibekitvn-output';
    ensureDir(path.join(targetDir, outputFolder));

    // Module-defined extra directories
    for (const m of chosenModules) {
      for (const dir of loadModuleDirectories(m, answers)) {
        const resolved = path.isAbsolute(dir) ? dir : path.join(targetDir, dir);
        ensureDir(resolved);
      }
    }

    generateConfigs(targetDir, skills, platforms, {
      version: contentVersion,
      outputFolder,
    });
    writeAnswerSnapshot(targetDir, answers, chosenModules, platforms, contentVersion);

    const platformResults = [];
    for (const platform of platforms) {
      const results = installSkillsForPlatform(targetDir, platform, skills, {
        force: options.force || actionType === 'reinstall',
      });
      platformResults.push({ platform, results });
    }
    return platformResults;
  };

  let platformResults;
  if (interactive) {
    platformResults = await ui.withSpinner(
      `Đang cài ${skills.length} skill vào ${platforms.length} tool…`,
      `Đã cài ${skills.length} skill vào ${platforms.length} tool.`,
      runSteps
    );
  } else {
    platformResults = await runSteps();
    for (const { platform, results } of platformResults) {
      const installed = results.filter((r) => r.status === 'installed').length;
      const skipped = results.filter((r) => r.status === 'skipped').length;
      console.log(
        `- ${platform.name}: ${platform.target_dir} (${installed} cài mới${skipped ? `, ${skipped} bỏ qua` : ''})`
      );
    }
    console.log(`Đã cài ${skills.length} kỹ năng.`);
    if (platforms.length === 0) console.log('Không cài IDE target (--tools none).');
    return { skills, platforms, platformResults };
  }

  // ─── Phase 4: outro ───────────────────────────────────────────────
  const lines = [];
  for (const { platform, results } of platformResults) {
    const installed = results.filter((r) => r.status === 'installed').length;
    const skipped = results.filter((r) => r.status === 'skipped').length;
    lines.push(
      `• ${platform.name.padEnd(18)} → ${platform.target_dir}  (${installed} mới${skipped ? `, ${skipped} skip` : ''})`
    );
  }
  if (platforms.length === 0) lines.push('• Không cấu hình IDE/tool (chỉ giữ trong _vibekitvn/).');
  lines.push('');
  lines.push(`Skill source:    _vibekitvn/skills/`);
  lines.push(`Output mặc định: ${answers.output_folder || '_vibekitvn-output'}/`);
  lines.push('');
  lines.push(`Dev:       ${ui.DEV_INFO.name}`);
  lines.push(`Telegram:  ${ui.DEV_INFO.telegram}  (góp ý / báo lỗi / hỗ trợ)`);
  await ui.note(lines.join('\n'), 'Cài đặt hoàn tất');
  await ui.outro(`Sẵn sàng. Mở IDE và gọi skill VIBEKIT-VN. Liên hệ dev: ${ui.DEV_INFO.telegram}`);

  return { skills, platforms, platformResults };
}

function applyCliOverrides(answers, options) {
  const map = {
    userName: 'user_name',
    communicationLanguage: 'communication_language',
    documentOutputLanguage: 'document_output_language',
    outputFolder: 'output_folder',
    projectName: 'project_name',
    userSkillLevel: 'user_skill_level',
  };
  for (const [cliKey, ansKey] of Object.entries(map)) {
    if (options[cliKey] != null && options[cliKey] !== '') {
      answers[ansKey] = options[cliKey];
    }
  }
}

function pickModulesFromOptions(allModules, options) {
  if (!options.modules) return [];
  const wanted = String(options.modules).split(',').map((s) => s.trim()).filter(Boolean);
  return allModules.filter((m) => wanted.includes(m.id));
}

function filterSkillsForModules(allSkills, modules) {
  const moduleIds = new Set(modules.map((m) => m.id));
  return allSkills.filter((skill) => moduleIds.has(skill.module));
}

function writeAnswerSnapshot(targetDir, answers, modules, platforms, version) {
  const snapshot = {
    version,
    installed_at: new Date().toISOString(),
    modules: modules.map((m) => m.id),
    tools: platforms.map((p) => p.id),
    answers,
  };
  writeFile(path.join(targetDir, '_vibekitvn', 'core', 'config.yaml'), yaml.dump(snapshot));
}
