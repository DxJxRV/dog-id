import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { showToast } from '../../utils/toast';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL, STORAGE_KEYS } from '../../utils/config';
import { useFocusEffect } from '@react-navigation/native';

/**
 * Pantalla de listado de consultas inteligentes de una mascota
 */
const ConsultationsListScreen = ({ route, navigation }) => {
  const { petId, petName } = route.params;

  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchConsultations();
    }, [petId])
  );

  const fetchConsultations = async () => {
    try {
      const token = await SecureStore.getItemAsync(STORAGE_KEYS.TOKEN);
      const response = await axios.get(
        `${API_URL}/pets/${petId}/smart-consultations`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setConsultations(response.data.consultations);
    } catch (error) {
      console.error('Error fetching consultations:', error);
      showToast.error('Error al cargar las consultas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchConsultations();
  };

  const renderConsultation = ({ item }) => (
    <TouchableOpacity
      style={styles.consultationCard}
      onPress={() =>
        navigation.navigate('ConsultationDetail', {
          consultationId: item.id,
          petId,
          petName,
        })
      }
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>
          <Ionicons name="sparkles" size={24} color="#007AFF" />
        </View>
        <View style={styles.cardHeaderText}>
          <Text style={styles.cardDate}>
            {new Date(item.createdAt).toLocaleDateString('es-MX', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </Text>
          <Text style={styles.cardVet}>Dr. {item.vet.nombre}</Text>
        </View>
        <View style={styles.durationBadge}>
          <Ionicons name="time-outline" size={14} color="#8E8E93" />
          <Text style={styles.durationText}>
            {formatDuration(item.duration)}
          </Text>
        </View>
      </View>

      <Text style={styles.cardSummary} numberOfLines={3}>
        {item.summary}
      </Text>

      {item.tags && item.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {item.tags.slice(0, 3).map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
          {item.tags.length > 3 && (
            <Text style={styles.moreTagsText}>+{item.tags.length - 3}</Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando consultas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={consultations}
        renderItem={renderConsultation}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="mic-off-outline" size={80} color="#C7C7CC" />
            <Text style={styles.emptyText}>No hay consultas grabadas</Text>
            <Text style={styles.emptySubtext}>
              Graba la primera consulta para ver el análisis con IA
            </Text>
          </View>
        }
      />

      {/* Botón flotante para nueva consulta */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() =>
          navigation.navigate('RecordConsultation', { petId, petName })
        }
        activeOpacity={0.8}
      >
        <Ionicons name="mic" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  consultationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E3F2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  cardVet: {
    fontSize: 14,
    color: '#8E8E93',
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  durationText: {
    fontSize: 12,
    color: '#8E8E93',
    fontVariant: ['tabular-nums'],
  },
  cardSummary: {
    fontSize: 15,
    lineHeight: 22,
    color: '#1C1C1E',
    marginBottom: 12,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  tag: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  moreTagsText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
});

export default ConsultationsListScreen;
