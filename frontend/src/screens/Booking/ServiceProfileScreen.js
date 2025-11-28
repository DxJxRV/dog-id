import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components';
import { getImageUrl } from '../../utils/imageHelper';
import { userAPI } from '../../services/api';

const ServiceProfileScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { service } = route.params;

  const isVet = service.type === 'VET';
  const [isFavorite, setIsFavorite] = useState(false);
  const [loadingFav, setLoadingFav] = useState(true);

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
    } finally {
      setLoadingFav(false);
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

  // Configurar el botón de corazón en el header
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={toggleFavorite} style={{ marginRight: 16 }}>
          <Ionicons 
            name={isFavorite ? "heart" : "heart-outline"} 
            size={28} 
            color={isFavorite ? "#FF3B30" : "#007AFF"} 
          />
        </TouchableOpacity>
      ),
    });
  }, [navigation, isFavorite]);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        {service.image ? (
          <Image source={{ uri: getImageUrl(service.image) }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.placeholder]}>
            <Ionicons name={isVet ? 'person' : 'medkit'} size={60} color="#FFF" />
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{service.title}</Text>
        <Text style={styles.subtitle}>{service.subtitle}</Text>
        
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={20} color="#666" />
            <Text style={styles.detailText}>{service.details || 'Sin información adicional'}</Text>
          </View>
          {isVet && (
             <View style={styles.detailRow}>
                <Ionicons name="medical-outline" size={20} color="#666" />
                <Text style={styles.detailText}>Especialista Certificado</Text>
             </View>
          )}
        </View>

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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { height: 200, backgroundColor: '#E8F4FD', justifyContent: 'center', alignItems: 'center' },
  image: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, borderColor: '#FFF' },
  placeholder: { backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20, alignItems: 'center', marginTop: -40 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#666', marginTop: 5, textAlign: 'center' },
  detailsContainer: { width: '100%', marginTop: 30, paddingHorizontal: 10 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  detailText: { marginLeft: 10, fontSize: 16, color: '#444' },
  bookButton: { marginTop: 40, width: '100%' }
});

export default ServiceProfileScreen;