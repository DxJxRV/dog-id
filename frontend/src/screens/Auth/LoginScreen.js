import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Input } from '../../components';
import { isNetworkError } from '../../utils/networkUtils';
import { showToast } from '../../utils/toast';
import { GOOGLE_CLIENT_ID } from '../../utils/config';

// Mock inicial seguro para Expo Go
let GoogleSignin = {
  configure: () => {},
  hasPlayServices: async () => {},
  signIn: async () => {},
};
let statusCodes = {};

try {
  // Intentamos cargar la librería nativa solo si está disponible
  const GooglePackage = require('@react-native-google-signin/google-signin');
  GoogleSignin = GooglePackage.GoogleSignin;
  statusCodes = GooglePackage.statusCodes;
} catch (err) {
  console.log('Google Signin nativo no encontrado (¿Estás en Expo Go?). Se usará mock.');
}

const LoginScreen = ({ navigation }) => {
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Solo configurar GoogleSignin en builds nativos, no en Expo Go
    if (Constants.appOwnership !== 'expo') {
      GoogleSignin.configure({
        webClientId: GOOGLE_CLIENT_ID,
        offlineAccess: false,
      });
    }
  }, []);

  const fetchUserInfoAndLogin = async (accessToken) => {
    setGoogleLoading(true);
    try {
      const result = await loginWithGoogle(accessToken);
      if (!result.success) {
        showToast.error(result.error || 'Error al iniciar sesión con Google');
      }
    } catch (err) {
      if (isNetworkError(err)) {
        showToast.networkError();
      } else {
        showToast.error('Error al iniciar sesión con Google');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      showToast.error('Por favor completa todos los campos', 'Campos requeridos');
      return;
    }

    setLoading(true);
    try {
      const result = await login(email, password);

      if (!result.success) {
        // Mostrar el error específico del backend
        const errorMessage = result.error === 'Invalid credentials'
          ? 'Correo o contraseña incorrectos'
          : result.error || 'Error al iniciar sesión';
        showToast.error(errorMessage);
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

  const handleGoogleSignIn = async () => {
    // Verificar si estamos en Expo Go
    if (Constants.appOwnership === 'expo') {
      alert('Google Login solo disponible en la versión compilada (Build).');
      return;
    }

    setGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.idToken;

      if (idToken) {
        await fetchUserInfoAndLogin(idToken);
      } else {
        showToast.error('No se recibió el token de Google');
        setGoogleLoading(false);
      }
    } catch (error) {
      setGoogleLoading(false);
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // Usuario canceló el inicio de sesión
        console.log('Sign in cancelled');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        showToast.error('Inicio de sesión en progreso');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        showToast.error('Google Play Services no disponible');
      } else {
        console.error('Google Sign-In error:', error);
        showToast.error('Error al iniciar sesión con Google');
      }
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
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            rightIcon={
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={24}
                color="#8E8E93"
              />
            }
            onRightIconPress={() => setShowPassword(!showPassword)}
          />

          <Button
            title="Iniciar sesión"
            onPress={handleLogin}
            loading={loading}
            style={styles.loginButton}
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleSignIn}
            disabled={googleLoading}
          >
            <Ionicons name="logo-google" size={20} color="#EA4335" />
            <Text style={styles.googleButtonText}>
              {googleLoading ? 'Iniciando sesión...' : 'Continuar con Google'}
            </Text>
          </TouchableOpacity>

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
  form: {
    width: '100%',
  },
  loginButton: {
    marginTop: 8,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E5EA',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 10,
    paddingVertical: 14,
    gap: 12,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
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
