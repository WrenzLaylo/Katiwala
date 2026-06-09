#!/usr/bin/env node
/**
 * Starts Expo with REACT_NATIVE_PACKAGER_HOSTNAME pinned to this machine's real
 * LAN IP, so Metro (and, since src/lib/api.ts derives the API URL from Metro's
 * host, the app's API calls too) advertise an address a physical phone can
 * actually reach — not a virtual adapter like VirtualBox's 192.168.56.x.
 *
 * The IP is auto-detected on every run so it survives DHCP changes and moving
 * between networks. Override it any time with:
 *   $env:EXPO_LAN_IP = "192.168.1.50"   (PowerShell)
 *   EXPO_LAN_IP=192.168.1.50 npm start  (bash)
 */
const os = require('os');
const { spawn } = require('child_process');

function scoreAddress(ip) {
  if (ip.startsWith('169.254.')) return 0; // APIPA / link-local — never routable
  if (ip.startsWith('192.168.56.')) return 0; // VirtualBox host-only default
  if (ip.startsWith('192.168.')) return 3; // typical home Wi-Fi/LAN
  if (ip.startsWith('10.')) return 2;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return 2; // private 172.16–31
  return 1;
}

function detectLanIp() {
  if (process.env.EXPO_LAN_IP) return process.env.EXPO_LAN_IP;

  let best = null;
  let bestScore = 0;
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const addr of addrs || []) {
      if (addr.family !== 'IPv4' || addr.internal) continue;
      const score = scoreAddress(addr.address);
      if (score > bestScore) {
        bestScore = score;
        best = addr.address;
      }
    }
  }
  return best;
}

const ip = detectLanIp();
const env = { ...process.env };

if (ip) {
  env.REACT_NATIVE_PACKAGER_HOSTNAME = ip;
  console.log(`\x1b[36m[katiwala]\x1b[0m Metro + API host → ${ip}\n`);
} else {
  console.log('\x1b[33m[katiwala]\x1b[0m Could not detect a LAN IP; using Expo defaults.\n');
}

// Forward any extra CLI args, e.g. `npm start -- --clear`.
const args = ['expo', 'start', ...process.argv.slice(2)];
const child = spawn('npx', args, {
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

child.on('exit', (code) => process.exit(code ?? 0));
