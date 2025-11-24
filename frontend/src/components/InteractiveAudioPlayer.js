import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useAudioPlayer } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';

/**
 * Reproductor de audio interactivo con sincronización word-level
 * Resalta cada palabra mientras se reproduce
 */
const InteractiveAudioPlayer = ({ audioUrl, transcriptionJson, rawText }) => {
  const audioPlayer = useAudioPlayer(audioUrl);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);

  const scrollViewRef = useRef(null);
  const wordRefs = useRef([]);
  const positionInterval = useRef(null);

  useEffect(() => {
    // Iniciar intervalo para actualizar la posición mientras se reproduce
    if (audioPlayer.playing) {
      positionInterval.current = setInterval(() => {
        const currentPos = audioPlayer.currentTime;

        // Actualizar palabra actual basado en posición
        if (transcriptionJson && transcriptionJson.length > 0 && currentPos > 0) {
          const currentWord = transcriptionJson.findIndex(
            (word, index) => {
              const nextWord = transcriptionJson[index + 1];
              return (
                currentPos >= word.start &&
                (!nextWord || currentPos < nextWord.start)
              );
            }
          );

          if (currentWord !== currentWordIndex && currentWord !== -1) {
            setCurrentWordIndex(currentWord);

            // Auto-scroll hacia la palabra actual
            if (wordRefs.current[currentWord]) {
              wordRefs.current[currentWord].measureLayout(
                scrollViewRef.current,
                (x, y) => {
                  scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 100), animated: true });
                },
                () => {}
              );
            }
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
  }, [audioPlayer.playing, transcriptionJson, currentWordIndex]);

  const togglePlayback = () => {
    if (audioPlayer.playing) {
      audioPlayer.pause();
    } else {
      audioPlayer.play();
    }
  };

  const seekTo = (value) => {
    audioPlayer.seekTo(value);
  };

  const handleWordPress = (wordData) => {
    seekTo(wordData.start);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!audioPlayer) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando audio...</Text>
      </View>
    );
  }

  const currentPosition = audioPlayer.currentTime || 0;
  const duration = audioPlayer.duration || 0;

  return (
    <View style={styles.container}>
      {/* Transcripción interactiva */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.transcriptionContainer}
        contentContainerStyle={styles.transcriptionContent}
      >
        <View style={styles.transcriptionWrapper}>
          {transcriptionJson && transcriptionJson.length > 0 ? (
            transcriptionJson.map((wordData, index) => (
              <TouchableOpacity
                key={index}
                ref={(ref) => (wordRefs.current[index] = ref)}
                onPress={() => handleWordPress(wordData)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.word,
                    index === currentWordIndex && styles.wordActive,
                  ]}
                >
                  {wordData.word}{' '}
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.fallbackText}>{rawText}</Text>
          )}
        </View>
      </ScrollView>

      {/* Controles del reproductor */}
      <View style={styles.controls}>
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>{formatTime(currentPosition)}</Text>
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>

        <Slider
          style={styles.slider}
          value={currentPosition}
          minimumValue={0}
          maximumValue={duration}
          minimumTrackTintColor="#007AFF"
          maximumTrackTintColor="#E5E5EA"
          thumbTintColor="#007AFF"
          onSlidingComplete={seekTo}
        />

        <View style={styles.playbackControls}>
          <TouchableOpacity
            style={styles.playButton}
            onPress={togglePlayback}
            activeOpacity={0.8}
          >
            <Ionicons
              name={audioPlayer.playing ? 'pause' : 'play'}
              size={32}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>
      </View>
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
  transcriptionContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  transcriptionContent: {
    padding: 20,
  },
  transcriptionWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  word: {
    fontSize: 18,
    lineHeight: 32,
    color: '#1C1C1E',
    marginRight: 2,
  },
  wordActive: {
    backgroundColor: '#007AFF',
    color: '#FFFFFF',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '600',
  },
  fallbackText: {
    fontSize: 16,
    lineHeight: 28,
    color: '#1C1C1E',
  },
  controls: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timeText: {
    fontSize: 14,
    color: '#8E8E93',
    fontVariant: ['tabular-nums'],
  },
  slider: {
    width: '100%',
    height: 40,
  },
  playbackControls: {
    alignItems: 'center',
    marginTop: 8,
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default InteractiveAudioPlayer;
