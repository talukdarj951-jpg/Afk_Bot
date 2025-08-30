// index.js
const mineflayer = require('mineflayer');
const express = require('express');

// ----- Configuration (use Render environment variables) -----
const HOST = process.env.MC_HOST || 'OnlitesSMP_S2.aternos.me';
const PORT = Number(process.env.MC_PORT || 57535);
const USERNAME = process.env.BOT_NAME || 'AFK_Bot';
const AUTHME_PASSWORD = process.env.AUTHME_PASS || '';      // AuthMe password (if used)
const AUTH_TYPE = process.env.AUTH_TYPE || 'offline';       // 'offline' or 'microsoft' (default offline)
const MC_VERSION = process.env.MC_VERSION || false;         // e.g. '1.21.1' or false for auto
const RECONNECT_BASE_MS = Number(process.env.RECONNECT_DELAY_MS || 5000);
const ANTI_AFK_INTERVAL_MS = Number(process.env.ANTI_AFK_INTERVAL_MS || 25000);
const FORCE_LOGIN_INTERVAL_MS = Number(process.env.FORCE_LOGIN_INTERVAL_MS || 120000);

// ----- Web server for keep-alive (Render uses this to confirm service) -----
const app = express();
app.get('/', (_req, res) => res.send('AFK bot is alive ✅'));
const webPort = process.env.PORT || 3000;
app.listen(webPort, () => console.log(`[web] listening on :${webPort}`));

// ----- bot state -----
let bot = null;
let antiAfkTimer = null;
let loginInterval = null;
let reconnectDelay = RECONNECT_BASE_MS;

function createBot() {
  console.log('[bot] createBot', { HOST, PORT, USERNAME, AUTH_TYPE, MC_VERSION });

  try {
    bot = mineflayer.createBot({
      host: HOST,
      port: PORT,
      username: USERNAME,
      password: undefined,      // only used if you switch to premium auth
      version: MC_VERSION || false,
      auth: AUTH_TYPE === 'offline' ? 'offline' : AUTH_TYPE
    });
  } catch (e) {
    console.error('[bot] create error', e);
    scheduleReconnect();
    return;
  }

  bot.once('spawn', onSpawn);
  bot.on('kicked', reason => console.warn('[bot] kicked:', reason?.toString?.() || reason));
  bot.on('end', () => {
    console.warn('[bot] connection ended');
    cleanup();
    scheduleReconnect();
  });
  bot.on('error', err => console.error('[bot] error', err && err.message ? err.message : err));
  bot.on('message', (msg) => {
    try {
      const s = msg?.toString?.() || '';
      if (s) console.log('[chat]', s);
      const lower = s.toLowerCase();
      if (lower.includes('register') || lower.includes('/register') || lower.includes('use /register') ||
          lower.includes('/login') || lower.includes('login')) {
        sendAuth();
      }
    } catch (e) {}
  });
  bot.on('death', () => console.log('[bot] died'));
  bot.on('respawn', () => console.log('[bot] respawned'));
}

function onSpawn() {
  console.log('[bot] spawned in world');
  reconnectDelay = RECONNECT_BASE_MS; // reset backoff on successful spawn
  setTimeout(() => sendAuth(), 1500); // try to /register + /login if needed
  startAntiAfk();
  if (loginInterval) clearInterval(loginInterval);
  loginInterval = setInterval(() => {
    if (bot && bot.entity) sendAuth();
  }, FORCE_LOGIN_INTERVAL_MS);
}

function sendAuth() {
  if (!bot || !bot.chat) return;
  if (!AUTHME_PASSWORD) {
    console.log('[auth] AUTHME_PASSWORD not set — skipping register/login');
    return;
  }
  try {
    console.log('[auth] sending /register then /login (if required)');
    bot.chat(`/register ${AUTHME_PASSWORD} ${AUTHME_PASSWORD}`);
    setTimeout(() => {
      try { bot.chat(`/login ${AUTHME_PASSWORD}`); } catch (e) {}
    }, 1300);
  } catch (e) { console.error('[auth] error', e); }
}

