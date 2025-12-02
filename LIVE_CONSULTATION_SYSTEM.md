# Sistema de Consulta en Vivo con Prescripciones Incrementales

Este documento describe el sistema completo de consultas en vivo con análisis de IA y generación de recetas médicas.

## Arquitectura General

### Flujo Completo

```
┌─────────────────────────────────────────────────────────────┐
│                    LiveConsultationScreen                    │
│  (Veterinario graba audio durante la consulta)              │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ POST /pets/:petId/smart-consultations
                      │ FormData: audio + appointmentId
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              SmartConsultationController                     │
│                                                              │
│  1. Transcribe audio con Whisper                            │
│  2. Analiza con GPT-4 → Extrae:                             │
│     - Signos vitales                                         │
│     - Medicamentos                                           │
│     - Vacunas/Procedimientos sugeridos                      │
│  3. Crea/actualiza Prescription DRAFT                        │
│  4. Agrega medicamentos automáticamente                     │
│  5. Crea borradores de vacunas/procedimientos               │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ Response JSON:
                      │ - vitals (signos vitales)
                      │ - draftActions (vacunas/procedimientos)
                      │ - prescriptionItems (medicamentos)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              LiveConsultationScreen (UI Update)              │
│                                                              │
│  - Actualiza vitals (merge con existentes)                  │
│  - Agrega draft actions a la lista                          │
│  - Recarga prescription con items actualizados              │
│  - Muestra toast con resumen                                │
└─────────────────────────────────────────────────────────────┘
```

## Backend

### 1. Base de Datos (Prisma)

#### Modelos Principales

**Prescription**
```prisma
model Prescription {
  id              String              @id @default(uuid())
  appointmentId   String              @unique
  petId           String
  vetId           String
  status          PrescriptionStatus  @default(DRAFT)  // DRAFT | FINALIZED
  diagnosis       String?
  notes           String?
  pdfUrl          String?
  publicToken     String?             @unique  // Magic link
  tokenExpiresAt  DateTime?
  createdAt       DateTime            @default(now())
  finalizedAt     DateTime?

  items           PrescriptionItem[]
}
```

**PrescriptionItem**
```prisma
model PrescriptionItem {
  id              String       @id @default(uuid())
  prescriptionId  String
  medication      String
  dosage          String
  frequency       String
  duration        String?
  instructions    String?
  createdAt       DateTime     @default(now())
}
```

**SharedDocument** (Magic Links genéricos)
```prisma
model SharedDocument {
  id              String       @id @default(uuid())
  prescriptionId  String?
  publicToken     String       @unique
  documentUrl     String
  documentType    String
  expiresAt       DateTime?
  viewCount       Int          @default(0)
  lastViewedAt    DateTime?
  createdAt       DateTime     @default(now())
}
```

### 2. OpenAI Service

**Actualización del Prompt**

Ahora extrae `medications` además de highlights y vitals:

```javascript
{
  "medications": [
    {
      "medication": "Amoxicilina",
      "dosage": "250mg",
      "frequency": "cada 8 horas",
      "duration": "7 días",
      "instructions": "con comida"
    }
  ]
}
```

### 3. Smart Consultation Controller

**Lógica de Procesamiento**

Cuando se recibe un audio:

1. **Transcribe + Analiza** con OpenAI
2. **Actualiza Appointment** status a COMPLETED
3. **Crea borradores** de vacunas/procedimientos
4. **Maneja Prescription**:
   - Busca si existe una prescription DRAFT para esta cita
   - Si no existe, la crea
   - Agrega los medicamentos detectados automáticamente
5. **Devuelve respuesta consolidada**:
```json
{
  "consultation": { ... },
  "vitals": {
    "peso": 12.5,
    "temperatura": 38.5,
    "frecuenciaCardiaca": 120
  },
  "draftActions": [
    {
      "type": "VACCINE",
      "id": "uuid",
      "name": "Vacuna antirrábica",
      "status": "incomplete"
    }
  ],
  "prescriptionItems": [
    {
      "id": "uuid",
      "medication": "Amoxicilina",
      "dosage": "250mg",
      "frequency": "cada 8 horas"
    }
  ],
  "medicationsDetected": 2
}
```

