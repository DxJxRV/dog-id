import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import Toast from 'react-native-toast-message';
import { AuthProvider } from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { toastConfig } from './src/utils/toast';

// Prevenir que el splash screen se oculte automáticamente
SplashScreen.preventAutoHideAsync();

export default function App() {
  useEffect(() => {
    const hideSplash = async () => {
      try {
        // Esperar 3 segundos antes de ocultar el splash screen
        await new Promise(resolve => setTimeout(resolve, 3000));
        await SplashScreen.hideAsync();
      } catch (error) {
        console.warn('Error hiding splash screen:', error);
      }
    };

    hideSplash();
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppNavigator />
        <StatusBar style="auto" />
        <Toast config={toastConfig} />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
