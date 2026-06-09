import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

import { storageService } from '../storage/storageService';
import ItemCard from '../components/ItemCard';
import FilterTabs from '../components/FilterTabs';
import EmptyState from '../components/EmptyState';

const FILTER_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'reminder', label: 'Reminders' },
  { key: 'send_later', label: 'Send Later' },
  { key: 'other', label: 'Other' },
];

const EMPTY_MESSAGES = {
  all: {
    icon: 'layers-outline',
    title: 'Your inbox is empty',
    subtitle:
      'Share links from TikTok, Instagram, YouTube, or any browser, then pick them up here.',
  },
  reminder: {
    icon: 'alarm-outline',
    title: 'No reminders yet',
    subtitle: 'Set a reminder on any saved link and you\'ll find it here.',
  },

  send_later: {
    icon: 'paper-plane-outline',
    title: 'Nothing queued to send',
    subtitle: 'Save items you want to forward to someone.',
  },
  other: {
    icon: 'ellipsis-horizontal-circle-outline',
    title: 'Nothing here',
    subtitle: 'Custom items you classify as "Other" will appear here.',
  },
};

export default function HomeScreen() {
  const navigation = useNavigation();
  const [items, setItems] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const loadItems = async () => {
    const data = await storageService.getAllItems();
    setItems(data);
  };

  // Reload every time this screen comes into focus (e.g. after saving a new item)
  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadItems();
    setRefreshing(false);
  };

  const filtered =
    activeFilter === 'all'
      ? items
      : items.filter((i) => i.actionType === activeFilter);

  // Active items first, completed at the bottom
  const sortedBase = [
    ...filtered.filter((i) => !i.completed),
    ...filtered.filter((i) => i.completed),
  ];
  // Pad to an even count so the 2-column grid has no layout gap on the last row
  const sorted =
    sortedBase.length % 2 !== 0
      ? [...sortedBase, { id: '_placeholder', _isPlaceholder: true }]
      : sortedBase;

  const counts = {
    reminders: items.filter((i) => i.actionType === 'reminder' && !i.completed).length,
    pending: items.filter((i) => !i.completed).length,
  };

  const empty = EMPTY_MESSAGES[activeFilter] || EMPTY_MESSAGES.all;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appName}>FutureMe</Text>
          <Text style={styles.subtitle}>
            {counts.pending > 0
              ? `${counts.pending} active item${counts.pending !== 1 ? 's' : ''}`
              : 'All caught up!'}
          </Text>
        </View>

        {/* Reminder badge + add button */}
        <View style={styles.headerRight}>
          {counts.reminders > 0 && (
            <View style={styles.reminderBadge}>
              <Ionicons name="alarm" size={14} color="#F59E0B" />
              <Text style={styles.reminderCount}>{counts.reminders}</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('QuickAdd', {})}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={26} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Filter tabs ── */}
      <FilterTabs
        options={FILTER_OPTIONS}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />

      {/* ── 2-column grid ── */}
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={[
          styles.list,
          sortedBase.length === 0 && styles.listEmpty,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6C63FF"
            colors={['#6C63FF']}
          />
        }
        ListEmptyComponent={
          <EmptyState icon={empty.icon} title={empty.title} subtitle={empty.subtitle} />
        }
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          if (item._isPlaceholder) return <View style={styles.placeholderCell} />;
          return (
            <ItemCard
              item={item}
              onPress={() => navigation.navigate('ItemDetails', { itemId: item.id })}
              onComplete={async () => {
                await storageService.markCompleted(item.id);
                loadItems();
              }}
            />
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 4,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A2E',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reminderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  reminderCount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D97706',
  },
  addButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#6C63FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  columnWrapper: {
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  list: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  listEmpty: {
    flex: 1,
  },
  placeholderCell: {
    flex: 1,
  },
});
