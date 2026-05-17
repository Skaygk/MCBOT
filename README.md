# 🤖 MC Discord Bot

Bot de Minecraft (no-premium) controlado desde un canal de Discord.  
Diseñado para desplegarse en **Railway** sin configuración extra.

---

## 📁 Estructura

```
mc-discord-bot/
├── src/
│   ├── index.js       ← Punto de entrada
│   ├── config.js      ← Lee las variables de entorno
│   ├── discord.js     ← Bot de Discord + comandos
│   ├── minecraft.js   ← Bot de Minecraft + auto-login
│   ├── navigator.js   ← Pathfinding y anti-AFK
│   └── scheduler.js   ← Mensajes automáticos
├── package.json
├── Procfile
└── README.md
```

---

## 🚀 Despliegue en Railway

### 1. Sube el código a GitHub
Crea un repositorio nuevo y sube todos los archivos.

### 2. Crea el proyecto en Railway
1. Ve a [railway.app](https://railway.app) → **New Project → Deploy from GitHub repo**
2. Selecciona tu repositorio

### 3. Agrega las variables de entorno
En Railway → tu proyecto → **Variables**, agrega estas:

| Variable            | Descripción                                              |
|---------------------|----------------------------------------------------------|
| `DISCORD_TOKEN`     | Token de tu bot de Discord                               |
| `DISCORD_CHANNEL_ID`| ID del canal de texto donde se controla el bot           |
| `MC_HOST`           | IP o dominio del servidor de Minecraft                   |
| `MC_PORT`           | Puerto del servidor (por defecto `25565`)                |
| `MC_USERNAME`       | Nombre de usuario del bot (no-premium)                   |
| `MC_PASSWORD`       | Contraseña del `/login` (plugin no-premium del servidor) |
| `MC_VERSION`        | Versión del servidor, ej. `1.20.1`                       |
| `PREFIX`            | Prefijo de comandos Discord (por defecto `!`)            |

### 4. Deploy
Railway detecta el `Procfile` y lanza `node src/index.js` automáticamente.

---

## 🎮 Comandos de Discord

### Generales
| Comando | Descripción |
|---------|-------------|
| `!ayuda` | Muestra todos los comandos |
| `!estado` | Muestra posición, salud, estado del bot |
| `!chat <mensaje>` | Envía un mensaje al chat de Minecraft |

### Mensajes automáticos
| Comando | Descripción |
|---------|-------------|
| `!msg add <texto>` | Agrega un mensaje a la lista de rotación |
| `!msg remove <n>` | Elimina el mensaje número n |
| `!msg list` | Muestra todos los mensajes guardados |
| `!msg intervalo <minutos>` | Cambia el tiempo entre mensajes |
| `!msg start` | Inicia el envío automático |
| `!msg stop` | Detiene el envío automático |

### Navegación
| Comando | Descripción |
|---------|-------------|
| `!ir <x> <z>` | Va a las coordenadas (misma altura actual) |
| `!ir <x> <y> <z>` | Va a las coordenadas exactas |
| `!cancelar` | Cancela la navegación actual |

### Anti-AFK
| Comando | Descripción |
|---------|-------------|
| `!afk start [radio] [segundos]` | Inicia el anti-AFK (default: radio 5, cada 30s) |
| `!afk stop` | Detiene el anti-AFK |

---

## 🔧 Cómo crear el bot de Discord

1. Ve a [discord.com/developers/applications](https://discord.com/developers/applications)
2. **New Application** → ponle nombre
3. En **Bot** → **Add Bot** → copia el **Token** → ponlo en `DISCORD_TOKEN`
4. En **Bot** → activa los 3 **Privileged Gateway Intents**:
   - `Presence Intent`
   - `Server Members Intent`
   - `Message Content Intent`
5. En **OAuth2 → URL Generator**:
   - Scopes: `bot`
   - Permisos: `Read Messages`, `Send Messages`, `Read Message History`
   - Abre el enlace generado e invita el bot a tu servidor
6. Para obtener el `DISCORD_CHANNEL_ID`:
   - En Discord → Configuración → Avanzado → activa **Modo desarrollador**
   - Click derecho en el canal → **Copiar ID**

---

## 💡 Notas

- El bot se reconecta automáticamente si lo kickean o pierde conexión.
- El auto-login espera 2 segundos tras spawnear antes de mandar `/login`.
- Los mensajes del chat de Minecraft se reenvían al canal de Discord.
- El pathfinder no rompe bloques al navegar (`canDig = false`).
- El anti-AFK usa el mismo motor de pathfinding pero en un área limitada.
