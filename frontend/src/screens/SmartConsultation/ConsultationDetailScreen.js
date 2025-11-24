import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import InteractiveAudioPlayer from '../../components/InteractiveAudioPlayer';
import { showToast } from '../../utils/toast';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL, STORAGE_KEYS } from '../../utils/config';
import { generatePresignedUrl } from '../../utils/presignedUrl';

/**
 * Pantalla de detalle de consulta inteligente
 * Muestra transcripción interactiva y análisis de IA
 */
const ConsultationDetailScreen = ({ route, navigation }) => {
  const { consultationId } = route.params;

  const [consultation, setConsultation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [audioUrl, setAudioUrl] = useState(null);

  useEffect(() => {
    fetchConsultation();
  }, []);

  const fetchConsultation = async () => {
    try {
      setLoading(true);

      const token = await SecureStore.getItemAsync(STORAGE_KEYS.TOKEN);
      const response = await axios.get(
        `${API_URL}/smart-consultations/${consultationId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const consultationData = response.data.consultation;

      // Generar presigned URL para el audio
      const presignedAudioUrl = await generatePresignedUrl(consultationData.audioUrl, 7200);

      setConsultation(consultationData);
      setAudioUrl(presignedAudioUrl);
    } catch (error) {
      console.error('Error fetching consultation:', error);
      showToast.error('Error al cargar la consulta');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Eliminar consulta',
      '¿Estás seguro de que deseas eliminar esta consulta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await SecureStore.getItemAsync(STORAGE_KEYS.TOKEN);
              await axios.delete(`${API_URL}/smart-consultations/${consultationId}`, {
                headers: { Authorization: `Bearer ${token}` },
              });

              showToast.success('Consulta eliminada');
              navigation.goBack();
            } catch (error) {
              showToast.error('Error al eliminar la consulta');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando consulta...</Text>
      </View>
    );
  }

  if (!consultation || !audioUrl) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.iconContainer}>
              <Ionicons name="sparkles" size={32} color="#007AFF" />
            </View>
            <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
              <Ionicons name="trash-outline" size={24} color="#FF3B30" />
            </TouchableOpacity>
          </View>

          <Text style={styles.petName}>{consultation.pet.nombre}</Text>
          <Text style={styles.species}>{consultation.pet.especie} • {consultation.pet.raza}</Text>

          <View style={styles.metaInfo}>
            <View style={styles.metaItem}>
              <Ionicons name="person" size={16} color="#8E8E93" />
              <Text style={styles.metaText}>Dr. {consultation.vet.nombre}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="time" size={16} color="#8E8E93" />
              <Text style={styles.metaText}>
                {formatDuration(consultation.duration)}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="calendar" size={16} color="#8E8E93" />
              <Text style={styles.metaText}>
                {new Date(consultation.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Tags */}
        {consultation.tags && consultation.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {consultation.tags.map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Resumen Clínico */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text" size={24} color="#007AFF" />
            <Text style={styles.sectionTitle}>Resumen Clínico</Text>
          </View>
          <Text style={styles.summaryText}>{consultation.summary}</Text>
        </View>

        {/* Signos Vitales */}
        {consultation.extractedVitals && Object.keys(consultation.extractedVitals).length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="fitness" size={24} color="#FF9500" />
              <Text style={styles.sectionTitle}>Signos Vitales</Text>
            </View>

            <View style={styles.vitalsGrid}>
              {renderVital('Peso', consultation.extractedVitals.peso, 'kg', 'scale-outline')}
              {renderVital('Temperatura', consultation.extractedVitals.temperatura, '°C', 'thermometer-outline')}
              {renderVital('FC', consultation.extractedVitals.frecuenciaCardiaca, 'lpm', 'heart-outline')}
              {renderVital('FR', consultation.extractedVitals.frecuenciaRespiratoria, 'rpm', 'pulse-outline')}
              {renderVital('Pulso', consultation.extractedVitals.pulso, '', 'hand-left-outline')}
              {renderVital('Mucosas', consultation.extractedVitals.mucosas, '', 'eye-outline')}
              {renderVital('CC', consultation.extractedVitals.condicionCorporal, '/9', 'body-outline')}
            </View>
          </View>
        )}

        {/* Reproductor interactivo */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="play-circle" size={24} color="#34C759" />
            <Text style={styles.sectionTitle}>Transcripción Interactiva</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Toca cualquier palabra para saltar a ese momento
          </Text>
        </View>
      </ScrollView>

      {/* Audio player fijo en la parte inferior */}
      <View style={styles.playerContainer}>
        <InteractiveAudioPlayer
          audioUrl={audioUrl}
          transcriptionJson={consultation.transcriptionJson}
          rawText={consultation.rawText}
        />
      </View>
    </View>
  );
};

const renderVital = (label, value, unit, icon) => {
  if (!value) return null;

  return (
    <View style={styles.vitalCard}>
      <Ionicons name={icon} size={20} color="#007AFF" />
      <Text style={styles.vitalLabel}>{label}</Text>
      <Text style={styles.vitalValue}>
        {value}
        {unit && <Text style={styles.vitalUnit}> {unit}</Text>}
      </Text>
    </View>
  );
};

const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
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
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E3F2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFE5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  petName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  species: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 16,
  },
  metaInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    gap: 8,
  },
  tag: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  summaryText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#1C1C1E',
  },
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  vitalCard: {
    flexBasis: '30%',
    backgroundColor: '#F2F2F7',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  vitalLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
    marginBottom: 2,
  },
  vitalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  vitalUnit: {
    fontSize: 14,
    fontWeight: '400',
    color: '#8E8E93',
  },
  playerContainer: {
    height: 350,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 12,
  },
});

export default ConsultationDetailScreen;
