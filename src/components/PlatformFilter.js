import React from 'react';
import { ScrollView, TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { detectPlatform } from '../utils/urlUtils';

const PLATFORM_META = {
  youtube:   { label: 'YouTube',   icon: 'logo-youtube',   color: '#FF0000' },
  tiktok:    { label: 'TikTok',    icon: 'musical-notes',  color: '#2D2D2D' },
  instagram: { label: 'Instagram', icon: 'logo-instagram', color: '#E4405F' },
  twitter:   { label: 'Twitter',   icon: 'logo-twitter',   color: '#1DA1F2' },
  reddit:    { label: 'Reddit',    icon: 'logo-reddit',    color: '#FF4500' },
  vimeo:     { label: 'Vimeo',     icon: 'film-outline',   color: '#1AB7EA' },
  link:      { label: 'Web',       icon: 'globe-outline',  color: '#6B7280' },
};

// Displayed in this order whenever present
const PLATFORM_ORDER = ['youtube', 'tiktok', 'instagram', 'twitter', 'reddit', 'vimeo', 'link'];

export default function PlatformFilter({ items, activePlatform, onPlatformChange }) {
  const presentPlatforms = PLATFORM_ORDER.filter(
    (p) => items.some((item) => detectPlatform(item.url) === p)
  );

  if (presentPlatforms.length === 0) return null;

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <Chip
          label="All"
          icon="apps-outline"
          color="#6C63FF"
          active={activePlatform === 'all'}
          onPress={() => onPlatformChange('all')}
        />
        {presentPlatforms.map((p) => {
          const meta = PLATFORM_META[p];
          return (
            <Chip
              key={p}
              label={meta.label}
              icon={meta.icon}
              color={meta.color}
              active={activePlatform === p}
              onPress={() => onPlatformChange(p)}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}

function Chip({ label, icon, color, active, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && { backgroundColor: color, borderColor: color }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={14} color={active ? '#FFFFFF' : color} />
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingVertical: 8,
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
  labelActive: {
    color: '#FFFFFF',
  },
});
