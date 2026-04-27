// lib/installer/ui.js — clack/picocolors wrapper (ESM port)
import * as clack from '@clack/prompts';
import pc from 'picocolors';

function abortIfCancelled(value, message = 'Đã hủy. Tạm biệt!') {
  if (clack.isCancel(value)) {
    clack.cancel(message);
    process.exit(0);
  }
  return value;
}

export async function intro(title) {
  clack.intro(pc.bgCyan(pc.black(` ${title} `)));
}

export async function outro(message) {
  clack.outro(pc.green(message));
}

export async function note(body, title) {
  clack.note(body, title);
}

export async function logInfo(message) { clack.log.info(message); }
export async function logSuccess(message) { clack.log.success(message); }
export async function logWarn(message) { clack.log.warn(message); }
export async function logError(message) { clack.log.error(message); }
export async function logStep(message) { clack.log.step(message); }

export async function askText({ message, placeholder, defaultValue, validate }) {
  const value = await clack.text({
    message,
    placeholder,
    defaultValue,
    initialValue: defaultValue,
    validate,
  });
  return abortIfCancelled(value);
}

export async function askSelect({ message, options, initialValue }) {
  const value = await clack.select({ message, options, initialValue });
  return abortIfCancelled(value);
}

export async function askMultiSelect({ message, options, initialValues, required = false }) {
  const value = await clack.multiselect({ message, options, initialValues, required });
  return abortIfCancelled(value);
}

export async function askConfirm({ message, initialValue = true }) {
  const value = await clack.confirm({ message, initialValue });
  return abortIfCancelled(value);
}

export async function withSpinner(startMsg, doneMsg, fn) {
  const s = clack.spinner();
  s.start(startMsg);
  try {
    const result = await fn(s);
    s.stop(doneMsg);
    return result;
  } catch (err) {
    s.stop(`Lỗi: ${err.message}`, 2);
    throw err;
  }
}

export const DEV_INFO = {
  name: 'Cuongunder',
  telegram: '@vibekitvn_bot',
  copyright: '© Cuongunder',
};

const BANNER_VIBEKIT = [
  '██╗   ██╗██╗██████╗ ███████╗██╗  ██╗██╗████████╗',
  '██║   ██║██║██╔══██╗██╔════╝██║ ██╔╝██║╚══██╔══╝',
  '██║   ██║██║██████╔╝█████╗  █████╔╝ ██║   ██║   ',
  '╚██╗ ██╔╝██║██╔══██╗██╔══╝  ██╔═██╗ ██║   ██║   ',
  ' ╚████╔╝ ██║██████╔╝███████╗██║  ██╗██║   ██║   ',
  '  ╚═══╝  ╚═╝╚═════╝ ╚══════╝╚═╝  ╚═╝╚═╝   ╚═╝   ',
];
const BANNER_VN = [
  '██╗   ██╗███╗   ██╗',
  '██║   ██║████╗  ██║',
  '██║   ██║██╔██╗ ██║',
  '╚██╗ ██╔╝██║╚██╗██║',
  ' ╚████╔╝ ██║ ╚████║',
  '  ╚═══╝  ╚═╝  ╚═══╝',
];

export async function showBanner(version) {
  const padding = '  ';
  console.log('');
  for (const line of BANNER_VIBEKIT) console.log(padding + pc.bold(pc.red(line)));
  console.log('');
  for (const line of BANNER_VN) console.log(padding + pc.bold(pc.yellow(line)));
  console.log('');
  console.log(padding + pc.dim('bộ kỹ năng AI tiếng Việt cho phát triển sản phẩm'));
  console.log(
    padding +
      pc.bold(pc.cyan(`Dev: ${DEV_INFO.name}`)) +
      pc.dim('   ·   ') +
      pc.bold(pc.cyan(`Tele: ${DEV_INFO.telegram}`))
  );
  console.log(padding + pc.dim(`v${version}  ·  ${DEV_INFO.copyright}`));
  console.log('');
}

export function option(value, label, hint) {
  return hint ? { value, label, hint } : { value, label };
}

export const color = pc;

export async function devContactLine() {
  return pc.dim(`Dev: ${DEV_INFO.name}  ·  Telegram: ${DEV_INFO.telegram}`);
}
