import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';

import { storageService } from '../storage/storageService';
import { notificationService } from '../services/notificationService';
import { formatDateTime, relativeLabel, isOverdue } from '../utils/dateUtils';
import { extractDomain } from '../utils/urlUtils';

const ACTION_CONFIG = {
  reminder: { icon: 'alarm', color: '#F59E0B', label: 'Reminder' },
  send_later: { icon: 'paper-plane', color: '#10B981', label: 'Send Later' },
  other: { icon: 'ellipsis-horizontal-circle', color: '#6B7280', label: 'Other' },
};

export default function ItemDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { itemId } = route.params;

  const [item, setItem] = useState(null);

  const loadItem = useCallback(async () => {
    const all = await storageService.getAllItems();
    setItem(all.find((i) => i.id === itemId) ?? null);
  }, [itemId]);

  // Reload every time this screen gains focus so edits made in QuickAdd
  // (or completions made elsewhere) are immediately reflected here.
  useFocusEffect(loadItem);

  const handleEdit = () => {
    navigation.navigate('QuickAdd', {
      editMode: true,
      itemData: item,
    });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete item?',
      'This will permanently remove the item and cancel any scheduled reminder.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (item.notificationId) {
              await notificationService.cancelReminder(item.notificationId);
            }
            await storageService.deleteItem(itemId);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleOpenLink = async () => {
    if (!item?.url) return;
    try {
      const supported = await Linking.canOpenURL(item.url);
      if (supported) {
        await Linking.openURL(item.url);
      } else {
        Alert.alert('Cannot open link', 'The URL appears to be invalid.');
      }
    } catch {
      Alert.alert('Error', 'Failed to open the link.');
    }
  };

  const handleToggleComplete = async () => {
    await storageService.updateItem(item.id, { completed: !item.completed });
    loadItem();
  };

  if (!item) return null;

  const config = ACTION_CONFIG[item.actionType] || ACTION_CONFIG.other;
  const overdue =
    item.actionType === 'reminder' && !item.completed && isOverdue(item.reminderDateTime);

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleEdit} style={styles.headerBtn}>
            <Ionicons name="pencil-outline" size={20} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.headerBtn}>
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Scrollable content ── */}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Type badge */}
        <View style={[styles.typeBadge, { backgroundColor: `${config.color}15` }]}>
          <Ionicons name={config.icon} size={16} color={config.color} />
          <Text style={[styles.typeLabel, { color: config.color }]}>{config.label}</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>
          {item.title || extractDomain(item.url) || 'Untitled'}
        </Text>

        {/* Overdue warning */}
        {overdue && (
          <View style={styles.overdueWarning}>
            <Ionicons name="warning-outline" size={16} color="#EF4444" />
            <Text style={styles.overdueWarningText}>
              This reminder was due {relativeLabel(item.reminderDateTime)}.
            </Text>
          </View>
        )}

        {/* URL card → tappable */}
        {item.url ? (
          <TouchableOpacity style={styles.urlCard} onPress={handleOpenLink} activeOpacity={0.75}>
            <Ionicons name="link-outline" size={18} color="#6C63FF" />
            <Text style={styles.urlText} numberOfLines={3}>
              {item.url}
            </Text>
            <Ionicons name="open-outline" size={18} color="#6C63FF" />
          </TouchableOpacity>
        ) : null}

        {/* Details card */}
        <View style={styles.detailCard}>
          {item.reminderDateTime ? (
            <DetailRow
              icon="alarm-outline"
              label="Reminder"
              value={formatDateTime(item.reminderDateTime)}
              valueColor={overdue ? '#EF4444' : undefined}
            />
          ) : null}
          {item.recipientName ? (
            <DetailRow icon="person-outline" label="Send to" value={item.recipientName} />
          ) : null}
          <DetailRow
            icon="calendar-outline"
            label="Saved"
            value={formatDateTime(item.createdAt)}
          />
          <DetailRow
            icon="checkmark-circle-outline"
            label="Status"
            value={item.completed ? 'Completed' : 'Active'}
            valueColor={item.completed ? '#10B981' : '#F59E0B'}
            last
          />
        </View>

        {/* Notes */}
        {item.notes ? (
          <View style={styles.notesCard}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* ── Bottom action bar ── */}
      <View style={styles.bottomBar}>
        {item.url ? (
          <TouchableOpacity style={styles.openBtn} onPress={handleOpenLink} activeOpacity={0.8}>
            <Ionicons name="open-outline" size={19} color="#FFFFFF" />
            <Text style={styles.openBtnText}>Open Link</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={[
            styles.doneBtn,
            item.url ? styles.doneBtnNarrow : styles.doneBtnFull,
            item.completed && styles.doneBtnCompleted,
          ]}
          onPress={handleToggleComplete}
          activeOpacity={0.8}
        >
          <Ionicons
            name={item.completed ? 'refresh-outline' : 'checkmark-outline'}
            size={19}
            color={item.completed ? '#6B7280' : '#10B981'}
          />
          <Text
            style={[
              styles.doneBtnText,
              item.completed && styles.doneBtnTextCompleted,
            ]}
          >
            {item.completed ? 'Mark Active' : 'Mark Done'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ── Small helper ──────────────────────────────────────────────────────────

function DetailRow({ icon, label, value, valueColor, last }) {
  return (
    <View style={[rowStyles.row, !last && rowStyles.rowBorder]}>
      <Ionicons name={icon} size={16} color="#9CA3AF" />
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={[rowStyles.value, valueColor && { color: valueColor }]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    gap: 10,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  label: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A2E',
    maxWidth: '55%',
    textAlign: 'right',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    paddingTop: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    padding: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  headerBtn: {
    padding: 4,
  },
  content: {
    padding: 20,
    paddingBottom: 110,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  typeLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A2E',
    lineHeight: 30,
    marginBottom: 14,
  },
  overdueWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  overdueWarningText: {
    flex: 1,
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '500',
  },
  urlCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F0EEFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  urlText: {
    flex: 1,
    fontSize: 14,
    color: '#6C63FF',
    fontWeight: '500',
    lineHeight: 19,
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  notesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  notesText: {
    fontSize: 15,
    color: '#1A1A2E',
    lineHeight: 23,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    backgroundColor: '#F8F9FA',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  openBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#6C63FF',
    borderRadius: 14,
    paddingVertical: 15,
  },
  openBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#DCFCE7',
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  doneBtnNarrow: {
    paddingHorizontal: 16,
  },
  doneBtnFull: {
    flex: 1,
  },
  doneBtnCompleted: {
    backgroundColor: '#F3F4F6',
  },
  doneBtnText: {
    color: '#10B981',
    fontWeight: '700',
    fontSize: 15,
  },
  doneBtnTextCompleted: {
    color: '#6B7280',
  },
});
