import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getImageUrl } from '../utils/imageHelper';

const ClinicSwitcherModal = ({ visible, onClose, clinics, currentClinic, onSelect }) => {
  const renderItem = ({ item }) => {
    const isSelected = currentClinic?.id === item.id;
    return (
      <TouchableOpacity 
        style={[styles.clinicItem, isSelected && styles.clinicItemSelected]} 
        onPress={() => onSelect(item)}
      >
        <View style={styles.logoContainer}>
            {item.logoUrl ? (
                <Image source={{ uri: getImageUrl(item.logoUrl) }} style={styles.logo} />
            ) : (
                <View style={styles.placeholderLogo}>
                    <Text style={styles.placeholderText}>{item.name.charAt(0)}</Text>
                </View>
            )}
        </View>
        <View style={styles.info}>
            <Text style={[styles.name, isSelected && styles.nameSelected]}>{item.name}</Text>
            <Text style={styles.role}>{item.myRole === 'OWNER' ? 'Director' : 'Veterinario'}</Text>
        </View>
        {isSelected && <Ionicons name="checkmark-circle" size={24} color="#007AFF" />}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.title}>Cambiar de Clínica</Text>
            
            <FlatList
                data={clinics}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
            />
            
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeText}>Cancelar</Text>
            </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingVertical: 20,
    maxHeight: '70%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    alignSelf: 'center',
    borderRadius: 2,
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  list: {
    paddingHorizontal: 20,
  },
  clinicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  clinicItemSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  logoContainer: {
    marginRight: 15,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  placeholderLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  nameSelected: {
    color: '#007AFF',
  },
  role: {
    fontSize: 12,
    color: '#888',
  },
  closeButton: {
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  closeText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
});

export default ClinicSwitcherModal;
