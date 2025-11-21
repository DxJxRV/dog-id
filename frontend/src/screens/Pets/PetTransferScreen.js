import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { petsAPI } from '../../services/api';
import { Loading } from '../../components';
import { isNetworkError } from '../../utils/networkUtils';
import { showToast } from '../../utils/toast';

const PetTransferScreen = ({ navigation, route }) => {
  const { petId, petName } = route.params;
  const [loading, setLoading] = useState(true);
  const [transferCode, setTransferCode] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);

  useEffect(() => {
    fetchTransferCode();
  }, []);

  const fetchTransferCode = async () => {
    try {
      setLoading(true);
      const response = await petsAPI.getTransferCode(petId);
      setTransferCode(response.data.transferCode);
      setExpiresAt(response.data.expiresAt);
    } catch (err) {
      if (isNetworkError(err)) {
        showToast.networkError();
      } else {
        showToast.error('No se pudo obtener el código de cesión');
      }
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (transferCode) {
      Clipboard.setString(transferCode);
      showToast.success('Código copiado al portapapeles');
    }
  };

  const formatExpiryDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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
        <Text style={styles.headerTitle}>Ceder Mascota</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="share-social" size={60} color="#007AFF" />
        </View>

        <Text style={styles.title}>Comparte esta mascota</Text>
        <Text style={styles.subtitle}>
          Comparte el código QR o el código de texto con el dueño de {petName}
        </Text>

        {/* Código QR */}
        <View style={styles.qrContainer}>
          {transferCode && (
            <QRCode
              value={transferCode}
              size={200}
              backgroundColor="white"
            />
          )}
        </View>

        {/* Código de texto */}
        <View style={styles.codeSection}>
          <Text style={styles.codeSectionTitle}>Código de cesión</Text>
          <View style={styles.codeContainer}>
            <View style={styles.codeBox}>
              <Text style={styles.codeText}>{transferCode}</Text>
            </View>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={handleCopyCode}
            >
              <Ionicons name="copy-outline" size={20} color="#007AFF" />
              <Text style={styles.copyButtonText}>Copiar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Información de expiración */}
        {expiresAt && (
          <View style={styles.expiryInfo}>
            <Ionicons name="time-outline" size={20} color="#8E8E93" />
            <Text style={styles.expiryText}>
              Este código expira el {formatExpiryDate(expiresAt)}
            </Text>
          </View>
        )}

        {/* Instrucciones */}
        <View style={styles.instructionsSection}>
          <Text style={styles.instructionsTitle}>¿Cómo funciona?</Text>

          <View style={styles.instructionItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.instructionText}>
              El dueño debe escanear el código QR o ingresar el código de texto en su app
            </Text>
          </View>

          <View style={styles.instructionItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.instructionText}>
              La mascota será transferida automáticamente a su cuenta
            </Text>
          </View>

          <View style={styles.instructionItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={styles.instructionText}>
              Podrás seguir viendo el historial médico de la mascota como veterinario
            </Text>
          </View>
        </View>

        <View style={styles.warningBox}>
          <Ionicons name="information-circle-outline" size={24} color="#FF9500" />
          <Text style={styles.warningText}>
            Una vez que el dueño reclame la mascota, ya no aparecerá en tu lista de mascotas
          </Text>
        </View>
      </View>
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
  content: {
    padding: 20,
  },
  iconContainer: {
    alignSelf: 'center',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E8F4FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  qrContainer: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  codeSection: {
    marginBottom: 24,
  },
  codeSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 12,
    textAlign: 'center',
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    fontWeight: '700',
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
  expiryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
  },
  expiryText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  instructionsSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
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
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FFF3CD',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE69C',
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
});

export default PetTransferScreen;
