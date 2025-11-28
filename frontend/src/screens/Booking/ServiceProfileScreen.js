import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Alert, ImageBackground } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '../../components';
import { getImageUrl } from '../../utils/imageHelper';
import { userAPI } from '../../services/api';

const ServiceProfileScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { service } = route.params;

  const isVet = service.type === 'VET';
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'posts'

  useEffect(() => {
    checkFavoriteStatus();
  }, []);

  const checkFavoriteStatus = async () => {
    try {
      const params = isVet ? { vetId: service.id } : { clinicId: service.id };
      const response = await userAPI.checkFavorite(params);
      setIsFavorite(response.data.isFavorite);
    } catch (error) {
      console.error('Error checking favorite:', error);
    }
  };

  const toggleFavorite = async () => {
    try {
      const data = isVet ? { vetId: service.id } : { clinicId: service.id };
      const response = await userAPI.toggleFavorite(data);
      setIsFavorite(response.data.isFavorite);
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar favoritos');
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTransparent: true,
      headerTitle: '',
      headerTintColor: '#fff',
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity onPress={toggleFavorite} style={styles.headerBtn}>
          <Ionicons 
            name={isFavorite ? "heart" : "heart-outline"} 
            size={26} 
            color={isFavorite ? "#FF3B30" : "#FFF"} 
          />
        </TouchableOpacity>
      ),
    });
  }, [navigation, isFavorite]);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 40}}>
        {/* Header Visual */}
        <View style={styles.headerContainer}>
          {service.coverPhoto ? (
             <ImageBackground source={{ uri: getImageUrl(service.coverPhoto) }} style={styles.coverPhoto} />
          ) : (
             <LinearGradient colors={['#4c669f', '#3b5998', '#192f6a']} style={styles.coverPhoto} />
          )}
          
          <View style={styles.profileImageContainer}>
            {service.image ? (
              <Image source={{ uri: getImageUrl(service.image) }} style={styles.profileImage} />
            ) : (
              <View style={[styles.profileImage, styles.placeholderImage]}>
                <Ionicons name={isVet ? 'person' : 'medkit'} size={50} color="#FFF" />
              </View>
            )}
          </View>
        </View>

        <View style={styles.mainInfo}>
          <Text style={styles.title}>{service.title}</Text>
          <Text style={styles.subtitle}>{service.subtitle}</Text>
          <View style={styles.ratingRow}>
             <Ionicons name="star" size={16} color="#FFD700" />
             <Text style={styles.ratingText}>4.9 (120 reseñas)</Text>
             <Text style={styles.dotSeparator}>•</Text>
             <Ionicons name="heart" size={16} color="#FF3B30" />
             <Text style={styles.ratingText}>{service.likes || 0} likes</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'info' && styles.tabActive]} 
            onPress={() => setActiveTab('info')}
          >
            <Text style={[styles.tabText, activeTab === 'info' && styles.tabTextActive]}>Información</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'posts' && styles.tabActive]} 
            onPress={() => setActiveTab('posts')}
          >
            <Text style={[styles.tabText, activeTab === 'posts' && styles.tabTextActive]}>Publicaciones</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {activeTab === 'info' ? (
            <>
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Ionicons name="location" size={20} color="#666" />
                  <Text style={styles.infoText}>{service.details || 'Dirección no disponible'}</Text>
                </View>
                {isVet && (
                  <View style={styles.infoRow}>
                    <Ionicons name="ribbon" size={20} color="#666" />
                    <Text style={styles.infoText}>Cédula Profesional: {service.cedula || 'N/A'}</Text>
                  </View>
                )}
                <View style={styles.infoRow}>
                  <Ionicons name="time" size={20} color="#666" />
                  <Text style={styles.infoText}>Lun - Vie: 09:00 - 18:00</Text>
                </View>
              </View>

              <View style={styles.infoCard}>
                <Text style={styles.sectionHeader}>Biografía</Text>
                <Text style={styles.bioText}>
                  Comprometidos con el bienestar de tus mascotas. Ofrecemos servicios de alta calidad con tecnología de punta y un equipo humano excepcional.
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBg}>
                <Ionicons name="newspaper-outline" size={40} color="#999" />
              </View>
              <Text style={styles.emptyStateTitle}>Sin publicaciones recientes</Text>
              <Text style={styles.emptyStateSubtitle}>Aún no hay actualizaciones para mostrar.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <Button 
          title="Solicitar Cita"
          onPress={() => navigation.navigate('RequestAppointment', { 
            vetId: isVet ? service.id : null,
            clinicId: !isVet ? service.id : null,
            vetName: service.title 
          })}
          style={styles.bookButton}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9' },
  headerContainer: { marginBottom: 60 }, // Increased bottom margin
  coverPhoto: { width: '100%', height: 180 }, // Increased height
  headerBtn: { padding: 8, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 20, marginLeft: 16, marginRight: 16 },
  profileImageContainer: { 
    position: 'absolute', 
    bottom: -50, 
    left: '50%', 
    marginLeft: -50, 
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  profileImage: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: '#FFF' },
  placeholderImage: { backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center' },
  
  mainInfo: { alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#666', marginTop: 4, textAlign: 'center' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 },
  ratingText: { marginLeft: 5, color: '#333', fontWeight: '600', fontSize: 13 },
  dotSeparator: { marginHorizontal: 8, color: '#CCC' },

  tabsContainer: { flexDirection: 'row', backgroundColor: '#FFF', paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 15, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#007AFF' },
  tabText: { fontSize: 15, color: '#999', fontWeight: '500' },
  tabTextActive: { color: '#007AFF', fontWeight: '600' },

  content: { padding: 20 },
  infoCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  infoText: { marginLeft: 12, fontSize: 15, color: '#444', flex: 1 },
  sectionHeader: { fontSize: 17, fontWeight: '700', color: '#333', marginBottom: 10 },
  bioText: { fontSize: 15, color: '#555', lineHeight: 22 },

  emptyState: { alignItems: 'center', marginTop: 40 },
  emptyIconBg: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  emptyStateTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
  emptyStateSubtitle: { fontSize: 14, color: '#999', marginTop: 5 },

  bottomBar: { padding: 20, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#EEE' },
  bookButton: { width: '100%' }
});

export default ServiceProfileScreen;