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
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { friendshipsAPI } from '../../services/api';
import { Loading, ErrorNetwork } from '../../components';
import { API_URL } from '../../utils/config';
import { isNetworkError } from '../../utils/networkUtils';
import { showToast } from '../../utils/toast';

const { width } = Dimensions.get('window');
const cardWidth = (width - 20) / 2;

const FriendsPetsScreen = ({ navigation, embedded = false, onPetsViewed }) => {
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchFriendsPets = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await friendshipsAPI.getFriendsPets();
      setPets(response.data.pets);

      // Marcar las mascotas como vistas
      try {
        await friendshipsAPI.markPetsViewed();
        // Notificar al componente padre para actualizar el badge
        if (onPetsViewed) {
          onPetsViewed();
        }
      } catch (markErr) {
        // Silently fail - this is not critical
      }
    } catch (err) {
      if (isNetworkError(err)) {
        setError(err);
      } else {
        showToast.error('No se pudieron cargar las mascotas de tus amigos');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFriendsPets();
  }, []);

  useEffect(() => {
    if (!embedded) {
      const unsubscribe = navigation.addListener('focus', () => {
        fetchFriendsPets();
      });
      return unsubscribe;
    }
  }, [navigation, embedded]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchFriendsPets();
  }, []);

  const filteredPets = pets.filter(pet => {
    const query = searchQuery.toLowerCase();
    return (
      pet.nombre.toLowerCase().includes(query) ||
      pet.especie.toLowerCase().includes(query) ||
      (pet.raza && pet.raza.toLowerCase().includes(query)) ||
      (pet.user && pet.user.nombre.toLowerCase().includes(query))
    );
  });

  const renderPetCard = ({ item }) => {
    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('PetProfile', { petId: item.id })}
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
          {/* Badge "Nuevo" */}
          {item.isNew && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>Nuevo</Text>
            </View>
          )}

          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.gradient}
          >
            <View style={styles.cardContent}>
              <Text style={styles.petName}>{item.nombre}</Text>
              <Text style={styles.petDetails}>
                {item.especie} {item.raza ? `• ${item.raza}` : ''}
              </Text>
              {item.user && (
                <View style={styles.ownerBadge}>
                  <Ionicons name="person-outline" size={12} color="#fff" />
                  <Text style={styles.ownerText}>
                    {item.user.nombre}
                  </Text>
                </View>
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
    return <ErrorNetwork onRetry={fetchFriendsPets} />;
  }

  return (
    <View style={styles.container}>
      {!embedded && (
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mascotas de Amigos</Text>
          <TouchableOpacity
            style={styles.manageFriendsButton}
            onPress={() => navigation.navigate('FriendsList')}
          >
            <Ionicons name="people-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar mascotas..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#8E8E93"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#8E8E93" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredPets}
        renderItem={renderPetCard}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="paw-outline" size={80} color="#C7C7CC" />
            <Text style={styles.emptyText}>No hay mascotas de amigos</Text>
            <Text style={styles.emptySubtext}>
              Agrega amigos para ver sus mascotas aquí
            </Text>
            <TouchableOpacity
              style={styles.addFriendButton}
              onPress={() => navigation.navigate('AddFriend')}
            >
              <Ionicons name="person-add-outline" size={20} color="#fff" />
              <Text style={styles.addFriendButtonText}>Agregar amigos</Text>
            </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  manageFriendsButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 8,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    padding: 0,
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
    marginBottom: 8,
  },
  ownerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 122, 255, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  ownerText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  exploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
    marginHorizontal: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  addFriendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addFriendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  newBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  newBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});

export default FriendsPetsScreen;
