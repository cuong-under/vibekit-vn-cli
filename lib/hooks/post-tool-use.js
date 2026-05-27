#!/usr/bin/env node
// lib/hooks/post-tool-use.js
// Claude Code PostToolUse hook — appends significant tool calls to session.log
//
// Receives JSON from stdin: { tool_name, tool_input, tool_response }
// Appends JSONL entry to {planning_artifacts}/session.log
// Zero dependencies — Node.js built-ins only. Fails silently on any error.

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

const TRACKED_TOOLS = new Set(['Write', 'Edit', 'Bash', 'NotebookEdit']);
const MAX_LOG_LINES = 500;
const TRIM_TO_LINES = 400;

async function main() {
  let raw = '';
  try {
    const rl = readline.createInterface({ input: process.stdin, terminal: false });
    for await (const line of rl) raw += line;
  } catch {
    process.exit(0);
  }

  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  const toolName = event.tool_name || event.tool?.name || '';
  if (!TRACKED_TOOLS.has(toolName)) process.exit(0);

  const logPath = resolveLogPath();
  if (!logPath) process.exit(0);

  const entry = buildEntry(toolName, event.tool_input || event.input || {});
  if (!entry) process.exit(0);

  try {
    ensureDir(path.dirname(logPath));
    appendWithRotate(logPath, JSON.stringify(entry));
  } catch {
    // fail silently — never block the IDE
  }

  process.exit(0);
}

function resolveLogPath() {
  try {
    const cwd = process.cwd();
    // Try reading planning_artifacts from core config
    const configPath = path.join(cwd, '_vibekitvn', 'core', 'config.yaml');
    let outputFolder = '_vibekitvn-output';
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf8');
      const match = content.match(/output_folder:\s*['"]?([^\n'"]+)['"]?/);
      if (match) outputFolder = match[1].trim();
    }
    return path.join(cwd, outputFolder, 'planning-artifacts', 'session.log');
  } catch {
    return null;
  }
}

function buildEntry(toolName, input) {
  const entry = { ts: new Date().toISOString(), tool: toolName };
  if (toolName === 'Write') {
    entry.file = input.file_path || input.path || '?';
    const content = input.content || '';
    entry.bytes = Buffer.byteLength(content, 'utf8');
  } else if (toolName === 'Edit') {
    entry.file = input.file_path || input.path || '?';
  } else if (toolName === 'Bash') {
    const cmd = (input.command || '').slice(0, 120);
    entry.cmd = cmd;
  } else if (toolName === 'NotebookEdit') {
    entry.file = input.notebook_path || '?';
  }
  return entry;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function appendWithRotate(logPath, line) {
  if (fs.existsSync(logPath)) {
    const content = fs.readFileSync(logPath, 'utf8');
    const lines = content.split('\n').filter(Boolean);
    if (lines.length >= MAX_LOG_LINES) {
      const trimmed = lines.slice(lines.length - TRIM_TO_LINES).join('\n') + '\n';
      fs.writeFileSync(logPath, trimmed, 'utf8');
    }
  }
  fs.appendFileSync(logPath, line + '\n', 'utf8');
}

main();
