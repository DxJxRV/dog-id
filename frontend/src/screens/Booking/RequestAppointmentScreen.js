import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import CalendarStrip from 'react-native-calendar-strip';
import { Button, Input, Loading } from '../../components';
import { appointmentAPI, petsAPI, searchAPI, userAPI } from '../../services/api';
import { getImageUrl } from '../../utils/imageHelper';
import { format } from 'date-fns';
import 'moment/locale/es';

const RequestAppointmentScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { vetId: initialVetId, clinicId, vetName: initialVetName, petId, reason: initialReason, fromVaccination } = route.params || {};

  const [myPets, setMyPets] = useState([]);
  const [selectedPet, setSelectedPet] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [reason, setReason] = useState(initialReason || '');
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);

  // Veterinario seleccionado
  const [selectedVet, setSelectedVet] = useState(
    initialVetId ? { id: initialVetId, nombre: initialVetName } : null
  );

  // Modal de selección de veterinario
  const [showVetModal, setShowVetModal] = useState(false);
  const [petVets, setPetVets] = useState([]);
  const [myVets, setMyVets] = useState([]); // Veterinarios generales
  const [favoriteVets, setFavoriteVets] = useState([]);
  const [myClinics, setMyClinics] = useState([]); // Clínicas
  const [nearbyClinics, setNearbyClinics] = useState([]); // Top 5 clínicas cercanas
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [vetsLoading, setVetsLoading] = useState(false);

  // 1. Fetch User's Pets
  useEffect(() => {
    const fetchPets = async () => {
      try {
        const response = await petsAPI.getAll();
        setMyPets(response.data.pets);

        // Si viene petId en los params, pre-seleccionar esa mascota
        if (petId && response.data.pets.length > 0) {
          const preSelectedPet = response.data.pets.find((pet) => pet.id === petId);
          setSelectedPet(preSelectedPet || response.data.pets[0]);
        } else if (response.data.pets.length > 0) {
          setSelectedPet(response.data.pets[0]);
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchPets();
  }, [petId]);

  // 2. Fetch veterinarios cuando se selecciona una mascota
  useEffect(() => {
    if (selectedPet && !initialVetId) {
      fetchPetVets();
    }
  }, [selectedPet]);

  const fetchPetVets = async () => {
    if (!selectedPet) return;

    setVetsLoading(true);
    try {
      // Obtener veterinarios que han atendido a esta mascota
      const petResponse = await petsAPI.getById(selectedPet.id);
      const pet = petResponse.data.pet;

      // Extraer veterinarios únicos de appointments
      const uniqueVets = {};
      pet.appointments?.forEach((apt) => {
        if (apt.vet && apt.vet.id) {
          uniqueVets[apt.vet.id] = {
            id: apt.vet.id,
            nombre: apt.vet.nombre,
            telefono: apt.vet.telefono,
            fotoUrl: apt.vet.fotoUrl,
            type: 'VET',
          };
        }
      });

      const petVetsList = Object.values(uniqueVets);
      setPetVets(petVetsList);

      // Obtener veterinarios generales, favoritos y clínicas
      const bookingResponse = await userAPI.getBookingHome();

      const generalVets = bookingResponse.data.myVets || [];
      const favorites = bookingResponse.data.favorites || [];
      const clinics = bookingResponse.data.myClinics || [];

      setMyVets(generalVets);
      setFavoriteVets(favorites);
      setMyClinics(clinics);

      // Obtener clínicas destacadas (top 5)
      const discoveryResponse = await searchAPI.getDiscovery();
      const featuredClinics = discoveryResponse.data.featuredClinics || [];
      setNearbyClinics(featuredClinics);

      // Pre-seleccionar el primero disponible si no hay vet seleccionado
      if (!selectedVet) {
        const firstAvailable = petVetsList[0] || generalVets[0] || favorites[0];
        if (firstAvailable) {
          // Normalizar el objeto
          setSelectedVet({
            id: firstAvailable.id,
            nombre: firstAvailable.nombre || firstAvailable.name,
            telefono: firstAvailable.telefono,
            fotoUrl: firstAvailable.fotoUrl || firstAvailable.image,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching pet vets:', error);
    } finally {
      setVetsLoading(false);
    }
  };

  // 3. Búsqueda de veterinarios con debounce
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      // Mostrar loading inmediatamente cuando el usuario empieza a escribir
      setSearching(true);

      // Debounce: esperar 500ms después de que el usuario deja de escribir
      const timer = setTimeout(() => {
        handleSearch();
      }, 500);

      // Limpiar el timeout si el usuario sigue escribiendo
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
      setSearching(false);
    }
  }, [searchQuery]);

  const handleSearch = async () => {
    setSearching(true);
    try {
      const response = await searchAPI.globalSearch(searchQuery);
      console.log('Search response:', response.data);

      // Filtrar veterinarios y clínicas de los resultados
      const allResults = response.data.results || [];
      const vetsAndClinics = allResults.filter(result =>
        result.type === 'VET' || result.type === 'CLINIC'
      );

      console.log('All results:', allResults);
      console.log('Filtered vets and clinics:', vetsAndClinics);

      setSearchResults(vetsAndClinics);
    } catch (error) {
      console.error('Error searching:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // 4. Fetch Slots when Date changes
  useEffect(() => {
    const fetchSlots = async () => {
      if (!selectedVet?.id) return;

      setSlotsLoading(true);
      setSelectedSlot(null);
      try {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const response = await appointmentAPI.getSlots(selectedVet.id, dateStr);
        setAvailableSlots(response.data.slots);
      } catch (error) {
        console.error(error);
      } finally {
        setSlotsLoading(false);
      }
    };
    fetchSlots();
  }, [selectedDate, selectedVet]);

  const handleVetSelect = (vet) => {
    setSelectedVet(vet);
    setShowVetModal(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRequest = async () => {
    if (!selectedPet || !reason) {
      Alert.alert('Error', 'Completa todos los campos');
      return;
    }

    if (!selectedVet) {
      Alert.alert('Error', 'Selecciona un veterinario');
      return;
    }

    if (selectedVet.id && !selectedSlot) {
      Alert.alert('Error', 'Selecciona un horario');
      return;
    }

    setLoading(true);
    try {
      let startDateTime;
      if (selectedSlot) {
        const [hours, minutes] = selectedSlot.split(':');
        startDateTime = new Date(selectedDate);
        startDateTime.setHours(parseInt(hours), parseInt(minutes), 0);
      } else {
        startDateTime = new Date(selectedDate);
        startDateTime.setHours(12, 0, 0);
      }

      await appointmentAPI.request({
        clinicId,
        vetId: selectedVet.id,
        petId: selectedPet.id,
        startDateTime: startDateTime.toISOString(),
        reason,
      });

      Alert.alert('Solicitud Enviada', 'El especialista confirmará tu cita pronto.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo enviar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  // Render Veterinario Card en Modal
  const renderVetCard = (vet, showBadge = false) => {
    // Normalizar nombres de campos de diferentes fuentes
    const vetName = vet.nombre || vet.name || vet.title;
    const vetImage = vet.fotoUrl || vet.image;
    const vetPhone = vet.telefono;
    const vetSubtitle = vet.subtitle;

    console.log('Rendering vet card:', { id: vet.id, vetName, vetImage, vetPhone, vetSubtitle });

    return (
      <TouchableOpacity
        key={vet.id}
        style={styles.vetCard}
        onPress={() => handleVetSelect({
          ...vet,
          nombre: vetName,
          fotoUrl: vetImage,
          telefono: vetPhone
        })}
      >
        {vetImage ? (
          <Image
            source={{ uri: getImageUrl(vetImage) }}
            style={styles.vetAvatar}
          />
        ) : (
          <View style={[styles.vetAvatar, styles.vetAvatarPlaceholder]}>
            <Ionicons name="person" size={24} color="#FFF" />
          </View>
        )}
        <View style={styles.vetInfo}>
          <Text style={styles.vetName}>{vetName}</Text>
          {vetPhone && (
            <Text style={styles.vetPhone}>{vetPhone}</Text>
          )}
          {!vetPhone && vetSubtitle && (
            <Text style={styles.vetPhone}>{vetSubtitle}</Text>
          )}
          {showBadge && (
            <View style={styles.vetBadge}>
              <Ionicons name="heart" size={10} color="#FF3B30" />
              <Text style={styles.vetBadgeText}>Favorito</Text>
            </View>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.headerTitle}>Solicitar Cita</Text>
        {fromVaccination && (
          <View style={styles.vaccineBanner}>
            <Ionicons name="shield-checkmark" size={20} color="#007AFF" />
            <Text style={styles.vaccineBannerText}>Agendando vacuna</Text>
          </View>
        )}

        {/* Paso 1: Mascota */}
        <Text style={styles.label}>1. Selecciona Paciente</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.petsList}
        >
          {myPets.map((pet) => (
            <TouchableOpacity
              key={pet.id}
              style={[
                styles.petChip,
                selectedPet?.id === pet.id && styles.petChipSelected,
              ]}
              onPress={() => setSelectedPet(pet)}
            >
              <Ionicons
                name="paw"
                size={16}
                color={selectedPet?.id === pet.id ? '#FFF' : '#666'}
              />
              <Text
                style={[
                  styles.petText,
                  selectedPet?.id === pet.id && styles.petTextSelected,
                ]}
              >
                {pet.nombre}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Paso 2: Veterinario */}
        <Text style={styles.label}>2. Selecciona Veterinario</Text>
        <TouchableOpacity
          style={styles.vetSelector}
          onPress={() => setShowVetModal(true)}
        >
          {selectedVet ? (
            <>
              <View style={styles.vetSelectorContent}>
                <Ionicons name="person-circle" size={24} color="#007AFF" />
                <View style={styles.vetSelectorText}>
                  <Text style={styles.vetSelectorName}>
                    {selectedVet.nombre}
                  </Text>
                  {selectedVet.telefono && (
                    <Text style={styles.vetSelectorPhone}>
                      {selectedVet.telefono}
                    </Text>
                  )}
                </View>
              </View>
              <Ionicons name="chevron-down" size={20} color="#C7C7CC" />
            </>
          ) : (
            <>
              <Text style={styles.vetSelectorPlaceholder}>
                Buscar veterinario...
              </Text>
              <Ionicons name="search" size={20} color="#C7C7CC" />
            </>
          )}
        </TouchableOpacity>

        {/* Paso 3: Fecha */}
        <Text style={styles.label}>3. Elige el Día</Text>
        <View style={styles.calendarContainer}>
          <CalendarStrip
            style={{ height: 100, paddingTop: 10, paddingBottom: 10 }}
            calendarColor={'white'}
          calendarHeaderStyle={{ color: '#333', fontSize: 16 }}
          dateNumberStyle={{ color: '#000', fontSize: 14 }}
          dateNameStyle={{ color: '#666', fontSize: 12 }}
          highlightDateNumberStyle={{
            color: '#FFF',
            backgroundColor: '#007AFF',
            borderRadius: 15,
            overflow: 'hidden',
            width: 30,
            height: 30,
            lineHeight: 30,
            textAlign: 'center',
          }}
          highlightDateNameStyle={{ color: '#007AFF', fontWeight: 'bold' }}
          disabledDateNameStyle={{ color: '#D3D3D3' }}
          disabledDateNumberStyle={{ color: '#D3D3D3' }}
          locale={{
            name: 'es',
            config: {
              months:
                'Enero_Febrero_Marzo_Abril_Mayo_Junio_Julio_Agosto_Septiembre_Octubre_Noviembre_Diciembre'.split(
                  '_'
                ),
              monthsShort: 'Ene_Feb_Mar_Abr_May_Jun_Jul_Ago_Sep_Oct_Nov_Dic'.split('_'),
              weekdays:
                'Domingo_Lunes_Martes_Miércoles_Jueves_Viernes_Sábado'.split('_'),
              weekdaysShort: 'Dom_Lun_Mar_Mié_Jue_Vie_Sáb'.split('_'),
              weekdaysMin: 'Do_Lu_Ma_Mi_Ju_Vi_Sá'.split('_'),
            },
          }}
          selectedDate={selectedDate}
          onDateSelected={(date) => setSelectedDate(date.toDate())}
          minDate={new Date()}
          />
        </View>

        {/* Paso 4: Hora */}
        {selectedVet?.id && (
          <>
            <Text style={styles.label}>4. Horarios Disponibles</Text>
            {slotsLoading ? (
              <ActivityIndicator size="large" color="#007AFF" style={{ marginVertical: 20 }} />
            ) : availableSlots.length > 0 ? (
              <View style={styles.slotsGrid}>
                {availableSlots.map((slot) => (
                  <TouchableOpacity
                    key={slot}
                    style={[
                      styles.slot,
                      selectedSlot === slot && styles.slotSelected,
                    ]}
                    onPress={() => setSelectedSlot(slot)}
                  >
                    <Text
                      style={[
                        styles.slotText,
                        selectedSlot === slot && styles.slotTextSelected,
                      ]}
                    >
                      {slot}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={styles.noSlots}>
                No hay horarios disponibles para este día.
              </Text>
            )}
          </>
        )}

        {/* Paso 5: Motivo */}
        <Text style={styles.label}>
          {selectedVet?.id ? '5' : '4'}. Motivo de consulta
        </Text>
        <View style={{ paddingHorizontal: 20 }}>
          <Input
            placeholder="Ej. Vacunación, Revisión..."
            value={reason}
            onChangeText={setReason}
            style={{ marginBottom: 30 }}
          />
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          <Button title="Enviar Solicitud" onPress={handleRequest} loading={loading} />
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal de Selección de Veterinario */}
      <Modal
        visible={showVetModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowVetModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowVetModal(false)}
          />

          <View style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar Veterinario o Clínica</Text>
              <TouchableOpacity onPress={() => setShowVetModal(false)}>
                <Ionicons name="close" size={28} color="#000" />
              </TouchableOpacity>
            </View>

            {/* Buscador */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#8E8E93" />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar veterinario o clínica..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#C7C7CC"
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
                blurOnSubmit={true}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color="#C7C7CC" />
                </TouchableOpacity>
              )}
            </View>

            {/* Contenido con FlatList en lugar de ScrollView */}
            <View style={{ flex: 1, paddingHorizontal: 20, paddingBottom: 20 }}>
              {searchQuery.trim().length === 0 ? (
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 20 }}
                >
                  {vetsLoading ? (
                    <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 40 }} />
                  ) : (
                    <>
                      {/* Veterinarios de la mascota */}
                      {petVets.length > 0 && (
                        <View style={{ marginBottom: 24 }}>
                          <Text style={styles.vetSectionTitle}>
                            Veterinarios de {selectedPet?.nombre}
                          </Text>
                          <FlatList
                            data={petVets}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item: vet }) => (
                              <TouchableOpacity
                                style={styles.carouselCard}
                                onPress={() => handleVetSelect({
                                  ...vet,
                                  nombre: vet.nombre || vet.name || vet.title,
                                  fotoUrl: vet.fotoUrl || vet.image,
                                })}
                              >
                                {vet.fotoUrl ? (
                                  <Image
                                    source={{ uri: getImageUrl(vet.fotoUrl) }}
                                    style={styles.carouselAvatar}
                                  />
                                ) : (
                                  <View style={[styles.carouselAvatar, styles.carouselAvatarPlaceholder]}>
                                    <Ionicons name="person" size={32} color="#FFF" />
                                  </View>
                                )}
                                <Text style={styles.carouselName} numberOfLines={2}>
                                  {vet.nombre}
                                </Text>
                                {vet.telefono && (
                                  <Text style={styles.carouselPhone} numberOfLines={1}>
                                    {vet.telefono}
                                  </Text>
                                )}
                              </TouchableOpacity>
                            )}
                            contentContainerStyle={{ paddingRight: 20 }}
                          />
                        </View>
                      )}

                      {/* Veterinarios favoritos */}
                      {favoriteVets.length > 0 && (
                        <View style={{ marginBottom: 24 }}>
                          <Text style={styles.vetSectionTitle}>Favoritos</Text>
                          <FlatList
                            data={favoriteVets}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            keyExtractor={(item) => `fav-${item.id}`}
                            renderItem={({ item: vet }) => {
                              const vetName = vet.nombre || vet.name || vet.title;
                              const vetImage = vet.fotoUrl || vet.image;
                              const vetPhone = vet.telefono || vet.subtitle;
                              return (
                                <TouchableOpacity
                                  style={styles.carouselCard}
                                  onPress={() => handleVetSelect({
                                    ...vet,
                                    nombre: vetName,
                                    fotoUrl: vetImage,
                                    telefono: vetPhone,
                                  })}
                                >
                                  {vetImage ? (
                                    <Image
                                      source={{ uri: getImageUrl(vetImage) }}
                                      style={styles.carouselAvatar}
                                    />
                                  ) : (
                                    <View style={[styles.carouselAvatar, styles.carouselAvatarPlaceholder]}>
                                      <Ionicons name="person" size={32} color="#FFF" />
                                    </View>
                                  )}
                                  <View style={styles.carouselBadge}>
                                    <Ionicons name="heart" size={10} color="#FF3B30" />
                                    <Text style={styles.carouselBadgeText}>Favorito</Text>
                                  </View>
                                  <Text style={styles.carouselName} numberOfLines={2}>
                                    {vetName || 'SIN NOMBRE'}
                                  </Text>
                                  {vetPhone && (
                                    <Text style={styles.carouselPhone} numberOfLines={1}>
                                      {vetPhone}
                                    </Text>
                                  )}
                                </TouchableOpacity>
                              );
                            }}
                            contentContainerStyle={{ paddingRight: 20 }}
                          />
                        </View>
                      )}

                      {/* Mis veterinarios (generales) */}
                      {myVets.length > 0 && (
                        <View style={{ marginBottom: 24 }}>
                          <Text style={styles.vetSectionTitle}>Mis Veterinarios</Text>
                          <FlatList
                            data={myVets}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            keyExtractor={(item) => `my-${item.id}`}
                            renderItem={({ item: vet }) => {
                              const vetName = vet.nombre || vet.name || vet.title;
                              const vetPhone = vet.telefono || vet.clinic;
                              const vetImage = vet.fotoUrl || vet.image;
                              return (
                                <TouchableOpacity
                                  style={styles.carouselCard}
                                  onPress={() => handleVetSelect({
                                    ...vet,
                                    nombre: vetName,
                                    fotoUrl: vetImage,
                                    telefono: vetPhone,
                                  })}
                                >
                                  {vetImage ? (
                                    <Image
                                      source={{ uri: getImageUrl(vetImage) }}
                                      style={styles.carouselAvatar}
                                    />
                                  ) : (
                                    <View style={[styles.carouselAvatar, styles.carouselAvatarPlaceholder]}>
                                      <Ionicons name="person" size={32} color="#FFF" />
                                    </View>
                                  )}
                                  <Text style={styles.carouselName} numberOfLines={2}>
                                    {vetName || 'SIN NOMBRE'}
                                  </Text>
                                  {vetPhone && (
                                    <Text style={styles.carouselPhone} numberOfLines={1}>
                                      {vetPhone}
                                    </Text>
                                  )}
                                </TouchableOpacity>
                              );
                            }}
                            contentContainerStyle={{ paddingRight: 20 }}
                          />
                        </View>
                      )}

                      {/* Clínicas */}
                      {myClinics.length > 0 && (
                        <View style={{ marginBottom: 24 }}>
                          <Text style={styles.vetSectionTitle}>Mis Clínicas</Text>
                          <FlatList
                            data={myClinics}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            keyExtractor={(item) => `clinic-${item.id}`}
                            renderItem={({ item: clinic }) => {
                              const clinicName = clinic.nombre || clinic.name || clinic.title;
                              const clinicAddress = clinic.direccion || clinic.address || clinic.subtitle;
                              const clinicImage = clinic.fotoUrl || clinic.image;
                              return (
                                <TouchableOpacity
                                  style={styles.carouselCard}
                                  onPress={() => handleVetSelect({
                                    ...clinic,
                                    nombre: clinicName,
                                    fotoUrl: clinicImage,
                                    telefono: clinicAddress,
                                  })}
                                >
                                  {clinicImage ? (
                                    <Image
                                      source={{ uri: getImageUrl(clinicImage) }}
                                      style={styles.carouselAvatar}
                                    />
                                  ) : (
                                    <View style={[styles.carouselAvatar, styles.carouselAvatarPlaceholder, { backgroundColor: '#34C759' }]}>
                                      <Ionicons name="business" size={32} color="#FFF" />
                                    </View>
                                  )}
                                  <Text style={styles.carouselName} numberOfLines={2}>
                                    {clinicName || 'SIN NOMBRE'}
                                  </Text>
                                  {clinicAddress && (
                                    <Text style={styles.carouselPhone} numberOfLines={1}>
                                      {clinicAddress}
                                    </Text>
                                  )}
                                </TouchableOpacity>
                              );
                            }}
                            contentContainerStyle={{ paddingRight: 20 }}
                          />
                        </View>
                      )}

                      {/* Clínicas Destacadas */}
                      {nearbyClinics.length > 0 && (
                        <View style={{ marginBottom: 24 }}>
                          <Text style={styles.vetSectionTitle}>Clínicas Destacadas</Text>
                          <FlatList
                            data={nearbyClinics}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            keyExtractor={(item) => `nearby-${item.id}`}
                            renderItem={({ item: clinic }) => {
                              const clinicName = clinic.nombre || clinic.name || clinic.title;
                              const clinicAddress = clinic.direccion || clinic.address || clinic.subtitle;
                              const clinicImage = clinic.fotoUrl || clinic.image;
                              return (
                                <TouchableOpacity
                                  style={styles.carouselCard}
                                  onPress={() => handleVetSelect({
                                    ...clinic,
                                    nombre: clinicName,
                                    fotoUrl: clinicImage,
                                    telefono: clinicAddress,
                                  })}
                                >
                                  {clinicImage ? (
                                    <Image
                                      source={{ uri: getImageUrl(clinicImage) }}
                                      style={styles.carouselAvatar}
                                    />
                                  ) : (
                                    <View style={[styles.carouselAvatar, styles.carouselAvatarPlaceholder, { backgroundColor: '#FF9500' }]}>
                                      <Ionicons name="star" size={32} color="#FFF" />
                                    </View>
                                  )}
                                  <Text style={styles.carouselName} numberOfLines={2}>
                                    {clinicName || 'SIN NOMBRE'}
                                  </Text>
                                  {clinicAddress && (
                                    <Text style={styles.carouselPhone} numberOfLines={1}>
                                      {clinicAddress}
                                    </Text>
                                  )}
                                </TouchableOpacity>
                              );
                            }}
                            contentContainerStyle={{ paddingRight: 20 }}
                          />
                        </View>
                      )}

                      {petVets.length === 0 && favoriteVets.length === 0 && myVets.length === 0 && myClinics.length === 0 && nearbyClinics.length === 0 && (
                        <View style={styles.emptyState}>
                          <Ionicons name="search-outline" size={64} color="#C7C7CC" />
                          <Text style={styles.emptyStateText}>
                            Busca veterinarios o clínicas escribiendo arriba
                          </Text>
                        </View>
                      )}
                    </>
                  )}
                </ScrollView>
              ) : (
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 20 }}
                >
                  {searching ? (
                    <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 40 }} />
                  ) : searchResults.length > 0 ? (
                    <View style={{ marginBottom: 24 }}>
                      <Text style={styles.vetSectionTitle}>Resultados</Text>
                      {searchResults.map((item) => {
                        const isClinic = item.type === 'CLINIC';
                        const itemName = item.nombre || item.name || item.title;
                        const itemImage = item.fotoUrl || item.image;
                        const itemSubtitle = item.subtitle || item.direccion || item.address;

                        return (
                          <TouchableOpacity
                            key={`search-${item.id}`}
                            style={styles.vetCard}
                            onPress={() => handleVetSelect({
                              ...item,
                              nombre: itemName,
                              fotoUrl: itemImage,
                              telefono: itemSubtitle,
                            })}
                          >
                            {itemImage ? (
                              <Image
                                source={{ uri: getImageUrl(itemImage) }}
                                style={styles.vetAvatar}
                              />
                            ) : (
                              <View style={[
                                styles.vetAvatar,
                                styles.vetAvatarPlaceholder,
                                isClinic && { backgroundColor: '#34C759' }
                              ]}>
                                <Ionicons
                                  name={isClinic ? 'business' : 'person'}
                                  size={24}
                                  color="#FFF"
                                />
                              </View>
                            )}
                            <View style={styles.vetInfo}>
                              <Text style={styles.vetName}>{itemName}</Text>
                              {itemSubtitle && (
                                <Text style={styles.vetPhone}>{itemSubtitle}</Text>
                              )}
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : (
                    <View style={styles.emptyState}>
                      <Ionicons name="sad-outline" size={64} color="#C7C7CC" />
                      <Text style={styles.emptyStateText}>
                        No se encontraron veterinarios ni clínicas
                      </Text>
                    </View>
                  )}
                </ScrollView>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  vaccineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F4FD',
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 8,
    gap: 8,
  },
  vaccineBannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 10,
    color: '#444',
    paddingHorizontal: 20,
  },
  petsList: { flexDirection: 'row', marginBottom: 10, height: 50, paddingHorizontal: 20 },
  petChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    marginRight: 10,
    height: 40,
  },
  petChipSelected: { backgroundColor: '#007AFF' },
  petText: { marginLeft: 6, color: '#333' },
  petTextSelected: { color: '#FFF', fontWeight: '600' },
  calendarContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#FFF',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  vetSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9F9F9',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  vetSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  vetSelectorText: {
    flex: 1,
  },
  vetSelectorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  vetSelectorPhone: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  vetSelectorPlaceholder: {
    fontSize: 16,
    color: '#C7C7CC',
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 20,
  },
  slot: {
    width: '22%',
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#F9F9F9',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEE',
  },
  slotSelected: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  slotText: { fontSize: 14, color: '#333' },
  slotTextSelected: { color: '#FFF', fontWeight: '600' },
  noSlots: { textAlign: 'center', color: '#999', paddingHorizontal: 20 },
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    margin: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  vetSection: {
    marginBottom: 24,
  },
  vetSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  vetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  vetAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  vetAvatarPlaceholder: {
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vetInfo: {
    flex: 1,
  },
  vetName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  vetPhone: {
    fontSize: 13,
    color: '#8E8E93',
  },
  vetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  vetBadgeText: {
    fontSize: 11,
    color: '#FF3B30',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 16,
    textAlign: 'center',
  },
  // Carousel styles
  carouselCard: {
    width: 120,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  carouselAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 8,
  },
  carouselAvatarPlaceholder: {
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  carouselName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
    marginBottom: 4,
  },
  carouselPhone: {
    fontSize: 11,
    color: '#8E8E93',
    textAlign: 'center',
  },
  carouselBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  carouselBadgeText: {
    fontSize: 9,
    color: '#FF3B30',
    fontWeight: '600',
  },
});

export default RequestAppointmentScreen;
