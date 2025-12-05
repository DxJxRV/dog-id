import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  getVaccineScheme,
  matchVaccineName,
  getAgeInWeeks,
  isPuppy as checkIfPuppy,
} from '../constants/vaccines';

const { width } = Dimensions.get('window');
const STAMP_SIZE = (width - 64) / 3; // 3 columnas con padding

const VaccinationPassport = ({
  vaccines = [],
  petBirthDate,
  userType,
  onAddVaccine,
  onScheduleAppointment,
}) => {
  const isVet = userType === 'vet';
  const ageInWeeks = getAgeInWeeks(petBirthDate);
  const isPuppy = ageInWeeks ? checkIfPuppy(ageInWeeks) : false;

  // Obtener el esquema de vacunación apropiado
  const vaccineScheme = useMemo(() => {
    return getVaccineScheme(petBirthDate);
  }, [petBirthDate]);

  // Mapear vacunas registradas al esquema estándar
  const vaccineStatus = useMemo(() => {
    const status = {};

    vaccineScheme.forEach((schemeVaccine) => {
      // Buscar si esta vacuna ya fue aplicada
      const appliedVaccine = vaccines.find((registeredVaccine) => {
        const matchedName = matchVaccineName(registeredVaccine.nombre);
        return matchedName === schemeVaccine.name;
      });

      status[schemeVaccine.name] = {
        applied: !!appliedVaccine,
        vaccine: appliedVaccine || null,
        scheme: schemeVaccine,
      };
    });

    return status;
  }, [vaccines, vaccineScheme]);

  // Calcular progreso
  const progress = useMemo(() => {
    const total = Object.keys(vaccineStatus).length;
    const completed = Object.values(vaccineStatus).filter((v) => v.applied).length;

    return {
      completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [vaccineStatus]);

  const handleStampPress = (vaccineName, isApplied) => {
    if (isApplied) {
      // Ya está aplicada, no hacer nada (o mostrar detalles)
      return;
    }

    if (isVet && onAddVaccine) {
      // Veterinario: abrir formulario para aplicarla
      onAddVaccine(vaccineName);
    } else if (!isVet && onScheduleAppointment) {
      // Owner: sugerir agendar cita
      onScheduleAppointment(vaccineName);
    }
  };

  const renderStamp = (vaccineName, vaccineData) => {
    const { applied, vaccine, scheme } = vaccineData;

    return (
      <TouchableOpacity
        key={vaccineName}
        style={styles.stampContainer}
        onPress={() => handleStampPress(vaccineName, applied)}
        activeOpacity={applied ? 1 : 0.7}
        disabled={applied}
      >
        <View
          style={[
            styles.stamp,
            applied ? styles.stampApplied : styles.stampEmpty,
          ]}
        >
          {applied ? (
            // Sello aplicado (verde con fecha)
            <>
              <View style={styles.stampCheckContainer}>
                <Ionicons name="checkmark-circle" size={32} color="#34C759" />
              </View>
              <Text style={styles.stampDate}>
                {vaccine?.fechaAplicacion
                  ? format(parseISO(vaccine.fechaAplicacion), 'dd/MM/yy', { locale: es })
                  : 'Sin fecha'}
              </Text>
              <Text style={styles.stampName} numberOfLines={2}>
                {vaccineName}
              </Text>
            </>
          ) : (
            // Sello vacío (gris punteado)
            <>
              <View style={styles.stampEmptyCircle}>
                <Ionicons name="medical-outline" size={32} color="#C7C7CC" />
              </View>
              <Text style={styles.stampNameEmpty} numberOfLines={2}>
                {vaccineName}
              </Text>
              {scheme.week && (
                <Text style={styles.stampWeek}>Semana {scheme.week}</Text>
              )}
              {scheme.frequency && (
                <Text style={styles.stampFrequency}>{scheme.frequency}</Text>
              )}
              <View style={styles.actionHint}>
                <Ionicons
                  name={isVet ? 'add-circle-outline' : 'calendar-outline'}
                  size={16}
                  color="#007AFF"
                />
              </View>
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header con progreso */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="shield-checkmark" size={24} color="#007AFF" />
          <Text style={styles.headerTitle}>
            Pasaporte de Vacunación
          </Text>
        </View>
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            {progress.completed}/{progress.total}
          </Text>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${progress.percentage}%` },
              ]}
            />
          </View>
        </View>
      </View>

      {/* Indicador de etapa */}
      {ageInWeeks !== null && (
        <View style={styles.stageIndicator}>
          <Ionicons
            name={isPuppy ? 'paw' : 'heart'}
            size={16}
            color={isPuppy ? '#FF9500' : '#007AFF'}
          />
          <Text style={styles.stageText}>
            {isPuppy
              ? `Cachorro - ${ageInWeeks} semanas`
              : 'Adulto - Refuerzos anuales'}
          </Text>
        </View>
      )}

      {/* Cartilla (Grid de sellos) */}
      <ScrollView
        style={styles.passportScroll}
        contentContainerStyle={styles.passportContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stampGrid}>
          {Object.entries(vaccineStatus).map(([name, data]) =>
            renderStamp(name, data)
          )}
        </View>

        {/* Leyenda */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#34C759' }]} />
            <Text style={styles.legendText}>Aplicada</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { borderWidth: 2, borderColor: '#C7C7CC', borderStyle: 'dashed' }]} />
            <Text style={styles.legendText}>Pendiente</Text>
          </View>
        </View>

        {/* Mensaje de acción según userType */}
        <View style={styles.actionMessage}>
          <Ionicons
            name="information-circle-outline"
            size={18}
            color="#8E8E93"
          />
          <Text style={styles.actionMessageText}>
            {isVet
              ? 'Toca un sello vacío para registrar la vacuna'
              : 'Toca un sello vacío para agendar cita'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEFCE8', // Fondo crema suave tipo cartilla
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  progressContainer: {
    alignItems: 'flex-end',
  },
  progressText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 4,
  },
  progressBarBg: {
    width: 80,
    height: 6,
    backgroundColor: '#E5E5EA',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#34C759',
    borderRadius: 3,
  },
  stageIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFF9E6',
    borderBottomWidth: 1,
    borderBottomColor: '#F0E68C',
  },
  stageText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  passportScroll: {
    flex: 1,
  },
  passportContent: {
    padding: 20,
  },
  stampGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  stampContainer: {
    width: STAMP_SIZE,
    marginBottom: 8,
  },
  stamp: {
    width: STAMP_SIZE,
    height: STAMP_SIZE,
    borderRadius: STAMP_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  stampApplied: {
    backgroundColor: '#D1F5E0',
    borderWidth: 3,
    borderColor: '#34C759',
    // Efecto de sello irregular
    borderStyle: 'solid',
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  stampEmpty: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#C7C7CC',
    borderStyle: 'dashed',
  },
  stampCheckContainer: {
    marginBottom: 4,
  },
  stampDate: {
    fontSize: 13,
    fontWeight: '700',
    color: '#34C759',
    marginBottom: 4,
  },
  stampName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
  stampEmptyCircle: {
    marginBottom: 8,
  },
  stampNameEmpty: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 4,
  },
  stampWeek: {
    fontSize: 10,
    color: '#8E8E93',
    textAlign: 'center',
  },
  stampFrequency: {
    fontSize: 10,
    color: '#8E8E93',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  actionHint: {
    marginTop: 8,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  legendText: {
    fontSize: 13,
    color: '#666',
  },
  actionMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
  },
  actionMessageText: {
    flex: 1,
    fontSize: 12,
    color: '#8E8E93',
    lineHeight: 18,
  },
});

export default VaccinationPassport;
