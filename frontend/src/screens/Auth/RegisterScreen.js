import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuth } from '../../contexts/AuthContext';
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
  const GooglePackage = require('@react-native-google-signin/google-signin');
  GoogleSignin = GooglePackage.GoogleSignin;
  statusCodes = GooglePackage.statusCodes;
} catch (err) {
  console.log('Google Signin nativo no encontrado');
}

const RegisterScreen = ({ navigation }) => {
  const { loginWithGoogle, loginWithApple } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);

  useEffect(() => {
    console.log('🔧 [RegisterScreen] Configurando Google Sign In...');
    console.log('🔧 [RegisterScreen] appOwnership:', Constants.appOwnership);
    console.log('🔧 [RegisterScreen] GOOGLE_CLIENT_ID:', GOOGLE_CLIENT_ID);

    if (Constants.appOwnership !== 'expo') {
      GoogleSignin.configure({
        webClientId: GOOGLE_CLIENT_ID,
        offlineAccess: false,
      });
      console.log('✅ [RegisterScreen] Google Sign In configurado');
    } else {
      console.log('⚠️ [RegisterScreen] Ejecutando en Expo Go, Google Sign In no disponible');
    }
    checkAppleAuthAvailable();
  }, []);

  const checkAppleAuthAvailable = async () => {
    try {
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      setAppleAuthAvailable(isAvailable);
    } catch (error) {
      setAppleAuthAvailable(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (Constants.appOwnership === 'expo') {
      alert('Google Login solo disponible en la versión compilada (Build).');
      return;
    }

    setGoogleLoading(true);
    try {
      console.log('🔵 [RegisterScreen] Iniciando Google Sign In...');
      await GoogleSignin.hasPlayServices();
      console.log('🔵 [RegisterScreen] Play Services disponibles');

      // Forzar selector de cuentas
      try {
        await GoogleSignin.signOut();
        console.log('🔵 [RegisterScreen] Sign out previo completado (para forzar selector)');
      } catch (signOutError) {
        console.log('🔵 [RegisterScreen] No había sesión previa para cerrar');
      }

      const userInfo = await GoogleSignin.signIn();
      console.log('🔵 [RegisterScreen] userInfo completo:', JSON.stringify(userInfo, null, 2));
      console.log('🔵 [RegisterScreen] userInfo.idToken:', userInfo?.idToken);
      console.log('🔵 [RegisterScreen] userInfo.user:', userInfo?.user);

      // Try different possible locations for idToken
      const idToken = userInfo?.idToken || userInfo?.user?.idToken || userInfo?.data?.idToken;
      console.log('🔵 [RegisterScreen] idToken extraído:', idToken);

      if (idToken) {
        console.log('🔵 [RegisterScreen] Token encontrado, llamando loginWithGoogle...');
        const result = await loginWithGoogle(idToken);
        console.log('🔵 [RegisterScreen] Resultado loginWithGoogle:', result);

        if (result.success && result.isNewUser) {
          // New user, navigate to role selection screen
          console.log('🔵 [RegisterScreen] Nuevo usuario, navegando a CompleteSocialRegistration');
          navigation.navigate('CompleteSocialRegistration', {
            socialData: result.socialData,
          });
        } else if (!result.success) {
          console.log('🔴 [RegisterScreen] Error en loginWithGoogle:', result.error);
          showToast.error(result.error || 'Error al registrarse con Google');
        }
      } else {
        console.log('🔴 [RegisterScreen] No se encontró idToken en ninguna ubicación');
        console.log('🔴 [RegisterScreen] Estructura completa de userInfo:', Object.keys(userInfo || {}));
        showToast.error('No se recibió el token de Google');
      }
    } catch (error) {
      console.log('🔴 [RegisterScreen] Error capturado:', error);
      console.log('🔴 [RegisterScreen] Error code:', error.code);
      console.log('🔴 [RegisterScreen] Error message:', error.message);

      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('Sign in cancelled');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        showToast.error('Registro en progreso');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        showToast.error('Google Play Services no disponible');
      } else {
        console.error('Google Sign-In error:', error);
        showToast.error('Error al registrarse con Google');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setAppleLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const { identityToken, fullName } = credential;

      if (identityToken) {
        const result = await loginWithApple(identityToken, fullName);
        if (result.success && result.isNewUser) {
          // New user, navigate to role selection screen
          navigation.navigate('CompleteSocialRegistration', {
            socialData: result.socialData,
          });
        } else if (!result.success) {
          showToast.error(result.error || 'Error al registrarse con Apple');
        }
      } else {
        showToast.error('No se recibió el token de Apple');
      }
    } catch (error) {
      if (error.code === 'ERR_CANCELED') {
        console.log('Apple Sign in cancelled');
      } else {
        console.error('Apple Sign-In error:', error);
        showToast.error('Error al registrarse con Apple');
      }
    } finally {
      setAppleLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Logo / Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="paw" size={64} color="#007AFF" />
          </View>
          <Text style={styles.title}>Crear cuenta</Text>
          <Text style={styles.subtitle}>Elige cómo deseas registrarte</Text>
        </View>

        {/* Register Options Cards */}
        <View style={styles.optionsContainer}>
          {/* Apple Sign In */}
          {appleAuthAvailable && (
            <TouchableOpacity
              style={styles.appleCard}
              onPress={handleAppleSignIn}
              disabled={appleLoading}
              activeOpacity={0.8}
            >
              <View style={styles.cardContent}>
                <View style={styles.appleIconCircle}>
                  <Ionicons name="logo-apple" size={28} color="#FFF" />
                </View>
                <View style={styles.cardTextContainer}>
                  <Text style={styles.appleCardTitle}>Registrarse con Apple</Text>
                  <Text style={styles.appleCardSubtitle}>
                    {appleLoading ? 'Registrando...' : 'Rápido y seguro'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#FFF" />
              </View>
            </TouchableOpacity>
          )}

          {/* Google Sign In */}
          <TouchableOpacity
            style={styles.googleCard}
            onPress={handleGoogleSignIn}
            disabled={googleLoading}
            activeOpacity={0.8}
          >
            <View style={styles.cardContent}>
              <View style={styles.googleIconCircle}>
                <Ionicons name="logo-google" size={28} color="#EA4335" />
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>Registrarse con Google</Text>
                <Text style={styles.cardSubtitle}>
                  {googleLoading ? 'Registrando...' : 'Usa tu cuenta de Google'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#000" />
            </View>
          </TouchableOpacity>

          {/* Email/Password Register */}
          <TouchableOpacity
            style={styles.emailCard}
            onPress={() => navigation.navigate('RegisterEmail')}
            activeOpacity={0.8}
          >
            <View style={styles.cardContent}>
              <View style={styles.emailIconCircle}>
                <Ionicons name="mail" size={28} color="#007AFF" />
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>Registrarse con correo</Text>
                <Text style={styles.cardSubtitle}>Crea una cuenta con correo</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#000" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Login Link */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Login')}
          style={styles.loginLink}
        >
          <Text style={styles.loginLinkText}>
            ¿Ya tienes cuenta? <Text style={styles.loginLinkBold}>Inicia sesión</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
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
    marginBottom: 48,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E8F4FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  optionsContainer: {
    width: '100%',
    gap: 16,
  },
  appleCard: {
    backgroundColor: '#000',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  googleCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  emailCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  appleIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF7F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emailIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F4FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
  },
  appleCardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 4,
  },
  appleCardSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  loginLink: {
    marginTop: 32,
    alignItems: 'center',
  },
  loginLinkText: {
    color: '#666',
    fontSize: 15,
  },
  loginLinkBold: {
    color: '#007AFF',
    fontWeight: '600',
  },
});

export default RegisterScreen;
