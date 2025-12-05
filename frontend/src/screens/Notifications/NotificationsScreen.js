import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { userAPI, clinicAPI } from '../../services/api';
import { Loading } from '../../components';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '../../contexts/AuthContext';

const NotificationsScreen = ({ navigation }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { selectClinic } = useAuth();

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await userAPI.getNotifications();
      setNotifications(response.data.notifications);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleAcceptInvitation = async (clinicId, clinicName) => {
      try {
          await clinicAPI.manageInvitation(clinicId, 'ACCEPT');
          Alert.alert(
              'Invitación Aceptada',
              `Ahora eres parte de ${clinicName}. ¿Quieres cambiar a esta clínica ahora?`,
              [
                  { text: 'No, luego', style: 'cancel', onPress: fetchNotifications },
                  { 
                      text: 'Sí, cambiar', 
                      onPress: async () => {
                          // We need to fetch updated clinic object to select it.
                          // Simplified: just navigate to Selector or reload main data
                          // Ideally, fetch 'my clinics' and find it.
                          const res = await clinicAPI.getMyClinics();
                          const newClinic = res.data.clinics.find(c => c.id === clinicId);
                          if (newClinic) {
                              selectClinic(newClinic);
                              navigation.navigate('Main');
                          } else {
                              fetchNotifications();
                          }
                      }
                  }
              ]
          );
      } catch (error) {
          Alert.alert('Error', 'No se pudo aceptar la invitación');
      }
  };

  const handleRejectInvitation = async (clinicId) => {
      try {
          await clinicAPI.manageInvitation(clinicId, 'REJECT');
          fetchNotifications();
      } catch (error) {
          Alert.alert('Error', 'No se pudo rechazar la invitación');
      }
  };

  const renderItem = ({ item }) => {
      if (item.type === 'INVITATION') {
          return (
              <View style={styles.card}>
                  <View style={styles.iconContainer}>
                      <Ionicons name="mail-open" size={24} color="#007AFF" />
                  </View>
                  <View style={styles.content}>
                      <Text style={styles.title}>{item.title}</Text>
                      <Text style={styles.subtitle}>{item.subtitle}</Text>
                      <Text style={styles.date}>{format(parseISO(item.createdAt), 'dd MMM, HH:mm', { locale: es })}</Text>
                      
                      <View style={styles.actions}>
                          <TouchableOpacity 
                            style={[styles.btn, styles.btnReject]} 
                            onPress={() => handleRejectInvitation(item.data.clinicId)}
                          >
                              <Text style={styles.btnTextReject}>Rechazar</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={[styles.btn, styles.btnAccept]} 
                            onPress={() => handleAcceptInvitation(item.data.clinicId, item.data.clinicName)}
                          >
                              <Text style={styles.btnTextAccept}>Aceptar</Text>
                          </TouchableOpacity>
                      </View>
                  </View>
              </View>
          );
      } else if (item.type === 'CLINIC_REQUEST') {
          return (
              <View style={styles.card}>
                  <View style={styles.iconContainer}>
                      <Ionicons name="calendar" size={24} color="#FF9500" />
                  </View>
                  <View style={styles.content}>
                      <Text style={styles.title}>{item.title}</Text>
                      <Text style={styles.subtitle}>{item.subtitle}</Text>
                      <Text style={styles.date}>{format(parseISO(item.createdAt), 'dd MMM, HH:mm', { locale: es })}</Text>
                      {/* No action buttons needed here if navigating to dashboard is preferred, or add 'Ver' */}
                  </View>
              </View>
          );
      } else if (item.type === 'MY_PET_APPOINTMENT') {
          return (
              <View style={styles.card}>
                  <View style={styles.iconContainer}>
                      <Ionicons name="paw" size={24} color="#4CAF50" />
                  </View>
                  <View style={styles.content}>
                      <Text style={styles.title}>{item.title}</Text>
                      <Text style={styles.subtitle}>{item.subtitle}</Text>
                      <Text style={styles.date}>{format(parseISO(item.createdAt), 'dd MMM, HH:mm', { locale: es })}</Text>
                  </View>
              </View>
          );
      }
      return null;
  };

  return (
    <View style={styles.container}>
      <FlatList 
        data={notifications}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchNotifications} />}
        ListEmptyComponent={
            !loading && (
                <View style={styles.emptyContainer}>
                    <Ionicons name="notifications-off-outline" size={48} color="#CCC" />
                    <Text style={styles.emptyText}>No tienes notificaciones</Text>
                </View>
            )
        }
        contentContainerStyle={styles.list}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9' },
  list: { padding: 20 },
  card: { flexDirection: 'row', backgroundColor: '#FFF', padding: 16, borderRadius: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  iconContainer: { marginRight: 15, paddingTop: 4 },
  content: { flex: 1 },
  title: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 8, lineHeight: 20 },
  date: { fontSize: 12, color: '#999', marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 10 },
  btn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center' },
  btnReject: { backgroundColor: '#FFF0F0', borderWidth: 1, borderColor: '#FFCDD2' },
  btnAccept: { backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#C8E6C9' },
  btnTextReject: { color: '#D32F2F', fontSize: 13, fontWeight: '600' },
  btnTextAccept: { color: '#2E7D32', fontSize: 13, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#999', fontSize: 16, marginTop: 10 },
});

export default NotificationsScreen;