### 4. Prescription Controller

**Endpoints Principales**

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/appointments/:id/prescription` | Crear o obtener prescription DRAFT |
| POST | `/prescriptions/:id/items` | Agregar medicamento individual |
| POST | `/prescriptions/:id/items/batch` | Agregar múltiples medicamentos (desde AI) |
| PUT | `/prescriptions/items/:itemId` | Actualizar medicamento |
| DELETE | `/prescriptions/items/:itemId` | Eliminar medicamento |
| PUT | `/prescriptions/:id` | Actualizar diagnosis/notes |
| POST | `/prescriptions/:id/finalize` | Finalizar → genera PDF + magic link |

**Finalización de Receta**

```javascript
POST /prescriptions/:id/finalize
{
  "diagnosis": "Gastroenteritis aguda",
  "notes": "Control en 3 días"
}

// Response:
{
  "prescription": { ... },
  "publicToken": "abc123xyz",
  "shareUrl": "https://api.dogid.com/public/prescription/abc123xyz"
}
```

### 5. Public Controller (Magic Links)

**Acceso Público sin Auth**

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/public/prescription/:token` | Ver receta completa (JSON) |
| GET | `/public/prescription/:token/pdf` | Descargar PDF (redirect) |
| GET | `/public/doc/:token` | Acceso genérico a SharedDocuments |

**Seguridad**

- ✅ No requiere autenticación
- ✅ Token único y corto (nanoid de 16 caracteres)
- ✅ Solo recetas FINALIZED son accesibles
- ✅ Expiración opcional del token
- ✅ Contador de vistas (viewCount)
- ✅ Presigned URLs temporales para S3 (1 hora)

## Frontend

### LiveConsultationScreen

**UI Sections**

1. **Header**: Nombre de la mascota y título
2. **Signos Vitales**: Grid con peso, temperatura, FC, FR
3. **Acciones Detectadas**: Lista de vacunas/procedimientos con indicadores visuales
4. **Prescripción**: Lista de medicamentos con CRUD completo
5. **Botón Flotante**: Micrófono para grabar (múltiples veces)
6. **Footer**: Botón "Terminar Cita"

**Flujo de Grabación**

```javascript
// 1. Usuario presiona micrófono
startRecording()
  → Solicita permisos
  → Inicia Audio.Recording con expo-av
  → Muestra timer y animación

// 2. Usuario detiene grabación
stopRecording()
  → Detiene audio
  → Obtiene URI del archivo
  → Llama a processAudioWithAI(uri)

// 3. Procesamiento
processAudioWithAI(uri)
  → Crea FormData con audio + appointmentId
  → POST /pets/:id/smart-consultations
  → Recibe: vitals, draftActions, prescriptionItems
  → Actualiza estados (merge vitals, append actions)
  → Recarga prescription
  → Muestra toast con resumen
```

**Estados Reactivos**

```javascript
const [vitals, setVitals] = useState({});
const [draftActions, setDraftActions] = useState([]);
const [prescription, setPrescription] = useState(null);

// Merge de vitals (no sobreescribe null values)
setVitals(prev => ({
  ...prev,
  ...Object.fromEntries(
    Object.entries(newVitals).filter(([_, v]) => v !== null)
  )
}));

// Append de draft actions
setDraftActions(prev => [...prev, ...newDraftActions]);
```

**Finalización**

```javascript
finalizePrescription()
  → Valida que haya medicamentos
  → POST /prescriptions/:id/finalize
  → Recibe publicToken y shareUrl
  → Muestra Alert con opciones:
    - WhatsApp
    - Abrir link
    - Cerrar
```

**WhatsApp Integration**

