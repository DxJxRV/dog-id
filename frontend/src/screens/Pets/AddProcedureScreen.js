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
import { Input, Button, DatePickerInput } from '../../components';
import { proceduresAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { isNetworkError, getErrorMessage } from '../../utils/networkUtils';
import { showToast } from '../../utils/toast';

const PROCEDURE_TYPES = [
  { value: 'desparasitacion', label: 'Desparasitación', icon: 'medical-outline' },
  { value: 'limpieza_dental', label: 'Limpieza Dental', icon: 'fitness-outline' },
  { value: 'cirugia', label: 'Cirugía', icon: 'cut-outline' },
  { value: 'chequeo_general', label: 'Chequeo General', icon: 'checkmark-circle-outline' },
  { value: 'radiografia', label: 'Radiografía', icon: 'radio-outline' },
  { value: 'otro', label: 'Otro', icon: 'ellipsis-horizontal-outline' },
];

const AddProcedureScreen = ({ route, navigation }) => {
  const { petId } = route.params;
  const { userType } = useAuth();
  const [loading, setLoading] = useState(false);

  const [tipo, setTipo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fecha, setFecha] = useState(new Date());
  const [evidencia, setEvidencia] = useState(null);

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

  const handleSubmit = async () => {
    if (!tipo) {
      showToast.error('Selecciona un tipo de procedimiento', 'Campo requerido');
      return;
    }

    if (!descripcion.trim()) {
      showToast.error('La descripción es requerida', 'Campo requerido');
      return;
    }

    try {
      setLoading(true);

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

      await proceduresAPI.create(petId, formData);

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
          {PROCEDURE_TYPES.map((procType) => (
            <TouchableOpacity
              key={procType.value}
              style={[
                styles.typeCard,
                tipo === procType.value && styles.typeCardSelected,
              ]}
              onPress={() => setTipo(procType.value)}
            >
              <Ionicons
                name={procType.icon}
                size={32}
                color={tipo === procType.value ? '#fff' : '#666'}
              />
              <Text
                style={[
                  styles.typeLabel,
                  tipo === procType.value && styles.typeLabelSelected,
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
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color="#007AFF" />
            <Text style={styles.infoText}>
              Este procedimiento quedará registrado con tu nombre como veterinario responsable.
            </Text>
          </View>
        )}

        <Button
          title={loading ? 'Guardando...' : 'Guardar Procedimiento'}
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
});

export default AddProcedureScreen;
