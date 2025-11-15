import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { petsAPI } from '../../services/api';

const AddEditPetScreen = ({ navigation, route }) => {
  const petToEdit = route?.params?.pet;
  const isEditing = !!petToEdit;

  const [formData, setFormData] = useState({
    nombre: petToEdit?.nombre || '',
    especie: petToEdit?.especie || 'Perro',
    raza: petToEdit?.raza || '',
  });

  const [fechaNacimiento, setFechaNacimiento] = useState(
    petToEdit?.fechaNacimiento ? new Date(petToEdit.fechaNacimiento) : null
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const especies = ['Perro', 'Gato', 'Ave', 'Conejo', 'Otro'];

  const handleSelectImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        Alert.alert(
          'Permiso requerido',
          'Necesitamos permiso para acceder a tus fotos'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

      if (permissionResult.granted === false) {
        Alert.alert(
          'Permiso requerido',
          'Necesitamos permiso para acceder a la cámara'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Seleccionar foto',
      'Elige una opción',
      [
        { text: 'Tomar foto', onPress: handleTakePhoto },
        { text: 'Elegir de galería', onPress: handleSelectImage },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setFechaNacimiento(selectedDate);
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleSubmit = async () => {
    if (!formData.nombre.trim()) {
      Alert.alert('Error', 'El nombre es requerido');
      return;
    }

    if (!formData.especie) {
      Alert.alert('Error', 'La especie es requerida');
      return;
    }

    setLoading(true);

    try {
      const form = new FormData();
      form.append('nombre', formData.nombre.trim());
      form.append('especie', formData.especie);

      if (formData.raza.trim()) {
        form.append('raza', formData.raza.trim());
      }

      if (fechaNacimiento) {
        form.append('fechaNacimiento', formatDate(fechaNacimiento));
      }

      if (selectedImage) {
        const filename = selectedImage.uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        form.append('foto', {
          uri: Platform.OS === 'ios' ? selectedImage.uri.replace('file://', '') : selectedImage.uri,
          name: filename,
          type,
        });
      }

      if (isEditing) {
        await petsAPI.update(petToEdit.id, form);
        Alert.alert('Éxito', 'Mascota actualizada correctamente');
      } else {
        await petsAPI.create(form);
        Alert.alert('Éxito', 'Mascota agregada correctamente');
      }

      navigation.goBack();
    } catch (error) {
      console.error('Error saving pet:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'No se pudo guardar la mascota'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formContainer}>
        {/* Image Picker */}
        <TouchableOpacity style={styles.imagePicker} onPress={showImageOptions}>
          {selectedImage ? (
            <Image source={{ uri: selectedImage.uri }} style={styles.imagePreview} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="camera-outline" size={40} color="#999" />
              <Text style={styles.imagePlaceholderText}>Agregar foto</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Nombre */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Nombre <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={formData.nombre}
            onChangeText={(text) => setFormData({ ...formData, nombre: text })}
            placeholder="Ej: Max"
            placeholderTextColor="#999"
          />
        </View>

        {/* Especie */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Especie <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.especiesContainer}>
            {especies.map((especie) => (
              <TouchableOpacity
                key={especie}
                style={[
                  styles.especieChip,
                  formData.especie === especie && styles.especieChipActive,
                ]}
                onPress={() => setFormData({ ...formData, especie })}
              >
                <Text
                  style={[
                    styles.especieChipText,
                    formData.especie === especie && styles.especieChipTextActive,
                  ]}
                >
                  {especie}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Raza */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Raza (opcional)</Text>
          <TextInput
            style={styles.input}
            value={formData.raza}
            onChangeText={(text) => setFormData({ ...formData, raza: text })}
            placeholder="Ej: Labrador"
            placeholderTextColor="#999"
          />
        </View>

        {/* Fecha de Nacimiento */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Fecha de nacimiento (opcional)</Text>
          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={() => {
              Keyboard.dismiss();
              setTimeout(() => setShowDatePicker(true), 100);
            }}
          >
            <Ionicons name="calendar-outline" size={20} color="#666" />
            <Text style={[styles.datePickerText, !fechaNacimiento && styles.datePickerPlaceholder]}>
              {fechaNacimiento ? formatDate(fechaNacimiento) : 'Seleccionar fecha'}
            </Text>
          </TouchableOpacity>
          {fechaNacimiento && (
            <TouchableOpacity
              style={styles.clearDateButton}
              onPress={() => setFechaNacimiento(null)}
            >
              <Text style={styles.clearDateText}>Limpiar fecha</Text>
            </TouchableOpacity>
          )}
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={fechaNacimiento || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Guardando...' : isEditing ? 'Actualizar Mascota' : 'Agregar Mascota'}
          </Text>
        </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  imagePicker: {
    alignSelf: 'center',
    marginBottom: 30,
  },
  imagePreview: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    marginTop: 8,
    fontSize: 12,
    color: '#999',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#FF3B30',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: '#333',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  especiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  especieChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  especieChipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  especieChipText: {
    fontSize: 14,
    color: '#333',
  },
  especieChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  datePickerButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  datePickerText: {
    fontSize: 16,
    color: '#333',
  },
  datePickerPlaceholder: {
    color: '#999',
  },
  clearDateButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  clearDateText: {
    fontSize: 14,
    color: '#FF3B30',
  },
});

export default AddEditPetScreen;
