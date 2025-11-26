import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { draftsAPI, vaccinesAPI, proceduresAPI } from '../services/api';
import { showToast } from '../utils/toast';

const PendingDraftsList = ({ petId, navigation, onRefresh }) => {
  const [drafts, setDrafts] = useState({ vaccines: [], procedures: [] });
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const loadDrafts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await draftsAPI.getDrafts(petId);
      setDrafts({
        vaccines: response.data.draftVaccines || [],
        procedures: response.data.draftProcedures || [],
      });
    } catch (error) {
      console.error('Error loading drafts:', error);
      // No mostrar error, solo no mostrar drafts
      setDrafts({ vaccines: [], procedures: [] });
    } finally {
      setLoading(false);
    }
  }, [petId]);

  useFocusEffect(
    useCallback(() => {
      loadDrafts();
    }, [loadDrafts])
  );

  const handleCompleteDraft = (draft, type) => {
    if (type === 'vaccine') {
      navigation.navigate('AddVaccine', {
        petId,
        draftData: draft,
        onRefresh: onRefresh, // Pasar callback para refrescar después de completar
      });
    } else if (type === 'procedure') {
      navigation.navigate('AddProcedure', {
        petId,
        draftData: draft,
        onRefresh: onRefresh, // Pasar callback para refrescar después de completar
      });
    }
  };

  const handleDiscardDraft = async (draftId, type) => {
    Alert.alert(
      'Descartar Sugerencia',
      '¿Estás seguro de que deseas descartar esta sugerencia de la IA?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Descartar',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingId(draftId);

              if (type === 'vaccine') {
                await vaccinesAPI.deleteDraft(draftId);
              } else if (type === 'procedure') {
                await proceduresAPI.deleteDraft(draftId);
              }

              showToast.success('Borrador descartado');

              // Recargar drafts
              await loadDrafts();

              // Notificar al padre para que recargue
              if (onRefresh) {
                onRefresh();
              }
            } catch (error) {
              console.error('Error discarding draft:', error);
              showToast.error(error.response?.data?.error || 'Error al descartar borrador');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Combinar todos los drafts en un solo array
  const allDrafts = [
    ...drafts.vaccines.map(v => ({ ...v, type: 'vaccine', icon: 'medical' })),
    ...drafts.procedures.map(p => ({ ...p, type: 'procedure', icon: 'fitness' }))
  ];

  const totalDrafts = allDrafts.length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#FF9500" />
      </View>
    );
  }

  if (totalDrafts === 0) {
    return null;
  }

  const getTitle = (draft) => {
    if (draft.type === 'vaccine') {
      return draft.nombreVacuna;
    }
    return draft.descripcion;
  };

  const getSubtitle = (draft) => {
    if (draft.type === 'vaccine') {
      return 'Vacuna';
    }
    const tipoMap = {
      desparasitacion: 'Desparasitación',
      limpieza_dental: 'Limpieza Dental',
      cirugia: 'Cirugía',
      chequeo_general: 'Chequeo',
      radiografia: 'Radiografía',
      otro: 'Procedimiento'
    };
    return tipoMap[draft.tipo] || 'otro';
  };

  const getColor = (type) => {
    return type === 'vaccine' ? '#9B59B6' : '#FF9500'; // Morado para vacunas, naranja para procedimientos
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="warning" size={20} color="#FF9500" />
          <Text style={styles.title}>Completar Registros</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{totalDrafts}</Text>
          </View>
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={20}
            color="#666"
            style={styles.chevron}
          />
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <>
          <Text style={styles.subtitle}>
            La IA detectó estos procedimientos durante las consultas
          </Text>

          {/* Grid de drafts */}
          <View style={styles.grid}>
            {allDrafts.map((draft) => (
              <View key={draft.id} style={styles.gridItem}>
                <TouchableOpacity
                  style={styles.draftCard}
                  onPress={() => handleCompleteDraft(draft, draft.type)}
                  disabled={deletingId === draft.id}
                  activeOpacity={0.7}
                >
                  {/* Botón X en esquina */}
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => handleDiscardDraft(draft.id, draft.type)}
                    disabled={deletingId === draft.id}
                  >
                    {deletingId === draft.id ? (
                      <ActivityIndicator size="small" color="#FF3B30" />
                    ) : (
                      <Ionicons name="close-circle" size={20} color="#999" />
                    )}
                  </TouchableOpacity>

                  {/* Icono */}
                  <View style={[styles.cardIconContainer, { backgroundColor: getColor(draft.type) }]}>
                    <Ionicons name={draft.icon} size={28} color="#FFFFFF" />
                  </View>

                  {/* Título */}
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {getTitle(draft)}
                  </Text>

                  {/* Tipo */}
                  <View style={[styles.typeTag, { backgroundColor: draft.type === 'vaccine' ? '#F3E5F5' : '#FFF9E6' }]}>
                    <Text style={[styles.typeText, { color: getColor(draft.type) }]}>{getSubtitle(draft)}</Text>
                  </View>

                  {/* Botón completar */}
                  <View style={[styles.completeButton, { backgroundColor: getColor(draft.type) }]}>
                    <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                    <Text style={styles.completeButtonText}>Completar</Text>
                  </View>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFD966',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chevron: {
    marginLeft: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#333',
  },
  badge: {
    backgroundColor: '#FF9500',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  gridItem: {
    width: '48.5%',
  },
  draftCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    position: 'relative',
    minHeight: 160,
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    marginTop: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 18,
    minHeight: 36,
  },
  typeTag: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 4,
    width: '100%',
  },
  completeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default PendingDraftsList;
