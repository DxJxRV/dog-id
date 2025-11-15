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
import { Input, Button, SearchableSelect, DatePickerInput } from '../../components';
import { vaccinesAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { COMMON_VACCINES, filterVaccines } from '../../utils/commonVaccines';

const AddVaccineScreen = ({ route, navigation }) => {
  const { petId } = route.params;
  const { userType } = useAuth();
  const [loading, setLoading] = useState(false);

  const [nombreVacuna, setNombreVacuna] = useState('');
  const [showVaccineSelect, setShowVaccineSelect] = useState(false);
  const [lote, setLote] = useState('');
  const [fechaAplicacion, setFechaAplicacion] = useState(new Date());
  const [caducidad, setCaducidad] = useState(new Date());
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
    // Validar campos obligatorios
    if (!nombreVacuna.trim()) {
      Alert.alert('Error', 'El nombre de la vacuna es obligatorio');
      return;
    }

    if (!lote.trim()) {
      Alert.alert('Error', 'El número de lote es obligatorio');
      return;
    }

    if (!fechaAplicacion) {
      Alert.alert('Error', 'La fecha de aplicación es obligatoria');
      return;
    }

    if (!evidencia) {
      Alert.alert('Error', 'La foto de evidencia es obligatoria');
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append('nombreVacuna', nombreVacuna.trim());
      formData.append('lote', lote.trim());
      formData.append('caducidad', caducidad.toISOString().split('T')[0]);
      formData.append('fechaAplicacion', fechaAplicacion.toISOString().split('T')[0]);

      const filename = evidencia.uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('evidencia', {
        uri: evidencia.uri,
        name: filename,
        type,
      });

      await vaccinesAPI.create(petId, formData);

      Alert.alert('Éxito', 'Vacuna registrada correctamente', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error('Error creating vaccine:', error);
      const errorMessage = error.response?.data?.error || 'No se pudo registrar la vacuna';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.sectionTitle}>Información de la Vacuna</Text>

        {/* Nombre de vacuna con SearchableSelect */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nombre de la vacuna *</Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setShowVaccineSelect(true)}
          >
            <Text style={nombreVacuna ? styles.selectButtonTextFilled : styles.selectButtonText}>
              {nombreVacuna || 'Seleccionar vacuna'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#999" />
          </TouchableOpacity>
        </View>

        <SearchableSelect
          visible={showVaccineSelect}
          onClose={() => setShowVaccineSelect(false)}
          onSelect={setNombreVacuna}
          options={COMMON_VACCINES}
          filterFunction={filterVaccines}
          placeholder="Buscar vacuna..."
          title="Seleccionar Vacuna"
          allowCustom={true}
          customText="Usar"
        />

        <Input
          label="Número de lote *"
          placeholder="Ej: LOT123456"
          value={lote}
          onChangeText={setLote}
          autoCapitalize="characters"
        />

        <DatePickerInput
          label="Fecha de aplicación"
          value={fechaAplicacion}
          onChange={setFechaAplicacion}
          maximumDate={new Date()}
          required
        />

        <DatePickerInput
          label="Fecha de caducidad"
          value={caducidad}
          onChange={setCaducidad}
          minimumDate={new Date()}
          required
        />

        <Text style={styles.sectionTitle}>Evidencia (Foto obligatoria) *</Text>

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

        {evidencia ? (
          <View style={styles.imagePreview}>
            <Image source={{ uri: evidencia.uri }} style={styles.image} />
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => setEvidencia(null)}
            >
              <Ionicons name="close-circle" size={30} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.noImageContainer}>
            <Ionicons name="image-outline" size={48} color="#CCC" />
            <Text style={styles.noImageText}>Sin foto</Text>
          </View>
        )}

        {userType === 'vet' && (
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color="#007AFF" />
            <Text style={styles.infoText}>
              Esta vacuna quedará registrada con tu nombre como veterinario responsable.
            </Text>
          </View>
        )}

        <Button
          title={loading ? 'Guardando...' : 'Guardar Vacuna'}
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
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    marginBottom: 8,
  },
  selectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  selectButtonText: {
    fontSize: 16,
    color: '#999',
  },
  selectButtonTextFilled: {
    fontSize: 16,
    color: '#000',
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
  noImageContainer: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    borderStyle: 'dashed',
    padding: 32,
    alignItems: 'center',
    marginBottom: 16,
  },
  noImageText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
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

export default AddVaccineScreen;
