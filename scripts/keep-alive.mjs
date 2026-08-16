#!/usr/bin/env node
/**
 * Robust Keep-Alive for Next.js on Z.ai containers
 * - Auto-restarts on crash
 * - Health checks every 20s via HTTP
 * - Restart on unresponsive server
 * - Single instance (PID lock file)
 * - Clean shutdown on SIGTERM/SIGINT
 * - Rapid-restart protection (cooldown after 5 crashes in 60s)
 */

import { spawn } from 'node:child_process';
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'node:fs';
import http from 'node:http';

const PORT = 3000;
const PID_FILE = '/tmp/next-keep-alive.pid';
const LOG_FILE = '/tmp/next-keeper.log';
const HEALTH_INTERVAL = 20000;   // 20s health check
const RESTART_DELAY = 3000;      // 3s between restarts
const MAX_RAPID_RESTARTS = 5;    // Max restarts within 1 minute
const RAPID_RESTART_WINDOW = 60000; // 1 minute window

let child = null;
let isShuttingDown = false;
let restartTimes = [];
let healthCheckTimer = null;

function log(msg) {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${msg}\n`;
  try { writeFileSync(LOG_FILE, line, { flag: 'a' }); } catch {}
  console.log(line.trim());
}

function cleanup() {
  try { unlinkSync(PID_FILE); } catch {}
}

function checkSingleInstance() {
  if (existsSync(PID_FILE)) {
    try {
      const existingPid = parseInt(readFileSync(PID_FILE, 'utf8').trim());
      try {
        process.kill(existingPid, 0); // throws if not running
        log(`Another keep-alive (PID ${existingPid}) already running. Exiting.`);
        process.exit(0);
      } catch {
        log(`Stale PID file (PID ${existingPid} gone). Taking over.`);
        cleanup();
      }
    } catch { cleanup(); }
  }
  writeFileSync(PID_FILE, String(process.pid));
}

function healthCheck() {
  if (isShuttingDown || !child) return;
  
  const start = Date.now();
  const req = http.get(`http://localhost:${PORT}/`, (res) => {
    res.resume();
    const ok = res.statusCode < 500 && (Date.now() - start) < 10000;
    if (!ok) {
      log(`⚠️ Health check: status=${res.statusCode}, time=${Date.now()-start}ms - FAIL`);
      restartOnFailure();
    }
  });
  req.on('error', (e) => {
    log(`⚠️ Health check error: ${e.message} - restarting...`);
    restartOnFailure();
  });
  req.setTimeout(5000, () => {
    req.destroy();
    log('⚠️ Health check timeout - restarting...');
    restartOnFailure();
  });
}

function restartOnFailure() {
  if (isShuttingDown) return;
  killChild();
  const delay = checkRapidRestart();
  log(`⏳ Restarting in ${delay/1000}s...`);
  setTimeout(startServer, delay);
}

function killChild() {
  if (child && !child.killed) {
    try { child.kill('SIGTERM'); } catch {}
    const forceKill = setTimeout(() => {
      if (child && !child.killed) {
        try { child.kill('SIGKILL'); } catch {}
      }
    }, 5000);
    // Clear force-kill timer if child exits naturally
    if (child) {
      child.on('exit', () => { clearTimeout(forceKill); });
    }
  }
  child = null;
}

function checkRapidRestart() {
  const now = Date.now();
  restartTimes = restartTimes.filter(t => now - t < RAPID_RESTART_WINDOW);
  restartTimes.push(now);
  
  if (restartTimes.length >= MAX_RAPID_RESTARTS) {
    log(`Too many restarts (${restartTimes.length} in ${RAPID_RESTART_WINDOW/1000}s). Cooling down 30s...`);
    return 30000;
  }
  return RESTART_DELAY;
}

function startServer() {
  if (isShuttingDown) return;
  
  log('Starting Next.js dev server on port ' + PORT);
  
  child = spawn('node', [
    'node_modules/next/dist/bin/next',
    'dev',
    '-p', String(PORT)
  ], {
    cwd: '/home/z/my-project',
    env: { ...process.env, NODE_ENV: 'development', PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false
  });
  
  let readyDetected = false;
  
  child.stdout.on('data', (data) => {
    const text = data.toString().trim();
    if (text) {
      log(`[out] ${text}`);
      if (text.includes('Ready in') && !readyDetected) {
        readyDetected = true;
        log('✅ Server is ready!');
      }
    }
  });
  
  child.stderr.on('data', (data) => {
    const text = data.toString().trim();
    if (text) log(`[err] ${text}`);
  });
  
  child.on('exit', (code, signal) => {
    log(`Server exited (code=${code}, signal=${signal})`);
    child = null;
    if (!isShuttingDown) {
      const delay = checkRapidRestart();
      log(`Restarting in ${delay/1000}s...`);
      setTimeout(startServer, delay);
    }
  });
  
  child.on('error', (err) => {
    log(`Failed to spawn: ${err.message}`);
    child = null;
    if (!isShuttingDown) {
      setTimeout(startServer, RESTART_DELAY * 2);
    }
  });
}

// Graceful shutdown
function shutdown(signal) {
  log(`Received ${signal}, shutting down...`);
  isShuttingDown = true;
  if (healthCheckTimer) clearInterval(healthCheckTimer);
  cleanup();
  killChild();
  setTimeout(() => process.exit(0), 2000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// === Main ===
log('=== Next.js Keep-Alive Supervisor ===');
checkSingleInstance();
startServer();

// Periodic health checks
healthCheckTimer = setInterval(healthCheck, HEALTH_INTERVAL);
log(`Health checks every ${HEALTH_INTERVAL/1000}s`);
