# Guía de Integración de Suscripciones con RevenueCat

Esta guía explica cómo usar el sistema de suscripciones en la aplicación.

## Configuración Inicial

### 1. Variables de Entorno

Agrega las siguientes variables a tu `.env`:

```bash
EXPO_PUBLIC_REVENUECAT_API_KEY_IOS=tu_api_key_ios_aqui
EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID=tu_api_key_android_aqui
```

### 2. Configuración en App.json

Asegúrate de tener los permisos necesarios para Android:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-build-properties",
        {
          "android": {
            "enableProguardInReleaseBuilds": true
          }
        }
      ]
    ],
    "android": {
      "permissions": [
        "com.android.vending.BILLING"
      ]
    }
  }
}
```

### 3. Envolver la App con el Provider

En `App.js`:

```javascript
import { SubscriptionProvider } from './src/contexts/SubscriptionContext';
import { AuthProvider } from './src/contexts/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        {/* Tu navegación aquí */}
      </SubscriptionProvider>
    </AuthProvider>
  );
}
```

## Uso del Hook de Suscripción

### Verificar Estado de Suscripción

```javascript
import { useSubscription } from '../contexts/SubscriptionContext';

function MiComponente() {
  const { isPro, isClinic, loading } = useSubscription();

  if (loading) {
    return <Loading />;
  }

  if (!isPro && !isClinic) {
    return <Text>Necesitas una suscripción PRO</Text>;
  }

  return <Text>¡Tienes acceso!</Text>;
}
```

### Comprar una Suscripción

```javascript
import { useSubscription } from '../contexts/SubscriptionContext';

function BuyButton() {
  const { currentOffering, purchasePackage } = useSubscription();
  const [buying, setBuying] = useState(false);

  const handleBuy = async () => {
    if (!currentOffering) return;

    setBuying(true);
    try {
      const pkg = currentOffering.availablePackages[0];
      const result = await purchasePackage(pkg);

      if (result.success) {
        Alert.alert('¡Éxito!', 'Suscripción activada');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo procesar la compra');
    } finally {
      setBuying(false);
    }
  };

  return (
    <Button onPress={handleBuy} disabled={buying}>
      {buying ? 'Procesando...' : 'Comprar PRO'}
    </Button>
  );
}
```

## Implementar Candados (Feature Locks)

### Ejemplo 1: Componente FeatureLock

Usa el componente `FeatureLock` para mostrar un mensaje de upgrade:

```javascript
import { FeatureLock } from '../components';
import { useSubscription } from '../contexts/SubscriptionContext';

function LiveConsultationScreen() {
  const { isPro, isClinic } = useSubscription();

  // Mostrar candado si no tiene acceso
  if (!isPro && !isClinic) {
    return (
      <FeatureLock
        feature="Grabación con IA"
        message="La grabación con IA es una función PRO. Actualiza para grabar consultas ilimitadas."
        requiredPlan="pro"
      />
    );
  }

  // Usuario tiene acceso, mostrar la funcionalidad
  return (
    <View>
      {/* Tu UI de grabación aquí */}
    </View>
  );
}
```

### Ejemplo 2: Botón Bloqueado

```javascript
import { useSubscription } from '../contexts/SubscriptionContext';
import { useNavigation } from '@react-navigation/native';

function InviteMemberButton() {
  const navigation = useNavigation();
  const { isClinic } = useSubscription();

  const handlePress = () => {
    if (!isClinic) {
      // Mostrar paywall si no tiene plan Clinic
      navigation.navigate('Paywall', {
        feature: 'Invitaciones de equipo',
      });
      return;
    }

    // Continuar con la función normal
    navigation.navigate('InviteMember');
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handlePress}>
      <Ionicons name="person-add" size={20} color="#FFF" />
      <Text style={styles.buttonText}>
        {isClinic ? 'Invitar Miembro' : 'Invitar (PRO)'}
      </Text>
      {!isClinic && <Ionicons name="lock-closed" size={16} color="#FFB800" />}
    </TouchableOpacity>
  );
}
```

### Ejemplo 3: Límite de Uso (Free Trial)

```javascript
import { useSubscription } from '../contexts/SubscriptionContext';
import { useState, useEffect } from 'react';

