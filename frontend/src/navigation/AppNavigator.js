import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { Loading } from '../components';

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

// Profile Screen
import ProfileScreen from '../screens/Profile/ProfileScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

const PetsStack = () => (
  <Stack.Navigator>
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
  </Stack.Navigator>
);

const MainTabs = () => (
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
      name="Profile"
      component={ProfileScreen}
      options={{
        tabBarLabel: 'Perfil',
        headerShown: true,
        headerTitle: 'Mi Perfil',
        tabBarIcon: ({ focused, color, size }) => (
          <Ionicons
            name={focused ? 'person' : 'person-outline'}
            size={size}
            color={color}
          />
        ),
      }}
    />
  </Tab.Navigator>
);

const AppNavigator = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <Loading />;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
};

export default AppNavigator;
