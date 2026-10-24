import React from 'react';
import { ScrollView, TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Row of list chips on the Home screen. Tap to filter, long-press to edit,
 * "+" to create a new list.
 */
export default function ListFilter({ lists, items, activeList, onListChange, onEditList, onCreateList }) {
  const countFor = (id) => items.filter((i) => i.listIds?.includes(id)).length;

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {lists.length > 0 && (
          <Chip
            label="All Lists"
            icon="albums-outline"
            color="#6C63FF"
            active={activeList === 'all'}
            onPress={() => onListChange('all')}
          />
        )}
        {lists.map((list) => (
          <Chip
            key={list.id}
            label={list.name}
            count={countFor(list.id)}
            icon={list.icon}
            color={list.color}
            active={activeList === list.id}
            onPress={() => onListChange(list.id)}
            onLongPress={() => onEditList(list)}
          />
        ))}
        <TouchableOpacity style={styles.addChip} onPress={onCreateList} activeOpacity={0.7}>
          <Ionicons name="add" size={15} color="#6C63FF" />
          <Text style={styles.addLabel}>{lists.length === 0 ? 'New List' : 'New'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Chip({ label, count, icon, color, active, onPress, onLongPress }) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && { backgroundColor: color, borderColor: color }]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={14} color={active ? '#FFFFFF' : color} />
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
      {count !== undefined && (
        <Text style={[styles.count, active && styles.labelActive]}>{count}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingTop: 0,
    paddingBottom: 8,
  },
  scroll: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  count: {
    fontSize: 11,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  labelActive: {
    color: '#FFFFFF',
  },
  addChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#C4B5FD',
    borderStyle: 'dashed',
  },
  addLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6C63FF',
  },
});
