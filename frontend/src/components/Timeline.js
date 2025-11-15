import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const TimelineItem = ({ item, type }) => {
  const isVaccine = type === 'vaccine';
  const icon = isVaccine ? 'medical' : 'fitness';
  const color = isVaccine ? '#007AFF' : '#34C759';

  return (
    <View style={styles.timelineItem}>
      <View style={[styles.itemIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={16} color="#fff" />
      </View>
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>
          {isVaccine ? item.nombreVacuna : item.tipo.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </Text>
        {isVaccine && item.lote && (
          <Text style={styles.itemDetail}>Lote: {item.lote}</Text>
        )}
        {!isVaccine && item.descripcion && (
          <Text style={styles.itemDetail}>{item.descripcion}</Text>
        )}
        {item.vet && (
          <View style={styles.vetBadge}>
            <Ionicons name="medkit" size={10} color="#007AFF" />
            <Text style={styles.vetBadgeText}>Dr. {item.vet.nombre}</Text>
          </View>
        )}
        {!item.vet && (
          <View style={styles.ownerBadge}>
            <Ionicons name="person" size={10} color="#34C759" />
            <Text style={styles.ownerBadgeText}>Dueño</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const MonthDayGroup = ({ date, items }) => {
  return (
    <View style={styles.monthDayGroup}>
      <View style={styles.monthDayHeader}>
        <Text style={styles.monthDayText}>
          {format(new Date(date), 'd MMMM', { locale: es })}
        </Text>
      </View>
      <View style={styles.dayItems}>
        {items.map((item, index) => (
          <TimelineItem key={`${item.type}-${item.id}`} item={item} type={item.type} />
        ))}
      </View>
    </View>
  );
};

const YearGroup = ({ year, dates }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <View style={styles.yearGroup}>
      <TouchableOpacity
        style={styles.yearHeader}
        onPress={() => setCollapsed(!collapsed)}
        activeOpacity={0.6}
      >
        <Text style={styles.yearText}>{year}</Text>
        <Ionicons
          name={collapsed ? 'chevron-forward' : 'chevron-down'}
          size={18}
          color="#666"
        />
      </TouchableOpacity>
      {!collapsed && (
        <View style={styles.yearContent}>
          {dates.map((date) => (
            <MonthDayGroup key={date.date} date={date.date} items={date.items} />
          ))}
        </View>
      )}
    </View>
  );
};

const Timeline = ({ vaccines = [], procedures = [] }) => {
  // Combinar y formatear todos los eventos
  const events = [
    ...vaccines.map(v => ({
      ...v,
      type: 'vaccine',
      date: v.fechaAplicacion || v.createdAt,
    })),
    ...procedures.map(p => ({
      ...p,
      type: 'procedure',
      date: p.fecha,
    })),
  ];

  // Agrupar por año > fecha completa
  const groupedEvents = events.reduce((acc, event) => {
    const date = new Date(event.date);
    const year = date.getFullYear();
    const dateKey = format(date, 'yyyy-MM-dd');

    if (!acc[year]) acc[year] = {};
    if (!acc[year][dateKey]) acc[year][dateKey] = [];

    acc[year][dateKey].push(event);
    return acc;
  }, {});

  // Convertir a array y ordenar
  const yearGroups = Object.keys(groupedEvents)
    .sort((a, b) => parseInt(b) - parseInt(a))
    .map(year => ({
      year,
      dates: Object.entries(groupedEvents[year])
        .sort(([a], [b]) => new Date(b) - new Date(a))
        .map(([date, items]) => ({ date, items }))
    }));

  if (events.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="time-outline" size={64} color="#CCC" />
        <Text style={styles.emptyText}>No hay historial</Text>
        <Text style={styles.emptySubtext}>
          Las vacunas y procedimientos aparecerán aquí
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {yearGroups.map(group => (
        <YearGroup key={group.year} year={group.year} dates={group.dates} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  yearGroup: {
    marginBottom: 20,
  },
  yearHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  yearText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
    letterSpacing: 0.5,
  },
  yearContent: {
    paddingLeft: 12,
  },
  monthDayGroup: {
    marginBottom: 16,
  },
  monthDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingLeft: 4,
  },
  monthDayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textTransform: 'capitalize',
  },
  dayItems: {
    paddingLeft: 8,
    gap: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  itemDetail: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  vetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginTop: 4,
  },
  vetBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#007AFF',
  },
  ownerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginTop: 4,
  },
  ownerBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#34C759',
  },
});

export default Timeline;
