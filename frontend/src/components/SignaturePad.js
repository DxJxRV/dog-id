import React, { useRef, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Modal, Image } from 'react-native';
import SignatureCanvas from 'react-native-signature-canvas';
import { Ionicons } from '@expo/vector-icons';

/**
 * Componente de firma digital usando canvas modal
 * @param {function} onOK - Callback que recibe la firma en base64 cuando se confirma
 * @param {function} onClear - Callback opcional cuando se limpia la firma
 * @param {string} description - Texto descriptivo opcional
 */
const SignaturePad = ({ onOK, onClear, description }) => {
  const signatureRef = useRef(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [signatureData, setSignatureData] = useState(null);

  const handleSignature = (signature) => {
    setSignatureData(signature);
    setModalVisible(false);
    if (onOK) {
      onOK(signature);
    }
  };

  const handleClear = () => {
    signatureRef.current?.clearSignature();
  };

  const handleCancel = () => {
    setModalVisible(false);
  };

  const handleRemoveSignature = () => {
    setSignatureData(null);
    if (onClear) {
      onClear();
    }
  };

  const handleEditSignature = () => {
    setModalVisible(true);
  };

  // Configuración del canvas
  const webStyle = `.m-signature-pad {
    box-shadow: none;
    border: none;
  }
  .m-signature-pad--body {
    border: none;
  }
  .m-signature-pad--footer {
    display: none;
  }
  body,html {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
  }`;

  return (
    <View style={styles.container}>
      {description && (
        <View style={styles.header}>
          <Ionicons name="create-outline" size={20} color="#007AFF" />
          <Text style={styles.description}>{description}</Text>
        </View>
      )}

      {/* Preview de la firma o botón para firmar */}
      {signatureData ? (
        <View style={styles.signaturePreviewContainer}>
          <Image
            source={{ uri: signatureData }}
            style={styles.signaturePreview}
            resizeMode="contain"
          />
          <View style={styles.previewButtons}>
            <TouchableOpacity
              style={[styles.previewButton, styles.editPreviewButton]}
              onPress={handleEditSignature}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={18} color="#007AFF" />
              <Text style={styles.editPreviewButtonText}>Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.previewButton, styles.removePreviewButton]}
              onPress={handleRemoveSignature}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={18} color="#FF3B30" />
              <Text style={styles.removePreviewButtonText}>Borrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.addSignatureButton}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="pencil-outline" size={32} color="#007AFF" />
          <Text style={styles.addSignatureButtonText}>Agregar Firma</Text>
        </TouchableOpacity>
      )}

      {/* Modal de firma */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={handleCancel}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Firme en el área blanca</Text>
            <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#000" />
            </TouchableOpacity>
          </View>

          <View style={styles.canvasWrapper}>
            <SignatureCanvas
              ref={signatureRef}
              onOK={handleSignature}
              descriptionText=""
              clearText="Limpiar"
              confirmText="Confirmar"
              webStyle={webStyle}
              autoClear={false}
              imageType="image/png"
              backgroundColor="#FFFFFF"
              penColor="#000000"
              strokeWidth={2}
            />
          </View>

          <View style={styles.modalButtonContainer}>
            <TouchableOpacity
              style={[styles.modalButton, styles.clearButton]}
              onPress={handleClear}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={20} color="#FF3B30" />
              <Text style={styles.clearButtonText}>Limpiar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, styles.confirmButton]}
              onPress={() => signatureRef.current?.readSignature()}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
              <Text style={styles.confirmButtonText}>Confirmar Firma</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  description: {
    fontSize: 14,
    color: '#3A3A3C',
    fontWeight: '500',
  },
  // Botón para agregar firma
  addSignatureButton: {
    backgroundColor: '#F2F2F7',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  addSignatureButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  // Preview de firma
  signaturePreviewContainer: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    padding: 12,
  },
  signaturePreview: {
    width: '100%',
    height: 150,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 12,
  },
  previewButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  previewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  editPreviewButton: {
    backgroundColor: '#E8F4FD',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  editPreviewButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  removePreviewButton: {
    backgroundColor: '#FFF0EE',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  removePreviewButtonText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
  },
  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  closeButton: {
    padding: 4,
  },
  canvasWrapper: {
    flex: 1,
    margin: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  clearButton: {
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  clearButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SignaturePad;
