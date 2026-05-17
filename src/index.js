// src/index.js
// Punto de entrada principal — arranca Discord y luego Minecraft

const config = require('./config');

// Validar variables de entorno obligatorias
const required = ['DISCORD_TOKEN', 'DISCORD_CHANNEL_ID', 'MC_HOST', 'MC_USERNAME'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`[Config] Faltan variables de entorno: ${missing.join(', ')}`);
  process.exit(1);
}

const discord = require('./discord');
const { createBot } = require('./minecraft');

// 1. Arrancar Discord
discord.start();

// 2. Arrancar Minecraft después de 3 segundos (esperar a que Discord esté listo)
setTimeout(() => {
  createBot();
}, 3000);

// Capturar errores no manejados para evitar caídas
process.on('unhandledRejection', (err) => {
  console.error('[Global] Unhandled rejection:', err?.message || err);
});
process.on('uncaughtException', (err) => {
  console.error('[Global] Uncaught exception:', err?.message || err);
});
