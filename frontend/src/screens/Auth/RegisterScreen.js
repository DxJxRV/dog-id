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
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (userType === 'vet' && !cedulaProfesional) {
      Alert.alert('Error', 'Professional license number is required for veterinarians');
      return;
    }

    setLoading(true);
    try {
      const result =
        userType === 'user'
          ? await registerUser(nombre, email, password)
          : await registerVet(nombre, email, password, cedulaProfesional, telefono);

      if (!result.success) {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
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
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join Veterinary Control</Text>
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
            label="Full Name"
            value={nombre}
            onChangeText={setNombre}
            placeholder="Enter your full name"
          />

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

          <Input
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm your password"
            secureTextEntry
            autoCapitalize="none"
          />

          {userType === 'vet' && (
            <>
              <Input
                label="Professional License Number"
                value={cedulaProfesional}
                onChangeText={setCedulaProfesional}
                placeholder="Enter your license number"
              />

              <Input
                label="Phone (Optional)"
                value={telefono}
                onChangeText={setTelefono}
                placeholder="Enter your phone number"
                keyboardType="phone-pad"
              />
            </>
          )}

          <Button
            title="Register"
            onPress={handleRegister}
            loading={loading}
            style={styles.registerButton}
          />

          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.loginLink}
          >
            <Text style={styles.loginLinkText}>
              Already have an account? Login
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
