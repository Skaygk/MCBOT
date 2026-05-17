// src/scheduler.js
// Maneja el envío automático de mensajes en el chat de Minecraft

class Scheduler {
  constructor() {
    this.messages = [];
    this.intervalMs = 5 * 60 * 1000; // default: cada 5 minutos
    this.timer = null;
    this.bot = null;
    this.index = 0;
  }

  setBot(bot) {
    this.bot = bot;
  }

  start() {
    if (this.timer) return false; // ya corriendo
    if (this.messages.length === 0) return false; // sin mensajes

    this.timer = setInterval(() => {
      if (!this.bot || !this.bot.entity) return;
      const msg = this.messages[this.index % this.messages.length];
      this.bot.chat(msg);
      this.index++;
    }, this.intervalMs);

    return true;
  }

  stop() {
    if (!this.timer) return false;
    clearInterval(this.timer);
    this.timer = null;
    return true;
  }

  isRunning() {
    return this.timer !== null;
  }

  addMessage(msg) {
    this.messages.push(msg);
  }

  removeMessage(index) {
    if (index < 0 || index >= this.messages.length) return false;
    this.messages.splice(index, 1);
    return true;
  }

  setInterval(minutes) {
    this.intervalMs = minutes * 60 * 1000;
    if (this.isRunning()) {
      this.stop();
      this.start();
    }
  }

  listMessages() {
    return this.messages;
  }
}

module.exports = new Scheduler();
