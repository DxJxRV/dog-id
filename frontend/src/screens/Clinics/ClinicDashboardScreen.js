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
  Image,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { appointmentAPI, clinicAPI, userAPI } from '../../services/api';
import { Loading, Input, Button } from '../../components';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '../../contexts/AuthContext';
import { getImageUrl } from '../../utils/imageHelper';
import ClinicSwitcherModal from '../../components/ClinicSwitcherModal';
import * as ImagePicker from 'expo-image-picker';
// Conditional import for maps
let MapView, Marker;
try {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
} catch (e) {
  console.log('Maps not available in this build');
}

const ClinicDashboardScreen = () => {
  const navigation = useNavigation();
  const { user, currentClinic, selectClinic } = useAuth();
  const [activeTab, setActiveTab] = useState(0); // 0: Dashboard, 1: Equipo, 2: Config
  const [requests, setRequests] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);

  // Clinic Data
  const [clinicData, setClinicData] = useState(currentClinic);
  const [myClinics, setMyClinics] = useState([]);

  // Form Config (Reactive form states)
  const [formData, setFormData] = useState({
    name: currentClinic?.name || '',
    address: currentClinic?.address || '',
    phone: currentClinic?.phone || '',
    latitude: currentClinic?.latitude || 19.4326,  // Default: CDMX
    longitude: currentClinic?.longitude || -99.1332
  });
  const [originalData, setOriginalData] = useState({});
  const [isDirty, setIsDirty] = useState(false);
  
  // Modals
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSwitcherModal, setShowSwitcherModal] = useState(false);
  
  // Assign State
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedVetId, setSelectedVetId] = useState(null);
  const [selectedDuration, setSelectedDuration] = useState(30);

  // Invite State
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('VET');

  // Notifications
  const [unreadCount, setUnreadCount] = useState(0);

  // Logo Upload
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const DURATION_OPTIONS = [30, 60, 90, 120];

  // --- Data Loading ---

  const loadData = async () => {
    if (!currentClinic) return;
    setLoading(true);
    try {
      if (activeTab === 0) {
        const res = await appointmentAPI.getPendingRequests();
        setRequests(res.data.requests);
        // Check notifications count (Invites + Pending Requests for this clinic)
        const notifRes = await userAPI.getNotifications();
        // Filter notifications to only count invites or relevant stuff, but for now all are relevant
        // Plus requests count
        setUnreadCount(notifRes.data.notifications.length + res.data.requests.length);
      } else if (activeTab === 1) {
        const staffRes = await clinicAPI.getStaff(currentClinic.id);
        setStaff(staffRes.data.staff);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setClinicData(currentClinic);
    // Inicializar datos del formulario cuando cambia la clínica actual
    if (currentClinic) {
      const initial = {
        name: currentClinic.name || '',
        address: currentClinic.address || '',
        phone: currentClinic.phone || '',
        latitude: currentClinic.latitude || 19.4326,
        longitude: currentClinic.longitude || -99.1332
      };
      setFormData(initial);
      setOriginalData(initial);
      setIsDirty(false);
    }
    loadData();
  }, [activeTab, currentClinic]);

  // Detectar cambios en el formulario
  useEffect(() => {
    if (!originalData.name) return; // No comparar si no hay datos originales

    const hasChanges =
      formData.name !== originalData.name ||
      formData.address !== originalData.address ||
      formData.phone !== originalData.phone ||
      formData.latitude !== originalData.latitude ||
      formData.longitude !== originalData.longitude;

    setIsDirty(hasChanges);
  }, [formData, originalData]);

  const loadMyClinics = async () => {
      try {
          const res = await clinicAPI.getMyClinics();
          setMyClinics(res.data.clinics);
      } catch(e) { console.error(e); }
  };

  // --- Handlers ---

  const handleSwitchClinic = (clinic) => {
      selectClinic(clinic);
      setClinicData(clinic);
      setShowSwitcherModal(false);
  };

  const openAssignModal = async (request) => {
      setSelectedRequest(request);
      // Si es reasignación (ya tiene vet), preseleccionar. Si es general, null.
      setSelectedVetId(request.vetId || null);
      
      // Ensure staff is loaded
      if (staff.length === 0 && clinicData) {
          try {
              const staffRes = await clinicAPI.getStaff(clinicData.id);
              setStaff(staffRes.data.staff);
          } catch (error) {
              console.error('Error loading staff for modal:', error);
          }
      }
      
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

  const handleConfirmDirect = async (request) => {
      try {
          await appointmentAPI.manageRequest(request.id, 'APPROVE');
          Alert.alert('Confirmado', 'La cita ha sido confirmada');
          loadData();
      } catch(error) {
          Alert.alert('Error', 'No se pudo confirmar');
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

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveConfig = async () => {
    if (!isDirty) return;

    try {
      setLoading(true);
      await clinicAPI.update(clinicData.id, {
        name: formData.name,
        address: formData.address,
        phone: formData.phone,
        latitude: formData.latitude,
        longitude: formData.longitude
      });

      // Actualizar datos originales
      setOriginalData({...formData});
      setIsDirty(false);

      // Actualizar contexto
      selectClinic({
        ...currentClinic,
        name: formData.name,
        address: formData.address,
        phone: formData.phone,
        latitude: formData.latitude,
        longitude: formData.longitude
      });

      Alert.alert('✓ Guardado', 'Los datos de la clínica se actualizaron correctamente');
    } catch (error) {
      console.error('Error saving config:', error);
      Alert.alert('Error', 'No se pudo guardar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadLogo = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Necesitamos permiso para acceder a tus fotos');
        return;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) return;

      setUploadingLogo(true);

      // Upload to backend
      const response = await clinicAPI.uploadLogo(clinicData.id, result.assets[0].uri);

      // Update local state
      setClinicData({ ...clinicData, logoUrl: response.data.clinic.logoUrl });

      // Update context
      selectClinic({ ...currentClinic, logoUrl: response.data.clinic.logoUrl });

      Alert.alert('Éxito', 'Logo actualizado correctamente');
    } catch (error) {
      console.error('Error uploading logo:', error);
      Alert.alert('Error', 'No se pudo subir el logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  // --- Renderers ---

  const DashboardHeader = () => (
      <View style={styles.headerContainer}>
          <TouchableOpacity 
            style={styles.clinicSwitcher} 
            onPress={() => { loadMyClinics(); setShowSwitcherModal(true); }}
          >
              <View style={styles.clinicAvatarSmall}>
                  {clinicData?.logoUrl ? (
                      <Image source={{ uri: getImageUrl(clinicData.logoUrl) }} style={styles.clinicLogo} />
                  ) : (
                      <Text style={styles.clinicInitials}>{clinicData?.name?.charAt(0)}</Text>
                  )}
              </View>
              <Text style={styles.headerClinicName} numberOfLines={1}>{clinicData?.name}</Text>
              <Ionicons name="chevron-down" size={16} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.notifButton} onPress={() => navigation.navigate('Notifications')}>
              <Ionicons name="notifications-outline" size={26} color="#333" />
              {unreadCount > 0 && <View style={styles.badge} />}
          </TouchableOpacity>
      </View>
  );

  const renderDashboardSummary = () => {
    const otherPendingCount = requests.filter(r => r.clinicId !== clinicData?.id).length;

    return (
    <View style={styles.dashboardSummary}>
        <View style={styles.welcomeRow}>
            <View>
                <Text style={styles.welcomeText}>Hola, Dr. {user?.nombre}</Text>
                <Text style={styles.dateText}>{format(new Date(), 'EEEE, d MMMM', { locale: es })}</Text>
            </View>
            
            <View style={{flexDirection: 'row', gap: 10}}>
                {otherPendingCount > 0 && (
                    <TouchableOpacity 
                        style={styles.iconBtn}
                        onPress={() => { loadMyClinics(); setShowSwitcherModal(true); }}
                    >
                        <Ionicons name="alert-circle-outline" size={22} color="#333" />
                        <View style={[styles.smallBadge, { backgroundColor: '#FF9500' }]}>
                            <Text style={styles.smallBadgeText}>{otherPendingCount}</Text>
                        </View>
                    </TouchableOpacity>
                )}

                <TouchableOpacity 
                    style={styles.agendaBtn}
                    onPress={() => navigation.navigate('Appointments')} 
                >
                    <Ionicons name="calendar" size={20} color="#FFF" />
                </TouchableOpacity>
            </View>
        </View>

        <Text style={styles.sectionTitle}>Bandeja de Entrada</Text>
    </View>
    );
  };

  const renderRequestItem = ({ item }) => {
    const isGeneral = !item.vetId;
    const isAdmin = clinicData?.myRole === 'OWNER' || clinicData?.myRole === 'ADMIN';

    return (
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
              
              {/* Info de asignación */}
              {!isGeneral ? (
                  <View style={styles.assignedInfo}>
                      <Ionicons name="person" size={12} color="#666" />
                      <Text style={styles.assignedText}>Para: {item.vet.nombre}</Text>
                  </View>
              ) : (
                  <View style={styles.generalInfo}>
                      <Ionicons name="people" size={12} color="#FF9500" />
                      <Text style={styles.generalText}>Solicitud General</Text>
                  </View>
              )}

              <View style={styles.ticketActions}>
                  {/* Botón de rechazar siempre visible */}
                  <TouchableOpacity style={styles.actionBtnReject} onPress={() => handleReject(item.id)}>
                      <Text style={styles.actionTextReject}>Rechazar</Text>
                  </TouchableOpacity>

                  {/* Botones principales */}
                  {isGeneral ? (
                      <TouchableOpacity style={styles.actionBtnAssign} onPress={() => openAssignModal(item)}>
                          <Text style={styles.actionTextAssign}>Asignar</Text>
                      </TouchableOpacity>
                  ) : (
                      <TouchableOpacity style={styles.actionBtnConfirm} onPress={() => handleConfirmDirect(item)}>
                          <Text style={styles.actionTextConfirm}>Confirmar</Text>
                      </TouchableOpacity>
                  )}

                  {/* Reasignar solo si es Admin y ya tiene vet */}
                  {!isGeneral && isAdmin && (
                      <TouchableOpacity style={styles.actionBtnReassign} onPress={() => openAssignModal(item)}>
                          <Ionicons name="swap-horizontal" size={16} color="#666" />
                      </TouchableOpacity>
                  )}
              </View>
          </View>
      </View>
    );
  };

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
      <DashboardHeader />
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

      <View style={styles.content}>
          {activeTab === 0 ? (
              <FlatList 
                data={requests.filter(req => req.clinicId === clinicData?.id)}
                renderItem={renderRequestItem}
                keyExtractor={item => item.id}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
                ListHeaderComponent={renderDashboardSummary}
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
                  <Text style={styles.sectionTitle}>Identidad de la Clínica</Text>
                  {clinicData && (
                      <>
                        {/* Logo Uploader */}
                        <View style={styles.logoSection}>
                          <Text style={styles.label}>Logo de la Clínica</Text>
                          <TouchableOpacity
                            style={styles.logoUploader}
                            onPress={handleUploadLogo}
                            disabled={uploadingLogo}
                          >
                            {uploadingLogo ? (
                              <ActivityIndicator size="large" color="#007AFF" />
                            ) : clinicData.logoUrl ? (
                              <Image
                                source={{ uri: getImageUrl(clinicData.logoUrl) }}
                                style={styles.logoPreview}
                              />
                            ) : (
                              <View style={styles.logoPlaceholder}>
                                <Ionicons name="camera" size={32} color="#999" />
                                <Text style={styles.logoPlaceholderText}>Subir Logo</Text>
                              </View>
                            )}
                            {clinicData.logoUrl && !uploadingLogo && (
                              <View style={styles.logoOverlay}>
                                <Ionicons name="camera" size={24} color="#FFF" />
                              </View>
                            )}
                          </TouchableOpacity>
                          <Text style={styles.logoNote}>El logo se actualiza inmediatamente</Text>
                        </View>

                        <Text style={styles.sectionTitle}>Datos de la Clínica</Text>

                        {/* Input Nombre */}
                        <View style={styles.inputContainer}>
                          <Text style={styles.inputLabel}>Nombre</Text>
                          <TextInput
                            style={[
                              styles.configInput,
                              formData.name !== originalData.name && styles.configInputDirty
                            ]}
                            value={formData.name}
                            onChangeText={(value) => handleFieldChange('name', value)}
                            placeholder="Nombre de la clínica"
                          />
                        </View>

                        {/* Input Dirección */}
                        <View style={styles.inputContainer}>
                          <Text style={styles.inputLabel}>Dirección</Text>
                          <TextInput
                            style={[
                              styles.configInput,
                              formData.address !== originalData.address && styles.configInputDirty
                            ]}
                            value={formData.address}
                            onChangeText={(value) => handleFieldChange('address', value)}
                            placeholder="Dirección completa"
                            multiline
                          />
                        </View>

                        {/* Input Teléfono */}
                        <View style={styles.inputContainer}>
                          <Text style={styles.inputLabel}>Teléfono</Text>
                          <TextInput
                            style={[
                              styles.configInput,
                              formData.phone !== originalData.phone && styles.configInputDirty
                            ]}
                            value={formData.phone}
                            onChangeText={(value) => handleFieldChange('phone', value)}
                            placeholder="55 1234 5678"
                            keyboardType="phone-pad"
                          />
                        </View>

                        <Text style={styles.label}>Ubicación en el Mapa</Text>
                        <View style={styles.mapContainer}>
                          {MapView ? (
                            <MapView
                              style={styles.map}
                              provider={null}
                              initialRegion={{
                                latitude: formData.latitude,
                                longitude: formData.longitude,
                                latitudeDelta: 0.01,
                                longitudeDelta: 0.01,
                              }}
                            >
                              <Marker
                                coordinate={{
                                  latitude: formData.latitude,
                                  longitude: formData.longitude,
                                }}
                                draggable
                                onDragEnd={(e) => {
                                  handleFieldChange('latitude', e.nativeEvent.coordinate.latitude);
                                  handleFieldChange('longitude', e.nativeEvent.coordinate.longitude);
                                }}
                                title={formData.name}
                                description={formData.address}
                              >
                                <View style={styles.markerContainer}>
                                  <Ionicons name="location" size={40} color="#007AFF" />
                                </View>
                              </Marker>
                            </MapView>
                          ) : (
                            <View style={styles.mapPlaceholder}>
                              <Ionicons name="map-outline" size={48} color="#999" />
                              <Text style={styles.mapPlaceholderText}>Mapa no disponible en Expo Go</Text>
                              <Text style={styles.mapPlaceholderSubtext}>
                                Lat: {formData.latitude.toFixed(4)}, Lng: {formData.longitude.toFixed(4)}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.mapHint}>
                          {MapView ? 'Arrastra el pin para ajustar la ubicación' : 'Requiere build nativo para editar'}
                        </Text>

                        {/* Botón Guardar - Solo visible si hay cambios */}
                        {isDirty && (
                          <TouchableOpacity
                            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                            onPress={handleSaveConfig}
                            disabled={loading}
                          >
                            {loading ? (
                              <ActivityIndicator color="#FFF" />
                            ) : (
                              <>
                                <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                                <Text style={styles.saveButtonText}>Guardar Cambios</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        )}
                      </>
                  )}
              </ScrollView>
          )}
      </View>

      {/* Modals */}
      <Modal visible={showAssignModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Asignar Cita</Text>
                  <Text style={styles.label}>Seleccionar Veterinario:</Text>
                  <ScrollView style={{maxHeight: 150}}>
                      {staff.length > 0 ? staff.map(member => (
                          <TouchableOpacity 
                            key={member.id} 
                            style={[styles.modalOption, selectedVetId === member.vetId && styles.modalOptionSelected]}
                            onPress={() => setSelectedVetId(member.vetId)}
                          >
                              <Text style={styles.modalOptionText}>{member.vet.nombre}</Text>
                              {selectedVetId === member.vetId && <Ionicons name="checkmark" size={20} color="#007AFF" />}
                          </TouchableOpacity>
                      )) : <Text style={{padding: 10, color: '#999'}}>Cargando personal...</Text>}
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
                      <Button 
                        title="Cancelar" 
                        onPress={() => setShowAssignModal(false)} 
                        style={{flex: 1, marginRight: 10, backgroundColor: '#F5F5F5', borderWidth: 0}} 
                        textStyle={{color: '#666'}}
                      />
                      <Button 
                        title="Confirmar" 
                        onPress={handleAssignAndConfirm} 
                        style={{flex: 1}} 
                      />
                  </View>
              </View>
          </View>
      </Modal>

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

      <ClinicSwitcherModal 
        visible={showSwitcherModal}
        onClose={() => setShowSwitcherModal(false)}
        clinics={myClinics}
        currentClinic={currentClinic}
        onSelect={handleSwitchClinic}
      />
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
  content: { flex: 1 },
  
  // Dashboard Header
  headerContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 15, 
    backgroundColor: '#FFF', 
    borderBottomWidth: 1, 
    borderBottomColor: '#F0F0F0',
    marginTop: 0 
  },
  clinicSwitcher: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', padding: 8, paddingRight: 12, borderRadius: 20 },
  clinicAvatarSmall: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginRight: 8, overflow: 'hidden' },
  clinicLogo: { width: '100%', height: '100%' },
  clinicInitials: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  headerClinicName: { fontSize: 16, fontWeight: '700', color: '#333', marginRight: 6, maxWidth: 200 },
  notifButton: { padding: 8, position: 'relative' },
  badge: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF3B30' },

  // Dashboard Summary
  dashboardSummary: { paddingHorizontal: 20, paddingTop: 10 },
  welcomeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  welcomeText: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  dateText: { fontSize: 14, color: '#666', textTransform: 'capitalize' },
  
  headerActions: { flexDirection: 'row', gap: 10 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: {width:0, height:2}, elevation: 2 },
  smallBadge: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: '#F5F5F5' },
  smallBadgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  agendaBtn: { backgroundColor: '#007AFF', padding: 10, borderRadius: 12, shadowColor: '#007AFF', shadowOpacity: 0.3, shadowOffset: {width:0, height:4}, elevation: 4 },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },

  // Ticket Card (Updated)
  ticketCard: { 
    flexDirection: 'row', 
    backgroundColor: '#FFF', 
    borderRadius: 12, 
    padding: 12, 
    marginBottom: 12, 
    marginHorizontal: 20, 
    shadowColor: '#000', 
    shadowOpacity: 0.05, 
    elevation: 2,
    marginTop: 10 
  },
  ticketLeft: { alignItems: 'center', borderRightWidth: 1, borderRightColor: '#F0F0F0', paddingRight: 12, marginRight: 12, justifyContent: 'center' },
  dateBadge: { backgroundColor: '#E8F4FD', borderRadius: 8, padding: 6, alignItems: 'center', minWidth: 50, marginBottom: 4 },
  dateDay: { fontSize: 18, fontWeight: 'bold', color: '#007AFF' },
  dateMonth: { fontSize: 10, color: '#007AFF', textTransform: 'uppercase' },
  dateTimeText: { fontSize: 12, fontWeight: '600', color: '#666' },
  ticketContent: { flex: 1 },
  ticketPetName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  ticketOwner: { fontSize: 12, color: '#888', marginBottom: 4 },
  ticketReason: { fontSize: 13, color: '#555', fontStyle: 'italic', marginBottom: 10 },
  
  assignedInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  assignedText: { fontSize: 12, color: '#666', marginLeft: 4 },
  generalInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  generalText: { fontSize: 12, color: '#FF9500', marginLeft: 4, fontWeight: '600' },

  ticketActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  actionBtnReject: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, borderWidth: 1, borderColor: '#FFCDD2' },
  actionTextReject: { color: '#D32F2F', fontSize: 12, fontWeight: '600' },
  actionBtnAccept: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, backgroundColor: '#007AFF' }, // Asignar (Azul)
  actionTextAccept: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  actionBtnConfirm: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, backgroundColor: '#4CAF50' }, // Confirmar (Verde)
  actionTextConfirm: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  actionBtnReassign: { padding: 6, backgroundColor: '#F5F5F5', borderRadius: 6 },

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
  mapPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  mapPlaceholderText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    textAlign: 'center'
  },
  mapPlaceholderSubtext: {
    marginTop: 8,
    fontSize: 12,
    color: '#999',
    textAlign: 'center'
  },
  map: { flex: 1 },
  mapHint: { textAlign: 'center', marginTop: 10, color: '#666', fontSize: 13 },

  // Logo Uploader
  logoSection: { marginBottom: 30, alignItems: 'center' },
  logoUploader: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    overflow: 'hidden',
    marginTop: 10
  },
  logoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  logoPlaceholderText: {
    marginTop: 8,
    fontSize: 12,
    color: '#999',
    fontWeight: '600'
  },
  logoPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 60
  },
  logoOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 60
  },
  logoNote: {
    marginTop: 8,
    fontSize: 12,
    color: '#8E8E93',
    fontStyle: 'italic',
  },

  // Reactive Form Inputs
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3A3A3C',
    marginBottom: 8,
  },
  configInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1C1C1E',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  configInputDirty: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 20,
    gap: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  markerContainer: {
    alignItems: 'center',
  },
  
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
