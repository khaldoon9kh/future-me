import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDateTime, isOverdue, isToday } from '../utils/dateUtils';
import { extractDomain, detectPlatform } from '../utils/urlUtils';

const ACTION_CONFIG = {
  reminder:  { icon: 'alarm-outline', color: '#F59E0B', label: 'Reminder' },
  send_later: { icon: 'paper-plane-outline', color: '#10B981', label: 'Send Later' },
  other:     { icon: 'ellipsis-horizontal-circle-outline', color: '#6B7280', label: 'Other' },
};

const PLATFORM_ICONS = {
  youtube:   'logo-youtube',
  tiktok:    'musical-notes',
  instagram: 'logo-instagram',
  twitter:   'logo-twitter',
  reddit:    'logo-reddit',
  vimeo:     'film-outline',
  link:      'link-outline',
};

export default function ItemCard({ item, onPress, onComplete }) {
  const [imgError, setImgError] = useState(false);

  const config  = ACTION_CONFIG[item.actionType] || ACTION_CONFIG.other;
  const domain  = extractDomain(item.url);
  const platform = detectPlatform(item.url);
  const pIcon   = PLATFORM_ICONS[platform] || PLATFORM_ICONS.link;
  const hasImage = !!item.imageUrl && !imgError;

  const overdue  = !item.completed && isOverdue(item.reminderDateTime);
  const dueToday = !item.completed && !overdue && isToday(item.reminderDateTime);

  return (
    <TouchableOpacity
      style={[styles.card, item.completed && styles.completedCard]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* ── Image / Placeholder ── */}
      <View style={styles.imageWrapper}>
        {hasImage ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.image}
            resizeMode="cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <View style={[styles.imagePlaceholder, { backgroundColor: `${config.color}18` }]}>
            <Ionicons name={pIcon} size={28} color={config.color} style={{ opacity: 0.55 }} />
          </View>
        )}

        {/* Status chip — bottom-left of image */}
        {overdue && (
          <View style={[styles.imageChip, styles.overdueChip]}>
            <Text style={styles.overdueChipText}>Overdue</Text>
          </View>
        )}
        {dueToday && (
          <View style={[styles.imageChip, styles.todayChip]}>
            <Text style={styles.todayChipText}>Today</Text>
          </View>
        )}

        {/* Complete toggle — top-right of image */}
        <TouchableOpacity
          style={styles.checkOverlay}
          onPress={(e) => {
            e.stopPropagation();
            if (!item.completed) onComplete();
          }}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons
            name={item.completed ? 'checkmark-circle' : 'checkmark-circle-outline'}
            size={22}
            color={item.completed ? '#10B981' : '#FFFFFF'}
          />
        </TouchableOpacity>
      </View>

      {/* ── Body ── */}
      <View style={styles.body}>
        {/* Action badge */}
        <View style={[styles.badge, { backgroundColor: `${config.color}18` }]}>
          <View style={[styles.badgeDot, { backgroundColor: config.color }]} />
          <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
        </View>

        {/* Title */}
        <Text
          style={[styles.title, item.completed && styles.strikethrough]}
          numberOfLines={2}
        >
          {item.title || domain || 'Untitled'}
        </Text>

        {/* Domain */}
        {domain ? (
          <Text style={styles.domain} numberOfLines={1}>{domain}</Text>
        ) : null}

        {/* Time */}
        {item.reminderDateTime ? (
          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={10} color={overdue ? '#EF4444' : '#9CA3AF'} />
            <Text style={[styles.timeText, overdue && styles.overdueDate]}>
              {formatDateTime(item.reminderDateTime)}
            </Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  completedCard: {
    opacity: 0.55,
  },
  imageWrapper: {
    width: '100%',
    height: 110,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageChip: {
    position: 'absolute',
    bottom: 6,
    left: 7,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  overdueChip: {
    backgroundColor: 'rgba(254,226,226,0.92)',
  },
  overdueChipText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '700',
  },
  todayChip: {
    backgroundColor: 'rgba(254,243,199,0.92)',
  },
  todayChipText: {
    color: '#D97706',
    fontSize: 10,
    fontWeight: '700',
  },
  checkOverlay: {
    position: 'absolute',
    top: 7,
    right: 7,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 12,
    padding: 1,
  },
  body: {
    padding: 10,
    gap: 4,
  },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
    marginBottom: 2,
  },
  badgeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A2E',
    lineHeight: 18,
  },
  strikethrough: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  domain: {
    fontSize: 11,
    color: '#6C63FF',
    fontWeight: '500',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  timeText: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  overdueDate: {
    color: '#EF4444',
  },
});
