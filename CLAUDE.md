# Resumen del Proyecto – MVP Plataforma de Control Veterinario

El proyecto es una plataforma móvil y backend para que dueños de mascotas lleven el control digital del historial médico y de vacunación de sus animales, y para que los veterinarios puedan registrar procedimientos clínicos. El objetivo principal es reemplazar la cartilla física y facilitar que en emergencias o consultas se pueda mostrar toda la información del animal.

## Tecnologías

- **Backend**: Node.js (Express)
- **Base de datos**: MySQL
- **App móvil**: React Native
- **OCR para vacunas**: Tesseract u otro servicio OCR
- **Almacenamiento de imágenes**: carpeta local o S3

## Descripción general del MVP

El MVP debe permitir lo siguiente:

### 1. Perfiles

**Usuario (dueño)**:
- Registro e inicio de sesión
- Puede tener muchas mascotas
- Puede subir vacunas y ver historial completo

**Veterinario**:
- Registro e inicio de sesión
- Puede añadir procedimientos al historial de una mascota
- Cada procedimiento queda registrado con qué vet lo realizó

**Mascotas**:
- Datos básicos: nombre, especie, raza, fecha de nacimiento, foto
- Historial de:
  - Vacunas
  - Procedimientos clínicos

### 2. Vacunas (flujo del MVP)

El usuario o el veterinario sube:
- foto de la etiqueta de la vacuna
- opcionalmente lote y caducidad (si OCR falla)

El backend corre OCR para intentar extraer:
- Número de lote
- Fecha de caducidad

Si el OCR falla → el sistema permite ingreso manual.

Los datos de cada vacuna incluyen:
- nombre de la vacuna
- lote (OCR o manual)
- caducidad (OCR o manual)
- evidencia (foto)
- texto crudo del OCR
- id del veterinario si la aplicó un vet

### 3. Procedimientos clínicos

Un veterinario puede registrar procedimientos como:
- desparasitación
- limpieza dental
- cirugía
- chequeo general
- radiografía
- otro tipo de procedimiento

Cada procedimiento contiene:
- tipo
- descripción
- fecha
- veterinario responsable
- evidencia (opcional)

**Nota**: No habrá firmas digitales por ahora, solo quedará registrado qué vet lo hizo.

## Modelos principales (MySQL)

### Users (dueños)
- id
- nombre
- email
- password_hash
- created_at

### Vets (veterinarios)
- id
- nombre
- email
- password_hash
- cedula_profesional
- telefono
- created_at

### Pets (mascotas)
- id
- user_id
- nombre
- especie
- raza
- fecha_nacimiento
- foto_url
- created_at

**Relación**: Un usuario puede tener muchos pets

### Vaccines
- id
- pet_id
- vet_id (nullable)
- nombre_vacuna
- lote
- caducidad
- evidencia_url
- ocr_raw_text
- ocr_status (success/fail/manual)
- created_at

### Procedures
- id
- pet_id
- vet_id
- tipo
- descripcion
- fecha
- evidencia_url
- created_at

## Endpoints del MVP

### Auth
- `POST /auth/user/register`
- `POST /auth/user/login`
- `POST /auth/vet/register`
- `POST /auth/vet/login`

### Mascotas
- `POST /pets`
- `GET /pets`
- `GET /pets/:id`

### Vacunas
- `POST /pets/:id/vaccines`
- `GET /pets/:id/vaccines`

### Procedimientos
- `POST /pets/:id/procedures`
- `GET /pets/:id/procedures`

## Reglas de negocio principales

1. Solo el dueño puede crear/editar sus mascotas
2. Solo el veterinario puede añadir procedimientos
3. Las vacunas pueden ser añadidas por dueño o vet
4. El OCR se usa para intentar obtener lote y caducidad
5. Si OCR falla, se debe permitir ingreso manual
6. Todas las imágenes deben almacenarse de forma segura

## Objetivo final del MVP

Tener una app funcional donde:
- El dueño registra mascotas
- El dueño o vet suben vacunas con foto + OCR
- El vet registra procedimientos clínicos
- Todo el historial queda visible en la app móvil

## Estructura del proyecto

```
dog_id/
├── backend/     # Node.js + Express + MySQL
└── frontend/    # React Native app
```
