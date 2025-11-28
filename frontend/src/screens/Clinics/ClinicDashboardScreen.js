import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { appointmentAPI, clinicAPI } from '../../services/api';
import { Loading, Input, Button } from '../../components';
import { format, parseISO } from 'date-fns';

const ClinicDashboardScreen = () => {
  const [activeTab, setActiveTab] = useState(0); // 0: Solicitudes, 1: Equipo, 2: Config
  const [requests, setRequests] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [clinicData, setClinicData] = useState(null);

  // Fetch Data
  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 0) {
        const res = await appointmentAPI.getPendingRequests();
        setRequests(res.data.requests);
      } else if (activeTab === 1) {
        // Fetch clinic ID first (assuming user has one clinic for MVP)
        const clinicsRes = await clinicAPI.getMyClinics();
        if(clinicsRes.data.clinics.length > 0) {
            const clinicId = clinicsRes.data.clinics[0].id;
            setClinicData(clinicsRes.data.clinics[0]);
            const staffRes = await clinicAPI.getStaff(clinicId);
            setStaff(staffRes.data.staff);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  // Handlers for Requests
  const handleRequestAction = async (id, action) => {
      try {
          await appointmentAPI.manageRequest(id, action);
          Alert.alert('Éxito', `Solicitud ${action === 'APPROVE' ? 'aprobada' : 'rechazada'}`);
          loadData();
      } catch (error) {
          Alert.alert('Error', 'No se pudo procesar la acción');
      }
  };

  // Handlers for Staff
  const handleAddStaff = () => {
      Alert.prompt('Invitar Veterinario', 'Ingresa el email del veterinario:', [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Invitar', onPress: async (email) => {
              if(!clinicData) return;
              try {
                  await clinicAPI.addStaffMember(clinicData.id, { vetEmail: email });
                  Alert.alert('Éxito', 'Invitación enviada (miembro agregado)');
                  loadData();
              } catch(err) {
                  Alert.alert('Error', 'No se pudo agregar al miembro. Verifica el email.');
              }
          }}
      ], 'plain-text');
  };

  // Render Methods
  const renderRequestItem = ({ item }) => (
    <View style={styles.card}>
        <View style={styles.cardHeader}>
            <View>
                <Text style={styles.petName}>{item.pet.nombre}</Text>
                <Text style={styles.ownerName}>{item.pet.user?.nombre}</Text>
            </View>
            <Text style={styles.date}>{format(parseISO(item.startDateTime), 'dd/MM HH:mm')}</Text>
        </View>
        <Text style={styles.reason}>{item.reason}</Text>
        <View style={styles.actions}>
            <TouchableOpacity style={[styles.btn, styles.btnReject]} onPress={() => handleRequestAction(item.id, 'REJECT')}>
                <Text style={styles.btnTextReject}>Rechazar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnApprove]} onPress={() => handleRequestAction(item.id, 'APPROVE')}>
                <Text style={styles.btnTextApprove}>Aceptar</Text>
            </TouchableOpacity>
        </View>
    </View>
  );

  const renderStaffItem = ({ item }) => (
      <View style={styles.staffRow}>
          <View style={styles.staffAvatar}>
              <Text style={styles.staffInitials}>{item.vet.nombre.charAt(0)}</Text>
          </View>
          <View style={styles.staffInfo}>
              <Text style={styles.staffName}>{item.vet.nombre}</Text>
              <Text style={styles.staffRole}>{item.role}</Text>
          </View>
          <View style={[styles.statusDot, { backgroundColor: item.isActive ? '#4CAF50' : '#CCC' }]} />
      </View>
  );

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabs}>
          {['Solicitudes', 'Equipo', 'Config'].map((tab, index) => (
              <TouchableOpacity 
                key={index} 
                style={[styles.tab, activeTab === index && styles.tabActive]}
                onPress={() => setActiveTab(index)}
              >
                  <Text style={[styles.tabText, activeTab === index && styles.tabTextActive]}>{tab}</Text>
              </TouchableOpacity>
          ))}
      </View>

      {/* Content */}
      <View style={styles.content}>
          {loading ? (
              <Loading />
          ) : activeTab === 0 ? (
              <FlatList 
                data={requests}
                renderItem={renderRequestItem}
                keyExtractor={item => item.id}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
                ListEmptyComponent={<Text style={styles.empty}>No hay solicitudes pendientes</Text>}
              />
          ) : activeTab === 1 ? (
              <View style={{flex: 1}}>
                  <FlatList
                    data={staff}
                    renderItem={renderStaffItem}
                    keyExtractor={item => item.id}
                  />
                  <Button title="Invitar Veterinario" onPress={handleAddStaff} style={{marginTop: 20}} />
              </View>
          ) : (
              <ScrollView>
                  <Text style={styles.sectionTitle}>Información de la Clínica</Text>
                  {clinicData ? (
                      <>
                        <Input label="Nombre" value={clinicData.name} editable={false} />
                        <Input label="Dirección" value={clinicData.address} editable={false} />
                        <Text style={{color: '#999', fontStyle: 'italic', marginTop: 10}}>La edición de perfil estará disponible pronto.</Text>
                      </>
                  ) : (
                      <Text>No se encontró información de la clínica.</Text>
                  )}
              </ScrollView>
          )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  tabs: { flexDirection: 'row', backgroundColor: '#FFF', padding: 10, gap: 10 },
  tab: { flex: 1, padding: 10, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#E8F4FD' },
  tabText: { color: '#666', fontWeight: '600' },
  tabTextActive: { color: '#007AFF' },
  content: { flex: 1, padding: 20 },
  // Request Card
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  petName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  ownerName: { fontSize: 14, color: '#666' },
  date: { fontSize: 16, fontWeight: '600', color: '#007AFF' },
  reason: { fontSize: 15, color: '#444', marginBottom: 15, fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  btnReject: { backgroundColor: '#FFF0F0', borderWidth: 1, borderColor: '#FFCDD2' },
  btnApprove: { backgroundColor: '#007AFF' },
  btnTextReject: { color: '#D32F2F', fontWeight: '600' },
  btnTextApprove: { color: '#fff', fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: 50, color: '#999', fontSize: 16 },
  // Staff Row
  staffRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginBottom: 10 },
  staffAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  staffInitials: { fontWeight: 'bold', color: '#555' },
  staffInfo: { flex: 1 },
  staffName: { fontSize: 16, fontWeight: '600' },
  staffRole: { fontSize: 12, color: '#888' },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 }
});

export default ClinicDashboardScreen;