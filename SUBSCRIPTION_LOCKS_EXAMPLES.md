# Ejemplos de Implementación de Candados (Feature Locks)

Este documento muestra cómo implementar los candados de suscripción en las pantallas clave.

## 1. LiveConsultationScreen - Límite de IA

### Lógica:
- **Plan FREE**: Máximo 1 audio O 30 segundos de grabación
- **Plan PLUS**: Límites razonables (por implementar en backend)
- **Plan HOSPITAL**: Ilimitado

### Implementación:

```javascript
import React, { useState, useEffect } from 'react';
import { View, Text, Alert } from 'react-native';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LiveConsultationScreen = () => {
  const navigation = useNavigation();
  const { isPro, isClinic, getActivePlanInfo } = useSubscription();

  const [recordingTime, setRecordingTime] = useState(0);
  const [audioCount, setAudioCount] = useState(0);
  const [isRecording, setIsRecording] = useState(false);

  // Constantes de límites FREE
  const FREE_AUDIO_LIMIT = 1;
  const FREE_TIME_LIMIT_SECONDS = 30;

  useEffect(() => {
    loadAudioCount();
  }, []);

  const loadAudioCount = async () => {
    try {
      const count = await AsyncStorage.getItem('free_audio_count');
      setAudioCount(count ? parseInt(count) : 0);
    } catch (error) {
      console.error('Error loading audio count:', error);
    }
  };

  const incrementAudioCount = async () => {
    const newCount = audioCount + 1;
    setAudioCount(newCount);
    await AsyncStorage.setItem('free_audio_count', newCount.toString());
  };

  // Verificar si puede iniciar grabación
  const canStartRecording = () => {
    if (isClinic || isPro) {
      return true; // Planes pagados permiten grabación
    }

    // Plan FREE - verificar límites
    if (audioCount >= FREE_AUDIO_LIMIT) {
      return false;
    }

    return true;
  };

  // Iniciar grabación
  const handleStartRecording = () => {
    if (!canStartRecording()) {
      // Mostrar paywall
      navigation.navigate('Paywall', {
        feature: 'Grabación con IA',
        onSuccess: () => {
          // Después de comprar, permitir grabar
          startRecording();
        },
      });
      return;
    }

    startRecording();
  };

  const startRecording = () => {
    setIsRecording(true);
    setRecordingTime(0);

    // Si es plan FREE, incrementar contador
    if (!isPro && !isClinic) {
      incrementAudioCount();
    }
  };

  // Verificar límite de tiempo durante la grabación
  useEffect(() => {
    if (!isRecording) return;

    const interval = setInterval(() => {
      setRecordingTime(prev => {
        const newTime = prev + 1;

        // Plan FREE - detener después de 30 segundos
        if (!isPro && !isClinic && newTime >= FREE_TIME_LIMIT_SECONDS) {
          stopRecordingDueToLimit();
          return newTime;
        }

        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRecording, isPro, isClinic]);

  const stopRecordingDueToLimit = () => {
    setIsRecording(false);

    Alert.alert(
      'Límite alcanzado',
      'Has usado tu prueba gratuita. Actualiza a Vet Plus para continuar.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Ver Planes',
          onPress: () => navigation.navigate('Paywall', { feature: 'Grabación extendida' }),
        },
      ]
    );
  };

  // UI
  return (
    <View style={styles.container}>
      {/* Warning Banner para usuarios FREE */}
      {!isPro && !isClinic && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            Plan Gratuito: {FREE_AUDIO_LIMIT - audioCount} grabación(es) restante(s)
            {isRecording && ` • ${FREE_TIME_LIMIT_SECONDS - recordingTime}s restantes`}
          </Text>
        </View>
      )}

      {/* Botón de grabación */}
      <TouchableOpacity
        style={[
          styles.recordButton,
          isRecording && styles.recordButtonActive,
        ]}
        onPress={isRecording ? stopRecording : handleStartRecording}
      >
        <Ionicons
          name={isRecording ? 'stop-circle' : 'mic'}
          size={48}
          color="#FFF"
        />
        <Text style={styles.recordButtonText}>
          {isRecording ? 'Detener' : 'Grabar Consulta'}
        </Text>
      </TouchableOpacity>

      {/* Info del plan actual */}
      <View style={styles.planInfo}>
        <Text style={styles.planInfoText}>
          Plan Actual: {getActivePlanInfo().name}
        </Text>
      </View>
    </View>
  );
};

export default LiveConsultationScreen;
```

