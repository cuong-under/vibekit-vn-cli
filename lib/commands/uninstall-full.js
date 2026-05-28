// lib/commands/uninstall-full.js — full interactive uninstaller
//
// Ported from VIBEKIT-VN tools/installer/commands/uninstall.js (CommonJS → ESM).

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { remove } from '../installer/file-ops.js';
import {
  loadPlatforms,
  parseToolsOption,
  validateTools,
} from '../installer/platforms.js';
import { cleanupPlatform } from '../installer/platform-installer.js';
import { detectState } from '../installer/state-detector.js';
import { getProjectBundleRoot } from '../installer/paths.js';
import * as ui from '../installer/ui.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf8'));

function isInteractive(options) {
  if (options.yes) return false;
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

function readInstalledSkillNames(targetDir) {
  const manifestPath = path.join(targetDir, '_vibekitvn', '_config', 'skill-manifest.csv');
  if (fs.existsSync(manifestPath)) {
    return fs
      .readFileSync(manifestPath, 'utf8')
      .split(/\r?\n/)
      .filter(Boolean)
      .slice(1)
      .map((line) => line.split(',')[0])
      .filter(Boolean);
  }
  const skillsDir = path.join(targetDir, '_vibekitvn', 'skills');
  if (!fs.existsSync(skillsDir)) return [];
  return fs
    .readdirSync(skillsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
}

export async function uninstallFull(options = {}) {
  const targetDir = path.resolve(options.directory || process.cwd());
  const interactive = isInteractive(options);
  const state = detectState(targetDir);
  const bundleRoot = getProjectBundleRoot(targetDir);

  if (interactive) {
    await ui.showBanner(PKG.version);
    await ui.intro('Gỡ VIBEKIT-VN');
  }

  if (!state.exists) {
    if (interactive) {
      await ui.logWarn(`Không tìm thấy bản cài VIBEKIT-VN ở: ${targetDir}`);
      await ui.outro('Không có gì để gỡ.');
    } else {
      console.log(`Không tìm thấy bản cài VIBEKIT-VN ở: ${targetDir}`);
    }
    return;
  }

  // Pick tools to uninstall
  let platforms;
  let removeConfig = true;

  if (options.tools) {
    platforms = validateTools(bundleRoot, parseToolsOption(bundleRoot, options.tools));
  } else if (interactive) {
    if (state.installedPlatforms.length === 0) {
      await ui.logInfo('Không có tool nào đã cấu hình. Sẽ chỉ xóa _vibekitvn/.');
      platforms = [];
    } else {
      const values = await ui.askMultiSelect({
        message: 'Chọn tool muốn gỡ',
        options: state.installedPlatforms.map(({ platform, skillCount }) =>
          ui.option(platform.id, platform.name, `${skillCount} skill · ${platform.target_dir}`)
        ),
        initialValues: state.installedPlatforms.map((s) => s.platform.id),
        required: false,
      });
      platforms = validateTools(bundleRoot, values);
    }
    removeConfig = await ui.askConfirm({
      message: 'Xóa luôn `_vibekitvn/` (skill copy + config)?',
      initialValue: true,
    });
  } else {
    platforms = state.installedPlatforms.map((s) => s.platform);
  }

  if (interactive) {
    const summary = [
      `Thư mục:           ${targetDir}`,
      `Tool sẽ gỡ:        ${platforms.length ? platforms.map((p) => p.name).join(', ') : '(không gỡ tool)'}`,
      `Xóa _vibekitvn/:   ${removeConfig ? 'có' : 'không'}`,
      `Giữ output folder: có (${state.coreConfig?.answers?.output_folder || '_vibekitvn-output'})`,
    ].join('\n');
    await ui.note(summary, 'Tóm tắt gỡ');

    const proceed = await ui.askConfirm({ message: 'Tiếp tục?', initialValue: true });
    if (!proceed) {
      await ui.outro('Đã hủy. Không thay đổi gì.');
      return;
    }
  }

  const skillNames = readInstalledSkillNames(targetDir);
  const runSteps = async () => {
    for (const platform of platforms) {
      cleanupPlatform(targetDir, platform, skillNames);
    }
    if (removeConfig) {
      remove(path.join(targetDir, '_vibekitvn'));
    }
  };

  if (interactive) {
    await ui.withSpinner(
      `Đang gỡ ${platforms.length} tool…`,
      `Đã gỡ ${platforms.length} tool${removeConfig ? ' + xóa _vibekitvn/' : ''}.`,
      runSteps
    );
    await ui.note(
      `Cảm ơn bạn đã dùng VIBEKIT-VN!\n\nDev:       ${ui.DEV_INFO.name}\nTelegram:  ${ui.DEV_INFO.telegram}\n\nNếu có feedback vì sao gỡ, gửi qua Telegram nhé.`,
      'Tạm biệt'
    );
    await ui.outro(`Output folder được giữ lại. Liên hệ dev: ${ui.DEV_INFO.telegram}`);
  } else {
    await runSteps();
    console.log(`Gỡ VIBEKIT-VN khỏi: ${targetDir}`);
    for (const platform of platforms) {
      console.log(`- ${platform.name}: ${platform.target_dir}`);
    }
    if (removeConfig) console.log('Đã xóa _vibekitvn/.');
    console.log('Output folder được giữ lại để bảo toàn tài liệu đã tạo.');
  }
}
