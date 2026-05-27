// lib/commands/update.js — re-download latest skill content
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { readLicense, writeLicense } from '../license-file.js';
import { computeMachineId } from '../machine-fingerprint.js';
import { getLatestRelease } from '../api.js';
import { downloadAndExtract } from '../download.js';
import { applyWatermark } from '../watermark.js';
import { getBundleRoot } from '../installer/paths.js';

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
  try {
    await downloadAndExtract({
      url: resp.body.download_url,
      sha256: resp.body.sha256,
      onProgress: (msg) => dl.message(msg),
    });
  } catch (e) {
    dl.stop(pc.red('✖ Tải thất bại'));
    p.cancel(e?.message || 'Download error');
    process.exit(1);
  }
  dl.stop(pc.green(`✔ Đã tải v${resp.body.version}`));

  try {
    const wm = applyWatermark({
      bundleRoot: getBundleRoot(process.cwd()),
      licenseKey: lic.license_key,
      machineId: computeMachineId(),
    });
    if (process.env.VIBEKITVN_DEBUG) {
      console.log(pc.dim(`  watermark: stamped ${wm.stamped}/${wm.total} files`));
    }
  } catch (e) {
    if (process.env.VIBEKITVN_DEBUG) {
      console.error(pc.dim(`  watermark skipped: ${e.message}`));
    }
  }

  // Re-sync first, then persist the new version
  const sync = p.spinner();
  sync.start('Đang sync vào AI IDE…');
  try {
    const { syncSkills } = await import('./install.js');
    const summary = await syncSkills({ silent: true, force: true });
    sync.stop(pc.green(`✔ Đã sync ${summary.skillCount} skill`));
  } catch (e) {
    sync.stop(pc.red('✖ Sync thất bại'));
    p.cancel('Đã tải content nhưng chưa cập nhật IDE. Chạy `vibekitvn install --force` rồi thử lại.');
    process.exit(1);
  }

  writeLicense({
    ...lic,
    version: resp.body.version,
  });

  p.outro(pc.green(`✔ Đã update lên v${resp.body.version}`));
}
