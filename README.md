# 🐾 Mi Mascota Plus - Plataforma SaaS de Gestión Veterinaria

**Mi Mascota Plus** es una plataforma SaaS (Software-as-a-Service) integral diseñada para la gestión moderna de clínicas veterinarias y el empoderamiento de los dueños de mascotas. La aplicación móvil, construida con React Native, ofrece dos experiencias distintas según el tipo de usuario: una para dueños de mascotas y otra para profesionales veterinarios.

---

## ✨ Características Principales

La plataforma se divide en dos flujos de trabajo principales, ofreciendo funcionalidades específicas para cada rol.

### Para Dueños de Mascotas
*   **Búsqueda y Descubrimiento:** Encuentra clínicas y veterinarios cercanos, filtra por servicios y disponibilidad.
*   **Gestión de Citas Online:** Solicita, gestiona y cancela citas directamente desde la app.
*   **Historial Clínico Unificado:** Accede al historial médico completo de tus mascotas, incluyendo vacunas, procedimientos y consultas.
*   **Conexión Social:** Agrega amigos y comparte los perfiles de tus mascotas.
*   **Favoritos:** Guarda tus clínicas y veterinarios preferidos para un acceso rápido.

### Para Veterinarios y Clínicas
*   **Gestión de Clínica:** Administra el perfil completo de tu clínica, incluyendo logo, dirección, y personal. Un veterinario puede pertenecer y cambiar entre múltiples clínicas.
*   **Gestión de Equipo:** Invita a otros veterinarios y asistentes a tu clínica, asignando roles (`OWNER`, `ADMIN`, `VET`).
*   **Agenda Inteligente:** Visualiza y gestiona el calendario de citas por día/semana/mes. Aprueba o rechaza solicitudes de pacientes y maneja tu disponibilidad.
*   **Bitácora Inteligente por Voz:** Graba la consulta usando tu voz. El sistema genera una transcripción automática y extrae datos clave (síntomas, signos vitales) usando IA.
*   **Expediente Clínico Electrónico (ECE):** Todos los registros de un paciente (consultas, vacunas, procedimientos, consentimientos) en un solo lugar.
*   **Multi-Clínica:** Un único perfil de veterinario puede acceder a todas las clínicas donde es miembro, cambiando de contexto fácilmente.

---

## 🛠️ Stack Tecnológico

| Área                | Tecnología                                                                   |
| ------------------- | ---------------------------------------------------------------------------- |
| **Backend**         | Node.js, Express.js                                                          |
| **Base de Datos**     | MySQL con Prisma ORM                                                         |
| **App Móvil**       | React Native (Expo)                                                          |
| **Autenticación**   | JWT (JSON Web Tokens) con roles                                                |
| **IA y Servicios**  | **OpenAI (GPT-4)** para análisis de audio, **Tesseract** para OCR de vacunas. |
| **Almacenamiento**  | AWS S3 para archivos (imágenes, audio, PDFs).                                |
| **Búsqueda Semántica**| Pinecone para búsqueda de consultas por similitud de texto.                  |

---

## 📁 Estructura del Proyecto

La arquitectura está diseñada para escalar, separando claramente el backend de la aplicación móvil.

```
dog_id/
├── backend/              # API REST (Node.js + Express + Prisma)
│   ├── src/
│   │   ├── controllers/  # Lógica para Citas, Clínicas, Mascotas, etc.
│   │   ├── routes/       # Definición de endpoints
│   │   ├── services/     # Servicios (OpenAI, S3, Pinecone)
│   │   └── middlewares/  # Autenticación y roles
│   └── prisma/           # Schema y migraciones de la base de datos
│
├── frontend/             # App móvil (React Native + Expo)
│   └── src/
│       ├── screens/      # Pantallas divididas por rol y funcionalidad
│       │   ├── Auth/
│       │   ├── Booking/   # Flujo de solicitud de citas (Usuario)
│       │   ├── Appointments/ # Agenda del veterinario
│       │   ├── Clinics/    # Gestión de la clínica (Veterinario)
│       │   └── ...
│       ├── navigation/   # Navegadores por rol (OwnerTabs, VetTabs)
│       ├── contexts/     # Estado global (AuthContext, ClinicContext)
│       └── services/     # Cliente de API (api.js)
│
└── ... Documentación y scripts de inicio
```

---

## 🚀 Inicio Rápido

Para levantar el entorno de desarrollo completo:

```bash
# Opción 1: Iniciar backend y frontend con un solo comando
./start.sh

# Opción 2: Iniciar en paneles divididos (requiere tmux)
./start-tmux.sh
```
Ambos scripts instalan dependencias (`npm install`) en `backend` y `frontend` antes de iniciar los servidores.

### Requisitos
- Node.js >= 18
- MySQL >= 8.0
- **(Opcional)** Tesseract OCR para el reconocimiento de etiquetas de vacunas.
- Expo Go app en tu smartphone para probar la app móvil.

---

## 📚 Documentación Adicional

- **[QUICKSTART.md](QUICKSTART.md)**: Guía detallada de inicio y configuración.
- **[SCRIPTS_GUIDE.md](SCRIPTS_GUIDE.md)**: Explicación de los scripts de automatización.
- **[PROJECT_STATUS.md](PROJECT_STATUS.md)**: Estado actual del desarrollo y funcionalidades pendientes.
- **`backend/prisma/schema.prisma`**: Considerado la "fuente de verdad" para el modelo de datos.
- **`frontend/src/navigation/AppNavigator.js`**: Define todos los flujos de navegación de la app.
