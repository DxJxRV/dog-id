import React, { useState, useEffect } from 'react';
import { View, Image, Text, StyleSheet, TouchableOpacity, Modal, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { Loading } from '../components';
import { getImageUrl } from '../utils/imageHelper';
import { friendshipsAPI } from '../services/api';

// Auth Screens
import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';

// Pet Screens
import PetsListScreen from '../screens/Pets/PetsListScreen';
import PetDetailScreen from '../screens/Pets/PetDetailScreen';
import AddEditPetScreen from '../screens/Pets/AddEditPetScreen';
import LinkPetScreen from '../screens/Pets/LinkPetScreen';
import QuickPetScreen from '../screens/Pets/QuickPetScreen';
import PetTransferScreen from '../screens/Pets/PetTransferScreen';
import ClaimPetScreen from '../screens/Pets/ClaimPetScreen';
import ArchivedPetsScreen from '../screens/Pets/ArchivedPetsScreen';
import AddVaccineScreen from '../screens/Pets/AddVaccineScreen';
import AddProcedureScreen from '../screens/Pets/AddProcedureScreen';

// Vaccine & Procedure Detail Screens
import VaccineDetailScreen from '../screens/Vaccines/VaccineDetailScreen';
import ProcedureDetailScreen from '../screens/Procedures/ProcedureDetailScreen';

// ECE Screens
import ConsentScreen from '../screens/Consent/ConsentScreen';
import PdfViewerScreen from '../screens/Pdf/PdfViewerScreen';
import DeathCertificateFormScreen from '../screens/DeathCertificate/DeathCertificateFormScreen';

// Smart Consultation Screens
import RecordConsultationScreen from '../screens/SmartConsultation/RecordConsultationScreen';
import ConsultationsListScreen from '../screens/SmartConsultation/ConsultationsListScreen';
import ConsultationDetailScreen from '../screens/SmartConsultation/ConsultationDetailScreen';

// Friends Screens
import FriendsMainScreen from '../screens/Friends/FriendsMainScreen';
import FriendsPetsScreen from '../screens/Friends/FriendsPetsScreen';
import FriendsListScreen from '../screens/Friends/FriendsListScreen';
import AddFriendScreen from '../screens/Friends/AddFriendScreen';
import PetProfileScreen from '../screens/Friends/PetProfileScreen';

// Profile Screens
import ProfileScreen from '../screens/Profile/ProfileScreen';

// Clinic & Appointments
import ClinicSetupScreen from '../screens/Clinics/ClinicSetupScreen';
import AppointmentSchedulerScreen from '../screens/Appointments/AppointmentSchedulerScreen';
import CreateAppointmentScreen from '../screens/Appointments/CreateAppointmentScreen';
import RequestAppointmentScreen from '../screens/Booking/RequestAppointmentScreen';
import BookingHubScreen from '../screens/Booking/BookingHubScreen';
import ServiceProfileScreen from '../screens/Booking/ServiceProfileScreen';
import ClinicDashboardScreen from '../screens/Clinics/ClinicDashboardScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const RootStack = createStackNavigator();

const UserAvatar = ({ size = 28, focused }) => {
  const { user } = useAuth();

  const avatarStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  const content = user?.fotoUrl ? (
    <Image
      source={{ uri: getImageUrl(user.fotoUrl) }}
      style={avatarStyle}
    />
  ) : (
    <View style={[styles.avatarPlaceholder, avatarStyle]}>
      <Text style={styles.avatarPlaceholderText}>
        {user?.nombre?.charAt(0).toUpperCase() || 'U'}
      </Text>
    </View>
  );

  return (
    <View style={[styles.avatarContainer, focused && styles.avatarContainerFocused]}>
      {content}
    </View>
  );
};

const ProfileStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: {
        backgroundColor: '#fff',
      },
      headerTitleStyle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#000',
      },
      headerTintColor: '#007AFF',
      headerShadowVisible: false,
      headerBackTitleVisible: false,
    }}
  >
    <Stack.Screen
      name="ProfileMain"
      component={ProfileScreen}
      options={{
        title: 'Perfil',
        headerStyle: {
          backgroundColor: '#007AFF',
        },
        headerTitleStyle: {
          fontSize: 17,
          fontWeight: '600',
          color: '#fff',
        },
        headerTintColor: '#fff',
      }}
    />
  </Stack.Navigator>
);

const AppointmentsStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: '#fff' },
      headerTitleStyle: { fontSize: 17, fontWeight: '600', color: '#000' },
      headerTintColor: '#007AFF',
      headerShadowVisible: false,
      headerBackTitleVisible: false,
    }}
  >
    <Stack.Screen
      name="AppointmentScheduler"
      component={AppointmentSchedulerScreen}
      options={{
        title: 'Agenda',
        headerStyle: { backgroundColor: '#007AFF' },
        headerTitleStyle: { color: '#fff' },
        headerTintColor: '#fff',
      }}
    />
    <Stack.Screen
      name="ClinicSetup"
      component={ClinicSetupScreen}
      options={{ title: 'Configurar Clínica' }}
    />
  </Stack.Navigator>
);

const AddButton = ({ onPress }) => (
  <TouchableOpacity
    style={styles.addButtonContainer}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <View style={styles.addButton}>
      <Ionicons name="add-circle" size={28} color="#007AFF" />
    </View>
  </TouchableOpacity>
);

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

const PetsStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: {
        backgroundColor: '#fff',
      },
      headerTitleStyle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#000',
      },
      headerTintColor: '#007AFF',
      headerShadowVisible: false,
      headerBackTitleVisible: false,
    }}
  >
    <Stack.Screen
      name="PetsList"
      component={PetsListScreen}
      options={{
        title: 'Mis Mascotas',
        headerStyle: {
          backgroundColor: '#007AFF',
        },
        headerTitleStyle: {
          fontSize: 17,
          fontWeight: '600',
          color: '#fff',
        },
        headerTintColor: '#fff',
      }}
    />
    <Stack.Screen
      name="ArchivedPets"
      component={ArchivedPetsScreen}
      options={{ title: 'Mascotas Archivadas' }}
    />
    <Stack.Screen
      name="PetDetail"
      component={PetDetailScreen}
      options={{ title: 'Detalle de Mascota' }}
    />
    <Stack.Screen
      name="AddPet"
      component={AddEditPetScreen}
      options={{ title: 'Agregar Mascota' }}
    />
    <Stack.Screen
      name="EditPet"
      component={AddEditPetScreen}
      options={{ title: 'Editar Mascota' }}
    />
    <Stack.Screen
      name="LinkPet"
      component={LinkPetScreen}
      options={{ title: 'Vincular Mascota' }}
    />
    <Stack.Screen
      name="QuickPet"
      component={QuickPetScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="PetTransfer"
      component={PetTransferScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="ClaimPet"
      component={ClaimPetScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="AddVaccine"
      component={AddVaccineScreen}
      options={{ title: 'Agregar Vacuna' }}
    />
    <Stack.Screen
      name="AddProcedure"
      component={AddProcedureScreen}
      options={{ title: 'Agregar Procedimiento' }}
    />
    <Stack.Screen
      name="VaccineDetail"
      component={VaccineDetailScreen}
      options={{ title: 'Detalle de Vacuna' }}
    />
    <Stack.Screen
      name="ProcedureDetail"
      component={ProcedureDetailScreen}
      options={{ title: 'Detalle de Procedimiento' }}
    />
    <Stack.Screen
      name="ConsentScreen"
      component={ConsentScreen}
      options={{ title: 'Consentimiento Informado' }}
    />
    <Stack.Screen
      name="PdfViewer"
      component={PdfViewerScreen}
      options={({ route }) => ({ title: route.params?.title || 'Documento PDF' })}
    />
    <Stack.Screen
      name="DeathCertificateForm"
      component={DeathCertificateFormScreen}
      options={{ title: 'Certificar Defunción' }}
    />
    <Stack.Screen
      name="RecordConsultation"
      component={RecordConsultationScreen}
      options={{ title: 'Grabar Bitácora' }}
    />
    <Stack.Screen
      name="ConsultationsList"
      component={ConsultationsListScreen}
      options={{ title: 'Bitácora Inteligente' }}
    />
    <Stack.Screen
      name="ConsultationDetail"
      component={ConsultationDetailScreen}
      options={{ title: 'Detalle de Bitácora' }}
    />
  </Stack.Navigator>
);

const FriendsStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: {
        backgroundColor: '#fff',
      },
      headerTitleStyle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#000',
      },
      headerTintColor: '#007AFF',
      headerShadowVisible: false,
      headerBackTitleVisible: false,
    }}
  >
    <Stack.Screen
      name="FriendsMain"
      component={FriendsMainScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="FriendsPets"
      component={FriendsPetsScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="FriendsList"
      component={FriendsListScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="AddFriend"
      component={AddFriendScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="PetProfile"
      component={PetProfileScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="PetDetail"
      component={PetDetailScreen}
      options={{ title: 'Detalle de Mascota' }}
    />
  </Stack.Navigator>
);

const AddPetModal = ({ visible, onClose, onNavigateToAddPet, onNavigateToLinkPet, onNavigateToQuickPet, onNavigateToClaimPet, isVet }) => {
  const insets = useSafeAreaInsets();

  if (isVet) {
    // Para veterinarios, mostrar menú con opciones
    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={onClose}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.addModal, { paddingBottom: 30 + insets.bottom }]}>
              <Text style={styles.addModalTitle}>Agregar Mascota</Text>

              <TouchableOpacity
                style={styles.addModalOption}
                onPress={() => {
                  onClose();
                  onNavigateToQuickPet();
                }}
              >
                <View style={styles.addModalIconContainer}>
                  <Ionicons name="flash" size={32} color="#007AFF" />
                </View>
                <View style={styles.addModalTextContainer}>
                  <Text style={styles.addModalOptionTitle}>Crear Mascota Rápida</Text>
                  <Text style={styles.addModalOptionSubtitle}>
                    Crea una mascota y compártela con su dueño
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#C7C7CC" />
              </TouchableOpacity>

              <View style={styles.addModalDivider} />

              <TouchableOpacity
                style={styles.addModalOption}
                onPress={() => {
                  onClose();
                  onNavigateToLinkPet();
                }}
              >
                <View style={styles.addModalIconContainer}>
                  <Ionicons name="link" size={32} color="#007AFF" />
                </View>
                <View style={styles.addModalTextContainer}>
                  <Text style={styles.addModalOptionTitle}>Vincular Mascota</Text>
                  <Text style={styles.addModalOptionSubtitle}>
                    Vincula una mascota existente a tu perfil
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#C7C7CC" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.addModalCancelButton}
                onPress={onClose}
              >
                <Text style={styles.addModalCancelText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          <View style={[styles.addModal, { paddingBottom: 30 + insets.bottom }]}>
            <Text style={styles.addModalTitle}>Agregar Mascota</Text>

            <TouchableOpacity
              style={styles.addModalOption}
              onPress={() => {
                onClose();
                onNavigateToAddPet();
              }}
            >
              <View style={styles.addModalIconContainer}>
                <Ionicons name="add-circle" size={32} color="#007AFF" />
              </View>
              <View style={styles.addModalTextContainer}>
                <Text style={styles.addModalOptionTitle}>Registrar Mascota</Text>
                <Text style={styles.addModalOptionSubtitle}>
                  Agrega una nueva mascota a tu perfil
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#C7C7CC" />
            </TouchableOpacity>

            <View style={styles.addModalDivider} />

            <TouchableOpacity
              style={styles.addModalOption}
              onPress={() => {
                onClose();
                onNavigateToClaimPet();
              }}
            >
              <View style={styles.addModalIconContainer}>
                <Ionicons name="gift" size={32} color="#007AFF" />
              </View>
              <View style={styles.addModalTextContainer}>
                <Text style={styles.addModalOptionTitle}>Reclamar Mascota</Text>
                <Text style={styles.addModalOptionSubtitle}>
                  Reclama una mascota creada por tu veterinario
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#C7C7CC" />
            </TouchableOpacity>

            <View style={styles.addModalDivider} />

            <TouchableOpacity
              style={styles.addModalOption}
              onPress={() => {
                onClose();
                onNavigateToLinkPet();
              }}
            >
              <View style={styles.addModalIconContainer}>
                <Ionicons name="link" size={32} color="#007AFF" />
              </View>
              <View style={styles.addModalTextContainer}>
                <Text style={styles.addModalOptionTitle}>Ser Co-dueño</Text>
                <Text style={styles.addModalOptionSubtitle}>
                  Escanea un código QR o ingresa un código
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#C7C7CC" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.addModalCancelButton}
              onPress={onClose}
            >
              <Text style={styles.addModalCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const BookingStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: '#fff' },
      headerTitleStyle: { fontSize: 17, fontWeight: '600', color: '#000' },
      headerTintColor: '#007AFF',
      headerShadowVisible: false,
      headerBackTitleVisible: false,
    }}
  >
    <Stack.Screen
      name="BookingHub"
      component={BookingHubScreen}
      options={{ title: 'Citas' }}
    />
    <Stack.Screen
      name="ServiceProfile"
      component={ServiceProfileScreen}
      options={{ title: 'Perfil' }}
    />
    <Stack.Screen
      name="RequestAppointment"
      component={RequestAppointmentScreen}
      options={{ title: 'Solicitar Cita' }}
    />
  </Stack.Navigator>
);

const ClinicStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: '#fff' },
      headerTitleStyle: { fontSize: 17, fontWeight: '600', color: '#000' },
      headerTintColor: '#007AFF',
      headerShadowVisible: false,
      headerBackTitleVisible: false,
    }}
  >
    <Stack.Screen
      name="ClinicDashboard"
      component={ClinicDashboardScreen}
      options={{ title: 'Mi Clínica' }}
    />
  </Stack.Navigator>
);

