# Veterinary Control - Mobile App

Aplicación móvil React Native con Expo para la plataforma de control veterinario.

## Requisitos previos

- Node.js >= 18
- Expo CLI: `npm install -g expo-cli`
- Para Android: Android Studio o dispositivo Android físico
- Para iOS: Xcode y dispositivo iOS físico (solo en macOS)
- Backend ejecutándose en `http://localhost:3005`

## Instalación

1. Instalar dependencias:
```bash
npm install
```

2. Configurar la URL del backend:
Editar `src/utils/config.js` y cambiar `API_URL` si el backend está en otra dirección.

**Para dispositivo físico:**
```javascript
export const API_URL = 'http://TU_IP_LOCAL:3005'; // Ej: http://192.168.1.100:3005
```

Para encontrar tu IP local:
- **macOS/Linux**: `ifconfig | grep "inet "`
- **Windows**: `ipconfig`

## Ejecutar la app

### Iniciar Expo:
```bash
npm start
```

Esto abrirá Expo Dev Tools en tu navegador.

### Ejecutar en dispositivo físico (recomendado):

1. Instalar **Expo Go** en tu dispositivo:
   - [Android - Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - [iOS - App Store](https://apps.apple.com/app/expo-go/id982107779)

2. Escanear el código QR que aparece en Expo Dev Tools
3. La app se cargará en tu dispositivo

### Ejecutar en emulador:

**Android:**
```bash
npm run android
```

**iOS (solo macOS):**
```bash
npm run ios
```

## Estructura del proyecto

```
frontend/
├── src/
│   ├── components/           # Componentes reutilizables
│   │   ├── Button.js
│   │   ├── Input.js
│   │   ├── Card.js
│   │   └── Loading.js
│   ├── contexts/            # React Contexts
│   │   └── AuthContext.js   # Autenticación global
│   ├── navigation/          # Configuración de navegación
│   │   └── AppNavigator.js
│   ├── screens/             # Pantallas de la app
│   │   ├── Auth/           # Login y registro
│   │   ├── Pets/           # Lista y detalle de mascotas
│   │   ├── Vaccines/       # Gestión de vacunas
│   │   └── Procedures/     # Procedimientos clínicos
│   ├── services/            # API calls
│   │   └── api.js
│   └── utils/               # Utilidades
│       └── config.js        # Configuración
├── App.js                   # Punto de entrada
└── package.json
```

## Funcionalidades implementadas

### Autenticación
- ✅ Login para usuarios (dueños) y veterinarios
- ✅ Registro con validación
- ✅ Almacenamiento seguro de tokens (SecureStore)
- ✅ Auto-login al abrir la app

### Mascotas
- ✅ Lista de mascotas del usuario
- ✅ Detalle de mascota con historial completo
- ✅ Ver vacunas y procedimientos

### Próximas funcionalidades
- Crear/editar mascotas con foto
- Agregar vacunas con cámara (OCR)
- Veterinarios: agregar procedimientos
- Ver imágenes de evidencia

## Navegación

### Usuario no autenticado:
- Login Screen
- Register Screen

### Usuario autenticado:
- **Tab: Pets**
  - Lista de mascotas
  - Detalle de mascota
  - Agregar mascota
  - Agregar vacuna

## API Configuration

La configuración de la API está en `src/utils/config.js`:

```javascript
export const API_URL = 'http://localhost:3005';
```

**Importante**: Para probar en dispositivo físico, cambiar `localhost` por la IP local de tu computadora.

## Troubleshooting

### Error "Network request failed"
- Verifica que el backend esté ejecutándose
- Si usas dispositivo físico, cambia `localhost` por tu IP local
- Asegúrate de estar en la misma red Wi-Fi

### La app no se carga en Expo Go
- Verifica que tu dispositivo y computadora estén en la misma red
- Intenta reiniciar el servidor de Expo: `npm start --clear`

### Problemas con dependencias
```bash
rm -rf node_modules
npm install
```

## Scripts disponibles

- `npm start` - Iniciar Expo Dev Tools
- `npm run android` - Ejecutar en emulador Android
- `npm run ios` - Ejecutar en simulador iOS (solo macOS)
- `npm run web` - Ejecutar en navegador (experimental)

## Tecnologías utilizadas

- **React Native** - Framework móvil
- **Expo** - Toolchain para desarrollo
- **React Navigation** - Navegación entre pantallas
- **Axios** - Cliente HTTP
- **Expo Camera** - Acceso a cámara
- **Expo Image Picker** - Selección de imágenes
- **Expo Secure Store** - Almacenamiento seguro
- **date-fns** - Manejo de fechas

## Próximos pasos

1. Agregar pantallas para crear/editar mascotas
2. Implementar captura de fotos con cámara
3. Pantallas para agregar vacunas y procedimientos
4. Visualización de imágenes en galería
5. Perfil de usuario
6. Notificaciones para recordatorios de vacunas
