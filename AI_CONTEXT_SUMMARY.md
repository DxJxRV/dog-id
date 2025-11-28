# Resumen del Contexto del Proyecto (AI Context)

## Visión General
**Proyecto:** Plataforma de Control Veterinario ("dog_id")
**Objetivo:** Gestión de historiales médicos de mascotas (Usuarios) y registro clínico profesional (Veterinarios).
**Estado:** MVP Avanzado / Fase de Pulido.

## Stack Tecnológico
- **Backend:** Node.js, Express, MySQL, Prisma ORM.
- **Frontend:** React Native (Expo SDK 54), React Navigation v7.
- **IA/Servicios:**
  - **OpenAI:** Transcripción y análisis de audio para consultas inteligentes.
  - **Tesseract OCR:** Extracción de datos de etiquetas de vacunas.
  - **AWS S3:** Almacenamiento de imágenes y audio.
  - **Pinecone:** Búsqueda semántica de consultas.

## Arquitectura y Estructura
- **Backend (`/backend`):**
  - Estructura MVC (Controllers, Routes, Services).
  - **Prisma Schema:** Modelos complejos incluyendo `SmartConsultation`, `MedicalData`, `ConsentRecord`, `DeathCertificate`.
  - **Autenticación:** JWT con roles diferenciados (User vs Vet).
- **Frontend (`/frontend`):**
  - **Navegación:** `AppNavigator.js` maneja stacks separados para Auth, Mascotas, Perfil y Amigos (este último oculto para Vets).
  - **UI/UX:** Uso de Modales (e.g., `AddPetModal`) y Tabs principales.

## Funcionalidades Clave Identificadas
1.  **Consultas Inteligentes (Smart Consultations):**
    - Flujo: Grabar audio -> Subir -> Procesar con OpenAI -> Generar JSON estructurado -> Crear borradores (Vacunas/Procedimientos) -> Indexar en Pinecone.
2.  **Gestión de Mascotas:**
    - CRUD completo.
    - Sistema de archivado (independiente para Dueño y Vet).
    - Vinculación Vet-Mascota mediante códigos QR.
3.  **Expediente Clínico (ECE):**
    - Consentimientos informados con firma digital.
    - Certificados de defunción.
    - Datos médicos detallados (signos vitales).
4.  **Social (Solo Usuarios):**
    - Sistema de amistades y compartir perfiles de mascotas.

## Archivos Clave Revisados
- `backend/prisma/schema.prisma`: Definición de datos completa.
- `backend/src/controllers/smartConsultationController.js`: Lógica compleja de IA.
- `frontend/src/navigation/AppNavigator.js`: Estructura de navegación y roles.
- `PROJECT_STATUS.md`: Estado actual y tareas pendientes.

Estoy listo para trabajar en el proyecto con este contexto cargado.
