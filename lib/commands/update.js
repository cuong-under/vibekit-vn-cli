// lib/commands/update.js — re-download latest skill content
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { readLicense, writeLicense } from '../license-file.js';
import { computeMachineId } from '../machine-fingerprint.js';
import { getLatestRelease } from '../api.js';
import { downloadAndExtract } from '../download.js';

export async function updateCommand() {
  p.intro(pc.bgCyan(pc.black(' VIBEKIT-VN Update ')));

  const lic = readLicense();
  if (!lic) {
    p.cancel('Chưa activate. Chạy `vibekitvn activate <KEY>` trước.');
    process.exit(1);
  }

  const machineId = computeMachineId();
  const s = p.spinner();
  s.start('Đang kiểm tra version mới nhất…');
  const resp = await getLatestRelease({ license_key: lic.license_key, machine_id: machineId });
  if (resp.status !== 200) {
    s.stop(pc.red('✖ Lỗi'));
    p.cancel(`${resp.body?.code || resp.status}`);
    process.exit(1);
  }
  s.stop(pc.green(`✔ Latest: v${resp.body.version}`));

  if (lic.version === resp.body.version) {
    p.outro(pc.dim('Đã ở version mới nhất, không cần update.'));
    return;
  }

  const dl = p.spinner();
  dl.start(`Đang tải v${resp.body.version}…`);
  await downloadAndExtract({
    url: resp.body.download_url,
    sha256: resp.body.sha256,
    onProgress: (msg) => dl.message(msg),
  });
  dl.stop(pc.green(`✔ Đã tải v${resp.body.version}`));

  writeLicense({
    ...lic,
    version: resp.body.version,
  });

  // Re-sync
  const sync = p.spinner();
  sync.start('Đang sync vào AI IDE…');
  try {
    const { syncSkills } = await import('./install.js');
    const summary = await syncSkills({ silent: true });
    sync.stop(pc.green(`✔ Đã sync ${summary.skillCount} skill`));
  } catch (e) {
    sync.stop(pc.yellow('⚠ Sync skip — chạy `vibekitvn install` thủ công'));
  }

  p.outro(pc.green(`✔ Đã update lên v${resp.body.version}`));
}
