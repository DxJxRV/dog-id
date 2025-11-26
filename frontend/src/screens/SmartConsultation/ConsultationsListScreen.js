import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
  Animated,
  Alert,
  TextInput,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { showToast } from '../../utils/toast';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, STORAGE_KEYS } from '../../utils/config';
import { useFocusEffect } from '@react-navigation/native';

/**
 * Pantalla de listado de consultas inteligentes de una mascota
 */
const ConsultationsListScreen = ({ route, navigation }) => {
  const { petId, petName } = route.params;

  const [consultations, setConsultations] = useState([]);
  const [allConsultations, setAllConsultations] = useState([]); // Sin filtrar
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTag, setSelectedTag] = useState(null); // Tag activo para filtrar
  const [allTags, setAllTags] = useState([]); // Todos los tags únicos
  const [isTagCloudExpanded, setIsTagCloudExpanded] = useState(false); // Modal fullscreen

  // Estados para upload
  const [pendingAudioUri, setPendingAudioUri] = useState(null); // URI del audio a subir
  const [uploadStatus, setUploadStatus] = useState(null); // 'uploading' | 'analyzing' | 'error' | null
  const [uploadError, setUploadError] = useState(null); // Mensaje de error
  const [previousCount, setPreviousCount] = useState(0); // Para detectar nueva consulta
  const [showTooltip, setShowTooltip] = useState(null); // ID de consulta con tooltip
  const checkTimeout = useRef(null);
  const [deletingId, setDeletingId] = useState(null); // ID de consulta que se está eliminando
  const [menuVisible, setMenuVisible] = useState(null); // ID de consulta con menú visible

  // Estados para búsqueda semántica
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null); // null = no hay búsqueda activa
  const [isSearching, setIsSearching] = useState(false);

  // Animación shimmer
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // Constante para el storage key
  const PENDING_ERRORS_KEY = `@smart_consultation_errors_${petId}`;

  // Cargar errores pendientes desde AsyncStorage
  useEffect(() => {
    const loadPendingErrors = async () => {
      try {
        const savedError = await AsyncStorage.getItem(PENDING_ERRORS_KEY);
        if (savedError) {
          const errorData = JSON.parse(savedError);
          setPendingAudioUri(errorData.audioUri);
          setUploadError(errorData.errorMessage);
          setUploadStatus('error');
          console.log('📋 Loaded pending error from storage:', errorData);
        }
      } catch (error) {
        console.error('Error loading pending errors:', error);
      }
    };

    loadPendingErrors();
  }, []);

  // Guardar error en AsyncStorage
  const saveErrorToStorage = async (audioUri, errorMessage) => {
    try {
      await AsyncStorage.setItem(
        PENDING_ERRORS_KEY,
        JSON.stringify({
          audioUri,
          errorMessage,
          timestamp: Date.now(),
        })
      );
      console.log('💾 Saved error to storage');
    } catch (error) {
      console.error('Error saving to storage:', error);
    }
  };

  // Limpiar error de AsyncStorage
  const clearErrorFromStorage = async () => {
    try {
      await AsyncStorage.removeItem(PENDING_ERRORS_KEY);
      console.log('🗑️ Cleared error from storage');
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  };

  // Iniciar animación shimmer
  useEffect(() => {
    if (uploadStatus && uploadStatus !== 'error') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(shimmerAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      shimmerAnim.setValue(0);
    }
  }, [uploadStatus, shimmerAnim]);

  // Función para subir audio
  const uploadAudio = async (uri) => {
    try {
      console.log('☁️ Uploading audio...', uri);
      setUploadStatus('uploading');
      setUploadError(null);

      const formData = new FormData();
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
          timeout: 120000,
        }
      );

      console.log('✅ Upload success:', response.data);

      // Cambiar a estado de análisis y hacer UNA consulta para verificar
      setUploadStatus('analyzing');
      checkForNewConsultation();

    } catch (error) {
      console.error('❌ Upload error:', error);
      const msg = error.response?.data?.error || 'Error al subir el audio';
      setUploadError(msg);
      setUploadStatus('error');

      // Guardar error en AsyncStorage
      await saveErrorToStorage(uri, msg);
    }
  };

  // Función para verificar si la consulta ya está lista (una sola vez con retry)
  const checkForNewConsultation = async (attempt = 1, maxAttempts = 10) => {
    try {
      console.log(`🔍 Checking for new consultation (attempt ${attempt}/${maxAttempts})...`);

      const token = await SecureStore.getItemAsync(STORAGE_KEYS.TOKEN);
      const response = await axios.get(
        `${API_URL}/pets/${petId}/smart-consultations`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const fetchedConsultations = response.data.consultations;

      // Verificar si apareció una nueva consulta
      if (fetchedConsultations.length > previousCount) {
        console.log('✅ Nueva consulta encontrada!');

        // La nueva consulta es la primera (más reciente)
        const newConsultation = fetchedConsultations[0];

        // Actualizar lista
        setAllConsultations(fetchedConsultations);
        setConsultations(fetchedConsultations);
        setPreviousCount(fetchedConsultations.length);

        // Extraer tags actualizados
        const tagsMap = new Map();
        fetchedConsultations.forEach((consultation) => {
          if (consultation.medicalHighlights && Array.isArray(consultation.medicalHighlights)) {
            consultation.medicalHighlights.forEach((highlight) => {
              if (highlight.tag && !tagsMap.has(highlight.tag)) {
                tagsMap.set(highlight.tag, {
                  tag: highlight.tag,
                  category: highlight.category,
                });
              }
            });
          }
        });
        setAllTags(Array.from(tagsMap.values()));

        // Limpiar estados de upload
        setUploadStatus(null);
        setPendingAudioUri(null);

        // Limpiar error de AsyncStorage
        await clearErrorFromStorage();

        // Mostrar tooltip en la nueva consulta
        setShowTooltip(newConsultation.id);
        showToast.success('¡Análisis completado!');

        // Ocultar tooltip después de 5 segundos
        setTimeout(() => {
          setShowTooltip(null);
        }, 5000);

        return;
      }

      // Si no encontramos la consulta y aún hay intentos, reintentar en 3 segundos
      if (attempt < maxAttempts) {
        checkTimeout.current = setTimeout(() => {
          checkForNewConsultation(attempt + 1, maxAttempts);
        }, 3000);
      } else {
        // Máximo de intentos alcanzado
        console.log('⚠️ Max attempts reached, stopping check');
        const errorMsg = 'El análisis está tardando más de lo esperado. Intenta refrescar.';
        setUploadStatus('error');
        setUploadError(errorMsg);
        // Guardar error en storage
        if (pendingAudioUri) {
          await saveErrorToStorage(pendingAudioUri, errorMsg);
        }
      }
    } catch (error) {
      console.error('❌ Error checking consultation:', error);
      const errorMsg = 'Error al verificar el estado del análisis';
      setUploadStatus('error');
      setUploadError(errorMsg);
      // Guardar error en storage
      if (pendingAudioUri) {
        await saveErrorToStorage(pendingAudioUri, errorMsg);
      }
    }
  };

  const fetchConsultations = async (silentRefresh = false) => {
    try {
      if (!silentRefresh) {
        setLoading(true);
      }

      const token = await SecureStore.getItemAsync(STORAGE_KEYS.TOKEN);
      const response = await axios.get(
        `${API_URL}/pets/${petId}/smart-consultations`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const fetchedConsultations = response.data.consultations;

      // Actualizar count para siguiente detección
      setPreviousCount(fetchedConsultations.length);

      setAllConsultations(fetchedConsultations);
      setConsultations(fetchedConsultations);

      // Extraer todos los tags únicos de medical_highlights con categoría
      const tagsMap = new Map();
      fetchedConsultations.forEach((consultation) => {
        if (consultation.medicalHighlights && Array.isArray(consultation.medicalHighlights)) {
          consultation.medicalHighlights.forEach((highlight) => {
            if (highlight.tag && !tagsMap.has(highlight.tag)) {
              tagsMap.set(highlight.tag, {
                tag: highlight.tag,
                category: highlight.category
              });
            }
          });
        }
      });

      setAllTags(Array.from(tagsMap.values()));
    } catch (error) {
      console.error('Error fetching consultations:', error);
      if (!silentRefresh) {
        showToast.error('Error al cargar las consultas');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };


  // useFocusEffect para cargar y manejar nueva consulta
  useFocusEffect(
    useCallback(() => {
      // Si viene con URI de audio pendiente, iniciar upload
      if (route.params?.pendingAudioUri) {
        console.log('🎵 Audio pendiente detectado, iniciando upload...');
        const uri = route.params.pendingAudioUri;
        setPendingAudioUri(uri);
        uploadAudio(uri);
        // Limpiar el parámetro
        navigation.setParams({ pendingAudioUri: undefined });
      }

      fetchConsultations();

      return () => {
        // Limpiar timeout si existe
        if (checkTimeout.current) {
          clearTimeout(checkTimeout.current);
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [petId, route.params?.pendingAudioUri])
  );

  const onRefresh = () => {
    setRefreshing(true);
    setSelectedTag(null); // Reset filtro
    fetchConsultations();
  };

  const handleTagPress = (tagObj) => {
    const tagName = typeof tagObj === 'string' ? tagObj : tagObj.tag;

    // Cerrar modal si está abierto
    if (isTagCloudExpanded) {
      setIsTagCloudExpanded(false);
    }

    if (selectedTag === tagName) {
      // Deseleccionar
      setSelectedTag(null);
      setConsultations(allConsultations);
    } else {
      // Filtrar consultas que contienen este tag
      setSelectedTag(tagName);
      const filtered = allConsultations.filter((consultation) => {
        if (!consultation.medicalHighlights) return false;
        return consultation.medicalHighlights.some((h) => h.tag === tagName);
      });
      setConsultations(filtered);
    }
  };

  const handleDeleteConsultation = (consultation) => {
    Alert.alert(
      'Eliminar consulta',
      `¿Estás seguro de que deseas eliminar la consulta del ${new Date(consultation.createdAt).toLocaleDateString('es-MX')}?\n\nSe eliminarán todos los datos, incluido el audio.`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => deleteConsultation(consultation.id),
        },
      ]
    );
  };

  const deleteConsultation = async (consultationId) => {
    try {
      setDeletingId(consultationId);
      console.log('🗑️ Deleting consultation:', consultationId);

      const token = await SecureStore.getItemAsync(STORAGE_KEYS.TOKEN);
      await axios.delete(
        `${API_URL}/smart-consultations/${consultationId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Actualizar estado local
      const updatedAll = allConsultations.filter((c) => c.id !== consultationId);
      const updatedFiltered = consultations.filter((c) => c.id !== consultationId);

      setAllConsultations(updatedAll);
      setConsultations(updatedFiltered);
      setPreviousCount(updatedAll.length);

      // Recalcular tags
      const tagsMap = new Map();
      updatedAll.forEach((consultation) => {
        if (consultation.medicalHighlights && Array.isArray(consultation.medicalHighlights)) {
          consultation.medicalHighlights.forEach((highlight) => {
            if (highlight.tag && !tagsMap.has(highlight.tag)) {
              tagsMap.set(highlight.tag, {
                tag: highlight.tag,
                category: highlight.category,
              });
            }
          });
        }
      });
      setAllTags(Array.from(tagsMap.values()));

      // Si el tag seleccionado ya no existe, limpiar filtro
      if (selectedTag) {
        const tagStillExists = Array.from(tagsMap.values()).some(
          (t) => t.tag === selectedTag
        );
        if (!tagStillExists) {
          setSelectedTag(null);
        }
      }

      showToast.success('Consulta eliminada');
      console.log('✅ Consultation deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting consultation:', error);
      showToast.error('Error al eliminar la consulta');
    } finally {
      setDeletingId(null);
    }
  };

  // Búsqueda semántica
  const performSemanticSearch = async () => {
    if (!searchQuery.trim()) {
      return;
    }

    try {
      setIsSearching(true);
      Keyboard.dismiss();
      console.log('🔍 Performing semantic search:', searchQuery);

      const token = await SecureStore.getItemAsync(STORAGE_KEYS.TOKEN);
      const response = await axios.get(
        `${API_URL}/pets/${petId}/smart-consultations/search`,
        {
          params: { q: searchQuery },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setSearchResults(response.data.consultations);
      console.log('✅ Search results:', response.data.consultations.length);

      if (response.data.consultations.length === 0) {
        showToast.info('No se encontraron resultados');
      }
    } catch (error) {
      console.error('❌ Error in semantic search:', error);
      showToast.error('Error al buscar consultas');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
    setSelectedTag(null);
    Keyboard.dismiss();
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

  const renderConsultation = ({ item, index }) => {
    const hasTooltip = showTooltip === item.id;
    const isMenuOpen = menuVisible === item.id;

    return (
      <View style={styles.cardWrapper}>
        {/* Overlay local para este menú */}
        {isMenuOpen && (
          <TouchableOpacity
            style={styles.menuOverlayLocal}
            onPress={() => setMenuVisible(null)}
            activeOpacity={1}
          />
        )}

        <TouchableOpacity
          style={styles.consultationCard}
          onPress={() =>
            navigation.navigate('ConsultationDetail', {
              consultationId: item.id,
              petId,
              petName,
            })
          }
          activeOpacity={0.7}
        >
          {/* Tooltip de "Análisis completado" */}
          {hasTooltip && (
            <View style={styles.tooltip}>
              <Ionicons name="checkmark-circle" size={16} color="#34C759" />
              <Text style={styles.tooltipText}>¡Toca para ver el análisis!</Text>
            </View>
          )}

          <View style={styles.cardHeader}>
            <View style={styles.iconContainer}>
              <Ionicons name="sparkles" size={24} color="#007AFF" />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardDate}>
                {new Date(item.createdAt).toLocaleDateString('es-MX', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
              <Text style={styles.cardVet}>Dr. {item.vet.nombre}</Text>
            </View>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={(e) => {
                e.stopPropagation();
                setMenuVisible(isMenuOpen ? null : item.id);
              }}
              activeOpacity={0.6}
            >
              <Ionicons name="ellipsis-vertical" size={20} color="#8E8E93" />
            </TouchableOpacity>
          </View>

          {/* Medical Highlights */}
          {item.medicalHighlights && item.medicalHighlights.length > 0 && (
            <View style={styles.highlightsContainer}>
              {item.medicalHighlights.slice(0, 5).map((highlight, index) => (
                <View
                  key={index}
                  style={[
                    styles.highlightChip,
                    { backgroundColor: getCategoryBackground(highlight.category) },
                  ]}
                >
                  <View
                    style={[
                      styles.severityDot,
                      { backgroundColor: getCategoryColor(highlight.category) },
                    ]}
                  />
                  <Text
                    style={[
                      styles.highlightText,
                      { color: getCategoryColor(highlight.category) },
                    ]}
                  >
                    {highlight.tag}
                  </Text>
                </View>
              ))}
              {item.medicalHighlights.length > 5 && (
                <Text style={styles.moreTagsText}>
                  +{item.medicalHighlights.length - 5} más
                </Text>
              )}
            </View>
          )}

          {/* Footer con duración y ver más */}
          <View style={styles.cardFooter}>
            <View style={styles.footerLeft}>
              <Ionicons name="time-outline" size={14} color="#8E8E93" />
              <Text style={styles.footerDurationText}>
                {formatDuration(item.duration)}
              </Text>
            </View>
            <View style={styles.footerRight}>
              <Text style={styles.footerViewMoreText}>Ver más</Text>
              <Ionicons name="chevron-forward" size={14} color="#007AFF" />
            </View>
          </View>
        </TouchableOpacity>

        {/* Menú contextual */}
        {isMenuOpen && (
          <View style={styles.contextMenu}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                // Cerrar menú primero
                setMenuVisible(null);
                // Esperar un momento antes de mostrar el Alert
                setTimeout(() => {
                  handleDeleteConsultation(item);
                }, 100);
              }}
              activeOpacity={0.7}
            >
              {deletingId === item.id ? (
                <ActivityIndicator size="small" color="#FF3B30" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                  <Text style={styles.menuItemTextDanger}>Eliminar</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Card con estado de upload/análisis
  const renderUploadCard = () => {
    if (uploadStatus === 'error') {
      // Card de error estilizada como card normal
      return (
        <View style={styles.cardWrapper}>
          {/* Tooltip de error (arriba de la card) */}
          <View style={styles.errorTooltip}>
            <Ionicons name="alert-circle" size={16} color="#FF3B30" />
            <Text style={styles.errorTooltipText}>Error al analizar</Text>
          </View>

          <View style={[styles.consultationCard, styles.errorCard]}>
            {/* Header similar a card normal */}
            <View style={styles.cardHeader}>
              <View style={[styles.iconContainer, styles.errorIconContainer]}>
                <Ionicons name="alert-circle-outline" size={24} color="#FF3B30" />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.cardDate}>Error en el análisis</Text>
                <Text style={styles.cardVet}>Toca para reintentar</Text>
              </View>
            </View>

            {/* Mensaje de error */}
            <View style={styles.errorMessageContainer}>
              <Text style={styles.errorMessageText}>{uploadError}</Text>
            </View>

            {/* Botón de reintentar */}
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                if (pendingAudioUri) {
                  uploadAudio(pendingAudioUri);
                }
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh" size={18} color="#FFFFFF" />
              <Text style={styles.retryButtonText}>Reintentar análisis</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // Skeleton durante upload o análisis
    const statusText = uploadStatus === 'uploading' ? 'Subiendo audio...' : 'Analizando con IA...';
    const statusIcon = uploadStatus === 'uploading' ? 'cloud-upload' : 'sparkles';

    // Animación de opacidad para shimmer
    const shimmerOpacity = shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 0.7],
    });

    return (
      <View style={styles.cardWrapper}>
        {/* Tooltip de estado (arriba de la card) */}
        <View style={styles.uploadTooltip}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Ionicons name={statusIcon} size={16} color="#007AFF" style={{ marginLeft: 6 }} />
          <Text style={styles.uploadTooltipText}>{statusText}</Text>
        </View>

        <View style={[styles.consultationCard, styles.skeletonCard]}>
          {/* Header skeleton */}
          <View style={styles.cardHeader}>
            <View style={styles.iconContainer}>
              <Ionicons name="sparkles" size={24} color="#007AFF" />
            </View>
            <View style={styles.cardHeaderText}>
              <Animated.View
                style={[
                  styles.skeletonLine,
                  { width: '60%', height: 16, marginBottom: 8, opacity: shimmerOpacity },
                ]}
              />
              <Animated.View
                style={[styles.skeletonLine, { width: '40%', height: 14, opacity: shimmerOpacity }]}
              />
            </View>
          </View>

          {/* Highlights skeleton */}
          <View style={styles.highlightsContainer}>
            <Animated.View
              style={[styles.skeletonLine, { width: 100, height: 28, borderRadius: 16, opacity: shimmerOpacity }]}
            />
            <Animated.View
              style={[styles.skeletonLine, { width: 120, height: 28, borderRadius: 16, opacity: shimmerOpacity }]}
            />
            <Animated.View
              style={[styles.skeletonLine, { width: 80, height: 28, borderRadius: 16, opacity: shimmerOpacity }]}
            />
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando consultas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Barra de Búsqueda Semántica */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="sparkles" size={20} color="#007AFF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Busca síntomas, diagnósticos o notas..."
            placeholderTextColor="#8E8E93"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={performSemanticSearch}
            returnKeyType="search"
            editable={!isSearching}
          />
          {isSearching ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : searchQuery.length > 0 ? (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#8E8E93" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={performSemanticSearch} disabled={!searchQuery.trim()}>
              <Ionicons
                name="search"
                size={20}
                color={searchQuery.trim() ? "#007AFF" : "#C7C7CC"}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Badge de búsqueda activa */}
        {searchResults !== null && (
          <View style={styles.searchActiveBadge}>
            <Ionicons name="search" size={14} color="#007AFF" />
            <Text style={styles.searchActiveBadgeText}>
              Búsqueda: "{searchQuery}"
            </Text>
            <TouchableOpacity onPress={clearSearch} style={styles.clearSearchBadge}>
              <Ionicons name="close" size={14} color="#007AFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* TagCloud Header Compacto (ocultar durante búsqueda) */}
      {allTags.length > 0 && searchResults === null && (
        <View style={styles.tagCloudContainer}>
          <Text style={styles.tagCloudTitle}>Filtrar por hallazgo</Text>
          <View style={styles.tagCloud}>
            {allTags.slice(0, 5).map((tagObj) => (
              <TouchableOpacity
                key={tagObj.tag}
                style={[
                  styles.tagCloudChip,
                  selectedTag === tagObj.tag && {
                    backgroundColor: getCategoryColor(tagObj.category),
                  },
                ]}
                onPress={() => handleTagPress(tagObj)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.tagCloudText,
                    {
                      color: selectedTag === tagObj.tag
                        ? '#FFFFFF'
                        : getCategoryColor(tagObj.category)
                    },
                  ]}
                >
                  {tagObj.tag}
                </Text>
              </TouchableOpacity>
            ))}
            {allTags.length > 5 && (
              <TouchableOpacity
                style={styles.moreTagsButton}
                onPress={() => setIsTagCloudExpanded(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.moreTagsButtonText}>
                  +{allTags.length - 5} más
                </Text>
                <Ionicons name="chevron-down" size={14} color="#007AFF" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <FlatList
        data={searchResults !== null ? searchResults : consultations}
        renderItem={renderConsultation}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={searchResults !== null ? clearSearch : onRefresh}
          />
        }
        onScroll={() => {
          if (menuVisible) setMenuVisible(null);
        }}
        scrollEventThrottle={16}
        ListHeaderComponent={uploadStatus && searchResults === null ? renderUploadCard() : null}
        ListEmptyComponent={
          !uploadStatus && (
            searchResults !== null ? (
              // Empty state para búsqueda sin resultados
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={80} color="#C7C7CC" />
                <Text style={styles.emptyText}>
                  No encontramos consultas relacionadas
                </Text>
                <Text style={styles.emptySubtext}>
                  No se encontraron consultas relacionadas con "{searchQuery}" en el historial de {petName}
                </Text>
                <TouchableOpacity
                  style={styles.clearSearchButton}
                  onPress={clearSearch}
                  activeOpacity={0.7}
                >
                  <Text style={styles.clearSearchButtonText}>Limpiar búsqueda</Text>
                </TouchableOpacity>
              </View>
            ) : (
              // Empty state normal
              <View style={styles.emptyContainer}>
                <Ionicons name="mic-off-outline" size={80} color="#C7C7CC" />
                <Text style={styles.emptyText}>No hay consultas grabadas</Text>
                <Text style={styles.emptySubtext}>
                  Graba la primera consulta para ver el análisis con IA
                </Text>
              </View>
            )
          )
        }
      />

      {/* Botón flotante para nueva consulta */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() =>
          navigation.navigate('RecordConsultation', { petId, petName })
        }
        activeOpacity={0.8}
      >
        <Ionicons name="mic" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Modal Fullscreen - Nube de Tags Completa */}
      <Modal
        visible={isTagCloudExpanded}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsTagCloudExpanded(false)}
      >
        <View style={styles.tagCloudModal}>
          <View style={styles.tagCloudModalHeader}>
            <Text style={styles.tagCloudModalTitle}>
              Todos los hallazgos clínicos
            </Text>
            <TouchableOpacity
              onPress={() => setIsTagCloudExpanded(false)}
              style={styles.tagCloudModalClose}
            >
              <Ionicons name="close-circle" size={32} color="#8E8E93" />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.tagCloudModalContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.tagCloudExpanded}>
              {allTags.map((tagObj) => (
                <TouchableOpacity
                  key={tagObj.tag}
                  style={[
                    styles.tagCloudChipExpanded,
                    selectedTag === tagObj.tag && {
                      backgroundColor: getCategoryColor(tagObj.category),
                    },
                  ]}
                  onPress={() => handleTagPress(tagObj)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.tagCloudTextExpanded,
                      {
                        color: selectedTag === tagObj.tag
                          ? '#FFFFFF'
                          : getCategoryColor(tagObj.category),
                      },
                    ]}
                  >
                    {tagObj.tag}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#F2F2F7',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    gap: 8,
  },
  searchIcon: {
    marginRight: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#000000',
    padding: 0,
  },
  clearButton: {
    padding: 2,
  },
  searchActiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
    gap: 6,
  },
  searchActiveBadgeText: {
    flex: 1,
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '500',
  },
  clearSearchBadge: {
    padding: 2,
  },
  clearSearchButton: {
    marginTop: 16,
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  clearSearchButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
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
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  cardWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  consultationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  skeletonCard: {
    opacity: 0.9,
    borderWidth: 2,
    borderColor: '#E3F2FF',
  },
  skeletonLine: {
    backgroundColor: '#E5E5EA',
    borderRadius: 4,
    overflow: 'hidden',
  },
  errorCard: {
    borderWidth: 2,
    borderColor: '#FF3B30',
    backgroundColor: '#FFFFFF',
  },
  errorIconContainer: {
    backgroundColor: '#FFE5E5',
  },
  errorMessageContainer: {
    backgroundColor: '#FFF5F5',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  errorMessageText: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
  errorTooltip: {
    position: 'absolute',
    top: -12,
    right: 12,
    backgroundColor: '#FF3B30',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
    gap: 6,
    zIndex: 10,
  },
  errorTooltipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 6,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  uploadTooltip: {
    position: 'absolute',
    top: -12,
    right: 12,
    backgroundColor: '#E3F2FF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 6,
    gap: 6,
    zIndex: 10,
  },
  uploadTooltipText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '700',
  },
  tooltip: {
    position: 'absolute',
    top: -12,
    right: 12,
    backgroundColor: '#34C759',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
    gap: 6,
    zIndex: 10,
  },
  tooltipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E3F2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  cardVet: {
    fontSize: 14,
    color: '#8E8E93',
  },
  menuButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  menuOverlayLocal: {
    position: 'absolute',
    top: 0,
    left: -20,
    right: -20,
    bottom: 0,
    zIndex: 99,
  },
  contextMenu: {
    position: 'absolute',
    top: 52,
    right: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    minWidth: 140,
    zIndex: 100,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  menuItemTextDanger: {
    fontSize: 15,
    color: '#FF3B30',
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerDurationText: {
    fontSize: 13,
    color: '#8E8E93',
    fontVariant: ['tabular-nums'],
  },
  footerViewMoreText: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '500',
  },
  highlightsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  highlightChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  severityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  highlightText: {
    fontSize: 12,
    fontWeight: '600',
  },
  moreTagsText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
  },
  // TagCloud Header Styles (Compacto - 1/3 más pequeño)
  tagCloudContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  tagCloudTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tagCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  tagCloudChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tagCloudText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  moreTagsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#E3F2FF',
    gap: 4,
  },
  moreTagsButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#007AFF',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  // Modal Fullscreen Styles
  tagCloudModal: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  tagCloudModalHeader: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 20,
    paddingHorizontal: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tagCloudModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  tagCloudModalClose: {
    padding: 4,
  },
  tagCloudModalContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  tagCloudExpanded: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  tagCloudChipExpanded: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tagCloudTextExpanded: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
});

export default ConsultationsListScreen;
