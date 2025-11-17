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

const LoginScreen = ({ navigation }) => {
  const { loginUser, loginVet } = useAuth();
  const [userType, setUserType] = useState('user'); // 'user' or 'vet'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      showToast.error('Por favor completa todos los campos', 'Campos requeridos');
      return;
    }

    setLoading(true);
    try {
      const result =
        userType === 'user'
          ? await loginUser(email, password)
          : await loginVet(email, password);

      if (!result.success) {
        if (result.error && isNetworkError({ response: null, message: result.error })) {
          showToast.networkError();
        } else {
          showToast.error(result.error || 'Error al iniciar sesión');
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
          <Text style={styles.subtitle}>Gestiona el historial de salud de tus mascotas</Text>
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

          <Button
            title="Iniciar sesión"
            onPress={handleLogin}
            loading={loading}
            style={styles.loginButton}
          />

          <TouchableOpacity
            onPress={() => navigation.navigate('Register')}
            style={styles.registerLink}
          >
            <Text style={styles.registerLinkText}>
              ¿No tienes cuenta? Regístrate
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
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
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
  loginButton: {
    marginTop: 8,
  },
  registerLink: {
    marginTop: 16,
    alignItems: 'center',
  },
  registerLinkText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default LoginScreen;
