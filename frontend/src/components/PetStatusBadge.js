import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Badge visual que muestra el estado actual de una mascota
 * @param {string} status - Estado de la mascota: ACTIVE, DECEASED, LOST, ARCHIVED
 * @param {object} style - Estilos adicionales opcionales
 */
const PetStatusBadge = ({ status, style }) => {
  // No mostrar nada si está activo (comportamiento por defecto)
  if (!status || status === 'ACTIVE') {
    return null;
  }

  const getStatusConfig = () => {
    switch (status) {
      case 'DECEASED':
        return {
          label: 'Fallecida',
          icon: 'paw',
          backgroundColor: '#3A3A3C',
          textColor: '#FFFFFF',
        };
      case 'LOST':
        return {
          label: 'Perdida',
          icon: 'alert-circle',
          backgroundColor: '#FF9500',
          textColor: '#FFFFFF',
        };
      case 'ARCHIVED':
        return {
          label: 'Archivada',
          icon: 'archive',
          backgroundColor: '#C7C7CC',
          textColor: '#3A3A3C',
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();
  if (!config) return null;

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.backgroundColor },
        style,
      ]}
    >
      <Ionicons name={config.icon} size={12} color={config.textColor} />
      <Text style={[styles.text, { color: config.textColor }]}>
        {config.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default PetStatusBadge;
