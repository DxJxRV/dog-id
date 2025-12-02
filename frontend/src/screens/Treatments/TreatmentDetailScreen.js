import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Linking,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { prescriptionAPI } from '../../services/api';
import { showToast } from '../../utils/toast';
import { Loading } from '../../components';
import { format, parseISO, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { getImageUrl } from '../../utils/imageHelper';
import { API_URL } from '../../utils/config';

const TreatmentDetailScreen = ({ route, navigation }) => {
  const { petId, petName } = route.params;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [treatmentData, setTreatmentData] = useState(null);

  useEffect(() => {
    loadTreatmentDetail();
  }, []);

  const loadTreatmentDetail = async () => {
    try {
      setLoading(true);

      // Obtener dashboard completo y filtrar por petId
      const response = await prescriptionAPI.getOwnerDashboard();
      const dashboard = response.data;

      // Encontrar el tratamiento de esta mascota
      const petTreatment = dashboard.activeTreatments.find(
        t => t.petId === petId
      );

      setTreatmentData(petTreatment || null);

    } catch (error) {
      console.error('Error loading treatment detail:', error);
      showToast.error('Error al cargar los detalles del tratamiento');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTreatmentDetail();
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

  if (loading) {
    return <Loading />;
  }

  if (!treatmentData) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="medical-outline" size={64} color="#C7C7CC" />
        <Text style={styles.emptyTitle}>Sin tratamientos activos</Text>
        <Text style={styles.emptyText}>
          {petName} no tiene tratamientos activos en este momento
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* HEADER DE MASCOTA */}
      <View style={styles.petHeader}>
        {treatmentData.petImage ? (
          <Image
            source={{ uri: getImageUrl(treatmentData.petImage) }}
            style={styles.petAvatar}
          />
        ) : (
          <View style={[styles.petAvatar, styles.petAvatarPlaceholder]}>
            <Ionicons name="paw" size={32} color="#FFFFFF" />
          </View>
        )}
        <View style={styles.petInfo}>
          <Text style={styles.petName}>{treatmentData.petName}</Text>
          <Text style={styles.petMeta}>
            {treatmentData.medications.length} {treatmentData.medications.length === 1 ? 'medicamento' : 'medicamentos'} activos
          </Text>
        </View>
      </View>

      {/* LISTA DE PRESCRIPCIONES */}
      {treatmentData.prescriptions.map((prescription, index) => {
        // Calculate days remaining based on longest treatment duration
        let daysRemaining = null;
        if (prescription.finalizedAt && prescription.items.length > 0) {
          const startDate = parseISO(prescription.finalizedAt);
          const longestDuration = Math.max(...prescription.items.map(item => {
            if (!item.duration) return 0;
            const daysMatch = item.duration.match(/(\d+)\s*d[ií]as?/i);
            return daysMatch ? parseInt(daysMatch[1]) : 0;
          }));

          if (longestDuration > 0) {
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + longestDuration);
            daysRemaining = Math.max(0, differenceInDays(endDate, new Date()));
          }
        }

        return (
          <View key={prescription.id} style={styles.prescriptionCard}>
            {/* Header */}
            <View style={styles.prescriptionHeader}>
              <View style={styles.prescriptionIcon}>
                <Ionicons name="document-text" size={20} color="#007AFF" />
              </View>
              <View style={styles.prescriptionHeaderInfo}>
                <Text style={styles.prescriptionTitle}>
                  Prescripción {treatmentData.prescriptions.length > 1 ? `#${index + 1}` : ''}
                </Text>
                {daysRemaining !== null && (
                  <Text style={styles.prescriptionDays}>
                    {daysRemaining} {daysRemaining === 1 ? 'día' : 'días'} restantes
                  </Text>
                )}
              </View>
            </View>

            {/* Diagnóstico */}
            {prescription.diagnosis && (
              <View style={styles.diagnosisSection}>
                <Text style={styles.diagnosisLabel}>Diagnóstico:</Text>
                <Text style={styles.diagnosisText}>{prescription.diagnosis}</Text>
              </View>
            )}

            {/* Medicamentos */}
            <View style={styles.medicationsSection}>
              <Text style={styles.sectionLabel}>Medicamentos:</Text>
              {prescription.items.map((item, idx) => (
                <View key={item.id} style={styles.medicationItem}>
                  <View style={styles.medicationNumber}>
                    <Text style={styles.medicationNumberText}>{idx + 1}</Text>
                  </View>
                  <View style={styles.medicationDetails}>
                    <Text style={styles.medicationName}>{item.medication}</Text>
                    {item.dosage && (
                      <Text style={styles.medicationDosage}>
                        <Ionicons name="time-outline" size={12} color="#8E8E93" /> {item.dosage}
                      </Text>
                    )}
                    {item.instructions && (
                      <Text style={styles.medicationIndications}>{item.instructions}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>

            {/* Botón Ver PDF */}
            <TouchableOpacity
              style={styles.viewPdfButton}
              onPress={() => openPrescriptionPDF(prescription.publicToken)}
            >
              <Ionicons name="document-text-outline" size={18} color="#FFFFFF" />
              <Text style={styles.viewPdfButtonText}>Ver Receta Original</Text>
            </TouchableOpacity>
          </View>
        );
      })}

      {/* RESUMEN DE MEDICAMENTOS ÚNICOS */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Resumen de Medicamentos</Text>
        <View style={styles.medicationChipsContainer}>
          {treatmentData.medications.map((med, index) => (
            <View key={index} style={styles.medicationChip}>
              <Ionicons name="medical" size={14} color="#007AFF" />
              <Text style={styles.medicationChipText}>{med}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  // Pet Header
  petHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  petAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  petAvatarPlaceholder: {
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  petInfo: {
    flex: 1,
  },
  petName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  petMeta: {
    fontSize: 14,
    color: '#8E8E93',
  },
  // Prescription Card
  prescriptionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  prescriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  prescriptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  prescriptionHeaderInfo: {
    flex: 1,
  },
  prescriptionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
  },
  prescriptionDays: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600',
  },
  // Diagnosis
  diagnosisSection: {
    marginBottom: 16,
  },
  diagnosisLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  diagnosisText: {
    fontSize: 15,
    color: '#000',
    lineHeight: 22,
  },
  // Medications
  medicationsSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  medicationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  medicationNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  medicationNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  medicationDetails: {
    flex: 1,
  },
  medicationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  medicationDosage: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 4,
  },
  medicationIndications: {
    fontSize: 13,
    color: '#000',
    lineHeight: 18,
  },
  // View PDF Button
  viewPdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  viewPdfButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Summary Card
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  medicationChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  medicationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  medicationChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  // Empty State
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

export default TreatmentDetailScreen;
