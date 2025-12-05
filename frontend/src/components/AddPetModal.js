import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AddPetModal = ({ visible, onClose, onNavigateToAddPet, onNavigateToLinkPet, onNavigateToQuickPet, onNavigateToClaimPet, isVet }) => {
  const insets = useSafeAreaInsets();

  if (isVet) {
    // Para veterinarios, mostrar menú con opciones
    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={onClose}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.addModal, { paddingBottom: 30 + insets.bottom }]}>
              <Text style={styles.addModalTitle}>Agregar Mascota</Text>

              <TouchableOpacity
                style={styles.addModalOption}
                onPress={() => {
                  onClose();
                  onNavigateToQuickPet();
                }}
              >
                <View style={styles.addModalIconContainer}>
                  <Ionicons name="flash" size={32} color="#007AFF" />
                </View>
                <View style={styles.addModalTextContainer}>
                  <Text style={styles.addModalOptionTitle}>Crear Mascota Rápida</Text>
                  <Text style={styles.addModalOptionSubtitle}>
                    Crea una mascota y compártela con su dueño
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#C7C7CC" />
              </TouchableOpacity>

              <View style={styles.addModalDivider} />

              <TouchableOpacity
                style={styles.addModalOption}
                onPress={() => {
                  onClose();
                  onNavigateToLinkPet();
                }}
              >
                <View style={styles.addModalIconContainer}>
                  <Ionicons name="link" size={32} color="#007AFF" />
                </View>
                <View style={styles.addModalTextContainer}>
                  <Text style={styles.addModalOptionTitle}>Vincular Mascota</Text>
                  <Text style={styles.addModalOptionSubtitle}>
                    Vincula una mascota existente a tu perfil
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#C7C7CC" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.addModalCancelButton}
                onPress={onClose}
              >
                <Text style={styles.addModalCancelText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          <View style={[styles.addModal, { paddingBottom: 30 + insets.bottom }]}>
            <Text style={styles.addModalTitle}>Agregar Mascota</Text>

            <TouchableOpacity
              style={styles.addModalOption}
              onPress={() => {
                onClose();
                onNavigateToAddPet();
              }}
            >
              <View style={styles.addModalIconContainer}>
                <Ionicons name="add-circle" size={32} color="#007AFF" />
              </View>
              <View style={styles.addModalTextContainer}>
                <Text style={styles.addModalOptionTitle}>Registrar Mascota</Text>
                <Text style={styles.addModalOptionSubtitle}>
                  Agrega una nueva mascota a tu perfil
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#C7C7CC" />
            </TouchableOpacity>

            <View style={styles.addModalDivider} />

            <TouchableOpacity
              style={styles.addModalOption}
              onPress={() => {
                onClose();
                onNavigateToClaimPet();
              }}
            >
              <View style={styles.addModalIconContainer}>
                <Ionicons name="gift" size={32} color="#007AFF" />
              </View>
              <View style={styles.addModalTextContainer}>
                <Text style={styles.addModalOptionTitle}>Reclamar Mascota</Text>
                <Text style={styles.addModalOptionSubtitle}>
                  Reclama una mascota creada por tu veterinario
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#C7C7CC" />
            </TouchableOpacity>

            <View style={styles.addModalDivider} />

            <TouchableOpacity
              style={styles.addModalOption}
              onPress={() => {
                onClose();
                onNavigateToLinkPet();
              }}
            >
              <View style={styles.addModalIconContainer}>
                <Ionicons name="link" size={32} color="#007AFF" />
              </View>
              <View style={styles.addModalTextContainer}>
                <Text style={styles.addModalOptionTitle}>Ser Co-dueño</Text>
                <Text style={styles.addModalOptionSubtitle}>
                  Escanea un código QR o ingresa un código
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#C7C7CC" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.addModalCancelButton}
              onPress={onClose}
            >
              <Text style={styles.addModalCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  addModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  addModalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginBottom: 20,
    textAlign: 'center',
  },
  addModalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  addModalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F4FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addModalTextContainer: {
    flex: 1,
  },
  addModalOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  addModalOptionSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
  },
  addModalDivider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: 12,
  },
  addModalCancelButton: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
  },
  addModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
});

export default AddPetModal;