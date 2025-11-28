import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Alert, 
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Modal
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { appointmentAPI, petsAPI } from '../../services/api';
import { Loading, Button, Input, DatePickerInput } from '../../components';
import { format, addMinutes } from 'date-fns';

const CreateAppointmentScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPet, setSelectedPet] = useState(null);
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [tempTime, setTempTime] = useState(new Date()); // Estado temporal para el picker de iOS
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  
  // Picker Visibility
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [searching, setSearching] = useState(false);

  // Optimized Search Logic
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      // Search with 2 or more chars
      if (searchQuery.length >= 2 && !selectedPet) {
        handleSearch(searchQuery);
      } else if (searchQuery.length < 2) {
        setSearchResults([]);
      }
    }, 300); 

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, selectedPet]);

  const handleSearch = async (query) => {
    setSearching(true);
    try {
      const response = await petsAPI.search(query);
      setSearchResults(response.data.pets);
    } catch (error) {
      console.error('Error searching pets:', error);
    } finally {
      setSearching(false);
    }
  };

  const selectPet = (pet) => {
    setSelectedPet(pet);
    setSearchQuery(pet.nombre);
    setSearchResults([]);
  };

  const clearSelection = () => {
    setSelectedPet(null);
    setSearchQuery('');
    setSearchResults([]);
  };

  const openTimePicker = () => {
    setTempTime(time); // Inicializar con la hora actual
    setShowTimePicker(true);
  };

  const onTimeChange = (event, selectedTime) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
      if (selectedTime) {
        setTime(selectedTime);
      }
    } else {
      // En iOS solo actualizamos el estado temporal
      if (selectedTime) {
        setTempTime(selectedTime);
      }
    }
  };

  const handleConfirmTime = () => {
    setTime(tempTime);
    setShowTimePicker(false);
  };

  const handleSave = async () => {
    if (!selectedPet) {
      Alert.alert('Error', 'Por favor selecciona un paciente');
      return;
    }
    if (!reason) {
      Alert.alert('Error', 'Por favor ingresa el motivo de la consulta');
      return;
    }

    setLoading(true);
    try {
      const startDateTime = new Date(date);
      startDateTime.setHours(time.getHours());
      startDateTime.setMinutes(time.getMinutes());
      startDateTime.setSeconds(0);

      const endDateTime = addMinutes(startDateTime, 30);

      await appointmentAPI.create({
        clinicId: 'default',
        petId: selectedPet.id,
        startDateTime: startDateTime.toISOString(),
        endDateTime: endDateTime.toISOString(),
        reason,
        notes
      });

      Alert.alert('Éxito', 'Cita agendada correctamente', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error creating appointment:', error);
      if (error.response?.status === 409) {
        Alert.alert('Conflicto', 'Ya tienes una cita agendada en ese horario');
      } else {
        Alert.alert('Error', 'No se pudo agendar la cita');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.overlay}
    >
      <TouchableWithoutFeedback onPress={() => navigation.goBack()}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <View style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Nueva Cita</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.scrollContent} 
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          
          {/* Buscador de Paciente */}
          <Text style={styles.label}>Paciente</Text>
          <View style={styles.searchContainer}>
            <View style={[styles.inputWrapper, selectedPet && styles.inputWrapperSelected]}>
              {searching ? (
                <ActivityIndicator size="small" color="#007AFF" style={styles.searchIcon} />
              ) : (
                <Ionicons 
                  name={selectedPet ? "paw" : "search"} 
                  size={20} 
                  color={selectedPet ? "#007AFF" : "#666"} 
                  style={styles.searchIcon} 
                />
              )}
              
              <TextInput
                style={[styles.searchInput, selectedPet && styles.searchInputSelected]}
                placeholder="Escribe el nombre del paciente..."
                value={searchQuery}
                onChangeText={(text) => {
                  if (selectedPet) setSelectedPet(null); 
                  setSearchQuery(text);
                }}
                autoCapitalize="sentences"
              />
              
              {(searchQuery.length > 0 || selectedPet) && (
                <TouchableOpacity onPress={clearSelection} style={styles.clearButton}>
                  <Ionicons name="close-circle" size={18} color="#999" />
                </TouchableOpacity>
              )}
            </View>
            
            {/* Resultados Flotantes */}
            {searchResults.length > 0 && !selectedPet && (
              <View style={styles.resultsContainer}>
                {searchResults.map((pet) => (
                  <TouchableOpacity 
                    key={pet.id} 
                    style={styles.resultItem}
                    onPress={() => selectPet(pet)}
                  >
                    <Text style={styles.resultName}>{pet.nombre}</Text>
                    <Text style={styles.resultDetail}>
                      {pet.especie} • {pet.raza || 'Sin raza'}
                    </Text>
                    <Text style={styles.resultOwner}>
                      Dueño: {pet.user?.nombre || 'Sin dueño'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Fecha y Hora */}
          <View style={styles.row}>
            <View style={styles.dateInputContainer}>
              <DatePickerInput
                label="Fecha"
                value={date}
                onChange={setDate}
                minimumDate={new Date()}
              />
            </View>

            <View style={styles.timeInputContainer}>
              <Text style={styles.pickerLabel}>Hora</Text>
              <TouchableOpacity 
                style={styles.pickerButton}
                onPress={openTimePicker}
              >
                <Ionicons name="time-outline" size={20} color="#007AFF" />
                <Text style={styles.pickerText}>{format(time, 'HH:mm')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Modal de Hora para iOS */}
          {Platform.OS === 'ios' && (
            <Modal
              visible={showTimePicker}
              transparent
              animationType="fade"
              onRequestClose={() => setShowTimePicker(false)}
            >
              <TouchableOpacity 
                style={styles.timePickerOverlay}
                activeOpacity={1}
                onPress={() => setShowTimePicker(false)}
              >
                <View style={styles.timePickerContent}>
                  <Text style={styles.timePickerTitle}>Seleccionar Hora</Text>
                  <DateTimePicker
                    value={tempTime}
                    mode="time"
                    display="spinner"
                    onChange={onTimeChange}
                    textColor="#000000"
                    style={{ height: 120, width: '100%' }}
                  />
                  <View style={styles.timePickerButtons}>
                    <TouchableOpacity 
                      onPress={() => setShowTimePicker(false)}
                      style={styles.timePickerCancelButton}
                    >
                      <Text style={styles.timePickerCancelText}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={handleConfirmTime}
                      style={styles.timePickerConfirmButton}
                    >
                      <Text style={styles.timePickerConfirmText}>Confirmar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            </Modal>
          )}

          {/* Picker Android Nativo */}
          {Platform.OS === 'android' && showTimePicker && (
            <DateTimePicker
              value={time}
              mode="time"
              display="default"
              onChange={onTimeChange}
            />
          )}

          {/* Motivo */}
          <Input
            label="Motivo de Consulta"
            placeholder="Ej. Vacuna, Revisión, Urgencia..."
            value={reason}
            onChangeText={setReason}
            containerStyle={{ marginBottom: 15 }}
          />

          {/* Notas */}
          <Input
            label="Notas Internas"
            placeholder="Detalles adicionales (opcional)..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            style={{ height: 80, textAlignVertical: 'top' }}
            containerStyle={{ marginBottom: 40 }}
          />

          {/* Botón Agendar */}
          <Button
            title="Agendar Cita"
            onPress={handleSave}
            loading={loading}
            style={styles.submitButton}
          />
          
          <View style={{ height: 40 }} /> 
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    height: 'auto',
    maxHeight: '85%', 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  closeButton: {
    padding: 4,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
  },
  scrollContent: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
    marginLeft: 2,
  },
  searchContainer: {
    marginBottom: 15,
    zIndex: 20, 
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    paddingHorizontal: 12,
    height: 50,
  },
  inputWrapperSelected: {
    backgroundColor: '#F0F8FF',
    borderColor: '#007AFF',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  searchInputSelected: {
    fontWeight: '600',
    color: '#007AFF',
  },
  clearButton: {
    padding: 5,
  },
  resultsContainer: {
    position: 'absolute',
    top: 55,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    maxHeight: 220,
    zIndex: 100,
  },
  resultItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  resultDetail: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  resultOwner: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
    fontStyle: 'italic',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  dateInputContainer: {
    flex: 1,
    marginRight: 12,
  },
  timeInputContainer: {
    width: '35%',
    marginBottom: 24, // Match DatePickerInput container margin
  },
  pickerLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7', // Match DatePickerInput style
    padding: 16, // Match DatePickerInput padding
    borderRadius: 12,
    borderWidth: 0, // Match DatePickerInput border
    gap: 12, // Match DatePickerInput gap
  },
  pickerText: {
    flex: 1, // Match DatePickerInput flex
    fontSize: 16, // Match DatePickerInput size
    color: '#000', // Match DatePickerInput color
  },
  submitButton: {
    marginTop: 10,
    marginBottom: 10,
  },
  // Estilos para el modal de hora iOS
  timePickerOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  timePickerContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  timePickerTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 10,
    color: '#000',
  },
  timePickerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingTop: 15,
  },
  timePickerCancelButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  timePickerCancelText: {
    fontSize: 17,
    color: '#007AFF',
  },
  timePickerConfirmButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  timePickerConfirmText: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '600',
  },
});

export default CreateAppointmentScreen;
