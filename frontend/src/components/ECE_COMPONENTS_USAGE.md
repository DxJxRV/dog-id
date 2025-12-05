# Guía de Uso - Componentes ECE (Expediente Clínico Electrónico)

## 📦 Instalación de Dependencias

Antes de usar estos componentes, instala las dependencias necesarias:

```bash
cd frontend
npx expo install react-native-webview
npx expo install react-native-svg
npx expo install react-native-chart-kit
npx expo install expo-file-system
npx expo install expo-sharing
npm install react-native-signature-canvas
```

---

## 🎨 Componentes Disponibles

### 1. **PetStatusBadge**
Badge visual que muestra el estado actual de una mascota.

#### Props
| Prop | Tipo | Requerido | Descripción |
|------|------|-----------|-------------|
| status | string | Sí | Estado: 'ACTIVE', 'DECEASED', 'LOST', 'ARCHIVED' |
| style | object | No | Estilos adicionales |

#### Ejemplo de Uso
```jsx
import { PetStatusBadge } from '../components';

<View style={styles.petHeader}>
  <Text style={styles.petName}>Max</Text>
  <PetStatusBadge status="DECEASED" />
</View>
```

#### Comportamiento Visual
- **ACTIVE**: No muestra nada (invisible)
- **DECEASED**: Badge negro con icono de huella
- **LOST**: Badge naranja con icono de alerta
- **ARCHIVED**: Badge gris con icono de archivo

---

### 2. **SignaturePad**
Canvas interactivo para capturar firmas digitales.

#### Props
| Prop | Tipo | Requerido | Descripción |
|------|------|-----------|-------------|
| onOK | function | Sí | Callback que recibe firma en base64 |
| onClear | function | No | Callback cuando se limpia la firma |
| description | string | No | Texto descriptivo sobre el área |

#### Ejemplo de Uso
```jsx
import { SignaturePad } from '../components';

const [signature, setSignature] = useState(null);

<SignaturePad
  description="Firme en el área para autorizar el consentimiento"
  onOK={(base64) => {
    console.log('Firma capturada:', base64);
    setSignature(base64);
  }}
  onClear={() => {
    console.log('Firma limpiada');
    setSignature(null);
  }}
/>
```

#### Notas Importantes
- Requiere `react-native-signature-canvas` y `react-native-webview`
- La firma se entrega en formato base64 PNG
- El componente tiene una altura fija de 200px
- Incluye línea guía y botones de "Borrar" y "Confirmar"

---

### 3. **VitalSignsForm**
Formulario completo para ingresar signos vitales y datos médicos.

#### Props
| Prop | Tipo | Requerido | Descripción |
|------|------|-----------|-------------|
| value | object | Sí | Objeto con todos los valores actuales |
| onChange | function | Sí | `(field, value) => {}` actualiza estado |
| isVeterinarian | boolean | No | Si es veterinario (puede editar) |
| readOnly | boolean | No | Forzar modo solo lectura |

#### Estructura del Objeto `value`
```javascript
{
  peso: '15.5',
  temperatura: '38.5',
  frecuenciaCardiaca: '90',
  frecuenciaRespiratoria: '25',
  condicionCorporal: '3',
  pulso: 'Normal',
  mucosas: 'Rosadas',
  tllc: '< 2 segundos',
  hidratacion: 'Normal',
  ayuno: true,
  notas: 'Paciente activo y alerta'
}
```

#### Ejemplo de Uso
```jsx
import { VitalSignsForm } from '../components';

const [vitalSigns, setVitalSigns] = useState({});

const handleChange = (field, value) => {
  setVitalSigns(prev => ({
    ...prev,
    [field]: value
  }));
};

<VitalSignsForm
  value={vitalSigns}
  onChange={handleChange}
  isVeterinarian={user.type === 'vet'}
/>
```

#### Campos Incluidos
**Signos Vitales (numéricos):**
- Peso (kg)
- Temperatura (°C)
- Frecuencia Cardíaca (lpm)
- Frecuencia Respiratoria (rpm)
- Condición Corporal (1-5)

**Evaluación Física (texto):**
- Pulso
- Mucosas
- TLLC (Tiempo de Llenado Capilar)
- Hidratación

**Estado General:**
- Switch: En Ayuno (boolean)

**Adicionales:**
- TextArea: Notas médicas

---

### 4. **WeightChart**
Gráfica interactiva de evolución de peso.

#### Props
| Prop | Tipo | Requerido | Descripción |
|------|------|-----------|-------------|
| data | array | Sí | Array de objetos `{ fecha, peso }` |
| unit | string | No | Unidad de peso (default: 'kg') |

#### Formato de Datos
```javascript
const weightData = [
  { fecha: '2024-01-15', peso: 14.2 },
  { fecha: '2024-02-20', peso: 15.0 },
  { fecha: '2024-03-18', peso: 15.5 },
  { fecha: '2024-04-22', peso: 15.8 },
];
```