function RecordingFeature() {
  const { isPro, isClinic } = useSubscription();
  const [recordingTime, setRecordingTime] = useState(0);
  const FREE_LIMIT_SECONDS = 600; // 10 minutos

  const canContinueRecording = isPro || isClinic || recordingTime < FREE_LIMIT_SECONDS;

  useEffect(() => {
    if (!canContinueRecording) {
      // Detener grabación y mostrar paywall
      stopRecording();
      navigation.navigate('Paywall', {
        feature: 'Grabación extendida',
      });
    }
  }, [recordingTime, canContinueRecording]);

  return (
    <View>
      {!isPro && !isClinic && (
        <View style={styles.warningBanner}>
          <Text>
            Tiempo restante: {Math.floor((FREE_LIMIT_SECONDS - recordingTime) / 60)} min
          </Text>
        </View>
      )}

      <RecordButton disabled={!canContinueRecording} />
    </View>
  );
}
```

### Ejemplo 4: Badge PRO en Features

```javascript
import { useSubscription } from '../contexts/SubscriptionContext';

function FeatureCard({ title, isPremium }) {
  const { isPro, isClinic } = useSubscription();
  const hasAccess = !isPremium || isPro || isClinic;

  return (
    <View style={[styles.card, !hasAccess && styles.cardLocked]}>
      <Text style={styles.title}>{title}</Text>

      {isPremium && !hasAccess && (
        <View style={styles.proBadge}>
          <Ionicons name="lock-closed" size={12} color="#FFB800" />
          <Text style={styles.proText}>PRO</Text>
        </View>
      )}

      {!hasAccess && <View style={styles.overlay} />}
    </View>
  );
}
```

## Navegar al Paywall Directamente

```javascript
import { useNavigation } from '@react-navigation/native';

function UpgradeButton() {
  const navigation = useNavigation();

  const handleUpgrade = () => {
    navigation.navigate('Paywall', {
      feature: 'Función Premium',
      onSuccess: () => {
        // Callback opcional cuando la compra es exitosa
        console.log('¡Usuario actualizó a PRO!');
      },
    });
  };

  return (
    <TouchableOpacity onPress={handleUpgrade}>
      <Text>Actualizar a PRO</Text>
    </TouchableOpacity>
  );
}
```

## Restaurar Compras

Agrega un botón en el perfil o configuración:

```javascript
import { useSubscription } from '../contexts/SubscriptionContext';

function SettingsScreen() {
  const { restorePurchases } = useSubscription();
  const [restoring, setRestoring] = useState(false);

  const handleRestore = async () => {
    setRestoring(true);
    try {
      await restorePurchases();
      Alert.alert('Éxito', 'Compras restauradas');
    } catch (error) {
      Alert.alert('Error', 'No se encontraron compras anteriores');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <TouchableOpacity onPress={handleRestore} disabled={restoring}>
      <Text>Restaurar Compras</Text>
    </TouchableOpacity>
  );
}
```

## Mostrar Información del Plan Actual

```javascript
import { useSubscription } from '../contexts/SubscriptionContext';

function ProfileScreen() {
  const { isPro, isClinic, getActivePlanInfo } = useSubscription();
  const planInfo = getActivePlanInfo();

  return (
    <View>
      <Text style={styles.planName}>Plan Actual: {planInfo.name}</Text>

      <View style={styles.features}>
        {planInfo.features.map((feature, index) => (
          <View key={index} style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={20} color="#34C759" />
            <Text>{feature}</Text>
          </View>
        ))}
      </View>

      {!isPro && !isClinic && (
        <Button onPress={() => navigation.navigate('Paywall')}>
          Actualizar Plan
        </Button>
      )}
    </View>
  );
}
```

## Entitlements Configurados

La app maneja los siguientes entitlements en RevenueCat:

- **`vet_plus`**: Plan individual para veterinarios
  - IA con límites
  - Recetas personalizadas
  - Agenda básica

- **`clinic_pro`**: Plan para clínicas
  - IA ilimitada
  - Multi-usuario sin límites
  - Funciones avanzadas

## Testing

Para testing, RevenueCat proporciona SKUs de sandbox:

1. En iOS: Usa una cuenta de Sandbox (Configuración > App Store > Sandbox Account)
2. En Android: Usa Google Play Console para crear productos de prueba

## Mejores Prácticas

1. **Siempre verifica `loading`** antes de mostrar UI basada en suscripción
2. **Usa candados suaves**: Muestra un preview limitado antes de bloquear
3. **Contexto claro**: Explica por qué una función requiere PRO
4. **CTA visible**: Botón de upgrade debe ser prominente pero no intrusivo
5. **Timing**: Muestra el paywall después de que el usuario vea valor en la app

## Troubleshooting

### Error: "RevenueCat no está configurado"

Asegúrate de que las variables de entorno estén correctamente configuradas y que el `SubscriptionProvider` envuelva tu app.

### Los entitlements no se actualizan

Llama a `checkSubscriptionStatus()` manualmente después de una compra si es necesario.

### Compras no aparecen en otra plataforma

RevenueCat sincroniza automáticamente, pero puede tomar algunos minutos. Usa el botón "Restaurar Compras".
