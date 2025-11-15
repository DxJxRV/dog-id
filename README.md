# 🏥 Veterinary Control Platform

Plataforma completa para gestión de historiales veterinarios de mascotas, con backend REST API y aplicación móvil.

## 🚀 Inicio Rápido

### Opción 1: Automático (Recomendado)
```bash
./start.sh
```
Inicia backend y frontend con un solo comando.

### Opción 2: Con tmux (Paneles divididos)
```bash
./start-tmux.sh
```

### Opción 3: Manual
```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm start
```

Ver [QUICKSTART.md](QUICKSTART.md) para instrucciones detalladas.

---

## 📁 Estructura del Proyecto

```
dog_id/
├── backend/              # API REST (Node.js + Express + MySQL)
│   ├── src/
│   │   ├── controllers/  # Lógica de endpoints
│   │   ├── routes/       # Definición de rutas
│   │   ├── middlewares/  # Autenticación JWT
│   │   ├── services/     # OCR y servicios
│   │   └── utils/        # Prisma client
│   ├── prisma/          # Schema y migraciones
│   └── uploads/         # Almacenamiento de imágenes
│
├── frontend/            # App móvil (React Native + Expo)
│   └── src/
│       ├── screens/     # Pantallas de la app
│       ├── components/  # Componentes reutilizables
│       ├── navigation/  # Configuración de navegación
│       ├── contexts/    # Estado global (Auth)
│       └── services/    # API client
│
├── start.sh            # 🚀 Script de inicio automático
├── start-tmux.sh       # 🖥️ Inicio con tmux
├── stop.sh             # 🛑 Detener servicios
│
└── Documentación:
    ├── QUICKSTART.md        # Guía de inicio rápido
    ├── SCRIPTS_GUIDE.md     # Guía de scripts
    ├── PROJECT_STATUS.md    # Estado del proyecto
    └── CLAUDE.md           # Especificaciones originales
```

---

## ✨ Características

### Backend
- ✅ **16 endpoints** REST completos
- ✅ Autenticación JWT (usuarios y veterinarios)
- ✅ CRUD de mascotas con fotos
- ✅ **OCR automático** para etiquetas de vacunas (Tesseract)
- ✅ Gestión de procedimientos clínicos
- ✅ Base de datos MySQL con Prisma ORM
- ✅ Validaciones y manejo de errores

### Frontend
- ✅ Login/Registro (usuarios y vets)
- ✅ Lista de mascotas con pull-to-refresh
- ✅ Detalle de mascota con historial completo
- ✅ Visualización de vacunas y procedimientos
- ✅ Almacenamiento seguro de tokens
- ✅ Navegación con React Navigation

---

## 🛠️ Tecnologías

### Backend
- Node.js + Express
- MySQL + Prisma ORM
- JWT para autenticación
- Multer (subida de archivos)
- Tesseract OCR
- bcryptjs, axios, cors

### Frontend
- React Native
- Expo
- React Navigation
- Axios
- Expo Camera & Image Picker
- Expo Secure Store
- date-fns

---

## 📋 Requisitos

- Node.js >= 18
- MySQL >= 8.0
- Tesseract OCR (para reconocimiento de vacunas)
- Expo Go app en tu smartphone

### Instalar Tesseract
```bash
# Ubuntu/Debian
sudo apt-get install tesseract-ocr tesseract-ocr-spa

# macOS
brew install tesseract tesseract-lang
```

---

## 🎯 Endpoints API

### Autenticación
- `POST /auth/user/register` - Registro de usuario
- `POST /auth/user/login` - Login de usuario
- `POST /auth/vet/register` - Registro de veterinario
- `POST /auth/vet/login` - Login de veterinario

### Mascotas
- `GET /pets` - Listar mascotas del usuario
- `POST /pets` - Crear mascota
- `GET /pets/:id` - Detalle con historial completo
- `PUT /pets/:id` - Actualizar mascota
- `DELETE /pets/:id` - Eliminar mascota

