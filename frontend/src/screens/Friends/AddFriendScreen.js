import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Clipboard,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { friendshipsAPI } from '../../services/api';
import { Loading } from '../../components';
import { isNetworkError } from '../../utils/networkUtils';
import { showToast } from '../../utils/toast';
import { useAuth } from '../../contexts/AuthContext';

const AddFriendScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [myFriendCode, setMyFriendCode] = useState(null);
  const [friendCode, setFriendCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanned, setScanned] = useState(false);

  const fetchMyFriendCode = async () => {
    try {
      setLoading(true);
      const response = await friendshipsAPI.getFriendCode();
      setMyFriendCode(response.data.friendCode);
    } catch (err) {
      if (isNetworkError(err)) {
        showToast.networkError();
      } else {
        showToast.error('No se pudo obtener tu código de amistad');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyFriendCode();
  }, []);

  const handleCopyCode = () => {
    if (myFriendCode) {
      Clipboard.setString(myFriendCode);
      showToast.success('Código copiado al portapapeles');
    }
  };

  const handleOpenScanner = async () => {
    if (!permission) {
      return;
    }

    if (!permission.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        showToast.error('Se requiere permiso de cámara para escanear QR');
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
    setFriendCode(data);
    showToast.success('Código QR escaneado');
  };

  const handleSendRequest = async () => {
    if (!friendCode.trim()) {
      showToast.error('Por favor ingresa un código de amistad');
      return;
    }

    try {
      setSending(true);
      await friendshipsAPI.sendRequest(friendCode.trim());
      showToast.success('Solicitud de amistad enviada');
      setFriendCode('');
      navigation.goBack();
    } catch (err) {
      if (isNetworkError(err)) {
        showToast.networkError();
      } else {
        const errorMsg = err.response?.data?.error || 'No se pudo enviar la solicitud';
        showToast.error(errorMsg);
      }
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Agregar Amigos</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Mi código de amistad */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tu código de amistad</Text>
        <Text style={styles.sectionSubtitle}>
          Comparte este código con tus amigos para que te agreguen
        </Text>

        <View style={styles.qrContainer}>
          {myFriendCode && (
            <QRCode
              value={myFriendCode}
              size={180}
              backgroundColor="white"
            />
          )}
        </View>

        <View style={styles.codeContainer}>
          <View style={styles.codeBox}>
            <Text style={styles.codeText}>{myFriendCode}</Text>
          </View>
          <TouchableOpacity
            style={styles.copyButton}
            onPress={handleCopyCode}
          >
            <Ionicons name="copy-outline" size={20} color="#007AFF" />
            <Text style={styles.copyButtonText}>Copiar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color="#007AFF" />
          <Text style={styles.infoText}>
            Tus amigos pueden escanear el código QR o ingresar el código manualmente
          </Text>
        </View>
      </View>

      {/* Agregar amigo */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Agregar un amigo</Text>
        <Text style={styles.sectionSubtitle}>
          Escanea el código QR o ingrésalo manualmente
        </Text>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.inputWithButton}
            placeholder="Código de amistad"
            value={friendCode}
            onChangeText={setFriendCode}
            autoCapitalize="characters"
            maxLength={10}
          />
          <TouchableOpacity
            style={styles.scanButton}
            onPress={handleOpenScanner}
          >
            <Ionicons name="qr-code-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.sendButton, sending && styles.sendButtonDisabled]}
          onPress={handleSendRequest}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="person-add-outline" size={20} color="#fff" />
              <Text style={styles.sendButtonText}>Enviar solicitud</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.instructionsSection}>
        <Text style={styles.instructionsTitle}>¿Cómo funciona?</Text>

        <View style={styles.instructionItem}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>1</Text>
          </View>
          <Text style={styles.instructionText}>
            Comparte tu código QR o código de texto con tus amigos
          </Text>
        </View>

        <View style={styles.instructionItem}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>2</Text>
          </View>
          <Text style={styles.instructionText}>
            Ellos escanearán el QR o ingresarán tu código para enviarte una solicitud
          </Text>
        </View>

        <View style={styles.instructionItem}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>3</Text>
          </View>
          <Text style={styles.instructionText}>
            Acepta sus solicitudes y podrán ver las mascotas de cada uno
          </Text>
        </View>
      </View>

      {/* Modal de scanner QR */}
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
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.scannerTitle}>Escanear Código QR</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.cameraContainer}>
            <CameraView
              style={StyleSheet.absoluteFillObject}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ["qr"],
              }}
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            >
              <View style={styles.scannerOverlay}>
                <View style={styles.scannerBox} />
              </View>
            </CameraView>
          </View>

          <View style={styles.scannerFooter}>
            <Text style={styles.scannerInstruction}>
              Coloca el código QR dentro del marco
            </Text>
          </View>
        </View>
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
  section: {
    backgroundColor: '#fff',
    marginTop: 12,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 20,
  },
  qrContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    marginBottom: 16,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  codeBox: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  codeText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#007AFF',
    letterSpacing: 2,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F4FD',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#E8F4FD',
    padding: 12,
    borderRadius: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#007AFF',
    lineHeight: 18,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#F2F2F7',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    color: '#000',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  inputWithButton: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    color: '#000',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  scanButton: {
    width: 56,
    height: 56,
    backgroundColor: '#E8F4FD',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  instructionsSection: {
    backgroundColor: '#fff',
    marginTop: 12,
    marginBottom: 32,
    padding: 20,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 20,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: '#000',
    lineHeight: 20,
    paddingTop: 4,
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  closeButton: {
    padding: 8,
  },
  scannerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  scannerBox: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  scannerFooter: {
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
  },
  scannerInstruction: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
  },
});

export default AddFriendScreen;
