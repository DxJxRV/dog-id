import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Input, Button } from '../../components';
import { deathCertificateAPI, petsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { isNetworkError } from '../../utils/networkUtils';
import { showToast } from '../../utils/toast';

const DEATH_TYPES = [
  { value: 'NATURAL', label: 'Muerte Natural' },
  { value: 'EUTANASIA', label: 'Eutanasia' },
  { value: 'ACCIDENTE', label: 'Accidente' },
  { value: 'ENFERMEDAD', label: 'Enfermedad' },
  { value: 'OTRO', label: 'Otro' },
];

const BODY_DISPOSITIONS = [
  { value: 'CREMACION', label: 'Cremación' },
  { value: 'ENTIERRO', label: 'Entierro' },
  { value: 'ENTREGA_DUENO', label: 'Entrega al Dueño' },
  { value: 'OTRO', label: 'Otro' },
];

/**
 * Formulario de Certificado de Defunción (Solo Veterinarios)
 */
const DeathCertificateFormScreen = ({ route, navigation }) => {
  const { petId, petName } = route.params;
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const [causeOfDeath, setCauseOfDeath] = useState('');
  const [deathType, setDeathType] = useState('');
  const [bodyDisposition, setBodyDisposition] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async () => {
    // Validaciones
    if (!causeOfDeath.trim()) {
      showToast.error('La causa de muerte es requerida');
      return;
    }

    if (!deathType) {
      showToast.error('Selecciona el tipo de muerte');
      return;
    }

    if (!bodyDisposition) {
      showToast.error('Selecciona la disposición del cuerpo');
      return;
    }

    Alert.alert(
      'Confirmar Certificación',
      `Estás a punto de certificar la defunción de ${petName}. Esta acción es irreversible y marcará a la mascota como fallecida en el sistema.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Certificar Defunción',
          style: 'destructive',
          onPress: submitCertificate,
        },
      ]
    );
  };

  const submitCertificate = async () => {
    try {
      setLoading(true);

      const certificateData = {
        petId,
        causeOfDeath: causeOfDeath.trim(),
        deathType,
        bodyDisposition,
        notes: notes.trim() || undefined,
      };

      const response = await deathCertificateAPI.create(certificateData);

      showToast.success('Certificado de defunción generado exitosamente');

      // Navegar de vuelta al detalle de la mascota
      setTimeout(() => {
        navigation.navigate('PetDetail', { petId, refresh: Date.now() });
      }, 500);
    } catch (err) {
      console.error('Error creating death certificate:', err);
      if (isNetworkError(err)) {
        showToast.networkError();
      } else {
        const errorMessage = err.response?.data?.error || 'No se pudo generar el certificado';
        showToast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="document-text" size={48} color="#8E8E93" />
        <Text style={styles.title}>Certificado de Defunción</Text>
        <Text style={styles.subtitle}>Mascota: {petName}</Text>
        <View style={styles.warningBox}>
          <Ionicons name="alert-circle" size={20} color="#FF9500" />
          <Text style={styles.warningText}>
            Este certificado es un documento legal y marcará permanentemente a la mascota como fallecida.
          </Text>
        </View>
      </View>

      {/* Tipo de Muerte */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tipo de Muerte *</Text>
        <View style={styles.optionsGrid}>
          {DEATH_TYPES.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.optionCard,
                deathType === type.value && styles.optionCardSelected,
              ]}
              onPress={() => setDeathType(type.value)}
            >
              <Text
                style={[
                  styles.optionLabel,
                  deathType === type.value && styles.optionLabelSelected,
                ]}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Causa de Muerte */}
      <View style={styles.section}>
        <Input
          label="Causa de Muerte *"
          placeholder="Describe detalladamente la causa del fallecimiento..."
          value={causeOfDeath}
          onChangeText={setCauseOfDeath}
          multiline
          numberOfLines={4}
        />
      </View>

      {/* Disposición del Cuerpo */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Disposición del Cuerpo *</Text>
        <View style={styles.optionsGrid}>
          {BODY_DISPOSITIONS.map((disposition) => (
            <TouchableOpacity
              key={disposition.value}
              style={[
                styles.optionCard,
                bodyDisposition === disposition.value && styles.optionCardSelected,
              ]}
              onPress={() => setBodyDisposition(disposition.value)}
            >
              <Text
                style={[
                  styles.optionLabel,
                  bodyDisposition === disposition.value && styles.optionLabelSelected,
                ]}
              >
                {disposition.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Notas Adicionales */}
      <View style={styles.section}>
        <Input
          label="Notas Adicionales (Opcional)"
          placeholder="Observaciones, comentarios adicionales..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Información del Veterinario */}
      <View style={styles.infoBox}>
        <Ionicons name="medical" size={20} color="#007AFF" />
        <Text style={styles.infoText}>
          Certifico como médico veterinario: {user?.nombre}
        </Text>
      </View>

      {/* Botones */}
      <Button
        title={loading ? 'Generando...' : 'Generar Certificado de Defunción'}
        onPress={handleSubmit}
        disabled={loading}
        loading={loading}
        style={styles.submitButton}
      />

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
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 4,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#E65100',
    lineHeight: 18,
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
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionCard: {
    minWidth: '47%',
    backgroundColor: '#F2F2F7',
    padding: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    backgroundColor: '#E8F4FD',
    borderColor: '#007AFF',
  },
  optionLabel: {
    fontSize: 14,
    color: '#000',
    textAlign: 'center',
    fontWeight: '500',
  },
  optionLabelSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E8F4FD',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  submitButton: {
    marginBottom: 12,
  },
});

export default DeathCertificateFormScreen;
