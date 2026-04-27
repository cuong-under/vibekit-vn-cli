// lib/installer/platforms.js — load platforms.yaml from extracted bundle
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

let _cache = null;

export function loadPlatforms(bundleRoot) {
  if (_cache && _cache.bundleRoot === bundleRoot) return _cache;
  const file = path.join(bundleRoot, 'platforms.yaml');
  if (!fs.existsSync(file)) {
    throw new Error(
      `Không tìm thấy platforms.yaml trong ${bundleRoot}. ` +
        `Bundle có thể đã hỏng — chạy lại \`vibekit-vn update\`.`
    );
  }
  const parsed = yaml.load(fs.readFileSync(file, 'utf8')) || {};
  const list = parsed.platforms || [];
  const map = new Map(list.map((p) => [p.id, p]));
  _cache = { bundleRoot, list, map };
  return _cache;
}

export function getPreferredTools(bundleRoot) {
  return loadPlatforms(bundleRoot).list.filter((p) => p.preferred).map((p) => p.id);
}

export function parseToolsOption(bundleRoot, value) {
  const raw = String(value || 'preferred').trim();
  if (raw === 'all') return loadPlatforms(bundleRoot).list.map((p) => p.id);
  if (raw === 'preferred') return getPreferredTools(bundleRoot);
  if (raw === 'none') return [];
  return raw.split(',').map((t) => t.trim()).filter(Boolean);
}

export function validateTools(bundleRoot, toolIds) {
  const { map } = loadPlatforms(bundleRoot);
  const unknown = toolIds.filter((id) => !map.has(id));
  if (unknown.length) throw new Error(`Tool không hỗ trợ: ${unknown.join(', ')}`);
  return toolIds.map((id) => map.get(id));
}
