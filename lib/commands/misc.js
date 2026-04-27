// lib/commands/misc.js — buy command (uninstall ported separately)
import * as p from '@clack/prompts';
import pc from 'picocolors';

const BUY_URL = 'https://t.me/vibekitvn_bot';

export async function buyCommand() {
  p.intro(pc.bgCyan(pc.black(' VIBEKIT-VN Buy ')));
  p.note(
    `Mở Telegram bot để mua license:\n\n${pc.cyan(BUY_URL)}\n\n` +
      `Giá: ${pc.green('999.000đ lifetime')} • 2 máy • free update 1.x\n` +
      `Founding ${pc.yellow('499.000đ')} (50 slot đầu) • 2 máy • free update 1.x + 2.x lifetime`,
    'Mua license'
  );
  p.outro(pc.dim('Sau khi nhận key, chạy: ') + pc.cyan('vibekitvn activate <KEY>'));
}

// Re-export full uninstall command
export { uninstallFull as uninstallCommand } from './uninstall-full.js';
