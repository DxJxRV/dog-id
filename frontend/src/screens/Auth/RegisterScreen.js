import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Input } from '../../components';
import { isNetworkError } from '../../utils/networkUtils';
import { showToast } from '../../utils/toast';

const RegisterScreen = ({ navigation }) => {
  const { registerUser, registerVet } = useAuth();
  const [userType, setUserType] = useState('user');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [cedulaProfesional, setCedulaProfesional] = useState('');
  const [telefono, setTelefono] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!nombre || !email || !password) {
      showToast.error('Por favor completa todos los campos requeridos', 'Campos requeridos');
      return;
    }

    if (password !== confirmPassword) {
      showToast.error('Las contraseñas no coinciden', 'Error de validación');
      return;
    }

    if (userType === 'vet' && !cedulaProfesional) {
      showToast.error('La cédula profesional es requerida para veterinarios', 'Campo requerido');
      return;
    }

    setLoading(true);
    try {
      const result =
        userType === 'user'
          ? await registerUser(nombre, email, password)
          : await registerVet(nombre, email, password, cedulaProfesional, telefono);

      if (!result.success) {
        if (result.error && isNetworkError({ response: null, message: result.error })) {
          showToast.networkError();
        } else {
          showToast.error(result.error || 'Error al registrar usuario');
        }
      }
    } catch (err) {
      if (isNetworkError(err)) {
        showToast.networkError();
      } else {
        showToast.error('Ocurrió un error inesperado');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>
            <Text style={styles.titleBlack}>Mi Mascota </Text>
            <Text style={styles.titleBlue}>+</Text>
          </Text>
          <Text style={styles.subtitle}>Crea tu cuenta</Text>
        </View>

        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, userType === 'user' && styles.toggleButtonActive]}
            onPress={() => setUserType('user')}
          >
            <Text
              style={[styles.toggleText, userType === 'user' && styles.toggleTextActive]}
            >
              Dueño
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, userType === 'vet' && styles.toggleButtonActive]}
            onPress={() => setUserType('vet')}
          >
            <Text
              style={[styles.toggleText, userType === 'vet' && styles.toggleTextActive]}
            >
              Veterinario
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <Input
            label="Nombre completo"
            value={nombre}
            onChangeText={setNombre}
            placeholder="Ingresa tu nombre completo"
          />

          <Input
            label="Correo electrónico"
            value={email}
            onChangeText={setEmail}
            placeholder="Ingresa tu correo"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Input
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
            placeholder="Ingresa tu contraseña"
            secureTextEntry
            autoCapitalize="none"
          />

          <Input
            label="Confirmar contraseña"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirma tu contraseña"
            secureTextEntry
            autoCapitalize="none"
          />

          {userType === 'vet' && (
            <>
              <Input
                label="Cédula profesional"
                value={cedulaProfesional}
                onChangeText={setCedulaProfesional}
                placeholder="Ingresa tu cédula profesional"
              />

              <Input
                label="Teléfono (opcional)"
                value={telefono}
                onChangeText={setTelefono}
                placeholder="Ingresa tu teléfono"
                keyboardType="phone-pad"
              />
            </>
          )}

          <Button
            title="Registrarse"
            onPress={handleRegister}
            loading={loading}
            style={styles.registerButton}
          />

          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.loginLink}
          >
            <Text style={styles.loginLinkText}>
              ¿Ya tienes cuenta? Inicia sesión
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  titleBlack: {
    color: '#000',
  },
  titleBlue: {
    color: '#007AFF',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#E5E5EA',
    borderRadius: 10,
    padding: 4,
    marginBottom: 24,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleButtonActive: {
    backgroundColor: '#fff',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  toggleTextActive: {
    color: '#007AFF',
  },
  form: {
    width: '100%',
  },
  registerButton: {
    marginTop: 8,
  },
  loginLink: {
    marginTop: 16,
    alignItems: 'center',
  },
  loginLinkText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default RegisterScreen;
