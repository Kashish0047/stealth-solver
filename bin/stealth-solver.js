#!/usr/bin/env node

const electron = require('electron');
const { spawn } = require('child_process');
const path = require('path');

const appPath = path.join(__dirname, '..');
const args = process.argv.slice(2);

const proc = spawn(electron, [appPath, ...args], {
  stdio: 'inherit',
  windowsHide: false
});

proc.on('close', (code) => {
  process.exit(code ?? 0);
});

proc.on('error', (err) => {
  console.error('Failed to launch stealth-solver:', err.message);
  process.exit(1);
});
