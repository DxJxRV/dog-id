import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
  ActivityIndicator,
  TextInput,
  Modal,
  Linking,
  Platform,
  KeyboardAvoidingView,
  Image,
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { showToast } from '../../utils/toast';
import { prescriptionAPI, authAPI } from '../../services/api';
import { isNetworkError } from '../../utils/networkUtils';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL, STORAGE_KEYS } from '../../utils/config';
import SignaturePad from '../../components/SignaturePad';

const LiveConsultationScreen = ({ route, navigation }) => {
  const { appointmentId, petName, petId, editMode = false, prescriptionId } = route.params;
  const { user, updateUser } = useAuth();

  // Estados principales
  const [prescription, setPrescription] = useState(null);
  const [loadingPrescription, setLoadingPrescription] = useState(true);
  const [vitals, setVitals] = useState({});
  const [draftActions, setDraftActions] = useState([]);
  const [isEditMode, setIsEditMode] = useState(editMode);

  // Estados de grabación
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [processingAudio, setProcessingAudio] = useState(false);

  // Modal de medicamento
  const [showMedicationModal, setShowMedicationModal] = useState(false);
  const [editingMedication, setEditingMedication] = useState(null);
  const [medicationForm, setMedicationForm] = useState({
    medication: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: '',
  });

  // Modal de teléfono
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [pendingShareUrl, setPendingShareUrl] = useState('');

  // Modal de firma
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [vetSignature, setVetSignature] = useState(null);

  // Modal de cédula profesional (Value Lock)
  const [showCedulaModal, setShowCedulaModal] = useState(false);
  const [cedulaInput, setCedulaInput] = useState('');
  const [isStudent, setIsStudent] = useState(false);
  const [savingCedula, setSavingCedula] = useState(false);

  // Referencias
  const recordingRef = useRef(null);
  const durationInterval = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scrollViewRef = useRef(null);

  // Cargar prescription al montar
  useEffect(() => {
    loadPrescription();
    return () => {
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync();
      }
    };
  }, []);

  // Animación del botón de grabación
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();

      durationInterval.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } else {
      pulseAnim.setValue(1);
      if (durationInterval.current) clearInterval(durationInterval.current);
    }
    return () => {
      if (durationInterval.current) clearInterval(durationInterval.current);
    };
  }, [isRecording]);

  const loadPrescription = async () => {
    try {
      setLoadingPrescription(true);
      const response = await prescriptionAPI.createOrGet(appointmentId);
      setPrescription(response.data.prescription);
      console.log('✅ Prescription loaded:', response.data.prescription.id);
    } catch (error) {
      console.error('❌ Failed to load prescription:', error);
      if (isNetworkError(error)) {
        showToast.networkError();
      } else {
        showToast.error('No se pudo cargar la receta');
      }
    } finally {
      setLoadingPrescription(false);
    }
  };

  const startRecording = async () => {
    try {
      console.log('🎤 Requesting permissions...');
      const permission = await Audio.requestPermissionsAsync();

      if (permission.status !== 'granted') {
        showToast.error('Se requieren permisos de micrófono');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingDuration(0);
      showToast.success('Grabación iniciada');

    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      setIsRecording(false);
      showToast.error('Error al iniciar la grabación');
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;

    setIsRecording(false);

    try {
      console.log('⏹️ Stopping recording...');

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) {
        throw new Error('No URI generated');
      }

      // Procesar el audio con AI
      await processAudioWithAI(uri);

    } catch (error) {
      console.error('Failed to stop recording:', error);
      showToast.error('Error al guardar el audio');
    }
  };

  const processAudioWithAI = async (audioUri) => {
    setProcessingAudio(true);

    try {
      console.log('🤖 [LIVE CONSULTATION] Processing audio with AI...');
      console.log('   📍 Audio URI:', audioUri);
      console.log('   📋 Appointment ID:', appointmentId);

      // Preparar FormData con el audio
      const formData = new FormData();
      formData.append('audio', {
        uri: audioUri,
        type: 'audio/m4a',
        name: `consultation-${Date.now()}.m4a`,
      });

      // Incluir appointmentId en el body
      formData.append('appointmentId', appointmentId);

      // Obtener token de autenticación
      const token = await SecureStore.getItemAsync(STORAGE_KEYS.TOKEN);

      // Enviar audio al backend
      console.log('☁️ [LIVE CONSULTATION] Uploading audio...');
      const response = await axios.post(
        `${API_URL}/pets/${petId}/smart-consultations`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
          timeout: 120000, // 2 minutos
        }
      );

      console.log('✅ [LIVE CONSULTATION] Audio processed successfully');
      console.log('   📊 Response:', response.data);

      // Actualizar estados con la información recibida
      const { vitals: newVitals, draftActions: newDraftActions, prescriptionItems, medicationsDetected, optimizationStats } = response.data;

      // Actualizar vitals (merge con los existentes)
      if (newVitals && Object.keys(newVitals).length > 0) {
        setVitals(prev => ({
          ...prev,
          ...Object.fromEntries(
            Object.entries(newVitals).filter(([_, value]) => value !== null && value !== undefined)
          )
        }));
        console.log('   💓 Vitals updated');
      }

      // Actualizar draft actions (agregar nuevas)
      if (newDraftActions && newDraftActions.length > 0) {
        setDraftActions(prev => [...prev, ...newDraftActions]);
        console.log('   ✅ Draft actions updated:', newDraftActions.length);
      }

      // Recargar prescription para obtener items actualizados
      await loadPrescription();

      // Mostrar feedback al usuario
      const messages = [];
      if (medicationsDetected > 0) {
        messages.push(`${medicationsDetected} medicamento(s)`);
      }
      if (newDraftActions && newDraftActions.length > 0) {
        messages.push(`${newDraftActions.length} acción(es)`);
      }
      if (newVitals && Object.keys(newVitals).some(k => newVitals[k] !== null)) {
        messages.push('signos vitales');
      }

      if (messages.length > 0) {
        showToast.success(`Detectado: ${messages.join(', ')}`);
      } else {
        showToast.info('Audio procesado');
      }

      // Mostrar feedback de optimización de audio (si se optimizó)
      if (optimizationStats && optimizationStats.optimized && optimizationStats.savedSeconds > 0) {
        setTimeout(() => {
          showToast.success(`✨ Audio optimizado: Se eliminaron ${optimizationStats.savedSeconds} seg de silencio`);
        }, 1500); // Delay para no solapar con el primer toast
      }

    } catch (error) {
      console.error('❌ [LIVE CONSULTATION] Failed to process audio:', error);
      if (isNetworkError(error)) {
        showToast.networkError();
      } else {
        const errorMsg = error.response?.data?.error || 'Error al procesar el audio';
        showToast.error(errorMsg);
      }
    } finally {
      setProcessingAudio(false);
      setRecordingDuration(0);
    }
  };

  const openMedicationModal = (medication = null) => {
    if (medication) {
      setEditingMedication(medication);
      setMedicationForm({
        medication: medication.medication,
        dosage: medication.dosage,
        frequency: medication.frequency,
        duration: medication.duration || '',
        instructions: medication.instructions || '',
      });
    } else {
      setEditingMedication(null);
      setMedicationForm({
        medication: '',
        dosage: '',
        frequency: '',
        duration: '',
        instructions: '',
      });
    }
    setShowMedicationModal(true);
  };

  const saveMedication = async () => {
    if (!medicationForm.medication || !medicationForm.dosage || !medicationForm.frequency) {
      showToast.error('Completa los campos obligatorios');
      return;
    }

    try {
      if (editingMedication) {
        // Actualizar
        await prescriptionAPI.updateMedication(editingMedication.id, medicationForm);
        showToast.success('Medicamento actualizado');
      } else {
        // Crear
        await prescriptionAPI.addMedication(prescription.id, medicationForm);
        showToast.success('Medicamento agregado');
      }

      setShowMedicationModal(false);
      await loadPrescription();
    } catch (error) {
      console.error('❌ Failed to save medication:', error);
      showToast.error('Error al guardar medicamento');
    }
  };

  const deleteMedication = async (itemId) => {
    Alert.alert(
      'Eliminar medicamento',
      '¿Estás seguro de eliminar este medicamento?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await prescriptionAPI.removeMedication(itemId);
              showToast.success('Medicamento eliminado');
              await loadPrescription();
            } catch (error) {
              console.error('❌ Failed to delete medication:', error);
              showToast.error('Error al eliminar medicamento');
            }
          },
        },
      ]
    );
  };

  const finalizePrescription = async () => {
    if (!prescription || prescription.items.length === 0) {
      Alert.alert(
        'No hay medicamentos',
        'Debes agregar al menos un medicamento antes de finalizar la consulta. Usa el botón "+" para agregar medicamentos manualmente.',
        [{ text: 'Entendido' }]
      );
      return;
    }

    // VALUE LOCK: Verificar si el veterinario tiene cédula profesional
    if (!user?.cedulaProfesional) {
      setShowCedulaModal(true);
      return;
    }

    // Abrir modal de firma
    setShowSignatureModal(true);
  };

  // Guardar cédula profesional
  const handleSaveCedula = async () => {
    if (!isStudent && !cedulaInput.trim()) {
      showToast.error('Por favor ingresa tu cédula profesional o marca "Soy Estudiante"');
      return;
    }

    setSavingCedula(true);
    try {
      const cedulaValue = isStudent ? 'EN_TRAMITE' : cedulaInput.trim();

      const response = await authAPI.updateProfile({
        cedulaProfesional: cedulaValue,
      });

      // Actualizar usuario en contexto
      await updateUser({ ...user, cedulaProfesional: cedulaValue });

      showToast.success('Datos actualizados correctamente');
      setShowCedulaModal(false);
      setCedulaInput('');
      setIsStudent(false);

      // Ahora sí, abrir el modal de firma
      setShowSignatureModal(true);
    } catch (error) {
      console.error('Error saving cedula:', error);
      showToast.error('Error al guardar los datos');
    } finally {
      setSavingCedula(false);
    }
  };

  // Solo captura la firma del SignaturePad, NO cierra el modal
  const handleSignatureConfirm = (signature) => {
    setVetSignature(signature);
  };

  // Función para confirmar y procesar la receta con la firma
  const handleFinalizeWithSignature = async () => {
    if (!vetSignature) {
      showToast.error('Por favor agrega tu firma');
      return;
    }

    // Cerrar el modal de firma
    setShowSignatureModal(false);

    // CRITICAL FIX: Dar tiempo a que el Modal se cierre completamente antes de mostrar el Alert
    setTimeout(() => {
      try {
        // Mensaje diferente para edición vs creación
        const alertTitle = isEditMode ? 'Actualizar receta' : 'Finalizar consulta';

        const alertMessage = isEditMode
          ? `Se actualizará la receta con ${prescription.items.length} medicamento(s). El enlace mágico seguirá siendo válido. ¿Continuar?`
          : `Se generará la receta con ${prescription.items.length} medicamento(s). ¿Continuar?`;

        const actionButtonText = isEditMode ? 'Actualizar' : 'Finalizar';

        Alert.alert(
          alertTitle,
          alertMessage,
          [
            {
              text: 'Cancelar',
              style: 'cancel',
              onPress: () => {
                // Reabrir el modal de firma si cancela
                setShowSignatureModal(true);
              }
            },
            {
              text: actionButtonText,
              onPress: async () => {
                try {
                  // Llamar al endpoint correspondiente según el modo
                  const response = isEditMode
                    ? await prescriptionAPI.regenerate(prescription.id, {
                        signature: vetSignature,
                      })
                    : await prescriptionAPI.finalize(prescription.id, {
                        signature: vetSignature,
                      });

                  const successMessage = isEditMode
                    ? 'Receta actualizada exitosamente'
                    : 'Receta generada exitosamente';
                  showToast.success(successMessage);

                  // Mostrar opciones de compartir
                  const shareUrl = response.data.shareUrl || `${API_URL}/public/prescription/${response.data.publicToken}`;

                  const shareAlertTitle = isEditMode ? '¡Receta actualizada!' : '¡Receta lista!';
                  const shareAlertMessage = isEditMode
                    ? 'La receta ha sido actualizada. ¿Deseas compartirla nuevamente?'
                    : 'La receta ha sido generada. ¿Cómo deseas compartirla?';

                  Alert.alert(
                    shareAlertTitle,
                    shareAlertMessage,
                    [
                      {
                        text: 'WhatsApp',
                        onPress: () => {
                          navigation.goBack();
                          setTimeout(() => {
                            shareViaWhatsApp(response.data.publicToken, shareUrl);
                          }, 300);
                        },
                      },
                      {
                        text: 'Abrir link',
                        onPress: () => {
                          navigation.goBack();
                          setTimeout(() => {
                            Linking.openURL(shareUrl).catch(err => {
                              console.error('Error opening URL:', err);
                              showToast.error('No se pudo abrir el link');
                            });
                          }, 300);
                        },
                      },
                      {
                        text: 'Cerrar',
                        style: 'cancel',
                        onPress: () => {
                          navigation.goBack();
                        },
                      },
                    ]
                  );
                } catch (error) {
                  console.error('❌ Failed to process prescription:', error);

                  const errorMsg = error.response?.data?.error || `Error al ${isEditMode ? 'actualizar' : 'finalizar'} la receta`;

                  if (errorMsg.includes('without medications')) {
                    Alert.alert(
                      `No se puede ${isEditMode ? 'actualizar' : 'finalizar'}`,
                      'La receta no tiene medicamentos. Agrega al menos uno usando el botón "+" en la sección de Prescripción.',
                      [{ text: 'Entendido' }]
                    );
                  } else {
                    showToast.error(errorMsg);
                  }
                }
              },
            },
          ]
        );
      } catch (error) {
        console.error('Error mostrando confirmación:', error);
        showToast.error('Error al procesar la firma');
      }
    }, 500);
  };

  const shareViaWhatsApp = (token, shareUrl) => {
    // Construir la URL completa si no viene en shareUrl
    const fullUrl = shareUrl || `${API_URL}/public/prescription/${token}`;

    // Obtener información del propietario desde la prescription
    const owner = prescription?.appointment?.pet?.user;
    const ownerPhone = owner?.telefono;

    if (!ownerPhone) {
      // Mostrar modal para ingresar el teléfono
      setPendingShareUrl(fullUrl);
      setShowPhoneModal(true);
      return;
    }

    // Enviar con el teléfono registrado
    sendWhatsAppMessageWithUrl(ownerPhone, fullUrl);
  };

  const sendWhatsAppMessageWithUrl = (phone, fullUrl) => {
    // Formatear número de teléfono (eliminar espacios, guiones, paréntesis)
    let cleanPhone = phone.replace(/[\s\-\(\)]/g, '');

    // Agregar código de país si no lo tiene (México: 52)
    if (!cleanPhone.startsWith('52') && cleanPhone.length === 10) {
      cleanPhone = '52' + cleanPhone;
    }

    const owner = prescription?.appointment?.pet?.user;
    const ownerName = owner?.nombre || 'Estimado propietario';

    const message = `Hola ${ownerName},\n\n🐾 La receta médica para *${petName}* está lista.\n\nPuedes ver y descargar la receta completa aquí:\n${fullUrl}\n\n_Este enlace es privado y seguro._`;

    // URL de WhatsApp con número específico
    const whatsappUrl = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;

    console.log('📱 [WHATSAPP] Opening WhatsApp with message');
    console.log('   👤 Owner:', ownerName);
    console.log('   📞 Phone:', cleanPhone);
    console.log('   🔗 Share URL:', fullUrl);

    Linking.canOpenURL(whatsappUrl).then(supported => {
      if (supported) {
        return Linking.openURL(whatsappUrl);
      } else {
        // Si WhatsApp no está disponible, abrir el link en el navegador
        Alert.alert(
          'WhatsApp no disponible',
          `No se pudo abrir WhatsApp para enviar a ${ownerName}. ¿Deseas abrir el link en el navegador?`,
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Abrir',
              onPress: () => Linking.openURL(fullUrl)
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
    sendWhatsAppMessageWithUrl(phoneInput, pendingShareUrl);
    setPhoneInput('');
    setPendingShareUrl('');
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loadingPrescription) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando consulta...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Consola de Consulta</Text>
        <Text style={styles.headerSubtitle}>{petName}</Text>
      </View>

      {/* Content */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Signos Vitales */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="pulse" size={24} color="#FF9500" />
            <Text style={styles.sectionTitle}>Signos Vitales</Text>
          </View>
          <View style={styles.vitalsGrid}>
            <View style={styles.vitalCard}>
              <Text style={styles.vitalLabel}>Peso</Text>
              <Text style={styles.vitalValue}>{vitals.peso || '--'} kg</Text>
            </View>
            <View style={styles.vitalCard}>
              <Text style={styles.vitalLabel}>Temp</Text>
              <Text style={styles.vitalValue}>{vitals.temperatura || '--'} °C</Text>
            </View>
            <View style={styles.vitalCard}>
              <Text style={styles.vitalLabel}>FC</Text>
              <Text style={styles.vitalValue}>{vitals.frecuenciaCardiaca || '--'} bpm</Text>
            </View>
            <View style={styles.vitalCard}>
              <Text style={styles.vitalLabel}>FR</Text>
              <Text style={styles.vitalValue}>{vitals.frecuenciaRespiratoria || '--'} rpm</Text>
            </View>
          </View>
        </View>

        {/* Acciones/Borradores */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="checkmark-circle" size={24} color="#34C759" />
            <Text style={styles.sectionTitle}>Acciones Detectadas</Text>
          </View>
          {draftActions.length === 0 ? (
            <Text style={styles.emptyText}>No hay acciones detectadas aún</Text>
          ) : (
            draftActions.map((action, index) => (
              <View key={index} style={styles.actionCard}>
                <View style={[styles.actionIndicator, { backgroundColor: action.status === 'ready' ? '#34C759' : '#FF9500' }]} />
                <Text style={styles.actionText}>{action.name}</Text>
              </View>
            ))
          )}
        </View>

        {/* Receta */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="medical" size={24} color="#9B59B6" />
            <Text style={styles.sectionTitle}>Prescripción</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => openMedicationModal()}
            >
              <Ionicons name="add-circle" size={28} color="#007AFF" />
            </TouchableOpacity>
          </View>

          {prescription && prescription.items && prescription.items.length > 0 ? (
            prescription.items.map((item, index) => (
              <View key={item.id} style={styles.medicationCard}>
                <View style={styles.medicationHeader}>
                  <Text style={styles.medicationNumber}>{index + 1}</Text>
                  <View style={styles.medicationInfo}>
                    <Text style={styles.medicationName}>{item.medication}</Text>
                    <Text style={styles.medicationDosage}>{item.dosage} • {item.frequency}</Text>
                    {item.duration && (
                      <Text style={styles.medicationDuration}>⏱ {item.duration}</Text>
                    )}
                    {item.instructions && (
                      <Text style={styles.medicationInstructions}>💡 {item.instructions}</Text>
                    )}
                  </View>
                  <View style={styles.medicationActions}>
                    <TouchableOpacity
                      onPress={() => openMedicationModal(item)}
                      style={styles.iconButton}
                    >
                      <Ionicons name="pencil" size={20} color="#007AFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => deleteMedication(item.id)}
                      style={styles.iconButton}
                    >
                      <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No hay medicamentos agregados</Text>
          )}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Botón Flotante de Micrófono */}
      <View style={styles.floatingButtonContainer}>
        {processingAudio && (
          <View style={styles.processingIndicator}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.processingText}>Procesando audio...</Text>
          </View>
        )}

        {isRecording && (
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingTime}>{formatDuration(recordingDuration)}</Text>
          </View>
        )}

        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={[
              styles.floatingButton,
              isRecording && styles.floatingButtonActive,
            ]}
            onPress={isRecording ? stopRecording : startRecording}
            disabled={processingAudio}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isRecording ? 'stop' : 'mic'}
              size={32}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Botón Terminar Cita / Actualizar Receta */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.finalizeButton}
          onPress={finalizePrescription}
        >
          <Ionicons name={isEditMode ? "save" : "checkmark-circle"} size={24} color="#FFFFFF" />
          <Text style={styles.finalizeButtonText}>
            {isEditMode ? 'Actualizar Receta' : 'Terminar Cita'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Modal de Medicamento */}
      <Modal
        visible={showMedicationModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMedicationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingMedication ? 'Editar Medicamento' : 'Agregar Medicamento'}
              </Text>
              <TouchableOpacity onPress={() => setShowMedicationModal(false)}>
                <Ionicons name="close" size={28} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.inputLabel}>Medicamento *</Text>
              <TextInput
                style={styles.input}
                value={medicationForm.medication}
                onChangeText={(text) => setMedicationForm({ ...medicationForm, medication: text })}
                placeholder="Nombre del medicamento"
                placeholderTextColor="#8E8E93"
              />

              <Text style={styles.inputLabel}>Dosis *</Text>
              <TextInput
                style={styles.input}
                value={medicationForm.dosage}
                onChangeText={(text) => setMedicationForm({ ...medicationForm, dosage: text })}
                placeholder="Ej: 250mg, 1 tableta, 5ml"
                placeholderTextColor="#8E8E93"
              />

              <Text style={styles.inputLabel}>Frecuencia *</Text>
              <TextInput
                style={styles.input}
                value={medicationForm.frequency}
                onChangeText={(text) => setMedicationForm({ ...medicationForm, frequency: text })}
                placeholder="Ej: cada 8 horas, dos veces al día"
                placeholderTextColor="#8E8E93"
              />

              <Text style={styles.inputLabel}>Duración</Text>
              <TextInput
                style={styles.input}
                value={medicationForm.duration}
                onChangeText={(text) => setMedicationForm({ ...medicationForm, duration: text })}
                placeholder="Ej: 7 días, 2 semanas"
                placeholderTextColor="#8E8E93"
              />

              <Text style={styles.inputLabel}>Instrucciones</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={medicationForm.instructions}
                onChangeText={(text) => setMedicationForm({ ...medicationForm, instructions: text })}
                placeholder="Ej: con comida, en ayunas"
                placeholderTextColor="#8E8E93"
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity style={styles.saveButton} onPress={saveMedication}>
                <Text style={styles.saveButtonText}>Guardar</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal de Teléfono */}
      <Modal
        visible={showPhoneModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPhoneModal(false)}
      >
        <View style={styles.modalOverlay}>
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
        </View>
      </Modal>

      {/* Modal de Cédula Profesional (Value Lock) */}
      <Modal
        visible={showCedulaModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCedulaModal(false)}
      >
        <View style={styles.cedulaModalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.cedulaModalKeyboardView}
          >
            <View style={styles.cedulaModalContainer}>
              {/* Header */}
              <View style={styles.cedulaModalHeader}>
                <Ionicons name="shield-checkmark" size={48} color="#007AFF" />
                <Text style={styles.cedulaModalTitle}>Datos Profesionales Requeridos</Text>
                <Text style={styles.cedulaModalSubtitle}>
                  Para que tu receta sea válida, necesitamos tu Cédula Profesional
                </Text>
              </View>

              {/* Form */}
              <View style={styles.cedulaModalForm}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Cédula Profesional</Text>
                  <TextInput
                    style={styles.cedulaInput}
                    value={cedulaInput}
                    onChangeText={setCedulaInput}
                    placeholder="Ej: 12345678"
                    keyboardType="default"
                    editable={!isStudent}
                  />
                </View>

                {/* Checkbox Estudiante */}
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => {
                    setIsStudent(!isStudent);
                    if (!isStudent) {
                      setCedulaInput(''); // Clear input when checking student
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, isStudent && styles.checkboxChecked]}>
                    {isStudent && <Ionicons name="checkmark" size={18} color="#FFF" />}
                  </View>
                  <Text style={styles.checkboxLabel}>Soy Estudiante / Pasante</Text>
                </TouchableOpacity>

                {isStudent && (
                  <View style={styles.studentNote}>
                    <Ionicons name="information-circle-outline" size={20} color="#FF9500" />
                    <Text style={styles.studentNoteText}>
                      Se registrará tu cédula como "EN TRÁMITE"
                    </Text>
                  </View>
                )}
              </View>

              {/* Buttons */}
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
                  style={[
                    styles.cedulaSaveButton,
                    savingCedula && styles.cedulaSaveButtonDisabled,
                  ]}
                  onPress={handleSaveCedula}
                  disabled={savingCedula}
                >
                  {savingCedula ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                      <Text style={styles.cedulaSaveButtonText}>Guardar y Continuar</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Modal de Firma */}
      <Modal
        visible={showSignatureModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          setShowSignatureModal(false);
          setVetSignature(null); // Limpiar firma al cerrar sin confirmar
        }}
      >
        <View style={styles.signatureModalContainer}>
          <View style={styles.signatureModalHeader}>
            <Text style={styles.signatureModalTitle}>Firma del Veterinario</Text>
            <TouchableOpacity onPress={() => {
              setShowSignatureModal(false);
              setVetSignature(null); // Limpiar firma al cerrar sin confirmar
            }}>
              <Ionicons name="close" size={28} color="#000" />
            </TouchableOpacity>
          </View>

          <View style={styles.signatureModalContent}>
            <Text style={styles.signatureModalInfo}>
              Para finalizar la consulta, debes firmar digitalmente la receta médica.
            </Text>

            <View style={styles.signaturePadWrapper}>
              <SignaturePad
                onOK={handleSignatureConfirm}
                description=""
              />
            </View>

            <View style={styles.signatureModalNote}>
              <Ionicons name="information-circle-outline" size={20} color="#007AFF" />
              <Text style={styles.signatureModalNoteText}>
                Tu firma aparecerá en la receta médica generada
              </Text>
            </View>

            {/* Botón de confirmar solo visible cuando hay firma */}
            {vetSignature && (
              <TouchableOpacity
                style={styles.confirmSignatureButton}
                onPress={handleFinalizeWithSignature}
                activeOpacity={0.8}
              >
                <Ionicons name={isEditMode ? "save" : "checkmark-circle"} size={24} color="#FFFFFF" />
                <Text style={styles.confirmSignatureButtonText}>
                  {isEditMode ? 'Confirmar y Actualizar Receta' : 'Confirmar y Finalizar Consulta'}
                </Text>
              </TouchableOpacity>
            )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 16,
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#007AFF',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 8,
    flex: 1,
  },
  addButton: {
    padding: 4,
  },
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  vitalCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  vitalLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
  vitalValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  emptyText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  actionIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  actionText: {
    fontSize: 14,
    color: '#1C1C1E',
  },
  medicationCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#9B59B6',
  },
  medicationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  medicationNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#9B59B6',
    marginRight: 12,
    minWidth: 24,
  },
  medicationInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  medicationDosage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  medicationDuration: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 2,
  },
  medicationInstructions: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 4,
  },
  medicationActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 4,
  },
  floatingButtonContainer: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    alignItems: 'center',
  },
  processingIndicator: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  processingText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  recordingIndicator: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
  },
  recordingTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    fontVariant: ['tabular-nums'],
  },
  floatingButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingButtonActive: {
    backgroundColor: '#FF3B30',
    shadowColor: '#FF3B30',
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  finalizeButton: {
    backgroundColor: '#34C759',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  finalizeButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  modalScroll: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1C1C1E',
    marginBottom: 8,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Modal de Teléfono
  phoneModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '90%',
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
  // Modal de Firma
  signatureModalContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  signatureModalHeader: {
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
  signatureModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  signatureModalContent: {
    flex: 1,
    padding: 20,
  },
  signatureModalInfo: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
    marginBottom: 24,
    textAlign: 'center',
  },
  signaturePadWrapper: {
    flex: 1,
    marginBottom: 20,
  },
  signatureModalNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F4FD',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  signatureModalNoteText: {
    flex: 1,
    fontSize: 14,
    color: '#007AFF',
    lineHeight: 20,
  },
  confirmSignatureButton: {
    backgroundColor: '#34C759',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  confirmSignatureButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Cédula Modal Styles
  cedulaModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cedulaModalKeyboardView: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cedulaModalContainer: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  cedulaModalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  cedulaModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 16,
    textAlign: 'center',
  },
  cedulaModalSubtitle: {
    fontSize: 15,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  cedulaModalForm: {
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  cedulaInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#000',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#007AFF',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
  },
  checkboxLabel: {
    fontSize: 15,
    color: '#000',
  },
  studentNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  studentNoteText: {
    flex: 1,
    fontSize: 14,
    color: '#FF9500',
  },
  cedulaModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cedulaCancelButton: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cedulaCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
  },
  cedulaSaveButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cedulaSaveButtonDisabled: {
    opacity: 0.6,
  },
  cedulaSaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});

export default LiveConsultationScreen;
