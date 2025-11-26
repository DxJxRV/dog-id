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
// CAMBIO 1: Usamos la librería estable expo-av
import { Audio } from 'expo-av'; 
import { Ionicons } from '@expo/vector-icons';
import { showToast } from '../../utils/toast';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL, STORAGE_KEYS } from '../../utils/config';

const RecordConsultationScreen = ({ route, navigation }) => {
  const { petId, petName } = route.params;

  // Estado local para UI
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  // Referencia para mantener el objeto de grabación sin re-renderizar
  const recordingRef = useRef(null);
  const durationInterval = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Efecto de limpieza al salir
  useEffect(() => {
    return () => {
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync();
      }
    };
  }, []);

  // Efecto visual (Timer y Animación)
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

  const startRecording = async () => {
    try {
      console.log('🎤 Requesting permissions...');
      const permission = await Audio.requestPermissionsAsync();
      
      if (permission.status !== 'granted') {
        showToast.error('Se requieren permisos de micrófono');
        return;
      }

      console.log('🔧 Configuring audio mode...');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true, // Importante para grabaciones largas
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      console.log('▶️ Starting recording...');
      // Iniciar nueva grabación con calidad alta
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      recordingRef.current = recording;
      
      // Actualizar UI
      setIsRecording(true);
      setRecordingDuration(0);
      showToast.success('Grabación iniciada');
      console.log('✅ Recording started');

    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      setIsRecording(false);
      showToast.error('Error al iniciar la grabación');
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;

    // Feedback visual inmediato
    setIsRecording(false);

    try {
      console.log('⏹️ Stopping recording...');
      
      // Detener y descargar de memoria
      await recordingRef.current.stopAndUnloadAsync();
      
      // Obtener la URI del archivo guardado
      const uri = recordingRef.current.getURI();
      console.log('📍 File saved at:', uri);

      // Resetear la referencia (pero ya tenemos la URI)
      recordingRef.current = null;

      if (!uri) {
        throw new Error('No URI generated');
      }

      Alert.alert(
        'Consulta grabada',
        `Duración: ${formatDuration(recordingDuration)}\n\n¿Enviar para análisis de IA?`,
        [
          {
            text: 'Cancelar',
            style: 'cancel',
            onPress: () => setRecordingDuration(0),
          },
          {
            text: 'Enviar',
            onPress: () => uploadRecording(uri),
          },
        ]
      );
    } catch (error) {
      console.error('Failed to stop recording:', error);
      showToast.error('Error al guardar el audio');
    }
  };

  const uploadRecording = async (uri) => {
    if (!uri) return;
    setIsUploading(true);

    try {
      console.log('☁️ Uploading...', uri);
      
      const formData = new FormData();
      // Asegúrate de que el nombre tenga extensión .m4a
      formData.append('audio', {
        uri: uri,
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
          timeout: 120000, // Esperar hasta 2 mins
        }
      );

      console.log('✅ Success:', response.data);
      showToast.success('Análisis completado');

      navigation.replace('ConsultationDetail', {
        consultationId: response.data.consultation.id,
        petId,
        petName,
      });

    } catch (error) {
      console.error('Upload error:', error);
      const msg = error.response?.data?.error || 'Error al subir el audio';
      showToast.error(msg);
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

  // ... (El resto del renderizado UI se mantiene idéntico)
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
            Esto puede tardar unos segundos...
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.recordingContainer}>
            {isRecording && (
              <View style={styles.durationContainer}>
                <View style={styles.recordingDot} />
                <Text style={styles.durationText}>{formatDuration(recordingDuration)}</Text>
              </View>
            )}

            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity
                style={[
                  styles.recordButton,
                  isRecording && styles.recordButtonActive,
                ]}
                onPress={isRecording ? stopRecording : startRecording}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isRecording ? 'stop' : 'mic'}
                  size={60}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </Animated.View>

            <Text style={styles.recordButtonLabel}>
              {isRecording ? 'Detener grabación' : 'Iniciar grabación'}
            </Text>
          </View>

          {!isRecording && (
            <View style={styles.instructions}>
              <View style={styles.instructionRow}>
                <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                <Text style={styles.instructionText}>Graba toda la consulta</Text>
              </View>
              {/* Resto de instrucciones */}
            </View>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // Tus estilos originales (no cambian)
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: { alignItems: 'center', paddingTop: 40, paddingBottom: 30, backgroundColor: '#FFFFFF', borderBottomLeftRadius: 30, borderBottomRightRadius: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  title: { fontSize: 28, fontWeight: '700', color: '#1C1C1E', marginTop: 16 },
  subtitle: { fontSize: 16, color: '#8E8E93', marginTop: 8, textAlign: 'center', paddingHorizontal: 32 },
  petName: { fontSize: 18, fontWeight: '600', color: '#007AFF', marginTop: 12 },
  recordingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  durationContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 40 },
  recordingDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#FF3B30', marginRight: 12 },
  durationText: { fontSize: 48, fontWeight: '700', color: '#1C1C1E', fontVariant: ['tabular-nums'] },
  recordButton: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#007AFF', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 12 },
  recordButtonActive: { backgroundColor: '#FF3B30', shadowColor: '#FF3B30' },
  recordButtonLabel: { fontSize: 18, fontWeight: '600', color: '#1C1C1E', marginTop: 24 },
  uploadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  uploadingText: { fontSize: 22, fontWeight: '600', color: '#1C1C1E', marginTop: 24 },
  uploadingSubtext: { fontSize: 16, color: '#8E8E93', marginTop: 8, textAlign: 'center' },
  instructions: { padding: 24, marginHorizontal: 20, marginBottom: 20, backgroundColor: '#FFFFFF', borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  instructionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  instructionText: { fontSize: 16, color: '#1C1C1E', marginLeft: 12, flex: 1 },
});

export default RecordConsultationScreen;