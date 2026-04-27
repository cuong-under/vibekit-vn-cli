// lib/commands/status.js — show local + remote license info
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { readLicense } from '../license-file.js';
import { computeMachineId } from '../machine-fingerprint.js';
import { getLicenseStatus } from '../api.js';

export async function statusCommand() {
  p.intro(pc.bgCyan(pc.black(' VIBEKIT-VN Status ')));

  const lic = readLicense();
  if (!lic) {
    p.note('Chưa activate license trên máy này.', 'Trạng thái cục bộ');
    p.outro(pc.dim('Chạy: ') + pc.cyan('vibekit-vn activate VBK-LIFETIME-XXXX-YYYY-ZZZZ'));
    return;
  }

  const myMachine = computeMachineId();

  p.note(
    `License: ${pc.cyan(lic.license_key)}\n` +
      `Activated: ${pc.dim(lic.activated_at)}\n` +
      `Skill content: v${lic.version || pc.dim('chưa có')}\n` +
      `Machine ID: ${pc.dim(myMachine)}\n` +
      `Stored: ${pc.dim(lic.source)}`,
    'Trạng thái cục bộ'
  );

  const s = p.spinner();
  s.start('Đang truy vấn server…');
  const resp = await getLicenseStatus({ license_key: lic.license_key });
  if (resp.status !== 200) {
    s.stop(pc.red('✖ Không lấy được trạng thái'));
    p.cancel(`Server trả: ${resp.body?.code || resp.status}`);
    return;
  }
  s.stop(pc.green('✔ Đã lấy trạng thái'));

  const { license, activations } = resp.body;
  const active = activations.filter((a) => a.status === 'active');

  p.note(
    `Tier: ${license.tier}\n` +
      `Trạng thái: ${license.status}\n` +
      `Slot máy: ${active.length}/${license.max_machines}\n\n` +
      activations
        .map(
          (a) =>
            `${a.status === 'active' ? '🟢' : '⚪'} ${a.machine_id === myMachine ? pc.cyan('[MÁY NÀY] ') : ''}` +
            `${a.hostname || pc.dim('?')} ${pc.dim('(' + a.platform + ')')} ` +
            `${pc.dim('— ' + a.activated_at?.slice(0, 10))}`
        )
        .join('\n'),
    'Trạng thái server'
  );

  p.outro(pc.dim('Quản lý licenses: ') + pc.cyan('https://t.me/vibekitvn_bot → /mykeys'));
}