// --- Role-Based Tabs ---

const OwnerTabs = () => {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
          paddingTop: 10,
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#E5E5EA',
        },
      }}
    >
      <Tab.Screen
        name="Feed"
        component={FriendsMainScreen}
        options={{
          tabBarLabel: 'Inicio',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Pets"
        component={PetsStack}
        options={{
          tabBarLabel: 'Mascotas',
          tabBarIcon: ({ color, size }) => <Ionicons name="paw-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Booking"
        component={BookingStack}
        options={{
          tabBarLabel: 'Citas',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ focused }) => <UserAvatar size={24} focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
};

const VetTabs = () => {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
          paddingTop: 10,
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#E5E5EA',
        },
      }}
    >
      <Tab.Screen
        name="Appointments"
        component={AppointmentsStack}
        options={{
          tabBarLabel: 'Agenda',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Patients"
        component={PetsStack}
        options={{
          tabBarLabel: 'Pacientes',
          tabBarIcon: ({ color, size }) => <Ionicons name="paw-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Clinic"
        component={ClinicStack}
        options={{
          tabBarLabel: 'Clínica',
          tabBarIcon: ({ color, size }) => <Ionicons name="medkit-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ focused }) => <UserAvatar size={24} focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
};

const MainTabs = () => {
  const { userType } = useAuth();
  return userType === 'vet' ? <VetTabs /> : <OwnerTabs />;
};

const AuthenticatedNavigator = ({ navigationRef }) => (
  <RootStack.Navigator screenOptions={{ headerShown: false }}>
    <RootStack.Screen name="Main">
      {props => <MainTabs {...props} navigationRef={navigationRef} />}
    </RootStack.Screen>
    <RootStack.Group screenOptions={{ presentation: 'transparentModal', headerShown: false, animation: 'fade' }}>
      <RootStack.Screen 
        name="CreateAppointment" 
        component={CreateAppointmentScreen} 
      />
    </RootStack.Group>
  </RootStack.Navigator>
);

const AppNavigator = () => {
  const { isAuthenticated, loading } = useAuth();
  const navigationRef = React.useRef(null);

  if (loading) {
    return <Loading />;
  }

  return (
    <NavigationContainer ref={navigationRef}>
      {isAuthenticated ? <AuthenticatedNavigator navigationRef={navigationRef} /> : <AuthStack />}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  avatarContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarContainerFocused: {
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 20,
    padding: 2,
  },
  avatarPlaceholder: {
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  addButtonContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  addButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  addModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  addModalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginBottom: 20,
    textAlign: 'center',
  },
  addModalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  addModalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F4FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addModalTextContainer: {
    flex: 1,
  },
  addModalOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  addModalOptionSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
  },
  addModalDivider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: 12,
  },
  addModalCancelButton: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
  },
  addModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
});

export default AppNavigator;