### Vacunas
- `POST /pets/:petId/vaccines` - Agregar vacuna (con OCR)
- `GET /pets/:petId/vaccines` - Listar vacunas
- `PUT /pets/vaccines/:id` - Actualizar vacuna

### Procedimientos
- `POST /pets/:petId/procedures` - Crear procedimiento (solo vets)
- `GET /pets/:petId/procedures` - Listar procedimientos
- `PUT /pets/procedures/:id` - Actualizar procedimiento
- `DELETE /pets/procedures/:id` - Eliminar procedimiento

Ver [backend/API_EXAMPLES.md](backend/API_EXAMPLES.md) para ejemplos completos.

---

## 📱 Uso de la App

1. **Instalar Expo Go** en tu smartphone
2. **Iniciar el proyecto**: `./start.sh`
3. **Escanear QR** con Expo Go
4. **Registrarse** como usuario o veterinario
5. **Agregar mascotas** y gestionar su historial

**Importante**: Si usas dispositivo físico, edita `frontend/src/utils/config.js` y cambia `localhost` por tu IP local.

---

## 🔧 Scripts Disponibles

| Script | Descripción |
|--------|-------------|
| `./start.sh` | Inicia backend + frontend automáticamente |
| `./start-tmux.sh` | Inicia en paneles divididos (requiere tmux) |
| `./stop.sh` | Detiene todos los servicios |

Ver [SCRIPTS_GUIDE.md](SCRIPTS_GUIDE.md) para detalles.

---

## 📚 Documentación

- **[QUICKSTART.md](QUICKSTART.md)** - Empieza aquí
- **[SCRIPTS_GUIDE.md](SCRIPTS_GUIDE.md)** - Guía de scripts
- **[PROJECT_STATUS.md](PROJECT_STATUS.md)** - Estado y arquitectura
- **[CLAUDE.md](CLAUDE.md)** - Especificaciones del proyecto
- **[backend/README.md](backend/README.md)** - Docs del backend
- **[backend/API_EXAMPLES.md](backend/API_EXAMPLES.md)** - Ejemplos de API
- **[frontend/README.md](frontend/README.md)** - Docs del frontend

---

## 🐛 Troubleshooting

### Backend no inicia
```bash
# Verificar MySQL
sudo systemctl status mysql

# Ver logs
tail -f /tmp/backend.log
```

### Frontend no conecta
- Verifica que backend esté corriendo en puerto 3000
- Si usas dispositivo físico, cambia `localhost` por IP local
- Asegúrate de estar en la misma red WiFi

### Puerto 3000 ocupado
```bash
./stop.sh
```

---

## 🎨 Próximas Funcionalidades

- [ ] Pantalla crear/editar mascota en frontend
- [ ] Captura de fotos con cámara para vacunas
- [ ] Pantalla para vets: agregar procedimientos
- [ ] Galería de evidencias
- [ ] Perfil de usuario
- [ ] Notificaciones de recordatorios
- [ ] Exportación de historial a PDF

---

## 📄 Licencia

Este es un proyecto educativo para gestión de historiales veterinarios.

---

## 🚦 Estado del Proyecto

**Backend**: ✅ Completamente funcional
**Frontend**: ✅ MVP funcional (login, lista, detalle)
**Base de Datos**: ✅ Configurada y migrada
**Documentación**: ✅ Completa

Ver [PROJECT_STATUS.md](PROJECT_STATUS.md) para detalles completos.

---

## 🤝 Contribuir

1. Revisar [PROJECT_STATUS.md](PROJECT_STATUS.md) para ver funcionalidades pendientes
2. Revisar código y estructura
3. Implementar funcionalidades siguiendo los patrones existentes

---

## 💡 Tips

- Usa `./start.sh` para desarrollo rápido
- Usa `./start-tmux.sh` si prefieres ver logs en paneles
- Revisa `backend/API_EXAMPLES.md` para probar endpoints
- Usa `npm run prisma:studio` para ver la base de datos visualmente

---

**¡Listo para desarrollar! 🚀**

Ver [QUICKSTART.md](QUICKSTART.md) para empezar.
