import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ImageBackground,
  TextInput,
  ActivityIndicator,
  Platform,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI } from '../../services/api';
import { getImageUrl } from '../../utils/imageHelper';
import { showToast } from '../../utils/toast';
import { isNetworkError } from '../../utils/networkUtils';

const ProfileScreen = () => {
  const navigation = useNavigation();
  const { user, userType, logout, updateUser } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [nombre, setNombre] = useState(user?.nombre || '');
  const [telefono, setTelefono] = useState(user?.telefono || '');
  const [loading, setLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [coverPhotoLoading, setCoverPhotoLoading] = useState(false);

  // Cédula modal states
  const [showCedulaModal, setShowCedulaModal] = useState(false);
  const [cedulaInput, setCedulaInput] = useState('');
  const [isStudent, setIsStudent] = useState(false);
  const [savingCedula, setSavingCedula] = useState(false);

  const handlePickImage = async (type) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permisos necesarios',
          'Necesitamos permisos para acceder a tu galería de fotos'
        );
        return;
      }

      Alert.alert(
        type === 'profile' ? 'Cambiar foto de perfil' : 'Cambiar foto de portada',
        'Selecciona una opción',
        [
          {
            text: 'Cámara',
            onPress: () => handleTakePhoto(type),
          },
          {
            text: 'Galería',
            onPress: () => handleSelectFromGallery(type),
          },
          {
            text: 'Cancelar',
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      console.error('Error requesting permissions:', error);
      showToast.error('Error al solicitar permisos');
    }
  };

  const handleTakePhoto = async (type) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permisos necesarios',
          'Necesitamos permisos para acceder a tu cámara'
        );
        return;
      }

      const aspect = type === 'profile' ? [1, 1] : [16, 9];
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadPhoto(result.assets[0].uri, type);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      showToast.error('Error al tomar la foto');
    }
  };

  const handleSelectFromGallery = async (type) => {
    try {
      const aspect = type === 'profile' ? [1, 1] : [16, 9];
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadPhoto(result.assets[0].uri, type);
      }
    } catch (error) {
      console.error('Error selecting photo:', error);
      showToast.error('Error al seleccionar la foto');
    }
  };

  const uploadPhoto = async (uri, type) => {
    try {
      if (type === 'profile') {
        setPhotoLoading(true);
      } else {
        setCoverPhotoLoading(true);
      }

      const formData = new FormData();
      const filename = uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const fileType = match ? `image/${match[1]}` : 'image/jpeg';

      const fieldName = type === 'profile' ? 'foto' : 'coverPhoto';
      formData.append(fieldName, {
        uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
        name: filename,
        type: fileType,
      });

      const response = type === 'profile'
        ? await authAPI.updateProfilePhoto(formData)
        : await authAPI.updateCoverPhoto(formData);

      if (response.data.user) {
        updateUser(response.data.user);
      }

      showToast.success(
        type === 'profile'
          ? 'Foto de perfil actualizada'
          : 'Foto de portada actualizada'
      );
    } catch (error) {
      console.error('Error uploading photo:', error);
      if (isNetworkError(error)) {
        showToast.networkError();
      } else {
        showToast.error('Error al actualizar la foto');
      }
    } finally {
      if (type === 'profile') {
        setPhotoLoading(false);
      } else {
        setCoverPhotoLoading(false);
      }
    }
  };

  const handleSaveProfile = async () => {
    if (!nombre.trim()) {
      showToast.error('El nombre es requerido');
      return;
    }

    try {
      setLoading(true);
      const response = await authAPI.updateProfile({
        nombre: nombre.trim(),
        telefono: telefono.trim() || null,
      });

      if (response.data.user) {
        updateUser(response.data.user);
      }

      showToast.success('Perfil actualizado correctamente');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      if (isNetworkError(error)) {
        showToast.networkError();
      } else {
        showToast.error('Error al actualizar el perfil');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setNombre(user?.nombre || '');
    setTelefono(user?.telefono || '');
    setIsEditing(false);
  };

  const handleSaveCedula = async () => {
    if (!isStudent && !cedulaInput.trim()) {
      showToast.error('Ingresa tu cédula profesional o marca que eres estudiante');
      return;
    }

    try {
      setSavingCedula(true);
      const cedulaValue = isStudent ? 'EN_TRAMITE' : cedulaInput.trim();

      const response = await authAPI.updateProfile({
        cedulaProfesional: cedulaValue,
      });

      // Actualizar usuario en contexto manualmente
      await updateUser({ ...user, cedulaProfesional: cedulaValue });

      showToast.success('Cédula profesional actualizada correctamente');
      setShowCedulaModal(false);
      setCedulaInput('');
      setIsStudent(false);
    } catch (error) {
      console.error('Error updating cedula:', error);
      if (isNetworkError(error)) {
        showToast.networkError();
      } else {
        showToast.error('Error al actualizar la cédula profesional');
      }
    } finally {
      setSavingCedula(false);
    }
  };

  const handleDeleteAccount = () => {
    const message = userType === 'vet'
      ? '¿Estás seguro de que deseas eliminar tu cuenta?\n\n• Se eliminarán tus mascotas pendientes de transferir\n• Tus vacunas y procedimientos registrados quedarán anónimos\n• Esta acción no se puede deshacer'
      : '¿Estás seguro de que deseas eliminar tu cuenta?\n\n• Las mascotas con co-dueños serán transferidas automáticamente\n• Las mascotas sin co-dueños se eliminarán completamente\n• Se eliminarán tus amistades\n• Esta acción no se puede deshacer';

    Alert.alert(
      'Eliminar cuenta',
      message,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: confirmDeleteAccount,
        },
      ]
    );
  };

  const confirmDeleteAccount = async () => {
    try {
      setLoading(true);
      await authAPI.deleteAccount();
      showToast.success('Cuenta eliminada correctamente');
      logout();
    } catch (error) {
      console.error('Error deleting account:', error);
      if (isNetworkError(error)) {
        showToast.networkError();
      } else if (error.response?.data?.error) {
        showToast.error(error.response.data.error);
      } else {
        showToast.error('Error al eliminar la cuenta');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  const HeaderContent = () => (
    <>
      <TouchableOpacity
        style={styles.avatarContainer}
        onPress={() => handlePickImage('profile')}
        disabled={photoLoading}
      >
        {user?.fotoUrl ? (
          <Image
            source={{ uri: getImageUrl(user.fotoUrl) }}
            style={styles.avatar}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {user?.nombre?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
        )}

        {photoLoading ? (
          <View style={styles.photoOverlay}>
            <ActivityIndicator size="small" color="#fff" />
          </View>
        ) : (
          <View style={styles.cameraIcon}>
            <Ionicons name="camera" size={20} color="#fff" />
          </View>
        )}
      </TouchableOpacity>

      {!isEditing ? (
        <>
          <Text style={styles.name}>{user?.nombre || 'Usuario'}</Text>
          <Text style={styles.email}>{user?.email || ''}</Text>
          {userType === 'vet' && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Veterinario</Text>
            </View>
          )}
        </>
      ) : (
        <View style={styles.editForm}>
          <TextInput
            style={styles.input}
            placeholder="Nombre"
            placeholderTextColor="#8E8E93"
            value={nombre}
            onChangeText={setNombre}
            autoCapitalize="words"
          />
          <TextInput
            style={styles.input}
            placeholder="Teléfono (opcional)"
            placeholderTextColor="#8E8E93"
            value={telefono}
            onChangeText={setTelefono}
            keyboardType="phone-pad"
          />
        </View>
      )}
    </>
  );

  return (
    <ScrollView style={styles.container}>
      {user?.coverPhotoUrl ? (
        <ImageBackground
          source={{ uri: getImageUrl(user.coverPhotoUrl) }}
          style={styles.header}
          imageStyle={styles.headerBackgroundImage}
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.6)', 'rgba(242,242,247,1)']}
            locations={[0, 0.5, 1]}
            style={styles.headerGradient}
          >
            <TouchableOpacity
              style={styles.coverPhotoButton}
              onPress={() => handlePickImage('cover')}
              disabled={coverPhotoLoading}
            >
              {coverPhotoLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="camera" size={20} color="#fff" />
              )}
            </TouchableOpacity>
            <HeaderContent />
          </LinearGradient>
        </ImageBackground>
      ) : (
        <View style={styles.header}>
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.headerGradient}
          >
            <TouchableOpacity
              style={styles.coverPhotoButton}
              onPress={() => handlePickImage('cover')}
              disabled={coverPhotoLoading}
            >
              {coverPhotoLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="camera" size={20} color="#fff" />
              )}
            </TouchableOpacity>
            <HeaderContent />
          </LinearGradient>
        </View>
      )}

      {!isEditing && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Información</Text>
            <TouchableOpacity
              onPress={() => setIsEditing(true)}
              style={styles.editButton}
            >
              <Ionicons name="create-outline" size={20} color="#007AFF" />
              <Text style={styles.editButtonText}>Editar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tipo de cuenta</Text>
            <Text style={styles.infoValue}>
              {userType === 'vet' ? 'Veterinario' : 'Usuario'}
            </Text>
          </View>

          {user?.telefono && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Teléfono</Text>
              <Text style={styles.infoValue}>{user.telefono}</Text>
            </View>
          )}

          {userType === 'vet' && (
            <>
              {user?.cedulaProfesional ? (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Cédula profesional</Text>
                  <Text style={styles.infoValue}>{user.cedulaProfesional}</Text>
                </View>
              ) : (
                <View style={[styles.infoRow, styles.warningRow]}>
                  <Text style={styles.infoLabel}>Cédula profesional</Text>
                  <View style={styles.warningContainer}>
                    <Ionicons name="warning-outline" size={16} color="#FF9500" />
                    <Text style={styles.warningText}>Pendiente</Text>
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={styles.professionalDataButton}
                onPress={() => setShowCedulaModal(true)}
              >
                <Ionicons name="shield-checkmark-outline" size={20} color="#34C759" />
                <Text style={styles.professionalDataText}>
                  {user?.cedulaProfesional ? 'Actualizar Datos Profesionales' : 'Agregar Cédula Profesional'}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {userType === 'vet' && (
            <TouchableOpacity
              style={styles.changeClinicButton}
              onPress={() => {
                // We can clear current clinic here or just navigate
                // If we just navigate, the Selector will overwrite it on select.
                navigation.navigate('ClinicSelector');
              }}
            >
              <Ionicons name="business-outline" size={20} color="#007AFF" />
              <Text style={styles.changeClinicText}>Cambiar de Clínica</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {isEditing && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSaveProfile}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Guardar cambios</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancelEdit}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.section}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeleteAccount}
          disabled={loading}
        >
          <Ionicons name="trash-outline" size={20} color="#FF3B30" />
          <Text style={styles.deleteButtonText}>Eliminar cuenta</Text>
        </TouchableOpacity>
      </View>

      {/* Cédula Professional Modal */}
      <Modal
        visible={showCedulaModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCedulaModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.cedulaModalOverlay}
        >
          <TouchableOpacity
            style={styles.cedulaModalOverlay}
            activeOpacity={1}
            onPress={() => setShowCedulaModal(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={styles.cedulaModalContainer}
            >
              <View style={styles.cedulaModalHeader}>
                <Ionicons name="shield-checkmark" size={48} color="#34C759" />
                <Text style={styles.cedulaModalTitle}>Datos Profesionales</Text>
                <Text style={styles.cedulaModalSubtitle}>
                  {user?.cedulaProfesional
                    ? 'Actualiza tu Cédula Profesional'
                    : 'Agrega tu Cédula Profesional para poder emitir recetas válidas'}
                </Text>
              </View>

              <View style={styles.cedulaModalForm}>
                <Text style={styles.cedulaLabel}>Cédula Profesional</Text>
                <TextInput
                  style={[
                    styles.cedulaInput,
                    isStudent && styles.cedulaInputDisabled,
                  ]}
                  value={cedulaInput}
                  onChangeText={setCedulaInput}
                  placeholder="Ej: 12345678"
                  placeholderTextColor="#8E8E93"
                  keyboardType="numeric"
                  editable={!isStudent && !savingCedula}
                />

                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => setIsStudent(!isStudent)}
                  disabled={savingCedula}
                >
                  <View
                    style={[
                      styles.checkbox,
                      isStudent && styles.checkboxChecked,
                    ]}
                  >
                    {isStudent && (
                      <Ionicons name="checkmark" size={18} color="#FFF" />
                    )}
                  </View>
                  <Text style={styles.checkboxLabel}>
                    Soy Estudiante / Pasante
                  </Text>
                </TouchableOpacity>

                {isStudent && (
                  <View style={styles.studentNote}>
                    <Ionicons
                      name="information-circle-outline"
                      size={20}
                      color="#007AFF"
                    />
                    <Text style={styles.studentNoteText}>
                      Se registrará tu cédula como "EN TRÁMITE"
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.cedulaModalButtons}>
                <TouchableOpacity
                  style={styles.cedulaCancelButton}
                  onPress={() => {
                    setShowCedulaModal(false);
                    setCedulaInput('');
                    setIsStudent(false);
                  }}
                  disabled={savingCedula}
                >
                  <Text style={styles.cedulaCancelButtonText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cedulaSaveButton}
                  onPress={handleSaveCedula}
                  disabled={savingCedula}
                >
                  {savingCedula ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.cedulaSaveButtonText}>
                      Guardar y Continuar
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    width: '100%',
    minHeight: 320,
    alignItems: 'center',
    overflow: 'hidden',
  },
  headerBackgroundImage: {
    width: '100%',
    height: '100%',
  },
  headerGradient: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  coverPhotoButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 15,
    position: 'relative',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
  photoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIcon: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#007AFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  name: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 5,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  email: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  badge: {
    backgroundColor: '#34C759',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 5,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  editForm: {
    width: '100%',
    marginTop: 20,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  infoLabel: {
    fontSize: 16,
    color: '#8E8E93',
  },
  infoValue: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  changeClinicButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 12,
    backgroundColor: '#E8F4FD',
    borderRadius: 10,
  },
  changeClinicText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#F2F2F7',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#fff',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  deleteButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
  warningRow: {
    backgroundColor: '#FFF9E6',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  warningText: {
    color: '#FF9500',
    fontSize: 14,
    fontWeight: '600',
  },
  professionalDataButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 15,
    paddingVertical: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
  },
  professionalDataText: {
    color: '#34C759',
    fontSize: 16,
    fontWeight: '600',
  },
  cedulaModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  cedulaModalContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  cedulaModalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  cedulaModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  cedulaModalSubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  cedulaModalForm: {
    marginBottom: 24,
  },
  cedulaLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  cedulaInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginBottom: 16,
  },
  cedulaInputDisabled: {
    backgroundColor: '#F8F8F8',
    color: '#8E8E93',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#000',
    flex: 1,
  },
  studentNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E8F4FD',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  studentNoteText: {
    fontSize: 14,
    color: '#007AFF',
    flex: 1,
  },
  cedulaModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cedulaCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  cedulaCancelButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  cedulaSaveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#34C759',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  cedulaSaveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileScreen;
