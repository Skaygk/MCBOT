// src/minecraft.js
// Crea y gestiona el bot de Minecraft

const mineflayer = require('mineflayer');
const config = require('./config');
const { sendToDiscord, setMcBot } = require('./discord');

let bot = null;
let reconnectTimer = null;

function createBot() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  console.log(`[MC] Conectando a ${config.minecraft.host}:${config.minecraft.port} como ${config.minecraft.username}`);

  bot = mineflayer.createBot({
    host: config.minecraft.host,
    port: config.minecraft.port,
    username: config.minecraft.username,
    version: config.minecraft.version,
    auth: 'offline', // cuenta no-premium
    checkTimeoutInterval: 60000,
    hideErrors: false,
  });

  // ── Auto-login ───────────────────────────────────────────────────────────
  // Espera a que el servidor cargue y manda /login <contraseña>
  bot.once('spawn', () => {
    console.log('[MC] Bot spawneado en el servidor');
    sendToDiscord('✅ **Bot de Minecraft conectado** al servidor.');

    if (config.minecraft.password) {
      setTimeout(() => {
        bot.chat(`/login ${config.minecraft.password}`);
        console.log('[MC] Comando /login enviado');
      }, 2000); // pequeño delay para que el servidor cargue el plugin
    }

    setMcBot(bot);
  });

  // ── Chat → Discord ───────────────────────────────────────────────────────
  bot.on('chat', (username, message) => {
    if (username === bot.username) return; // ignorar mensajes propios
    sendToDiscord(`💬 **[MC] ${username}:** ${message}`);
  });

  // ── Mensajes del sistema/servidor → Discord ──────────────────────────────
  bot.on('message', (jsonMsg) => {
    const text = jsonMsg.toString();
    // Filtrar mensajes vacíos o duplicados del propio bot
    if (!text || text.trim() === '') return;
    console.log(`[MC Chat] ${text}`);
  });

  // ── Muerte → reconectar ──────────────────────────────────────────────────
  bot.on('death', () => {
    sendToDiscord('💀 **El bot murió.** Respawneando...');
    bot.respawn();
  });

  // ── Kick / error ─────────────────────────────────────────────────────────
  bot.on('kicked', (reason) => {
    let msg = reason;
    try { msg = JSON.parse(reason)?.text || reason; } catch (_) {}
    console.warn(`[MC] Bot kickeado: ${msg}`);
    sendToDiscord(`⚠️ **Bot kickeado del servidor:** ${msg}\nReconectando en 15 segundos...`);
    scheduleReconnect(15000);
  });

  bot.on('error', (err) => {
    console.error('[MC] Error:', err.message);
    sendToDiscord(`❌ **Error de MC:** ${err.message}\nReconectando en 15 segundos...`);
    scheduleReconnect(15000);
  });

  bot.on('end', (reason) => {
    console.warn('[MC] Conexión cerrada:', reason);
    sendToDiscord(`🔌 **Conexión cerrada** (${reason || 'sin razón'}). Reconectando en 15s...`);
    scheduleReconnect(15000);
  });
}

function scheduleReconnect(ms) {
  if (reconnectTimer) return; // ya hay uno pendiente
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    createBot();
  }, ms);
}

function disconnectBot() {
  if (!bot) return;
  // Quitamos los listeners de reconexión antes de desconectar
  // para que un disconnect manual no dispare el auto-reconect
  bot.removeAllListeners('kicked');
  bot.removeAllListeners('error');
  bot.removeAllListeners('end');
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  bot.quit();
  bot = null;
}

function getBot() {
  return bot;
}

module.exports = { createBot, disconnectBot, getBot };
