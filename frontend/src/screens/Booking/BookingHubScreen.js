import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  TextInput, 
  ActivityIndicator, 
  Modal, 
  Dimensions,
  ScrollView,
  RefreshControl,
  TouchableWithoutFeedback
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { searchAPI, userAPI } from '../../services/api';
import { getImageUrl } from '../../utils/imageHelper';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { LinearGradient } from 'expo-linear-gradient';

const { height } = Dimensions.get('window');

const BookingHubScreen = () => {
  const navigation = useNavigation();
  
  // Main Tabs State
  const [activeTab, setActiveTab] = useState('book'); // 'book' | 'appointments'

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

  // Mock Discovery Data (For empty search state)
  const TOP_VETS_MOCK = [
    { id: '101', title: 'Dr. Simi', subtitle: 'Cardiología', image: null, type: 'VET', rating: 4.9 },
    { id: '102', title: 'Dra. Ana', subtitle: 'Dermatología', image: null, type: 'VET', rating: 4.8 },
  ];
  const FEATURED_CLINICS_MOCK = [
    { id: '201', title: 'Vet Santa Fe', subtitle: '24 Horas', image: null, type: 'CLINIC' },
    { id: '202', title: 'Pet Hospital', subtitle: 'Urgencias', image: null, type: 'CLINIC' },
  ];

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

  const renderVetCard = ({ item }) => (
    <TouchableOpacity 
      style={styles.vetCard}
      onPress={() => navigation.navigate('ServiceProfile', { service: { ...item, title: item.name, type: 'VET' } })}
      activeOpacity={0.9}
    >
      {/* Background Image */}
      {item.image ? (
          <Image source={{ uri: getImageUrl(item.image) }} style={styles.vetCardImage} />
      ) : (
          <View style={styles.vetCardPlaceholder}>
              <Ionicons name="person" size={64} color="rgba(255,255,255,0.3)" />
          </View>
      )}

      {/* Gradient Overlay & Content */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={styles.vetCardOverlay}
      >
        <Text style={styles.vetName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.vetSpecialty} numberOfLines={1}>{item.clinic}</Text>
        
        <TouchableOpacity 
          style={styles.cardActionRow}
          onPress={() => navigation.navigate('RequestAppointment', { vetId: item.id, vetName: item.name })}
        >
          <Text style={styles.cardActionText}>Agendar</Text>
          <Ionicons name="arrow-forward" size={14} color="#FFF" />
        </TouchableOpacity>
      </LinearGradient>
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
              <Ionicons name={item.type === 'VET' ? 'person' : 'medkit'} size={20} color="#FFF" />
          </View>
      )}
      <View style={styles.favInfo}>
          <Text style={styles.favName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.favSubtitle} numberOfLines={1}>{item.subtitle}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderAppointmentItem = ({ item }) => (
      <View style={styles.apptCard}>
          <View style={styles.apptLeftBorder} />
          <View style={styles.apptContent}>
            <View style={styles.apptHeader}>
              <Text style={styles.apptDay}>{format(parseISO(item.date), 'dd MMM', { locale: es })}</Text>
              <View style={[styles.statusBadge, styles[`badge${item.status}`]]}>
                <Text style={[styles.statusText, styles[`text${item.status}`]]}>
                  {item.status === 'PENDING_APPROVAL' ? 'Pendiente' : item.status}
                </Text>
              </View>
            </View>
            <Text style={styles.apptProvider}>{item.providerName}</Text>
            <Text style={styles.apptTime}>{format(parseISO(item.date), 'HH:mm')} • {item.petName}</Text>
          </View>
      </View>
  );

  const renderDiscoveryItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.discoveryCard}
      onPress={() => handleResultPress(item)}
    >
      <View style={[styles.discoveryImage, styles.placeholderBg]}>
         <Ionicons name={item.type === 'VET' ? 'person' : 'medkit'} size={24} color="#FFF" />
      </View>
      <Text style={styles.discoveryTitle} numberOfLines={1}>{item.title}</Text>
      <Text style={styles.discoverySubtitle} numberOfLines={1}>{item.subtitle}</Text>
      {item.rating && (
        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={12} color="#FFD700" />
          <Text style={styles.ratingText}>{item.rating}</Text>
        </View>
      )}
    </TouchableOpacity>
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
      {/* Top Tabs (Segmented Control) */}
      <View style={styles.topTabsContainer}>
        <View style={styles.segmentedControl}>
          <TouchableOpacity 
            style={[styles.segment, activeTab === 'book' && styles.segmentActive]}
            onPress={() => setActiveTab('book')}
          >
            <Text style={[styles.segmentText, activeTab === 'book' && styles.segmentTextActive]}>Agendar</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.segment, activeTab === 'appointments' && styles.segmentActive]}
            onPress={() => setActiveTab('appointments')}
          >
            <Text style={[styles.segmentText, activeTab === 'appointments' && styles.segmentTextActive]}>Mis Citas</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {activeTab === 'book' ? (
        <ScrollView 
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          <View style={styles.contentContainer}>
            <Text style={styles.headerTitle}>Hola,</Text>
            <Text style={styles.headerSubtitle}>¿Qué servicio buscas hoy?</Text>

            {/* Search Trigger */}
            <TouchableOpacity style={styles.searchBar} onPress={() => setShowSearchModal(true)}>
                <Ionicons name="search" size={20} color="#666" />
                <Text style={styles.searchText}>Buscar clínicas o veterinarios...</Text>
            </TouchableOpacity>

            {/* My Vets Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Mis Especialistas</Text>
                {myVets.length > 0 ? (
                    <FlatList
                      data={myVets}
                      renderItem={renderVetCard}
                      keyExtractor={item => item.id}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.horizontalList}
                    />
                ) : (
                    <View style={styles.emptyStateBox}>
                      <Text style={styles.emptyStateText}>Aún no tienes veterinarios recientes.</Text>
                    </View>
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
                        contentContainerStyle={styles.horizontalList}
                    />
                </View>
            )}
          </View>
        </ScrollView>
      ) : (
        /* Appointments Tab */
        <FlatList
          data={appointments}
          renderItem={renderAppointmentItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyStateContainer}>
              <Ionicons name="calendar-outline" size={64} color="#CCC" />
              <Text style={styles.emptyStateTitle}>No tienes citas próximas</Text>
              <Text style={styles.emptyStateSubtitle}>Tus citas agendadas aparecerán aquí.</Text>
            </View>
          }
        />
      )}

      {/* Search Modal (Bottom Sheet Style) */}
      <Modal visible={showSearchModal} transparent animationType="slide" onRequestClose={() => setShowSearchModal(false)}>
        <TouchableWithoutFeedback onPress={() => setShowSearchModal(false)}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
        
        <View style={styles.bottomSheet}>
          <View style={styles.modalHeader}>
            <View style={styles.dragHandle} />
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
              {searching ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : searchQuery.length > 0 ? (
                <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
                  <Ionicons name="close-circle" size={18} color="#999" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {searchQuery.length === 0 ? (
            /* Discovery State */
            <ScrollView style={styles.discoveryContainer}>
              <Text style={styles.discoveryHeader}>Veterinarios Top ⭐</Text>
              <FlatList 
                data={TOP_VETS_MOCK}
                renderItem={renderDiscoveryItem}
                keyExtractor={item => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
              />

              <Text style={[styles.discoveryHeader, { marginTop: 20 }]}>Clínicas Destacadas 🏥</Text>
              <FlatList 
                data={FEATURED_CLINICS_MOCK}
                renderItem={renderDiscoveryItem}
                keyExtractor={item => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
              />
            </ScrollView>
          ) : (
            /* Search Results */
            <FlatList
              data={searchResults}
              renderItem={renderSearchResult}
              keyExtractor={(item, index) => item.id + index}
              contentContainerStyle={styles.resultsList}
              ListEmptyComponent={
                !searching && (
                  <View style={styles.emptyResultContainer}>
                      <Text style={styles.emptyResultText}>No se encontraron resultados</Text>
                  </View>
                )
              }
            />
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9' },
  
  // Header & Tabs
  topTabsContainer: { backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  segmentedControl: { flexDirection: 'row', backgroundColor: '#F2F2F7', borderRadius: 8, padding: 2 },
  segment: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  segmentActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  segmentText: { fontSize: 14, fontWeight: '500', color: '#666' },
  segmentTextActive: { color: '#000', fontWeight: '600' },

  contentContainer: { padding: 20 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#333' },
  headerSubtitle: { fontSize: 16, color: '#666', marginBottom: 20 },

  // Search Trigger
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 14, borderRadius: 16, marginBottom: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  searchText: { marginLeft: 10, color: '#999', fontSize: 16 },

  // Sections
  section: { marginBottom: 30 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 15 },
  horizontalList: { paddingRight: 20 },
  listContent: { padding: 20 },

  // Vet Card (Redesigned like Pet Card - Image Full)
  vetCard: { 
    backgroundColor: '#fff', // Match cardContainer background
    borderRadius: 8, // Match cardContainer borderRadius
    marginRight: 16, 
    width: 160, 
    height: 210, 
    shadowColor: '#000', // Match cardContainer shadowColor
    shadowOffset: { width: 0, height: 4 }, // Match cardContainer shadowOffset
    shadowOpacity: 0.25, // Match cardContainer shadowOpacity
    shadowRadius: 8, // Match cardContainer shadowRadius
    elevation: 6, // Match cardContainer elevation
    overflow: 'hidden', 
  },
  vetCardImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  vetCardPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vetCardOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 12,
  },
  vetName: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#FFF', 
    marginBottom: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  vetSpecialty: { 
    fontSize: 13, 
    color: '#EEE', 
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardActionText: { 
    color: '#FFF', 
    fontSize: 14, 
    fontWeight: '600', 
    marginRight: 4 
  },

  // Favorite Card
  favCard: { backgroundColor: '#FFF', borderRadius: 12, marginRight: 12, padding: 10, flexDirection: 'row', alignItems: 'center', width: 200, borderWidth: 1, borderColor: '#F0F0F0' },
  favImage: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  placeholderBg: { backgroundColor: '#FF9500', justifyContent: 'center', alignItems: 'center' },
  favInfo: { flex: 1 },
  favName: { fontSize: 14, fontWeight: '600', color: '#333' },
  favSubtitle: { fontSize: 12, color: '#666' },

  // Appointment Card (Vertical List)
  apptCard: { 
    backgroundColor: '#FFF', 
    borderRadius: 16, 
    marginBottom: 16, 
    flexDirection: 'row', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 4, 
    elevation: 2,
    overflow: 'hidden'
  },
  apptLeftBorder: { width: 6, backgroundColor: '#007AFF' },
  apptContent: { flex: 1, padding: 16 },
  apptHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  apptDay: { fontSize: 14, fontWeight: '700', color: '#007AFF', textTransform: 'uppercase' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgePENDING_APPROVAL: { backgroundColor: '#FFF3E0' },
  badgeCONFIRMED: { backgroundColor: '#E8F5E9' },
  textPENDING_APPROVAL: { color: '#E65100', fontSize: 10, fontWeight: '700' },
  textCONFIRMED: { color: '#2E7D32', fontSize: 10, fontWeight: '700' },
  apptProvider: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 4 },
  apptTime: { fontSize: 14, color: '#666' },

  // Empty States
  emptyStateBox: { padding: 20, alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#DDD', borderRadius: 12 },
  emptyStateText: { color: '#999', fontStyle: 'italic' },
  emptyStateContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  emptyStateTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginTop: 10 },
  emptyStateSubtitle: { fontSize: 14, color: '#999', marginTop: 5 },

  // Bottom Sheet Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  bottomSheet: { 
    height: '90%', 
    backgroundColor: '#FFF', 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24, 
    paddingTop: 10,
    overflow: 'hidden'
  },
  dragHandle: { width: 40, height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, alignSelf: 'center', marginBottom: 10 },
  modalHeader: { paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  modalSearchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F2F7', borderRadius: 12, paddingHorizontal: 12, height: 44 },
  modalSearchInput: { flex: 1, fontSize: 16, color: '#333', marginLeft: 8 },
  
  // Discovery & Results
  discoveryContainer: { padding: 20 },
  discoveryHeader: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 15 },
  discoveryCard: { width: 140, marginRight: 15 },
  discoveryImage: { width: 140, height: 100, borderRadius: 12, marginBottom: 8 },
  discoveryTitle: { fontSize: 14, fontWeight: '600', color: '#333' },
  discoverySubtitle: { fontSize: 12, color: '#666' },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  ratingText: { fontSize: 12, color: '#666', marginLeft: 4, fontWeight: '600' },
  
  resultItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  resultImage: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  resultPlaceholder: { backgroundColor: '#CCC', justifyContent: 'center', alignItems: 'center' },
  resultInfo: { flex: 1 },
  resultTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  resultSubtitle: { fontSize: 14, color: '#666', marginTop: 2 },
  resultsList: { padding: 20 },
  emptyResultContainer: { alignItems: 'center', marginTop: 40 },
  emptyResultText: { color: '#999', fontSize: 16 },
});

export default BookingHubScreen;