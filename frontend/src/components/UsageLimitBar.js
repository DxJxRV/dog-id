import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useNavigation } from '@react-navigation/native';

/**
 * Barra de progreso de límite de uso
 * @param {number} current - Uso actual
 * @param {number} max - Límite máximo (null para ilimitado)
 * @param {string} label - Etiqueta descriptiva
 * @param {string} feature - Nombre de la feature para el paywall
 * @param {boolean} hideOnPremium - Ocultar si tiene plan premium (default: true)
 */
const UsageLimitBar = ({
  current,
  max,
  label,
  feature,
  hideOnPremium = true,
}) => {
  const navigation = useNavigation();
  const { isPro, isClinic } = useSubscription();

  // Si tiene plan pagado y hideOnPremium es true, no mostrar límite
  if (hideOnPremium && (isPro || isClinic)) {
    return null;
  }

  // Si max es null, significa ilimitado
  if (max === null) {
    return (
      <View style={styles.container}>
        <View style={styles.unlimitedContainer}>
          <Ionicons name="infinite" size={20} color="#34C759" />
          <Text style={styles.unlimitedText}>{label}: Ilimitado</Text>
        </View>
      </View>
    );
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
            isNearLimit && !isAtLimit && styles.barFillWarning,
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

      {isNearLimit && !isAtLimit && (
        <Text style={styles.warningText}>Cerca del límite</Text>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  unlimitedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unlimitedText: {
    fontSize: 14,
    color: '#34C759',
    fontWeight: '600',
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
  warningText: {
    fontSize: 12,
    color: '#FF9500',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default UsageLimitBar;
