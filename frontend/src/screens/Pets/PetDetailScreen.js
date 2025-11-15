import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { petsAPI } from '../../services/api';
import { Loading, Button, PetLinkCodeModal, ErrorNetwork, Timeline } from '../../components';
import { API_URL } from '../../utils/config';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { isNetworkError } from '../../utils/networkUtils';
import { showToast } from '../../utils/toast';

const PetDetailScreen = ({ route, navigation }) => {
  const { petId } = route.params;
  const { user, userType } = useAuth();
  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkCode, setLinkCode] = useState(null);
  const [isLinked, setIsLinked] = useState(false);
  const [error, setError] = useState(null);
  const [archiving, setArchiving] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);

  const isVet = userType === 'vet';

  const fetchPetDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await petsAPI.getById(petId);
      setPet(response.data.pet);
    } catch (err) {
      if (isNetworkError(err)) {
        setError(err);
      } else {
        showToast.error('No se pudieron cargar los detalles de la mascota');
        setTimeout(() => navigation.goBack(), 500);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPetDetail();
  }, [petId]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchPetDetail();
    });
    return unsubscribe;
  }, [navigation]);

  // Configurar el botón de menú en el header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => setShowOptionsMenu(true)}
          style={{ marginRight: 15 }}
        >
          <Ionicons name="ellipsis-vertical" size={24} color="#007AFF" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const handleShowLinkCode = async () => {
    try {
      const response = await petsAPI.getLinkCode(petId);
      setLinkCode(response.data.linkCode);
      setShowLinkModal(true);
    } catch (err) {
      if (isNetworkError(err)) {
        showToast.networkError();
      } else {
        showToast.error('No se pudo obtener el código de vinculación');
      }
    }
  };

  const handleUnlinkPet = () => {
    setShowOptionsMenu(false);
    Alert.alert(
      'Desvincular mascota',
      '¿Estás seguro de que deseas desvincular esta mascota?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desvincular',
          style: 'destructive',
          onPress: async () => {
            try {
              setUnlinking(true);
              await petsAPI.unlinkPet(petId);
              showToast.success('Mascota desvinculada correctamente');
              setTimeout(() => navigation.goBack(), 500);
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

  const handleArchivePet = () => {
    setShowOptionsMenu(false);
    const isArchived = pet?.isArchived || pet?.archived;

    Alert.alert(
      isArchived ? 'Desarchivar mascota' : 'Archivar mascota',
      isArchived
        ? `¿Deseas desarchivar a ${pet.nombre}?`
        : '¿Deseas archivar esta mascota? Podrás verla en la sección de archivados.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: isArchived ? 'Desarchivar' : 'Archivar',
          onPress: async () => {
            try {
              setArchiving(true);
              await petsAPI.archive(petId, !isArchived);
              showToast.success(
                isArchived
                  ? 'Mascota desarchivada correctamente'
                  : 'Mascota archivada correctamente'
              );
              if (!isArchived) {
                setTimeout(() => navigation.goBack(), 500);
              } else {
                fetchPetDetail();
              }
            } catch (err) {
              if (isNetworkError(err)) {
                showToast.networkError();
              } else {
                showToast.error(
                  isArchived
                    ? 'No se pudo desarchivar la mascota'
                    : 'No se pudo archivar la mascota'
                );
              }
            } finally {
              setArchiving(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return <ErrorNetwork onRetry={fetchPetDetail} />;
  }

  const isOwner = pet.user && user && pet.user.id === user.id;
  const isArchived = pet?.isArchived || pet?.archived;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        {pet.fotoUrl ? (
          <Image
            source={{ uri: `${API_URL}${pet.fotoUrl}` }}
            style={styles.petImage}
          />
        ) : (
          <View style={styles.petImagePlaceholder}>
            <Text style={styles.petImagePlaceholderText}>
              {pet.nombre.charAt(0)}
            </Text>
          </View>
        )}
        <Text style={styles.petName}>{pet.nombre}</Text>
        <Text style={styles.petDetails}>
          {pet.especie} • {pet.raza || 'Mixed'}
        </Text>
        {pet.fechaNacimiento && (
          <Text style={styles.petBirthdate}>
            Born: {format(new Date(pet.fechaNacimiento), 'MMM dd, yyyy')}
          </Text>
        )}

        {isOwner && (
          <TouchableOpacity
            style={styles.linkCodeButton}
            onPress={handleShowLinkCode}
          >
            <Ionicons name="qr-code-outline" size={20} color="#007AFF" />
            <Text style={styles.linkCodeButtonText}>Código de vinculación</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Banner de mascota archivada */}
      {isArchived && (
        <View style={styles.archivedBanner}>
          <View style={styles.archivedInfo}>
            <Ionicons name="archive" size={20} color="#E65100" />
            <Text style={styles.archivedText}>Esta mascota está archivada</Text>
          </View>
          <TouchableOpacity
            style={styles.unarchiveButton}
            onPress={handleArchivePet}
            disabled={archiving}
          >
            {archiving ? (
              <ActivityIndicator size="small" color="#E65100" />
            ) : (
              <Ionicons name="arrow-undo-outline" size={24} color="#E65100" />
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Historial Médico */}
      <View style={styles.section}>
        <View style={styles.historyHeader}>
          <Text style={styles.sectionTitle}>
            Historial Médico ({(pet.vaccines?.length || 0) + (pet.procedures?.length || 0)})
          </Text>
        </View>

        <Timeline
          vaccines={pet.vaccines || []}
          procedures={pet.procedures || []}
        />

        <View style={styles.actionButtons}>
          <Button
            title="Agregar Vacuna"
            onPress={() => navigation.navigate('AddVaccine', { petId })}
            variant="outline"
            style={styles.actionButton}
          />
          <Button
            title="Agregar Procedimiento"
            onPress={() => navigation.navigate('AddProcedure', { petId })}
            variant="outline"
            style={styles.actionButton}
          />
        </View>
      </View>

      {/* Modal de código de vinculación */}
      <PetLinkCodeModal
        visible={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        linkCode={linkCode}
        petName={pet.nombre}
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
                  onPress={() => {
                    setShowOptionsMenu(false);
                    navigation.navigate('EditPet', { pet });
                  }}
                >
                  <Ionicons name="create-outline" size={22} color="#666" />
                  <Text style={styles.optionText}>Editar mascota</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.optionItem}
                onPress={handleArchivePet}
                disabled={archiving || unlinking}
              >
                {archiving ? (
                  <ActivityIndicator size="small" color="#666" />
                ) : (
                  <Ionicons
                    name={isArchived ? "arrow-undo-outline" : "archive-outline"}
                    size={22}
                    color="#666"
                  />
                )}
                <Text style={styles.optionText}>
                  {archiving
                    ? (isArchived ? 'Desarchivando...' : 'Archivando...')
                    : (isArchived ? 'Desarchivar mascota' : 'Archivar mascota')
                  }
                </Text>
              </TouchableOpacity>

              {isVet && !isOwner && (
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
                <Ionicons name="close-outline" size={22} color="#666" />
                <Text style={styles.optionText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  petImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  petImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  petImagePlaceholderText: {
    color: '#fff',
    fontSize: 48,
    fontWeight: 'bold',
  },
  petName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  petDetails: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  petBirthdate: {
    fontSize: 14,
    color: '#999',
  },
  linkCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F8FF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 16,
    gap: 8,
  },
  linkCodeButtonText: {
    color: '#007AFF',
    fontSize: 15,
    fontWeight: '600',
  },
  archivedBanner: {
    backgroundColor: '#FFF3E0',
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#FFE0B2',
  },
  archivedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  archivedText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#E65100',
  },
  unarchiveButton: {
    padding: 8,
  },
  section: {
    padding: 16,
  },
  historyHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  actionButton: {
    flex: 1,
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
    borderTopColor: '#f0f0f0',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
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
});

export default PetDetailScreen;
