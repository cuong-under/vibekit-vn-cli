// lib/commands/help-note.js — friendly command guide + optional project note
import fs from 'node:fs';
import path from 'node:path';
import * as p from '@clack/prompts';
import pc from 'picocolors';

const NOTE_FILE = 'VIBEKITVN-COMMANDS.md';

const COMMANDS = [
  ['npx vibekitvn activate <KEY>', 'Activate máy + tải skill content'],
  ['npx vibekitvn install', 'Cài/sync skill vào project hiện tại'],
  ['npx vibekitvn update', 'Tải skill content mới nhất'],
  ['npx vibekitvn status', 'Xem license + danh sách máy'],
  ['npx vibekitvn deactivate', 'Gỡ máy khỏi license, cooldown 90 ngày'],
  ['npx vibekitvn uninstall', 'Gỡ skill khỏi project/AI IDE'],
  ['npx vibekitvn buy', 'Mở bot mua license'],
  ['npx vibekitvn tro-giup', 'Xem bảng lệnh này'],
];

export async function helpNoteCommand(opts = {}) {
  const targetDir = path.resolve(opts.directory || process.cwd());
  const notePath = path.join(targetDir, NOTE_FILE);

  p.intro(pc.bgCyan(pc.black(' VIBEKIT-VN Trợ giúp ')));
  p.note(formatCommandList(), 'Lệnh hay dùng');

  if (fs.existsSync(notePath)) {
    p.outro(pc.green('Note lệnh đã có: ') + pc.cyan(notePath));
    return;
  }

  if (opts.yes) {
    writeNote(notePath);
    p.outro(pc.green('Đã tạo note lệnh: ') + pc.cyan(notePath));
    return;
  }

  const create = await p.confirm({
    message: `Tạo ${NOTE_FILE} trong project để khỏi quên lệnh?`,
    initialValue: true,
  });
  if (p.isCancel(create) || !create) {
    p.outro(pc.dim('Không tạo note. Gõ lại `npx vibekitvn tro-giup` khi cần.'));
    return;
  }

  writeNote(notePath);
  p.outro(pc.green('Đã tạo note lệnh: ') + pc.cyan(notePath));
}

function formatCommandList() {
  return COMMANDS.map(([cmd, desc]) => `${pc.cyan(cmd)}\n  ${desc}`).join('\n\n');
}

function writeNote(notePath) {
  fs.mkdirSync(path.dirname(notePath), { recursive: true });
  fs.writeFileSync(notePath, noteMarkdown(), 'utf8');
}

function noteMarkdown() {
  const rows = COMMANDS.map(([cmd, desc]) => `| \`${cmd}\` | ${desc} |`).join('\n');
  return `# VIBEKIT-VN Commands\n\n` +
    `> Note này được tạo bởi \`npx vibekitvn tro-giup\`.\n\n` +
    `## Lệnh hay dùng\n\n` +
    `| Lệnh | Dùng để |\n` +
    `|---|---|\n` +
    `${rows}\n\n` +
    `## Flow thường dùng\n\n` +
    `\`\`\`powershell\n` +
    `npx vibekitvn activate <KEY>\n` +
    `npx vibekitvn install\n` +
    `\`\`\`\n\n` +
    `Mỗi project mới trên cùng máy chỉ cần chạy:\n\n` +
    `\`\`\`powershell\n` +
    `npx vibekitvn install\n` +
    `\`\`\`\n`;
}
