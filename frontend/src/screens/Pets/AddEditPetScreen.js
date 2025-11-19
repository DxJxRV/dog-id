import React, { useState, useLayoutEffect } from 'react';
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
  Modal,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { DatePickerInput } from '../../components';
import { petsAPI } from '../../services/api';
import { API_URL } from '../../utils/config';
import { isNetworkError } from '../../utils/networkUtils';
import { showToast } from '../../utils/toast';
import { useAuth } from '../../contexts/AuthContext';

const AddEditPetScreen = ({ navigation, route }) => {
  const petToEdit = route?.params?.pet;
  const isEditing = !!petToEdit;
  const { user, userType } = useAuth();
  const isVet = userType === 'vet';
  const isOwner = petToEdit?.user && user && petToEdit.user.id === user.id;

  const [formData, setFormData] = useState({
    nombre: petToEdit?.nombre || '',
    especie: petToEdit?.especie || 'Perro',
    raza: petToEdit?.raza || '',
  });

  const [fechaNacimiento, setFechaNacimiento] = useState(
    petToEdit?.fechaNacimiento ? new Date(petToEdit.fechaNacimiento) : null
  );
  const [selectedImage, setSelectedImage] = useState(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [selectedCoverImage, setSelectedCoverImage] = useState(null);
  const [removeCoverPhoto, setRemoveCoverPhoto] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [unlinking, setUnlinking] = useState(false);

  const especies = ['Perro', 'Gato', 'Ave', 'Conejo', 'Otro'];

  // Configurar el botón de menú en el header
  useLayoutEffect(() => {
    if (isEditing) {
      navigation.setOptions({
        headerRight: () => (
          <TouchableOpacity
            onPress={() => setShowOptionsMenu(true)}
            style={{ marginRight: 15 }}
          >
            <Ionicons name="ellipsis-vertical" size={24} color="#007AFF" />
          </TouchableOpacity>
        ),
      });
    }
  }, [navigation, isEditing]);

  const handleArchivePet = () => {
    setShowOptionsMenu(false);
    Alert.alert(
      'Archivar mascota',
      '¿Deseas archivar esta mascota? Podrás verla en la sección de archivados.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Archivar',
          onPress: async () => {
            try {
              setArchiving(true);
              await petsAPI.archive(petToEdit.id, true);
              showToast.success('Mascota archivada correctamente');
              setTimeout(() => navigation.goBack(), 500);
            } catch (err) {
              if (isNetworkError(err)) {
                showToast.networkError();
              } else {
                showToast.error('No se pudo archivar la mascota');
              }
            } finally {
              setArchiving(false);
            }
          },
        },
      ]
    );
  };

  const handleUnlinkPet = () => {
    setShowOptionsMenu(false);
    Alert.alert(
      'Desvincular mascota',
      '¿Estás seguro de que deseas desvincular esta mascota?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desvincular',
          style: 'destructive',
          onPress: async () => {
            try {
              setUnlinking(true);
              await petsAPI.unlinkPet(petToEdit.id);
              showToast.success('Mascota desvinculada correctamente');
              setTimeout(() => navigation.goBack(), 500);
            } catch (err) {
              if (isNetworkError(err)) {
                showToast.networkError();
              } else {
                showToast.error('No se pudo desvincular la mascota');
              }
            } finally {
              setUnlinking(false);
            }
          },
        },
      ]
    );
  };

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
        setRemovePhoto(false); // Si selecciona una nueva imagen, ya no quiere quitar la foto
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
        setRemovePhoto(false); // Si toma una nueva foto, ya no quiere quitar la foto
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
        setRemoveCoverPhoto(false);
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
        setRemoveCoverPhoto(false);
      }
    } catch (error) {
      showToast.error('No se pudo tomar la foto');
    }
  };

  const showImageOptions = () => {
    const options = [
      { text: 'Tomar foto', onPress: handleTakePhoto },
      { text: 'Elegir de galería', onPress: handleSelectImage },
    ];

    // Si está editando y tiene foto (ya sea la original o una nueva), mostrar opción de quitar
    if (isEditing && (petToEdit?.fotoUrl || selectedImage) && !removePhoto) {
      options.push({
        text: 'Quitar foto',
        style: 'destructive',
        onPress: () => {
          setSelectedImage(null);
          setRemovePhoto(true);
        },
      });
    }

    options.push({ text: 'Cancelar', style: 'cancel' });

    Alert.alert(
      'Seleccionar foto',
      'Elige una opción',
      options
    );
  };

  const showCoverImageOptions = () => {
    const options = [
      { text: 'Tomar foto', onPress: handleTakeCoverPhoto },
      { text: 'Elegir de galería', onPress: handleSelectCoverImage },
    ];

    // Si está editando y tiene cover photo, mostrar opción de quitar
    if (isEditing && (petToEdit?.coverPhotoUrl || selectedCoverImage) && !removeCoverPhoto) {
      options.push({
        text: 'Quitar foto de portada',
        style: 'destructive',
        onPress: () => {
          setSelectedCoverImage(null);
          setRemoveCoverPhoto(true);
        },
      });
    }

    options.push({ text: 'Cancelar', style: 'cancel' });

    Alert.alert(
      'Seleccionar foto de portada',
      'Elige una opción',
      options
    );
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
      showToast.error('El nombre es requerido', 'Campo requerido');
      return;
    }

    if (!formData.especie) {
      showToast.error('La especie es requerida', 'Campo requerido');
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
      } else if (isEditing && removePhoto) {
        // Si está editando y se marcó para quitar la foto
        form.append('removeFoto', 'true');
      }

      // Agregar cover photo si existe
      if (selectedCoverImage) {
        const filename = selectedCoverImage.uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        form.append('coverPhoto', {
          uri: Platform.OS === 'ios' ? selectedCoverImage.uri.replace('file://', '') : selectedCoverImage.uri,
          name: filename,
          type,
        });
      } else if (isEditing && removeCoverPhoto) {
        // Si está editando y se marcó para quitar la cover photo
        form.append('removeCoverPhoto', 'true');
      }

      if (isEditing) {
        await petsAPI.update(petToEdit.id, form);
        showToast.success('Mascota actualizada correctamente');
      } else {
        await petsAPI.create(form);
        showToast.success('Mascota agregada correctamente');
      }

      setTimeout(() => navigation.goBack(), 500);
    } catch (err) {
      console.error('Error saving pet:', err);
      if (isNetworkError(err)) {
        showToast.networkError();
      } else {
        const errorMessage = err.response?.data?.error || 'No se pudo guardar la mascota';
        showToast.error(errorMessage);
      }
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
            <View style={styles.imageContainer}>
              <Image source={{ uri: selectedImage.uri }} style={styles.imagePreview} />
              <View style={styles.imageOverlay}>
                <Ionicons name="camera-outline" size={30} color="#fff" />
                <Text style={styles.overlayText}>Cambiar foto</Text>
              </View>
            </View>
          ) : petToEdit?.fotoUrl && !removePhoto ? (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: `${API_URL}${petToEdit.fotoUrl}` }}
                style={styles.imagePreview}
              />
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

        {/* Cover Image Picker */}
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
            ) : petToEdit?.coverPhotoUrl && !removeCoverPhoto ? (
              <View style={styles.coverImageContainer}>
                <Image
                  source={{ uri: `${API_URL}${petToEdit.coverPhotoUrl}` }}
                  style={styles.coverImagePreview}
                />
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
        <DatePickerInput
          label="Fecha de nacimiento (opcional)"
          value={fechaNacimiento}
          onChange={setFechaNacimiento}
          maximumDate={new Date()}
        />

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

      {/* Modal de opciones */}
      <Modal
        visible={showOptionsMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOptionsMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptionsMenu(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.optionsMenu}>
            <TouchableOpacity
              style={styles.optionItem}
              onPress={handleArchivePet}
              disabled={archiving || unlinking}
            >
              {archiving ? (
                <ActivityIndicator size="small" color="#666" />
              ) : (
                <Ionicons name="archive-outline" size={22} color="#666" />
              )}
              <Text style={styles.optionText}>
                {archiving ? 'Archivando...' : 'Archivar mascota'}
              </Text>
            </TouchableOpacity>

            {isVet && !isOwner && (
              <TouchableOpacity
                style={[styles.optionItem, styles.optionItemDanger]}
                onPress={handleUnlinkPet}
                disabled={archiving || unlinking}
              >
                {unlinking ? (
                  <ActivityIndicator size="small" color="#FF3B30" />
                ) : (
                  <Ionicons name="link-outline" size={22} color="#FF3B30" />
                )}
                <Text style={styles.optionTextDanger}>
                  {unlinking ? 'Desvinculando...' : 'Desvincular mascota'}
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.optionSeparator} />

            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => setShowOptionsMenu(false)}
            >
              <Ionicons name="close-outline" size={22} color="#666" />
              <Text style={styles.optionText}>Cancelar</Text>
            </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  imagePicker: {
    width: '100%',
    marginBottom: 24,
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
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
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
    marginTop: 32,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  optionsMenu: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  optionItemDanger: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  optionTextDanger: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '500',
  },
  optionSeparator: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: 8,
  },
});

export default AddEditPetScreen;
