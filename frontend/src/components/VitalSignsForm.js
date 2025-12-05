import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Switch,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Formulario completo para ingresar datos médicos / signos vitales
 * @param {object} value - Objeto con todos los valores actuales
 * @param {function} onChange - Función que actualiza el estado (recibe campo y valor)
 * @param {boolean} isVeterinarian - Si es veterinario (puede editar), si no es solo lectura
 * @param {boolean} readOnly - Forzar modo solo lectura
 */
const VitalSignsForm = ({
  value = {},
  onChange,
  isVeterinarian = true,
  readOnly = false
}) => {
  const isEditable = isVeterinarian && !readOnly;

  const handleChange = (field, val) => {
    if (!isEditable || !onChange) return;
    onChange(field, val);
  };

  const renderInput = (config) => {
    const {
      field,
      label,
      icon,
      unit,
      keyboardType = 'numeric',
      placeholder,
    } = config;

    return (
      <View style={styles.inputGroup} key={field}>
        <View style={styles.labelContainer}>
          <Ionicons name={icon} size={18} color="#007AFF" />
          <Text style={styles.label}>{label}</Text>
          {unit && <Text style={styles.unit}>({unit})</Text>}
        </View>
        <TextInput
          style={[
            styles.input,
            !isEditable && styles.inputDisabled,
          ]}
          value={value[field]?.toString() || ''}
          onChangeText={(text) => handleChange(field, text)}
          placeholder={placeholder || `Ingrese ${label.toLowerCase()}`}
          placeholderTextColor="#999"
          keyboardType={keyboardType}
          editable={isEditable}
        />
      </View>
    );
  };

  const renderSwitch = (field, label, icon) => {
    return (
      <View style={styles.switchGroup} key={field}>
        <View style={styles.labelContainer}>
          <Ionicons name={icon} size={18} color="#007AFF" />
          <Text style={styles.label}>{label}</Text>
        </View>
        <Switch
          value={value[field] === true || value[field] === 'true'}
          onValueChange={(val) => handleChange(field, val)}
          disabled={!isEditable}
          trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
          thumbColor="#FFFFFF"
          ios_backgroundColor="#E5E5EA"
        />
      </View>
    );
  };

  const inputConfigs = [
    {
      field: 'peso',
      label: 'Peso',
      icon: 'scale-outline',
      unit: 'kg',
      placeholder: 'Ej: 15.5',
    },
    {
      field: 'temperatura',
      label: 'Temperatura',
      icon: 'thermometer-outline',
      unit: '°C',
      placeholder: 'Ej: 38.5',
    },
    {
      field: 'frecuenciaCardiaca',
      label: 'Frecuencia Cardíaca',
      icon: 'heart-outline',
      unit: 'lpm',
      placeholder: 'Ej: 90',
    },
    {
      field: 'frecuenciaRespiratoria',
      label: 'Frecuencia Respiratoria',
      icon: 'pulse-outline',
      unit: 'rpm',
      placeholder: 'Ej: 25',
    },
    {
      field: 'condicionCorporal',
      label: 'Condición Corporal',
      icon: 'body-outline',
      unit: '1-5',
      placeholder: 'Ej: 3',
    },
  ];

  const textInputConfigs = [
    {
      field: 'pulso',
      label: 'Pulso',
      icon: 'fitness-outline',
      keyboardType: 'default',
      placeholder: 'Ej: Normal, Fuerte, Débil',
    },
    {
      field: 'mucosas',
      label: 'Mucosas',
      icon: 'eye-outline',
      keyboardType: 'default',
      placeholder: 'Ej: Rosadas, Pálidas',
    },
    {
      field: 'tllc',
      label: 'TLLC',
      icon: 'time-outline',
      keyboardType: 'default',
      placeholder: 'Tiempo de llenado capilar',
    },
    {
      field: 'hidratacion',
      label: 'Hidratación',
      icon: 'water-outline',
      keyboardType: 'default',
      placeholder: 'Ej: Normal, Deshidratado',
    },
  ];

  return (
    <View style={styles.container}>
      {!isEditable && (
        <View style={styles.readOnlyBanner}>
          <Ionicons name="lock-closed" size={16} color="#FF9500" />
          <Text style={styles.readOnlyText}>
            {isVeterinarian ? 'Modo solo lectura' : 'Solo veterinarios pueden editar'}
          </Text>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Sección: Signos Vitales Numéricos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Signos Vitales</Text>
          <View style={styles.grid}>
            {inputConfigs.map(renderInput)}
          </View>
        </View>

        {/* Sección: Evaluación Física */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Evaluación Física</Text>
          <View style={styles.grid}>
            {textInputConfigs.map(renderInput)}
          </View>
        </View>

        {/* Sección: Estado General */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Estado General</Text>
          {renderSwitch('ayuno', 'En Ayuno', 'restaurant-outline')}
        </View>

        {/* Notas Adicionales */}
        <View style={styles.section}>
          <View style={styles.labelContainer}>
            <Ionicons name="document-text-outline" size={18} color="#007AFF" />
            <Text style={styles.label}>Notas Adicionales</Text>
          </View>
          <TextInput
            style={[
              styles.textArea,
              !isEditable && styles.inputDisabled,
            ]}
            value={value.notas || ''}
            onChangeText={(text) => handleChange('notas', text)}
            placeholder="Observaciones médicas adicionales..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
            editable={isEditable}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  readOnlyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  readOnlyText: {
    fontSize: 14,
    color: '#856404',
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  grid: {
    gap: 12,
  },
  inputGroup: {
    marginBottom: 12,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  unit: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  inputDisabled: {
    backgroundColor: '#F2F2F7',
    color: '#8E8E93',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    minHeight: 100,
  },
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
});

export default VitalSignsForm;
