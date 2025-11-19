import React, { createContext, useState, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authAPI } from '../services/api';
import { STORAGE_KEYS } from '../utils/config';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null); // 'user' or 'vet'
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Load stored auth data on mount
  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const token = await SecureStore.getItemAsync(STORAGE_KEYS.TOKEN);
      const userData = await SecureStore.getItemAsync(STORAGE_KEYS.USER_DATA);
      const storedUserType = await SecureStore.getItemAsync(STORAGE_KEYS.USER_TYPE);

      if (token && userData) {
        setUser(JSON.parse(userData));
        setUserType(storedUserType);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveAuthData = async (token, userData, type) => {
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.TOKEN, token);
      await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
      await SecureStore.setItemAsync(STORAGE_KEYS.USER_TYPE, type);
      setUser(userData);
      setUserType(type);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Error saving auth data:', error);
      throw error;
    }
  };

  const clearAuthData = async () => {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.TOKEN);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_TYPE);
      setUser(null);
      setUserType(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await authAPI.login({ email, password });
      const { token, user: userData, vet: vetData } = response.data;

      // Determinar el tipo basándose en qué datos devolvió el backend
      const accountType = userData ? 'user' : 'vet';
      const accountData = userData || vetData;

      await saveAuthData(token, accountData, accountType);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed',
      };
    }
  };

  const loginUser = async (email, password) => {
    try {
      const response = await authAPI.loginUser({ email, password });
      const { token, user: userData } = response.data;
      await saveAuthData(token, userData, 'user');
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed',
      };
    }
  };

  const registerUser = async (nombre, email, password) => {
    try {
      const response = await authAPI.registerUser({ nombre, email, password });
      const { token, user: userData } = response.data;
      await saveAuthData(token, userData, 'user');
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Registration failed',
      };
    }
  };

  const loginVet = async (email, password) => {
    try {
      const response = await authAPI.loginVet({ email, password });
      const { token, vet: vetData } = response.data;
      await saveAuthData(token, vetData, 'vet');
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed',
      };
    }
  };

  const registerVet = async (nombre, email, password, cedulaProfesional, telefono) => {
    try {
      const response = await authAPI.registerVet({
        nombre,
        email,
        password,
        cedulaProfesional,
        telefono,
      });
      const { token, vet: vetData } = response.data;
      await saveAuthData(token, vetData, 'vet');
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Registration failed',
      };
    }
  };

  const loginWithGoogle = async (accessToken) => {
    try {
      const response = await authAPI.googleLogin({ accessToken });
      const { token, user: userData } = response.data;
      await saveAuthData(token, userData, 'user');
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Google login failed',
      };
    }
  };

  const logout = async () => {
    await clearAuthData();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userType,
        isAuthenticated,
        loading,
        login,
        loginUser,
        registerUser,
        loginVet,
        registerVet,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
