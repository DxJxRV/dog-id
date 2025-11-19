import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { friendshipsAPI } from '../../services/api';
import { Loading, ErrorNetwork } from '../../components';
import { API_URL } from '../../utils/config';
import { isNetworkError } from '../../utils/networkUtils';
import { showToast } from '../../utils/toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const FriendsListScreen = ({ navigation, embedded = false, onPendingCountChange }) => {
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const [processingRequestId, setProcessingRequestId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [friendsResponse, pendingResponse] = await Promise.all([
        friendshipsAPI.getFriends(),
        friendshipsAPI.getPending(),
      ]);
      setFriends(friendsResponse.data.friends);
      setPendingRequests(pendingResponse.data.requests);
    } catch (err) {
      if (isNetworkError(err)) {
        setError(err);
      } else {
        showToast.error('No se pudieron cargar tus amigos');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!embedded) {
      const unsubscribe = navigation.addListener('focus', () => {
        fetchData();
      });
      return unsubscribe;
    }
  }, [navigation, embedded]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const handleRemoveFriend = (friendship) => {
    Alert.alert(
      'Eliminar amigo',
      `¿Estás seguro de que deseas eliminar a ${friendship.user.nombre} de tus amigos?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setRemovingId(friendship.id);
              await friendshipsAPI.remove(friendship.id);
              showToast.success('Amigo eliminado correctamente');
              fetchData();
            } catch (err) {
              if (isNetworkError(err)) {
                showToast.networkError();
              } else {
                showToast.error('No se pudo eliminar el amigo');
              }
            } finally {
              setRemovingId(null);
            }
          },
        },
      ]
    );
  };

  const handleAcceptRequest = async (request) => {
    try {
      setProcessingRequestId(request.id);
      await friendshipsAPI.accept(request.id);
      showToast.success(`Ahora eres amigo de ${request.user.nombre}`);
      fetchData();
      // Notificar al componente padre para actualizar el contador de badges
      if (onPendingCountChange) {
        onPendingCountChange();
      }
    } catch (err) {
      if (isNetworkError(err)) {
        showToast.networkError();
      } else {
        showToast.error('No se pudo aceptar la solicitud');
      }
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleRejectRequest = async (request) => {
    try {
      setProcessingRequestId(request.id);
      await friendshipsAPI.reject(request.id);
      showToast.success('Solicitud rechazada');
      fetchData();
      // Notificar al componente padre para actualizar el contador de badges
      if (onPendingCountChange) {
        onPendingCountChange();
      }
    } catch (err) {
      if (isNetworkError(err)) {
        showToast.networkError();
      } else {
        showToast.error('No se pudo rechazar la solicitud');
      }
    } finally {
      setProcessingRequestId(null);
    }
  };

  const filteredFriends = friends.filter(friend => {
    const query = searchQuery.toLowerCase();
    return friend.user.nombre.toLowerCase().includes(query);
  });

  const filteredRequests = pendingRequests.filter(request => {
    const query = searchQuery.toLowerCase();
    return request.user.nombre.toLowerCase().includes(query);
  });

  const renderFriendItem = ({ item }) => {
    const isRemoving = removingId === item.id;

    return (
      <View style={styles.friendCard}>
        <View style={styles.friendCardContent}>
          {item.user.fotoUrl ? (
            <Image
              source={{ uri: `${API_URL}${item.user.fotoUrl}` }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={32} color="#fff" />
            </View>
          )}
          <View style={styles.friendDetails}>
            <Text style={styles.friendName}>{item.user.nombre}</Text>
            <View style={styles.friendMetaRow}>
              <Ionicons name="time-outline" size={14} color="#8E8E93" />
              <Text style={styles.friendSince}>
                {format(new Date(item.friendsSince), 'd MMM yyyy', { locale: es })}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => handleRemoveFriend(item)}
            disabled={isRemoving}
          >
            {isRemoving ? (
              <ActivityIndicator size="small" color="#FF3B30" />
            ) : (
              <Ionicons name="trash-outline" size={22} color="#FF3B30" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderPendingRequest = ({ item }) => {
    const isProcessing = processingRequestId === item.id;

    return (
      <View style={styles.requestCard}>
        <View style={styles.requestCardContent}>
          {item.user.fotoUrl ? (
            <Image
              source={{ uri: `${API_URL}${item.user.fotoUrl}` }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={32} color="#fff" />
            </View>
          )}
          <View style={styles.friendDetails}>
            <Text style={styles.friendName}>{item.user.nombre}</Text>
            <View style={styles.friendMetaRow}>
              <Ionicons name="calendar-outline" size={14} color="#8E8E93" />
              <Text style={styles.requestDate}>
                {format(new Date(item.createdAt), 'd MMM yyyy', { locale: es })}
              </Text>
            </View>
          </View>
          <View style={styles.requestActions}>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={() => handleAcceptRequest(item)}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="checkmark" size={22} color="#fff" />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.rejectButton}
              onPress={() => handleRejectRequest(item)}
              disabled={isProcessing}
            >
              <Ionicons name="close" size={22} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return <ErrorNetwork onRetry={fetchData} />;
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
          <Text style={styles.headerTitle}>Mis Amigos</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddFriend')}
          >
            <Ionicons name="person-add-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar amigos..."
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
        data={[]}
        renderItem={null}
        ListHeaderComponent={
          <>
            {filteredRequests.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Solicitudes pendientes ({filteredRequests.length})
                </Text>
                {filteredRequests.map((request) => (
                  <View key={request.id}>
                    {renderPendingRequest({ item: request })}
                  </View>
                ))}
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Amigos ({filteredFriends.length})
              </Text>
              {filteredFriends.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="people-outline" size={60} color="#C7C7CC" />
                  <Text style={styles.emptyText}>
                    {searchQuery ? 'No se encontraron resultados' : 'No tienes amigos aún'}
                  </Text>
                  <Text style={styles.emptySubtext}>
                    {searchQuery ? 'Intenta con otro término de búsqueda' : 'Agrega amigos para compartir mascotas'}
                  </Text>
                  {!searchQuery && (
                    <TouchableOpacity
                      style={styles.addFriendButton}
                      onPress={() => navigation.navigate('AddFriend')}
                    >
                      <Ionicons name="person-add-outline" size={20} color="#fff" />
                      <Text style={styles.addFriendButtonText}>Agregar amigos</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                filteredFriends.map((friend) => (
                  <View key={friend.id}>
                    {renderFriendItem({ item: friend })}
                  </View>
                ))
              )}
            </View>
          </>
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
  addButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 0,
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
  section: {
    paddingHorizontal: 12,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  friendCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  friendCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  requestCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  friendDetails: {
    flex: 1,
  },
  friendName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  friendMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  friendSince: {
    fontSize: 13,
    color: '#8E8E93',
  },
  requestDate: {
    fontSize: 13,
    color: '#8E8E93',
  },
  removeButton: {
    padding: 8,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
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
});

export default FriendsListScreen;
