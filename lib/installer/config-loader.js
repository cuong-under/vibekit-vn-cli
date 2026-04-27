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

const KNOWN_MODULE_DIRS = [
  { id: 'core', folder: 'core-skills' },
  { id: 'vbk', folder: 'vbk-ky-nang' },
];

export function listModules(bundleRoot) {
  const modules = [];
  for (const known of KNOWN_MODULE_DIRS) {
    const yamlPath = path.join(bundleRoot, 'modules', known.folder, 'module.yaml');
    if (!fs.existsSync(yamlPath)) continue;
    let raw;
    try {
      raw = yaml.load(fs.readFileSync(yamlPath, 'utf8')) || {};
    } catch {
      continue;
    }
    modules.push({
      id: raw.code || known.id,
      slug: known.folder,
      name: raw.name || known.id,
      description: raw.description || '',
      defaultSelected: raw.default_selected !== false,
      yamlPath,
      raw,
    });
  }
  return modules;
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
