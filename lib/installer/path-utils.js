// lib/installer/path-utils.js — path helpers that tolerate Windows paths on POSIX
import path from 'node:path';

export function isAbsoluteAnyPlatform(value) {
  const p = String(value || '');
  return path.isAbsolute(p) || /^[a-zA-Z]:[\\/]/.test(p) || /^[/\\]{2}[^/\\]/.test(p);
}

export function resolveProjectPath(projectRoot, value) {
  const p = String(value || '');
  if (!p) return projectRoot;
  return isAbsoluteAnyPlatform(p) ? p : path.join(projectRoot, p);
}

export function toProjectRelativePath(projectRoot, value, fallback = '_vibekitvn-output') {
  let p = String(value || fallback);
  const root = String(projectRoot || '');
  const normalizedRoot = trimTrailingSlash(root).replace(/\\/g, '/').toLowerCase();

  while (normalizedRoot) {
    const normalizedPath = p.replace(/\\/g, '/').toLowerCase();
    if (normalizedPath === normalizedRoot) return fallback;
    if (!normalizedPath.startsWith(`${normalizedRoot}/`)) break;
    p = p.slice(trimTrailingSlash(root).length).replace(/^[\\/]+/, '') || fallback;
  }
  return p || fallback;
}

function trimTrailingSlash(value) {
  return String(value || '').replace(/[\\/]+$/, '');
}
