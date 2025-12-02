import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Linking,
  Alert,
  Dimensions,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { prescriptionAPI, appointmentAPI, medicationLogAPI } from '../../services/api';
import { showToast } from '../../utils/toast';
import { Loading } from '../../components';
import { format, parseISO, isToday, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import { getImageUrl } from '../../utils/imageHelper';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.85;

const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTreatments, setActiveTreatments] = useState([]);
  const [dailyTasks, setDailyTasks] = useState([]);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [completedMeds, setCompletedMeds] = useState(new Set());

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Obtener dashboard del owner
      const dashboardRes = await prescriptionAPI.getOwnerDashboard();
      const dashboard = dashboardRes.data;

      setActiveTreatments(dashboard.activeTreatments || []);
      setDailyTasks(dashboard.dailyTasks || []);

      // Obtener logs de medicamentos de hoy
      try {
        const logsRes = await medicationLogAPI.getTodayLogs();
        const logs = logsRes.data.logs || {};
        // Convertir los logs a un Set de taskIds completados
        const completedTaskIds = new Set(Object.keys(logs));
        setCompletedMeds(completedTaskIds);
      } catch (logError) {
        console.error('❌ Error loading medication logs:', logError);
        // No es crítico, continuar sin logs
      }

      // Obtener appointments de hoy
      const appointmentsRes = await appointmentAPI.getSchedule();
      const appointments = appointmentsRes.data.appointments || [];

      // Filtrar y ordenar citas de hoy
      const todaysAppointments = appointments
        .filter(apt => {
          if (!apt.startDateTime) return false;
          const aptDate = parseISO(apt.startDateTime);
          return isToday(aptDate);
        })
        .sort((a, b) => {
          const timeA = parseISO(a.startDateTime);
          const timeB = parseISO(b.startDateTime);
          const now = new Date();

          const aPast = isBefore(timeA, now);
          const bPast = isBefore(timeB, now);

          if (aPast === bPast) {
            return timeA - timeB;
          }

          return aPast ? 1 : -1;
        });

      setTodayAppointments(todaysAppointments);

    } catch (error) {
      console.error('❌ Error loading dashboard:', error);
      showToast.error('Error al cargar el dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const toggleMedicationComplete = async (taskId) => {
    // Parse taskId: formato es "prescriptionItemId-time"
    // Usar lastIndexOf para dividir solo en el último guion (el UUID contiene guiones)
    const lastDashIndex = taskId.lastIndexOf('-');
    const prescriptionItemId = taskId.substring(0, lastDashIndex);
    const scheduledTime = taskId.substring(lastDashIndex + 1);

    // Actualizar UI inmediatamente (optimistic update)
    setCompletedMeds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });

    // Guardar en la base de datos
    try {
      const response = await medicationLogAPI.logMedication({
        prescriptionItemId,
        scheduledTime
      });

      console.log('✅ Medication logged:', response.data.logged ? 'marked' : 'unmarked');
    } catch (error) {
      console.error('❌ Error logging medication:', error);

      // Revertir el cambio si falla
      setCompletedMeds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(taskId)) {
          newSet.delete(taskId);
        } else {
          newSet.add(taskId);
        }
        return newSet;
      });

      showToast.error('Error al registrar medicamento');
    }
  };

  const isTimePast = (timeStr) => {
    const now = new Date();
    const [hours, minutes] = timeStr.split(':').map(Number);
    const medTime = new Date();
    medTime.setHours(hours, minutes, 0, 0);
    return isBefore(medTime, now);
  };

  const getNextTaskIndex = (timeStr) => {
    const now = new Date();
    const [hours, minutes] = timeStr.split(':').map(Number);
    const taskTime = new Date();
    taskTime.setHours(hours, minutes, 0, 0);
    return !isBefore(taskTime, now);
  };

  const totalTasks = dailyTasks.length + todayAppointments.length;

  // Agrupar medicamentos primero por mascota, luego por medicamento
  const medicationsByPet = React.useMemo(() => {
    const petGroups = {};

    dailyTasks.forEach(task => {
      // Agrupar por mascota
      if (!petGroups[task.petId]) {
        petGroups[task.petId] = {
          petId: task.petId,
          petName: task.petName,
          petImage: task.petImage,
          medications: {}
        };
      }

      // Agrupar medicamentos dentro de cada mascota
      const medKey = task.medicationName;
      if (!petGroups[task.petId].medications[medKey]) {
        petGroups[task.petId].medications[medKey] = {
          id: `${task.petId}-${medKey}`,
          medicationName: task.medicationName,
          dosage: task.dosage,
          times: [],
          taskIds: []
        };
      }

      petGroups[task.petId].medications[medKey].times.push(task.time);
      petGroups[task.petId].medications[medKey].taskIds.push(task.id);
    });

    // Convertir a array y transformar medications object a array
    return Object.values(petGroups).map(pet => ({
      ...pet,
      medications: Object.values(pet.medications)
    }));
  }, [dailyTasks]);

  // Check if all times for a medication are completed
  const isMedicationCompleted = (taskIds) => {
    return taskIds.every(id => completedMeds.has(id));
  };

  // Toggle all times for a medication
  const toggleMedicationGroup = async (taskIds) => {
    const allCompleted = taskIds.every(id => completedMeds.has(id));

    // Actualizar UI inmediatamente
    setCompletedMeds(prev => {
      const newSet = new Set(prev);

      if (allCompleted) {
        // Unmark all
        taskIds.forEach(id => newSet.delete(id));
      } else {
        // Mark all
        taskIds.forEach(id => newSet.add(id));
      }
      return newSet;
    });

    // Guardar todos en la base de datos
    try {
      await Promise.all(
        taskIds.map(async (taskId) => {
          const lastDashIndex = taskId.lastIndexOf('-');
          const prescriptionItemId = taskId.substring(0, lastDashIndex);
          const scheduledTime = taskId.substring(lastDashIndex + 1);
          return medicationLogAPI.logMedication({
            prescriptionItemId,
            scheduledTime
          });
        })
      );

      console.log('✅ All medications logged');
    } catch (error) {
      console.error('❌ Error logging medications:', error);

      // Revertir todos los cambios si falla
      setCompletedMeds(prev => {
        const newSet = new Set(prev);

        if (allCompleted) {
          taskIds.forEach(id => newSet.add(id));
        } else {
          taskIds.forEach(id => newSet.delete(id));
        }
        return newSet;
      });

      showToast.error('Error al registrar medicamentos');
    }
  };

  // Find next medication time
  const getNextMedicationTime = (times) => {
    const now = new Date();
    return times.find(timeStr => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const taskTime = new Date();
      taskTime.setHours(hours, minutes, 0, 0);
      return !isBefore(taskTime, now);
    });
  };

  // Render Treatment Card (Pet-based)
  const renderTreatmentCard = ({ item }) => {
    return (
      <TouchableOpacity
        style={styles.treatmentCard}
        onPress={() => navigation.navigate('TreatmentDetail', {
          petId: item.petId,
          petName: item.petName
        })}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#007AFF', '#0051D5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.treatmentCardGradient}
        >
          {/* Header con foto de mascota */}
          <View style={styles.treatmentCardHeader}>
            {item.petImage ? (
              <Image
                source={{ uri: getImageUrl(item.petImage) }}
                style={styles.petAvatarSmall}
              />
            ) : (
              <View style={[styles.petAvatarSmall, styles.petAvatarPlaceholder]}>
                <Ionicons name="paw" size={20} color="#FFFFFF" />
              </View>
            )}
            <View style={styles.treatmentCardInfo}>
              <Text style={styles.treatmentPetName}>{item.petName}</Text>
              <Text style={styles.treatmentMedCount}>
                {item.medications.length} {item.medications.length === 1 ? 'medicamento' : 'medicamentos'}
              </Text>
            </View>
          </View>

          {/* Medicamentos como chips (máximo 4) */}
          <View style={styles.medicationChipsContainer}>
            {item.medications.slice(0, 4).map((med, index) => (
              <View key={index} style={styles.medicationChip}>
                <Ionicons name="medical" size={12} color="rgba(255, 255, 255, 0.9)" />
                <Text style={styles.medicationChipText} numberOfLines={1}>
                  {med}
                </Text>
              </View>
            ))}
            {item.medications.length > 4 && (
              <View style={[styles.medicationChip, styles.medicationChipExtra]}>
                <Text style={styles.medicationChipText}>
                  +{item.medications.length - 4}
                </Text>
              </View>
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  // Render Medication Card (dentro del carrusel de cada mascota)
  const renderMedicationCard = ({ item: medication }) => {
    const isCompleted = isMedicationCompleted(medication.taskIds);
    const nextTime = getNextMedicationTime(medication.times);
    // Mostrar máximo 4 horarios
    const displayTimes = medication.times.slice(0, 4);
    const displayTaskIds = medication.taskIds.slice(0, 4);
    const hasMore = medication.times.length > 4;

    return (
      <View
        style={[
          styles.medicationCardHorizontal,
          isCompleted && styles.medicationCardCompleted,
        ]}
      >
        {/* Header con checkbox */}
        <View style={styles.medCardHeader}>
          <TouchableOpacity
            style={[
              styles.checkbox,
              isCompleted && styles.checkboxCompleted,
            ]}
            onPress={() => toggleMedicationGroup(medication.taskIds)}
            activeOpacity={0.7}
          >
            {isCompleted && (
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            )}
          </TouchableOpacity>
          <View style={styles.medCardHeaderText}>
            <Text
              style={[
                styles.medicationNameCard,
                isCompleted && styles.medicationNameCompleted,
              ]}
              numberOfLines={1}
            >
              {medication.medicationName}
            </Text>
            {medication.dosage && (
              <Text style={styles.medicationDosageCard} numberOfLines={1}>
                {medication.dosage}
              </Text>
            )}
          </View>
        </View>

        {/* Times as clickable chips */}
        <View style={styles.medCardTimes}>
          {displayTimes.map((time, idx) => {
            const taskId = displayTaskIds[idx];
            const isTaskCompleted = completedMeds.has(taskId);
            const isPastTime = isTimePast(time);
            const isNextTime = time === nextTime && !isTaskCompleted;

            return (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.timeChipCard,
                  isNextTime && styles.timeChipNext,
                  (isPastTime && !isTaskCompleted) && styles.timeChipPast,
                  isTaskCompleted && styles.timeChipCompleted,
                ]}
                onPress={() => toggleMedicationComplete(taskId)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.timeChipText,
                  isNextTime && styles.timeChipTextNext,
                  isTaskCompleted && styles.timeChipTextCompleted,
                ]}>
                  {time}
                </Text>
              </TouchableOpacity>
            );
          })}
          {hasMore && (
            <View style={styles.moreTimesIndicator}>
              <Text style={styles.moreTimesText}>+{medication.times.length - 4}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return <Loading />;
  }

  const hasActiveTreatments = activeTreatments.length > 0;
  const hasMedications = dailyTasks.length > 0;
  const hasAppointments = todayAppointments.length > 0;
  const hasAnyContent = hasActiveTreatments || hasMedications || hasAppointments;

  // Encontrar siguiente tarea
  const nextTaskIndex = dailyTasks.findIndex(task => getNextTaskIndex(task.time));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.contentContainer,
        { paddingTop: insets.top + 16 }
      ]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* HEADER DE BIENVENIDA */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hola, {user?.nombre || 'Usuario'}</Text>
          <Text style={styles.subtitle}>
            {totalTasks > 0
              ? `Tienes ${totalTasks} ${totalTasks === 1 ? 'tarea' : 'tareas'} para hoy`
              : 'No tienes tareas pendientes hoy'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Ionicons name="notifications-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* TRATAMIENTOS ACTIVOS (CARRUSEL AGRUPADO POR MASCOTA) */}
      {hasActiveTreatments && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tratamientos Activos</Text>
          <FlatList
            data={activeTreatments}
            renderItem={renderTreatmentCard}
            keyExtractor={(item) => item.petId}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_WIDTH + 12}
            decelerationRate="fast"
            contentContainerStyle={styles.carouselContainer}
          />
        </View>
      )}

      {/* MEDICAMENTOS DE HOY (AGRUPADOS POR MASCOTA EN CARROUSELES) */}
      {hasMedications && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Medicamentos de Hoy</Text>
          {medicationsByPet.map((pet) => (
            <View key={pet.petId} style={styles.petMedicationSection}>
              {/* Header de la mascota */}
              <View style={styles.petMedicationHeader}>
                {pet.petImage ? (
                  <Image
                    source={{ uri: getImageUrl(pet.petImage) }}
                    style={styles.petAvatarTiny}
                  />
                ) : (
                  <View style={[styles.petAvatarTiny, styles.petAvatarPlaceholder]}>
                    <Ionicons name="paw" size={14} color="#007AFF" />
                  </View>
                )}
                <Text style={styles.petMedicationName}>{pet.petName}</Text>
                <Text style={styles.petMedicationCount}>
                  {pet.medications.length} {pet.medications.length === 1 ? 'medicamento' : 'medicamentos'}
                </Text>
              </View>

              {/* Carrusel de medicamentos */}
              <FlatList
                data={pet.medications}
                renderItem={renderMedicationCard}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={CARD_WIDTH * 0.7 + 12}
                decelerationRate="fast"
                contentContainerStyle={styles.medicationCarouselContainer}
              />
            </View>
          ))}
        </View>
      )}

      {/* CITAS DE HOY */}
      {hasAppointments && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Citas de Hoy</Text>
          {todayAppointments.map((apt, index) => {
            const startTime = apt.startDateTime ? format(parseISO(apt.startDateTime), 'HH:mm', { locale: es }) : '--:--';
            const aptTime = parseISO(apt.startDateTime);
            const isPastAppointment = isBefore(aptTime, new Date());
            const isNextAppointment = !isPastAppointment && index === todayAppointments.findIndex(a => !isBefore(parseISO(a.startDateTime), new Date()));

            return (
              <TouchableOpacity
                key={apt.id}
                style={[
                  styles.appointmentCard,
                  isNextAppointment && styles.appointmentCardNext,
                  isPastAppointment && styles.appointmentCardPast,
                ]}
                onPress={() => navigation.navigate('Booking')}
                activeOpacity={0.7}
              >
                <View style={styles.appointmentLeft}>
                  <View style={[
                    styles.appointmentIcon,
                    isNextAppointment && styles.appointmentIconNext,
                  ]}>
                    <Ionicons name="calendar" size={20} color={isNextAppointment ? "#FFFFFF" : "#007AFF"} />
                  </View>
                  <View style={styles.appointmentInfo}>
                    <Text style={[
                      styles.appointmentTitle,
                      isPastAppointment && styles.appointmentTitlePast,
                    ]}>
                      Cita con {apt.vet?.nombre || 'Veterinario'}
                    </Text>
                    <Text style={styles.appointmentMeta}>{apt.pet?.nombre || 'Mascota'}</Text>
                  </View>
                </View>
                <View style={styles.appointmentRight}>
                  <Text style={[
                    styles.appointmentTime,
                    isNextAppointment && styles.appointmentTimeNext,
                    isPastAppointment && styles.appointmentTimePast,
                  ]}>
                    {startTime}
                  </Text>
                  {isPastAppointment && (
                    <Text style={styles.pastLabel}>Pasada</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* ACCESOS RÁPIDOS */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Accesos Rápidos</Text>
        <View style={styles.quickAccessGrid}>
          {/* Nueva Cita */}
          <TouchableOpacity
            style={[styles.quickAccessCard, { backgroundColor: '#007AFF' }]}
            onPress={() => navigation.navigate('Booking')}
            activeOpacity={0.8}
          >
            <Ionicons name="calendar" size={32} color="#FFFFFF" />
            <Text style={styles.quickAccessLabel}>Nueva Cita</Text>
          </TouchableOpacity>

          {/* Cartilla */}
          <TouchableOpacity
            style={[styles.quickAccessCard, { backgroundColor: '#34C759' }]}
            onPress={() => navigation.navigate('Pets')}
            activeOpacity={0.8}
          >
            <Ionicons name="shield-checkmark" size={32} color="#FFFFFF" />
            <Text style={styles.quickAccessLabel}>Cartilla</Text>
          </TouchableOpacity>

          {/* Recetas */}
          <TouchableOpacity
            style={[styles.quickAccessCard, { backgroundColor: '#FF9500' }]}
            onPress={() => navigation.navigate('PrescriptionsList')}
            activeOpacity={0.8}
          >
            <Ionicons name="document-text" size={32} color="#FFFFFF" />
            <Text style={styles.quickAccessLabel}>Recetas</Text>
          </TouchableOpacity>

          {/* Llamar Clínica */}
          <TouchableOpacity
            style={[styles.quickAccessCard, { backgroundColor: '#FF3B30' }]}
            onPress={() => {
              Alert.alert(
                'Llamar a la Clínica',
                '¿Deseas contactar a tu clínica veterinaria?',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Llamar',
                    onPress: () => {
                      const phoneNumber = 'tel:5551234567';
                      Linking.openURL(phoneNumber).catch(err => {
                        console.error('Error opening dialer:', err);
                        showToast.error('No se pudo abrir el marcador');
                      });
                    },
                  },
                ]
              );
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="call" size={32} color="#FFFFFF" />
            <Text style={styles.quickAccessLabel}>Llamar Clínica</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ESTADO VACÍO */}
      {!hasAnyContent && (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="paw" size={64} color="#007AFF" />
          </View>
          <Text style={styles.emptyStateTitle}>¡Todos sanos! 🐶</Text>
          <Text style={styles.emptyStateText}>
            No tienes tratamientos activos ni citas pendientes hoy
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#8E8E93',
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  // Section
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  // Treatment Carousel
  carouselContainer: {
    paddingRight: 16,
  },
  treatmentCard: {
    width: CARD_WIDTH,
    marginRight: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  treatmentCardGradient: {
    padding: 20,
    height: 160,
  },
  treatmentCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  petAvatarSmall: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  petAvatarPlaceholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  treatmentCardInfo: {
    flex: 1,
  },
  treatmentPetName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  treatmentMedCount: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  medicationChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  medicationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    gap: 4,
  },
  medicationChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    maxWidth: 120,
  },
  medicationChipExtra: {
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  // Medication Cards
  medicationCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  medicationCardNext: {
    borderWidth: 2,
    borderColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  medicationCardPast: {
    opacity: 0.6,
  },
  medicationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#C7C7CC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxCompleted: {
    backgroundColor: '#34C759',
    borderColor: '#34C759',
  },
  petAvatarTiny: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  medicationInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  medicationNameCompleted: {
    textDecorationLine: 'line-through',
    color: '#8E8E93',
  },
  medicationPetName: {
    fontSize: 13,
    color: '#8E8E93',
  },
  medicationDosageText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  medicationCardCompleted: {
    opacity: 0.6,
  },
  // Time chips
  medicationTimesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginLeft: 8,
    maxWidth: 130,
    justifyContent: 'flex-end',
  },
  timeChip: {
    backgroundColor: '#F2F2F7',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  timeChipNext: {
    backgroundColor: '#007AFF',
  },
  timeChipPast: {
    backgroundColor: '#E5E5EA',
  },
  timeChipCompleted: {
    backgroundColor: '#D1F5E0',
    borderWidth: 1,
    borderColor: '#34C759',
  },
  timeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
  },
  timeChipTextNext: {
    color: '#FFFFFF',
  },
  timeChipTextCompleted: {
    color: '#34C759',
  },
  medicationRight: {
    alignItems: 'flex-end',
  },
  medicationTime: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
  },
  medicationTimeNext: {
    fontSize: 17,
    fontWeight: '700',
  },
  medicationTimePast: {
    color: '#8E8E93',
  },
  nextLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#007AFF',
    marginTop: 2,
  },
  // Pet Medication Section (Carrusel por mascota)
  petMedicationSection: {
    marginBottom: 20,
  },
  petMedicationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  petMedicationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginRight: 8,
  },
  petMedicationCount: {
    fontSize: 13,
    color: '#8E8E93',
  },
  medicationCarouselContainer: {
    paddingRight: 16,
  },
  medicationCardHorizontal: {
    width: CARD_WIDTH * 0.7,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  medCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  medCardHeaderText: {
    flex: 1,
    marginLeft: 4,
  },
  medicationNameCard: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  medicationDosageCard: {
    fontSize: 12,
    color: '#8E8E93',
  },
  medCardTimes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeChipCard: {
    backgroundColor: '#F2F2F7',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    minWidth: 60,
    alignItems: 'center',
  },
  moreTimesIndicator: {
    backgroundColor: '#E5E5EA',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreTimesText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
  },
  // Appointments
  appointmentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  appointmentCardNext: {
    borderWidth: 2,
    borderColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  appointmentCardPast: {
    opacity: 0.5,
    transform: [{ scale: 0.98 }],
  },
  appointmentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  appointmentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  appointmentIconNext: {
    backgroundColor: '#007AFF',
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  appointmentTitlePast: {
    color: '#8E8E93',
  },
  appointmentMeta: {
    fontSize: 13,
    color: '#8E8E93',
  },
  appointmentRight: {
    alignItems: 'flex-end',
  },
  appointmentTime: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
  },
  appointmentTimeNext: {
    fontSize: 17,
    fontWeight: '700',
  },
  appointmentTimePast: {
    color: '#8E8E93',
  },
  pastLabel: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
  },
  // Quick Access Grid
  quickAccessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  quickAccessCard: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 16,
    padding: 20,
    margin: '1%',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  quickAccessLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 12,
    textAlign: 'center',
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});

export default HomeScreen;
