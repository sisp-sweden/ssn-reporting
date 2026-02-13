#!/usr/bin/env node

/**
 * Daily Standup Skill Runner
 *
 * This script provides a wrapper for the daily standup functionality.
 * It can be used as a standalone runner or called from the Claude Code skill system.
 *
 * Usage:
 *   node run.js                          # Today
 *   node run.js yesterday                # Yesterday
 *   node run.js -3                       # 3 days ago
 *   node run.js 2026-02-11               # Specific date
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Project root is 3 levels up from .claude/skills/daily-standup/
const projectRoot = join(__dirname, '..', '..', '..');
const cliPath = join(projectRoot, 'src', 'index.js');

// Parse arguments
const args = process.argv.slice(2);
const dateArg = args[0];

// Build command arguments
const cmdArgs = ['--daily-standup'];
if (dateArg) {
  cmdArgs.push('--date', dateArg);
}

// Execute the CLI
const child = spawn('node', [cliPath, ...cmdArgs], {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: true
});

child.on('exit', (code) => {
  process.exit(code || 0);
});

child.on('error', (err) => {
  console.error('Failed to execute daily standup:', err);
  process.exit(1);
});
