# Setup Rápido del Backend

## Estado actual

✅ Base de datos `veterinary_db` creada
✅ Migraciones aplicadas
✅ Prisma Client generado
✅ Dependencias instaladas

## Para iniciar el servidor

### Modo desarrollo (con hot-reload):
```bash
npm run dev
```

### Modo producción:
```bash
npm start
```

## Verificar instalación de Tesseract

Para que el OCR funcione, necesitas tener Tesseract instalado:

### Ubuntu/Debian:
```bash
sudo apt-get update
sudo apt-get install tesseract-ocr tesseract-ocr-spa
```

### Verificar instalación:
```bash
tesseract --version
```

## Probar la API

Una vez iniciado el servidor:

1. **Health check:**
```bash
curl http://localhost:3005/health
```

2. **Registrar un usuario:**
```bash
curl -X POST http://localhost:3005/auth/user/register \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Test User",
    "email": "test@example.com",
    "password": "test123"
  }'
```

3. Ver más ejemplos en `API_EXAMPLES.md`

## Explorar la base de datos

Para abrir Prisma Studio y ver los datos:
```bash
npm run prisma:studio
```

Esto abrirá una interfaz web en `http://localhost:5555`

## Estructura de la base de datos

- **users** - Dueños de mascotas
- **vets** - Veterinarios
- **pets** - Mascotas
- **vaccines** - Registro de vacunas (con OCR)
- **procedures** - Procedimientos clínicos

## Próximos pasos

1. Iniciar el servidor: `npm run dev`
2. Probar los endpoints de autenticación
3. Crear mascotas y añadir vacunas/procedimientos
4. Integrar con el frontend React Native
