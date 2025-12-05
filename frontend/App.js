import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { setAudioModeAsync } from 'expo-audio';
import Toast from 'react-native-toast-message';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { AuthProvider } from './src/contexts/AuthContext';
import { SubscriptionProvider } from './src/contexts/SubscriptionContext';
import AppNavigator from './src/navigation/AppNavigator';
import { toastConfig } from './src/utils/toast';
import CustomSplashScreen from './src/components/CustomSplashScreen';
import { REVENUECAT_API_KEY } from './src/utils/config';

// Prevenir que el splash screen nativo se oculte automáticamente
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [showCustomSplash, setShowCustomSplash] = useState(true);
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    const prepare = async () => {
      try {
        // 1. Configurar RevenueCat ANTES de cualquier provider
        console.log('🔐 [App] Inicializando RevenueCat SDK...');
        if (REVENUECAT_API_KEY) {
          Purchases.setLogLevel(LOG_LEVEL.DEBUG);
          await Purchases.configure({ apiKey: REVENUECAT_API_KEY });
          console.log('✅ [App] RevenueCat SDK configurado correctamente');
        } else {
          console.warn('⚠️ [App] No RevenueCat API Key encontrada');
        }

        // 2. Configurar modo de audio para grabación en iOS con expo-audio
        console.log('🎙️ [App] Configuring audio mode globally with expo-audio...');
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });
        console.log('✅ [App] Audio mode configured for recording');

        // 3. Ocultar el splash screen nativo de Expo inmediatamente
        await SplashScreen.hideAsync();
        setAppReady(true);
      } catch (error) {
        console.warn('❌ [App] Error preparing app:', error);
        // Aún así permitir que la app continúe
        setAppReady(true);
      }
    };

    prepare();
  }, []);

  const handleSplashFinish = () => {
    setShowCustomSplash(false);
  };

  if (!appReady || showCustomSplash) {
    return <CustomSplashScreen onFinish={handleSplashFinish} />;
  }

  return (
    <SafeAreaProvider>
      <SubscriptionProvider>
        <AuthProvider>
          <AppNavigator />
          <StatusBar style="auto" />
          <Toast config={toastConfig} />
        </AuthProvider>
      </SubscriptionProvider>
    </SafeAreaProvider>
  );
}
