import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

const CustomSplashScreen = ({ onFinish }) => {
  useEffect(() => {
    // Ocultar el splash screen después de 3 segundos
    const timer = setTimeout(() => {
      if (onFinish) {
        onFinish();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <Text style={styles.text}>
          <Text style={styles.textBlack}>Mi Mascota </Text>
          <Text style={styles.textBlue}>+</Text>
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    alignItems: 'center',
  },
  text: {
    fontSize: 48,
    fontWeight: '700',
  },
  textBlack: {
    color: '#000000',
  },
  textBlue: {
    color: '#007AFF',
  },
});

export default CustomSplashScreen;