// Anti-AFK: rotate, small steps, jump in water, swing occasionally
function startAntiAfk() {
  stopAntiAfk();
  antiAfkTimer = setInterval(() => {
    if (!bot || !bot.entity) return;
    try {
      const yaw = bot.entity.yaw + (Math.random() - 0.5) * 0.8;
      const pitch = Math.max(-1.5, Math.min(1.5, bot.entity.pitch + (Math.random() - 0.5) * 0.4));
      bot.look(yaw, pitch, true);

      const r = Math.random();
      if (r < 0.33) tinyStep('forward');
      else if (r < 0.66) tinyStep('left');
      else tinyStep('right');

      // Swim/jump if in water or not on ground
      if (bot.entity.isInWater || bot.entity.onGround === false) {
        bot.setControlState('jump', true);
        setTimeout(() => bot.setControlState('jump', false), 600);
      }

      if (Math.random() < 0.12) {
        try { bot.swingArm('right'); } catch (e) {}
      }
    } catch (e) { console.error('[afk] action error', e); }
  }, ANTI_AFK_INTERVAL_MS);
  console.log('[afk] started, interval', ANTI_AFK_INTERVAL_MS);
}

function tinyStep(dir) {
  try {
    bot.setControlState(dir, true);
    setTimeout(() => bot.setControlState(dir, false), 500 + Math.floor(Math.random() * 500));
  } catch (e) {}
}

function stopAntiAfk() {
  if (antiAfkTimer) clearInterval(antiAfkTimer);
  antiAfkTimer = null;
}

function cleanup() {
  stopAntiAfk();
  if (loginInterval) { clearInterval(loginInterval); loginInterval = null; }
  try { if (bot) bot.removeAllListeners(); } catch (e) {}
  bot = null;
}

function scheduleReconnect() {
  console.log(`[reconnect] will try again in ${reconnectDelay} ms`);
  setTimeout(() => {
    // exponential backoff up to 2 minutes
    reconnectDelay = Math.min(reconnectDelay * 2, 2 * 60 * 1000);
    createBot();
  }, reconnectDelay);
}

// catch-all safety
process.on('uncaughtException', (err) => {
  console.error('uncaughtException:', err);
  cleanup();
  scheduleReconnect();
});
process.on('SIGINT', () => { console.log('SIGINT'); cleanup(); process.exit(0); });
process.on('SIGTERM', () => { console.log('SIGTERM'); cleanup(); process.exit(0); });

// start
createBot();// index.js
const mineflayer = require('mineflayer');
const express = require('express');

// ----- Configuration (use Render environment variables) -----
const HOST = process.env.MC_HOST || 'OnlitesSMP_S2.aternos.me';
const PORT = Number(process.env.MC_PORT || 57535);
const USERNAME = process.env.BOT_NAME || 'AFK_Bot';
const AUTHME_PASSWORD = process.env.AUTHME_PASS || '';      // AuthMe password (if used)
const AUTH_TYPE = process.env.AUTH_TYPE || 'offline';       // 'offline' or 'microsoft' (default offline)
const MC_VERSION = process.env.MC_VERSION || false;         // e.g. '1.21.1' or false for auto
const RECONNECT_BASE_MS = Number(process.env.RECONNECT_DELAY_MS || 5000);
const ANTI_AFK_INTERVAL_MS = Number(process.env.ANTI_AFK_INTERVAL_MS || 25000);
const FORCE_LOGIN_INTERVAL_MS = Number(process.env.FORCE_LOGIN_INTERVAL_MS || 120000);

// ----- Web server for keep-alive (Render uses this to confirm service) -----
const app = express();
app.get('/', (_req, res) => res.send('AFK bot is alive ✅'));
const webPort = process.env.PORT || 3000;
app.listen(webPort, () => console.log(`[web] listening on :${webPort}`));

// ----- bot state -----
let bot = null;
let antiAfkTimer = null;
let loginInterval = null;
let reconnectDelay = RECONNECT_BASE_MS;

