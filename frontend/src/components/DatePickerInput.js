import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';

const DatePickerInput = ({
  label,
  value,
  onChange,
  minimumDate,
  maximumDate,
  required = false,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(value || null);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [tempMonth, setTempMonth] = useState(new Date().getMonth());
  const [tempYear, setTempYear] = useState(new Date().getFullYear());

  const handleDateSelect = (day) => {
    const newDate = new Date(day.timestamp);
    setSelectedDate(newDate);
  };

  const handleConfirm = () => {
    if (selectedDate) {
      onChange(selectedDate);
    }
    setShowPicker(false);
  };

  const handleCancel = () => {
    setSelectedDate(value || null);
    setShowPicker(false);
  };

  const handleClear = () => {
    setSelectedDate(null);
    onChange(null);
    setShowPicker(false);
  };

  const formatDate = (date) => {
    if (!date) return 'mm/dd/yyyy';

    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const formatDateForCalendar = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const markedDates = selectedDate
    ? {
        [formatDateForCalendar(selectedDate)]: {
          selected: true,
          selectedColor: '#007AFF',
        },
      }
    : {};

  const handleOpenMonthPicker = () => {
    setTempMonth(currentMonth.getMonth());
    setShowMonthPicker(true);
  };

  const handleOpenYearPicker = () => {
    setTempYear(currentMonth.getFullYear());
    setShowYearPicker(true);
  };

  const handleMonthConfirm = () => {
    const newDate = new Date(currentMonth.getFullYear(), tempMonth, 1);
    setCurrentMonth(newDate);
    setShowMonthPicker(false);
  };

  const handleYearConfirm = () => {
    const newDate = new Date(tempYear, currentMonth.getMonth(), 1);
    setCurrentMonth(newDate);
    setShowYearPicker(false);
  };

  const MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - 50 + i);

  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>
          {label} {required && <Text style={styles.required}>*</Text>}
        </Text>
      )}

      <TouchableOpacity
        style={styles.dateButton}
        onPress={() => {
          setSelectedDate(value || null);
          setCurrentMonth(value || new Date());
          setShowPicker(true);
        }}
      >
        <Ionicons name="calendar-outline" size={20} color="#007AFF" />
        <Text style={[styles.dateButtonText, !value && styles.placeholder]}>
          {formatDate(value)}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#999" />
      </TouchableOpacity>

      <Modal
        visible={showPicker}
        transparent
        animationType="fade"
        onRequestClose={handleCancel}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleCancel}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalContent}>
              <Calendar
                key={formatDateForCalendar(currentMonth)}
                current={formatDateForCalendar(currentMonth)}
                onDayPress={handleDateSelect}
                markedDates={markedDates}
                minDate={minimumDate ? formatDateForCalendar(minimumDate) : undefined}
                maxDate={maximumDate ? formatDateForCalendar(maximumDate) : undefined}
                onMonthChange={(month) => {
                  setCurrentMonth(new Date(month.year, month.month - 1, 1));
                }}
                renderHeader={(date) => {
                  const monthYear = new Date(date);
                  return (
                    <View style={styles.calendarHeader}>
                      <TouchableOpacity
                        style={styles.monthButton}
                        onPress={handleOpenMonthPicker}
                      >
                        <Text style={styles.calendarHeaderText}>
                          {MONTHS[monthYear.getMonth()]}
                        </Text>
                        <Ionicons name="chevron-down" size={18} color="#007AFF" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.yearButton}
                        onPress={handleOpenYearPicker}
                      >
                        <Text style={styles.calendarHeaderText}>
                          {monthYear.getFullYear()}
                        </Text>
                        <Ionicons name="chevron-down" size={18} color="#007AFF" />
                      </TouchableOpacity>
                    </View>
                  );
                }}
                theme={{
                  backgroundColor: '#ffffff',
                  calendarBackground: '#ffffff',
                  textSectionTitleColor: '#8E8E93',
                  selectedDayBackgroundColor: '#007AFF',
                  selectedDayTextColor: '#ffffff',
                  todayTextColor: '#007AFF',
                  dayTextColor: '#000000',
                  textDisabledColor: '#d9d9d9',
                  dotColor: '#007AFF',
                  selectedDotColor: '#ffffff',
                  arrowColor: '#007AFF',
                  monthTextColor: '#000000',
                  indicatorColor: '#007AFF',
                  textDayFontFamily: 'System',
                  textMonthFontFamily: 'System',
                  textDayHeaderFontFamily: 'System',
                  textDayFontWeight: '400',
                  textMonthFontWeight: '600',
                  textDayHeaderFontWeight: '500',
                  textDayFontSize: 16,
                  textMonthFontSize: 17,
                  textDayHeaderFontSize: 13,
                }}
                style={styles.calendar}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
                  <Text style={styles.clearButtonText}>Limpiar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleConfirm} style={styles.confirmButton}>
                  <Text style={styles.confirmButtonText}>Confirmar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Modal para seleccionar mes */}
      <Modal
        visible={showMonthPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMonthPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMonthPicker(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.singlePickerContent}>
              <Text style={styles.singlePickerTitle}>Seleccionar Mes</Text>

              <ScrollView style={styles.singlePickerScroll} showsVerticalScrollIndicator={false}>
                {MONTHS.map((month, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.singlePickerItem,
                      tempMonth === index && styles.singlePickerItemSelected
                    ]}
                    onPress={() => setTempMonth(index)}
                  >
                    <Text style={[
                      styles.singlePickerItemText,
                      tempMonth === index && styles.singlePickerItemTextSelected
                    ]}>
                      {month}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.singlePickerButtons}>
                <TouchableOpacity
                  onPress={() => setShowMonthPicker(false)}
                  style={styles.singlePickerCancelButton}
                >
                  <Text style={styles.singlePickerCancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleMonthConfirm}
                  style={styles.singlePickerConfirmButton}
                >
                  <Text style={styles.singlePickerConfirmButtonText}>Confirmar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Modal para seleccionar año */}
      <Modal
        visible={showYearPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowYearPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowYearPicker(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.singlePickerContent}>
              <Text style={styles.singlePickerTitle}>Seleccionar Año</Text>

              <ScrollView style={styles.singlePickerScroll} showsVerticalScrollIndicator={false}>
                {years.map((year) => (
                  <TouchableOpacity
                    key={year}
                    style={[
                      styles.singlePickerItem,
                      tempYear === year && styles.singlePickerItemSelected
                    ]}
                    onPress={() => setTempYear(year)}
                  >
                    <Text style={[
                      styles.singlePickerItemText,
                      tempYear === year && styles.singlePickerItemTextSelected
                    ]}>
                      {year}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.singlePickerButtons}>
                <TouchableOpacity
                  onPress={() => setShowYearPicker(false)}
                  style={styles.singlePickerCancelButton}
                >
                  <Text style={styles.singlePickerCancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleYearConfirm}
                  style={styles.singlePickerConfirmButton}
                >
                  <Text style={styles.singlePickerConfirmButtonText}>Confirmar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  required: {
    color: '#007AFF',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 0,
    gap: 12,
  },
  dateButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  placeholder: {
    color: '#8E8E93',
  },
  // Estilos del modal para iOS
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  calendar: {
    borderRadius: 12,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 16,
  },
  monthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  yearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  calendarHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  singlePickerContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginHorizontal: 20,
    maxHeight: '70%',
    overflow: 'hidden',
  },
  singlePickerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  singlePickerScroll: {
    maxHeight: 300,
  },
  singlePickerItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  singlePickerItemSelected: {
    backgroundColor: '#E8F4FD',
  },
  singlePickerItemText: {
    fontSize: 17,
    color: '#000',
  },
  singlePickerItemTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  singlePickerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  singlePickerCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
  },
  singlePickerCancelButtonText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '600',
  },
  singlePickerConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  singlePickerConfirmButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
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
    color: '#000',
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});

export default DatePickerInput;
