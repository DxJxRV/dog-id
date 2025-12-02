import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { prescriptionAPI } from '../../services/api';
import { showToast } from '../../utils/toast';
import { Loading } from '../../components';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { API_URL } from '../../utils/config';

const CompletedConsultationScreen = ({ route, navigation }) => {
  const { appointmentId } = route.params;

  const [loading, setLoading] = useState(true);
  const [prescription, setPrescription] = useState(null);
  const [appointment, setAppointment] = useState(null);

  // Modal de teléfono
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  // Recargar datos cuando la pantalla vuelve al foco (después de editar)
  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [appointmentId])
  );

  const loadData = async () => {
    setLoading(true);
    try {
      // Obtener la prescription usando el appointmentId
      const response = await prescriptionAPI.getOrCreateByAppointment(appointmentId);
      const prescriptionData = response.data.prescription;

      setPrescription(prescriptionData);

      // El appointment viene incluido en la prescription
      if (prescriptionData.appointment) {
        setAppointment(prescriptionData.appointment);
      }

    } catch (error) {
      console.error('❌ Failed to load completed consultation:', error);
      showToast.error('Error al cargar la consulta');
    } finally {
      setLoading(false);
    }
  };

  const openPDF = async () => {
    if (!prescription || !prescription.publicToken) {
      showToast.error('La receta aún no ha sido finalizada');
      return;
    }

    try {
      const url = `${API_URL}/public/prescription/${prescription.publicToken}/pdf`;
      await Linking.openURL(url);
    } catch (error) {
      console.error('Error opening PDF:', error);
      showToast.error('No se pudo abrir el PDF');
    }
  };

  const shareViaWhatsApp = () => {
    if (!prescription || !prescription.publicToken) {
      showToast.error('La receta aún no ha sido finalizada');
      return;
    }

    // Obtener información del propietario
    const owner = appointment?.pet?.user;
    const ownerPhone = owner?.telefono;

    if (!ownerPhone) {
      // Mostrar modal para ingresar el teléfono
      setShowPhoneModal(true);
      return;
    }

    // Enviar con el teléfono registrado
    sendWhatsAppMessage(ownerPhone);
  };

  const editPrescription = () => {
    if (!prescription || !appointment) {
      showToast.error('No se puede editar la receta');
      return;
    }

    // Navegar a LiveConsultationScreen en modo edición
    navigation.navigate('LiveConsultation', {
      appointmentId: appointment.id,
      petName: appointment.pet?.nombre || 'Mascota',
      petId: appointment.pet?.id,
      editMode: true,
      prescriptionId: prescription.id
    });
  };

  const sendWhatsAppMessage = (phone) => {
    // Formatear número de teléfono (eliminar espacios, guiones, paréntesis)
    let cleanPhone = phone.replace(/[\s\-\(\)]/g, '');

    // Agregar código de país si no lo tiene (México: 52)
    if (!cleanPhone.startsWith('52') && cleanPhone.length === 10) {
      cleanPhone = '52' + cleanPhone;
    }

    // Construir el mensaje
    const shareUrl = `${API_URL}/public/prescription/${prescription.publicToken}`;
    const petName = appointment?.pet?.nombre || 'tu mascota';
    const owner = appointment?.pet?.user;
    const ownerName = owner?.nombre || 'Estimado propietario';

    const message = `Hola ${ownerName},\n\n🐾 La receta médica para *${petName}* está lista.\n\nPuedes ver y descargar la receta completa aquí:\n${shareUrl}\n\n_Este enlace es privado y seguro._`;

    // URL de WhatsApp con número específico
    const whatsappUrl = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;

    console.log('📱 Opening WhatsApp for owner:', ownerName);
    console.log('📞 Phone:', cleanPhone);

    Linking.canOpenURL(whatsappUrl).then(supported => {
      if (supported) {
        return Linking.openURL(whatsappUrl);
      } else {
        Alert.alert(
          'WhatsApp no disponible',
          `No se pudo abrir WhatsApp para enviar a ${ownerName}. ¿Deseas copiar el mensaje?`,
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Copiar',
              onPress: () => {
                showToast.info('Mensaje copiado');
              }
            }
          ]
        );
      }
    }).catch(err => {
      console.error('Error opening WhatsApp:', err);
      showToast.error('No se pudo abrir WhatsApp');
    });
  };

  const handlePhoneSubmit = () => {
    if (!phoneInput || phoneInput.trim().length < 10) {
      showToast.error('Ingresa un número de teléfono válido (10 dígitos)');
      return;
    }

    setShowPhoneModal(false);
    sendWhatsAppMessage(phoneInput);
    setPhoneInput('');
  };

  if (loading) {
    return <Loading />;
  }

  if (!prescription || !appointment) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#FF3B30" />
        <Text style={styles.errorText}>No se encontró la consulta</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isFinalized = prescription.status === 'FINALIZED';
  const medicationCount = prescription.items?.length || 0;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerIconContainer}>
            <Ionicons name="checkmark-circle" size={48} color="#34C759" />
          </View>
          <Text style={styles.headerTitle}>Consulta Completada</Text>
          <Text style={styles.headerSubtitle}>
            {appointment.pet.nombre} • {format(parseISO(appointment.startDateTime), "d 'de' MMMM, yyyy", { locale: es })}
          </Text>
          {prescription.vet && (
            <Text style={styles.headerVet}>
              Dr(a). {prescription.vet.nombre}
            </Text>
          )}
        </View>

        {/* Status Badge */}
        {isFinalized ? (
          <View style={styles.statusBadge}>
            <Ionicons name="document-text" size={20} color="#34C759" />
            <Text style={styles.statusBadgeText}>Receta Generada</Text>
          </View>
        ) : (
          <View style={[styles.statusBadge, styles.statusBadgeDraft]}>
            <Ionicons name="create-outline" size={20} color="#FF9500" />
            <Text style={[styles.statusBadgeText, styles.statusBadgeTextDraft]}>Borrador</Text>
          </View>
        )}

        {/* Diagnóstico */}
        {prescription.diagnosis && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="medical" size={24} color="#007AFF" />
              <Text style={styles.sectionTitle}>Diagnóstico</Text>
            </View>
            <View style={styles.diagnosisCard}>
              <Text style={styles.diagnosisText}>{prescription.diagnosis}</Text>
            </View>
          </View>
        )}

        {/* Tratamiento */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="medkit" size={24} color="#007AFF" />
            <Text style={styles.sectionTitle}>Tratamiento Prescrito</Text>
            <Text style={styles.medicationCount}>({medicationCount})</Text>
          </View>

          {medicationCount > 0 ? (
            <View style={styles.medicationsContainer}>
              {prescription.items.map((item, index) => (
                <View key={item.id} style={styles.medicationCard}>
                  <View style={styles.medicationHeader}>
                    <View style={styles.medicationNumberBadge}>
                      <Text style={styles.medicationNumber}>{index + 1}</Text>
                    </View>
                    <Text style={styles.medicationName}>{item.medication}</Text>
                  </View>
                  <View style={styles.medicationDetails}>
                    <View style={styles.medicationDetailRow}>
                      <Ionicons name="flask-outline" size={16} color="#8E8E93" />
                      <Text style={styles.medicationDetailLabel}>Dosis:</Text>
                      <Text style={styles.medicationDetailValue}>{item.dosage}</Text>
                    </View>
                    <View style={styles.medicationDetailRow}>
                      <Ionicons name="time-outline" size={16} color="#8E8E93" />
                      <Text style={styles.medicationDetailLabel}>Frecuencia:</Text>
                      <Text style={styles.medicationDetailValue}>{item.frequency}</Text>
                    </View>
                    {item.duration && (
                      <View style={styles.medicationDetailRow}>
                        <Ionicons name="calendar-outline" size={16} color="#8E8E93" />
                        <Text style={styles.medicationDetailLabel}>Duración:</Text>
                        <Text style={styles.medicationDetailValue}>{item.duration}</Text>
                      </View>
                    )}
                    {item.instructions && (
                      <View style={styles.instructionsContainer}>
                        <Ionicons name="information-circle-outline" size={16} color="#007AFF" />
                        <Text style={styles.instructionsText}>{item.instructions}</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="file-tray-outline" size={48} color="#C7C7CC" />
              <Text style={styles.emptyStateText}>No hay medicamentos recetados</Text>
            </View>
          )}
        </View>

        {/* Notas */}
        {prescription.notes && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="clipboard-outline" size={24} color="#007AFF" />
              <Text style={styles.sectionTitle}>Notas Adicionales</Text>
            </View>
            <View style={styles.notesCard}>
              <Text style={styles.notesText}>{prescription.notes}</Text>
            </View>
          </View>
        )}

        {/* Espaciado para botones */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Floating Action Buttons */}
      {isFinalized && (
        <View style={styles.floatingActions}>
          <TouchableOpacity
            style={styles.primaryActionButton}
            onPress={openPDF}
            activeOpacity={0.8}
          >
            <Ionicons name="document-text" size={24} color="#FFFFFF" />
            <Text style={styles.primaryActionButtonText}>Ver Receta PDF</Text>
          </TouchableOpacity>

          <View style={styles.secondaryActionsRow}>
            <TouchableOpacity
              style={styles.editActionButton}
              onPress={editPrescription}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={20} color="#FF9500" />
              <Text style={styles.editActionButtonText}>Corregir</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryActionButton}
              onPress={shareViaWhatsApp}
              activeOpacity={0.8}
            >
              <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
              <Text style={styles.secondaryActionButtonText}>WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Modal de Teléfono */}
      <Modal
        visible={showPhoneModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPhoneModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowPhoneModal(false)}
          >
            <TouchableOpacity
              style={styles.phoneModalContainer}
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <View style={styles.phoneModalHeader}>
                <Ionicons name="call-outline" size={24} color="#007AFF" />
                <Text style={styles.phoneModalTitle}>Número de WhatsApp</Text>
                <TouchableOpacity onPress={() => setShowPhoneModal(false)}>
                  <Ionicons name="close" size={24} color="#8E8E93" />
                </TouchableOpacity>
              </View>

              {/* Info */}
              <Text style={styles.phoneModalInfo}>
                El propietario no tiene un teléfono registrado. Ingresa el número de WhatsApp para enviar la receta:
              </Text>

              {/* Input */}
              <TextInput
                style={styles.phoneInput}
                placeholder="5512345678"
                placeholderTextColor="#C7C7CC"
                value={phoneInput}
                onChangeText={setPhoneInput}
                keyboardType="phone-pad"
                maxLength={15}
                autoFocus
              />

              {/* Buttons */}
              <View style={styles.phoneModalButtons}>
                <TouchableOpacity
                  style={styles.phoneModalCancelButton}
                  onPress={() => setShowPhoneModal(false)}
                >
                  <Text style={styles.phoneModalCancelButtonText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.phoneModalSendButton}
                  onPress={handlePhoneSubmit}
                >
                  <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" />
                  <Text style={styles.phoneModalSendButtonText}>Enviar</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#F2F2F7',
  },
  errorText: {
    fontSize: 18,
    color: '#8E8E93',
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Header
  headerCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerIconContainer: {
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 4,
  },
  headerVet: {
    fontSize: 14,
    color: '#007AFF',
    marginTop: 4,
  },
  // Status Badge
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F9EF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: 'center',
    marginTop: 16,
    marginBottom: 8,
    gap: 8,
  },
  statusBadgeDraft: {
    backgroundColor: '#FFF3E0',
  },
  statusBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34C759',
  },
  statusBadgeTextDraft: {
    color: '#FF9500',
  },
  // Sections
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  medicationCount: {
    fontSize: 16,
    color: '#8E8E93',
    marginLeft: 4,
  },
  // Diagnóstico
  diagnosisCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  diagnosisText: {
    fontSize: 16,
    color: '#1C1C1E',
    lineHeight: 24,
  },
  // Medications
  medicationsContainer: {
    gap: 12,
  },
  medicationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  medicationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  medicationNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  medicationNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  medicationName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  medicationDetails: {
    gap: 8,
  },
  medicationDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  medicationDetailLabel: {
    fontSize: 14,
    color: '#8E8E93',
    minWidth: 80,
  },
  medicationDetailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1C1E',
    flex: 1,
  },
  instructionsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 8,
    padding: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
  },
  instructionsText: {
    fontSize: 13,
    color: '#1C1C1E',
    lineHeight: 18,
    flex: 1,
  },
  // Empty State
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
  },
  // Notas
  notesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  notesText: {
    fontSize: 15,
    color: '#1C1C1E',
    lineHeight: 22,
  },
  // Floating Actions
  floatingActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    gap: 10,
  },
  primaryActionButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryActionButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  editActionButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#FF9500',
  },
  editActionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF9500',
  },
  secondaryActionButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#25D366',
  },
  secondaryActionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#25D366',
  },
  // Modal de Teléfono
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  phoneModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  phoneModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  phoneModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    flex: 1,
    marginLeft: 12,
  },
  phoneModalInfo: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 20,
  },
  phoneInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginBottom: 20,
  },
  phoneModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  phoneModalCancelButton: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  phoneModalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  phoneModalSendButton: {
    flex: 1,
    backgroundColor: '#25D366',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  phoneModalSendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default CompletedConsultationScreen;
