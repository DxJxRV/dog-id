import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, TextInput, ActivityIndicator, Modal, SafeAreaView, RefreshControl, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { searchAPI, userAPI } from '../../services/api';
import { getImageUrl } from '../../utils/imageHelper';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const BookingHubScreen = () => {
  const navigation = useNavigation();
  
  // Data State
  const [myVets, setMyVets] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const response = await userAPI.getBookingHome();
      setMyVets(response.data.myVets);
      setFavorites(response.data.favorites);
      setAppointments(response.data.appointments);
    } catch (error) {
      console.error('Error fetching booking data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  // --- Search Logic ---
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.length >= 2) {
        handleSearch(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSearch = async (query) => {
    setSearching(true);
    try {
      const response = await searchAPI.globalSearch(query);
      setSearchResults(response.data.results);
    } catch (error) {
      console.error('Global search error:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleResultPress = (item) => {
    setShowSearchModal(false);
    setSearchQuery('');
    setSearchResults([]);
    navigation.navigate('ServiceProfile', { service: item });
  };

  // --- Render Items ---

  const renderVetItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.vetCard}
      onPress={() => navigation.navigate('RequestAppointment', { vetId: item.id, vetName: item.name })}
    >
      <View style={styles.vetAvatar}>
        {item.image ? (
            <Image source={{ uri: getImageUrl(item.image) }} style={styles.avatarImage} />
        ) : (
            <Text style={styles.vetInitials}>{item.name.charAt(0)}</Text>
        )}
      </View>
      <Text style={styles.vetName} numberOfLines={1}>{item.name}</Text>
      <Text style={styles.clinicName} numberOfLines={1}>{item.clinic}</Text>
    </TouchableOpacity>
  );

  const renderFavoriteItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.favCard}
      onPress={() => navigation.navigate('ServiceProfile', { service: { ...item, title: item.name } })}
    >
      {item.image ? (
          <Image source={{ uri: getImageUrl(item.image) }} style={styles.favImage} />
      ) : (
          <View style={[styles.favImage, styles.placeholderBg]}>
              <Ionicons name={item.type === 'VET' ? 'person' : 'medkit'} size={24} color="#FFF" />
          </View>
      )}
      <View style={styles.favInfo}>
          <Text style={styles.favName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.favSubtitle} numberOfLines={1}>{item.subtitle}</Text>
      </View>
      <Ionicons name="heart" size={16} color="#FF3B30" style={styles.favIcon} />
    </TouchableOpacity>
  );

  const renderAppointmentItem = ({ item }) => (
      <View style={styles.apptCard}>
          <View style={styles.apptDateBox}>
              <Text style={styles.apptDay}>{format(parseISO(item.date), 'dd')}</Text>
              <Text style={styles.apptMonth}>{format(parseISO(item.date), 'MMM', { locale: es })}</Text>
          </View>
          <View style={styles.apptInfo}>
              <Text style={styles.apptProvider}>{item.providerName}</Text>
              <Text style={styles.apptTime}>{format(parseISO(item.date), 'EEEE, HH:mm', { locale: es })} • {item.petName}</Text>
              <Text style={[styles.apptStatus, styles[`status${item.status}`]]}>
                  {item.status === 'PENDING_APPROVAL' ? 'Pendiente de aprobación' : item.status}
              </Text>
          </View>
      </View>
  );

  const renderSearchResult = ({ item }) => (
    <TouchableOpacity style={styles.resultItem} onPress={() => handleResultPress(item)}>
      {item.image ? (
        <Image source={{ uri: getImageUrl(item.image) }} style={styles.resultImage} />
      ) : (
        <View style={[styles.resultImage, styles.resultPlaceholder]}>
          <Ionicons name={item.type === 'VET' ? 'person' : 'medkit'} size={20} color="#fff" />
        </View>
      )}
      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle}>{item.title}</Text>
        <Text style={styles.resultSubtitle}>{item.subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#CCC" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
            <Text style={styles.title}>Agendar Cita</Text>
            <Text style={styles.subtitle}>Encuentra el mejor cuidado para tu mascota</Text>
        </View>

        {/* Search Bar Trigger */}
        <TouchableOpacity style={styles.searchBar} onPress={() => setShowSearchModal(true)}>
            <Ionicons name="search" size={20} color="#666" />
            <Text style={styles.searchText}>Buscar clínicas o veterinarios...</Text>
        </TouchableOpacity>

        {/* Upcoming Appointments Section */}
        {appointments.length > 0 && (
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Próximas Citas</Text>
                </View>
                <FlatList
                    data={appointments}
                    renderItem={renderAppointmentItem}
                    keyExtractor={item => item.id}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                />
            </View>
        )}

        {/* My Vets Section */}
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mis Especialistas</Text>
            {myVets.length > 0 ? (
                <FlatList
                data={myVets}
                renderItem={renderVetItem}
                keyExtractor={item => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                />
            ) : (
                <Text style={styles.emptyText}>Aún no tienes veterinarios vinculados.</Text>
            )}
        </View>

        {/* Favorites Section */}
        {favorites.length > 0 && (
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Favoritos</Text>
                <FlatList
                    data={favorites}
                    renderItem={renderFavoriteItem}
                    keyExtractor={item => item.id}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                />
            </View>
        )}

        <View style={{height: 20}} />
      </ScrollView>

      {/* Search Modal */}
      <Modal visible={showSearchModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalSearchBar}>
              <Ionicons name="search" size={20} color="#666" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Busca veterinarios o clínicas..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
                placeholderTextColor="#999"
              />
              {searching && <ActivityIndicator size="small" color="#007AFF" />}
            </View>
            <TouchableOpacity onPress={() => setShowSearchModal(false)}>
              <Text style={styles.cancelButton}>Cancelar</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={searchResults}
            renderItem={renderSearchResult}
            keyExtractor={(item, index) => item.id + index}
            contentContainerStyle={styles.resultsList}
            ListEmptyComponent={
              searchQuery.length > 2 && !searching ? (
                <View style={styles.emptyResultContainer}>
                    <Text style={styles.emptyResultText}>No se encontraron resultados</Text>
                </View>
              ) : null
            }
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9' },
  header: { marginBottom: 20, marginTop: 20, paddingHorizontal: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#333' },
  subtitle: { fontSize: 16, color: '#666', marginTop: 5 },
  
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 14, borderRadius: 16, marginHorizontal: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  searchText: { marginLeft: 10, color: '#999', fontSize: 16 },
  
  section: { marginBottom: 25 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginLeft: 20, marginBottom: 15 },
  listContent: { paddingLeft: 20, paddingRight: 10 },
  
  // Vet Card
  vetCard: { backgroundColor: '#FFF', padding: 15, borderRadius: 16, marginRight: 12, alignItems: 'center', width: 130, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  vetAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#E8F4FD', justifyContent: 'center', alignItems: 'center', marginBottom: 10, overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  vetInitials: { fontSize: 24, color: '#007AFF', fontWeight: 'bold' },
  vetName: { fontSize: 14, fontWeight: '600', color: '#333', textAlign: 'center', marginBottom: 2 },
  clinicName: { fontSize: 12, color: '#888', textAlign: 'center' },
  
  // Favorite Card
  favCard: { backgroundColor: '#FFF', borderRadius: 12, marginRight: 12, width: 200, flexDirection: 'row', padding: 10, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  favImage: { width: 48, height: 48, borderRadius: 24, marginRight: 10 },
  placeholderBg: { backgroundColor: '#FF9500', justifyContent: 'center', alignItems: 'center' },
  favInfo: { flex: 1 },
  favName: { fontSize: 14, fontWeight: '600', color: '#333' },
  favSubtitle: { fontSize: 12, color: '#666' },
  favIcon: { marginLeft: 5 },

  // Appointment Card
  apptCard: { backgroundColor: '#FFF', borderRadius: 16, marginRight: 12, width: 280, flexDirection: 'row', padding: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  apptDateBox: { backgroundColor: '#F0F8FF', borderRadius: 12, padding: 8, alignItems: 'center', justifyContent: 'center', width: 50, height: 50, marginRight: 12 },
  apptDay: { fontSize: 18, fontWeight: 'bold', color: '#007AFF' },
  apptMonth: { fontSize: 12, color: '#007AFF', textTransform: 'uppercase' },
  apptInfo: { flex: 1 },
  apptProvider: { fontSize: 15, fontWeight: '600', color: '#333' },
  apptTime: { fontSize: 13, color: '#666', marginTop: 2 },
  apptStatus: { fontSize: 11, marginTop: 4, fontWeight: '500' },
  statusPENDING_APPROVAL: { color: '#FF9500' },
  statusCONFIRMED: { color: '#4CAF50' },

  emptyText: { marginLeft: 20, color: '#999', fontStyle: 'italic' },

  // Modal Styles
  modalContainer: { flex: 1, backgroundColor: '#FFF' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  modalSearchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F2F7', borderRadius: 10, padding: 8, marginRight: 12 },
  modalSearchInput: { flex: 1, fontSize: 16, color: '#333' },
  cancelButton: { color: '#007AFF', fontSize: 16 },
  resultsList: { padding: 16 },
  resultItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  resultImage: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  resultPlaceholder: { backgroundColor: '#CCC', justifyContent: 'center', alignItems: 'center' },
  resultInfo: { flex: 1 },
  resultTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  resultSubtitle: { fontSize: 14, color: '#666', marginTop: 2 },
  emptyResultContainer: { alignItems: 'center', marginTop: 40 },
  emptyResultText: { color: '#999', fontSize: 16 }
});

export default BookingHubScreen;
