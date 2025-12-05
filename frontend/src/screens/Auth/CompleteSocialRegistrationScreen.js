import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { showToast } from '../../utils/toast';

const CompleteSocialRegistrationScreen = ({ route, navigation }) => {
  const { socialData, emailData } = route.params; // Can receive either socialData or emailData
  const { registerUser, registerVet } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingRole, setPendingRole] = useState(null);
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Determine registration data source (social or email)
  const registrationData = socialData || emailData;
  const isSocialLogin = !!socialData;

  const handleRoleSelection = (role) => {
    setPendingRole(role);
    setShowConfirmModal(true);
    setIsConfirmed(false);
  };

  const handleConfirmRegistration = async () => {
    if (!isConfirmed) {
      showToast.error('Debes confirmar tu selección marcando la casilla');
      return;
    }

    setShowConfirmModal(false);
    setSelectedRole(pendingRole);

    if (pendingRole === 'owner') {
      await handleRegisterAsOwner();
    } else if (pendingRole === 'vet') {
      await handleRegisterAsVet();
    }
  };

  const handleRegisterAsOwner = async () => {
    setLoading(true);
    try {
      const result = await registerUser(
        registrationData.nombre,
        registrationData.email,
        isSocialLogin ? '' : registrationData.password, // Empty password for social, real password for email
        isSocialLogin && registrationData.provider === 'google' ? registrationData.googleId : null,
        isSocialLogin && registrationData.provider === 'apple' ? registrationData.appleId : null,
        isSocialLogin ? registrationData.fotoUrl : null
      );

      if (!result.success) {
        showToast.error(result.error || 'Error al registrarse');
      }
    } catch (error) {
      showToast.error('Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterAsVet = async () => {
    setLoading(true);
    try {
      const result = await registerVet(
        registrationData.nombre,
        registrationData.email,
        isSocialLogin ? '' : registrationData.password, // Empty password for social, real password for email
        null, // cedulaProfesional - optional, will be requested later
        null, // telefono - optional
        isSocialLogin && registrationData.provider === 'google' ? registrationData.googleId : null,
        isSocialLogin && registrationData.provider === 'apple' ? registrationData.appleId : null,
        isSocialLogin ? registrationData.fotoUrl : null
      );

      if (!result.success) {
        showToast.error(result.error || 'Error al registrarse');
      }
    } catch (error) {
      showToast.error('Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {/* User Info */}
        <View style={styles.userInfoContainer}>
          {isSocialLogin && registrationData.fotoUrl ? (
            <Image source={{ uri: registrationData.fotoUrl }} style={styles.userPhoto} />
          ) : (
            <View style={styles.userPhotoPlaceholder}>
              <Ionicons name="person" size={48} color="#007AFF" />
            </View>
          )}
          <Text style={styles.userName}>{registrationData.nombre}</Text>
          <Text style={styles.userEmail}>{registrationData.email}</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>¿Cómo quieres usar la app?</Text>
        <Text style={styles.subtitle}>Selecciona tu rol para continuar</Text>

        {/* Role Selection Cards */}
        <View style={styles.cardsContainer}>
          {/* Owner Card */}
          <TouchableOpacity
            style={[
              styles.roleCard,
              selectedRole === 'owner' && styles.roleCardSelected
            ]}
            onPress={() => handleRoleSelection('owner')}
            disabled={loading}
            activeOpacity={0.7}
          >
            <View style={styles.iconCircle}>
              <Ionicons name="paw" size={32} color="#007AFF" />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.roleTitle}>Soy Dueño de Mascota</Text>
              <Text style={styles.roleDescription}>
                Gestiona el historial médico de tus mascotas
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#8E8E93" />
          </TouchableOpacity>

          {/* Vet Card */}
          <TouchableOpacity
            style={[
              styles.roleCard,
              selectedRole === 'vet' && styles.roleCardSelected
            ]}
            onPress={() => handleRoleSelection('vet')}
            disabled={loading}
            activeOpacity={0.7}
          >
            <View style={styles.iconCircle}>
              <Ionicons name="medical" size={32} color="#34C759" />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.roleTitle}>Soy Veterinario</Text>
              <Text style={styles.roleDescription}>
                Registra procedimientos y prescripciones
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#8E8E93" />
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Creando tu cuenta...</Text>
          </View>
        )}
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Ionicons
                name={pendingRole === 'owner' ? 'paw' : 'medical'}
                size={48}
                color={pendingRole === 'owner' ? '#007AFF' : '#34C759'}
              />
              <Text style={styles.modalTitle}>Confirmar Registro</Text>
              <Text style={styles.modalSubtitle}>
                ¿Estás seguro de que deseas crear tu cuenta como{' '}
                <Text style={styles.modalRoleText}>
                  {pendingRole === 'owner' ? 'Dueño de Mascota' : 'Veterinario'}
                </Text>
                ?
              </Text>
            </View>

            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setIsConfirmed(!isConfirmed)}
            >
              <View
                style={[
                  styles.checkbox,
                  isConfirmed && styles.checkboxChecked,
                ]}
              >
                {isConfirmed && (
                  <Ionicons name="checkmark" size={18} color="#FFF" />
                )}
              </View>
              <Text style={styles.checkboxLabel}>
                Sí, estoy seguro de mi elección
              </Text>
            </TouchableOpacity>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowConfirmModal(false);
                  setIsConfirmed(false);
                  setPendingRole(null);
                }}
              >
                <Text style={styles.modalCancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalConfirmButton,
                  !isConfirmed && styles.modalConfirmButtonDisabled,
                ]}
                onPress={handleConfirmRegistration}
                disabled={!isConfirmed}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.modalConfirmButtonText}>Confirmar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    marginTop: 20,
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  userInfoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  userPhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  userPhotoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E8F4FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 15,
    color: '#666',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  cardsContainer: {
    gap: 16,
  },
  roleCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  roleCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardTextContainer: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 14,
    color: '#666',
  },
  loadingContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  modalRoleText: {
    fontWeight: 'bold',
    color: '#007AFF',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    marginBottom: 24,
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
    fontSize: 15,
    color: '#000',
    flex: 1,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  modalCancelButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#007AFF',
    justifyContent: 'center',
  },
  modalConfirmButtonDisabled: {
    backgroundColor: '#B3D9FF',
    opacity: 0.6,
  },
  modalConfirmButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CompleteSocialRegistrationScreen;
