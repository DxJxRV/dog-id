# Configuración para Dispositivo Físico

## ✅ Configuración Aplicada

Tu aplicación está configurada para funcionar con dispositivo físico:

**IP Local**: `192.168.100.171`
**Puerto Backend**: `3005`

---

## Archivos Modificados

### 1. Frontend
**Archivo**: `frontend/src/utils/config.js`
```javascript
export const API_URL = 'http://192.168.100.171:3005';
```

### 2. Backend
**Archivo**: `backend/src/index.js`
- Configurado para escuchar en todas las interfaces (0.0.0.0)
- Muestra URLs local y de red al iniciar

---

## 🚀 Cómo Usar

### 1. Verificar que estás en la misma red WiFi
Tu computadora y tu smartphone deben estar conectados a la misma red WiFi.

### 2. Permitir acceso en el firewall (si es necesario)

**Ubuntu/Debian:**
```bash
sudo ufw allow 3005/tcp
# O temporalmente:
sudo ufw disable  # usar con precaución
```

**Verificar firewall:**
```bash
sudo ufw status
```

### 3. Iniciar el proyecto
```bash
./start.sh
```

O manualmente:
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm start
```

### 4. Conectar desde tu móvil

1. **Instala Expo Go** en tu smartphone
   - [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - [iOS](https://apps.apple.com/app/expo-go/id982107779)

2. **Escanea el QR** que aparece en la terminal

3. **¡Listo!** La app se conectará a `http://192.168.100.171:3005`

---

## 🧪 Probar Conexión

### Desde tu computadora:
```bash
curl http://192.168.100.171:3005/health
```

Deberías ver:
```json
{"status":"OK","message":"Veterinary API is running"}
```

### Desde tu smartphone:
Abre el navegador de tu móvil y ve a:
```
http://192.168.100.171:3005/health
```

Si ves el mensaje JSON, ¡la conexión funciona! 🎉

---

## ❓ Troubleshooting

### No puedo conectar desde el móvil

1. **Verifica la red WiFi**
   ```bash
   # En tu computadora, verifica tu IP:
   ip addr show | grep "inet 192"
   # O:
   ifconfig | grep "inet 192"
   ```

2. **Verifica que el backend esté corriendo**
   ```bash
   curl http://192.168.100.171:3005/health
   ```

3. **Desactiva el firewall temporalmente** (para pruebas)
   ```bash
   sudo ufw disable
   # Después de probar, reactivarlo:
   sudo ufw enable
   ```

4. **Verifica el puerto**
   ```bash
   lsof -i:3005
   ```

### "Network request failed" en la app

- Verifica que el backend esté corriendo
- Asegúrate de estar en la misma red WiFi
- Prueba acceder a `http://192.168.100.171:3005/health` desde el navegador del móvil
- Reinicia la app de Expo Go

### Cambiar IP si es diferente

Si tu IP cambia, edita:
1. `frontend/src/utils/config.js` → Cambiar IP
2. `backend/src/index.js` → Cambiar IP en el console.log (opcional)

---

## 🔄 Volver a modo localhost

Si quieres volver a usar localhost (para emulador):

**Edita** `frontend/src/utils/config.js`:
```javascript
export const API_URL = 'http://localhost:3005';
```

---

## 📝 Notas

- Tu computadora y móvil deben estar en la **misma red WiFi**
- Si tu IP cambia (DHCP), necesitarás actualizar la configuración
- Para producción, usa variables de entorno en lugar de IPs hardcodeadas

---

## ✅ Checklist de Conexión

- [ ] Backend corriendo en puerto 3005
- [ ] Frontend iniciado con Expo
- [ ] Computadora y móvil en la misma WiFi
- [ ] Firewall permite puerto 3005
- [ ] QR code escaneado con Expo Go
- [ ] Probar health check desde navegador del móvil

¡Todo listo para probar en dispositivo físico! 📱
