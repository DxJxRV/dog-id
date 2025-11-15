import Toast from 'react-native-toast-message';
import { Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Configuración de toasts personalizados con colores sólidos
export const toastConfig = {
  success: ({ text1, text2 }) => (
    <View style={[styles.toastContainer, styles.successToast]}>
      <Ionicons name="checkmark-circle" size={24} color="#fff" style={styles.icon} />
      <View style={styles.textContainer}>
        <Text style={styles.titleText}>{text1}</Text>
        {text2 ? <Text style={styles.messageText}>{text2}</Text> : null}
      </View>
    </View>
  ),
  error: ({ text1, text2 }) => (
    <View style={[styles.toastContainer, styles.errorToast]}>
      <Ionicons name="close-circle" size={24} color="#fff" style={styles.icon} />
      <View style={styles.textContainer}>
        <Text style={styles.titleText}>{text1}</Text>
        {text2 ? <Text style={styles.messageText}>{text2}</Text> : null}
      </View>
    </View>
  ),
  info: ({ text1, text2 }) => (
    <View style={[styles.toastContainer, styles.infoToast]}>
      <Ionicons name="information-circle" size={24} color="#fff" style={styles.icon} />
      <View style={styles.textContainer}>
        <Text style={styles.titleText}>{text1}</Text>
        {text2 ? <Text style={styles.messageText}>{text2}</Text> : null}
      </View>
    </View>
  ),
  warning: ({ text1, text2 }) => (
    <View style={[styles.toastContainer, styles.warningToast]}>
      <Ionicons name="alert-circle" size={24} color="#fff" style={styles.icon} />
      <View style={styles.textContainer}>
        <Text style={styles.titleText}>{text1}</Text>
        {text2 ? <Text style={styles.messageText}>{text2}</Text> : null}
      </View>
    </View>
  ),
};

const styles = StyleSheet.create({
  toastContainer: {
    width: '90%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  successToast: {
    backgroundColor: '#34C759',
  },
  errorToast: {
    backgroundColor: '#FF3B30',
  },
  infoToast: {
    backgroundColor: '#007AFF',
  },
  warningToast: {
    backgroundColor: '#FF9500',
  },
  icon: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  titleText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  messageText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '400',
    opacity: 0.95,
  },
});

export const showToast = {
  success: (message, title = 'Éxito') => {
    Toast.show({
      type: 'success',
      text1: title,
      text2: message,
      position: 'top',
      visibilityTime: 3000,
      topOffset: 60,
    });
  },

  error: (message, title = 'Error') => {
    Toast.show({
      type: 'error',
      text1: title,
      text2: message,
      position: 'top',
      visibilityTime: 4000,
      topOffset: 60,
    });
  },

  info: (message, title = 'Información') => {
    Toast.show({
      type: 'info',
      text1: title,
      text2: message,
      position: 'top',
      visibilityTime: 3000,
      topOffset: 60,
    });
  },

  warning: (message, title = 'Atención') => {
    Toast.show({
      type: 'warning',
      text1: title,
      text2: message,
      position: 'top',
      visibilityTime: 3500,
      topOffset: 60,
    });
  },

  networkError: () => {
    Toast.show({
      type: 'error',
      text1: 'Error de Conexión',
      text2: 'No se pudo conectar al servidor. Verifica tu conexión a internet.',
      position: 'top',
      visibilityTime: 4000,
      topOffset: 60,
    });
  },
};
