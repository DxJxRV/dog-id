import React from 'react';
import { View, Image, Text, StyleSheet, TouchableOpacity, Modal, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { Loading } from '../components';
import { API_URL } from '../utils/config';

// Auth Screens
import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';

// Pet Screens
import PetsListScreen from '../screens/Pets/PetsListScreen';
import PetDetailScreen from '../screens/Pets/PetDetailScreen';
import AddEditPetScreen from '../screens/Pets/AddEditPetScreen';
import LinkPetScreen from '../screens/Pets/LinkPetScreen';
import ArchivedPetsScreen from '../screens/Pets/ArchivedPetsScreen';
import AddVaccineScreen from '../screens/Pets/AddVaccineScreen';
import AddProcedureScreen from '../screens/Pets/AddProcedureScreen';

// Vaccine & Procedure Detail Screens
import VaccineDetailScreen from '../screens/Vaccines/VaccineDetailScreen';
import ProcedureDetailScreen from '../screens/Procedures/ProcedureDetailScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const UserAvatar = ({ size = 28, focused, onPress }) => {
  const { user } = useAuth();

  const avatarStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  const content = user?.fotoUrl ? (
    <Image
      source={{ uri: `${API_URL}${user.fotoUrl}` }}
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
    <TouchableOpacity
      onPress={onPress}
      style={[styles.avatarContainer, focused && styles.avatarContainerFocused]}
    >
      {content}
    </TouchableOpacity>
  );
};

const ProfileModal = ({ visible, onClose }) => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro de que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: () => {
            onClose();
            logout();
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.profileModalOverlay}>
        <TouchableOpacity
          style={styles.profileModalBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.profileModalContentWrapper}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalUserName}>{user?.nombre}</Text>
              <Text style={styles.modalUserEmail}>{user?.email}</Text>
            </View>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
              <Text style={styles.logoutButtonText}>Cerrar sesión</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const AddButton = ({ onPress }) => (
  <TouchableOpacity
    style={styles.addButtonContainer}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <View style={styles.addButton}>
      <Ionicons name="add" size={32} color="#fff" />
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
      options={{ title: 'Mis Mascotas' }}
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
  </Stack.Navigator>
);

const AddPetModal = ({ visible, onClose, onNavigateToAddPet, onNavigateToLinkPet, isVet }) => {
  if (isVet) {
    // Para veterinarios, ir directo a LinkPet
    if (visible && onNavigateToLinkPet) {
      onNavigateToLinkPet();
      onClose();
    }
    return null;
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
          <View style={styles.addModal}>
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

const MainTabs = ({ navigationRef }) => {
  const { userType } = useAuth();
  const isVet = userType === 'vet';
  const [showAddButton, setShowAddButton] = React.useState(true);
  const [showProfileModal, setShowProfileModal] = React.useState(false);
  const [showAddPetModal, setShowAddPetModal] = React.useState(false);

  return (
    <>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#007AFF',
          tabBarInactiveTintColor: '#999',
          tabBarStyle: {
            height: 60,
            paddingBottom: 8,
            paddingTop: 8,
          },
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
        }}
        screenListeners={{
          state: (e) => {
            const state = e.data.state;
            const currentRoute = state.routes[state.index];
            setShowAddButton(currentRoute.name === 'Pets');
          },
        }}
      >
        <Tab.Screen
          name="Pets"
          component={PetsStack}
          options={{
            tabBarLabel: 'Mascotas',
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons
                name={focused ? 'paw' : 'paw-outline'}
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tab.Screen
          name="Add"
          component={View}
          listeners={({ navigation }) => ({
            tabPress: (e) => {
              e.preventDefault();
              setShowAddPetModal(true);
            },
          })}
          options={{
            tabBarLabel: () => null,
            tabBarIcon: () => null,
            tabBarButton: (props) =>
              showAddButton ? (
                <AddButton
                  {...props}
                  onPress={() => {
                    setShowAddPetModal(true);
                  }}
                />
              ) : (
                <View style={{ flex: 1 }} />
              ),
          }}
        />
        <Tab.Screen
          name="Profile"
          component={View}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              setShowProfileModal(true);
            },
          }}
          options={{
            tabBarLabel: () => null,
            tabBarIcon: ({ focused }) => (
              <UserAvatar
                size={32}
                focused={focused}
                onPress={() => setShowProfileModal(true)}
              />
            ),
          }}
        />
      </Tab.Navigator>
      <ProfileModal
        visible={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
      <AddPetModal
        visible={showAddPetModal}
        onClose={() => setShowAddPetModal(false)}
        onNavigateToAddPet={() => {
          if (navigationRef?.current) {
            navigationRef.current.navigate('Pets', { screen: 'AddPet' });
          }
        }}
        onNavigateToLinkPet={() => {
          if (navigationRef?.current) {
            navigationRef.current.navigate('Pets', { screen: 'LinkPet' });
          }
        }}
        isVet={isVet}
      />
    </>
  );
};

const AppNavigator = () => {
  const { isAuthenticated, loading } = useAuth();
  const navigationRef = React.useRef(null);

  if (loading) {
    return <Loading />;
  }

  return (
    <NavigationContainer ref={navigationRef}>
      {isAuthenticated ? <MainTabs navigationRef={navigationRef} /> : <AuthStack />}
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
    top: -20,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  addButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  profileModalOverlay: {
    flex: 1,
  },
  profileModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  profileModalContentWrapper: {
    position: 'absolute',
    right: 16,
    bottom: 80,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  modalUserEmail: {
    fontSize: 14,
    color: '#666',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 8,
  },
  logoutButtonText: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '500',
  },
  addModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 30,
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
