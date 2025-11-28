import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Input, Button, Loading } from '../../components';
import { clinicAPI } from '../../services/api';

const ClinicSetupScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    acceptsEmergencies: false
  });

  const handleCreate = async () => {
    if (!formData.name) {
      Alert.alert('Error', 'El nombre de la clínica es obligatorio');
      return;
    }

    setLoading(true);
    try {
      await clinicAPI.create({
        name: formData.name,
        address: formData.address,
        phone: formData.phone,
        settings: {
          acceptsEmergencies: formData.acceptsEmergencies
        }
      });
      Alert.alert('Éxito', 'Clínica creada correctamente');
      navigation.goBack();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo crear la clínica');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.headerTitle}>Configurar mi Clínica</Text>
      <Text style={styles.subtitle}>
        Crea el perfil de tu veterinaria para gestionar citas y pacientes.
      </Text>

      <View style={styles.form}>
        <Input
          label="Nombre de la Clínica"
          placeholder="Ej. Veterinaria San Francisco"
          value={formData.name}
          onChangeText={(text) => setFormData({ ...formData, name: text })}
        />

        <Input
          label="Dirección"
          placeholder="Calle Principal 123"
          value={formData.address}
          onChangeText={(text) => setFormData({ ...formData, address: text })}
        />

        <Input
          label="Teléfono"
          placeholder="55 1234 5678"
          keyboardType="phone-pad"
          value={formData.phone}
          onChangeText={(text) => setFormData({ ...formData, phone: text })}
        />

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>¿Acepta Urgencias 24/7?</Text>
          <Switch
            value={formData.acceptsEmergencies}
            onValueChange={(val) => setFormData({ ...formData, acceptsEmergencies: val })}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={formData.acceptsEmergencies ? '#007AFF' : '#f4f3f4'}
          />
        </View>

        <Button
          title="Crear Clínica"
          onPress={handleCreate}
          loading={loading}
          style={styles.submitButton}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  content: {
    padding: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    lineHeight: 22,
  },
  form: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  submitButton: {
    marginTop: 10,
  }
});

export default ClinicSetupScreen;
