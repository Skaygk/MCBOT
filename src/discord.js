// src/discord.js
// Maneja el bot de Discord y procesa todos los comandos

const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const config = require('./config');
const scheduler = require('./scheduler');
const navigator = require('./navigator');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

let mcBot = null;
let channelRef = null;

function setMcBot(bot) {
  mcBot = bot;
  scheduler.setBot(bot);
  navigator.init(bot);
}

// Envía un mensaje al canal de Discord desde el código
function sendToDiscord(content) {
  if (channelRef) channelRef.send(content).catch(() => {});
}

function embed(title, description, color = 0x00ff99) {
  return new EmbedBuilder().setTitle(title).setDescription(description).setColor(color);
}

client.once('ready', () => {
  console.log(`[Discord] Conectado como ${client.user.tag}`);
  channelRef = client.channels.cache.get(config.discord.channelId);
  if (!channelRef) console.warn('[Discord] Canal no encontrado, revisa DISCORD_CHANNEL_ID');
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (message.channel.id !== config.discord.channelId) return;
  if (!message.content.startsWith(config.prefix)) return;

  const args = message.content.slice(config.prefix.length).trim().split(/\s+/);
  const cmd = args.shift().toLowerCase();

  // ── !ayuda ──────────────────────────────────────────────────────────────
  if (cmd === 'ayuda') {
    const help = [
      '**Generales**',
      '`!ayuda` — Esta lista',
      '`!estado` — Estado del bot de Minecraft',
      '`!chat <mensaje>` — Enviar mensaje al chat de MC',
      '',
      '**Mensajes automáticos**',
      '`!msg add <mensaje>` — Agregar mensaje a la lista',
      '`!msg remove <n>` — Eliminar mensaje número n',
      '`!msg list` — Ver lista de mensajes',
      '`!msg intervalo <minutos>` — Cambiar intervalo',
      '`!msg start` — Iniciar envío automático',
      '`!msg stop` — Detener envío automático',
      '',
      '**Navegación**',
      '`!ir <x> <z>` — Ir a coordenadas (misma Y)',
      '`!ir <x> <y> <z>` — Ir a coordenadas exactas',
      '`!cancelar` — Cancelar navegación actual',
      '',
      '**Anti-AFK**',
      '`!afk start [radio] [segundos]` — Iniciar anti-AFK',
      '`!afk stop` — Detener anti-AFK',
    ].join('\n');

    return message.reply({ embeds: [embed('📖 Comandos', help)] });
  }

  // ── !estado ──────────────────────────────────────────────────────────────
  if (cmd === 'estado') {
    if (!mcBot || !mcBot.entity) {
      return message.reply({ embeds: [embed('⚠️ Estado', 'Bot de Minecraft **desconectado**', 0xff4444)] });
    }
    const pos = mcBot.entity.position;
    const info = [
      `**Usuario:** ${mcBot.username}`,
      `**Servidor:** ${config.minecraft.host}:${config.minecraft.port}`,
      `**Posición:** X${Math.round(pos.x)} Y${Math.round(pos.y)} Z${Math.round(pos.z)}`,
      `**Salud:** ${mcBot.health?.toFixed(1)} ❤️  **Comida:** ${mcBot.food} 🍗`,
      `**Mensajes auto:** ${scheduler.isRunning() ? '✅ activo' : '❌ inactivo'}`,
      `**Anti-AFK:** ${navigator.isAfkActive() ? '✅ activo' : '❌ inactivo'}`,
      `**Navegando:** ${navigator.isNavigating() ? '✅ sí' : '❌ no'}`,
    ].join('\n');
    return message.reply({ embeds: [embed('📊 Estado del bot', info)] });
  }

  // ── !chat ────────────────────────────────────────────────────────────────
  if (cmd === 'chat') {
    if (!mcBot || !mcBot.entity) return message.reply('❌ Bot de MC no conectado.');
    const text = args.join(' ');
    if (!text) return message.reply('❌ Escribe el mensaje: `!chat <mensaje>`');
    mcBot.chat(text);
    return message.reply(`✅ Enviado: \`${text}\``);
  }

  // ── !msg ─────────────────────────────────────────────────────────────────
  if (cmd === 'msg') {
    const sub = args.shift();

    if (sub === 'add') {
      const text = args.join(' ');
      if (!text) return message.reply('❌ Escribe el mensaje a agregar.');
      scheduler.addMessage(text);
      return message.reply(`✅ Mensaje agregado (#${scheduler.listMessages().length - 1}): \`${text}\``);
    }

    if (sub === 'remove') {
      const idx = parseInt(args[0]);
      if (isNaN(idx)) return message.reply('❌ Pon el número del mensaje: `!msg remove <n>`');
      const ok = scheduler.removeMessage(idx);
      return message.reply(ok ? `✅ Mensaje #${idx} eliminado.` : '❌ Índice inválido.');
    }

    if (sub === 'list') {
      const msgs = scheduler.listMessages();
      if (msgs.length === 0) return message.reply('📭 Lista vacía. Agrega con `!msg add <texto>`');
      const list = msgs.map((m, i) => `**${i}.** ${m}`).join('\n');
      return message.reply({ embeds: [embed('📋 Mensajes automáticos', list)] });
    }

    if (sub === 'intervalo') {
      const mins = parseFloat(args[0]);
      if (isNaN(mins) || mins <= 0) return message.reply('❌ Pon los minutos: `!msg intervalo <minutos>`');
      scheduler.setInterval(mins);
      return message.reply(`✅ Intervalo cambiado a **${mins} minutos**.`);
    }

    if (sub === 'start') {
      const ok = scheduler.start();
      return message.reply(ok ? '✅ Mensajes automáticos iniciados.' : '❌ Ya están activos o la lista está vacía.');
    }

    if (sub === 'stop') {
      const ok = scheduler.stop();
      return message.reply(ok ? '✅ Mensajes automáticos detenidos.' : '❌ No estaban activos.');
    }

    return message.reply('❌ Subcomando inválido. Usa `!ayuda`.');
  }

  // ── !ir ──────────────────────────────────────────────────────────────────
  if (cmd === 'ir') {
    if (!mcBot || !mcBot.entity) return message.reply('❌ Bot de MC no conectado.');
    if (navigator.isNavigating()) return message.reply('❌ Ya hay una navegación activa. Usa `!cancelar` primero.');

    let x, y, z;
    if (args.length === 2) {
      [x, z] = args.map(Number); y = null;
    } else if (args.length === 3) {
      [x, y, z] = args.map(Number);
    } else {
      return message.reply('❌ Uso: `!ir <x> <z>` o `!ir <x> <y> <z>`');
    }

    if ([x, z].some(isNaN) || (y !== null && isNaN(y))) {
      return message.reply('❌ Las coordenadas deben ser números.');
    }

    const destStr = y !== null ? `X${x} Y${y} Z${z}` : `X${x} Z${z}`;
    message.reply(`🧭 Navegando hacia **${destStr}**...`);

    try {
      await navigator.goTo(x, y, z);
      sendToDiscord(`✅ ¡Llegué a **${destStr}**!`);
    } catch (err) {
      sendToDiscord(`❌ No pude llegar a **${destStr}**: ${err.message}`);
    }
    return;
  }

  // ── !cancelar ────────────────────────────────────────────────────────────
  if (cmd === 'cancelar') {
    const ok = navigator.cancelNavigation();
    return message.reply(ok ? '✅ Navegación cancelada.' : '❌ No hay navegación activa.');
  }

  // ── !afk ─────────────────────────────────────────────────────────────────
  if (cmd === 'afk') {
    const sub = args.shift();

    if (sub === 'start') {
      if (!mcBot || !mcBot.entity) return message.reply('❌ Bot de MC no conectado.');
      const radius = parseInt(args[0]) || 5;
      const interval = parseInt(args[1]) || 30;
      const ok = navigator.startAntiAfk(radius, interval);
      return message.reply(
        ok
          ? `✅ Anti-AFK iniciado. Radio: **${radius} bloques**, cada **${interval}s**.`
          : '❌ Anti-AFK ya estaba activo.'
      );
    }

    if (sub === 'stop') {
      const ok = navigator.stopAntiAfk();
      return message.reply(ok ? '✅ Anti-AFK detenido.' : '❌ No estaba activo.');
    }

    return message.reply('❌ Uso: `!afk start [radio] [segundos]` o `!afk stop`');
  }
});

function start() {
  client.login(config.discord.token);
}

module.exports = { start, sendToDiscord, setMcBot };
