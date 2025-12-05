import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSubscription } from '../contexts/SubscriptionContext';

/**
 * Componente para mostrar cuando una feature está bloqueada
 * @param {string} feature - Nombre de la feature bloqueada
 * @param {string} message - Mensaje personalizado
 * @param {string} requiredPlan - Plan requerido: 'pro' o 'clinic'
 */
const FeatureLock = ({ feature, message, requiredPlan = 'pro' }) => {
  const navigation = useNavigation();
  const { isPro, isClinic } = useSubscription();

  // Determinar si el usuario tiene acceso
  const hasAccess =
    requiredPlan === 'clinic' ? isClinic : isPro || isClinic;

  // Si tiene acceso, no mostrar nada
  if (hasAccess) {
    return null;
  }

  const handleUpgrade = () => {
    navigation.navigate('Paywall', { feature });
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="lock-closed" size={32} color="#FFB800" />
        </View>

        <Text style={styles.title}>Función PRO</Text>
        <Text style={styles.message}>
          {message || `Para usar ${feature}, necesitas una suscripción ${requiredPlan === 'clinic' ? 'Clinic Pro' : 'Vet Plus'}.`}
        </Text>

        <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgrade}>
          <Ionicons name="rocket" size={20} color="#FFF" />
          <Text style={styles.upgradeButtonText}>Actualizar Ahora</Text>
        </TouchableOpacity>

        <View style={styles.benefitsContainer}>
          <View style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={16} color="#34C759" />
            <Text style={styles.benefitText}>Sin límites de uso</Text>
          </View>
          <View style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={16} color="#34C759" />
            <Text style={styles.benefitText}>Cancela cuando quieras</Text>
          </View>
          <View style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={16} color="#34C759" />
            <Text style={styles.benefitText}>Soporte prioritario</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 20,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 2,
    borderColor: '#FFE4A3',
  },
  content: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFF8E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  upgradeButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: 'bold',
  },
  benefitsContainer: {
    width: '100%',
    gap: 8,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  benefitText: {
    fontSize: 14,
    color: '#666',
  },
});

export default FeatureLock;
