import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, FlatList, RefreshControl } from 'react-native';
import CalendarStrip from 'react-native-calendar-strip';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { appointmentAPI } from '../../services/api';
import { Loading } from '../../components';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import moment from 'moment';
import 'moment/locale/es';

const AppointmentSchedulerScreen = () => {
  const navigation = useNavigation();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchAppointments = async (date) => {
    setLoading(true);
    try {
      // Solicitar citas para el día completo seleccionado
      const start = startOfDay(date);
      const end = endOfDay(date);

      const response = await appointmentAPI.getSchedule({
        start: start.toISOString(),
        end: end.toISOString()
      });

      setAppointments(response.data.appointments);
    } catch (error) {
      console.error('Error fetching schedule:', error);
      Alert.alert('Error', 'No se pudo cargar la agenda del día');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments(selectedDate);
  }, [selectedDate]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'CONFIRMED': return '#4CAF50'; // Green
      case 'PENDING': return '#FFC107'; // Amber
      case 'IN_PROCESS': return '#2196F3'; // Blue
      case 'COMPLETED': return '#9E9E9E'; // Grey
      case 'CANCELLED': return '#F44336'; // Red
      case 'NO_SHOW': return '#607D8B'; // Blue Grey
      default: return '#007AFF';
    }
  };

  const handleAppointmentPress = (item) => {
    Alert.alert(
      'Cita con ' + item.pet.nombre,
      `Estado: ${item.status}\nHorario: ${format(parseISO(item.startDateTime), 'HH:mm')} - ${format(parseISO(item.endDateTime), 'HH:mm')}\n\n¿Deseas iniciar la consulta ahora?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Iniciar Consulta',
          onPress: () => startConsultation(item)
        }
      ]
    );
  };

  const startConsultation = (item) => {
    navigation.navigate('RecordConsultation', {
      petId: item.petId,
      appointmentId: item.id,
      petName: item.pet.nombre
    });
  };

  const renderItem = ({ item }) => {
    const statusColor = getStatusColor(item.status);
    const startTime = format(parseISO(item.startDateTime), 'HH:mm');
    const endTime = format(parseISO(item.endDateTime), 'HH:mm');

    return (
      <TouchableOpacity 
        style={[styles.card, { borderLeftColor: statusColor }]}
        onPress={() => handleAppointmentPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{startTime}</Text>
            <Text style={styles.timeTextSmall}>{endTime}</Text>
          </View>
          
          <View style={styles.infoContainer}>
            <Text style={styles.petName}>🐾 {item.pet.nombre}</Text>
            <Text style={styles.detailsText}>{item.reason || 'Visita general'}</Text>
          </View>

          <View style={[styles.badge, { backgroundColor: statusColor }]}>
            <Text style={styles.badgeText}>{item.status}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      {!loading && (
        <>
          <Ionicons name="calendar-outline" size={64} color="#CCC" />
          <Text style={styles.emptyText}>No hay citas para este día</Text>
        </>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <CalendarStrip
        scrollable
        style={{ height: 100, paddingTop: 10, paddingBottom: 10 }}
        calendarColor={'white'}
        calendarHeaderStyle={{ color: '#333', fontSize: 16 }}
        dateNumberStyle={{ color: '#333', fontSize: 16 }}
        dateNameStyle={{ color: '#999', fontSize: 12 }}
        iconContainer={{ flex: 0.1 }}
        highlightDateNumberStyle={{ color: '#fff', backgroundColor: '#007AFF', borderRadius: 15, overflow: 'hidden' }}
        highlightDateNameStyle={{ color: '#007AFF' }}
        highlightDateContainerStyle={{ backgroundColor: '#007AFF', borderRadius: 20, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }}
        locale={{ name: 'es', config: { months: 'Enero_Febrero_Marzo_Abril_Mayo_Junio_Julio_Agosto_Septiembre_Octubre_Noviembre_Diciembre'.split('_'), monthsShort: 'Ene_Feb_Mar_Abr_May_Jun_Jul_Ago_Sep_Oct_Nov_Dic'.split('_'), weekdays: 'Domingo_Lunes_Martes_Miércoles_Jueves_Viernes_Sábado'.split('_'), weekdaysShort: 'Dom_Lun_Mar_Mié_Jue_Vie_Sáb'.split('_'), weekdaysMin: 'Do_Lu_Ma_Mi_Ju_Vi_Sá'.split('_'), longDateFormat: { LT: 'H:mm', LTS: 'H:mm:ss', L: 'DD/MM/YYYY', LL: 'D [de] MMMM [de] YYYY', LLL: 'D [de] MMMM [de] YYYY H:mm', LLLL: 'dddd, D [de] MMMM [de] YYYY H:mm' }, calendar: { sameDay: function () { return '[hoy a la' + ((this.hours() !== 1) ? 's' : '') + '] LT'; }, nextDay: function () { return '[mañana a la' + ((this.hours() !== 1) ? 's' : '') + '] LT'; }, nextWeek: function () { return 'dddd [a la' + ((this.hours() !== 1) ? 's' : '') + '] LT'; }, lastDay: function () { return '[ayer a la' + ((this.hours() !== 1) ? 's' : '') + '] LT'; }, lastWeek: function () { return '[el] dddd [pasado a la' + ((this.hours() !== 1) ? 's' : '') + '] LT'; }, sameElse: 'L' }, relativeTime: { future: 'en %s', past: 'hace %s', s: 'unos segundos', m: 'un minuto', mm: '%d minutos', h: 'una hora', hh: '%d horas', d: 'un día', dd: '%d días', M: 'un mes', MM: '%d meses', y: 'un año', yy: '%d años' }, ordinalParse: /\d{1,2}º/, ordinal: '%dº', week: { dow: 1, doy: 4 } } }}
        selectedDate={selectedDate}
        onDateSelected={(date) => setSelectedDate(date.toDate())}
        // Personalización del highlight para que sea circular y azul
        daySelectionAnimation={{ type: 'background', duration: 200, highlightColor: '#007AFF' }}
      />

      <View style={styles.listContainer}>
        {loading && (
          <View style={styles.loadingOverlay}>
            <Loading size="large" color="#007AFF" />
          </View>
        )}
        
        <FlatList
          data={appointments}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyComponent}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => fetchAppointments(selectedDate)}
            />
          }
        />
      </View>

      <TouchableOpacity 
        style={styles.fab}
        onPress={() => navigation.navigate('CreateAppointment')}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  listContainer: {
    flex: 1,
    position: 'relative',
  },
  listContent: {
    padding: 15,
    paddingBottom: 100, // Espacio para el FAB
    flexGrow: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.5)', // More transparent
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    padding: 15,
    borderLeftWidth: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeContainer: {
    alignItems: 'center',
    marginRight: 15,
    minWidth: 50,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  timeTextSmall: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  petName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  detailsText: {
    fontSize: 14,
    color: '#666',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 10,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
  },
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    right: 20,
    bottom: 30,
    backgroundColor: '#007AFF',
    borderRadius: 28,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  }
});

export default AppointmentSchedulerScreen;
