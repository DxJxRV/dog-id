import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  ImageBackground,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { petsAPI, draftsAPI } from '../../services/api';
import { Loading, ErrorNetwork } from '../../components';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { isNetworkError } from '../../utils/networkUtils';
import { showToast } from '../../utils/toast';
import { getImageUrl } from '../../utils/imageHelper';
import AddPetModal from '../../components/AddPetModal';

const { width } = Dimensions.get('window');
const cardWidth = (width - 20) / 2; // 8px padding on each side + 4px gap

const PetsListScreen = ({ navigation }) => {
  const { userType, user } = useAuth();
  const { activePlan } = useSubscription();
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasArchivedPets, setHasArchivedPets] = useState(false);
  const [error, setError] = useState(null);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showAddPetModal, setShowAddPetModal] = useState(false);
  const [selectedPet, setSelectedPet] = useState(null);
  const [archiving, setArchiving] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [draftsCount, setDraftsCount] = useState(0);

  const isVet = userType === 'vet';

  const fetchDraftsCount = async () => {
    if (!isVet) return;

    try {
      const response = await draftsAPI.getAllVetDrafts();
      setDraftsCount(response.data.totalDrafts || 0);
    } catch (err) {
      console.error('Error fetching drafts count:', err);
      // No mostrar error al usuario, solo registrar
    }
  };

  const fetchPets = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await petsAPI.getAll();
      setPets(response.data.pets);

      // Check if user has any archived pets
      if (response.data.hasArchivedPets !== undefined) {
        setHasArchivedPets(response.data.hasArchivedPets);
      }

      // Fetch drafts count for vets
      if (isVet) {
        await fetchDraftsCount();
      }
    } catch (err) {
      if (isNetworkError(err)) {
        setError(err);
      } else {
        showToast.error('No se pudieron cargar las mascotas');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPets();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchPets();
    });
    return unsubscribe;
  }, [navigation]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPets();
  }, []);

  // 🔒 CANDADO DE PACIENTES: Verificar límite de 30 mascotas para plan FREE
  const handleOpenAddPetModal = () => {
    // Solo aplicar límite a usuarios (owners), no a vets
    if (!isVet && activePlan === 'FREE' && pets.length >= 30) {
      Alert.alert(
        'Límite de pacientes alcanzado',
        `Tu plan ${activePlan} permite máximo 30 mascotas. Actualiza tu plan para agregar más.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Ver Planes',
            onPress: () => navigation.navigate('Paywall', {
              feature: 'Pacientes adicionales'
            })
          }
        ]
      );
      return;
    }

    setShowAddPetModal(true);
  };

  const handleOpenOptions = (pet, event) => {
    event.stopPropagation();
    setSelectedPet(pet);
    setShowOptionsMenu(true);
  };

  const handleArchivePet = async () => {
    setShowOptionsMenu(false);

    Alert.alert(
      'Archivar mascota',
      '¿Deseas archivar esta mascota? Podrás verla en la sección de archivados.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Archivar',
          onPress: async () => {
            try {
              setArchiving(true);
              await petsAPI.archive(selectedPet.id, true);
              showToast.success('Mascota archivada correctamente');
              fetchPets();
            } catch (err) {
              if (isNetworkError(err)) {
                showToast.networkError();
              } else {
                showToast.error('No se pudo archivar la mascota');
              }
            } finally {
              setArchiving(false);
            }
          },
        },
      ]
    );
  };

  const handleUnlinkPet = async () => {
    setShowOptionsMenu(false);

    const isCoOwner = selectedPet?.isCoOwner;
    const unlinkMessage = isCoOwner
      ? '¿Estás seguro de que deseas dejar de ser co-dueño de esta mascota?'
      : '¿Estás seguro de que deseas desvincular esta mascota?';

    Alert.alert(
      'Desvincular mascota',
      unlinkMessage,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desvincular',
          style: 'destructive',
          onPress: async () => {
            try {
              setUnlinking(true);

              if (isCoOwner) {
                await petsAPI.unlinkPetAsCoOwner(selectedPet.id);
              } else if (isVet) {
                await petsAPI.unlinkPetAsVet(selectedPet.id);
              }

              showToast.success('Mascota desvinculada correctamente');
              fetchPets();
            } catch (err) {
              if (isNetworkError(err)) {
                showToast.networkError();
              } else {
                showToast.error('No se pudo desvincular la mascota');
              }
            } finally {
              setUnlinking(false);
            }
          },
        },
      ]
    );
  };

  const handleEditPet = () => {
    setShowOptionsMenu(false);
    navigation.navigate('EditPet', { pet: selectedPet });
  };

  const handleTransferPet = () => {
    setShowOptionsMenu(false);
    navigation.navigate('PetTransfer', {
      petId: selectedPet.id,
      petName: selectedPet.nombre
    });
  };

  const renderDraftsCard = () => {
    if (!isVet || draftsCount === 0) return null;

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('AllDrafts')}
        style={styles.draftsCardContainer}
      >
        <LinearGradient
          colors={['#FFB900', '#FF9500']}
          style={styles.draftsCardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.draftsCardContent}>
            <View style={styles.draftsIconContainer}>
              <Ionicons name="alert-circle" size={48} color="#FFF" />
            </View>
            <View style={styles.draftsTextContainer}>
              <Text style={styles.draftsTitle}>Registros Pendientes</Text>
              <Text style={styles.draftsCount}>
                {draftsCount} {draftsCount === 1 ? 'registro' : 'registros'} por completar
              </Text>
              <Text style={styles.draftsSubtitle}>
                Toca aquí para completarlos
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.9)" />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderPetCard = ({ item }) => {
    const isArchivedByOwner = item.isArchivedByOwner || false;

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('PetDetail', { petId: item.id })}
        style={[styles.cardContainer, isArchivedByOwner && styles.archivedCard]}
      >
        <ImageBackground
          source={
            item.fotoUrl
              ? { uri: getImageUrl(item.fotoUrl) }
              : require('../../assets/adaptive-icon.png')
          }
          style={styles.cardBackground}
          imageStyle={styles.cardBackgroundImage}
        >
          {/* Gradiente superior para el botón de opciones */}
          <LinearGradient
            colors={['rgba(0,0,0,0.6)', 'transparent']}
            style={styles.topGradient}
          >
            <TouchableOpacity
              style={styles.optionsButton}
              onPress={(e) => handleOpenOptions(item, e)}
            >
              <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>

          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.gradient}
          >
            <View style={styles.cardContent}>
              <Text style={styles.petName}>{item.nombre}</Text>
              <Text style={styles.petDetails}>
                {item.especie} {item.raza ? `• ${item.raza}` : ''}
              </Text>
              {item.user && isVet && (
                <Text style={styles.ownerText}>
                  Dueño: {item.user.nombre}
                </Text>
              )}
              <TouchableOpacity style={styles.exploreButton}>
                <Text style={styles.exploreButtonText}>Ver detalles</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </ImageBackground>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return <ErrorNetwork onRetry={fetchPets} />;
  }

  const isOwner = selectedPet?.user && user && selectedPet.user.id === user.id;
  const isCoOwner = selectedPet?.isCoOwner;

  return (
    <View style={styles.container}>
      <FlatList
        data={pets}
        renderItem={renderPetCard}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        ListHeaderComponent={renderDraftsCard}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No tienes mascotas</Text>
            <Text style={styles.emptySubtext}>
              Agrega tu primera mascota para comenzar
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
      {hasArchivedPets && (
        <TouchableOpacity
          style={styles.archivedButton}
          onPress={() => navigation.navigate('ArchivedPets')}
        >
          <Ionicons name="archive-outline" size={24} color="#fff" />
        </TouchableOpacity>
      )}

      {/* FAB para agregar mascota */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleOpenAddPetModal}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      {/* Modal de agregar mascota */}
      <AddPetModal
        visible={showAddPetModal}
        onClose={() => setShowAddPetModal(false)}
        onNavigateToAddPet={() => {
          setShowAddPetModal(false);
          navigation.navigate('AddPet');
        }}
        onNavigateToLinkPet={() => {
          setShowAddPetModal(false);
          navigation.navigate('LinkPet');
        }}
        onNavigateToQuickPet={() => {
          setShowAddPetModal(false);
          navigation.navigate('QuickPet');
        }}
        onNavigateToClaimPet={() => {
          setShowAddPetModal(false);
          navigation.navigate('ClaimPet');
        }}
        isVet={isVet}
      />

      {/* Modal de opciones */}
      <Modal
        visible={showOptionsMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOptionsMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptionsMenu(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.optionsMenu}>
              {isOwner && (
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={handleEditPet}
                >
                  <Ionicons name="create-outline" size={22} color="#8E8E93" />
                  <Text style={styles.optionText}>Editar mascota</Text>
                </TouchableOpacity>
              )}

              {selectedPet?.isCreatedByVet && isVet && (
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={handleTransferPet}
                >
                  <Ionicons name="qr-code-outline" size={22} color="#007AFF" />
                  <Text style={[styles.optionText, { color: '#007AFF' }]}>Ceder mascota</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.optionItem}
                onPress={handleArchivePet}
                disabled={archiving || unlinking}
              >
                {archiving ? (
                  <ActivityIndicator size="small" color="#8E8E93" />
                ) : (
                  <Ionicons name="archive-outline" size={22} color="#8E8E93" />
                )}
                <Text style={styles.optionText}>
                  {archiving ? 'Archivando...' : 'Archivar mascota'}
                </Text>
              </TouchableOpacity>

              {((isVet && !isOwner) || isCoOwner) && (
                <TouchableOpacity
                  style={[styles.optionItem, styles.optionItemDanger]}
                  onPress={handleUnlinkPet}
                  disabled={archiving || unlinking}
                >
                  {unlinking ? (
                    <ActivityIndicator size="small" color="#FF3B30" />
                  ) : (
                    <Ionicons name="link-outline" size={22} color="#FF3B30" />
                  )}
                  <Text style={styles.optionTextDanger}>
                    {unlinking ? 'Desvinculando...' : 'Desvincular mascota'}
                  </Text>
                </TouchableOpacity>
              )}

              <View style={styles.optionSeparator} />

              <TouchableOpacity
                style={styles.optionItem}
                onPress={() => setShowOptionsMenu(false)}
              >
                <Ionicons name="close-outline" size={22} color="#8E8E93" />
                <Text style={styles.optionText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  listContent: {
    padding: 8,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardContainer: {
    width: cardWidth,
    height: 240,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  cardBackground: {
    width: '100%',
    height: '100%',
  },
  cardBackgroundImage: {
    borderRadius: 8,
  },
  gradient: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  cardContent: {
    padding: 16,
  },
  petName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  petDetails: {
    fontSize: 13,
    color: '#fff',
    marginBottom: 4,
  },
  ownerText: {
    fontSize: 12,
    color: '#fff',
    marginBottom: 8,
    opacity: 0.9,
  },
  exploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  exploreButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 100,
    width: width - 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
  },
  archivedButton: {
    position: 'absolute',
    left: 20, // Changed from right to left to avoid overlap with FAB
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  archivedCard: {
    opacity: 0.5,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20, // Ajustado para que no choque con el botón de archivados si ambos están visibles, aunque el de archivados podría moverse
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
    zIndex: 100,
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    zIndex: 10,
    paddingTop: 8,
    paddingRight: 8,
    alignItems: 'flex-end',
  },
  optionsButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  optionsMenu: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  optionItemDanger: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  optionText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  optionTextDanger: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '500',
  },
  optionSeparator: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: 8,
  },
  // Estilos para la card de drafts pendientes
  draftsCardContainer: {
    width: width - 16,
    marginHorizontal: 8,
    marginBottom: 16,
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#FFB900',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  draftsCardGradient: {
    padding: 20,
  },
  draftsCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  draftsIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  draftsTextContainer: {
    flex: 1,
  },
  draftsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  draftsCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 4,
  },
  draftsSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
});

export default PetsListScreen;
