import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SearchableSelect = ({
  visible,
  onClose,
  onSelect,
  options,
  filterFunction,
  placeholder = 'Buscar...',
  title = 'Seleccionar',
  allowCustom = true,
  customText = 'Usar',
}) => {
  const [searchText, setSearchText] = useState('');
  const [filteredOptions, setFilteredOptions] = useState(options);

  useEffect(() => {
    if (searchText.trim() === '') {
      setFilteredOptions(options);
    } else {
      const filtered = filterFunction
        ? filterFunction(searchText)
        : options.filter(opt =>
            opt.toLowerCase().includes(searchText.toLowerCase())
          );
      setFilteredOptions(filtered);
    }
  }, [searchText, options, filterFunction]);

  const handleSelect = (item) => {
    onSelect(item);
    setSearchText('');
    onClose();
  };

  const handleCustomSelect = () => {
    if (searchText.trim()) {
      onSelect(searchText.trim());
      setSearchText('');
      onClose();
    }
  };

  const handleClose = () => {
    setSearchText('');
    onClose();
  };

  const showCustomOption =
    allowCustom &&
    searchText.trim() !== '' &&
    !filteredOptions.some(
      opt => opt.toLowerCase() === searchText.toLowerCase()
    );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={placeholder}
              value={searchText}
              onChangeText={setSearchText}
              autoFocus
            />
          </View>

          <FlatList
            data={filteredOptions}
            keyExtractor={(item, index) => index.toString()}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.option}
                onPress={() => handleSelect(item)}
              >
                <Text style={styles.optionText}>{item}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {searchText.trim() === ''
                    ? 'Escribe para buscar'
                    : 'No se encontraron resultados'}
                </Text>
              </View>
            }
            ListFooterComponent={
              showCustomOption ? (
                <TouchableOpacity
                  style={styles.customOption}
                  onPress={handleCustomSelect}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#007AFF" />
                  <Text style={styles.customOptionText}>
                    {customText}: "{searchText}"
                  </Text>
                </TouchableOpacity>
              ) : null
            }
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
  },
  option: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  optionText: {
    fontSize: 16,
    color: '#000',
  },
  customOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F0F8FF',
    borderTopWidth: 2,
    borderTopColor: '#007AFF',
    gap: 8,
  },
  customOptionText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

export default SearchableSelect;
