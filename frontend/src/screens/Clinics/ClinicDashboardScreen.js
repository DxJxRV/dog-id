import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Alert, 
  RefreshControl, 
  ScrollView, 
  Modal, 
  Switch, 
  TextInput,
  Image 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { appointmentAPI, clinicAPI } from '../../services/api';
import { Loading, Input, Button } from '../../components';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '../../contexts/AuthContext';
import { getImageUrl } from '../../utils/imageHelper';
// import MapView, { Marker } from 'react-native-maps'; // Removed to fix crash

const ClinicDashboardScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0); // 0: Dashboard, 1: Equipo, 2: Config
  const [requests, setRequests] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [clinicData, setClinicData] = useState(null);
  
  // Assign Modal State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedVetId, setSelectedVetId] = useState(null);
  const [selectedDuration, setSelectedDuration] = useState(30);

  // Map State
  const [mapRegion, setMapRegion] = useState(null);
  const [markerCoords, setMarkerCoords] = useState(null);

  // Constants
  const DURATION_OPTIONS = [30, 60, 90, 120];

  // Invite Modal State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('VET');

  // Fetch Data
  const loadData = async () => {
    setLoading(true);
    try {
      // Always fetch basic clinic data first if not present
      if (!clinicData) {
          const clinicsRes = await clinicAPI.getMyClinics();
          if(clinicsRes.data.clinics.length > 0) {
              const clinic = clinicsRes.data.clinics[0];
              setClinicData(clinic);
              // Initialize map placeholder logic if needed
          }
      }

      if (activeTab === 0) {
        const res = await appointmentAPI.getPendingRequests();
        setRequests(res.data.requests);
      } else if (activeTab === 1 && clinicData) {
        const staffRes = await clinicAPI.getStaff(clinicData.id);
        setStaff(staffRes.data.staff);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, clinicData?.id]);

  // --- Logic Handlers ---

  const openAssignModal = (request) => {
      setSelectedRequest(request);
      setSelectedVetId(null); 
      setShowAssignModal(true);
  };

  const handleAssignAndConfirm = async () => {
      if(!selectedVetId) {
          Alert.alert('Error', 'Selecciona un veterinario');
          return;
      }
      try {
          await appointmentAPI.assignAndConfirm(selectedRequest.id, {
              vetId: selectedVetId,
              durationMinutes: selectedDuration
          });
          setShowAssignModal(false);
          Alert.alert('Éxito', 'Cita asignada y confirmada');
          loadData();
      } catch (error) {
          Alert.alert('Error', 'No se pudo asignar la cita');
      }
  };

  const handleReject = async (id) => {
      try {
          await appointmentAPI.manageRequest(id, 'REJECT');
          loadData();
      } catch (error) { Alert.alert('Error', 'Falló al rechazar'); }
  };

  const handleToggleAvailability = async (vetId, currentStatus) => {
      try {
          await clinicAPI.toggleAvailability(clinicData.id, { vetId, isAvailable: !currentStatus });
          loadData(); 
      } catch(error) {
          Alert.alert('Error', 'No se pudo cambiar la disponibilidad');
      }
  };

  const handleSendInvitation = async () => {
      if (!inviteEmail) {
          Alert.alert('Error', 'Ingresa un correo electrónico');
          return;
      }
      try {
          await clinicAPI.inviteMember(clinicData.id, { email: inviteEmail, role: inviteRole });
          Alert.alert('Éxito', 'Invitación enviada');
          setShowInviteModal(false);
          setInviteEmail('');
          loadData();
      } catch(err) { 
          Alert.alert('Error', err.response?.data?.error || 'No se pudo invitar'); 
      }
  };

  const handleSaveConfig = async () => {
      try {
          await clinicAPI.update(clinicData.id, {
              name: clinicData.name,
              address: clinicData.address,
              // latitude: markerCoords?.latitude, // Map removed
              // longitude: markerCoords?.longitude
          });
          Alert.alert('Éxito', 'Configuración guardada');
      } catch (error) {
          Alert.alert('Error', 'No se pudo guardar');
      }
  };

  // --- Renderers ---

  const renderDashboardHeader = () => (
    <View style={styles.dashboardHeader}>
        <View style={styles.welcomeRow}>
            <View>
                <Text style={styles.welcomeText}>Hola, Dr. {user?.nombre}</Text>
                <Text style={styles.dateText}>{format(new Date(), 'EEEE, d MMMM', { locale: es })}</Text>
            </View>
            <TouchableOpacity 
                style={styles.agendaBtn}
                onPress={() => navigation.navigate('Appointments')} 
            >
                <Ionicons name="calendar" size={20} color="#FFF" />
            </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
            <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: '#FFF3E0' }]}>
                    <Ionicons name="alert-circle" size={24} color="#E65100" />
                </View>
                <Text style={styles.statNumber}>{requests.length}</Text>
                <Text style={styles.statLabel}>Pendientes</Text>
            </View>
            
            <TouchableOpacity style={styles.statCard} onPress={() => setActiveTab(1)}>
                <View style={[styles.statIcon, { backgroundColor: '#E8F5E9' }]}>
                    <Ionicons name="people" size={24} color="#2E7D32" />
                </View>
                <Text style={styles.statNumber}>{staff.length || '-'}</Text>
                <Text style={styles.statLabel}>Miembros</Text>
            </TouchableOpacity>
        </View>

        {activeTab === 0 && <Text style={styles.sectionTitle}>Bandeja de Entrada</Text>}
    </View>
  );

  const renderRequestItem = ({ item }) => (
    <View style={styles.ticketCard}>
        <View style={styles.ticketLeft}>
            <View style={styles.dateBadge}>
                <Text style={styles.dateDay}>{format(parseISO(item.startDateTime), 'dd')}</Text>
                <Text style={styles.dateMonth}>{format(parseISO(item.startDateTime), 'MMM', { locale: es })}</Text>
            </View>
            <Text style={styles.dateTimeText}>{format(parseISO(item.startDateTime), 'HH:mm')}</Text>
        </View>
        
        <View style={styles.ticketContent}>
            <Text style={styles.ticketPetName}>{item.pet.nombre}</Text>
            <Text style={styles.ticketOwner}>Dueño: {item.pet.user?.nombre}</Text>
            <Text style={styles.ticketReason} numberOfLines={2}>{item.reason}</Text>
            
            <View style={styles.ticketActions}>
                <TouchableOpacity style={styles.actionBtnReject} onPress={() => handleReject(item.id)}>
                    <Text style={styles.actionTextReject}>Rechazar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtnAccept} onPress={() => openAssignModal(item)}>
                    <Text style={styles.actionTextAccept}>Asignar</Text>
                </TouchableOpacity>
            </View>
        </View>
    </View>
  );

  const renderStaffItem = ({ item }) => (
      <View style={styles.staffCard}>
          <View style={styles.staffInfoRow}>
              {item.vet.fotoUrl ? (
                  <Image source={{ uri: getImageUrl(item.vet.fotoUrl) }} style={styles.staffAvatarImg} />
              ) : (
                  <View style={styles.staffAvatarPlaceholder}>
                      <Text style={styles.staffInitials}>{item.vet.nombre.charAt(0)}</Text>
                  </View>
              )}
              
              <View style={styles.staffDetails}>
                  <Text style={styles.staffName}>{item.vet.nombre}</Text>
                  <View style={[styles.roleBadge, item.role === 'OWNER' ? styles.roleOwner : styles.roleVet]}>
                      <Text style={styles.roleText}>{item.role === 'OWNER' ? 'Director' : 'Veterinario'}</Text>
                  </View>
                  {item.status === 'INVITED' && (
                      <View style={styles.invitedBadge}>
                          <Text style={styles.invitedText}>Invitación Pendiente</Text>
                      </View>
                  )}
              </View>
          </View>

          {item.status === 'ACTIVE' && (
              <View style={styles.availabilityRow}>
                  <Text style={[styles.availLabel, {color: item.isAvailable ? '#4CAF50' : '#999'}]}>
                      {item.isAvailable ? 'Disponible para citas' : 'No disponible'}
                  </Text>
                  <Switch 
                      value={item.isAvailable} 
                      onValueChange={() => handleToggleAvailability(item.vetId, item.isAvailable)}
                      trackColor={{ false: "#E0E0E0", true: "#A5D6A7" }}
                      thumbColor={item.isAvailable ? "#4CAF50" : "#F5F5F5"}
                  />
              </View>
          )}
      </View>
  );

  return (
    <View style={styles.container}>
      {/* Top Tabs */}
      <View style={styles.tabs}>
          {['Dashboard', 'Equipo', 'Config'].map((tab, index) => (
              <TouchableOpacity 
                key={index} 
                style={[styles.tab, activeTab === index && styles.tabActive]}
                onPress={() => setActiveTab(index)}
              >
                  <Text style={[styles.tabText, activeTab === index && styles.tabTextActive]}>{tab}</Text>
              </TouchableOpacity>
          ))}
      </View>

      {/* Content Area */}
      <View style={styles.content}>
          {activeTab === 0 ? (
              <FlatList 
                data={requests}
                renderItem={renderRequestItem}
                keyExtractor={item => item.id}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
                ListHeaderComponent={renderDashboardHeader}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="checkmark-circle-outline" size={48} color="#CCC" />
                        <Text style={styles.empty}>No hay solicitudes pendientes</Text>
                    </View>
                }
                showsVerticalScrollIndicator={false}
              />
          ) : activeTab === 1 ? (
              <ScrollView 
                refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
                contentContainerStyle={{ padding: 20 }}
              >
                  <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15}}>
                      <Text style={styles.sectionTitle}>Mi Equipo</Text>
                      <TouchableOpacity onPress={() => setShowInviteModal(true)}>
                          <Text style={{color: '#007AFF', fontWeight: '600'}}>Invitar +</Text>
                      </TouchableOpacity>
                  </View>

                  {staff.map(item => (
                      <View key={item.id}>{renderStaffItem({item})}</View>
                  ))}
              </ScrollView>
          ) : (
              <ScrollView contentContainerStyle={{ padding: 20 }}>
                  <Text style={styles.sectionTitle}>Datos de la Clínica</Text>
                  {clinicData && (
                      <>
                        <Input label="Nombre" value={clinicData.name} onChangeText={t => setClinicData({...clinicData, name: t})} />
                        <Input label="Dirección" value={clinicData.address} onChangeText={t => setClinicData({...clinicData, address: t})} />
                        
                        <Text style={styles.label}>Ubicación</Text>
                        <View style={styles.mapContainer}>
                            <View style={styles.mapPlaceholder}>
                                <Ionicons name="map" size={48} color="#ccc" />
                                <Text style={styles.mapHint}>Mapa no disponible</Text>
                            </View>
                        </View>

                        <Button title="Guardar Cambios" onPress={handleSaveConfig} style={{marginTop: 20}} />
                      </>
                  )}
              </ScrollView>
          )}
      </View>

      {/* Assign Modal */}
      <Modal visible={showAssignModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Asignar Cita</Text>
                  
                  <Text style={styles.label}>Seleccionar Veterinario:</Text>
                  <ScrollView style={{maxHeight: 150}}>
                      {staff.map(member => (
                          <TouchableOpacity 
                            key={member.id} 
                            style={[styles.modalOption, selectedVetId === member.vetId && styles.modalOptionSelected]}
                            onPress={() => setSelectedVetId(member.vetId)}
                          >
                              <Text style={styles.modalOptionText}>{member.vet.nombre}</Text>
                              {selectedVetId === member.vetId && <Ionicons name="checkmark" size={20} color="#007AFF" />}
                          </TouchableOpacity>
                      ))}
                  </ScrollView>

                  <Text style={styles.label}>Duración Estimada:</Text>
                  <View style={styles.durationRow}>
                      {DURATION_OPTIONS.map(min => (
                          <TouchableOpacity 
                            key={min}
                            style={[styles.durationChip, selectedDuration === min && styles.durationChipSelected]}
                            onPress={() => setSelectedDuration(min)}
                          >
                              <Text style={[styles.durationText, selectedDuration === min && styles.durationTextSelected]}>{min} min</Text>
                          </TouchableOpacity>
                      ))}
                  </View>

                  <View style={styles.modalActions}>
                      <Button title="Cancelar" onPress={() => setShowAssignModal(false)} outline style={{flex: 1, marginRight: 10}} />
                      <Button title="Confirmar" onPress={handleAssignAndConfirm} style={{flex: 1}} />
                  </View>
              </View>
          </View>
      </Modal>

      {/* Invitation Modal */}
      <Modal visible={showInviteModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Invitar Colaborador</Text>
                  <Input 
                      label="Correo Electrónico" 
                      placeholder="ejemplo@vet.com" 
                      value={inviteEmail} 
                      onChangeText={setInviteEmail} 
                      keyboardType="email-address"
                      autoCapitalize="none"
                  />
                  
                  <Text style={styles.label}>Rol:</Text>
                  <View style={styles.roleSelector}>
                      {['ADMIN', 'VET', 'ASSISTANT'].map(role => (
                          <TouchableOpacity 
                              key={role}
                              style={[styles.roleOption, inviteRole === role && styles.roleOptionSelected]}
                              onPress={() => setInviteRole(role)}
                          >
                              <Text style={[styles.roleOptionText, inviteRole === role && styles.roleOptionTextSelected]}>{role}</Text>
                          </TouchableOpacity>
                      ))}
                  </View>

                  <View style={styles.modalActions}>
                      <Button title="Cancelar" onPress={() => setShowInviteModal(false)} outline style={{flex: 1, marginRight: 10}} />
                      <Button title="Enviar" onPress={handleSendInvitation} style={{flex: 1}} />
                  </View>
              </View>
          </View>
      </Modal>
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
  content: { flex: 1 }, // Removed padding to handle lists better
  
  // Dashboard Header
  dashboardHeader: { paddingHorizontal: 20, paddingTop: 10 },
  welcomeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  welcomeText: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  dateText: { fontSize: 14, color: '#666', textTransform: 'capitalize' },
  agendaBtn: { backgroundColor: '#007AFF', padding: 10, borderRadius: 12, shadowColor: '#007AFF', shadowOpacity: 0.3, shadowOffset: {width:0, height:4}, elevation: 4 },
  
  statsRow: { flexDirection: 'row', gap: 15, marginBottom: 25 },
  statCard: { flex: 1, backgroundColor: '#FFF', padding: 15, borderRadius: 16, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: {width:0, height:2}, elevation: 2 },
  statIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  statLabel: { fontSize: 12, color: '#888' },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },

  // Ticket Card
  ticketCard: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginBottom: 12, marginHorizontal: 20, shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
  ticketLeft: { alignItems: 'center', borderRightWidth: 1, borderRightColor: '#F0F0F0', paddingRight: 12, marginRight: 12, justifyContent: 'center' },
  dateBadge: { backgroundColor: '#E8F4FD', borderRadius: 8, padding: 6, alignItems: 'center', minWidth: 50, marginBottom: 4 },
  dateDay: { fontSize: 18, fontWeight: 'bold', color: '#007AFF' },
  dateMonth: { fontSize: 10, color: '#007AFF', textTransform: 'uppercase' },
  dateTimeText: { fontSize: 12, fontWeight: '600', color: '#666' },
  ticketContent: { flex: 1 },
  ticketPetName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  ticketOwner: { fontSize: 12, color: '#888', marginBottom: 4 },
  ticketReason: { fontSize: 13, color: '#555', fontStyle: 'italic', marginBottom: 10 },
  ticketActions: { flexDirection: 'row', gap: 8 },
  actionBtnReject: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, borderWidth: 1, borderColor: '#FFCDD2' },
  actionTextReject: { color: '#D32F2F', fontSize: 12, fontWeight: '600' },
  actionBtnAccept: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, backgroundColor: '#007AFF' },
  actionTextAccept: { color: '#FFF', fontSize: 12, fontWeight: '600' },

  // Staff Card
  staffCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.03, elevation: 1 },
  staffInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  staffAvatarImg: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  staffAvatarPlaceholder: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  staffInitials: { fontSize: 20, fontWeight: 'bold', color: '#555' },
  staffDetails: { flex: 1 },
  staffName: { fontSize: 16, fontWeight: '700', color: '#333' },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
  roleOwner: { backgroundColor: '#333' },
  roleVet: { backgroundColor: '#007AFF' },
  roleText: { color: '#FFF', fontSize: 10, fontWeight: '600' },
  invitedBadge: { backgroundColor: '#FFF3E0', alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
  invitedText: { color: '#E65100', fontSize: 10, fontWeight: '600' },
  availabilityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F5F5F5', paddingTop: 12 },
  availLabel: { fontSize: 13, fontWeight: '500' },

  // Config & Map
  label: { fontWeight: '600', marginTop: 15, marginBottom: 5 },
  mapContainer: { height: 200, borderRadius: 12, overflow: 'hidden', marginTop: 10, backgroundColor: '#E0E0E0' },
  mapPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mapHint: { textAlign: 'center', marginTop: 10, color: '#666' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  modalOption: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderColor: '#F0F0F0' },
  modalOptionSelected: { backgroundColor: '#F5F9FF' },
  modalOptionText: { fontSize: 16 },
  durationRow: { flexDirection: 'row', gap: 10, marginTop: 10, marginBottom: 20 },
  durationChip: { padding: 10, borderRadius: 20, backgroundColor: '#F0F0F0', borderWidth: 1, borderColor: '#DDD' },
  durationChipSelected: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  durationText: { color: '#333' },
  durationTextSelected: { color: '#FFF' },
  modalActions: { flexDirection: 'row', gap: 10 },
  roleSelector: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  roleOption: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#DDD', alignItems: 'center' },
  roleOptionSelected: { backgroundColor: '#E8F4FD', borderColor: '#007AFF' },
  roleOptionText: { color: '#666' },
  roleOptionTextSelected: { color: '#007AFF', fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  empty: { textAlign: 'center', marginTop: 10, color: '#999', fontSize: 16 }
});

export default ClinicDashboardScreen;