// lib/installer/config-loader.js — load module.yaml prompts/directories from bundle
//
// Bundle layout:
//   _vibekitvn/modules/<core-skills|vbk-ky-nang>/module.yaml
//
// Each module.yaml contains:
//   code, name, description, default_selected
//   <prompt-key>: { prompt, default, single-select?, multi-select?, result }
//   directories: [string]    (created during install)

import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const MODULE_ALIASES = {
  'core-skills': 'core',
  'vbk-ky-nang': 'vbk-dev',
  vbk: 'vbk-dev',
};

export function listModules(bundleRoot) {
  const modules = [];
  const modulesDir = path.join(bundleRoot, 'modules');
  if (!fs.existsSync(modulesDir)) return modules;

  for (const entry of fs.readdirSync(modulesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const yamlPath = path.join(modulesDir, entry.name, 'module.yaml');
    if (!fs.existsSync(yamlPath)) continue;
    let raw;
    try {
      raw = yaml.load(fs.readFileSync(yamlPath, 'utf8')) || {};
    } catch {
      continue;
    }
    modules.push({
      id: normalizeModuleId(raw.code || entry.name),
      slug: entry.name,
      name: raw.name || normalizeModuleId(raw.code || entry.name),
      description: raw.description || '',
      defaultSelected: raw.default_selected !== false,
      yamlPath,
      raw,
    });
  }
  return modules;
}

function normalizeModuleId(id) {
  return MODULE_ALIASES[id] || id;
}

export function loadModulePrompts(module, knownValues = {}) {
  const prompts = [];
  for (const [key, value] of Object.entries(module.raw || {})) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    if (!value.prompt) continue;

    const messageLines = Array.isArray(value.prompt) ? value.prompt : [value.prompt];
    const message = messageLines[0];
    const hint = messageLines.slice(1).join(' · ') || undefined;

    const defaultRaw = value.default;
    const defaultValue = typeof defaultRaw === 'string'
      ? interpolate(defaultRaw, knownValues)
      : defaultRaw;

    if (value['single-select']) {
      prompts.push({
        key,
        kind: 'select',
        message,
        hint,
        default: defaultValue,
        options: value['single-select'].map((e) => ({
          value: e.value,
          label: e.label || e.value,
          hint: e.hint,
        })),
        result: value.result,
      });
    } else if (value['multi-select']) {
      prompts.push({
        key,
        kind: 'multiselect',
        message,
        hint,
        default: defaultValue,
        options: value['multi-select'].map((e) => ({
          value: e.value,
          label: e.label || e.value,
          hint: e.hint,
        })),
        result: value.result,
      });
    } else {
      prompts.push({
        key,
        kind: 'text',
        message,
        hint,
        default: defaultValue,
        result: value.result,
      });
    }
  }
  return prompts;
}

export function loadModuleDirectories(module, answers) {
  const dirs = [];
  for (const entry of module.raw?.directories || []) {
    dirs.push(interpolate(entry, answers));
  }
  return dirs;
}

export function applyResult(prompt, value, answers) {
  const template = prompt.result || '{value}';
  return interpolate(template, { ...answers, value });
}

export function interpolate(template, context) {
  if (typeof template !== 'string') return template;
  return template.replace(/\{([\w-]+)\}/g, (full, key) => {
    if (context && key in context && context[key] != null) return String(context[key]);
    return full;
  });
}
