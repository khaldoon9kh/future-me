import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';

export default function FilterTabs({ options, activeFilter, onFilterChange }) {
  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {options.map((option) => {
          const active = activeFilter === option.key;
          return (
            <TouchableOpacity
              key={option.key}
              style={[styles.tab, active && styles.activeTab]}
              onPress={() => onFilterChange(option.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.label, active && styles.activeLabel]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingVertical: 8,
  },
  scroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  activeTab: {
    backgroundColor: '#6C63FF',
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeLabel: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
