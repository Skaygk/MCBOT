// src/minecraft.js
// Crea y gestiona el bot de Minecraft

const mineflayer = require('mineflayer');
const config = require('./config');
const { sendToDiscord, setMcBot } = require('./discord');

let bot = null;
let reconnectTimer = null;
let manualDisconnect = false; // bandera: true = no reconectar automáticamente

function createBot() {
  // Si hay un timer pendiente, cancelarlo
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  manualDisconnect = false; // nueva conexión = modo automático activo

  console.log(`[MC] Conectando a ${config.minecraft.host}:${config.minecraft.port} como ${config.minecraft.username}`);

  bot = mineflayer.createBot({
    host: config.minecraft.host,
    port: config.minecraft.port,
    username: config.minecraft.username,
    version: config.minecraft.version,
    auth: 'offline',
    checkTimeoutInterval: 60000,
    hideErrors: false,
  });

  // ── Auto-login ───────────────────────────────────────────────────────────
  bot.once('spawn', () => {
    console.log('[MC] Bot spawneado en el servidor');
    sendToDiscord('✅ **Bot de Minecraft conectado** al servidor.');

    if (config.minecraft.password) {
      setTimeout(() => {
        bot.chat(`/login ${config.minecraft.password}`);
        console.log('[MC] Comando /login enviado');
      }, 2000);
    }

    setMcBot(bot);
  });

  // ── Chat → Discord ───────────────────────────────────────────────────────
  bot.on('chat', (username, message) => {
    if (username === bot.username) return;
    sendToDiscord(`💬 **[MC] ${username}:** ${message}`);
  });

  // ── Mensajes del sistema ─────────────────────────────────────────────────
  bot.on('message', (jsonMsg) => {
    const text = jsonMsg.toString();
    if (!text || text.trim() === '') return;
    console.log(`[MC Chat] ${text}`);
  });

  // ── Muerte ───────────────────────────────────────────────────────────────
  bot.on('death', () => {
    sendToDiscord('💀 **El bot murió.** Respawneando...');
    bot.respawn();
  });

  // ── Kicked ───────────────────────────────────────────────────────────────
  // kicked siempre dispara 'end' después, así que solo avisamos aquí
  // y dejamos que 'end' decida si reconectar o no
  bot.on('kicked', (reason) => {
    let msg = reason;
    try {
      const parsed = JSON.parse(reason);
      // Armar texto legible desde el JSON del servidor
      if (parsed.extra) {
        msg = parsed.extra.map(e => e.text || '').join('').trim();
      } else {
        msg = parsed.text || reason;
      }
    } catch (_) {}
    console.warn(`[MC] Bot kickeado: ${msg}`);
    if (!manualDisconnect) {
      sendToDiscord(`⚠️ **Bot kickeado:** ${msg}`);
    }
  });

  // ── Error ────────────────────────────────────────────────────────────────
  bot.on('error', (err) => {
    if (manualDisconnect) return;
    console.error('[MC] Error:', err.message);
    // 'end' se disparará después, él maneja el reconect
  });

  // ── End (única fuente de reconexión) ─────────────────────────────────────
  bot.on('end', (reason) => {
    console.warn('[MC] Conexión cerrada:', reason);
    bot = null;

    if (manualDisconnect) {
      console.log('[MC] Desconexión manual, no reconectando.');
      return;
    }

    sendToDiscord(`🔌 **Conexión cerrada** (${reason || 'sin razón'}). Reconectando en 15s...`);
    scheduleReconnect(15000);
  });
}

function scheduleReconnect(ms) {
  if (reconnectTimer) return; // ya hay uno pendiente, ignorar duplicados
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (!manualDisconnect) createBot();
  }, ms);
}

function disconnectBot() {
  manualDisconnect = true; // bloquear reconexión ANTES de hacer quit

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (bot) {
    bot.quit();
    bot = null;
  }
}

function getBot() {
  return bot;
}

module.exports = { createBot, disconnectBot, getBot };