## 2. ClinicDashboardScreen - Límite de Miembros de Equipo

### Lógica:
- **Plan FREE**: Máximo 1 miembro
- **Plan PLUS**: Máximo 3 miembros
- **Plan HOSPITAL**: Ilimitado

### Implementación:

```javascript
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { useNavigation } from '@react-navigation/native';
import { clinicAPI } from '../../services/api';

const ClinicDashboardScreen = () => {
  const navigation = useNavigation();
  const { canAddTeamMember, getActivePlanInfo } = useSubscription();

  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeamMembers();
  }, []);

  const loadTeamMembers = async () => {
    try {
      const response = await clinicAPI.getTeamMembers();
      setTeamMembers(response.data.members);
    } catch (error) {
      console.error('Error loading team:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMember = () => {
    const currentMemberCount = teamMembers.length;
    const planInfo = getActivePlanInfo();

    // Verificar si puede agregar más miembros
    if (!canAddTeamMember(currentMemberCount)) {
      // Determinar qué plan necesita
      const requiredPlan = planInfo.tier === 'FREE' ? 'PLUS' : 'HOSPITAL';

      Alert.alert(
        'Límite de Equipo Alcanzado',
        `Tu plan ${planInfo.name} permite máximo ${planInfo.maxTeamMembers} miembro(s). Actualiza a ${requiredPlan === 'PLUS' ? 'Vet Plus' : 'Plan Hospital'} para agregar más.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Ver Planes',
            onPress: () => {
              navigation.navigate('Paywall', {
                feature: 'Equipo Multi-usuario',
                onSuccess: () => {
                  // Después de actualizar, ir a invitar
                  navigation.navigate('InviteMember');
                },
              });
            },
          },
        ]
      );
      return;
    }

    // Tiene espacio, proceder a invitar
    navigation.navigate('InviteMember');
  };

  return (
    <View style={styles.container}>
      {/* Header con info del plan */}
      <View style={styles.header}>
        <Text style={styles.title}>Mi Equipo</Text>
        <View style={styles.planBadge}>
          <Text style={styles.planBadgeText}>
            {getActivePlanInfo().name}
          </Text>
        </View>
      </View>

      {/* Team Members Count */}
      <View style={styles.statsCard}>
        <Text style={styles.statsLabel}>Miembros del Equipo</Text>
        <Text style={styles.statsValue}>
          {teamMembers.length}
          {getActivePlanInfo().maxTeamMembers !== null &&
            ` / ${getActivePlanInfo().maxTeamMembers}`}
        </Text>
      </View>

      {/* Lista de miembros */}
      <FlatList
        data={teamMembers}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.memberCard}>
            <Text style={styles.memberName}>{item.name}</Text>
            <Text style={styles.memberRole}>{item.role}</Text>
          </View>
        )}
      />

      {/* Botón de Invitar */}
      <TouchableOpacity
        style={[
          styles.inviteButton,
          !canAddTeamMember(teamMembers.length) && styles.inviteButtonLocked,
        ]}
        onPress={handleInviteMember}
      >
        <Ionicons
          name={canAddTeamMember(teamMembers.length) ? 'person-add' : 'lock-closed'}
          size={20}
          color="#FFF"
        />
        <Text style={styles.inviteButtonText}>
          {canAddTeamMember(teamMembers.length)
            ? 'Invitar Miembro'
            : 'Invitar (Requiere Upgrade)'}
        </Text>
      </TouchableOpacity>

      {/* Warning si está cerca del límite */}
      {!canAddTeamMember(teamMembers.length) && (
        <View style={styles.warningCard}>
          <Ionicons name="warning" size={24} color="#FF9500" />
          <Text style={styles.warningText}>
            Has alcanzado el límite de tu plan. Actualiza para agregar más miembros.
          </Text>
        </View>
      )}
    </View>
  );
};

