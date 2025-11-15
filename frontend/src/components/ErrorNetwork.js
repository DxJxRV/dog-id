import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ErrorNetwork = ({ onRetry, message }) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="cloud-offline-outline" size={64} color="#FF3B30" />
        <Text style={styles.title}>Error de Conexión</Text>
        <Text style={styles.message}>
          {message || 'No se pudo conectar al servidor. Verifica tu conexión a internet e intenta de nuevo.'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Ionicons name="refresh-outline" size={20} color="#fff" />
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    maxWidth: 300,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
    gap: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ErrorNetwork;