```javascript
shareViaWhatsApp(token, shareUrl)
  → Construye mensaje con link
  → Abre whatsapp://send?text=...
  → Fallback: abrir en navegador si WhatsApp no está instalado
```

## Ejemplo de Uso Completo

### Escenario: Consulta de Gastroenteritis

1. **Veterinario inicia consulta**
   - Abre `LiveConsultationScreen` desde cita
   - Sistema crea prescription DRAFT automáticamente

2. **Primera grabación**
   ```
   Veterinario: "Firulais tiene 38.5 de temperatura, pesa 12.5 kilos.
   Tiene vómito y diarrea desde ayer. Voy a recetar amoxicilina 250mg
   cada 8 horas por 7 días con comida, y metoclopramida 5ml cada 12 horas
   por 3 días."
   ```

   **AI Detecta:**
   - Vitals: temperatura=38.5, peso=12.5
   - Medications: Amoxicilina, Metoclopramida

   **UI Actualiza:**
   - Grid de vitals se llena
   - 2 medicamentos aparecen en la sección de prescripción

3. **Segunda grabación**
   ```
   Veterinario: "Le apliqué la vacuna antirrábica de refuerzo y le tomé
   una radiografía de abdomen."
   ```

   **AI Detecta:**
   - Actions: VACCINE (antirrábica), PROCEDURE (radiografía)

   **UI Actualiza:**
   - 2 acciones aparecen en "Acciones Detectadas"
   - Con indicadores amarillos (incomplete)

4. **Edición manual**
   - Veterinario toca un medicamento
   - Modal se abre con los campos prellenados
   - Ajusta la dosis de "250mg" a "500mg"
   - Guarda → PUT /prescriptions/items/:id

5. **Finalización**
   - Presiona "Terminar Cita"
   - Alert confirma
   - Backend genera PDF y magic link
   - Alert con opciones de compartir
   - Presiona "WhatsApp"
   - Se abre WhatsApp con mensaje:
     ```
     🐾 Receta médica para Firulais

     Puedes ver y descargar la receta aquí:
     https://api.dogid.com/public/prescription/abc123xyz
     ```

6. **Dueño recibe el link**
   - Abre en navegador (sin login)
   - Ve receta completa con todos los medicamentos
   - Botón "Descargar PDF"
   - Descarga PDF profesional con:
     - Header: Veterinario + Cédula
     - Paciente: Firulais (Perro, Labrador)
     - Diagnóstico: Gastroenteritis aguda
     - Prescripción numerada con todos los detalles
     - Fecha y firma digital

## Magic Links: Seguridad y Expiración

### Tokens

- **Generación**: `nanoid(16)` → 16 caracteres aleatorios
- **Unicidad**: Índice UNIQUE en base de datos
- **Formato**: `abc123xyz456`

### Acceso Público

```javascript
// Backend valida:
1. Token existe
2. Prescription está FINALIZED
3. Token no ha expirado (si tokenExpiresAt está configurado)
4. Incrementa viewCount
5. Genera presigned URL del PDF (válida 1 hora)
6. Devuelve datos sin información sensible
```

### Opciones de Expiración

```javascript
// Sin expiración (por defecto)
tokenExpiresAt: null

// Con expiración (ejemplo: 30 días)
tokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
```

## Flujo de Datos Completo

