#!/usr/bin/env node
// bin/vibekitvn-cli.js — main CLI entry
//
// Usage:
//   vibekitvn activate VBK-LIFETIME-XXXX-YYYY-ZZZZ
//   vibekitvn install
//   vibekitvn status
//   vibekitvn deactivate
//   vibekitvn update
//   vibekitvn uninstall
//   vibekitvn buy

import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));

const program = new Command();
program
  .name('vibekitvn')
  .description('VIBEKIT-VN — Bộ skill AI tiếng Việt (license-only). Mua key: https://t.me/vibekitvn_bot')
  .version(pkg.version);

program
  .command('activate [key]')
  .description('Activate license key + tải skill content')
  .option('--no-sync', 'Bỏ qua bước sync vào AI IDE sau khi tải')
  .action(async (key, opts) => {
    const { activateCommand } = await import('../lib/commands/activate.js');
    await activateCommand(key, opts);
  });

program
  .command('install')
  .description('Cài skill vào AI IDE folders (interactive picker 23 IDE; cần activate trước)')
  .option('-d, --directory <dir>', 'Project directory (default: cwd)')
  .option('-y, --yes', 'Headless: dùng defaults, không hỏi')
  .option('--tools <ids>', 'Comma-separated tool ids, hoặc all|preferred|none')
  .option('--modules <ids>', 'Comma-separated module ids (vd: core,vbk)')
  .option('--force', 'Cài đè skill đã tồn tại')
  .option('--user-name <name>', 'Override user_name answer')
  .option('--communication-language <lang>', 'Override communication_language')
  .option('--document-output-language <lang>', 'Override document_output_language')
  .option('--output-folder <dir>', 'Override output_folder (default: _vibekitvn-output)')
  .option('--project-name <name>', 'Override project_name')
  .option('--user-skill-level <lvl>', 'Override user_skill_level (beginner|intermediate|expert)')
  .action(async (opts) => {
    const { installCommand } = await import('../lib/commands/install.js');
    await installCommand(opts);
  });

program
  .command('status')
  .description('Xem thông tin license + danh sách máy đã activate')
  .action(async () => {
    const { statusCommand } = await import('../lib/commands/status.js');
    await statusCommand();
  });

program
  .command('deactivate')
  .description('Giải phóng slot máy hiện tại (cooldown 90 ngày)')
  .action(async () => {
    const { deactivateCommand } = await import('../lib/commands/deactivate.js');
    await deactivateCommand();
  });

program
  .command('update')
  .description('Tải skill content version mới nhất')
  .action(async () => {
    const { updateCommand } = await import('../lib/commands/update.js');
    await updateCommand();
  });

program
  .command('uninstall')
  .description('Gỡ skill khỏi AI IDE folders + tuỳ chọn xóa _vibekitvn/')
  .option('-d, --directory <dir>', 'Project directory (default: cwd)')
  .option('-y, --yes', 'Headless: gỡ tất cả tool đã cài, không hỏi')
  .option('--tools <ids>', 'Comma-separated tool ids, hoặc all|preferred|none')
  .action(async (opts) => {
    const { uninstallCommand } = await import('../lib/commands/misc.js');
    await uninstallCommand(opts);
  });

program
  .command('buy')
  .description('Mở Telegram bot để mua license')
  .action(async () => {
    const { buyCommand } = await import('../lib/commands/misc.js');
    await buyCommand();
  });

program.parseAsync(process.argv).catch((err) => {
  console.error('\n✖ Lỗi không mong muốn:', err?.message || err);
  process.exit(1);
});
