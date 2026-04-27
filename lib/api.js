// lib/api.js — license server API client (uses global fetch)
//
// Server URL is configurable via env to support self-hosted / staging:
//   VIBEKITVN_API_URL=https://license.vibekit.vn

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const DEFAULT_API_URL = 'https://vibekit-license-server.vercel.app';

export function getApiUrl() {
  return (
    process.env.VIBEKITVN_API_URL ||
    DEFAULT_API_URL
  ).replace(/\/+$/, '');
}

export function getCliVersion() {
  try {
    const pkgPath = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      '..',
      'package.json'
    );
    return JSON.parse(readFileSync(pkgPath, 'utf8')).version;
  } catch {
    return 'unknown';
  }
}

async function postJson(endpoint, body) {
  const url = getApiUrl() + endpoint;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': `vibekit-vn-cli/${getCliVersion()}`,
    },
    body: JSON.stringify(body),
  });
  let data;
  try {
    data = await res.json();
  } catch {
    data = { status: 'error', code: 'INVALID_RESPONSE', http_status: res.status };
  }
  return { status: res.status, body: data };
}

export async function verifyLicense({ license_key, machine_id, hostname, platform }) {
  return postJson('/api/license/verify', {
    license_key,
    machine_id,
    hostname,
    platform,
    cli_version: getCliVersion(),
  });
}

export async function getLicenseStatus({ license_key }) {
  return postJson('/api/license/status', { license_key });
}

export async function deactivateLicense({ license_key, machine_id }) {
  return postJson('/api/license/deactivate', { license_key, machine_id });
}

export async function getLatestRelease({ license_key, machine_id }) {
  return postJson('/api/release/latest', { license_key, machine_id });
}
