import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Animated,
  PanResponder,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { showToast } from '../../utils/toast';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL, STORAGE_KEYS } from '../../utils/config';
import { generatePresignedUrl } from '../../utils/presignedUrl';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MINI_PLAYER_HEIGHT = 70;

/**
 * ConsultationDetailScreen - Diseño Spotify
 * MiniPlayer persistente + ExpandedPlayer con navegación por tags
 */
const ConsultationDetailScreen = ({ route, navigation }) => {
  const { consultationId } = route.params;

  // Estados principales
  const [consultation, setConsultation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [audioUrl, setAudioUrl] = useState(null);

  // Audio player
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [hasFinished, setHasFinished] = useState(false);

  // UI States
  const [isExpanded, setIsExpanded] = useState(false);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const positionInterval = useRef(null);

  // Collapse states
  const [isTranscriptionExpanded, setIsTranscriptionExpanded] = useState(true);
  const [isHighlightsExpanded, setIsHighlightsExpanded] = useState(true);
  const [isVitalsExpanded, setIsVitalsExpanded] = useState(true);

  useEffect(() => {
    fetchConsultation();
    return () => {
      // Cleanup de forma segura sin bloquear la navegación
      if (positionInterval.current) {
        clearInterval(positionInterval.current);
      }
      if (sound) {
        // No usar await aquí, dejar que se limpie en background
        sound.stopAsync().catch(() => {});
        sound.unloadAsync().catch(() => {});
      }
    };
  }, []);

  // Listener para limpiar audio antes de salir (iOS fix)
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', async () => {
      // Pausar audio inmediatamente
      if (sound) {
        try {
          await sound.pauseAsync();
        } catch (e) {
          // Ignorar errores
        }
      }
      // Limpiar intervals
      if (positionInterval.current) {
        clearInterval(positionInterval.current);
      }
    });

    return unsubscribe;
  }, [navigation, sound]);

  // Update current word highlight
  useEffect(() => {
    if (isPlaying && consultation?.transcriptionJson) {
      positionInterval.current = setInterval(async () => {
        if (sound) {
          const status = await sound.getStatusAsync();
          if (status.isLoaded) {
            const currentPos = status.positionMillis / 1000;
            setCurrentTime(currentPos);

            // Find current word
            const currentWord = consultation.transcriptionJson.findIndex((word, index) => {
              const nextWord = consultation.transcriptionJson[index + 1];
              return currentPos >= word.start && (!nextWord || currentPos < nextWord.start);
            });
            setCurrentWordIndex(currentWord);
          }
        }
      }, 100);
    } else {
      if (positionInterval.current) {
        clearInterval(positionInterval.current);
      }
    }

    return () => {
      if (positionInterval.current) {
        clearInterval(positionInterval.current);
      }
    };
  }, [isPlaying, sound, consultation]);

  const fetchConsultation = async () => {
    try {
      setLoading(true);

      const token = await SecureStore.getItemAsync(STORAGE_KEYS.TOKEN);
      const response = await axios.get(
        `${API_URL}/smart-consultations/${consultationId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const consultationData = response.data.consultation;

      // Generar presigned URL para el audio
      const presignedAudioUrl = await generatePresignedUrl(consultationData.audioUrl, 7200);

      setConsultation(consultationData);
      setAudioUrl(presignedAudioUrl);

      // Load audio
      await loadAudio(presignedAudioUrl);
    } catch (error) {
      console.error('Error fetching consultation:', error);
      showToast.error('Error al cargar la consulta');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const loadAudio = async (url) => {
    try {
      setIsBuffering(true);

      // Configurar modo de audio para reproducción (no grabación)
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: false },
        onPlaybackStatusUpdate
      );
      setSound(newSound);
      setIsBuffering(false);
    } catch (error) {
      console.error('Error loading audio:', error);
      showToast.error('Error al cargar el audio');
      setIsBuffering(false);
    }
  };

  const onPlaybackStatusUpdate = (status) => {
    if (status.isLoaded) {
      setDuration(status.durationMillis / 1000);
      setIsPlaying(status.isPlaying);
      setIsBuffering(status.isBuffering || false);
      setHasFinished(status.didJustFinish || false);

      // Reset al finalizar
      if (status.didJustFinish) {
        setIsPlaying(false);
      }
    }
  };

  const handlePlayPause = async () => {
    if (!sound || isBuffering) return;

    try {
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        // Si terminó, reiniciar desde el principio
        if (hasFinished) {
          await sound.setPositionAsync(0);
          setHasFinished(false);
          await sound.playAsync();
        } else if (isPlaying) {
          await sound.pauseAsync();
        } else {
          await sound.playAsync();
        }
      }
    } catch (error) {
      console.error('Play/Pause error:', error);
    }
  };

  const seekToTime = async (seconds) => {
    if (!sound) return;

    try {
      const clampedSeconds = Math.max(0, Math.min(seconds, duration));
      await sound.setPositionAsync(clampedSeconds * 1000);
      setCurrentTime(clampedSeconds);
      setHasFinished(false);
    } catch (error) {
      console.error('Seek error:', error);
    }
  };

  const skipBackward = () => {
    seekToTime(currentTime - 5);
  };

  const skipForward = () => {
    seekToTime(currentTime + 5);
  };

  const handleWordPress = async (wordData) => {
    if (!sound) return;

    try {
      // Saltar al tiempo de la palabra
      await seekToTime(wordData.start);

      // Si el audio no está reproduciendo, empezar a reproducir
      if (!isPlaying) {
        await sound.playAsync();
      }
    } catch (error) {
      console.error('Error playing from word:', error);
    }
  };

  const handleTagPress = async (highlight) => {
    if (!sound || !consultation?.transcriptionJson) return;

    try {
      let seekTime = 0;

      // Si tiene timestamp del backend, usarlo directamente
      if (highlight.timestamp && highlight.timestamp > 0) {
        seekTime = Math.max(0, highlight.timestamp - 3);
      } else if (highlight.snippet || highlight.triggerPhrase) {
        // Fallback: buscar las primeras palabras del snippet en la transcripción
        const searchText = (highlight.snippet || highlight.triggerPhrase).toLowerCase();
        const firstWords = searchText.split(' ').slice(0, 3); // Primeras 3 palabras

        // Buscar coincidencia simple en transcriptionJson
        for (let i = 0; i < consultation.transcriptionJson.length; i++) {
          const word = consultation.transcriptionJson[i].word.toLowerCase();

          // Si encontramos la primera palabra del snippet
          if (word === firstWords[0]) {
            seekTime = Math.max(0, consultation.transcriptionJson[i].start - 3);
            break;
          }
        }
      }

      // Saltar al tiempo encontrado
      await seekToTime(seekTime);

      // Si el audio no está reproduciendo, empezar a reproducir
      if (!isPlaying) {
        await sound.playAsync();
      }

      // Abrir player expandido con animación
      openExpandedPlayer();
    } catch (error) {
      console.error('Error playing from highlight:', error);
    }
  };

  const openExpandedPlayer = () => {
    setIsExpanded(true);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
  };

  const closeExpandedPlayer = () => {
    Animated.spring(slideAnim, {
      toValue: SCREEN_HEIGHT,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start(() => {
      setIsExpanded(false);
    });
  };

  const getSeverityColor = (severity) => {
    const colors = {
      HIGH: '#DC2626',      // Rojo
      MEDIUM: '#EA580C',    // Naranja
      LOW: '#64748B',       // Gris azulado
    };
    return colors[severity] || '#8E8E93';
  };

  const getSeverityBackground = (severity) => {
    const backgrounds = {
      HIGH: '#FEE2E2',      // Rojo suave
      MEDIUM: '#FFEDD5',    // Naranja suave
      LOW: '#F1F5F9',       // Gris azulado suave
    };
    return backgrounds[severity] || '#F2F2F7';
  };

  const getCategoryColor = (category) => {
    const colors = {
      URGENCIA: '#DC2626',      // Rojo
      SINTOMA: '#3B82F6',       // Azul
      DIAGNOSTICO: '#7C3AED',   // Morado
      TRATAMIENTO: '#16A34A',   // Verde
      VITAL: '#0891B2',         // Cyan
    };
    return colors[category] || '#8E8E93';
  };

  const getCategoryBackground = (category) => {
    const backgrounds = {
      URGENCIA: '#FEE2E2',      // Rojo suave
      SINTOMA: '#DBEAFE',       // Azul suave
      DIAGNOSTICO: '#F3E8FF',   // Morado suave
      TRATAMIENTO: '#DCFCE7',   // Verde suave
      VITAL: '#CFFAFE',         // Cyan suave
    };
    return backgrounds[category] || '#F2F2F7';
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando consulta...</Text>
      </View>
    );
  }

  if (!consultation) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Main Content - Vitals Summary */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentPadding}>
        {/* Información básica */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color="#8E8E93" />
            <Text style={styles.infoText}>
              {new Date(consultation.createdAt).toLocaleDateString('es-MX', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={20} color="#8E8E93" />
            <Text style={styles.infoText}>Dr. {consultation.vet.nombre}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={20} color="#8E8E93" />
            <Text style={styles.infoText}>{formatTime(consultation.duration)}</Text>
          </View>
        </View>

        {/* Transcripción Completa */}
        {consultation.transcriptionJson && consultation.transcriptionJson.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => setIsTranscriptionExpanded(!isTranscriptionExpanded)}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionTitle}>Transcripción Completa</Text>
              <Ionicons
                name={isTranscriptionExpanded ? 'chevron-up' : 'chevron-down'}
                size={24}
                color="#8E8E93"
              />
            </TouchableOpacity>

            {isTranscriptionExpanded && (
              <View style={styles.transcriptionContainer}>
                <Text style={styles.transcriptionHint}>
                  Toca cualquier palabra para saltar a ese momento
                </Text>
                <View style={styles.transcriptionText}>
                  {consultation.transcriptionJson.map((wordData, index) => {
                    const isCurrentWord = index === currentWordIndex;
                    return (
                      <TouchableOpacity
                        key={index}
                        onPress={() => handleWordPress(wordData)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.transcriptionWord,
                            isCurrentWord && styles.transcriptionWordActive,
                          ]}
                        >
                          {wordData.word}{' '}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Medical Highlights */}
        {consultation.medicalHighlights && consultation.medicalHighlights.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => setIsHighlightsExpanded(!isHighlightsExpanded)}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionTitle}>Hallazgos Clínicos</Text>
              <Ionicons
                name={isHighlightsExpanded ? 'chevron-up' : 'chevron-down'}
                size={24}
                color="#8E8E93"
              />
            </TouchableOpacity>

            {isHighlightsExpanded && (
              <View>
            {consultation.medicalHighlights.map((highlight, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.highlightCard,
                  { borderLeftColor: getCategoryColor(highlight.category) },
                ]}
                onPress={() => handleTagPress(highlight)}
                activeOpacity={0.7}
              >
                <View style={styles.highlightHeader}>
                  <View
                    style={[
                      styles.highlightDot,
                      { backgroundColor: getCategoryColor(highlight.category) },
                    ]}
                  />
                  <Text style={styles.highlightTag}>
                    {highlight.tag}
                  </Text>
                  <View
                    style={[
                      styles.highlightBadge,
                      { backgroundColor: getCategoryBackground(highlight.category) },
                    ]}
                  >
                    <Text
                      style={[
                        styles.highlightCategory,
                        { color: getCategoryColor(highlight.category) },
                      ]}
                    >
                      {highlight.category}
                    </Text>
                  </View>
                </View>
                <Text style={styles.highlightPhrase}>"{highlight.snippet}"</Text>
                <View style={styles.highlightFooter}>
                  <Ionicons name="play-circle" size={16} color="#007AFF" />
                  <Text style={styles.highlightAction}>Tocar para escuchar</Text>
                </View>
              </TouchableOpacity>
            ))}
              </View>
            )}
          </View>
        )}

        {/* Signos Vitales */}
        {consultation.extractedVitals && Object.keys(consultation.extractedVitals).length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => setIsVitalsExpanded(!isVitalsExpanded)}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionTitle}>Signos Vitales</Text>
              <Ionicons
                name={isVitalsExpanded ? 'chevron-up' : 'chevron-down'}
                size={24}
                color="#8E8E93"
              />
            </TouchableOpacity>

            {isVitalsExpanded && (
            <View style={styles.vitalsGrid}>
              {consultation.extractedVitals.peso && (
                <View style={styles.vitalCard}>
                  <Ionicons name="scale-outline" size={24} color="#007AFF" />
                  <Text style={styles.vitalValue}>{consultation.extractedVitals.peso} kg</Text>
                  <Text style={styles.vitalLabel}>Peso</Text>
                </View>
              )}
              {consultation.extractedVitals.temperatura && (
                <View style={styles.vitalCard}>
                  <Ionicons name="thermometer-outline" size={24} color="#FF9500" />
                  <Text style={styles.vitalValue}>{consultation.extractedVitals.temperatura}°C</Text>
                  <Text style={styles.vitalLabel}>Temperatura</Text>
                </View>
              )}
              {consultation.extractedVitals.frecuenciaCardiaca && (
                <View style={styles.vitalCard}>
                  <Ionicons name="heart-outline" size={24} color="#FF3B30" />
                  <Text style={styles.vitalValue}>{consultation.extractedVitals.frecuenciaCardiaca} bpm</Text>
                  <Text style={styles.vitalLabel}>FC</Text>
                </View>
              )}
            </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* MiniPlayer - Barra inferior persistente */}
      <View style={styles.miniPlayerContainer}>
        {/* Barra de progreso delgada */}
        <View style={styles.miniProgressBar}>
          <View
            style={[
              styles.miniProgressFill,
              { width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' },
            ]}
          />
        </View>

        <TouchableOpacity
          style={styles.miniPlayer}
          onPress={openExpandedPlayer}
          activeOpacity={0.9}
        >
          <TouchableOpacity
            style={styles.miniPlayButton}
            onPress={handlePlayPause}
            disabled={isBuffering}
          >
            {isBuffering ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons
                name={hasFinished ? 'reload' : isPlaying ? 'pause' : 'play'}
                size={24}
                color="#FFFFFF"
              />
            )}
          </TouchableOpacity>
          <View style={styles.miniPlayerInfo}>
            <Text style={styles.miniPlayerTitle} numberOfLines={1}>
              Consulta Veterinaria
            </Text>
            <Text style={styles.miniPlayerTime}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </Text>
          </View>
          <Ionicons name="chevron-up" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* ExpandedPlayer - Modal fullscreen */}
      <Modal
        visible={isExpanded}
        transparent
        animationType="none"
        onRequestClose={closeExpandedPlayer}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
          <Animated.View
            style={[
              styles.expandedPlayer,
              {
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Header */}
            <View style={styles.expandedHeader}>
            <TouchableOpacity onPress={closeExpandedPlayer}>
              <Ionicons name="chevron-down" size={28} color="#1C1C1E" />
            </TouchableOpacity>
            <Text style={styles.expandedTitle}>Transcripción</Text>
            <View style={{ width: 28 }} />
          </View>

          {/* Tags Header - Navegación rápida */}
          {consultation.medicalHighlights && consultation.medicalHighlights.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tagsScrollView}
              contentContainerStyle={styles.tagsScrollContent}
            >
              {consultation.medicalHighlights.map((highlight, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.tagChip}
                  onPress={() => handleTagPress(highlight)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.tagChipDot,
                      { backgroundColor: getCategoryColor(highlight.category) },
                    ]}
                  />
                  <Text
                    style={[
                      styles.tagChipText,
                      { color: getCategoryColor(highlight.category) },
                    ]}
                  >
                    {highlight.tag}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Interactive Transcript */}
          <ScrollView style={styles.transcriptScroll}>
            <View style={styles.transcriptContainer}>
              {consultation.transcriptionJson &&
                consultation.transcriptionJson.map((wordData, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => handleWordPress(wordData)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.transcriptWord,
                        index === currentWordIndex && styles.transcriptWordActive,
                      ]}
                    >
                      {wordData.word}{' '}
                    </Text>
                  </TouchableOpacity>
                ))}
            </View>
          </ScrollView>

          {/* Player Controls */}
          <View style={styles.playerControls}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${(currentTime / duration) * 100}%` },
                ]}
              />
            </View>
            <View style={styles.timeRow}>
              <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>

            {/* Controles con +5s / -5s */}
            <View style={styles.controlsRow}>
              <TouchableOpacity
                style={styles.skipButton}
                onPress={skipBackward}
                disabled={isBuffering}
              >
                <Ionicons name="play-back" size={32} color={isBuffering ? '#C7C7CC' : '#007AFF'} />
                <Text style={[styles.skipText, isBuffering && { color: '#C7C7CC' }]}>5s</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.playButton}
                onPress={handlePlayPause}
                disabled={isBuffering}
              >
                {isBuffering ? (
                  <ActivityIndicator size="large" color="#007AFF" />
                ) : (
                  <Ionicons
                    name={
                      hasFinished
                        ? 'reload-circle'
                        : isPlaying
                        ? 'pause-circle'
                        : 'play-circle'
                    }
                    size={64}
                    color="#007AFF"
                  />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.skipButton}
                onPress={skipForward}
                disabled={isBuffering}
              >
                <Ionicons name="play-forward" size={32} color={isBuffering ? '#C7C7CC' : '#007AFF'} />
                <Text style={[styles.skipText, isBuffering && { color: '#C7C7CC' }]}>5s</Text>
              </TouchableOpacity>
            </View>
          </View>
          </Animated.View>
        </SafeAreaView>
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
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
  },
  content: {
    flex: 1,
  },
  contentPadding: {
    padding: 16,
    paddingBottom: MINI_PLAYER_HEIGHT + 32,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    fontSize: 15,
    color: '#1C1C1E',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  transcriptionContainer: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  transcriptionHint: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  transcriptionText: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  transcriptionWord: {
    fontSize: 15,
    color: '#1C1C1E',
    lineHeight: 24,
  },
  transcriptionWordActive: {
    backgroundColor: '#007AFF',
    color: '#FFFFFF',
    fontWeight: '600',
    borderRadius: 4,
    paddingHorizontal: 2,
  },
  highlightCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  highlightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  highlightDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  highlightTag: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  highlightBadge: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  highlightCategory: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
  },
  highlightPhrase: {
    fontSize: 14,
    color: '#8E8E93',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  highlightFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  highlightAction: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
  },
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  vitalCard: {
    flex: 1,
    minWidth: 100,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  vitalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  vitalLabel: {
    fontSize: 13,
    color: '#8E8E93',
  },
  // MiniPlayer Styles
  miniPlayerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  miniProgressBar: {
    height: 3,
    backgroundColor: '#3A3A3C',
  },
  miniProgressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  miniPlayer: {
    height: MINI_PLAYER_HEIGHT,
    backgroundColor: '#1C1C1E',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  miniPlayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniPlayerInfo: {
    flex: 1,
  },
  miniPlayerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  miniPlayerTime: {
    fontSize: 12,
    color: '#8E8E93',
  },
  // ExpandedPlayer Styles
  expandedPlayer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  expandedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  expandedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  tagsScrollView: {
    maxHeight: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  tagsScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    gap: 6,
  },
  tagChipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tagChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  transcriptScroll: {
    flex: 1,
  },
  transcriptContainer: {
    padding: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  transcriptWord: {
    fontSize: 16,
    lineHeight: 28,
    color: '#1C1C1E',
  },
  transcriptWordActive: {
    backgroundColor: '#007AFF',
    color: '#FFFFFF',
    borderRadius: 4,
    paddingHorizontal: 4,
  },
  playerControls: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  timeText: {
    fontSize: 12,
    color: '#8E8E93',
    fontVariant: ['tabular-nums'],
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40,
  },
  skipButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    position: 'relative',
  },
  skipText: {
    position: 'absolute',
    fontSize: 10,
    fontWeight: '600',
    color: '#007AFF',
    bottom: 4,
  },
  playButton: {
    alignSelf: 'center',
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ConsultationDetailScreen;