```
┌──────────────────┐
│   Veterinario    │
│  en Consulta     │
└────────┬─────────┘
         │
         │ 1. Graba audio
         ▼
┌────────────────────────────────────────────────────────────┐
│              LiveConsultationScreen                        │
│  [Mic] [Vitals] [Actions] [Prescriptions] [Terminar]      │
└────────┬───────────────────────────────────────────────────┘
         │
         │ 2. POST audio + appointmentId
         ▼
┌────────────────────────────────────────────────────────────┐
│                     Backend AI                             │
│  Whisper → GPT-4 → Extrae todo                            │
└────────┬───────────────────────────────────────────────────┘
         │
         │ 3. Crea/actualiza Prescription DRAFT
         ▼
┌────────────────────────────────────────────────────────────┐
│                  Prescription (DRAFT)                       │
│  + PrescriptionItems (medicamentos agregados)              │
└────────┬───────────────────────────────────────────────────┘
         │
         │ 4. Response con vitals, actions, items
         ▼
┌────────────────────────────────────────────────────────────┐
│              LiveConsultationScreen                        │
│  UI se actualiza en tiempo real                            │
└────────┬───────────────────────────────────────────────────┘
         │
         │ 5. Veterinario presiona "Terminar Cita"
         ▼
┌────────────────────────────────────────────────────────────┐
│              POST /prescriptions/:id/finalize              │
│  - Genera PDF con PDFKit                                   │
│  - Sube a S3 privado                                       │
│  - Crea magic link (publicToken)                           │
│  - Cambia status a FINALIZED                               │
└────────┬───────────────────────────────────────────────────┘
         │
         │ 6. Comparte por WhatsApp
         ▼
┌────────────────────────────────────────────────────────────┐
│                      Dueño                                 │
│  Recibe link → Abre en navegador → Ve receta + PDF        │
└────────────────────────────────────────────────────────────┘
```

## Características Técnicas

### Performance

- ⚡ **Procesamiento paralelo**: Whisper y análisis GPT-4 en una sola llamada
- 🔄 **Actualizaciones incrementales**: Medicamentos se agregan sin sobreescribir
- 📱 **UI reactiva**: Estados se actualizan inmediatamente tras cada grabación
- ☁️ **Presigned URLs**: Acceso temporal a S3 sin exponer credenciales

### Escalabilidad

- 📊 **Indexación semántica**: Consultas indexadas en Pinecone
- 🗄️ **Cascade delete**: Eliminar prescription elimina items automáticamente
- 🔍 **Búsqueda rápida**: UUIDs indexados para queries eficientes

### UX

- 🎤 **Múltiples grabaciones**: No cierra pantalla, permite iteración
- 💊 **CRUD visual**: Agregar, editar, eliminar medicamentos con modal
- ✅ **Feedback inmediato**: Toasts muestran qué detectó la IA
- 📱 **One-tap sharing**: WhatsApp integrado nativamente

## Próximas Mejoras

1. **Streaming de audio**: Procesar mientras se graba
2. **Diagnóstico por IA**: Sugerir diagnóstico basado en síntomas
3. **Historial de recetas**: Ver todas las recetas del paciente
4. **Templates de recetas**: Guardar combinaciones comunes de medicamentos
5. **Multi-idioma**: Soporte para recetas en inglés
6. **Firma digital**: Integración con certificados digitales
7. **Notificaciones push**: Alertar al dueño cuando reciba receta
8. **Analytics**: Dashboard de métricas de consultas

## Dependencias Nuevas

### Backend
```json
{
  "nanoid": "^5.1.6",  // Magic links
  "pdfkit": "^0.17.2"  // Generación de PDFs
}
```

### Frontend
- No requiere dependencias adicionales
- Usa expo-av (ya instalado)
- Usa axios (ya instalado)

## Documentación de API

Ver documentación completa de endpoints en:
- [prescriptionRoutes.js](backend/src/routes/prescriptionRoutes.js)
- [publicRoutes.js](backend/src/routes/publicRoutes.js)

## Testing

### Probar el sistema completo

1. Backend:
```bash
cd backend
npm start
```

2. Frontend:
```bash
cd frontend
npm start
```

3. Crear cita en la app
4. Abrir LiveConsultationScreen desde la cita
5. Grabar audio mencionando medicamentos
6. Observar UI actualizarse
7. Finalizar y compartir por WhatsApp
8. Abrir magic link en navegador

---

**Autor**: Claude Code
**Fecha**: Diciembre 2025
**Versión**: 1.0.0
