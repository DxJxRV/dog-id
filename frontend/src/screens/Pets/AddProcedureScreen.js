import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Input, Button, DatePickerInput, VitalSignsForm } from '../../components';
import { proceduresAPI, medicalDataAPI, consentAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { isNetworkError, getErrorMessage } from '../../utils/networkUtils';
import { showToast } from '../../utils/toast';
import { Alert } from 'react-native';

const PROCEDURE_TYPES = [
  { value: 'desparasitacion', label: 'Desparasitación', icon: 'medical-outline' },
  { value: 'limpieza_dental', label: 'Limpieza Dental', icon: 'fitness-outline' },
  { value: 'cirugia', label: 'Cirugía', icon: 'cut-outline' },
  { value: 'anestesia', label: 'Anestesia', icon: 'water-outline' },
  { value: 'hospitalizacion', label: 'Hospitalización', icon: 'bed-outline' },
  { value: 'estetica', label: 'Estética', icon: 'cut-outline' },
  { value: 'eutanasia', label: 'Eutanasia', icon: 'heart-dislike-outline' },
  { value: 'chequeo_general', label: 'Chequeo General', icon: 'checkmark-circle-outline' },
  { value: 'radiografia', label: 'Radiografía', icon: 'radio-outline' },
  { value: 'otro', label: 'Otro', icon: 'ellipsis-horizontal-outline' },
];

const AddProcedureScreen = ({ route, navigation }) => {
  const { petId, petName, petStatus, draftData } = route.params;
  const { userType } = useAuth();
  const [loading, setLoading] = useState(false);

  const isDraftMode = !!draftData;

  const [tipo, setTipo] = useState(draftData?.tipo || '');
  const [descripcion, setDescripcion] = useState(draftData?.descripcion || '');
  const [fecha, setFecha] = useState(draftData?.fecha ? new Date(draftData.fecha) : new Date());
  const [evidencia, setEvidencia] = useState(null);

  // ECE: Datos médicos (solo para veterinarios)
  const [medicalData, setMedicalData] = useState({});

  // Tipos de procedimiento disponibles (incluye Certificar Defunción si es vet y mascota no está fallecida)
  const availableProcedureTypes = React.useMemo(() => {
    const types = [...PROCEDURE_TYPES];

    // Solo veterinarios pueden certificar defunción y solo si la mascota no está fallecida
    if (userType === 'vet' && petStatus !== 'DECEASED') {
      types.push({
        value: 'certificar_defuncion',
        label: 'Certificar Defunción',
        icon: 'medical'
      });
    }

    return types;
  }, [userType, petStatus]);

  const handleTypeSelection = (selectedType) => {
    // Si selecciona "Certificar Defunción", navegar directamente a esa pantalla
    if (selectedType === 'certificar_defuncion') {
      navigation.navigate('DeathCertificateForm', {
        petId,
        petName,
      });
      return;
    }

    setTipo(selectedType);
  };

  const pickImage = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showToast.warning('Se necesita acceso a la galería de fotos', 'Permiso denegado');
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setEvidencia(result.assets[0]);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showToast.warning('Se necesita acceso a la cámara', 'Permiso denegado');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setEvidencia(result.assets[0]);
    }
  };

  const handleMedicalDataChange = (field, value) => {
    setMedicalData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const requiresConsent = () => {
    // Tipos de procedimiento que requieren consentimiento firmado
    const consentRequiredTypes = [
      'cirugia',
      'anestesia',
      'hospitalizacion',
      'estetica',
      'eutanasia'
    ];
    return consentRequiredTypes.includes(tipo);
  };

  const hasMedicalData = () => {
    return userType === 'vet' && Object.keys(medicalData).some(
      key => medicalData[key] !== '' && medicalData[key] !== null && medicalData[key] !== undefined
    );
  };

  const handleSubmit = async () => {
    if (!tipo) {
      showToast.error('Selecciona un tipo de procedimiento', 'Campo requerido');
      return;
    }

    if (!descripcion.trim()) {
      showToast.error('La descripción es requerida', 'Campo requerido');
      return;
    }

    if (isDraftMode) {
      // Modo borrador: completar directamente sin consentimiento
      await completeDraft();
      return;
    }

    // Si requiere consentimiento y es cirugía/anestesia, avisar al usuario
    if (requiresConsent()) {
      Alert.alert(
        'Consentimiento Requerido',
        'Este procedimiento requiere un consentimiento informado firmado. Primero se guardará el procedimiento y luego se solicitará la firma.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Continuar',
            onPress: () => saveProcedure(true),
          },
        ]
      );
      return;
    }

    // Si no requiere consentimiento, guardar directamente
    await saveProcedure(false);
  };

  const completeDraft = async () => {
    try {
      setLoading(true);

      const formData = new FormData();
      formData.append('descripcion', descripcion.trim());

      if (fecha) {
        formData.append('fecha', fecha.toISOString().split('T')[0]);
      }

      if (evidencia) {
        const filename = evidencia.uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        formData.append('evidencia', {
          uri: evidencia.uri,
          name: filename,
          type,
        });
      }

      await proceduresAPI.completeDraft(draftData.id, formData);

      showToast.success('Procedimiento completado exitosamente');

      // Notificar al PetDetailScreen que debe refrescar
      if (route.params?.onRefresh) {
        route.params.onRefresh();
      }

      navigation.goBack();
    } catch (error) {
      console.error('Error completing draft procedure:', error);
      showToast.error(error.response?.data?.error || 'Error al completar el procedimiento');
    } finally {
      setLoading(false);
    }
  };

  const saveProcedure = async (needsConsent) => {
    try {
      setLoading(true);

      // Si requiere consentimiento, NO crear el procedimiento todavía
      // Pasar los datos a ConsentScreen para crear después
      if (needsConsent) {
        // Mapear el tipo de procedimiento al tipo de consentimiento
        const consentTypeMap = {
          'cirugia': 'CIRUGIA',
          'anestesia': 'ANESTESIA',
          'hospitalizacion': 'HOSPITALIZACION',
          'estetica': 'ESTETICA',
          'eutanasia': 'EUTANASIA',
        };

        navigation.navigate('ConsentScreen', {
          petId,
          petName: petName || 'Mascota',
          consentType: consentTypeMap[tipo] || 'OTRO',
          // Datos del procedimiento para crear después
          procedureData: {
            tipo,
            descripcion: descripcion.trim(),
            fecha: fecha ? fecha.toISOString().split('T')[0] : null,
            evidencia: evidencia ? {
              uri: evidencia.uri,
              name: evidencia.uri.split('/').pop(),
              type: (() => {
                const filename = evidencia.uri.split('/').pop();
                const match = /\.(\w+)$/.exec(filename);
                return match ? `image/${match[1]}` : 'image/jpeg';
              })(),
            } : null,
          },
          medicalData: hasMedicalData() ? medicalData : null,
        });
        setLoading(false);
        return;
      }

      // Si NO requiere consentimiento, guardar directamente
      const formData = new FormData();
      formData.append('tipo', tipo);
      formData.append('descripcion', descripcion.trim());

      if (fecha) {
        formData.append('fecha', fecha.toISOString().split('T')[0]);
      }

      if (evidencia) {
        const filename = evidencia.uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        formData.append('evidencia', {
          uri: evidencia.uri,
          name: filename,
          type,
        });
      }

      const response = await proceduresAPI.create(petId, formData);
      const procedureId = response.data.procedure.id;

      // Si tiene datos médicos, guardarlos
      if (hasMedicalData()) {
        try {
          await medicalDataAPI.create(procedureId, medicalData);
        } catch (medError) {
          console.error('Error saving medical data:', medError);
          showToast.warning('Procedimiento guardado, pero hubo un error con los datos médicos');
        }
      }

      showToast.success('Procedimiento registrado correctamente');
      setTimeout(() => navigation.goBack(), 500);
    } catch (err) {
      console.error('Error creating procedure:', err);
      if (isNetworkError(err)) {
        showToast.networkError();
      } else {
        const errorMessage = err.response?.data?.error || 'No se pudo registrar el procedimiento';
        showToast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.sectionTitle}>Tipo de Procedimiento *</Text>

        <View style={styles.typeGrid}>
          {availableProcedureTypes.map((procType) => (
            <TouchableOpacity
              key={procType.value}
              style={[
                styles.typeCard,
                tipo === procType.value && styles.typeCardSelected,
                procType.value === 'certificar_defuncion' && styles.typeCardDanger,
              ]}
              onPress={() => handleTypeSelection(procType.value)}
            >
              <Ionicons
                name={procType.icon}
                size={32}
                color={tipo === procType.value ? '#fff' : procType.value === 'certificar_defuncion' ? '#FF3B30' : '#666'}
              />
              <Text
                style={[
                  styles.typeLabel,
                  tipo === procType.value && styles.typeLabelSelected,
                  procType.value === 'certificar_defuncion' && styles.typeLabelDanger,
                ]}
              >
                {procType.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Input
          label="Descripción *"
          placeholder="Describe el procedimiento realizado"
          value={descripcion}
          onChangeText={setDescripcion}
          multiline
          numberOfLines={4}
        />

        <DatePickerInput
          label="Fecha del procedimiento"
          value={fecha}
          onChange={setFecha}
          maximumDate={new Date()}
        />

        <Text style={styles.sectionTitle}>Evidencia (opcional)</Text>

        <View style={styles.imageButtons}>
          <TouchableOpacity style={styles.imageButton} onPress={takePhoto}>
            <Ionicons name="camera-outline" size={32} color="#007AFF" />
            <Text style={styles.imageButtonText}>Tomar foto</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
            <Ionicons name="image-outline" size={32} color="#007AFF" />
            <Text style={styles.imageButtonText}>Galería</Text>
          </TouchableOpacity>
        </View>

        {evidencia && (
          <View style={styles.imagePreview}>
            <Image source={{ uri: evidencia.uri }} style={styles.image} />
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => setEvidencia(null)}
            >
              <Ionicons name="close-circle" size={30} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        )}

        {userType === 'vet' && (
          <>
            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={20} color="#007AFF" />
              <Text style={styles.infoText}>
                Este procedimiento quedará registrado con tu nombre como veterinario responsable.
              </Text>
            </View>

            {/* ECE: Formulario de Signos Vitales */}
            <View style={styles.medicalDataSection}>
              <Text style={styles.medicalDataTitle}>Datos Médicos (Opcional)</Text>
              <Text style={styles.medicalDataSubtitle}>
                Registra los signos vitales y datos médicos del paciente
              </Text>
              <VitalSignsForm
                value={medicalData}
                onChange={handleMedicalDataChange}
                isVeterinarian={true}
              />
            </View>
          </>
        )}

        {requiresConsent() && !isDraftMode && (
          <View style={styles.consentWarning}>
            <Ionicons name="warning-outline" size={20} color="#FF9500" />
            <Text style={styles.consentWarningText}>
              Este procedimiento requiere consentimiento informado firmado
            </Text>
          </View>
        )}

        {/* Info de draft mode */}
        {isDraftMode && (
          <View style={styles.draftInfo}>
            <Ionicons name="sparkles" size={20} color="#FF9500" />
            <Text style={styles.draftInfoText}>
              Completando registro detectado por IA
            </Text>
          </View>
        )}

        <Button
          title={
            loading
              ? 'Guardando...'
              : isDraftMode
              ? 'Completar Registro'
              : 'Guardar Procedimiento'
          }
          onPress={handleSubmit}
          disabled={loading}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  form: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
    marginTop: 16,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  typeCard: {
    width: '47%',
    backgroundColor: '#F2F2F7',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 0,
    gap: 8,
  },
  typeCardSelected: {
    backgroundColor: '#007AFF',
  },
  typeCardDanger: {
    borderWidth: 2,
    borderColor: '#FF3B30',
  },
  typeLabel: {
    fontSize: 13,
    color: '#000',
    textAlign: 'center',
    fontWeight: '500',
  },
  typeLabelSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  typeLabelDanger: {
    color: '#FF3B30',
    fontWeight: '600',
  },
  imageButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  imageButton: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    gap: 12,
  },
  imageButtonText: {
    fontSize: 14,
    color: '#000',
    fontWeight: '600',
    textAlign: 'center',
  },
  imagePreview: {
    position: 'relative',
    marginBottom: 24,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 16,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 15,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E8F4FD',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#007AFF',
    lineHeight: 20,
  },
  // ECE: Estilos para datos médicos y consentimiento
  medicalDataSection: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  medicalDataTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  medicalDataSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 16,
  },
  consentWarning: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  consentWarningText: {
    flex: 1,
    fontSize: 14,
    color: '#E65100',
    fontWeight: '600',
    lineHeight: 20,
  },
  draftInfo: {
    flexDirection: 'row',
    backgroundColor: '#FFF9E6',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFD966',
  },
  draftInfoText: {
    flex: 1,
    fontSize: 14,
    color: '#FF9500',
    fontWeight: '600',
    lineHeight: 20,
  },
});

export default AddProcedureScreen;