export default ClinicDashboardScreen;
```

## 3. Componente Reutilizable de Límite

Para mostrar el progreso del límite en cualquier pantalla:

```javascript
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useNavigation } from '@react-navigation/native';

const UsageLimitBar = ({ current, max, label, feature }) => {
  const navigation = useNavigation();
  const { isPro, isClinic } = useSubscription();

  // Si tiene plan pagado, no mostrar límite
  if (isPro || isClinic) {
    return null;
  }

  const percentage = (current / max) * 100;
  const isNearLimit = percentage >= 80;
  const isAtLimit = current >= max;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.counter, isAtLimit && styles.counterLimit]}>
          {current} / {max}
        </Text>
      </View>

      <View style={styles.barContainer}>
        <View
          style={[
            styles.barFill,
            { width: `${Math.min(percentage, 100)}%` },
            isAtLimit && styles.barFillLimit,
            isNearLimit && styles.barFillWarning,
          ]}
        />
      </View>

      {isAtLimit && (
        <TouchableOpacity
          style={styles.upgradeButton}
          onPress={() => navigation.navigate('Paywall', { feature })}
        >
          <Ionicons name="rocket" size={16} color="#007AFF" />
          <Text style={styles.upgradeButtonText}>Actualizar Plan</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: '#666',
  },
  counter: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  counterLimit: {
    color: '#FF3B30',
  },
  barContainer: {
    height: 8,
    backgroundColor: '#F2F2F7',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#34C759',
    borderRadius: 4,
  },
  barFillWarning: {
    backgroundColor: '#FF9500',
  },
  barFillLimit: {
    backgroundColor: '#FF3B30',
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
  },
  upgradeButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
});

export default UsageLimitBar;
```

### Uso del componente:

```javascript
<UsageLimitBar
  current={audioCount}
  max={FREE_AUDIO_LIMIT}
  label="Grabaciones de IA"
  feature="Grabación con IA"
/>

<UsageLimitBar
  current={teamMembers.length}
  max={getActivePlanInfo().maxTeamMembers}
  label="Miembros del Equipo"
  feature="Equipo Multi-usuario"
/>
```

## 4. Persistencia de Límites FREE

Para el plan gratuito, guardar el uso localmente:

```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Guardar contador de audios
const saveAudioUsage = async (count) => {
  await AsyncStorage.setItem('free_audio_count', count.toString());
};

// Cargar contador
const loadAudioUsage = async () => {
  const count = await AsyncStorage.getItem('free_audio_count');
  return count ? parseInt(count) : 0;
};

// Resetear (al actualizar a plan pagado)
const resetFreeUsage = async () => {
  await AsyncStorage.removeItem('free_audio_count');
};
```

## 5. Testing de Límites

Para testing, puedes agregar botones de debug:

```javascript
{__DEV__ && (
  <View style={styles.debugContainer}>
    <TouchableOpacity onPress={() => setAudioCount(0)}>
      <Text>Reset Audio Count</Text>
    </TouchableOpacity>
    <TouchableOpacity onPress={() => setAudioCount(FREE_AUDIO_LIMIT)}>
      <Text>Set to Limit</Text>
    </TouchableOpacity>
  </View>
)}
```

## Resumen de Límites

| Feature | FREE | PLUS | HOSPITAL |
|---------|------|------|----------|
| Grabación IA | 1 audio (30 seg) | Límites razonables | Ilimitado |
| Miembros Equipo | 1 | 3 | Ilimitado |
| Recetas PDF | ❌ | ✅ | ✅ |
| Agenda WhatsApp | ❌ | ✅ | ✅ |
| Soporte | Email | Email | Prioritario 24h |
