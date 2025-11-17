import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { petsAPI } from '../../services/api';
import { Loading, ErrorNetwork } from '../../components';
import { API_URL } from '../../utils/config';
import { useAuth } from '../../contexts/AuthContext';
import { isNetworkError } from '../../utils/networkUtils';
import { showToast } from '../../utils/toast';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2;

const ArchivedPetsScreen = ({ navigation }) => {
  const { userType } = useAuth();
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [unarchivingId, setUnarchivingId] = useState(null);

  const isVet = userType === 'vet';

  const fetchArchivedPets = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await petsAPI.getArchived();
      setPets(response.data.pets);
    } catch (err) {
      if (isNetworkError(err)) {
        setError(err);
      } else {
        showToast.error('No se pudieron cargar las mascotas archivadas');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchArchivedPets();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchArchivedPets();
    });
    return unsubscribe;
  }, [navigation]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchArchivedPets();
  }, []);

  const handleUnarchive = (petId, petName) => {
    Alert.alert(
      'Desarchivar mascota',
      `¿Deseas desarchivar a ${petName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desarchivar',
          onPress: async () => {
            try {
              setUnarchivingId(petId);
              await petsAPI.archive(petId, false);
              showToast.success('Mascota desarchivada correctamente');
              fetchArchivedPets();
            } catch (err) {
              if (isNetworkError(err)) {
                showToast.networkError();
              } else {
                showToast.error('No se pudo desarchivar la mascota');
              }
            } finally {
              setUnarchivingId(null);
            }
          },
        },
      ]
    );
  };

  const renderPetCard = ({ item }) => {
    const isArchivedByOwner = item.isArchivedByOwner || false;

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('PetDetail', { petId: item.id })}
        style={styles.cardContainer}
      >
        <ImageBackground
          source={
            item.fotoUrl
              ? { uri: `${API_URL}${item.fotoUrl}` }
              : require('../../assets/adaptive-icon.png')
          }
          style={styles.cardBackground}
          imageStyle={styles.cardBackgroundImage}
        >
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
              {isVet && isArchivedByOwner && (
                <Text style={styles.archivedByOwnerText}>
                  Archivado por dueño
                </Text>
              )}
              <TouchableOpacity
                style={styles.unarchiveButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleUnarchive(item.id, item.nombre);
                }}
                disabled={unarchivingId === item.id}
              >
                {unarchivingId === item.id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="arrow-undo-outline" size={16} color="#fff" />
                    <Text style={styles.unarchiveButtonText}>Desarchivar</Text>
                  </>
                )}
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
    return <ErrorNetwork onRetry={fetchArchivedPets} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={pets}
        renderItem={renderPetCard}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="archive-outline" size={64} color="#CCC" />
            <Text style={styles.emptyText}>No hay mascotas archivadas</Text>
            <Text style={styles.emptySubtext}>
              Las mascotas archivadas aparecerán aquí
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  listContent: {
    padding: 16,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardContainer: {
    width: cardWidth,
    height: 240,
    borderRadius: 12,
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
    borderRadius: 12,
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
    marginBottom: 4,
    opacity: 0.9,
  },
  archivedByOwnerText: {
    fontSize: 11,
    color: '#FF9500',
    fontWeight: '600',
    marginBottom: 8,
  },
  unarchiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: 4,
  },
  unarchiveButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 100,
    width: width - 32,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
  },
});

export default ArchivedPetsScreen;
