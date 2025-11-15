# Veterinary Platform Backend

Backend API para la plataforma de control veterinario.

## Requisitos previos

- Node.js >= 18
- MySQL >= 8.0
- Tesseract OCR instalado en el sistema

### Instalar Tesseract OCR

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install tesseract-ocr tesseract-ocr-spa
```

**macOS:**
```bash
brew install tesseract tesseract-lang
```

**Windows:**
Descargar el instalador desde: https://github.com/UB-Mannheim/tesseract/wiki

## Instalación

1. Instalar dependencias:
```bash
npm install
```

2. Configurar variables de entorno:
Editar el archivo `.env` si es necesario.

3. Generar Prisma Client:
```bash
npm run prisma:generate
```

4. Crear la base de datos y ejecutar migraciones:
```bash
npm run prisma:migrate
```

## Ejecutar

### Modo desarrollo (con hot-reload):
```bash
npm run dev
```

### Modo producción:
```bash
npm start
```

El servidor se ejecutará en `http://localhost:3005`

## Estructura del proyecto

```
backend/
├── prisma/
│   └── schema.prisma          # Schema de base de datos
├── src/
│   ├── controllers/           # Controladores de rutas
│   ├── middlewares/           # Middlewares de autenticación
│   ├── routes/                # Definición de rutas
│   ├── services/              # Servicios (OCR, etc.)
│   ├── utils/                 # Utilidades (Prisma client)
│   └── index.js               # Punto de entrada
├── uploads/                   # Almacenamiento de imágenes
├── .env                       # Variables de entorno
└── package.json
```

## API Endpoints

### Autenticación

**Usuario (dueño de mascota):**
- `POST /auth/user/register` - Registro de usuario
- `POST /auth/user/login` - Login de usuario

**Veterinario:**
- `POST /auth/vet/register` - Registro de veterinario
- `POST /auth/vet/login` - Login de veterinario

### Mascotas (requiere autenticación de usuario)

- `POST /pets` - Crear mascota (con foto opcional)
- `GET /pets` - Obtener todas las mascotas del usuario
- `GET /pets/:id` - Obtener mascota con historial completo
- `PUT /pets/:id` - Actualizar mascota
- `DELETE /pets/:id` - Eliminar mascota

### Vacunas (requiere autenticación de usuario o veterinario)

- `POST /pets/:petId/vaccines` - Crear registro de vacuna (con foto para OCR)
- `GET /pets/:petId/vaccines` - Obtener todas las vacunas de una mascota
- `PUT /pets/vaccines/:id` - Actualizar vacuna (override manual)

### Procedimientos (crear: solo veterinarios, ver: usuario o veterinario)

- `POST /pets/:petId/procedures` - Crear procedimiento clínico
- `GET /pets/:petId/procedures` - Obtener todos los procedimientos
- `PUT /pets/procedures/:id` - Actualizar procedimiento (solo quien lo creó)
- `DELETE /pets/procedures/:id` - Eliminar procedimiento (solo quien lo creó)

## Autenticación

Todas las rutas protegidas requieren un token JWT en el header:

```
Authorization: Bearer <token>
```

El token se obtiene al hacer login o registro.

## OCR de Vacunas

Al subir una foto de vacuna:
1. El sistema intenta extraer automáticamente el lote y fecha de caducidad
2. Si OCR tiene éxito, los datos se guardan automáticamente
3. Si OCR falla, se pueden ingresar manualmente
4. El texto crudo del OCR se guarda para referencia

## Tipos de Procedimientos

- `desparasitacion`
- `limpieza_dental`
- `cirugia`
- `chequeo_general`
- `radiografia`
- `otro`

## Prisma Studio

Para explorar la base de datos visualmente:
```bash
npm run prisma:studio
```

Abrirá una interfaz web en `http://localhost:5555`