#### Ejemplo de Uso
```jsx
import { WeightChart } from '../components';
import { useEffect, useState } from 'react';
import api from '../services/api';

const PetWeightEvolutionScreen = ({ route }) => {
  const { petId } = route.params;
  const [weightData, setWeightData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeightData = async () => {
      try {
        const response = await api.get(`/pets/${petId}/evolution/weight`);
        setWeightData(response.data.weightEvolution);
      } catch (error) {
        console.error('Error fetching weight:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWeightData();
  }, [petId]);

  if (loading) return <Loading />;

  return (
    <ScrollView style={styles.container}>
      <WeightChart data={weightData} unit="kg" />
    </ScrollView>
  );
};
```

#### Características
- Muestra estadísticas: Actual, Promedio, Mínimo, Máximo
- Gráfica con línea suavizada (bezier)
- Responsivo al ancho de pantalla
- Muestra estado vacío con mensaje informativo
- Formateo automático de fechas (DD/MM)

---

## 🔌 Integración con API

### Endpoints Relacionados

#### 1. Crear Datos Médicos
```javascript
POST /api/procedures/:procedureId/medical-data
Authorization: Bearer <token>

Body:
{
  "peso": 15.5,
  "temperatura": 38.5,
  "frecuenciaCardiaca": 90,
  "frecuenciaRespiratoria": 25,
  "condicionCorporal": 3,
  "pulso": "Normal",
  "mucosas": "Rosadas",
  "tllc": "< 2 segundos",
  "hidratacion": "Normal",
  "ayuno": true,
  "notas": "Paciente activo"
}
```

#### 2. Obtener Evolución de Peso
```javascript
GET /api/pets/:petId/evolution/weight
Authorization: Bearer <token>

Response:
{
  "weightEvolution": [
    { "fecha": "2024-01-15T00:00:00.000Z", "peso": 14.2 },
    { "fecha": "2024-02-20T00:00:00.000Z", "peso": 15.0 }
  ]
}
```

#### 3. Crear Consentimiento con Firma
```javascript
POST /api/consents/procedure/:procedureId
Authorization: Bearer <token>

Body:
{
  "consentType": "CIRUGIA",
  "signerName": "Juan Pérez",
  "signerRelation": "Propietario",
  "signatureBase64": "data:image/png;base64,iVBORw0KG...",
  "emergencyContactName": "María Pérez",
  "emergencyContactPhone": "+52 555 123 4567",
  "legalTextVersion": "v1"
}
```

---

## 🎯 Ejemplo Completo: Pantalla de Consentimiento

```jsx
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { SignaturePad, Button } from '../components';
import api from '../services/api';
import { showToast } from '../utils/toast';

const ConsentScreen = ({ route, navigation }) => {
  const { procedureId, petName } = route.params;
  const [signature, setSignature] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!signature) {
      showToast.error('Por favor firme el documento');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post(
        `/consents/procedure/${procedureId}`,
        {
          consentType: 'CIRUGIA',
          signerName: 'Juan Pérez',
          signerRelation: 'Propietario',
          signatureBase64: signature,
          emergencyContactName: 'María Pérez',
          emergencyContactPhone: '+52 555 123 4567',
        }
      );

      showToast.success('Consentimiento registrado exitosamente');
      navigation.goBack();
    } catch (error) {
      console.error('Error:', error);
      showToast.error('Error al registrar el consentimiento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Consentimiento Informado</Text>
      <Text style={styles.subtitle}>Mascota: {petName}</Text>

      <View style={styles.legalText}>
        <Text>
          Por medio de la presente autorizo la realización del procedimiento...
        </Text>
      </View>

      <SignaturePad
        description="Firma del propietario o responsable"
        onOK={setSignature}
        onClear={() => setSignature(null)}
      />

      <Button
        title="Registrar Consentimiento"
        onPress={handleSubmit}
        loading={loading}
        disabled={!signature}
        style={styles.submitButton}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 20,
  },
  legalText: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 10,
    marginBottom: 20,
  },
  submitButton: {
    marginTop: 20,
    marginBottom: 40,
  },
});

export default ConsentScreen;
```

---

## 🚀 Próximos Pasos

1. **Instalar dependencias** ejecutando los comandos npm/expo
2. **Importar componentes** donde los necesites
3. **Conectar con API** usando los endpoints documentados
4. **Probar en dispositivo real** (la firma requiere interacción táctil)

## 📝 Notas Técnicas

- Todos los componentes usan el tema de la app (#007AFF, #F2F2F7, etc.)
- Son responsivos y funcionan en iOS y Android
- Manejan estados vacíos y de error
- Incluyen validaciones básicas
- Compatible con Expo Go (excepto SignaturePad que requiere build nativo)

---

**Última actualización**: Noviembre 2024
