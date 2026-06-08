import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDateTime, isOverdue, isToday } from '../utils/dateUtils';
import { extractDomain, detectPlatform, platformIcon } from '../utils/urlUtils';

// Visual config per action type
const ACTION_CONFIG = {
  reminder: { icon: 'alarm-outline', color: '#F59E0B', label: 'Reminder' },
  bookmark: { icon: 'bookmark-outline', color: '#6C63FF', label: 'Bookmark' },
  send_later: { icon: 'paper-plane-outline', color: '#10B981', label: 'Send Later' },
  other: { icon: 'ellipsis-horizontal-circle-outline', color: '#6B7280', label: 'Other' },
};

export default function ItemCard({ item, onPress, onComplete }) {
  const config = ACTION_CONFIG[item.actionType] || ACTION_CONFIG.other;
  const domain = extractDomain(item.url);
  const pIcon = platformIcon(detectPlatform(item.url));

  const overdue =
    item.actionType === 'reminder' &&
    !item.completed &&
    isOverdue(item.reminderDateTime);
  const dueToday =
    item.actionType === 'reminder' &&
    !item.completed &&
    !overdue &&
    isToday(item.reminderDateTime);

  return (
    <TouchableOpacity
      style={[styles.card, item.completed && styles.completedCard]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* Left colour accent */}
      <View style={[styles.accent, { backgroundColor: config.color }]} />

      <View style={styles.body}>
        {/* Row 1: type badge + status tags + platform icon */}
        <View style={styles.topRow}>
          <View style={[styles.badge, { backgroundColor: `${config.color}20` }]}>
            <Ionicons name={config.icon} size={11} color={config.color} />
            <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
          </View>

          <View style={styles.topRight}>
            {overdue && (
              <View style={styles.overdueChip}>
                <Text style={styles.overdueText}>Overdue</Text>
              </View>
            )}
            {dueToday && (
              <View style={styles.todayChip}>
                <Text style={styles.todayText}>Today</Text>
              </View>
            )}
            <Ionicons name={pIcon} size={15} color="#C4C9D4" />
          </View>
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
          <Text style={styles.domain} numberOfLines={1}>
            {domain}
          </Text>
        ) : null}

        {/* Notes preview */}
        {item.notes ? (
          <Text style={styles.notes} numberOfLines={1}>
            {item.notes}
          </Text>
        ) : null}

        {/* Row 3: meta + done button */}
        <View style={styles.bottomRow}>
          <View style={styles.metaRow}>
            {item.reminderDateTime ? (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={11} color="#9CA3AF" />
                <Text style={[styles.metaText, overdue && styles.overdueDate]}>
                  {formatDateTime(item.reminderDateTime)}
                </Text>
              </View>
            ) : null}
            {item.recipientName ? (
              <View style={styles.metaItem}>
                <Ionicons name="person-outline" size={11} color="#9CA3AF" />
                <Text style={styles.metaText}>{item.recipientName}</Text>
              </View>
            ) : null}
          </View>

          {item.completed ? (
            <Ionicons name="checkmark-circle" size={22} color="#10B981" />
          ) : (
            <TouchableOpacity
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={(e) => {
                e.stopPropagation();
                onComplete();
              }}
            >
              <Ionicons name="checkmark-circle-outline" size={22} color="#10B981" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
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
  accent: {
    width: 4,
  },
  body: {
    flex: 1,
    padding: 14,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  overdueChip: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  overdueText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '700',
  },
  todayChip: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  todayText: {
    color: '#D97706',
    fontSize: 10,
    fontWeight: '700',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A2E',
    lineHeight: 21,
    marginBottom: 3,
  },
  strikethrough: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  domain: {
    fontSize: 12,
    color: '#6C63FF',
    marginBottom: 3,
  },
  notes: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
    marginBottom: 6,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  metaRow: {
    flex: 1,
    gap: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  overdueDate: {
    color: '#EF4444',
  },
});
