import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SignaturePad, Input, Button } from '../../components';
import { consentAPI, proceduresAPI, medicalDataAPI, vaccinesAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { isNetworkError } from '../../utils/networkUtils';
import { showToast } from '../../utils/toast';

/**
 * Pantalla de Consentimiento Informado
 * Puede ser usada para procedimientos o vacunas
 */
const ConsentScreen = ({ route, navigation }) => {
  const {
    procedureId, // Si ya existe
    vaccineId,
    petId, // Para crear el procedimiento o vacuna
    petName,
    consentType = 'CIRUGIA',
    procedureData, // Datos para crear el procedimiento
    vaccineData, // Datos para crear la vacuna
    medicalData, // Datos médicos opcionales
    onConsentSigned, // Callback opcional
  } = route.params;

  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingLegalText, setLoadingLegalText] = useState(true);
  const [legalTexts, setLegalTexts] = useState({});

  // Form state
  const [signerName, setSignerName] = useState(user?.nombre || '');
  const [signerRelation, setSignerRelation] = useState('Propietario');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [signature, setSignature] = useState(null);

  // Cargar textos legales disponibles
  useEffect(() => {
    const fetchLegalTexts = async () => {
      try {
        setLoadingLegalText(true);
        const response = await consentAPI.getLegalTexts();
        setLegalTexts(response.data.legalTexts);
      } catch (err) {
        console.error('Error loading legal texts:', err);
        showToast.error('No se pudieron cargar los textos legales');
      } finally {
        setLoadingLegalText(false);
      }
    };

    fetchLegalTexts();
  }, []);

  const handleSubmit = async () => {
    // Validaciones
    if (!signerName.trim()) {
      showToast.error('Por favor ingresa el nombre del firmante');
      return;
    }

    if (!signature) {
      showToast.error('Por favor firma el documento en el área indicada');
      return;
    }

    if (!emergencyContactPhone.trim()) {
      showToast.error('Por favor ingresa un teléfono de emergencia');
      return;
    }

    Alert.alert(
      'Confirmar Consentimiento',
      '¿Estás seguro de que deseas firmar este consentimiento? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: 'default',
          onPress: submitConsent,
        },
      ]
    );
  };

  const submitConsent = async () => {
    try {
      setLoading(true);
      let createdProcedureId = procedureId;
      let createdVaccineId = vaccineId;

      // Paso 1: Si viene procedureData, crear el procedimiento primero
      if (procedureData && petId) {
        const formData = new FormData();
        formData.append('tipo', procedureData.tipo);
        formData.append('descripcion', procedureData.descripcion);

        if (procedureData.fecha) {
          formData.append('fecha', procedureData.fecha);
        }

        if (procedureData.evidencia) {
          formData.append('evidencia', procedureData.evidencia);
        }

        const procedureResponse = await proceduresAPI.create(petId, formData);
        createdProcedureId = procedureResponse.data.procedure.id;

        // Paso 2: Si hay datos médicos, guardarlos
        if (medicalData) {
          try {
            await medicalDataAPI.create(createdProcedureId, medicalData);
          } catch (medError) {
            console.error('Error saving medical data:', medError);
            // No detener el flujo, el consentimiento es más importante
          }
        }
      }

      // Paso 1b: Si viene vaccineData, crear la vacuna primero
      if (vaccineData && petId) {
        const formData = new FormData();
        formData.append('nombreVacuna', vaccineData.nombreVacuna);
        formData.append('lote', vaccineData.lote);
        formData.append('caducidad', vaccineData.caducidad);
        formData.append('fechaAplicacion', vaccineData.fechaAplicacion);

        if (vaccineData.evidencia) {
          formData.append('evidencia', vaccineData.evidencia);
        }

        const vaccineResponse = await vaccinesAPI.create(petId, formData);
        createdVaccineId = vaccineResponse.data.vaccine.id;
      }

      // Paso 3: Crear el consentimiento
      const consentData = {
        consentType,
        signerName: signerName.trim(),
        signerRelation: signerRelation.trim(),
        signatureBase64: signature,
        emergencyContactName: emergencyContactName.trim() || undefined,
        emergencyContactPhone: emergencyContactPhone.trim(),
        legalTextVersion: 'v1',
      };

      let response;
      if (createdProcedureId) {
        response = await consentAPI.createProcedureConsent(createdProcedureId, consentData);
      } else if (createdVaccineId) {
        response = await consentAPI.createVaccineConsent(createdVaccineId, consentData);
      }

      const successMessage = vaccineData
        ? 'Vacuna y consentimiento registrados exitosamente'
        : 'Procedimiento y consentimiento registrados exitosamente';
      showToast.success(successMessage);

      // Paso 4: Navegar directamente a PetDetail
      setTimeout(() => {
        if (petId) {
          navigation.navigate('PetDetail', { petId, refresh: Date.now() });
        } else {
          navigation.goBack();
        }
      }, 500);
    } catch (err) {
      console.error('Error creating consent:', err);
      if (isNetworkError(err)) {
        showToast.networkError();
      } else {
        const errorMessage = err.response?.data?.error || 'No se pudo completar el registro';
        showToast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLegalText = () => {
    if (!legalTexts[consentType]) {
      return 'Cargando texto legal...';
    }
    return legalTexts[consentType].v1 || 'Texto legal no disponible.';
  };

  const getConsentTypeLabel = () => {
    const labels = {
      ANESTESIA: 'Anestesia',
      CIRUGIA: 'Cirugía',
      HOSPITALIZACION: 'Hospitalización',
      ESTETICA: 'Procedimiento Estético',
      VACUNACION: 'Vacunación',
      EUTANASIA: 'Eutanasia',
      OTRO: 'Procedimiento',
    };
    return labels[consentType] || consentType;
  };

  if (loadingLegalText) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando documento...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="document-text" size={48} color="#007AFF" />
        <Text style={styles.title}>Consentimiento Informado</Text>
        <Text style={styles.subtitle}>{getConsentTypeLabel()}</Text>
        {petName && <Text style={styles.petName}>Mascota: {petName}</Text>}
      </View>

      {/* Texto Legal */}
      <View style={styles.legalSection}>
        <View style={styles.legalHeader}>
          <Ionicons name="alert-circle-outline" size={20} color="#FF9500" />
          <Text style={styles.legalHeaderText}>Por favor lee cuidadosamente</Text>
        </View>
        <ScrollView style={styles.legalTextContainer} nestedScrollEnabled>
          <Text style={styles.legalText}>{getCurrentLegalText()}</Text>
        </ScrollView>
      </View>

      {/* Información del Firmante */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información del Firmante</Text>

        <Input
          label="Nombre Completo *"
          placeholder="Ej: Juan Pérez García"
          value={signerName}
          onChangeText={setSignerName}
          autoCapitalize="words"
        />

        <Input
          label="Relación con la Mascota *"
          placeholder="Ej: Propietario, Familiar, Tutor"
          value={signerRelation}
          onChangeText={setSignerRelation}
          autoCapitalize="words"
        />
      </View>

      {/* Contacto de Emergencia */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contacto de Emergencia</Text>

        <Input
          label="Nombre del Contacto"
          placeholder="Ej: María Pérez"
          value={emergencyContactName}
          onChangeText={setEmergencyContactName}
          autoCapitalize="words"
        />

        <Input
          label="Teléfono de Emergencia *"
          placeholder="+52 555 123 4567"
          value={emergencyContactPhone}
          onChangeText={setEmergencyContactPhone}
          keyboardType="phone-pad"
        />
      </View>

      {/* Firma */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Firma del Responsable *</Text>
        <SignaturePad
          description="La firma digital es requerida para completar el consentimiento"
          onOK={setSignature}
          onClear={() => setSignature(null)}
        />
      </View>

      {/* Aviso Legal */}
      <View style={styles.disclaimer}>
        <Ionicons name="shield-checkmark-outline" size={20} color="#34C759" />
        <Text style={styles.disclaimerText}>
          Al firmar este documento, confirmo que he leído y entendido el contenido del consentimiento informado.
        </Text>
      </View>

      {/* Botón de Confirmación */}
      <Button
        title={loading ? 'Procesando...' : 'Confirmar y Firmar'}
        onPress={handleSubmit}
        disabled={loading}
        loading={loading}
        style={styles.submitButton}
      />

      {/* Botón Cancelar */}
      <Button
        title="Cancelar"
        onPress={() => navigation.goBack()}
        variant="outline"
        disabled={loading}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 4,
  },
  petName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginTop: 8,
  },
  legalSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  legalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  legalHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9500',
  },
  legalTextContainer: {
    maxHeight: 200,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  legalText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#3A3A3C',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  disclaimer: {
    flexDirection: 'row',
    backgroundColor: '#E8F4FD',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
    alignItems: 'flex-start',
  },
  disclaimerText: {
    flex: 1,
    fontSize: 13,
    color: '#007AFF',
    lineHeight: 18,
  },
  submitButton: {
    marginBottom: 12,
  },
});

export default ConsentScreen;
