// lib/commands/activate.js — `vibekitvn activate <KEY>`
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { computeMachineId, getMachineMetadata } from '../machine-fingerprint.js';
import { verifyLicense } from '../api.js';
import { writeLicense } from '../license-file.js';
import { downloadAndExtract } from '../download.js';

const KEY_RE = /^VBK-(LIFETIME|FOUNDING|ENT|V2)-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/i;

export async function activateCommand(licenseKeyArg, opts = {}) {
  p.intro(pc.bgCyan(pc.black(' VIBEKIT-VN Activate ')));

  let licenseKey = licenseKeyArg?.trim();
  if (!licenseKey) {
    const ans = await p.text({
      message: 'License key của bạn:',
      placeholder: 'VBK-LIFETIME-XXXX-YYYY-ZZZZ',
      validate: (v) => (KEY_RE.test(v?.trim() || '') ? undefined : 'Format key sai'),
    });
    if (p.isCancel(ans)) {
      p.cancel('Đã huỷ.');
      process.exit(0);
    }
    licenseKey = ans.trim();
  }
  licenseKey = licenseKey.toUpperCase();

  if (!KEY_RE.test(licenseKey)) {
    p.cancel(
      `Key sai format. Đúng phải là: ${pc.cyan('VBK-LIFETIME-XXXX-YYYY-ZZZZ')}`
    );
    process.exit(1);
  }

  const meta = getMachineMetadata();

  const s = p.spinner();
  s.start('Đang verify license với server…');

  let resp;
  try {
    resp = await verifyLicense({
      license_key: licenseKey,
      machine_id: meta.machine_id,
      hostname: meta.hostname,
      platform: meta.platform,
    });
  } catch (e) {
    s.stop(pc.red('✖ Không kết nối được server'));
    p.cancel(`Lỗi mạng: ${e.message}\nKiểm tra internet hoặc thử lại sau.`);
    process.exit(1);
  }

  if (resp.status !== 200) {
    s.stop(pc.red('✖ Verify thất bại'));
    const code = resp.body?.code || 'UNKNOWN';
    const msg = resp.body?.message || '';
    p.cancel(formatVerifyError(code, msg));
    process.exit(1);
  }

  s.stop(pc.green('✔ License verified'));

  const { license, download_url, version, sha256 } = resp.body;

  // Save license file
  writeLicense({
    license_key: licenseKey,
    machine_id: meta.machine_id,
    activated_at: new Date().toISOString(),
    version,
  });

  if (!download_url) {
    p.note(
      'Server không trả download URL. Có thể chưa có release nào published.\n' +
        'Liên hệ @vibekitvn_bot → /support nếu lặp lại.',
      'Cảnh báo'
    );
    p.outro(pc.yellow('Activated, nhưng chưa tải skill được.'));
    return;
  }

  // Download + extract
  const dl = p.spinner();
  dl.start('Đang tải skill content…');
  try {
    await downloadAndExtract({
      url: download_url,
      sha256,
      onProgress: (msg, pct) => dl.message(msg),
    });
    dl.stop(pc.green(`✔ Đã tải skill content v${version || '?'}`));
  } catch (e) {
    dl.stop(pc.red('✖ Tải hoặc giải nén thất bại'));
    p.cancel(`Lỗi: ${e.message}\nThử chạy lại \`vibekitvn activate\`.`);
    process.exit(1);
  }

  // Auto-install to AI IDEs (commander maps --no-sync → opts.sync=false)
  if (opts.sync === false) {
    p.outro(
      pc.green(`✔ Activated! Tier ${license.tier} • Max ${license.max_machines} máy.\n`) +
        pc.dim('Chạy `vibekitvn install` để cài skill vào AI IDE.')
    );
    return;
  }

  const isTty = Boolean(process.stdin.isTTY && process.stdout.isTTY);

  if (isTty) {
    // Hand off to the full interactive installer (matches VIBEKIT-VN UX:
    // banner, module picker, IDE multi-select, config prompts, summary, outro).
    p.outro(pc.green(`✔ License OK. Mở installer…`));
    try {
      const { installFull } = await import('./install-full.js');
      await installFull({});
    } catch (e) {
      console.error(pc.red(`✖ Installer lỗi: ${e.message}`));
      console.error(pc.dim('Thử chạy lại: `vibekitvn install`'));
      process.exit(1);
    }
    return;
  }

  // Headless / non-TTY fallback → minimal silent sync to preferred IDEs.
  const sync = p.spinner();
  sync.start('Đang sync skill vào AI IDE (headless)…');
  try {
    const { syncSkills } = await import('./install.js');
    const summary = await syncSkills({ silent: true });
    sync.stop(pc.green(`✔ Đã sync ${summary.skillCount} skill vào ${summary.platforms.length} AI IDE`));
  } catch (e) {
    sync.stop(pc.yellow('⚠ Sync skip — chạy `vibekitvn install` thủ công'));
  }

  p.outro(
    pc.green(`✔ Done! Tier ${license.tier} • Max ${license.max_machines} máy.\n`) +
      pc.dim('Tiếp theo: mở project trong AI IDE và gõ @vibekit-... trong chat.')
  );
}

function formatVerifyError(code, message) {
  switch (code) {
    case 'INVALID_KEY_FORMAT':
      return 'Key sai format. Đúng phải là VBK-LIFETIME-XXXX-YYYY-ZZZZ.';
    case 'KEY_NOT_FOUND':
      return 'Key không tồn tại. Kiểm tra lại hoặc liên hệ @vibekitvn_bot.';
    case 'REVOKED':
      return 'Key đã bị revoke. Liên hệ @vibekitvn_bot → /support.';
    case 'REFUNDED':
      return 'Key đã được refund. Mua key mới qua @vibekitvn_bot.';
    case 'MAX_MACHINES':
      return (
        message ||
        'Đã đạt giới hạn 2 máy. Dùng `vibekitvn deactivate` trên máy cũ để giải phóng slot.'
      );
    case 'RATE_LIMITED':
      return 'Quá nhiều request. Đợi 1 phút rồi thử lại.';
    default:
      return `Lỗi: ${code}${message ? ' — ' + message : ''}`;
  }
}
