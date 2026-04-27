// lib/machine-fingerprint.js
//
// Compute a stable, anonymous machine ID by hashing OS-level identifiers.
// Output: 16 hex chars (64-bit). NOT reversible — original components are
// hashed with a versioned salt.
//
// Components chosen for stability across reboots/updates while still
// distinguishing physical machines:
//   - hostname        (user-visible, fairly stable)
//   - username        (system user, stable on personal machines)
//   - platform + arch (won't change without re-install)
//   - CPU model       (stable, hardware-tied)
//   - HOME path       (stable user profile)
//
// SALT versioned so we can roll forward in future without breaking
// existing activations.

import crypto from 'node:crypto';
import os from 'node:os';

const SALT = 'vibekit-vn-machine-fp-v1';

export function computeMachineId() {
  const components = [
    os.hostname(),
    safeUserInfo(),
    os.platform(),
    os.arch(),
    safeCpuModel(),
    process.env.HOME || process.env.USERPROFILE || '',
  ];
  const raw = components.join('|');
  return crypto
    .createHash('sha256')
    .update(SALT + '|' + raw)
    .digest('hex')
    .slice(0, 16);
}

export function getMachineMetadata() {
  return {
    machine_id: computeMachineId(),
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
  };
}

function safeUserInfo() {
  try {
    return os.userInfo().username;
  } catch {
    return process.env.USER || process.env.USERNAME || '';
  }
}

function safeCpuModel() {
  try {
    const cpus = os.cpus();
    return cpus[0]?.model || 'unknown';
  } catch {
    return 'unknown';
  }
}
