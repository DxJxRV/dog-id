import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { petsAPI } from '../../services/api';
import { Loading, Card, ErrorNetwork } from '../../components';
import { API_URL } from '../../utils/config';
import { useAuth } from '../../contexts/AuthContext';
import { isNetworkError } from '../../utils/networkUtils';
import { showToast } from '../../utils/toast';

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
    // Determinar color del indicador
    const chevronColor = isVet ? '#4CAF50' : '#C7C7CC';

    const isArchivedByOwner = item.isArchivedByOwner || false;

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('PetDetail', { petId: item.id })}
        style={isArchivedByOwner && styles.archivedCard}
      >
        <Card>
          <View style={styles.petCard}>
            {item.fotoUrl ? (
              <Image
                source={{ uri: `${API_URL}${item.fotoUrl}` }}
                style={styles.petImage}
              />
            ) : (
              <View style={styles.petImagePlaceholder}>
                <Text style={styles.petImagePlaceholderText}>
                  {item.nombre.charAt(0)}
                </Text>
              </View>
            )}
            <View style={styles.petInfo}>
              <Text style={styles.petName}>{item.nombre}</Text>
              <Text style={styles.petDetails}>
                {item.especie} • {item.raza || 'Mixed'}
              </Text>
              {item.user && isVet && (
                <Text style={styles.ownerText}>
                  Dueño: {item.user.nombre}
                </Text>
              )}
              {item.fechaNacimiento && (
                <Text style={styles.petAge}>
                  Born: {new Date(item.fechaNacimiento).toLocaleDateString()}
                </Text>
              )}
            </View>
            <Ionicons
              name="chevron-forward"
              size={24}
              color={chevronColor}
              style={styles.chevron}
            />
          </View>
        </Card>
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
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No pets yet</Text>
            <Text style={styles.emptySubtext}>
              Add your first pet to get started
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
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate(isVet ? 'LinkPet' : 'AddPet')}
      >
        <Ionicons
          name={isVet ? 'link-outline' : 'add'}
          size={32}
          color="#fff"
        />
      </TouchableOpacity>
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
  petCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  petImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  petImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  petImagePlaceholderText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  petInfo: {
    flex: 1,
    marginLeft: 16,
  },
  petName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  petDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  petAge: {
    fontSize: 12,
    color: '#999',
  },
  ownerText: {
    fontSize: 13,
    color: '#007AFF',
    marginBottom: 2,
  },
  chevron: {
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 100,
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
    bottom: 90,
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
  addButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
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
