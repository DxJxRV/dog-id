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
const cardWidth = (width - 48) / 2; // 16px padding + 8px gap on each side

const PetsListScreen = ({ navigation }) => {
  const { userType } = useAuth();
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasArchivedPets, setHasArchivedPets] = useState(false);
  const [error, setError] = useState(null);

  const isVet = userType === 'vet';

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
    width: width - 32,
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
    right: 20,
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
});

export default PetsListScreen;
