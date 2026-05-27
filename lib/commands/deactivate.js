// lib/commands/deactivate.js — release current machine slot
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { readLicense, deleteLicense } from '../license-file.js';
import { computeMachineId } from '../machine-fingerprint.js';
import { deactivateLicense } from '../api.js';
import { maskLicenseKey } from '../license-mask.js';

export async function deactivateCommand() {
  p.intro(pc.bgYellow(pc.black(' VIBEKIT-VN Deactivate ')));

  const lic = readLicense();
  if (!lic) {
    p.cancel('Máy này chưa activate license.');
    process.exit(1);
  }

  const confirm = await p.confirm({
    message:
      `Giải phóng máy này khỏi license ${pc.cyan(maskLicenseKey(lic.license_key))}?\n` +
      pc.yellow('Lưu ý: cooldown 90 ngày trước khi máy này có thể activate lại bằng cùng key.'),
  });
  if (p.isCancel(confirm) || !confirm) {
    p.cancel('Đã huỷ.');
    process.exit(0);
  }

  const machineId = computeMachineId();
  const s = p.spinner();
  s.start('Đang gọi server…');
  let resp;
  try {
    resp = await deactivateLicense({ license_key: lic.license_key, machine_id: machineId });
  } catch (e) {
    s.stop(pc.red('✖ Lỗi kết nối'));
    p.cancel(e?.message || 'Network error');
    process.exit(1);
  }
  if (resp.status !== 200) {
    s.stop(pc.red('✖ Server từ chối'));
    p.cancel(`${resp.body?.code} ${resp.body?.message || ''}`);
    process.exit(1);
  }
  s.stop(pc.green('✔ Đã giải phóng slot máy'));

  // Remove local license file
  deleteLicense();
  p.outro(pc.green('Done. ') + pc.dim(resp.body.message));
}
