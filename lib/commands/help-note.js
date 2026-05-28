// lib/commands/help-note.js — skill invocation guide + optional project note
import fs from 'node:fs';
import path from 'node:path';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { bundleExists, getBundleRoot } from '../installer/paths.js';
import { discoverSkills } from '../installer/skill-discovery.js';

const NOTE_FILE = 'VIBEKITVN-SKILL-COMMANDS.md';

export async function helpNoteCommand(opts = {}) {
  const targetDir = path.resolve(opts.directory || process.cwd());

  p.intro(pc.bgCyan(pc.black(' VIBEKIT-VN Trợ giúp ')));

  if (!bundleExists(targetDir)) {
    p.note(
      `Chưa thấy skill content. Chạy:\n\n${pc.cyan('npx vibekitvn activate <KEY>')}\n${pc.cyan('npx vibekitvn install')}`,
      'Chưa cài skill'
    );
    p.outro(pc.dim('Cài xong rồi gọi lại: ') + pc.cyan('npx vibekitvn tro-giup'));
    return;
  }

  const skills = discoverSkills(getBundleRoot(targetDir)).sort(sortSkills);
  const notePath = path.join(targetDir, NOTE_FILE);

  p.note(formatSkillList(skills, 24), 'Lệnh gọi skill trong AI IDE');

  if (fs.existsSync(notePath)) {
    p.outro(pc.green('Note gọi skill đã có: ') + pc.cyan(notePath));
    return;
  }

  if (opts.yes) {
    writeNote(notePath, skills);
    p.outro(pc.green('Đã tạo note gọi skill: ') + pc.cyan(notePath));
    return;
  }

  const create = await p.confirm({
    message: `Tạo ${NOTE_FILE} trong project để khỏi quên cách gọi skill?`,
    initialValue: true,
  });
  if (p.isCancel(create) || !create) {
    p.outro(pc.dim('Không tạo note. Gõ lại `npx vibekitvn tro-giup` khi cần.'));
    return;
  }

  writeNote(notePath, skills);
  p.outro(pc.green('Đã tạo note gọi skill: ') + pc.cyan(notePath));
}

function sortSkills(a, b) {
  return String(a.category).localeCompare(String(b.category)) || a.id.localeCompare(b.id);
}

function formatSkillList(skills, limit) {
  const shown = skills.slice(0, limit);
  const rows = shown.map((s) => `${pc.cyan('@' + s.id)}\n  ${s.description || s.category}`).join('\n\n');
  const more = skills.length > shown.length
    ? `\n\n${pc.dim(`... còn ${skills.length - shown.length} skill nữa. Tạo note để xem đủ ${skills.length} skill.`)}`
    : '';
  return `${rows}${more}\n\nDùng trong Cursor / Claude Code / Windsurf chat, ví dụ:\n${pc.cyan('@vibekit-dong-nao ý tưởng app học tiếng Anh')}`;
}

function writeNote(notePath, skills) {
  fs.mkdirSync(path.dirname(notePath), { recursive: true });
  fs.writeFileSync(notePath, noteMarkdown(skills), 'utf8');
}

function noteMarkdown(skills) {
  const byCategory = new Map();
  for (const skill of skills) {
    const key = skill.category || 'other';
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key).push(skill);
  }

  const sections = [...byCategory.entries()].map(([category, items]) => {
    const rows = items.map((s) => `| \`@${s.id}\` | ${escapeCell(s.description || '')} |`).join('\n');
    return `## ${category}\n\n| Gõ trong AI chat | Dùng để |\n|---|---|\n${rows}`;
  });

  return `# VIBEKIT-VN Skill Commands\n\n` +
    `> Note này được tạo bởi \`npx vibekitvn tro-giup\` sau khi cài skill.\n\n` +
    `Mở Cursor / Claude Code / Windsurf trong project, rồi gõ một lệnh dạng:\n\n` +
    `\`\`\`text\n` +
    `@vibekit-dong-nao ý tưởng app học tiếng Anh cho học sinh lớp 6\n` +
    `\`\`\`\n\n` +
    `${sections.join('\n\n')}\n`;
}

function escapeCell(value) {
  return String(value).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}
