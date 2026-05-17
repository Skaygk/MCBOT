// src/config.js
// Railway inyecta las variables de entorno directamente, no necesitamos .env
// Pero si corres localmente, crea un archivo .env con las mismas variables

require('dotenv').config();

module.exports = {
  discord: {
    token: process.env.DISCORD_TOKEN,
    channelId: process.env.DISCORD_CHANNEL_ID,
  },
  minecraft: {
    host: process.env.MC_HOST,
    port: parseInt(process.env.MC_PORT) || 25565,
    username: process.env.MC_USERNAME,
    password: process.env.MC_PASSWORD,       // contraseña del /login (no premium)
    version: process.env.MC_VERSION || '1.20.1',
  },
  // Prefijo para los comandos de Discord
  prefix: process.env.PREFIX || '!',
};
