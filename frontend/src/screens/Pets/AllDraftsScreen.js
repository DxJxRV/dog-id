import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { draftsAPI, vaccinesAPI, proceduresAPI } from '../../services/api';
import { Loading, ErrorNetwork } from '../../components';
import { isNetworkError } from '../../utils/networkUtils';
import { showToast } from '../../utils/toast';

const AllDraftsScreen = ({ navigation }) => {
  const [drafts, setDrafts] = useState({ vaccines: [], procedures: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const loadDrafts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await draftsAPI.getAllVetDrafts();

      setDrafts({
        vaccines: response.data.draftVaccines || [],
        procedures: response.data.draftProcedures || [],
      });
    } catch (err) {
      if (isNetworkError(err)) {
        setError(err);
      } else {
        showToast.error('No se pudieron cargar los registros pendientes');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadDrafts();
    });
    return unsubscribe;
  }, [navigation, loadDrafts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDrafts();
  }, [loadDrafts]);

  const handleCompleteDraft = (draft, type, petId) => {
    if (type === 'vaccine') {
      navigation.navigate('AddVaccine', {
        petId,
        draftData: draft,
        onRefresh: loadDrafts,
      });
    } else if (type === 'procedure') {
      navigation.navigate('AddProcedure', {
        petId,
        draftData: draft,
        onRefresh: loadDrafts,
      });
    }
  };

  const handleDeleteDraft = async (draft, type) => {
    try {
      setDeletingId(draft.id);

      if (type === 'vaccine') {
        await vaccinesAPI.deleteDraft(draft.id);
      } else {
        await proceduresAPI.deleteDraft(draft.id);
      }

      showToast.success('Registro eliminado');
      loadDrafts();
    } catch (err) {
      if (isNetworkError(err)) {
        showToast.networkError();
      } else {
        showToast.error('No se pudo eliminar el registro');
      }
    } finally {
      setDeletingId(null);
    }
  };

  const getTitle = (draft, type) => {
    if (type === 'vaccine') {
      return draft.nombreVacuna || 'Vacuna sin nombre';
    }
    return draft.descripcion || 'Procedimiento';
  };

  const getSubtitle = (draft, type) => {
    if (type === 'vaccine') {
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
    return tipoMap[draft.tipo] || 'Procedimiento';
  };

  const getIcon = (draft, type) => {
    if (type === 'vaccine') {
      return 'medical';
    }
    const iconMap = {
      desparasitacion: 'bug',
      limpieza_dental: 'water',
      cirugia: 'cut',
      chequeo_general: 'pulse',
      radiografia: 'scan',
      otro: 'fitness'
    };
    return iconMap[draft.tipo] || 'fitness';
  };

  const getColor = (type) => {
    return type === 'vaccine' ? '#9B59B6' : '#FF9500';
  };

  const renderDraftItem = (draft, type) => {
    const petId = draft.pet?.id || draft.petId;
    const petName = draft.pet?.nombre || 'Mascota';
    const ownerName = draft.pet?.user?.nombre || '';

    return (
      <View key={`${type}-${draft.id}`} style={styles.draftItem}>
        <View style={styles.draftHeader}>
          <Text style={styles.petName}>{petName}</Text>
          {ownerName && (
            <Text style={styles.ownerName}>Dueño: {ownerName}</Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.draftCard}
          onPress={() => handleCompleteDraft(draft, type, petId)}
          disabled={deletingId === draft.id}
        >
          {/* Icono */}
          <View style={[styles.cardIconContainer, { backgroundColor: getColor(type) }]}>
            <Ionicons name={getIcon(draft, type)} size={28} color="#FFFFFF" />
          </View>

          {/* Contenido */}
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {getTitle(draft, type)}
            </Text>
            <View style={[styles.typeTag, { backgroundColor: type === 'vaccine' ? '#F3E5F5' : '#FFF9E6' }]}>
              <Text style={[styles.typeText, { color: getColor(type) }]}>
                {getSubtitle(draft, type)}
              </Text>
            </View>
          </View>

          {/* Botón eliminar */}
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={(e) => {
              e.stopPropagation();
              handleDeleteDraft(draft, type);
            }}
            disabled={deletingId === draft.id}
          >
            {deletingId === draft.id ? (
              <ActivityIndicator size="small" color="#FF3B30" />
            ) : (
              <Ionicons name="trash-outline" size={20} color="#FF3B30" />
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return <ErrorNetwork onRetry={loadDrafts} />;
  }

  const allDrafts = [
    ...drafts.vaccines.map(v => ({ ...v, type: 'vaccine' })),
    ...drafts.procedures.map(p => ({ ...p, type: 'procedure' }))
  ];

  // Agrupar por mascota
  const draftsByPet = allDrafts.reduce((acc, draft) => {
    const petId = draft.pet?.id || draft.petId;
    if (!acc[petId]) {
      acc[petId] = {
        petName: draft.pet?.nombre || 'Mascota',
        ownerName: draft.pet?.user?.nombre || '',
        drafts: []
      };
    }
    acc[petId].drafts.push(draft);
    return acc;
  }, {});

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {allDrafts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle" size={64} color="#34C759" />
            <Text style={styles.emptyText}>¡Todo completado!</Text>
            <Text style={styles.emptySubtext}>
              No tienes registros pendientes por completar
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Registros Pendientes</Text>
              <Text style={styles.headerSubtitle}>
                {allDrafts.length} {allDrafts.length === 1 ? 'registro' : 'registros'} por completar
              </Text>
            </View>

            {Object.entries(draftsByPet).map(([petId, petGroup]) => (
              <View key={petId} style={styles.petSection}>
                {petGroup.drafts.map(draft => renderDraftItem(draft, draft.type))}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  petSection: {
    marginBottom: 8,
  },
  draftItem: {
    marginBottom: 16,
  },
  draftHeader: {
    marginBottom: 8,
  },
  petName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  ownerName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  draftCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  typeTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  deleteButton: {
    padding: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

export default AllDraftsScreen;
