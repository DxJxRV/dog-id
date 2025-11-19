import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FriendsPetsScreen from './FriendsPetsScreen';
import FriendsListScreen from './FriendsListScreen';
import { friendshipsAPI } from '../../services/api';

const { width } = Dimensions.get('window');

const FriendsMainScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('pets'); // 'pets' o 'humans'
  const [refreshKey, setRefreshKey] = useState(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  const fetchPendingCount = async () => {
    try {
      const response = await friendshipsAPI.getPending();
      setPendingRequestsCount(response.data.requests?.length || 0);
    } catch (err) {
      // Silently fail - this is just for badge display
    }
  };

  useEffect(() => {
    fetchPendingCount();
    const unsubscribe = navigation.addListener('focus', () => {
      setRefreshKey(prev => prev + 1);
      fetchPendingCount();
    });
    return unsubscribe;
  }, [navigation]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Amigos</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddFriend')}
        >
          <Ionicons name="person-add-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pets' && styles.tabActive]}
          onPress={() => setActiveTab('pets')}
        >
          <Ionicons
            name="paw"
            size={20}
            color={activeTab === 'pets' ? '#007AFF' : '#8E8E93'}
          />
          <Text style={[styles.tabText, activeTab === 'pets' && styles.tabTextActive]}>
            Amigos Perrunos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'humans' && styles.tabActive]}
          onPress={() => setActiveTab('humans')}
        >
          <Ionicons
            name="people"
            size={20}
            color={activeTab === 'humans' ? '#007AFF' : '#8E8E93'}
          />
          <Text style={[styles.tabText, activeTab === 'humans' && styles.tabTextActive]}>
            Amigos Humanos
          </Text>
          {pendingRequestsCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingRequestsCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'pets' ? (
          <FriendsPetsScreen
            navigation={navigation}
            embedded
            onPetsViewed={fetchPendingCount}
          />
        ) : (
          <FriendsListScreen
            navigation={navigation}
            embedded
            onPendingCountChange={fetchPendingCount}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
  },
  addButton: {
    padding: 8,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8E8E93',
  },
  tabTextActive: {
    color: '#007AFF',
  },
  content: {
    flex: 1,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});

export default FriendsMainScreen;
