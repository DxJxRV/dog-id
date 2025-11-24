import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import {
  useAudioRecorder,
  useAudioRecorderState,
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
} from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import { showToast } from '../../utils/toast';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL, STORAGE_KEYS } from '../../utils/config';

/**
 * Pantalla para grabar consulta veterinaria con IA
 */
const RecordConsultationScreen = ({ route, navigation }) => {
  const { petId, petName } = route.params;

  // Configuración de grabación para expo-audio v1.0.15
  const recordingOptions = {
    android: {
      extension: '.m4a',
      outputFormat: 2, // MPEG_4
      audioEncoder: 3, // AAC
      sampleRate: 44100,
      numberOfChannels: 2,
      bitRate: 128000,
    },
    ios: {
      extension: '.m4a',
      audioQuality: 127, // High quality
      sampleRate: 44100,
      numberOfChannels: 2,
      bitRate: 128000,
    },
    web: {
      mimeType: 'audio/webm',
      bitsPerSecond: 128000,
    },
  };

  const audioRecorder = useAudioRecorder(recordingOptions);
  const recorderState = useAudioRecorderState(audioRecorder);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const durationInterval = useRef(null);

  // Animación del botón de grabación
  const pulseAnim = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (recorderState.isRecording) {
      // Animación de pulso durante grabación
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Contador de duración
      durationInterval.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } else {
      pulseAnim.setValue(1);
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    }

    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    };
  }, [recorderState.isRecording]);

  const startRecording = async () => {
    try {
      console.log('🎤 Starting recording...');

      // 1. Verificar permisos de grabación con la API de expo-audio
      const { status, granted } = await requestRecordingPermissionsAsync();
      console.log('🎙️ Permission status:', status, '| Granted:', granted);

      if (!granted) {
        showToast.error('Se requieren permisos de micrófono');
        return;
      }
      console.log('✅ Permissions granted');

      // 2. Configurar audio mode con la API de expo-audio (NO expo-av)
      // Las propiedades son: allowsRecording, playsInSilentMode (sin sufijo IOS)
      console.log('🔧 Configuring audio mode for recording...');
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      console.log('✅ Audio mode configured with expo-audio API');

      // 3. Iniciar grabación
      console.log('▶️ Starting recorder...');
      await audioRecorder.record();

      setRecordingDuration(0);
      showToast.success('Grabación iniciada');
      console.log('✅ Recording started successfully');
    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);

      // Verificar si es un error de permisos
      if (error.message?.includes('permission') || error.message?.includes('Permission')) {
        showToast.error('Se requieren permisos de micrófono');
      } else if (error.code === 'ERR_RECORDING_DISABLED') {
        showToast.error('Error de configuración de audio en iOS');
      } else {
        showToast.error('No se pudo iniciar la grabación');
      }
    }
  };

  const stopRecording = async () => {
    if (!recorderState.isRecording) return;

    try {
      console.log('⏹️ Stopping recording...');

      const uri = await audioRecorder.stop();
      console.log('Recording saved to:', uri);

      // Confirmar antes de enviar
      Alert.alert(
        'Consulta grabada',
        `Duración: ${formatDuration(recordingDuration)}\n\n¿Enviar para análisis de IA?`,
        [
          {
            text: 'Cancelar',
            style: 'cancel',
            onPress: () => {
              setRecordingDuration(0);
            },
          },
          {
            text: 'Enviar',
            onPress: () => uploadRecording(uri),
          },
        ]
      );
    } catch (error) {
      console.error('Failed to stop recording:', error);
      showToast.error('Error al detener la grabación');
    }
  };

  const uploadRecording = async (uri) => {
    setIsUploading(true);

    try {
      console.log('☁️ Uploading recording...');

      const formData = new FormData();
      formData.append('audio', {
        uri,
        type: 'audio/m4a',
        name: `consultation-${Date.now()}.m4a`,
      });

      const token = await SecureStore.getItemAsync(STORAGE_KEYS.TOKEN);

      const response = await axios.post(
        `${API_URL}/pets/${petId}/smart-consultations`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
          timeout: 120000, // 2 minutos (OpenAI puede tardar)
        }
      );

      console.log('✅ Consultation created:', response.data.consultation.id);

      showToast.success('Consulta analizada con éxito');

      // Navegar al detalle de la consulta
      navigation.replace('ConsultationDetail', {
        consultationId: response.data.consultation.id,
        petId,
        petName,
      });
    } catch (error) {
      console.error('Upload error:', error);
      const errorMsg = error.response?.data?.error || 'Error al procesar la consulta';
      showToast.error(errorMsg);
    } finally {
      setIsUploading(false);
      setRecordingDuration(0);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="mic-outline" size={80} color="#007AFF" />
        <Text style={styles.title}>Consulta Inteligente</Text>
        <Text style={styles.subtitle}>Graba la consulta para análisis con IA</Text>
        <Text style={styles.petName}>{petName}</Text>
      </View>

      {isUploading ? (
        <View style={styles.uploadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.uploadingText}>Procesando con IA...</Text>
          <Text style={styles.uploadingSubtext}>
            Transcribiendo y analizando la consulta
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.recordingContainer}>
            {recorderState.isRecording && (
              <View style={styles.durationContainer}>
                <View style={styles.recordingDot} />
                <Text style={styles.durationText}>{formatDuration(recordingDuration)}</Text>
              </View>
            )}

            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity
                style={[
                  styles.recordButton,
                  recorderState.isRecording && styles.recordButtonActive,
                ]}
                onPress={recorderState.isRecording ? stopRecording : startRecording}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={recorderState.isRecording ? 'stop' : 'mic'}
                  size={60}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </Animated.View>

            <Text style={styles.recordButtonLabel}>
              {recorderState.isRecording ? 'Detener grabación' : 'Iniciar grabación'}
            </Text>
          </View>

          <View style={styles.instructions}>
            <View style={styles.instructionRow}>
              <Ionicons name="checkmark-circle" size={24} color="#34C759" />
              <Text style={styles.instructionText}>
                Graba toda la consulta veterinaria
              </Text>
            </View>
            <View style={styles.instructionRow}>
              <Ionicons name="checkmark-circle" size={24} color="#34C759" />
              <Text style={styles.instructionText}>
                Menciona signos vitales (peso, temperatura, etc.)
              </Text>
            </View>
            <View style={styles.instructionRow}>
              <Ionicons name="checkmark-circle" size={24} color="#34C759" />
              <Text style={styles.instructionText}>
                La IA generará un resumen clínico automático
              </Text>
            </View>
          </View>
        </>
      )}
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
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 30,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  petName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
    marginTop: 12,
  },
  recordingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF3B30',
    marginRight: 12,
  },
  durationText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#1C1C1E',
    fontVariant: ['tabular-nums'],
  },
  recordButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  recordButtonActive: {
    backgroundColor: '#FF3B30',
    shadowColor: '#FF3B30',
  },
  recordButtonLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 24,
  },
  uploadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  uploadingText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 24,
  },
  uploadingSubtext: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
  },
  instructions: {
    padding: 24,
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  instructionText: {
    fontSize: 16,
    color: '#1C1C1E',
    marginLeft: 12,
    flex: 1,
  },
});

export default RecordConsultationScreen;