function createBot() {
  console.log('[bot] createBot', { HOST, PORT, USERNAME, AUTH_TYPE, MC_VERSION });

  try {
    bot = mineflayer.createBot({
      host: HOST,
      port: PORT,
      username: USERNAME,
      password: undefined,      // only used if you switch to premium auth
      version: MC_VERSION || false,
      auth: AUTH_TYPE === 'offline' ? 'offline' : AUTH_TYPE
    });
  } catch (e) {
    console.error('[bot] create error', e);
    scheduleReconnect();
    return;
  }

  bot.once('spawn', onSpawn);
  bot.on('kicked', reason => console.warn('[bot] kicked:', reason?.toString?.() || reason));
  bot.on('end', () => {
    console.warn('[bot] connection ended');
    cleanup();
    scheduleReconnect();
  });
  bot.on('error', err => console.error('[bot] error', err && err.message ? err.message : err));
  bot.on('message', (msg) => {
    try {
      const s = msg?.toString?.() || '';
      if (s) console.log('[chat]', s);
      const lower = s.toLowerCase();
      if (lower.includes('register') || lower.includes('/register') || lower.includes('use /register') ||
          lower.includes('/login') || lower.includes('login')) {
        sendAuth();
      }
    } catch (e) {}
  });
  bot.on('death', () => console.log('[bot] died'));
  bot.on('respawn', () => console.log('[bot] respawned'));
}

function onSpawn() {
  console.log('[bot] spawned in world');
  reconnectDelay = RECONNECT_BASE_MS; // reset backoff on successful spawn
  setTimeout(() => sendAuth(), 1500); // try to /register + /login if needed
  startAntiAfk();
  if (loginInterval) clearInterval(loginInterval);
  loginInterval = setInterval(() => {
    if (bot && bot.entity) sendAuth();
  }, FORCE_LOGIN_INTERVAL_MS);
}

function sendAuth() {
  if (!bot || !bot.chat) return;
  if (!AUTHME_PASSWORD) {
    console.log('[auth] AUTHME_PASSWORD not set — skipping register/login');
    return;
  }
  try {
    console.log('[auth] sending /register then /login (if required)');
    bot.chat(`/register ${AUTHME_PASSWORD} ${AUTHME_PASSWORD}`);
    setTimeout(() => {
      try { bot.chat(`/login ${AUTHME_PASSWORD}`); } catch (e) {}
    }, 1300);
  } catch (e) { console.error('[auth] error', e); }
}

// Anti-AFK: rotate, small steps, jump in water, swing occasionally
function startAntiAfk() {
  stopAntiAfk();
  antiAfkTimer = setInterval(() => {
    if (!bot || !bot.entity) return;
    try {
      const yaw = bot.entity.yaw + (Math.random() - 0.5) * 0.8;
      const pitch = Math.max(-1.5, Math.min(1.5, bot.entity.pitch + (Math.random() - 0.5) * 0.4));
      bot.look(yaw, pitch, true);

      const r = Math.random();
      if (r < 0.33) tinyStep('forward');
      else if (r < 0.66) tinyStep('left');
      else tinyStep('right');

      // Swim/jump if in water or not on ground
      if (bot.entity.isInWater || bot.entity.onGround === false) {
        bot.setControlState('jump', true);
        setTimeout(() => bot.setControlState('jump', false), 600);
      }

      if (Math.random() < 0.12) {
        try { bot.swingArm('right'); } catch (e) {}
      }
    } catch (e) { console.error('[afk] action error', e); }
  }, ANTI_AFK_INTERVAL_MS);
  console.log('[afk] started, interval', ANTI_AFK_INTERVAL_MS);
}

function tinyStep(dir) {
  try {
    bot.setControlState(dir, true);
    setTimeout(() => bot.setControlState(dir, false), 500 + Math.floor(Math.random() * 500));
  } catch (e) {}
}

function stopAntiAfk() {
  if (antiAfkTimer) clearInterval(antiAfkTimer);
  antiAfkTimer = null;
}

function cleanup() {
  stopAntiAfk();
  if (loginInterval) { clearInterval(loginInterval); loginInterval = null; }
  try { if (bot) bot.removeAllListeners(); } catch (e) {}
  bot = null;
}

function scheduleReconnect() {
  console.log(`[reconnect] will try again in ${reconnectDelay} ms`);
  setTimeout(() => {
    // exponential backoff up to 2 minutes
    reconnectDelay = Math.min(reconnectDelay * 2, 2 * 60 * 1000);
    createBot();
  }, reconnectDelay);
}

// catch-all safety
process.on('uncaughtException', (err) => {
  console.error('uncaughtException:', err);
  cleanup();
  scheduleReconnect();
});
process.on('SIGINT', () => { console.log('SIGINT'); cleanup(); process.exit(0); });
process.on('SIGTERM', () => { console.log('SIGTERM'); cleanup(); process.exit(0); });

// start
createBot();
