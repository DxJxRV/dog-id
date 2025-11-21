import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { petsAPI } from '../../services/api';
import { isNetworkError } from '../../utils/networkUtils';
import { showToast } from '../../utils/toast';

const ClaimPetScreen = ({ navigation }) => {
  const [transferCode, setTransferCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const formatCodeInput = (text) => {
    // Remover caracteres no alfanuméricos
    let cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '');

    // Limitar a 8 caracteres
    cleaned = cleaned.substring(0, 8);

    // Agregar guión después del 4to carácter
    if (cleaned.length > 4) {
      cleaned = cleaned.substring(0, 4) + '-' + cleaned.substring(4);
    }

    setTransferCode(cleaned);
  };

  const handleOpenScanner = async () => {
    if (!permission) {
      return;
    }

    if (!permission.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        showToast.warning('Necesitamos acceso a la cámara para escanear códigos QR', 'Permiso denegado');
        return;
      }
    }

    setScanned(false);
    setShowScanner(true);
  };

  const handleBarCodeScanned = ({ data }) => {
    if (scanned) return;

    setScanned(true);
    setShowScanner(false);

    // El código viene del QR, formatearlo si es necesario
    const cleanedCode = data.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    setTransferCode(cleanedCode);

    // Reclamar automáticamente después de escanear
    setTimeout(() => {
      handleClaimPetWithCode(cleanedCode);
    }, 300);
  };

  const handleClaimPet = () => {
    handleClaimPetWithCode(transferCode);
  };

  const handleClaimPetWithCode = async (code) => {
    const codeToUse = code || transferCode;

    if (!codeToUse.trim()) {
      showToast.error('Por favor ingresa un código de cesión', 'Campo requerido');
      return;
    }

    setLoading(true);

    try {
      const response = await petsAPI.claimPet(codeToUse.toUpperCase().trim());
      const pet = response.data.pet;

      showToast.success(`¡${pet.nombre} ahora es tu mascota!`);
      setTimeout(() => navigation.replace('PetDetail', { petId: pet.id }), 500);
    } catch (err) {
      if (isNetworkError(err)) {
        showToast.networkError();
      } else {
        if (err.response?.status === 404) {
          showToast.error('El código de cesión no existe o ya fue utilizado', 'Código inválido');
        } else if (err.response?.status === 400) {
          const errorMsg = err.response?.data?.error;
          if (errorMsg?.includes('expired')) {
            showToast.error('El código de cesión ha expirado', 'Código expirado');
          } else if (errorMsg?.includes('already own')) {
            showToast.warning('Esta mascota ya está en tu cuenta', 'Ya la tienes');
          } else {
            showToast.error(errorMsg || 'No se pudo reclamar la mascota');
          }
        } else {
          const errorMessage = err.response?.data?.error || 'No se pudo reclamar la mascota';
          showToast.error(errorMessage);
        }
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
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reclamar Mascota</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.contentHeader}>
          <View style={styles.iconContainer}>
            <Ionicons name="gift-outline" size={60} color="#007AFF" />
          </View>
          <Text style={styles.title}>Reclamar tu Mascota</Text>
          <Text style={styles.subtitle}>
            Ingresa el código de cesión que te proporcionó tu veterinario para agregar la mascota a tu cuenta
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Código de cesión</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="qr-code-outline" size={24} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={transferCode}
                onChangeText={formatCodeInput}
                placeholder="XXXX-XXXX"
                placeholderTextColor="#999"
                autoCapitalize="characters"
                maxLength={9}
                autoFocus
              />
            </View>
            <Text style={styles.hint}>Formato: 4 caracteres, guión, 4 caracteres</Text>
          </View>

          <TouchableOpacity
            style={styles.scanButton}
            onPress={handleOpenScanner}
          >
            <Ionicons name="scan" size={24} color="#007AFF" />
            <Text style={styles.scanButtonText}>Escanear código QR</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.claimButton, loading && styles.claimButtonDisabled]}
            onPress={handleClaimPet}
            disabled={loading || transferCode.length < 8}
          >
            <Text style={styles.claimButtonText}>
              {loading ? 'Reclamando...' : 'Reclamar Mascota'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.infoItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.infoText}>
              Tu veterinario creó un perfil para tu mascota y te proporcionó un código
            </Text>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.infoText}>
              Escanea el código QR o ingresa el código manualmente en el campo de arriba
            </Text>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={styles.infoText}>
              La mascota será transferida a tu cuenta con todo su historial médico
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Modal del escáner QR */}
      <Modal
        visible={showScanner}
        animationType="slide"
        onRequestClose={() => setShowScanner(false)}
      >
        <View style={styles.scannerContainer}>
          <View style={styles.scannerHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowScanner(false)}
            >
              <Ionicons name="close" size={32} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.scannerTitle}>Escanear código QR</Text>
          </View>

          {permission?.granted && (
            <CameraView
              style={styles.camera}
              facing="back"
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
            >
              <View style={styles.scannerOverlay}>
                <View style={styles.scannerFrame} />
                <Text style={styles.scannerInstructions}>
                  Apunta la cámara al código QR
                </Text>
              </View>
            </CameraView>
          )}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollContent: {
    flexGrow: 1,
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
  contentHeader: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E8F4FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 12,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderWidth: 0,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    paddingVertical: 16,
    letterSpacing: 2,
  },
  hint: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 8,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    gap: 8,
  },
  scanButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  claimButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  claimButtonDisabled: {
    backgroundColor: '#CCC',
  },
  claimButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoContainer: {
    backgroundColor: '#fff',
    padding: 20,
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8F4FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#000',
  },
  closeButton: {
    position: 'absolute',
    left: 20,
    top: 50,
  },
  scannerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  scannerFrame: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: '#fff',
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  scannerInstructions: {
    marginTop: 30,
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});

export default ClaimPetScreen;
