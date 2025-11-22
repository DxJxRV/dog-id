import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';

/**
 * Gráfica de evolución de peso de la mascota
 * @param {Array} data - Array de objetos con formato: [{ fecha: Date, peso: number }]
 * @param {string} unit - Unidad de peso (por defecto 'kg')
 */
const WeightChart = ({ data = [], unit = 'kg' }) => {
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 40; // 20px de padding a cada lado

  // Validar que hay datos
  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="analytics-outline" size={48} color="#C7C7CC" />
        <Text style={styles.emptyTitle}>Sin datos de peso</Text>
        <Text style={styles.emptyText}>
          Los registros de peso aparecerán aquí cuando se añadan procedimientos con datos médicos
        </Text>
      </View>
    );
  }

  // Transformar datos para la gráfica
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}/${month}`;
  };

  const weights = data.map(item => parseFloat(item.peso));
  const labels = data.map(item => formatDate(item.fecha));

  // Calcular estadísticas
  const currentWeight = weights[weights.length - 1];
  const minWeight = Math.min(...weights);
  const maxWeight = Math.max(...weights);
  const avgWeight = weights.reduce((a, b) => a + b, 0) / weights.length;

  // Configuración de la gráfica
  const chartConfig = {
    backgroundColor: '#FFFFFF',
    backgroundGradientFrom: '#FFFFFF',
    backgroundGradientTo: '#FFFFFF',
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 10,
    },
    propsForDots: {
      r: '5',
      strokeWidth: '2',
      stroke: '#007AFF',
    },
    propsForBackgroundLines: {
      strokeDasharray: '', // Sin líneas punteadas
      stroke: '#E5E5EA',
      strokeWidth: 1,
    },
  };

  const chartData = {
    labels: labels.length > 6
      ? labels.filter((_, i) => i % Math.ceil(labels.length / 6) === 0)
      : labels,
    datasets: [
      {
        data: weights,
        color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  return (
    <View style={styles.container}>
      {/* Header con título */}
      <View style={styles.header}>
        <Ionicons name="trending-up" size={24} color="#007AFF" />
        <Text style={styles.title}>Evolución de Peso</Text>
      </View>

      {/* Estadísticas rápidas */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Actual</Text>
          <Text style={styles.statValue}>{currentWeight.toFixed(1)} {unit}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Promedio</Text>
          <Text style={styles.statValue}>{avgWeight.toFixed(1)} {unit}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Mínimo</Text>
          <Text style={styles.statValue}>{minWeight.toFixed(1)} {unit}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Máximo</Text>
          <Text style={styles.statValue}>{maxWeight.toFixed(1)} {unit}</Text>
        </View>
      </View>

      {/* Gráfica */}
      <View style={styles.chartContainer}>
        <LineChart
          data={chartData}
          width={chartWidth}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          withInnerLines={true}
          withOuterLines={true}
          withVerticalLines={false}
          withHorizontalLines={true}
          withVerticalLabels={true}
          withHorizontalLabels={true}
          withDots={true}
          withShadow={false}
          fromZero={false}
          yAxisSuffix={` ${unit}`}
          yAxisInterval={1}
        />
      </View>

      {/* Información adicional */}
      <View style={styles.footer}>
        <Ionicons name="information-circle-outline" size={16} color="#8E8E93" />
        <Text style={styles.footerText}>
          Mostrando {data.length} registro{data.length !== 1 ? 's' : ''}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '500',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  chart: {
    borderRadius: 10,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  footerText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3A3A3C',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default WeightChart;
