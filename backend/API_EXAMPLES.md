# API Examples

Ejemplos de peticiones HTTP para probar la API.

## Autenticación

### Registro de Usuario
```bash
curl -X POST http://localhost:3005/auth/user/register \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Juan Pérez",
    "email": "juan@example.com",
    "password": "password123"
  }'
```

### Login de Usuario
```bash
curl -X POST http://localhost:3005/auth/user/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "juan@example.com",
    "password": "password123"
  }'
```

### Registro de Veterinario
```bash
curl -X POST http://localhost:3005/auth/vet/register \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Dra. María González",
    "email": "maria@vetclinic.com",
    "password": "vetpass123",
    "cedulaProfesional": "VET-12345",
    "telefono": "555-1234"
  }'
```

### Login de Veterinario
```bash
curl -X POST http://localhost:3005/auth/vet/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "maria@vetclinic.com",
    "password": "vetpass123"
  }'
```

---

## Mascotas

### Crear Mascota (sin foto)
```bash
curl -X POST http://localhost:3005/pets \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Max",
    "especie": "Perro",
    "raza": "Golden Retriever",
    "fechaNacimiento": "2020-05-15"
  }'
```

### Crear Mascota (con foto)
```bash
curl -X POST http://localhost:3005/pets \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -F "nombre=Max" \
  -F "especie=Perro" \
  -F "raza=Golden Retriever" \
  -F "fechaNacimiento=2020-05-15" \
  -F "foto=@/path/to/pet-photo.jpg"
```

### Obtener todas las mascotas del usuario
```bash
curl -X GET http://localhost:3005/pets \
  -H "Authorization: Bearer YOUR_USER_TOKEN"
```

### Obtener mascota con historial completo
```bash
curl -X GET http://localhost:3005/pets/1 \
  -H "Authorization: Bearer YOUR_USER_TOKEN"
```

### Actualizar mascota
```bash
curl -X PUT http://localhost:3005/pets/1 \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Maximus",
    "raza": "Golden Retriever Americano"
  }'
```

### Eliminar mascota
```bash
curl -X DELETE http://localhost:3005/pets/1 \
  -H "Authorization: Bearer YOUR_USER_TOKEN"
```

---

## Vacunas

### Crear Vacuna (con foto para OCR)
```bash
curl -X POST http://localhost:3005/pets/1/vaccines \
  -H "Authorization: Bearer YOUR_USER_OR_VET_TOKEN" \
  -F "nombreVacuna=Rabia" \
  -F "evidencia=@/path/to/vaccine-label.jpg"
```

### Crear Vacuna (con datos manuales)
```bash
curl -X POST http://localhost:3005/pets/1/vaccines \
  -H "Authorization: Bearer YOUR_USER_OR_VET_TOKEN" \
  -F "nombreVacuna=Parvovirus" \
  -F "lote=ABC123456" \
  -F "caducidad=2025-12-31" \
  -F "evidencia=@/path/to/vaccine-label.jpg"
```

### Obtener todas las vacunas de una mascota
```bash
curl -X GET http://localhost:3005/pets/1/vaccines \
  -H "Authorization: Bearer YOUR_USER_OR_VET_TOKEN"
```

### Actualizar vacuna (override manual)
```bash
curl -X PUT http://localhost:3005/pets/vaccines/1 \
  -H "Authorization: Bearer YOUR_USER_OR_VET_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lote": "CORRECTED-LOT-123",
    "caducidad": "2025-11-30"
  }'
```

---

## Procedimientos

### Crear Procedimiento (solo veterinario)
```bash
curl -X POST http://localhost:3005/pets/1/procedures \
  -H "Authorization: Bearer YOUR_VET_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "desparasitacion",
    "descripcion": "Desparasitación trimestral con Drontal Plus. Peso: 28kg",
    "fecha": "2025-01-15"
  }'
```

### Crear Procedimiento con evidencia
```bash
curl -X POST http://localhost:3005/pets/1/procedures \
  -H "Authorization: Bearer YOUR_VET_TOKEN" \
  -F "tipo=cirugia" \
  -F "descripcion=Cirugía de esterilización. Procedimiento exitoso sin complicaciones." \
  -F "fecha=2025-01-10" \
  -F "evidencia=@/path/to/surgery-photo.jpg"
```

### Obtener todos los procedimientos de una mascota
```bash
curl -X GET http://localhost:3005/pets/1/procedures \
  -H "Authorization: Bearer YOUR_USER_OR_VET_TOKEN"
```

### Actualizar procedimiento (solo quien lo creó)
```bash
curl -X PUT http://localhost:3005/pets/procedures/1 \
  -H "Authorization: Bearer YOUR_VET_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "descripcion": "Desparasitación trimestral con Drontal Plus. Peso: 28kg. Próxima dosis en 3 meses."
  }'
```

### Eliminar procedimiento (solo quien lo creó)
```bash
curl -X DELETE http://localhost:3005/pets/procedures/1 \
  -H "Authorization: Bearer YOUR_VET_TOKEN"
```

---

## Health Check
```bash
curl -X GET http://localhost:3005/health
```

## Tipos de Procedimientos Permitidos

- `desparasitacion`
- `limpieza_dental`
- `cirugia`
- `chequeo_general`
- `radiografia`
- `otro`

## Formatos de Fecha

Las fechas deben enviarse en formato ISO: `YYYY-MM-DD` o `YYYY-MM-DDTHH:mm:ss`

Ejemplos:
- `2025-01-15`
- `2025-01-15T10:30:00`

## Tipos de Archivo Permitidos

**Fotos de mascotas y vacunas:**
- JPEG (.jpg, .jpeg)
- PNG (.png)
- WebP (.webp)

**Evidencia de procedimientos:**
- JPEG (.jpg, .jpeg)
- PNG (.png)
- WebP (.webp)
- PDF (.pdf)

**Tamaño máximo:** 5MB por archivo
