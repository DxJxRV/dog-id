# Social Login Setup - Google y Apple

## 📦 Backend - Instalación de Dependencias

```bash
cd backend
npm install apple-signin-auth
# google-auth-library ya está instalado
```

## 🗄️ Base de Datos - Migración Prisma

El campo `appleId` ya se agregó al schema de Prisma. Ejecuta la migración:

```bash
cd backend
npx prisma migrate dev --name add_apple_id
npx prisma generate
```

## ⚙️ Backend - Variables de Entorno

Agrega las siguientes variables a tu archivo `.env`:

```env
# Google OAuth
GOOGLE_CLIENT_ID=tu-google-client-id.apps.googleusercontent.com

# Apple Sign In
APPLE_CLIENT_ID=com.yourapp.bundleid
```

### Cómo obtener las credenciales:

### Google OAuth Setup:
1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la API de Google+
4. Ve a "Credenciales" → "Crear credenciales" → "ID de cliente de OAuth"
5. Tipo: Aplicación web
6. Copia el **Client ID**

### Apple Sign In Setup:
1. Ve a [Apple Developer Portal](https://developer.apple.com/)
2. Certificates, Identifiers & Profiles
3. Identifiers → Tu App ID
4. Habilita "Sign In with Apple"
5. El `APPLE_CLIENT_ID` es tu **Bundle ID** (ej: `com.tuempresa.mimascota`)

## 📱 Frontend - Instalación de Dependencias

```bash
cd frontend
npm install expo-apple-authentication
# @react-native-google-signin/google-signin ya está instalado
```

## 🔧 Frontend - Configuración

### 1. Google Sign In

Agrega tu `GOOGLE_CLIENT_ID` en `/frontend/src/utils/config.js`:

```javascript
export const GOOGLE_CLIENT_ID = 'TU-GOOGLE-CLIENT-ID.apps.googleusercontent.com';
```

**Para Android:**
Necesitas crear un **Android Client ID** adicional en Google Cloud Console con el SHA-1 de tu keystore.

### 2. Apple Sign In (Solo iOS)

En `app.json` o `app.config.js`, asegúrate de tener:

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.tuempresa.mimascota",
      "usesAppleSignIn": true
    }
  }
}
```

**IMPORTANTE:** Apple Sign In solo funciona en:
- Dispositivos iOS físicos (no simulador)
- Builds de desarrollo o producción (no Expo Go)
- Requiere cuenta de Apple Developer con certificados configurados

## 🧪 Testing

### Probar en Expo Go (Limitaciones):
- ❌ Apple Sign In NO funciona
- ❌ Google Sign In NO funciona (requiere build nativo)
- ✅ Login tradicional funciona

### Probar con EAS Build:
```bash
# Development build
eas build --profile development --platform ios
eas build --profile development --platform android

# Preview build
eas build --profile preview --platform ios
eas build --profile preview --platform android
```

## 🚀 Flujo Completo

### Backend (Ya implementado):

1. **POST /api/auth/user/google**
   - Recibe: `{ idToken }` o `{ accessToken }`
   - Valida con Google OAuth
   - Crea o actualiza usuario
   - Retorna JWT de sesión

2. **POST /api/auth/user/apple**
   - Recibe: `{ identityToken, fullName (opcional) }`
   - Valida con Apple
   - Maneja email privado de Apple
   - Crea o actualiza usuario
   - Retorna JWT de sesión

### Frontend (Ya implementado):

1. **LoginScreen**
   - Botón "Continuar con Apple" (negro, ancho completo) - Solo iOS
   - Botón "Continuar con Google" (blanco con borde)
   - Verifica disponibilidad de cada método
   - Maneja tokens y llama al backend
   - Guarda sesión automáticamente

2. **AuthContext**
   - `loginWithGoogle(idToken)` - Llama a API y guarda token
   - `loginWithApple(identityToken, fullName)` - Llama a API y guarda token

## 🔐 Seguridad

✅ Los tokens se validan en el backend
✅ No se almacenan passwords para usuarios sociales
✅ Se usa upsert para evitar duplicados
✅ Apple puede ocultar email (se maneja con email privado)
✅ JWT de sesión con expiración

## 📝 Notas Importantes

1. **Apple Sign In:**
   - Solo funciona en iOS
   - Requiere dispositivo físico (no simulador en mayoría de casos)
   - El email puede ser privado (`@privaterelay.appleid.com`)
   - El nombre completo solo se envía la primera vez

2. **Google Sign In:**
   - Funciona en iOS y Android
   - Requiere configuración de SHA-1 para Android
   - Más fácil de probar en desarrollo

3. **Migración de Base de Datos:**
   - El schema de Prisma ya incluye `googleId` y `appleId`
   - Ambos campos son `String?` (nullable y unique)
   - Usuarios pueden vincular múltiples métodos al mismo email

## ✅ Checklist de Implementación

### Backend:
- [x] Instalar `apple-signin-auth`
- [x] Agregar campo `appleId` al schema de Prisma
- [x] Implementar endpoint `/api/auth/user/apple`
- [x] Agregar validación de Apple tokens
- [x] Manejar email privado de Apple
- [ ] Ejecutar migración de Prisma
- [ ] Configurar variables de entorno

### Frontend:
- [x] Instalar `expo-apple-authentication`
- [x] Actualizar LoginScreen con botones sociales
- [x] Implementar `handleAppleSignIn`
- [x] Implementar `handleGoogleSignIn`
- [x] Agregar `loginWithApple` al AuthContext
- [x] Mejorar diseño de login
- [ ] Configurar `GOOGLE_CLIENT_ID`
- [ ] Configurar `app.json` para Apple
- [ ] Crear build de desarrollo para testing

## 🐛 Troubleshooting

**Error: "Google Play Services not available"**
- Solo en Android
- Instalar Google Play Services en el dispositivo/emulador

**Error: "Apple Sign In not available"**
- Verificar que estés en dispositivo iOS físico
- Verificar `usesAppleSignIn: true` en app.json
- Verificar que no estés en Expo Go

**Error: "Invalid token"**
- Verificar que `GOOGLE_CLIENT_ID` o `APPLE_CLIENT_ID` sean correctos
- Verificar que el token no haya expirado
- Para Google, verificar que uses el Web Client ID correcto

## 📚 Referencias

- [Google Sign In - React Native](https://github.com/react-native-google-signin/google-signin)
- [Expo Apple Authentication](https://docs.expo.dev/versions/latest/sdk/apple-authentication/)
- [Apple Sign In - apple-signin-auth](https://www.npmjs.com/package/apple-signin-auth)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
