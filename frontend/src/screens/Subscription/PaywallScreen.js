import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { showToast } from '../../utils/toast';

const PaywallScreen = ({ navigation, route }) => {
  const {
    currentOffering,
    purchasePackage,
    restorePurchases,
    loading: subscriptionLoading,
  } = useSubscription();

  const [selectedPackage, setSelectedPackage] = useState(null);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Parámetros opcionales de la navegación
  const { feature, onSuccess } = route.params || {};

  const planComparison = [
    {
      title: 'Plan Gratuito',
      tier: 'FREE',
      features: [
        { text: 'Historial digital básico', included: true },
        { text: 'Control de vacunas', included: true },
        { text: '1 audio de prueba (30 seg)', included: true },
        { text: '1 miembro de equipo', included: true },
        { text: 'IA ilimitada', included: false },
        { text: 'Equipo extendido', included: false },
      ],
    },
    {
      title: 'Vet Plus',
      tier: 'PLUS',
      popular: true,
      features: [
        { text: 'Todo lo de Gratuito', included: true },
        { text: 'IA con límites razonables', included: true },
        { text: 'Recetas PDF personalizadas', included: true },
        { text: 'Hasta 3 miembros de equipo', included: true },
        { text: 'Agenda con WhatsApp', included: true },
        { text: 'Multi-usuario ilimitado', included: false },
      ],
    },
    {
      title: 'Plan Hospital',
      tier: 'HOSPITAL',
      features: [
        { text: 'Todo lo de Vet Plus', included: true },
        { text: 'IA Ilimitada', included: true },
        { text: 'Miembros de equipo ilimitados', included: true },
        { text: 'Soporte prioritario 24h', included: true },
        { text: 'Reportes y estadísticas', included: true },
        { text: 'API personalizada', included: true },
      ],
    },
  ];

  const handlePurchase = async () => {
    if (!selectedPackage) {
      showToast.error('Selecciona un plan para continuar');
      return;
    }

    setPurchasing(true);
    try {
      const result = await purchasePackage(selectedPackage);

      if (result.success) {
        showToast.success('¡Suscripción activada exitosamente!');

        // Si hay un callback de éxito, ejecutarlo
        if (onSuccess) {
          onSuccess();
        }

        // Regresar a la pantalla anterior
        navigation.goBack();
      } else if (result.cancelled) {
        // Usuario canceló, no hacer nada
      }
    } catch (error) {
      console.error('Error en compra:', error);
      showToast.error('Error al procesar la compra. Intenta de nuevo.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const result = await restorePurchases();

      if (result.success) {
        showToast.success('Compras restauradas exitosamente');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error al restaurar:', error);
      showToast.error('No se encontraron compras anteriores');
    } finally {
      setRestoring(false);
    }
  };

  const handleTerms = () => {
    Alert.alert(
      'Términos y Condiciones',
      'Visita nuestra página web para ver los términos completos.',
      [{ text: 'OK' }]
    );
  };

  if (subscriptionLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando planes...</Text>
      </View>
    );
  }

  if (!currentOffering || currentOffering.availablePackages.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#FF3B30" />
        <Text style={styles.errorTitle}>No hay planes disponibles</Text>
        <Text style={styles.errorText}>
          Por favor, intenta de nuevo más tarde
        </Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header con gradiente */}
        <LinearGradient
          colors={['#007AFF', '#0051D5']}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>

          <Ionicons name="rocket" size={64} color="#FFF" />
          <Text style={styles.headerTitle}>Desbloquea el Potencial</Text>
          <Text style={styles.headerSubtitle}>de tu Práctica Veterinaria</Text>
        </LinearGradient>

        {/* Mensaje específico si viene de una feature bloqueada */}
        {feature && (
          <View style={styles.featureMessageContainer}>
            <Ionicons name="lock-closed" size={24} color="#FF9500" />
            <Text style={styles.featureMessage}>
              Para usar <Text style={styles.featureBold}>{feature}</Text>,
              necesitas una suscripción PRO
            </Text>
          </View>
        )}

        {/* Plan Comparison Table */}
        <View style={styles.comparisonContainer}>
          <Text style={styles.comparisonTitle}>Compara Planes:</Text>

          {planComparison.map((plan, planIndex) => (
            <View
              key={planIndex}
              style={[
                styles.planComparisonCard,
                plan.popular && styles.planComparisonCardPopular,
              ]}
            >
              {plan.popular && (
                <View style={styles.popularPlanBadge}>
                  <Text style={styles.popularPlanBadgeText}>MÁS POPULAR</Text>
                </View>
              )}

              <Text style={styles.planComparisonTitle}>{plan.title}</Text>

              <View style={styles.planFeaturesList}>
                {plan.features.map((feat, featIndex) => (
                  <View key={featIndex} style={styles.planFeatureItem}>
                    <Ionicons
                      name={feat.included ? 'checkmark-circle' : 'close-circle'}
                      size={18}
                      color={feat.included ? '#34C759' : '#8E8E93'}
                    />
                    <Text
                      style={[
                        styles.planFeatureText,
                        !feat.included && styles.planFeatureTextDisabled,
                      ]}
                    >
                      {feat.text}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* Packages Selection */}
        <View style={styles.packagesContainer}>
          <Text style={styles.packagesTitle}>Elige tu plan:</Text>

          {currentOffering.availablePackages.map((pkg, index) => {
            const isAnnual = pkg.packageType === 'ANNUAL';
            const isSelected = selectedPackage?.identifier === pkg.identifier;

            return (
              <TouchableOpacity
                key={pkg.identifier}
                style={[
                  styles.packageCard,
                  isSelected && styles.packageCardSelected,
                  isAnnual && styles.packageCardAnnual,
                ]}
                onPress={() => setSelectedPackage(pkg)}
                activeOpacity={0.7}
              >
                {isAnnual && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularBadgeText}>MÁS POPULAR</Text>
                  </View>
                )}

                <View style={styles.packageHeader}>
                  <View>
                    <Text style={styles.packageTitle}>
                      {pkg.product.title}
                    </Text>
                    <Text style={styles.packageDescription}>
                      {pkg.product.description}
                    </Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={28} color="#007AFF" />
                  )}
                </View>

                <View style={styles.packagePricing}>
                  <Text style={styles.packagePrice}>
                    {pkg.product.priceString}
                  </Text>
                  <Text style={styles.packagePeriod}>
                    {isAnnual ? '/ año' : '/ mes'}
                  </Text>
                </View>

                {isAnnual && (
                  <View style={styles.savingsBadge}>
                    <Text style={styles.savingsText}>Ahorra 30%</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Purchase Button */}
        <TouchableOpacity
          style={[
            styles.purchaseButton,
            (!selectedPackage || purchasing) && styles.purchaseButtonDisabled,
          ]}
          onPress={handlePurchase}
          disabled={!selectedPackage || purchasing}
        >
          {purchasing ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.purchaseButtonText}>
              {selectedPackage
                ? `Suscribirse por ${selectedPackage.product.priceString}`
                : 'Selecciona un plan'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Footer Links */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.footerButton}
            onPress={handleRestore}
            disabled={restoring}
          >
            {restoring ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Text style={styles.footerButtonText}>Restaurar Compras</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.footerButton}
            onPress={handleTerms}
          >
            <Text style={styles.footerButtonText}>Términos y Privacidad</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.disclaimer}>
          Las suscripciones se renuevan automáticamente. Puedes cancelar en
          cualquier momento desde tu cuenta de App Store o Google Play.
        </Text>
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
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F2F2F7',
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: '#007AFF',
    borderRadius: 12,
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 16,
  },
  headerSubtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  featureMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    margin: 20,
    padding: 16,
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE4A3',
  },
  featureMessage: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  featureBold: {
    fontWeight: 'bold',
    color: '#FF9500',
  },
  comparisonContainer: {
    padding: 20,
  },
  comparisonTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  planComparisonCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  planComparisonCardPopular: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  popularPlanBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularPlanBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFF',
  },
  planComparisonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
  },
  planFeaturesList: {
    gap: 8,
  },
  planFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planFeatureText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  planFeatureTextDisabled: {
    color: '#8E8E93',
    textDecorationLine: 'line-through',
  },
  packagesContainer: {
    padding: 20,
  },
  packagesTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  packageCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  packageCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  packageCardAnnual: {
    borderColor: '#FFB800',
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    right: 20,
    backgroundColor: '#FFB800',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFF',
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  packageTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  packageDescription: {
    fontSize: 14,
    color: '#666',
  },
  packagePricing: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  packagePrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  packagePeriod: {
    fontSize: 16,
    color: '#666',
    marginLeft: 4,
  },
  savingsBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  savingsText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2E7D32',
  },
  purchaseButton: {
    marginHorizontal: 20,
    marginTop: 8,
    paddingVertical: 18,
    backgroundColor: '#007AFF',
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  purchaseButtonDisabled: {
    backgroundColor: '#B3D9FF',
    opacity: 0.6,
  },
  purchaseButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 24,
    marginHorizontal: 20,
  },
  footerButton: {
    paddingVertical: 8,
  },
  footerButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  disclaimer: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
    marginHorizontal: 40,
    lineHeight: 18,
  },
});

export default PaywallScreen;
