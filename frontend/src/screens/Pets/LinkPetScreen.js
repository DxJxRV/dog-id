import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { petsAPI } from '../../services/api';
import { isNetworkError } from '../../utils/networkUtils';
import { showToast } from '../../utils/toast';

const LinkPetScreen = ({ navigation }) => {
  const [linkCode, setLinkCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const handleLinkPet = async () => {
    handleLinkPetWithCode(linkCode);
  };

  const formatCodeInput = (text) => {
    // Remover caracteres no alfanuméricos
    let cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '');

    // Limitar a 8 caracteres
    cleaned = cleaned.substring(0, 8);

    // Agregar guión después del 4to carácter
    if (cleaned.length > 4) {
      cleaned = cleaned.substring(0, 4) + '-' + cleaned.substring(4);
    }

    setLinkCode(cleaned);
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
    setLinkCode(cleanedCode);

    // Vincular automáticamente después de escanear
    setTimeout(() => {
      handleLinkPetWithCode(cleanedCode);
    }, 300);
  };

  const handleLinkPetWithCode = async (code) => {
    const codeToUse = code || linkCode;

    if (!codeToUse.trim()) {
      showToast.error('Por favor ingresa un código de vinculación', 'Campo requerido');
      return;
    }

    setLoading(true);

    try {
      const response = await petsAPI.linkPet(codeToUse.toUpperCase().trim());
      const pet = response.data.pet;

      showToast.success(`La mascota "${pet.nombre}" ha sido vinculada correctamente`);
      setTimeout(() => navigation.replace('PetDetail', { petId: pet.id }), 500);
    } catch (err) {
      if (isNetworkError(err)) {
        showToast.networkError();
      } else {
        if (err.response?.status === 404) {
          showToast.error('El código de vinculación no existe', 'Código inválido');
        } else if (err.response?.status === 400) {
          showToast.warning('Esta mascota ya está vinculada a tu cuenta', 'Ya vinculada');
        } else {
          const errorMessage = err.response?.data?.error || 'No se pudo vincular la mascota';
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
          <View style={styles.iconContainer}>
            <Ionicons name="link-outline" size={60} color="#007AFF" />
          </View>
          <Text style={styles.title}>Vincular Mascota</Text>
          <Text style={styles.subtitle}>
            Ingresa el código de vinculación proporcionado por el dueño de la mascota
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Código de vinculación</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="qr-code-outline" size={24} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={linkCode}
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
            style={[styles.linkButton, loading && styles.linkButtonDisabled]}
            onPress={handleLinkPet}
            disabled={loading || linkCode.length < 8}
          >
            <Text style={styles.linkButtonText}>
              {loading ? 'Vinculando...' : 'Vincular Mascota'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.infoItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.infoText}>
              Solicita al dueño que muestre el código de vinculación de su mascota
            </Text>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.infoText}>
              Ingresa el código en el campo de arriba
            </Text>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={styles.infoText}>
              La mascota quedará vinculada y podrás ver su historial médico
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
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 8,
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
    fontSize: 20,
    fontWeight: '600',
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
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
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
  linkButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  linkButtonDisabled: {
    backgroundColor: '#CCC',
  },
  linkButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
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

export default LinkPetScreen;
