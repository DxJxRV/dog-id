import React, { useState, useEffect } from 'react';
import { View, Image, Text, StyleSheet, TouchableOpacity, Modal, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
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

// Friends Screens
import FriendsMainScreen from '../screens/Friends/FriendsMainScreen';
import FriendsPetsScreen from '../screens/Friends/FriendsPetsScreen';
import FriendsListScreen from '../screens/Friends/FriendsListScreen';
import AddFriendScreen from '../screens/Friends/AddFriendScreen';
import PetProfileScreen from '../screens/Friends/PetProfileScreen';

// Profile Screens
import ProfileScreen from '../screens/Profile/ProfileScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

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
            <View style={styles.addModal}>
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

const MainTabs = ({ navigationRef }) => {
  const { userType } = useAuth();
  const isVet = userType === 'vet';
  const [showAddButton, setShowAddButton] = useState(true);
  const [showAddPetModal, setShowAddPetModal] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  const fetchPendingCount = async () => {
    // Los veterinarios no tienen funcionalidad de amigos
    if (isVet) return;

    try {
      const [pendingResponse, newPetsResponse] = await Promise.all([
        friendshipsAPI.getPending(),
        friendshipsAPI.getNewPetsCount()
      ]);
      const pendingCount = pendingResponse.data.requests?.length || 0;
      const newPetsCount = newPetsResponse.data.newPetsCount || 0;
      setPendingRequestsCount(pendingCount + newPetsCount);
    } catch (err) {
      // Silently fail - this is just for badge display
    }
  };

  useEffect(() => {
    // Solo cargar el contador si NO es veterinario
    if (!isVet) {
      fetchPendingCount();
      // Set up an interval to refresh the count every 30 seconds
      const interval = setInterval(fetchPendingCount, 30000);
      return () => clearInterval(interval);
    }
  }, [isVet]);

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
            // Mostrar el botón + siempre
            setShowAddButton(true);
          },
        }}
      >
        <Tab.Screen
          name="Pets"
          component={PetsStack}
          options={{
            tabBarLabel: () => null,
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons
                name={focused ? 'paw' : 'paw-outline'}
                size={size}
                color={color}
              />
            ),
          }}
        />
        {/* Solo mostrar tab de amigos para usuarios normales, no para veterinarios */}
        {!isVet && (
          <Tab.Screen
            name="Friends"
            component={FriendsStack}
            listeners={{
              focus: () => {
                fetchPendingCount();
              },
              blur: () => {
                fetchPendingCount();
              },
            }}
            options={{
              tabBarLabel: () => null,
              tabBarBadge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined,
              tabBarBadgeStyle: {
                backgroundColor: '#FF3B30',
                color: '#fff',
                fontSize: 12,
                fontWeight: '700',
                minWidth: 20,
                height: 20,
                borderRadius: 10,
                lineHeight: 20,
              },
              tabBarIcon: ({ focused, color, size }) => (
                <Ionicons
                  name={focused ? 'people' : 'people-outline'}
                  size={size}
                  color={color}
                />
              ),
            }}
          />
        )}
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
            tabBarLabel: '',
            tabBarIcon: () => null,
            tabBarButton: (props) => (
              <AddButton
                {...props}
                onPress={() => {
                  setShowAddPetModal(true);
                }}
              />
            ),
          }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileStack}
          options={{
            tabBarLabel: () => null,
            tabBarIcon: ({ focused }) => (
              <UserAvatar
                size={32}
                focused={focused}
              />
            ),
          }}
        />
      </Tab.Navigator>
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
        onNavigateToQuickPet={() => {
          if (navigationRef?.current) {
            navigationRef.current.navigate('Pets', { screen: 'QuickPet' });
          }
        }}
        onNavigateToClaimPet={() => {
          if (navigationRef?.current) {
            navigationRef.current.navigate('Pets', { screen: 'ClaimPet' });
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
