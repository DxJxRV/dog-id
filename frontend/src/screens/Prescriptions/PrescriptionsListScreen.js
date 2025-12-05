import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { prescriptionAPI } from '../../services/api';
import { showToast } from '../../utils/toast';
import { Loading } from '../../components';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { getImageUrl } from '../../utils/imageHelper';
import { API_URL } from '../../utils/config';

const PrescriptionsListScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [prescriptions, setPrescriptions] = useState([]);

  useEffect(() => {
    loadPrescriptions();
  }, []);

  const loadPrescriptions = async () => {
    try {
      setLoading(true);
      const response = await prescriptionAPI.getOwnerPrescriptions();
      setPrescriptions(response.data.prescriptions || []);
    } catch (error) {
      console.error('Error loading prescriptions:', error);
      showToast.error('Error al cargar las recetas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPrescriptions();
  };

  const openPrescriptionPDF = (publicToken) => {
    if (!publicToken) {
      showToast.error('No se pudo abrir la receta');
      return;
    }

    const url = `${API_URL}/public/prescription/${publicToken}`;
    Linking.openURL(url).catch(err => {
      console.error('Error opening prescription:', err);
      showToast.error('No se pudo abrir la receta');
    });
  };

  const renderPrescriptionCard = ({ item }) => {
    const pet = item.appointment?.pet;
    const vet = item.appointment?.vet;
    const createdDate = item.createdAt ? parseISO(item.createdAt) : new Date();
    const formattedDate = format(createdDate, 'd MMM yyyy', { locale: es });

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => openPrescriptionPDF(item.publicToken)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          {/* Avatar de la Mascota */}
          <View style={styles.petInfo}>
            {pet?.fotoUrl ? (
              <Image
                source={{ uri: getImageUrl(pet.fotoUrl) }}
                style={styles.petAvatar}
              />
            ) : (
              <View style={[styles.petAvatar, styles.petAvatarPlaceholder]}>
                <Ionicons name="paw" size={20} color="#FFFFFF" />
              </View>
            )}
            <View style={styles.petDetails}>
              <Text style={styles.petName}>{pet?.nombre || 'Mascota'}</Text>
              <Text style={styles.date}>{formattedDate}</Text>
            </View>
          </View>

          {/* Icono de PDF */}
          <View style={styles.pdfIcon}>
            <Ionicons name="document-text" size={24} color="#007AFF" />
          </View>
        </View>

        {/* Diagnóstico */}
        {item.diagnosis && (
          <View style={styles.diagnosisContainer}>
            <Text style={styles.diagnosisLabel}>Diagnóstico:</Text>
            <Text style={styles.diagnosisText} numberOfLines={2}>
              {item.diagnosis}
            </Text>
          </View>
        )}

        {/* Doctor */}
        <View style={styles.doctorContainer}>
          <Ionicons name="person" size={16} color="#8E8E93" />
          <Text style={styles.doctorText}>
            MVZ. {vet?.nombre || 'Veterinario'}
          </Text>
        </View>

        {/* Botón Ver PDF */}
        <TouchableOpacity
          style={styles.viewButton}
          onPress={() => openPrescriptionPDF(item.publicToken)}
        >
          <Ionicons name="eye-outline" size={18} color="#FFFFFF" />
          <Text style={styles.viewButtonText}>Ver PDF</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <Loading />;
  }

  if (prescriptions.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="document-text-outline" size={64} color="#C7C7CC" />
        <Text style={styles.emptyTitle}>Sin recetas</Text>
        <Text style={styles.emptyText}>
          No tienes recetas médicas registradas todavía
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={prescriptions}
        renderItem={renderPrescriptionCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
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
    backgroundColor: '#F9F9F9',
  },
  listContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  petInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  petAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  petAvatarPlaceholder: {
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  petDetails: {
    flex: 1,
  },
  petName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
  },
  date: {
    fontSize: 13,
    color: '#8E8E93',
  },
  pdfIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  diagnosisContainer: {
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  diagnosisLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  diagnosisText: {
    fontSize: 15,
    color: '#000',
    lineHeight: 20,
  },
  doctorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  doctorText: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 6,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  viewButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#F9F9F9',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
});

export default PrescriptionsListScreen;
