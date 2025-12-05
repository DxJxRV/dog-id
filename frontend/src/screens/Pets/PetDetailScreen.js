import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ImageBackground,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { petsAPI, medicalDataAPI, deathCertificateAPI } from '../../services/api';
import { Loading, Button, PetLinkCodeModal, ErrorNetwork, Timeline, PetStatusBadge, WeightChart, VaccinationPassport } from '../../components';
import PendingDraftsList from '../../components/PendingDraftsList';
import { getImageUrl } from '../../utils/imageHelper';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '../../contexts/AuthContext';
import { isNetworkError } from '../../utils/networkUtils';
import { showToast } from '../../utils/toast';

const PetDetailScreen = ({ route, navigation }) => {
  const { petId } = route.params;
  const { user, userType } = useAuth();
  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkCode, setLinkCode] = useState(null);
  const [isLinked, setIsLinked] = useState(false);
  const [error, setError] = useState(null);
  const [archiving, setArchiving] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [showProcedureMenu, setShowProcedureMenu] = useState(false);
  const [filters, setFilters] = useState({
    type: null, // 'vaccine' | 'procedure' | null
    vaccineType: null,
    procedureType: null,
    addedBy: null, // 'owner' | 'vet' | null
  });
  const [tempFilters, setTempFilters] = useState(filters);

  // ECE: Toggle entre Historial, Evolución y Vacunas
  const [activeTab, setActiveTab] = useState('historial'); // 'historial' | 'evolucion' | 'vacunas'
  const [weightData, setWeightData] = useState([]);
  const [loadingWeight, setLoadingWeight] = useState(false);

  const isVet = userType === 'vet';

  const fetchPetDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await petsAPI.getById(petId);
      setPet(response.data.pet);
    } catch (err) {
      if (isNetworkError(err)) {
        setError(err);
      } else {
        showToast.error('No se pudieron cargar los detalles de la mascota');
        setTimeout(() => navigation.goBack(), 500);
      }
    } finally {
      setLoading(false);
    }
  };

  // ECE: Cargar evolución de peso
  const fetchWeightEvolution = async () => {
    try {
      setLoadingWeight(true);
      const response = await medicalDataAPI.getWeightEvolution(petId);
      setWeightData(response.data.weightEvolution || []);
    } catch (err) {
      console.error('Error fetching weight evolution:', err);
      if (!isNetworkError(err)) {
        showToast.error('No se pudo cargar la evolución de peso');
      }
      setWeightData([]);
    } finally {
      setLoadingWeight(false);
    }
  };

  // Cargar peso cuando se cambia al tab de evolución
  useEffect(() => {
    if (activeTab === 'evolucion' && petId) {
      fetchWeightEvolution();
    }
  }, [activeTab, petId]);

  useEffect(() => {
    fetchPetDetail();
  }, [petId]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchPetDetail();
    });
    return unsubscribe;
  }, [navigation]);

  // Configurar el botón de menú en el header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => setShowOptionsMenu(true)}
          style={{ marginRight: 15 }}
        >
          <Ionicons name="ellipsis-vertical" size={24} color="#007AFF" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const handleShowLinkCode = async () => {
    try {
      const response = await petsAPI.getLinkCode(petId);
      setLinkCode(response.data.linkCode);
      setShowLinkModal(true);
    } catch (err) {
      if (isNetworkError(err)) {
        showToast.networkError();
      } else {
        showToast.error('No se pudo obtener el código de vinculación');
      }
    }
  };

  const handleUnlinkPet = () => {
    setShowOptionsMenu(false);

    const isCoOwner = pet?.isCoOwner;
    const unlinkMessage = isCoOwner
      ? '¿Estás seguro de que deseas dejar de ser co-dueño de esta mascota?'
      : '¿Estás seguro de que deseas desvincular esta mascota?';

    Alert.alert(
      'Desvincular mascota',
      unlinkMessage,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desvincular',
          style: 'destructive',
          onPress: async () => {
            try {
              setUnlinking(true);

              // Usar el endpoint correcto según el tipo de vinculación
              if (isCoOwner) {
                await petsAPI.unlinkPetAsCoOwner(petId);
              } else if (isVet) {
                await petsAPI.unlinkPetAsVet(petId);
              }

              showToast.success('Mascota desvinculada correctamente');
              setTimeout(() => navigation.goBack(), 500);
            } catch (err) {
              if (isNetworkError(err)) {
                showToast.networkError();
              } else {
                showToast.error('No se pudo desvincular la mascota');
              }
            } finally {
              setUnlinking(false);
            }
          },
        },
      ]
    );
  };

  const handleArchivePet = () => {
    setShowOptionsMenu(false);
    const isArchived = pet?.isArchived || pet?.archived;

    Alert.alert(
      isArchived ? 'Desarchivar mascota' : 'Archivar mascota',
      isArchived
        ? `¿Deseas desarchivar a ${pet.nombre}?`
        : '¿Deseas archivar esta mascota? Podrás verla en la sección de archivados.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: isArchived ? 'Desarchivar' : 'Archivar',
          onPress: async () => {
            try {
              setArchiving(true);
              await petsAPI.archive(petId, !isArchived);
              showToast.success(
                isArchived
                  ? 'Mascota desarchivada correctamente'
                  : 'Mascota archivada correctamente'
              );
              if (!isArchived) {
                setTimeout(() => navigation.goBack(), 500);
              } else {
                fetchPetDetail();
              }
            } catch (err) {
              if (isNetworkError(err)) {
                showToast.networkError();
              } else {
                showToast.error(
                  isArchived
                    ? 'No se pudo desarchivar la mascota'
                    : 'No se pudo archivar la mascota'
                );
              }
            } finally {
              setArchiving(false);
            }
          },
        },
      ]
    );
  };

  const handleTimelineItemPress = (item, type) => {
    if (type === 'vaccine') {
      navigation.navigate('VaccineDetail', { vaccineId: item.id, petId });
    } else {
      navigation.navigate('ProcedureDetail', { procedureId: item.id, petId });
    }
  };

  const handleViewDeathCertificate = async () => {
    try {
      const response = await deathCertificateAPI.getByPetId(petId);
      const certificate = response.data.deathCertificate;

      if (certificate && certificate.certificatePdfUrl) {
        navigation.navigate('PdfViewer', {
          url: certificate.certificatePdfUrl,
          title: `Certificado de Defunción - ${pet.nombre}`,
        });
      } else {
        showToast.error('No se encontró el certificado PDF');
      }
    } catch (err) {
      console.error('Error fetching death certificate:', err);
      if (isNetworkError(err)) {
        showToast.networkError();
      } else {
        showToast.error('No se pudo cargar el certificado');
      }
    }
  };

  const handleCertifyDeath = () => {
    navigation.navigate('DeathCertificateForm', {
      petId,
      petName: pet.nombre,
    });
  };

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return <ErrorNetwork onRetry={fetchPetDetail} />;
  }

  const isOwner = pet.user && user && pet.user.id === user.id;
  const isCoOwner = pet?.isCoOwner;
  const isArchived = pet?.isArchived || pet?.archived;

  return (
    <View style={styles.wrapper}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
      {/* Header con Cover Photo como fondo */}
      {pet.coverPhotoUrl ? (
        <ImageBackground
          source={{ uri: getImageUrl(pet.coverPhotoUrl) }}
          style={styles.header}
          imageStyle={styles.headerBackgroundImage}
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.6)', 'rgba(255,255,255,0.95)']}
            locations={[0, 0.5, 1]}
            style={styles.headerGradient}
          >
            {pet.fotoUrl ? (
              <Image
                source={{ uri: getImageUrl(pet.fotoUrl) }}
                style={styles.petImage}
              />
            ) : (
              <View style={styles.petImagePlaceholder}>
                <Text style={styles.petImagePlaceholderText}>
                  {pet.nombre.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.petNameContainer}>
              <Text style={styles.petName}>{pet.nombre}</Text>
              <PetStatusBadge status={pet.status} style={styles.statusBadge} />
            </View>
            <Text style={styles.petDetails}>
              {pet.especie} • {pet.raza || 'Sin raza'}
            </Text>
            {pet.fechaNacimiento && (
              <Text style={styles.petBirthdate}>
                Nacimiento: {format(new Date(pet.fechaNacimiento), 'd MMMM, yyyy', { locale: es })}
              </Text>
            )}
          </LinearGradient>
        </ImageBackground>
      ) : (
        <View style={styles.header}>
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.headerGradient}
          >
            {pet.fotoUrl ? (
              <Image
                source={{ uri: getImageUrl(pet.fotoUrl) }}
                style={styles.petImage}
              />
            ) : (
              <View style={styles.petImagePlaceholder}>
                <Text style={styles.petImagePlaceholderText}>
                  {pet.nombre.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.petNameContainer}>
              <Text style={styles.petName}>{pet.nombre}</Text>
              <PetStatusBadge status={pet.status} style={styles.statusBadge} />
            </View>
            <Text style={styles.petDetails}>
              {pet.especie} • {pet.raza || 'Sin raza'}
            </Text>
            {pet.fechaNacimiento && (
              <Text style={styles.petBirthdate}>
                Nacimiento: {format(new Date(pet.fechaNacimiento), 'd MMMM, yyyy', { locale: es })}
              </Text>
            )}
          </LinearGradient>
        </View>
      )}

      {/* Banner de mascota archivada */}
      {isArchived && (
        <View style={styles.archivedBanner}>
          <View style={styles.archivedInfo}>
            <Ionicons name="archive" size={20} color="#E65100" />
            <Text style={styles.archivedText}>Esta mascota está archivada</Text>
          </View>
          <TouchableOpacity
            style={styles.unarchiveButton}
            onPress={handleArchivePet}
            disabled={archiving}
          >
            {archiving ? (
              <ActivityIndicator size="small" color="#E65100" />
            ) : (
              <Ionicons name="arrow-undo-outline" size={24} color="#E65100" />
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Banner de Bitácora Inteligente */}
      {isVet && pet.status !== 'DECEASED' && (
        <TouchableOpacity
          style={styles.aiBanner}
          onPress={() => navigation.navigate('ConsultationsList', { petId, petName: pet.nombre })}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#6366F1', '#8B5CF6']}
            style={styles.aiBannerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.aiBannerContent}>
              <View style={styles.aiBannerIcon}>
                <Ionicons name="mic" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.aiBannerTextContainer}>
                <Text style={styles.aiBannerTitle}>Bitácora Inteligente</Text>
                <Text style={styles.aiBannerSubtitle}>Graba consultas y obtén análisis con IA</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.8)" />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Registros Pendientes de Completar (Drafts de IA) */}
      {userType === 'vet' && pet.status !== 'DECEASED' && (
        <PendingDraftsList
          petId={petId}
          navigation={navigation}
          onRefresh={fetchPetDetail}
        />
      )}

      {/* Sección de Certificado de Defunción */}
      {pet.status === 'DECEASED' && (
        <View style={styles.deathCertificateSection}>
          <TouchableOpacity
            style={styles.viewCertificateButton}
            onPress={handleViewDeathCertificate}
          >
            <Ionicons name="document-text" size={24} color="#8E8E93" />
            <Text style={styles.viewCertificateButtonText}>
              Ver Certificado de Defunción
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>
        </View>
      )}

      {/* Historial Médico / Evolución */}
      <View style={styles.section}>
        <View style={styles.historyHeader}>
          <Text style={styles.sectionTitle}>
            Historial Médico ({(pet.vaccines?.length || 0) + (pet.procedures?.length || 0)})
          </Text>
          {activeTab === 'historial' && (
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => {
                setTempFilters(filters);
                setShowFiltersModal(true);
              }}
            >
              <Ionicons name="filter-outline" size={22} color="#007AFF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Toggle entre Historial, Vacunas y Evolución */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'historial' && styles.tabActive,
            ]}
            onPress={() => setActiveTab('historial')}
          >
            <Ionicons
              name="list-outline"
              size={20}
              color={activeTab === 'historial' ? '#007AFF' : '#8E8E93'}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'historial' && styles.tabTextActive,
              ]}
            >
              Historial
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'vacunas' && styles.tabActive,
            ]}
            onPress={() => setActiveTab('vacunas')}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={20}
              color={activeTab === 'vacunas' ? '#007AFF' : '#8E8E93'}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'vacunas' && styles.tabTextActive,
              ]}
            >
              Vacunas
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'evolucion' && styles.tabActive,
            ]}
            onPress={() => setActiveTab('evolucion')}
          >
            <Ionicons
              name="analytics-outline"
              size={20}
              color={activeTab === 'evolucion' ? '#007AFF' : '#8E8E93'}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'evolucion' && styles.tabTextActive,
              ]}
            >
              Evolución
            </Text>
          </TouchableOpacity>
        </View>

        {/* Contenido según tab activo */}
        {activeTab === 'historial' ? (
          <Timeline
            vaccines={pet.vaccines || []}
            procedures={pet.procedures || []}
            filters={filters}
            onItemPress={handleTimelineItemPress}
          />
        ) : activeTab === 'vacunas' ? (
          <VaccinationPassport
            vaccines={pet.vaccines || []}
            petBirthDate={pet.fechaNacimiento}
            userType={userType}
            onAddVaccine={(vaccineName) => {
              // Veterinario: abrir formulario para agregar vacuna
              navigation.navigate('AddVaccine', { petId, suggestedName: vaccineName });
            }}
            onScheduleAppointment={(vaccineName) => {
              // Owner: ir directo a solicitar cita con selector de veterinario
              navigation.navigate('RequestAppointment', {
                petId,
                reason: `Vacuna: ${vaccineName}`,
                vaccineName,
                fromVaccination: true
              });
            }}
          />
        ) : (
          <View style={styles.evolutionContainer}>
            {loadingWeight ? (
              <View style={styles.loadingEvolution}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Cargando evolución...</Text>
              </View>
            ) : (
              <WeightChart data={weightData} unit="kg" />
            )}
          </View>
        )}
      </View>

      {/* Modal de código de vinculación */}
      <PetLinkCodeModal
        visible={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        linkCode={linkCode}
        petName={pet.nombre}
      />

      {/* Modal de filtros */}
      <Modal
        visible={showFiltersModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFiltersModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFiltersModal(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.filtersMenu}>
              <Text style={styles.filtersTitle}>Filtrar historial</Text>

              {/* Tipo de registro */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Tipo</Text>
                <View style={styles.filterOptions}>
                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      tempFilters.type === 'vaccine' && styles.filterChipActive
                    ]}
                    onPress={() => setTempFilters({ ...tempFilters, type: tempFilters.type === 'vaccine' ? null : 'vaccine' })}
                  >
                    <Text style={[
                      styles.filterChipText,
                      tempFilters.type === 'vaccine' && styles.filterChipTextActive
                    ]}>Vacunas</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      tempFilters.type === 'procedure' && styles.filterChipActive
                    ]}
                    onPress={() => setTempFilters({ ...tempFilters, type: tempFilters.type === 'procedure' ? null : 'procedure' })}
                  >
                    <Text style={[
                      styles.filterChipText,
                      tempFilters.type === 'procedure' && styles.filterChipTextActive
                    ]}>Procedimientos</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Registrado por */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Registrado por</Text>
                <View style={styles.filterOptions}>
                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      tempFilters.addedBy === 'owner' && styles.filterChipActive
                    ]}
                    onPress={() => setTempFilters({ ...tempFilters, addedBy: tempFilters.addedBy === 'owner' ? null : 'owner' })}
                  >
                    <Text style={[
                      styles.filterChipText,
                      tempFilters.addedBy === 'owner' && styles.filterChipTextActive
                    ]}>Dueño</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      tempFilters.addedBy === 'vet' && styles.filterChipActive
                    ]}
                    onPress={() => setTempFilters({ ...tempFilters, addedBy: tempFilters.addedBy === 'vet' ? null : 'vet' })}
                  >
                    <Text style={[
                      styles.filterChipText,
                      tempFilters.addedBy === 'vet' && styles.filterChipTextActive
                    ]}>Veterinario</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Botones de acción */}
              <View style={styles.filterActions}>
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => {
                    const clearedFilters = {
                      type: null,
                      vaccineType: null,
                      procedureType: null,
                      addedBy: null,
                    };
                    setTempFilters(clearedFilters);
                    setFilters(clearedFilters);
                    setShowFiltersModal(false);
                  }}
                >
                  <Text style={styles.clearButtonText}>Limpiar filtros</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.applyButton}
                  onPress={() => {
                    setFilters(tempFilters);
                    setShowFiltersModal(false);
                  }}
                >
                  <Text style={styles.applyButtonText}>Aplicar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Modal de opciones */}
      <Modal
        visible={showOptionsMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOptionsMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptionsMenu(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.optionsMenu}>
              {isOwner && (
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => {
                    setShowOptionsMenu(false);
                    navigation.navigate('EditPet', { pet });
                  }}
                >
                  <Ionicons name="create-outline" size={22} color="#8E8E93" />
                  <Text style={styles.optionText}>Editar mascota</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.optionItem}
                onPress={handleArchivePet}
                disabled={archiving || unlinking}
              >
                {archiving ? (
                  <ActivityIndicator size="small" color="#8E8E93" />
                ) : (
                  <Ionicons
                    name={isArchived ? "arrow-undo-outline" : "archive-outline"}
                    size={22}
                    color="#8E8E93"
                  />
                )}
                <Text style={styles.optionText}>
                  {archiving
                    ? (isArchived ? 'Desarchivando...' : 'Archivando...')
                    : (isArchived ? 'Desarchivar mascota' : 'Archivar mascota')
                  }
                </Text>
              </TouchableOpacity>

              {((isVet && !isOwner) || isCoOwner) && (
                <TouchableOpacity
                  style={[styles.optionItem, styles.optionItemDanger]}
                  onPress={handleUnlinkPet}
                  disabled={archiving || unlinking}
                >
                  {unlinking ? (
                    <ActivityIndicator size="small" color="#FF3B30" />
                  ) : (
                    <Ionicons name="link-outline" size={22} color="#FF3B30" />
                  )}
                  <Text style={styles.optionTextDanger}>
                    {unlinking ? 'Desvinculando...' : 'Desvincular mascota'}
                  </Text>
                </TouchableOpacity>
              )}

              <View style={styles.optionSeparator} />

              <TouchableOpacity
                style={styles.optionItem}
                onPress={() => setShowOptionsMenu(false)}
              >
                <Ionicons name="close-outline" size={22} color="#8E8E93" />
                <Text style={styles.optionText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Modal de selección de procedimiento */}
      <Modal
        visible={showProcedureMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProcedureMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowProcedureMenu(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.optionsMenu}>
              <Text style={styles.menuTitle}>Agregar Registro</Text>

              <TouchableOpacity
                style={styles.optionItem}
                onPress={() => {
                  setShowProcedureMenu(false);
                  navigation.navigate('AddVaccine', { petId });
                }}
              >
                <Ionicons name="medical" size={22} color="#9B59B6" />
                <Text style={styles.optionText}>Agregar Vacuna</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionItem}
                onPress={() => {
                  setShowProcedureMenu(false);
                  navigation.navigate('AddProcedure', {
                    petId,
                    petName: pet.nombre,
                    petStatus: pet.status,
                  });
                }}
              >
                <Ionicons name="fitness" size={22} color="#FF9500" />
                <Text style={styles.optionText}>Agregar Procedimiento</Text>
              </TouchableOpacity>

              {isVet && pet.status !== 'DECEASED' && (
                <>
                  <View style={styles.optionSeparator} />

                  <TouchableOpacity
                    style={[styles.optionItem, styles.optionItemHighlight]}
                    onPress={() => {
                      setShowProcedureMenu(false);
                      navigation.navigate('ConsultationsList', { petId, petName: pet.nombre });
                    }}
                  >
                    <View style={styles.aiIconContainer}>
                      <Ionicons name="mic" size={20} color="#FFFFFF" />
                    </View>
                    <View style={styles.aiOptionTextContainer}>
                      <Text style={styles.optionText}>Bitácora Inteligente</Text>
                      <Text style={styles.aiOptionSubtext}>Graba y analiza con IA</Text>
                    </View>
                    <Ionicons name="sparkles" size={18} color="#8B5CF6" />
                  </TouchableOpacity>
                </>
              )}

              <View style={styles.optionSeparator} />

              <TouchableOpacity
                style={styles.optionItem}
                onPress={() => setShowProcedureMenu(false)}
              >
                <Ionicons name="close-outline" size={22} color="#8E8E93" />
                <Text style={styles.optionText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
      </ScrollView>

      {/* Botones Flotantes */}
      {pet.status !== 'DECEASED' && (
        <View style={styles.floatingButtonsContainer}>
          {isOwner && (
            <TouchableOpacity
              style={styles.floatingButtonSecondary}
              onPress={handleShowLinkCode}
              activeOpacity={0.8}
            >
              <Ionicons name="share-social" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.floatingButtonSecondary}
            onPress={() => setShowProcedureMenu(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={28} color="#FFFFFF" />
          </TouchableOpacity>

          {isVet && (
            <TouchableOpacity
              style={styles.floatingButtonPrimary}
              onPress={() => navigation.navigate('ConsultationsList', { petId, petName: pet.nombre })}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#6366F1', '#8B5CF6']}
                style={styles.floatingButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="mic" size={32} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    width: '100%',
    minHeight: 320,
    alignItems: 'center',
    overflow: 'hidden',
  },
  headerBackgroundImage: {
    width: '100%',
    height: '100%',
  },
  headerGradient: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  petImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    borderWidth: 4,
    borderColor: '#fff',
  },
  petImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 4,
    borderColor: '#fff',
  },
  petImagePlaceholderText: {
    color: '#fff',
    fontSize: 48,
    fontWeight: '600',
  },
  petNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  petName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  statusBadge: {
    marginTop: 0,
  },
  petDetails: {
    fontSize: 15,
    color: '#fff',
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  petBirthdate: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 32,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  qrButton: {
    width: 100,
    height: 88,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  qrButtonText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
  archivedBanner: {
    backgroundColor: '#FFF3E0',
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#FFE0B2',
  },
  archivedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  archivedText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#E65100',
  },
  unarchiveButton: {
    padding: 8,
  },
  // Banner de Bitácora Inteligente
  aiBanner: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  aiBannerGradient: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  aiBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aiBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiBannerTextContainer: {
    flex: 1,
  },
  aiBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  aiBannerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  section: {
    padding: 16,
    paddingTop: 24,
    flex: 1,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  filterButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  optionsMenu: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  optionItemDanger: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  optionText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  optionTextDanger: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '500',
  },
  optionSeparator: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: 8,
  },
  filtersMenu: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  filtersTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginBottom: 20,
    textAlign: 'center',
  },
  filterSection: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 10,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    borderWidth: 0,
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  filterChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  filterActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  clearButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  // ECE: Estilos para tabs y evolución
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
  },
  tabTextActive: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  evolutionContainer: {
    minHeight: 300,
  },
  loadingEvolution: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#8E8E93',
  },
  // ECE: Estilos para certificado de defunción
  deathCertificateSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  viewCertificateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  viewCertificateButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  vetActionsSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  certifyDeathButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#FF3B30',
    borderRadius: 12,
  },
  certifyDeathButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
  },
  // Botones Flotantes
  floatingButtonsContainer: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    alignItems: 'flex-end',
    gap: 12,
  },
  floatingButtonPrimary: {
    width: 68,
    height: 68,
    borderRadius: 34,
    overflow: 'hidden',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  floatingButtonSecondary: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  floatingButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Estilos para el modal mejorado
  menuTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
    textAlign: 'center',
  },
  optionItemHighlight: {
    backgroundColor: '#F3F0FF',
    borderRadius: 12,
    marginHorizontal: -8,
    paddingHorizontal: 16,
  },
  aiIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiOptionTextContainer: {
    flex: 1,
  },
  aiOptionSubtext: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
});

export default PetDetailScreen;
