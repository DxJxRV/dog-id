import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { clinicAPI } from '../../services/api';
import { Loading } from '../../components';
import { getImageUrl } from '../../utils/imageHelper';

const ClinicSelectorScreen = ({ navigation }) => {
  const { user, selectClinic } = useAuth();
  const [clinics, setClinics] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [clinicsRes, invitationsRes] = await Promise.all([
        clinicAPI.getMyClinics(),
        clinicAPI.getMyInvitations()
      ]);
      
      const fetchedClinics = clinicsRes.data.clinics;
      const fetchedInvitations = invitationsRes.data.invitations;

      setClinics(fetchedClinics);
      setInvitations(fetchedInvitations);

      // Auto-redirect logic: If 1 clinic and 0 invites, go direct
      if (fetchedClinics.length === 1 && fetchedInvitations.length === 0) {
          // Prevent loop if coming back from profile change, maybe? 
          // But for initial login flow, this is desired.
          // If user explicitly navigated here to change clinic, we might want to avoid auto-select?
          // But since AuthContext persists currentClinic, if they are here, it means either:
          // 1. Login (no currentClinic) -> Auto select is good.
          // 2. Explicit change (navigation.navigate) -> They might be redirected back immediately?
          // No, `AppNavigator` only forces this screen if `!currentClinic`.
          // If they navigate here manually, `currentClinic` might still be set?
          // If Profile clears `currentClinic` before navigating here, then this logic will trigger and send them back.
          // That's a UX loop issue for single-clinic users trying to "change" (to nothing?).
          // But single-clinic users don't need to change.
          // If they have invites, they stay here.
          
          selectClinic(fetchedClinics[0]);
          navigation.replace('Main');
      }
    } catch (error) {
      console.error('Error fetching clinics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSelectClinic = (clinic) => {
    selectClinic(clinic); // Set global context
    // Navigation is handled by AppNavigator observing context or manual navigation
    // Assuming manual for now as the stack might be reset
    // In a real app, the main navigator might react to 'currentClinic' being set
    // For now, navigate to Main
    navigation.replace('Main'); 
  };

  const handleInvitation = async (clinicId, action) => {
      try {
          await clinicAPI.manageInvitation(clinicId, action);
          Alert.alert('Éxito', action === 'ACCEPT' ? 'Invitación aceptada' : 'Invitación rechazada');
          fetchData();
      } catch (error) {
          Alert.alert('Error', 'No se pudo procesar la invitación');
      }
  };

  const renderClinicItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => handleSelectClinic(item)}>
      <View style={styles.cardContent}>
        {item.logoUrl ? (
            <Image source={{ uri: getImageUrl(item.logoUrl) }} style={styles.logo} />
        ) : (
            <View style={styles.logoPlaceholder}>
                <Ionicons name="medkit" size={32} color="#FFF" />
            </View>
        )}
        <View style={styles.info}>
            <Text style={styles.clinicName}>{item.name}</Text>
            <Text style={styles.roleText}>{item.myRole === 'OWNER' ? 'Director' : item.myRole}</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#CCC" />
      </View>
    </TouchableOpacity>
  );

  const renderInvitationItem = ({ item }) => (
      <View style={styles.inviteCard}>
          <Text style={styles.inviteText}>
              Te han invitado a unirte a <Text style={{fontWeight: 'bold'}}>{item.clinic.name}</Text>
          </Text>
          <View style={styles.inviteActions}>
              <TouchableOpacity 
                style={[styles.inviteBtn, styles.rejectBtn]} 
                onPress={() => handleInvitation(item.clinic.id, 'REJECT')}
              >
                  <Text style={styles.rejectText}>Rechazar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.inviteBtn, styles.acceptBtn]} 
                onPress={() => handleInvitation(item.clinic.id, 'ACCEPT')}
              >
                  <Text style={styles.acceptText}>Aceptar</Text>
              </TouchableOpacity>
          </View>
      </View>
  );

  if (loading) return <Loading />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hola, Dr. {user?.nombre}</Text>
        <Text style={styles.subtitle}>¿Dónde trabajarás hoy?</Text>
      </View>

      {invitations.length > 0 && (
          <View style={styles.section}>
              <Text style={styles.sectionTitle}>Invitaciones Pendientes</Text>
              <FlatList 
                  data={invitations}
                  renderItem={renderInvitationItem}
                  keyExtractor={item => item.id}
              />
          </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mis Clínicas</Text>
        <FlatList
          data={clinics}
          renderItem={renderClinicItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
              <Text style={styles.empty}>No tienes clínicas asociadas. Crea una o espera una invitación.</Text>
          }
        />
      </View>
      
      {/* Create Clinic Button (Optional if we want to allow creation from here) */}
      {/* <Button title="Crear Nueva Clínica" onPress={() => navigation.navigate('CreateClinic')} /> */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', padding: 20 },
  header: { marginTop: 40, marginBottom: 30 },
  greeting: { fontSize: 28, fontWeight: 'bold', color: '#333' },
  subtitle: { fontSize: 18, color: '#666', marginTop: 5 },
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#888', marginBottom: 10, textTransform: 'uppercase' },
  list: { paddingBottom: 20 },
  
  // Clinic Card
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardContent: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: 60, height: 60, borderRadius: 12, marginRight: 15 },
  logoPlaceholder: { width: 60, height: 60, borderRadius: 12, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  info: { flex: 1 },
  clinicName: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  roleText: { fontSize: 14, color: '#007AFF', fontWeight: '600' },

  // Invite Card
  inviteCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 15, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#FF9500' },
  inviteText: { fontSize: 15, color: '#333', marginBottom: 15 },
  inviteActions: { flexDirection: 'row', gap: 10 },
  inviteBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  rejectBtn: { backgroundColor: '#F5F5F5' },
  acceptBtn: { backgroundColor: '#E8F5E9' },
  rejectText: { color: '#666', fontWeight: '600' },
  acceptText: { color: '#2E7D32', fontWeight: '600' },

  empty: { textAlign: 'center', color: '#999', marginTop: 20 }
});

export default ClinicSelectorScreen;
