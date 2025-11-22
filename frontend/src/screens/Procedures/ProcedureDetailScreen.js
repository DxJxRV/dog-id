import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loading, ErrorNetwork } from '../../components';
import { petsAPI } from '../../services/api';
import { getImageUrl } from '../../utils/imageHelper';
import { isNetworkError } from '../../utils/networkUtils';
import { showToast } from '../../utils/toast';
import { generatePresignedUrl } from '../../utils/presignedUrl';

const ProcedureDetailScreen = ({ route, navigation }) => {
  const { procedureId, petId } = route.params;
  const [procedure, setProcedure] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProcedureDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await petsAPI.getById(petId);
      const foundProcedure = response.data.pet.procedures.find(p => p.id === procedureId);
      if (foundProcedure) {
        // Generar presigned URLs para evidencia y PDF de consentimiento
        const evidenciaUrl = foundProcedure.evidenciaUrl
          ? await generatePresignedUrl(foundProcedure.evidenciaUrl)
          : null;

        let consentRecord = foundProcedure.consentRecord;
        if (consentRecord && consentRecord.pdfUrl) {
          const consentPdfUrl = await generatePresignedUrl(consentRecord.pdfUrl, 3600);
          consentRecord = {
            ...consentRecord,
            pdfUrl: consentPdfUrl
          };
        }

        setProcedure({
          ...foundProcedure,
          evidenciaUrl,
          consentRecord
        });
      } else {
        showToast.error('Procedimiento no encontrado');
        navigation.goBack();
      }
    } catch (err) {
      if (isNetworkError(err)) {
        setError(err);
      } else {
        showToast.error('No se pudo cargar el detalle del procedimiento');
        navigation.goBack();
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcedureDetail();
  }, [procedureId]);

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return <ErrorNetwork onRetry={fetchProcedureDetail} />;
  }

  if (!procedure) {
    return null;
  }

  const formatProcedureType = (tipo) => {
    return tipo.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header con ícono */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="fitness" size={32} color="#fff" />
        </View>
        <Text style={styles.title}>{formatProcedureType(procedure.tipo)}</Text>
      </View>

      {/* Imagen de evidencia */}
      {procedure.evidenciaUrl && (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: getImageUrl(procedure.evidenciaUrl) }}
            style={styles.image}
            resizeMode="cover"
          />
        </View>
      )}

      {/* Información */}
      <View style={styles.section}>
        <InfoRow
          icon="calendar"
          label="Fecha"
          value={format(new Date(procedure.fecha), 'd MMMM, yyyy', { locale: es })}
        />

        {procedure.vet && (
          <InfoRow
            icon="medkit"
            label="Realizado por"
            value={`Dr. ${procedure.vet.nombre}`}
            badge="veterinario"
          />
        )}

        {!procedure.vet && (
          <InfoRow
            icon="person"
            label="Registrado por"
            value="Dueño"
            badge="dueño"
          />
        )}

        {procedure.vet?.cedulaProfesional && (
          <InfoRow
            icon="card-outline"
            label="Cédula profesional"
            value={procedure.vet.cedulaProfesional}
          />
        )}

        {procedure.vet?.telefono && (
          <InfoRow
            icon="call-outline"
            label="Teléfono"
            value={procedure.vet.telefono}
          />
        )}
      </View>

      {/* Descripción */}
      {procedure.descripcion && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Descripción</Text>
          <View style={styles.descriptionBox}>
            <Text style={styles.descriptionText}>{procedure.descripcion}</Text>
          </View>
        </View>
      )}

      {/* Consentimiento Informado */}
      {procedure.consentRecord && procedure.consentRecord.pdfUrl && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Documentación Legal</Text>
          <TouchableOpacity
            style={styles.pdfButton}
            onPress={() => navigation.navigate('PdfViewer', {
              url: procedure.consentRecord.pdfUrl,
              title: 'Consentimiento Informado',
            })}
            activeOpacity={0.7}
          >
            <View style={styles.pdfButtonIcon}>
              <Ionicons name="document-text" size={24} color="#007AFF" />
            </View>
            <View style={styles.pdfButtonContent}>
              <Text style={styles.pdfButtonTitle}>Consentimiento Informado</Text>
              <Text style={styles.pdfButtonSubtitle}>Ver documento firmado</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const InfoRow = ({ icon, label, value, badge }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoIconContainer}>
      <Ionicons name={icon} size={20} color="#007AFF" />
    </View>
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <View style={styles.infoValueContainer}>
        <Text style={styles.infoValue}>{value}</Text>
        {badge === 'veterinario' && (
          <View style={styles.vetBadge}>
            <Text style={styles.vetBadgeText}>Veterinario</Text>
          </View>
        )}
        {badge === 'dueño' && (
          <View style={styles.ownerBadge}>
            <Text style={styles.ownerBadgeText}>Dueño</Text>
          </View>
        )}
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    backgroundColor: '#FF9500',
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 32,
    paddingHorizontal: 16,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  imageContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 8,
  },
  image: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 8,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F4FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 2,
  },
  infoValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
  },
  vetBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  vetBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#007AFF',
  },
  ownerBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  ownerBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#34C759',
  },
  descriptionBox: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
  },
  descriptionText: {
    fontSize: 15,
    color: '#000',
    lineHeight: 22,
  },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#F9F9F9',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  pdfButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F4FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  pdfButtonContent: {
    flex: 1,
  },
  pdfButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  pdfButtonSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
  },
});

export default ProcedureDetailScreen;
