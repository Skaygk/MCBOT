// src/navigator.js
// Maneja la navegación automática y el anti-AFK

const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { GoalBlock, GoalNear } = goals;
const Vec3 = require('vec3');

class Navigator {
  constructor() {
    this.bot = null;
    this.navigating = false;
    this.afkActive = false;
    this.afkTimer = null;
    this.afkCenter = null;
    this.afkRadius = 5;
  }

  init(bot) {
    this.bot = bot;
    bot.loadPlugin(pathfinder);
  }

  _getMovements() {
    const movements = new Movements(this.bot);
    movements.canDig = false;       // no romper bloques al caminar
    movements.allowParkour = false;
    movements.allowSprinting = true;
    return movements;
  }

  // ── Navegación a coordenadas ──────────────────────────────────────────────

  async goTo(x, y, z) {
    if (!this.bot) throw new Error('Bot no inicializado');
    if (this.navigating) throw new Error('Ya hay una navegación activa');

    this.navigating = true;
    this.bot.pathfinder.setMovements(this._getMovements());

    return new Promise((resolve, reject) => {
      const goal = y !== null
        ? new GoalBlock(x, y, z)
        : new GoalNear(x, this.bot.entity.position.y, z, 2);

      this.bot.pathfinder.setGoal(goal, false);

      const onGoal = () => {
        this.navigating = false;
        cleanup();
        resolve('llegué');
      };

      const onError = (err) => {
        this.navigating = false;
        cleanup();
        reject(err);
      };

      const cleanup = () => {
        this.bot.removeListener('goal_reached', onGoal);
        this.bot.removeListener('path_update', onPathUpdate);
      };

      // Detectar si el path falla completamente
      const onPathUpdate = (r) => {
        if (r.status === 'noPath') {
          this.navigating = false;
          cleanup();
          reject(new Error('No se encontró ruta al destino'));
        }
      };

      this.bot.once('goal_reached', onGoal);
      this.bot.on('path_update', onPathUpdate);
      this.bot.pathfinder.on('goal_reached', onGoal);
      this.bot.pathfinder.once('error', onError);
    });
  }

  cancelNavigation() {
    if (!this.navigating) return false;
    this.bot.pathfinder.setGoal(null);
    this.navigating = false;
    return true;
  }

  isNavigating() {
    return this.navigating;
  }

  // ── Anti-AFK ─────────────────────────────────────────────────────────────

  startAntiAfk(radius = 5, intervalSeconds = 30) {
    if (this.afkActive) return false;

    this.afkActive = true;
    this.afkRadius = radius;
    this.afkCenter = this.bot.entity.position.clone();

    const move = async () => {
      if (!this.afkActive || this.navigating) return;

      // Punto aleatorio dentro del radio
      const angle = Math.random() * 2 * Math.PI;
      const dist = Math.random() * this.afkRadius;
      const tx = Math.round(this.afkCenter.x + Math.cos(angle) * dist);
      const tz = Math.round(this.afkCenter.z + Math.sin(angle) * dist);
      const ty = this.bot.entity.position.y;

      try {
        this.bot.pathfinder.setMovements(this._getMovements());
        const goal = new GoalNear(tx, ty, tz, 1);
        this.bot.pathfinder.setGoal(goal, false);

        await new Promise((res) => {
          const done = () => { this.bot.removeListener('goal_reached', done); res(); };
          this.bot.once('goal_reached', done);
          // timeout de seguridad
          setTimeout(() => { this.bot.removeListener('goal_reached', done); res(); }, 10000);
        });
      } catch (_) {
        // Si falla el movimiento simplemente esperamos al siguiente turno
      }
    };

    this.afkTimer = setInterval(move, intervalSeconds * 1000);
    move(); // mover de inmediato la primera vez
    return true;
  }

  stopAntiAfk() {
    if (!this.afkActive) return false;
    this.afkActive = false;
    clearInterval(this.afkTimer);
    this.afkTimer = null;
    this.bot.pathfinder.setGoal(null);
    return true;
  }

  isAfkActive() {
    return this.afkActive;
  }
}

module.exports = new Navigator();
