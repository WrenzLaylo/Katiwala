#!/usr/bin/env node
/**
 * Runs the app on a USB-connected Android phone with NO Wi-Fi or firewall setup.
 *
 * It uses `adb reverse` to tunnel the phone's localhost back to this PC for both
 * Metro (8081) and the API (3000), then starts Expo pinned to localhost. Pairs
 * with src/lib/api.ts, which targets http://localhost:3000 on a physical device.
 *
 * Requires: USB debugging enabled + the phone authorized (`adb devices` shows it).
 */
const os = require('os');
const path = require('path');
const fs = require('fs');
const { spawn, spawnSync } = require('child_process');

const METRO_PORT = 8081;
const API_PORT = 3000;

function resolveAdb() {
  const sdk =
    process.env.ANDROID_HOME ||
    process.env.ANDROID_SDK_ROOT ||
    path.join(os.homedir(), 'AppData', 'Local', 'Android', 'Sdk');
  const bin = path.join(sdk, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');
  return fs.existsSync(bin) ? bin : 'adb'; // fall back to PATH
}

// Kill whatever is holding `port` so Metro can't silently drift to another port
// (which would break the adb-reverse tunnel that targets a fixed port).
function freePort(port) {
  if (process.platform === 'win32') {
    const out = spawnSync('netstat', ['-ano'], { encoding: 'utf8' }).stdout || '';
    const pids = new Set();
    for (const line of out.split('\n')) {
      if (line.includes(`:${port} `) && line.includes('LISTENING')) {
        const pid = line.trim().split(/\s+/).pop();
        if (pid && pid !== '0') pids.add(pid);
      }
    }
    for (const pid of pids) spawnSync('taskkill', ['/PID', pid, '/F'], { stdio: 'ignore' });
    if (pids.size) console.log(`\x1b[33m[katiwala]\x1b[0m freed port ${port} (was in use)`);
  } else {
    const out = spawnSync('lsof', ['-ti', `tcp:${port}`], { encoding: 'utf8' }).stdout || '';
    for (const pid of out.split('\n').filter(Boolean)) {
      spawnSync('kill', ['-9', pid], { stdio: 'ignore' });
    }
  }
}

const adb = resolveAdb();

// Confirm a device is attached.
const list = spawnSync(adb, ['devices'], { encoding: 'utf8' });
const devices = (list.stdout || '')
  .split('\n')
  .slice(1)
  .map((l) => l.trim())
  .filter((l) => l.endsWith('\tdevice'));

if (devices.length === 0) {
  console.error(
    '\x1b[31m[katiwala]\x1b[0m No USB device found. Plug in the phone, enable USB ' +
      'debugging, accept the "Allow USB debugging?" prompt, then retry.\n',
  );
  process.exit(1);
}

// Free the Metro port first so Expo can't drift to another port and break the
// tunnel below (the root cause of "failed to download remote update" over USB).
freePort(METRO_PORT);

// Tunnel both ports from the phone's localhost to this machine.
for (const port of [METRO_PORT, API_PORT]) {
  const r = spawnSync(adb, ['reverse', `tcp:${port}`, `tcp:${port}`], { encoding: 'utf8' });
  if (r.status !== 0) {
    console.error(`\x1b[31m[katiwala]\x1b[0m adb reverse failed for ${port}: ${r.stderr || ''}`);
    process.exit(1);
  }
}

console.log(`\x1b[36m[katiwala]\x1b[0m USB ready — phone localhost → PC (Metro ${METRO_PORT}, API ${API_PORT})\n`);

const env = { ...process.env, REACT_NATIVE_PACKAGER_HOSTNAME: 'localhost' };
// Pin the Metro port so it always matches the adb-reverse tunnel above.
const args = [
  'expo', 'start', '--android', '--localhost', '--port', String(METRO_PORT),
  ...process.argv.slice(2),
];
const child = spawn('npx', args, {
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

child.on('exit', (code) => process.exit(code ?? 0));
