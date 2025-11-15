import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { petsAPI } from '../../services/api';
import { Loading, Card, Button, PetLinkCodeModal } from '../../components';
import { API_URL } from '../../utils/config';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';

const PetDetailScreen = ({ route, navigation }) => {
  const { petId } = route.params;
  const { user, userType } = useAuth();
  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkCode, setLinkCode] = useState(null);
  const [isLinked, setIsLinked] = useState(false);

  const isVet = userType === 'vet';

  const fetchPetDetail = async () => {
    try {
      const response = await petsAPI.getById(petId);
      setPet(response.data.pet);
    } catch (error) {
      Alert.alert('Error', 'Failed to load pet details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPetDetail();
  }, [petId]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchPetDetail();
    });
    return unsubscribe;
  }, [navigation]);

  const handleShowLinkCode = async () => {
    try {
      const response = await petsAPI.getLinkCode(petId);
      setLinkCode(response.data.linkCode);
      setShowLinkModal(true);
    } catch (error) {
      Alert.alert('Error', 'No se pudo obtener el código de vinculación');
    }
  };

  const handleUnlinkPet = () => {
    Alert.alert(
      'Desvincular mascota',
      '¿Estás seguro de que deseas desvincular esta mascota?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desvincular',
          style: 'destructive',
          onPress: async () => {
            try {
              await petsAPI.unlinkPet(petId);
              Alert.alert('Éxito', 'Mascota desvinculada correctamente');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'No se pudo desvincular la mascota');
            }
          },
        },
      ]
    );
  };

  const handleArchivePet = () => {
    Alert.alert(
      'Archivar mascota',
      '¿Deseas archivar esta mascota? Podrás verla en la sección de archivados.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Archivar',
          onPress: async () => {
            try {
              await petsAPI.archive(petId, true);
              Alert.alert('Éxito', 'Mascota archivada correctamente');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'No se pudo archivar la mascota');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return <Loading />;
  }

  const isOwner = pet.user && user && pet.user.id === user.id;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        {pet.fotoUrl ? (
          <Image
            source={{ uri: `${API_URL}${pet.fotoUrl}` }}
            style={styles.petImage}
          />
        ) : (
          <View style={styles.petImagePlaceholder}>
            <Text style={styles.petImagePlaceholderText}>
              {pet.nombre.charAt(0)}
            </Text>
          </View>
        )}
        <Text style={styles.petName}>{pet.nombre}</Text>
        <Text style={styles.petDetails}>
          {pet.especie} • {pet.raza || 'Mixed'}
        </Text>
        {pet.fechaNacimiento && (
          <Text style={styles.petBirthdate}>
            Born: {format(new Date(pet.fechaNacimiento), 'MMM dd, yyyy')}
          </Text>
        )}

        {isOwner && (
          <TouchableOpacity
            style={styles.linkCodeButton}
            onPress={handleShowLinkCode}
          >
            <Ionicons name="qr-code-outline" size={20} color="#007AFF" />
            <Text style={styles.linkCodeButtonText}>Código de vinculación</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Botones de acción */}
      <View style={styles.actionsContainer}>
        {isVet && !isOwner && (
          <TouchableOpacity
            style={styles.unlinkButton}
            onPress={handleUnlinkPet}
          >
            <Ionicons name="link-outline" size={20} color="#FF3B30" />
            <Text style={styles.unlinkButtonText}>Desvincular</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.archiveButton}
          onPress={handleArchivePet}
        >
          <Ionicons name="archive-outline" size={20} color="#666" />
          <Text style={styles.archiveButtonText}>Archivar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Vacunas ({pet.vaccines?.length || 0})</Text>
        {pet.vaccines && pet.vaccines.length > 0 ? (
          pet.vaccines.slice(0, 3).map((vaccine) => (
            <Card key={vaccine.id}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemTitle}>{vaccine.nombreVacuna}</Text>
                {vaccine.vet && (
                  <View style={styles.vetBadge}>
                    <Ionicons name="medkit" size={12} color="#007AFF" />
                    <Text style={styles.vetBadgeText}>Vet</Text>
                  </View>
                )}
                {!vaccine.vet && (
                  <View style={styles.ownerBadge}>
                    <Ionicons name="person" size={12} color="#34C759" />
                    <Text style={styles.ownerBadgeText}>Dueño</Text>
                  </View>
                )}
              </View>
              {vaccine.lote && <Text style={styles.itemDetail}>Lote: {vaccine.lote}</Text>}
              {vaccine.caducidad && (
                <Text style={styles.itemDetail}>
                  Caducidad: {format(new Date(vaccine.caducidad), 'MMM dd, yyyy')}
                </Text>
              )}
              {vaccine.vet && (
                <Text style={styles.itemVet}>
                  Aplicada por: Dr. {vaccine.vet.nombre}
                </Text>
              )}
              <Text style={styles.itemDate}>
                {format(new Date(vaccine.createdAt), 'MMM dd, yyyy')}
              </Text>
            </Card>
          ))
        ) : (
          <Text style={styles.emptyText}>No hay vacunas registradas</Text>
        )}
        <Button
          title="Agregar Vacuna"
          onPress={() => navigation.navigate('AddVaccine', { petId })}
          variant="outline"
          style={styles.sectionButton}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Procedimientos ({pet.procedures?.length || 0})
        </Text>
        {pet.procedures && pet.procedures.length > 0 ? (
          pet.procedures.slice(0, 3).map((procedure) => (
            <Card key={procedure.id}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemTitle}>
                  {procedure.tipo.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Text>
                {procedure.vet && (
                  <View style={styles.vetBadge}>
                    <Ionicons name="medkit" size={12} color="#007AFF" />
                    <Text style={styles.vetBadgeText}>Vet</Text>
                  </View>
                )}
                {!procedure.vet && (
                  <View style={styles.ownerBadge}>
                    <Ionicons name="person" size={12} color="#34C759" />
                    <Text style={styles.ownerBadgeText}>Dueño</Text>
                  </View>
                )}
              </View>
              <Text style={styles.itemDescription}>{procedure.descripcion}</Text>
              {procedure.vet && (
                <Text style={styles.itemVet}>
                  Realizado por: Dr. {procedure.vet.nombre}
                </Text>
              )}
              <Text style={styles.itemDate}>
                {format(new Date(procedure.fecha), 'MMM dd, yyyy')}
              </Text>
            </Card>
          ))
        ) : (
          <Text style={styles.emptyText}>No hay procedimientos registrados</Text>
        )}
        <Button
          title="Agregar Procedimiento"
          onPress={() => navigation.navigate('AddProcedure', { petId })}
          variant="outline"
          style={styles.sectionButton}
        />
      </View>

      {/* Modal de código de vinculación */}
      <PetLinkCodeModal
        visible={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        linkCode={linkCode}
        petName={pet.nombre}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  petImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  petImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  petImagePlaceholderText: {
    color: '#fff',
    fontSize: 48,
    fontWeight: 'bold',
  },
  petName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  petDetails: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  petBirthdate: {
    fontSize: 14,
    color: '#999',
  },
  linkCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F8FF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 16,
    gap: 8,
  },
  linkCodeButtonText: {
    color: '#007AFF',
    fontSize: 15,
    fontWeight: '600',
  },
  actionsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  unlinkButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5F5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FF3B30',
    gap: 6,
  },
  unlinkButtonText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
  },
  archiveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CCC',
    gap: 6,
  },
  archiveButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  sectionButton: {
    marginTop: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  vetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  vetBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#007AFF',
  },
  ownerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  ownerBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#34C759',
  },
  itemDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  itemDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  itemVet: {
    fontSize: 13,
    color: '#007AFF',
    marginBottom: 4,
  },
  itemDate: {
    fontSize: 12,
    color: '#999',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 12,
  },
});

export default PetDetailScreen;
