import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Input, Button, DatePickerInput } from '../../components';
import { proceduresAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { isNetworkError, getErrorMessage } from '../../utils/networkUtils';

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
        Alert.alert('Permiso denegado', 'Se necesita acceso a la galería de fotos.');
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
      Alert.alert('Permiso denegado', 'Se necesita acceso a la cámara.');
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
      Alert.alert('Error', 'Selecciona un tipo de procedimiento');
      return;
    }

    if (!descripcion.trim()) {
      Alert.alert('Error', 'La descripción es requerida');
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

      Alert.alert('Éxito', 'Procedimiento registrado correctamente', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (err) {
      console.error('Error creating procedure:', err);
      if (isNetworkError(err)) {
        Alert.alert(
          'Error de Conexión',
          'No se pudo conectar al servidor. Verifica tu conexión a internet e intenta de nuevo.'
        );
      } else {
        Alert.alert('Error', err.response?.data?.error || 'No se pudo registrar el procedimiento');
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
                color={tipo === procType.value ? '#007AFF' : '#666'}
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
            <Ionicons name="camera-outline" size={24} color="#007AFF" />
            <Text style={styles.imageButtonText}>Tomar foto</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
            <Ionicons name="images-outline" size={24} color="#007AFF" />
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
    backgroundColor: '#F2F2F7',
  },
  form: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
    marginTop: 8,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  typeCard: {
    width: '47%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E5EA',
    gap: 8,
  },
  typeCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  typeLabel: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  typeLabelSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  imageButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  imageButton: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    gap: 8,
  },
  imageButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  imagePreview: {
    position: 'relative',
    marginBottom: 16,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 12,
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
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1976D2',
  },
});

export default AddProcedureScreen;
