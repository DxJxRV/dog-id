import Purchases from 'react-native-purchases';

/**
 * Verifica si RevenueCat está configurado
 */
const isRevenueCatConfigured = async () => {
  try {
    // Intentar obtener customerInfo para verificar que está configurado
    await Purchases.getCustomerInfo();
    return true;
  } catch (error) {
    console.warn('⚠️ [RevenueCat Helper] SDK no configurado:', error.message);
    return false;
  }
};

/**
 * Helper para identificar usuario en RevenueCat
 * Debe llamarse después del login exitoso
 */
export const identifyRevenueCatUser = async (userId) => {
  try {
    console.log('👤 [RevenueCat Helper] Identificando usuario:', userId);

    // Verificar que RevenueCat esté configurado
    const isConfigured = await isRevenueCatConfigured();
    if (!isConfigured) {
      console.warn('⚠️ [RevenueCat Helper] SDK no está configurado, omitiendo identificación');
      return;
    }

    await Purchases.logIn(userId);
    console.log('✅ [RevenueCat Helper] Usuario identificado');
  } catch (error) {
    console.error('🔴 [RevenueCat Helper] Error al identificar usuario:', error.message);
    // No lanzar error para no bloquear el login
  }
};

/**
 * Helper para cerrar sesión en RevenueCat
 * Debe llamarse durante el logout
 */
export const logoutRevenueCatUser = async () => {
  try {
    console.log('👋 [RevenueCat Helper] Cerrando sesión');

    // Verificar que RevenueCat esté configurado
    const isConfigured = await isRevenueCatConfigured();
    if (!isConfigured) {
      console.warn('⚠️ [RevenueCat Helper] SDK no está configurado, omitiendo logout');
      return;
    }

    await Purchases.logOut();
    console.log('✅ [RevenueCat Helper] Sesión cerrada');
  } catch (error) {
    console.error('🔴 [RevenueCat Helper] Error al cerrar sesión:', error.message);
    // No lanzar error para no bloquear el logout
  }
};
