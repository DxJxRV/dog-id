import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ImageBackground,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { petsAPI } from '../../services/api';
import { Loading, ErrorNetwork } from '../../components';
import { getImageUrl } from '../../utils/imageHelper';
import { isNetworkError } from '../../utils/networkUtils';
import { showToast } from '../../utils/toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const { width } = Dimensions.get('window');
const COVER_HEIGHT = 280;

const PetProfileScreen = ({ route, navigation }) => {
  const { petId } = route.params;
  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPetData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await petsAPI.getById(petId);
      setPet(response.data.pet);
    } catch (err) {
      if (isNetworkError(err)) {
        setError(err);
      } else {
        showToast.error('No se pudieron cargar los datos de la mascota');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPetData();
  }, [petId]);

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return <ErrorNetwork onRetry={fetchPetData} />;
  }

  if (!pet) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Mascota no encontrada</Text>
      </View>
    );
  }

  const getAge = () => {
    if (!pet.fechaNacimiento) return 'Edad desconocida';
    const birth = new Date(pet.fechaNacimiento);
    const today = new Date();
    const years = today.getFullYear() - birth.getFullYear();
    const months = today.getMonth() - birth.getMonth();

    if (years === 0) {
      return `${months} ${months === 1 ? 'mes' : 'meses'}`;
    }
    return `${years} ${years === 1 ? 'año' : 'años'}`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Cover Photo with Profile Info */}
        <View style={styles.coverPhotoContainer}>
          {pet.coverPhotoUrl ? (
            <ImageBackground
              source={{ uri: getImageUrl(pet.coverPhotoUrl) }}
              style={styles.coverPhoto}
              imageStyle={styles.coverPhotoImage}
            >
              <LinearGradient
                colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
                style={styles.coverGradient}
              >
                {/* Profile Photo & Basic Info inside cover */}
                <View style={styles.profileSection}>
                  <View style={styles.profilePhotoContainer}>
                    {pet.fotoUrl ? (
                      <Image
                        source={{ uri: getImageUrl(pet.fotoUrl) }}
                        style={styles.profilePhoto}
                      />
                    ) : (
                      <View style={styles.profilePhotoPlaceholder}>
                        <Ionicons name="paw" size={40} color="#fff" />
                      </View>
                    )}
                  </View>

                  <View style={styles.basicInfo}>
                    <Text style={styles.petName}>{pet.nombre}</Text>
                    {pet.raza && (
                      <Text style={styles.petBreed}>{pet.raza}</Text>
                    )}
                    <Text style={styles.petSpecies}>{pet.especie}</Text>
                  </View>
                </View>
              </LinearGradient>
            </ImageBackground>
          ) : (
            <View style={styles.coverPhotoPlaceholder}>
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.coverGradient}
              >
                {/* Profile Photo & Basic Info inside cover */}
                <View style={styles.profileSection}>
                  <View style={styles.profilePhotoContainer}>
                    {pet.fotoUrl ? (
                      <Image
                        source={{ uri: getImageUrl(pet.fotoUrl) }}
                        style={styles.profilePhoto}
                      />
                    ) : (
                      <View style={styles.profilePhotoPlaceholder}>
                        <Ionicons name="paw" size={40} color="#fff" />
                      </View>
                    )}
                  </View>

                  <View style={styles.basicInfo}>
                    <Text style={styles.petName}>{pet.nombre}</Text>
                    {pet.raza && (
                      <Text style={styles.petBreed}>{pet.raza}</Text>
                    )}
                    <Text style={styles.petSpecies}>{pet.especie}</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>
          )}
        </View>

        {/* Stats Card */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Ionicons name="calendar-outline" size={24} color="#007AFF" />
            <Text style={styles.statLabel}>Edad</Text>
            <Text style={styles.statValue}>{getAge()}</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Ionicons name="heart-outline" size={24} color="#007AFF" />
            <Text style={styles.statLabel}>Vacunas</Text>
            <Text style={styles.statValue}>{pet.vaccines?.length || 0}</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Ionicons name="document-text-outline" size={24} color="#007AFF" />
            <Text style={styles.statLabel}>Procedimientos</Text>
            <Text style={styles.statValue}>{pet.procedures?.length || 0}</Text>
          </View>
        </View>

        {/* Owner Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dueño</Text>
          <View style={styles.ownerCard}>
            {pet.user?.fotoUrl ? (
              <Image
                source={{ uri: getImageUrl(pet.user.fotoUrl) }}
                style={styles.ownerPhoto}
              />
            ) : (
              <View style={styles.ownerPhotoPlaceholder}>
                <Ionicons name="person" size={24} color="#fff" />
              </View>
            )}
            <View style={styles.ownerInfo}>
              <Text style={styles.ownerName}>{pet.user?.nombre || 'Desconocido'}</Text>
              <Text style={styles.ownerEmail}>{pet.user?.email || ''}</Text>
            </View>
          </View>
        </View>

        {/* Additional Info */}
        {pet.fechaNacimiento && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Información adicional</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="calendar" size={20} color="#8E8E93" />
                <Text style={styles.infoLabel}>Fecha de nacimiento</Text>
              </View>
              <Text style={styles.infoValue}>
                {format(new Date(pet.fechaNacimiento), 'd \'de\' MMMM \'de\' yyyy', { locale: es })}
              </Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('PetDetail', { petId: pet.id })}
          >
            <Ionicons name="medical-outline" size={20} color="#007AFF" />
            <Text style={styles.actionButtonText}>Ver historial médico</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  coverPhotoContainer: {
    width: width,
    height: COVER_HEIGHT,
  },
  coverPhoto: {
    width: '100%',
    height: '100%',
  },
  coverPhotoImage: {
    width: '100%',
    height: '100%',
  },
  coverPhotoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#667eea',
  },
  coverGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 24,
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  profilePhotoContainer: {
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#fff',
  },
  profilePhotoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  basicInfo: {
    alignItems: 'center',
  },
  petName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  petBreed: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  petSpecies: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 24,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 8,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E5EA',
    marginHorizontal: 8,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  ownerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  ownerPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  ownerPhotoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  ownerInfo: {
    flex: 1,
  },
  ownerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  ownerEmail: {
    fontSize: 14,
    color: '#8E8E93',
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 8,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginLeft: 28,
  },
  actionsSection: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#007AFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  bottomSpacer: {
    height: 40,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  errorText: {
    fontSize: 18,
    color: '#8E8E93',
  },
});

export default PetProfileScreen;
