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

const LoginScreen = ({ navigation }) => {
  const { loginUser, loginVet } = useAuth();
  const [userType, setUserType] = useState('user'); // 'user' or 'vet'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
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
          Alert.alert(
            'Error de Conexión',
            'No se pudo conectar al servidor. Verifica tu conexión a internet e intenta de nuevo.'
          );
        } else {
          Alert.alert('Error', result.error);
        }
      }
    } catch (err) {
      if (isNetworkError(err)) {
        Alert.alert(
          'Error de Conexión',
          'No se pudo conectar al servidor. Verifica tu conexión a internet e intenta de nuevo.'
        );
      } else {
        Alert.alert('Error', 'An unexpected error occurred');
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
          <Text style={styles.title}>Veterinary Control</Text>
          <Text style={styles.subtitle}>Manage your pet's health records</Text>
        </View>

        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, userType === 'user' && styles.toggleButtonActive]}
            onPress={() => setUserType('user')}
          >
            <Text
              style={[styles.toggleText, userType === 'user' && styles.toggleTextActive]}
            >
              Pet Owner
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, userType === 'vet' && styles.toggleButtonActive]}
            onPress={() => setUserType('vet')}
          >
            <Text
              style={[styles.toggleText, userType === 'vet' && styles.toggleTextActive]}
            >
              Veterinarian
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry
            autoCapitalize="none"
          />

          <Button
            title="Login"
            onPress={handleLogin}
            loading={loading}
            style={styles.loginButton}
          />

          <TouchableOpacity
            onPress={() => navigation.navigate('Register')}
            style={styles.registerLink}
          >
            <Text style={styles.registerLinkText}>
              Don't have an account? Register
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
    color: '#000',
    marginBottom: 8,
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
