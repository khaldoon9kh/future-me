import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/** Toggleable list chips used in Quick Add / Edit. A post can be in any number of lists. */
export default function ListPicker({ lists, selectedIds, onChange, onCreateList }) {
  const toggle = (id) =>
    onChange(selectedIds.includes(id) ? selectedIds.filter((s) => s !== id) : [...selectedIds, id]);

  return (
    <View style={styles.wrap}>
      {lists.map((list) => {
        const active = selectedIds.includes(list.id);
        return (
          <TouchableOpacity
            key={list.id}
            style={[
              styles.chip,
              active && { backgroundColor: `${list.color}15`, borderColor: list.color },
            ]}
            onPress={() => toggle(list.id)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={active ? 'checkmark-circle' : list.icon}
              size={16}
              color={active ? list.color : '#9CA3AF'}
            />
            <Text style={[styles.label, active && { color: list.color, fontWeight: '700' }]}>
              {list.name}
            </Text>
          </TouchableOpacity>
        );
      })}
      <TouchableOpacity style={styles.addChip} onPress={onCreateList} activeOpacity={0.7}>
        <Ionicons name="add" size={16} color="#6C63FF" />
        <Text style={styles.addLabel}>New List</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  addChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#C4B5FD',
    borderStyle: 'dashed',
  },
  addLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6C63FF',
  },
});
