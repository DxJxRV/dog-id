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

const ArchivedPetsScreen = ({ navigation }) => {
  const { userType } = useAuth();
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

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
        Alert.alert('Error', 'Failed to load archived pets');
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
              await petsAPI.archive(petId, false);
              Alert.alert('Éxito', 'Mascota desarchivada correctamente');
              fetchArchivedPets();
            } catch (err) {
              if (isNetworkError(err)) {
                Alert.alert(
                  'Error de Conexión',
                  'No se pudo conectar al servidor. Verifica tu conexión a internet e intenta de nuevo.'
                );
              } else {
                Alert.alert('Error', 'No se pudo desarchivar la mascota');
              }
            }
          },
        },
      ]
    );
  };

  const renderPetCard = ({ item }) => {
    const chevronColor = isVet ? '#4CAF50' : '#C7C7CC';

    const isArchivedByOwner = item.isArchivedByOwner || false;

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('PetDetail', { petId: item.id })}
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
              {isVet && isArchivedByOwner && (
                <Text style={styles.archivedByOwnerText}>
                  Archivado por dueño
                </Text>
              )}
              {item.fechaNacimiento && (
                <Text style={styles.petAge}>
                  Born: {new Date(item.fechaNacimiento).toLocaleDateString()}
                </Text>
              )}
            </View>
            <TouchableOpacity
              onPress={() => handleUnarchive(item.id, item.nombre)}
              style={styles.unarchiveButton}
            >
              <Ionicons name="arrow-undo-outline" size={24} color="#007AFF" />
            </TouchableOpacity>
          </View>
        </Card>
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
  archivedByOwnerText: {
    fontSize: 12,
    color: '#FF9500',
    fontStyle: 'italic',
    marginBottom: 2,
  },
  unarchiveButton: {
    marginLeft: 8,
    padding: 8,
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
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
  },
});

export default ArchivedPetsScreen;
