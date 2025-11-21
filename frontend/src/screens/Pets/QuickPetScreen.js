import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { DatePickerInput } from '../../components';
import { petsAPI } from '../../services/api';
import { isNetworkError } from '../../utils/networkUtils';
import { showToast } from '../../utils/toast';

const QuickPetScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    especie: 'Perro',
    raza: '',
  });

  const [fechaNacimiento, setFechaNacimiento] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedCoverImage, setSelectedCoverImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showExtraOptions, setShowExtraOptions] = useState(false);
  const [createdPet, setCreatedPet] = useState(null);
  const [showTransferCode, setShowTransferCode] = useState(false);

  const especies = ['Perro', 'Gato', 'Ave', 'Conejo', 'Otro'];

  const handleSelectImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        showToast.warning('Necesitamos permiso para acceder a tus fotos', 'Permiso requerido');
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
      showToast.error('No se pudo seleccionar la imagen');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

      if (permissionResult.granted === false) {
        showToast.warning('Necesitamos permiso para acceder a la cámara', 'Permiso requerido');
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
      showToast.error('No se pudo tomar la foto');
    }
  };

  const handleSelectCoverImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        showToast.warning('Necesitamos permiso para acceder a tus fotos', 'Permiso requerido');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedCoverImage(result.assets[0]);
      }
    } catch (error) {
      showToast.error('No se pudo seleccionar la imagen');
    }
  };

  const handleTakeCoverPhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

      if (permissionResult.granted === false) {
        showToast.warning('Necesitamos permiso para acceder a la cámara', 'Permiso requerido');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedCoverImage(result.assets[0]);
      }
    } catch (error) {
      showToast.error('No se pudo tomar la foto');
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

  const showCoverImageOptions = () => {
    Alert.alert(
      'Seleccionar foto de portada',
      'Elige una opción',
      [
        { text: 'Tomar foto', onPress: handleTakeCoverPhoto },
        { text: 'Elegir de galería', onPress: handleSelectCoverImage },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const handleSubmit = async () => {
    if (!formData.nombre.trim()) {
      showToast.error('Por favor ingresa el nombre de la mascota');
      return;
    }

    try {
      setLoading(true);

      const formDataToSend = new FormData();
      formDataToSend.append('nombre', formData.nombre.trim());
      formDataToSend.append('especie', formData.especie);

      if (formData.raza) {
        formDataToSend.append('raza', formData.raza);
      }

      if (fechaNacimiento) {
        formDataToSend.append('fechaNacimiento', fechaNacimiento.toISOString());
      }

      if (selectedImage) {
        const filename = selectedImage.uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        formDataToSend.append('foto', {
          uri: Platform.OS === 'ios' ? selectedImage.uri.replace('file://', '') : selectedImage.uri,
          name: filename,
          type,
        });
      }

      if (selectedCoverImage) {
        const filename = selectedCoverImage.uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        formDataToSend.append('coverPhoto', {
          uri: Platform.OS === 'ios' ? selectedCoverImage.uri.replace('file://', '') : selectedCoverImage.uri,
          name: filename,
          type,
        });
      }

      const response = await petsAPI.createQuickPet(formDataToSend);
      const { pet, transferCode } = response.data;

      setCreatedPet(pet);
      setShowTransferCode(true);
      showToast.success('Mascota creada exitosamente');
    } catch (err) {
      if (isNetworkError(err)) {
        showToast.networkError();
      } else {
        showToast.error('No se pudo crear la mascota');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    navigation.replace('PetDetail', { petId: createdPet.id });
  };

  if (showTransferCode && createdPet) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successContent}>
          <View style={styles.successIconContainer}>
            <Ionicons name="checkmark-circle" size={80} color="#34C759" />
          </View>

          <Text style={styles.successTitle}>¡Mascota creada!</Text>
          <Text style={styles.successSubtitle}>
            {createdPet.nombre} ha sido registrada exitosamente
          </Text>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={24} color="#007AFF" />
            <Text style={styles.infoText}>
              Ahora puedes compartir esta mascota con su dueño para que la pueda vincular a su cuenta
            </Text>
          </View>

          <TouchableOpacity
            style={styles.viewPetButton}
            onPress={handleFinish}
          >
            <Text style={styles.viewPetButtonText}>Ver perfil de la mascota</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.createAnotherButton}
            onPress={() => {
              setCreatedPet(null);
              setShowTransferCode(false);
              setFormData({ nombre: '', especie: 'Perro', raza: '' });
              setFechaNacimiento(null);
              setSelectedImage(null);
              setShowExtraOptions(false);
            }}
          >
            <Text style={styles.createAnotherButtonText}>Crear otra mascota</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Crear Mascota Rápida</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formContainer}>
          {/* Campo requerido: Nombre */}
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
              autoFocus
            />
          </View>

          {/* Botón para expandir opciones extra */}
          <TouchableOpacity
            style={styles.expandButton}
            onPress={() => setShowExtraOptions(!showExtraOptions)}
          >
            <View style={styles.expandButtonContent}>
              <Ionicons name="options-outline" size={20} color="#007AFF" />
              <Text style={styles.expandButtonText}>Personalización extra</Text>
            </View>
            <Ionicons
              name={showExtraOptions ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#007AFF"
            />
          </TouchableOpacity>

          {/* Sección colapsable con más opciones */}
          {showExtraOptions && (
            <>
              {/* Foto de perfil */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Foto de perfil (opcional)</Text>
                <TouchableOpacity style={styles.imagePicker} onPress={showImageOptions}>
                  {selectedImage ? (
                    <View style={styles.imageContainer}>
                      <Image source={{ uri: selectedImage.uri }} style={styles.imagePreview} />
                      <View style={styles.imageOverlay}>
                        <Ionicons name="camera-outline" size={30} color="#fff" />
                        <Text style={styles.overlayText}>Cambiar foto</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Ionicons name="cloud-upload-outline" size={48} color="#8E8E93" />
                      <Text style={styles.imagePlaceholderText}>Agregar foto</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Foto de portada */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Foto de portada (opcional)</Text>
                <TouchableOpacity style={styles.coverImagePicker} onPress={showCoverImageOptions}>
                  {selectedCoverImage ? (
                    <View style={styles.coverImageContainer}>
                      <Image source={{ uri: selectedCoverImage.uri }} style={styles.coverImagePreview} />
                      <View style={styles.imageOverlay}>
                        <Ionicons name="image-outline" size={30} color="#fff" />
                        <Text style={styles.overlayText}>Cambiar portada</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.coverImagePlaceholder}>
                      <Ionicons name="images-outline" size={32} color="#8E8E93" />
                      <Text style={styles.coverImagePlaceholderText}>Agregar foto de portada</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Especie */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Especie</Text>
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

              {/* Fecha de nacimiento */}
              <DatePickerInput
                label="Fecha de nacimiento (opcional)"
                value={fechaNacimiento}
                onChange={setFechaNacimiento}
                maximumDate={new Date()}
              />
            </>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Crear Mascota</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  required: {
    color: '#007AFF',
  },
  input: {
    backgroundColor: '#F2F2F7',
    borderWidth: 0,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#000',
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F2F2F7',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  expandButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expandButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
  },
  imagePicker: {
    width: '100%',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 16,
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  overlayText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  imagePlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '500',
  },
  coverImagePicker: {
    width: '100%',
  },
  coverImageContainer: {
    position: 'relative',
    width: '100%',
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
  },
  coverImagePreview: {
    width: '100%',
    height: 120,
    borderRadius: 12,
  },
  coverImagePlaceholder: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E5EA',
    borderStyle: 'dashed',
  },
  coverImagePlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  especiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  especieChip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#F2F2F7',
    borderWidth: 0,
  },
  especieChipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  especieChipText: {
    fontSize: 15,
    color: '#000',
    fontWeight: '500',
  },
  especieChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#8E8E93',
    shadowOpacity: 0,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  successContainer: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successContent: {
    width: '100%',
    alignItems: 'center',
  },
  successIconContainer: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#E8F4FD',
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#007AFF',
    lineHeight: 20,
  },
  viewPetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    marginBottom: 12,
  },
  viewPetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  createAnotherButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  createAnotherButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
});

export default QuickPetScreen;
