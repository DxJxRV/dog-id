import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, FlatList } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import CalendarStrip from 'react-native-calendar-strip';
import { Button, Input, Loading } from '../../components';
import { appointmentAPI, petsAPI } from '../../services/api';
import { format } from 'date-fns';
import 'moment/locale/es'; // Import locale

const RequestAppointmentScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { vetId, clinicId, vetName } = route.params;

  const [myPets, setMyPets] = useState([]);
  const [selectedPet, setSelectedPet] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);

  // 1. Fetch User's Pets
  useEffect(() => {
    const fetchPets = async () => {
      try {
        const response = await petsAPI.getAll();
        setMyPets(response.data.pets);
        if(response.data.pets.length > 0) {
            setSelectedPet(response.data.pets[0]);
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchPets();
  }, []);

  // 2. Fetch Slots when Date changes
  useEffect(() => {
    const fetchSlots = async () => {
        // Solo fetch slots si tenemos un vetId específico (limitación del MVP)
        // Si es clínica general, por ahora no mostramos slots o mostramos genéricos
        if (!vetId) return;

        setSlotsLoading(true);
        setSelectedSlot(null);
        try {
            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            const response = await appointmentAPI.getSlots(vetId, dateStr);
            setAvailableSlots(response.data.slots);
        } catch (error) {
            console.error(error);
        } finally {
            setSlotsLoading(false);
        }
    };
    fetchSlots();
  }, [selectedDate, vetId]);

  const handleRequest = async () => {
      if(!selectedPet || !reason) {
          Alert.alert('Error', 'Completa todos los campos');
          return;
      }
      
      // Si hay slots disponibles y no seleccionó uno, validar. Si no hay vetId, la hora es aproximada (MVP)
      if(vetId && !selectedSlot) {
          Alert.alert('Error', 'Selecciona un horario');
          return;
      }

      setLoading(true);
      try {
          let startDateTime;
          if (selectedSlot) {
              const [hours, minutes] = selectedSlot.split(':');
              startDateTime = new Date(selectedDate);
              startDateTime.setHours(parseInt(hours), parseInt(minutes), 0);
          } else {
              // Fallback para clínica sin vet específico: mediodía
              startDateTime = new Date(selectedDate);
              startDateTime.setHours(12, 0, 0); 
          }

          await appointmentAPI.request({
              clinicId,
              vetId,
              petId: selectedPet.id,
              startDateTime: startDateTime.toISOString(),
              reason
          });

          Alert.alert('Solicitud Enviada', 'El especialista confirmará tu cita pronto.', [
              { text: 'OK', onPress: () => navigation.navigate('BookingHub') }
          ]);
      } catch (error) {
          console.error(error);
          Alert.alert('Error', 'No se pudo enviar la solicitud');
      } finally {
          setLoading(false);
      }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.headerTitle}>Solicitar Cita</Text>
      <Text style={styles.subTitle}>{vetName}</Text>

      {/* Paso 1: Mascota */}
      <Text style={styles.label}>1. Selecciona Paciente</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.petsList}>
          {myPets.map(pet => (
              <TouchableOpacity 
                key={pet.id}
                style={[styles.petChip, selectedPet?.id === pet.id && styles.petChipSelected]}
                onPress={() => setSelectedPet(pet)}
              >
                  <Ionicons name="paw" size={16} color={selectedPet?.id === pet.id ? '#FFF' : '#666'} />
                  <Text style={[styles.petText, selectedPet?.id === pet.id && styles.petTextSelected]}>{pet.nombre}</Text>
              </TouchableOpacity>
          ))}
      </ScrollView>

      {/* Paso 2: Fecha */}
      <Text style={styles.label}>2. Elige el Día</Text>
      <CalendarStrip
        style={{height: 100, paddingTop: 10, paddingBottom: 10}}
        calendarColor={'white'}
        calendarHeaderStyle={{color: '#333'}}
        dateNumberStyle={{color: '#333'}}
        dateNameStyle={{color: '#999'}}
        highlightDateNumberStyle={{color: '#FFF', backgroundColor: '#007AFF', borderRadius: 15, overflow: 'hidden'}}
        highlightDateNameStyle={{color: '#007AFF'}}
        locale={{name: 'es', config: {months: 'Enero_Febrero_Marzo_Abril_Mayo_Junio_Julio_Agosto_Septiembre_Octubre_Noviembre_Diciembre'.split('_'), monthsShort: 'Ene_Feb_Mar_Abr_May_Jun_Jul_Ago_Sep_Oct_Nov_Dic'.split('_'), weekdays: 'Domingo_Lunes_Martes_Miércoles_Jueves_Viernes_Sábado'.split('_'), weekdaysShort: 'Dom_Lun_Mar_Mié_Jue_Vie_Sáb'.split('_'), weekdaysMin: 'Do_Lu_Ma_Mi_Ju_Vi_Sá'.split('_')}}}
        selectedDate={selectedDate}
        onDateSelected={(date) => setSelectedDate(date.toDate())}
        minDate={new Date()}
      />

      {/* Paso 3: Hora (Solo si hay vetId) */}
      {vetId && (
          <>
            <Text style={styles.label}>3. Horarios Disponibles</Text>
            {slotsLoading ? (
                <Loading />
            ) : availableSlots.length > 0 ? (
                <View style={styles.slotsGrid}>
                    {availableSlots.map(slot => (
                        <TouchableOpacity 
                            key={slot}
                            style={[styles.slot, selectedSlot === slot && styles.slotSelected]}
                            onPress={() => setSelectedSlot(slot)}
                        >
                            <Text style={[styles.slotText, selectedSlot === slot && styles.slotTextSelected]}>{slot}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            ) : (
                <Text style={styles.noSlots}>No hay horarios disponibles para este día.</Text>
            )}
          </>
      )}

      {/* Paso 4: Motivo */}
      <Text style={styles.label}>{vetId ? '4' : '3'}. Motivo de consulta</Text>
      <Input 
        placeholder="Ej. Vacunación, Revisión..."
        value={reason}
        onChangeText={setReason}
        containerStyle={{ marginBottom: 30 }}
      />

      <Button 
        title="Enviar Solicitud" 
        onPress={handleRequest} 
        loading={loading}
      />
      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  subTitle: { fontSize: 16, color: '#666', marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', marginTop: 15, marginBottom: 10, color: '#444' },
  petsList: { flexDirection: 'row', marginBottom: 10, height: 50 },
  petChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#F5F5F5', marginRight: 10, height: 40 },
  petChipSelected: { backgroundColor: '#007AFF' },
  petText: { marginLeft: 6, color: '#333' },
  petTextSelected: { color: '#FFF', fontWeight: '600' },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slot: { width: '22%', padding: 10, borderRadius: 8, backgroundColor: '#F9F9F9', alignItems: 'center', borderWidth: 1, borderColor: '#EEE' },
  slotSelected: { backgroundColor: '#E8F4FD', borderColor: '#007AFF' },
  slotText: { color: '#333', fontSize: 13 },
  slotTextSelected: { color: '#007AFF', fontWeight: 'bold' },
  noSlots: { color: '#999', fontStyle: 'italic', textAlign: 'center', marginVertical: 10 }
});

export default RequestAppointmentScreen;