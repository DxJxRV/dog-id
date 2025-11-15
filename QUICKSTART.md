# Quick Start Guide

## 🚀 Inicio MÁS RÁPIDO (Automático)

### Un solo comando para iniciar todo:

```bash
./start.sh
```

Esto iniciará **backend** y **frontend** automáticamente. Presiona `Ctrl+C` para detener ambos.

**Con tmux (paneles divididos):**
```bash
./start-tmux.sh
```

Ver [SCRIPTS_GUIDE.md](SCRIPTS_GUIDE.md) para más detalles sobre los scripts.

---

## Inicio Manual (Paso a Paso)

### 1️⃣ Iniciar Backend

```bash
cd backend
npm run dev
```

El backend estará disponible en: **http://localhost:3005**

### 2️⃣ Iniciar Frontend

```bash
cd frontend
npm install
npm start
```

### 3️⃣ Abrir en tu móvil

1. Instala **Expo Go** en tu smartphone ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) | [iOS](https://apps.apple.com/app/expo-go/id982107779))
2. Escanea el QR que aparece en la terminal
3. ¡Listo! La app se cargará en tu dispositivo

---

## ⚠️ Importante

Si vas a probar en **dispositivo físico** (no emulador):

1. Averigua tu IP local:
   ```bash
   # macOS/Linux
   ifconfig | grep "inet "

   # Windows
   ipconfig
   ```

2. Edita `frontend/src/utils/config.js`:
   ```javascript
   export const API_URL = 'http://TU_IP_LOCAL:3000';
   // Ejemplo: 'http://192.168.1.100:3005'
   ```

---

## 📱 Probar la App

1. **Registrarse** como usuario (Pet Owner)
2. Verás la lista de mascotas (vacía al inicio)
3. Puedes probar creando datos desde el backend con cURL (ver `backend/API_EXAMPLES.md`)

---

## 🔧 Comandos Útiles

### Backend
```bash
# Ver base de datos visualmente
npm run prisma:studio

# Recrear migraciones
npm run prisma:migrate

# Modo producción
npm start
```

### Frontend
```bash
# Limpiar caché
npm start -- --clear

# Android emulator
npm run android

# iOS simulator (solo macOS)
npm run ios
```

---

## 📚 Documentación Completa

- [SCRIPTS_GUIDE.md](SCRIPTS_GUIDE.md) - **Guía de scripts de inicio**
- [CLAUDE.md](CLAUDE.md) - Especificaciones del proyecto
- [PROJECT_STATUS.md](PROJECT_STATUS.md) - Estado actual y arquitectura
- [backend/README.md](backend/README.md) - Documentación del backend
- [frontend/README.md](frontend/README.md) - Documentación del frontend

---

## ❓ Problemas Comunes

### "Network request failed" en la app
- Verifica que el backend esté corriendo
- Si usas dispositivo físico, cambia `localhost` por tu IP local
- Asegúrate de estar en la misma red WiFi

### Backend no inicia
- Verifica que MySQL esté corriendo
- Verifica las credenciales en `backend/.env`

### Frontend no carga en Expo Go
- Reinicia Expo: `npm start -- --clear`
- Verifica que tu PC y móvil estén en la misma red

---

## 🎯 Siguiente Paso

Revisa [PROJECT_STATUS.md](PROJECT_STATUS.md) para ver todas las funcionalidades implementadas y las pendientes.
