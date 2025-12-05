import React, { createContext, useContext, useState, useEffect } from 'react';
import Purchases from 'react-native-purchases';

const SubscriptionContext = createContext();

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

export const SubscriptionProvider = ({ children }) => {
  const [isPro, setIsPro] = useState(false); // vet_plus entitlement
  const [isClinic, setIsClinic] = useState(false); // clinic_pro entitlement
  const [activeEntitlements, setActiveEntitlements] = useState([]);
  const [currentOffering, setCurrentOffering] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);

  // Configurar RevenueCat al montar el componente
  useEffect(() => {
    initializeRevenueCat();
  }, []);

  const initializeRevenueCat = async () => {
    try {
      console.log('🔐 [SubscriptionContext] Verificando configuración de RevenueCat...');

      // Ya no configuramos aquí, se hace en App.js
      // Solo verificamos que esté configurado y cargamos datos

      try {
        // Intentar obtener customerInfo para verificar que está configurado
        await Purchases.getCustomerInfo();
        setIsConfigured(true);
        console.log('✅ [SubscriptionContext] RevenueCat ya está configurado');
      } catch (error) {
        console.warn('⚠️ [SubscriptionContext] RevenueCat no está configurado o no disponible');
        setLoading(false);
        return;
      }

      // Cargar estado inicial de suscripciones
      await checkSubscriptionStatus();

      // Cargar offerings disponibles
      await loadOfferings();

      setLoading(false);
    } catch (error) {
      console.error('🔴 [SubscriptionContext] Error al inicializar:', error);
      setLoading(false);
    }
  };

  // Verificar estado de suscripción
  const checkSubscriptionStatus = async () => {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      updateSubscriptionState(customerInfo);
    } catch (error) {
      console.error('🔴 [RevenueCat] Error al verificar suscripción:', error);
    }
  };

  // Actualizar estado de suscripción basado en customerInfo
  const updateSubscriptionState = (customerInfo) => {
    console.log('📊 [RevenueCat] Actualizando estado de suscripción...');

    const entitlements = customerInfo.entitlements.active;
    const entitlementKeys = Object.keys(entitlements);

    setActiveEntitlements(entitlementKeys);
    setIsPro(entitlementKeys.includes('vet_plus'));
    setIsClinic(entitlementKeys.includes('clinic_pro'));

    console.log('📊 [RevenueCat] Entitlements activos:', entitlementKeys);
    console.log('📊 [RevenueCat] isPro:', entitlementKeys.includes('vet_plus'));
    console.log('📊 [RevenueCat] isClinic:', entitlementKeys.includes('clinic_pro'));
  };

  // Cargar offerings disponibles
  const loadOfferings = async () => {
    try {
      const offerings = await Purchases.getOfferings();

      if (offerings.current !== null) {
        setCurrentOffering(offerings.current);
        console.log('✅ [RevenueCat] Offering actual cargado:', offerings.current.identifier);
        console.log('📦 [RevenueCat] Paquetes disponibles:', offerings.current.availablePackages.length);
      } else {
        console.warn('⚠️ [RevenueCat] No hay offerings disponibles');
      }
    } catch (error) {
      console.error('🔴 [RevenueCat] Error al cargar offerings:', error);
    }
  };

  // Identificar usuario (llamar después del login)
  const identifyUser = async (userId) => {
    if (!isConfigured) {
      console.warn('⚠️ [RevenueCat] SDK no configurado, no se puede identificar usuario');
      return;
    }

    try {
      console.log('👤 [RevenueCat] Identificando usuario:', userId);
      const { customerInfo } = await Purchases.logIn(userId);
      updateSubscriptionState(customerInfo);
      console.log('✅ [RevenueCat] Usuario identificado');
    } catch (error) {
      console.error('🔴 [RevenueCat] Error al identificar usuario:', error);
    }
  };

  // Cerrar sesión del usuario
  const logoutUser = async () => {
    if (!isConfigured) {
      return;
    }

    try {
      console.log('👋 [RevenueCat] Cerrando sesión de usuario');
      await Purchases.logOut();

      // Resetear estado local
      setIsPro(false);
      setIsClinic(false);
      setActiveEntitlements([]);

      console.log('✅ [RevenueCat] Sesión cerrada');
    } catch (error) {
      console.error('🔴 [RevenueCat] Error al cerrar sesión:', error);
    }
  };

  // Comprar un paquete
  const purchasePackage = async (packageToPurchase) => {
    if (!isConfigured) {
      throw new Error('RevenueCat no está configurado');
    }

    try {
      console.log('💳 [RevenueCat] Iniciando compra:', packageToPurchase.identifier);

      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      updateSubscriptionState(customerInfo);

      console.log('✅ [RevenueCat] Compra exitosa');
      return { success: true, customerInfo };
    } catch (error) {
      console.error('🔴 [RevenueCat] Error en compra:', error);

      // Manejar cancelación de usuario
      if (error.userCancelled) {
        console.log('⚠️ [RevenueCat] Usuario canceló la compra');
        return { success: false, cancelled: true };
      }

      throw error;
    }
  };

  // Restaurar compras
  const restorePurchases = async () => {
    if (!isConfigured) {
      throw new Error('RevenueCat no está configurado');
    }

    try {
      console.log('♻️ [RevenueCat] Restaurando compras...');

      const customerInfo = await Purchases.restorePurchases();
      updateSubscriptionState(customerInfo);

      console.log('✅ [RevenueCat] Compras restauradas');
      return { success: true, customerInfo };
    } catch (error) {
      console.error('🔴 [RevenueCat] Error al restaurar compras:', error);
      throw error;
    }
  };

  // Obtener información del plan activo
  const getActivePlanInfo = () => {
    if (isClinic) {
      return {
        name: 'Plan Hospital',
        tier: 'HOSPITAL',
        features: [
          'IA Ilimitada',
          'Recetas PDF Personalizadas',
          'Multi-usuario sin límites',
          'Agenda con WhatsApp',
          'Soporte prioritario',
        ],
        maxTeamMembers: null, // Ilimitado
      };
    } else if (isPro) {
      return {
        name: 'Vet Plus',
        tier: 'PLUS',
        features: [
          'IA con límites',
          'Recetas PDF Personalizadas',
          'Hasta 3 miembros de equipo',
          'Agenda con WhatsApp',
        ],
        maxTeamMembers: 3,
      };
    } else {
      return {
        name: 'Gratuito',
        tier: 'FREE',
        features: [
          'Historial digital básico',
          'Control de vacunas',
          '1 audio de prueba (30 seg)',
          '1 miembro de equipo',
        ],
        maxTeamMembers: 1,
      };
    }
  };

  // Verificar si puede agregar más miembros al equipo
  const canAddTeamMember = (currentMemberCount) => {
    const planInfo = getActivePlanInfo();

    if (planInfo.maxTeamMembers === null) {
      return true; // Plan Hospital - ilimitado
    }

    return currentMemberCount < planInfo.maxTeamMembers;
  };

  // Obtener el plan activo actual
  const getActivePlan = () => {
    if (isClinic) return 'HOSPITAL';
    if (isPro) return 'PLUS';
    return 'FREE';
  };

  const value = {
    // Estado
    isPro,
    isClinic,
    activePlan: getActivePlan(),
    activeEntitlements,
    currentOffering,
    loading,
    isConfigured,

    // Funciones
    identifyUser,
    logoutUser,
    purchasePackage,
    restorePurchases,
    checkSubscriptionStatus,
    getActivePlanInfo,
    canAddTeamMember,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};
