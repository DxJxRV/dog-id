# Scripts Guide - Veterinary Platform

## Available Scripts

### 🚀 start.sh - Simple Start (Recommended)
Inicia backend y frontend en background, mostrando logs en tiempo real.

```bash
./start.sh
```

**Características:**
- ✅ Inicia ambos servicios automáticamente
- ✅ Muestra logs de ambos en la terminal
- ✅ Logs guardados en `/tmp/backend.log` y `/tmp/frontend.log`
- ✅ Presiona `Ctrl+C` para detener todo

**Uso:**
1. Ejecuta `./start.sh`
2. Espera a que ambos servicios inicien
3. Escanea el QR de Expo con tu móvil
4. Presiona `Ctrl+C` cuando termines

---

### 🖥️ start-tmux.sh - Start with tmux (Advanced)
Inicia ambos servicios en paneles divididos de tmux (requiere tmux instalado).

```bash
./start-tmux.sh
```

**Características:**
- ✅ Vista dividida: Backend (izquierda) | Frontend (derecha)
- ✅ Navegación entre paneles con `Ctrl+B` + flechas
- ✅ Scroll de logs con `Ctrl+B` + `[`
- ✅ Detach con `Ctrl+B` + `D` (servicios siguen corriendo)

**Controles tmux:**
- `Ctrl+B` luego `D` → Detach (dejar corriendo en background)
- `Ctrl+B` luego `[` → Modo scroll (presiona `q` para salir)
- `Ctrl+B` luego `←/→` → Cambiar entre paneles
- `tmux attach` → Volver a conectar a la sesión
- `Ctrl+C` en ambos paneles → Detener servicios

**Instalar tmux:**
```bash
# Ubuntu/Debian
sudo apt-get install tmux

# macOS
brew install tmux
```

---

### 🛑 stop.sh - Stop All Services
Detiene todos los servicios (backend y frontend).

```bash
./stop.sh
```

**Características:**
- ✅ Detiene el backend (puerto 3000)
- ✅ Detiene Expo/React Native
- ✅ Limpia archivos de log
- ✅ Útil si cerraste la terminal sin hacer Ctrl+C

---

## Uso Recomendado

### Primera vez:
```bash
# 1. Dar permisos de ejecución (solo primera vez)
chmod +x start.sh start-tmux.sh stop.sh

# 2. Iniciar todo
./start.sh
```

### Desarrollo diario:

**Opción 1: Simple**
```bash
./start.sh
# Ver logs de ambos servicios
# Ctrl+C para detener
```

**Opción 2: Con tmux (más profesional)**
```bash
./start-tmux.sh
# Paneles divididos
# Ctrl+B + D para detach
# tmux attach para volver
```

### Detener servicios si algo salió mal:
```bash
./stop.sh
```

---

## Troubleshooting

### "Permission denied"
```bash
chmod +x start.sh start-tmux.sh stop.sh
```

### Backend no inicia
```bash
# Verificar MySQL
sudo systemctl status mysql

# Ver logs
tail -f /tmp/backend.log
```

### Frontend no inicia
```bash
# Ver logs
tail -f /tmp/frontend.log

# Limpiar caché
cd frontend
npm start -- --clear
```

### Puerto 3000 ocupado
```bash
# Ver qué está usando el puerto
lsof -ti:3005

# Detener todo
./stop.sh
```

---

## Logs

Los logs se guardan automáticamente en:
- **Backend**: `/tmp/backend.log`
- **Frontend**: `/tmp/frontend.log`

Ver logs en tiempo real:
```bash
# Backend
tail -f /tmp/backend.log

# Frontend
tail -f /tmp/frontend.log

# Ambos
tail -f /tmp/backend.log /tmp/frontend.log
```

---

## Quick Reference

| Script | Uso | Descripción |
|--------|-----|-------------|
| `./start.sh` | Inicio simple | Inicia todo, logs en terminal |
| `./start-tmux.sh` | Inicio avanzado | Paneles divididos con tmux |
| `./stop.sh` | Detener | Detiene todos los servicios |

---

## Alternative: Manual Start

Si prefieres control total:

### Terminal 1 - Backend:
```bash
cd backend
npm run dev
```

### Terminal 2 - Frontend:
```bash
cd frontend
npm start
```
