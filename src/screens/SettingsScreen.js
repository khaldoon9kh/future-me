import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';

import { notificationService } from '../services/notificationService';
import { storageService } from '../storage/storageService';

export default function SettingsScreen() {
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [stats, setStats] = useState({ total: 0, active: 0, completed: 0, reminders: 0 });

  const loadData = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setNotifEnabled(status === 'granted');

    const items = await storageService.getAllItems();
    setStats({
      total: items.length,
      active: items.filter((i) => !i.completed).length,
      completed: items.filter((i) => i.completed).length,
      reminders: items.filter((i) => i.actionType === 'reminder' && !i.completed).length,
    });
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const handleNotifToggle = async (value) => {
    if (value) {
      const granted = await notificationService.requestPermissions();
      setNotifEnabled(granted);
      if (!granted) {
        Alert.alert(
          'Permission required',
          'Enable notifications for FutureMe in your device Settings to receive reminders.',
          [{ text: 'OK' }]
        );
      }
    } else {
      setNotifEnabled(false);
      Alert.alert(
        'Notifications',
        'To fully disable notifications, go to device Settings → FutureMe → Notifications.'
      );
    }
  };

  const handleClearCompleted = () => {
    if (stats.completed === 0) {
      Alert.alert('Nothing to clear', 'You have no completed items.');
      return;
    }
    Alert.alert(
      `Clear ${stats.completed} completed item${stats.completed !== 1 ? 's' : ''}?`,
      'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            const items = await storageService.getAllItems();
            for (const item of items.filter((i) => i.completed)) {
              await storageService.deleteItem(item.id);
            }
            await loadData();
            Alert.alert('Done', `${stats.completed} item${stats.completed !== 1 ? 's' : ''} removed.`);
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    if (stats.total === 0) {
      Alert.alert('Nothing to clear', 'Your inbox is already empty.');
      return;
    }
    Alert.alert(
      'Clear all data?',
      `This will permanently delete all ${stats.total} items and cancel all notifications. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            await storageService.clearAll();
            await notificationService.cancelAllReminders();
            await loadData();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Stats card */}
        <View style={styles.statsCard}>
          <StatItem value={stats.total} label="Total" />
          <View style={styles.statDivider} />
          <StatItem value={stats.active} label="Active" />
          <View style={styles.statDivider} />
          <StatItem value={stats.reminders} label="Reminders" />
          <View style={styles.statDivider} />
          <StatItem value={stats.completed} label="Done" />
        </View>

        {/* Notifications section */}
        <SectionHeader title="Notifications" />
        <View style={styles.card}>
          <SettingRow
            icon="notifications-outline"
            iconColor="#6C63FF"
            label="Enable Reminders"
            subtitle="Get notified when a reminder is due"
            right={
              <Switch
                value={notifEnabled}
                onValueChange={handleNotifToggle}
                trackColor={{ false: '#E5E7EB', true: '#C4B5FD' }}
                thumbColor={notifEnabled ? '#6C63FF' : '#F9FAFB'}
                ios_backgroundColor="#E5E7EB"
              />
            }
          />
        </View>

        {/* Data management */}
        <SectionHeader title="Data" />
        <View style={styles.card}>
          <SettingRow
            icon="checkmark-done-outline"
            iconColor="#10B981"
            label="Clear Completed"
            subtitle={`${stats.completed} completed item${stats.completed !== 1 ? 's' : ''}`}
            right={<Ionicons name="chevron-forward" size={18} color="#D1D5DB" />}
            onPress={handleClearCompleted}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="trash-outline"
            iconColor="#EF4444"
            label="Clear All Data"
            subtitle="Permanently delete everything"
            labelColor="#EF4444"
            right={<Ionicons name="chevron-forward" size={18} color="#D1D5DB" />}
            onPress={handleClearAll}
          />
        </View>

        {/* How to share */}
        <SectionHeader title="How to Use" />
        <View style={styles.infoCard}>
          <Ionicons name="share-social-outline" size={22} color="#6C63FF" />
          <View style={styles.infoText}>
            <Text style={styles.infoTitle}>Share from any app</Text>
            <Text style={styles.infoBody}>
              Open TikTok, Instagram, YouTube, Safari, Chrome — or any other app — find something
              you want to save, tap the Share button, and choose{' '}
              <Text style={styles.infoBold}>FutureMe</Text> from the share sheet.
            </Text>
          </View>
        </View>

        {/*<View style={styles.infoCard}>
          <Ionicons name="construct-outline" size={22} color="#F59E0B" />
          <View style={styles.infoText}>
            <Text style={styles.infoTitle}>Requires a custom build</Text>
            <Text style={styles.infoBody}>
              Share-intent requires a custom development build via EAS Build. It does not work in
              standard Expo Go. See the project README for setup instructions.
            </Text>
          </View>
        </View>
        */}

        {/* About */}
        <SectionHeader title="About" />
        <View style={styles.card}>
          <SettingRow
            icon="information-circle-outline"
            iconColor="#6B7280"
            label="FutureMe"
            subtitle="Reminder + Action Inbox"
            right={<Text style={styles.version}>v1.0.0</Text>}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Small helpers ──────────────────────────────────────────────────────────

function StatItem({ value, label }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SectionHeader({ title }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function SettingRow({ icon, iconColor, label, labelColor, subtitle, right, onPress }) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper style={settingStyles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={[settingStyles.iconWrap, { backgroundColor: `${iconColor}18` }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={settingStyles.text}>
        <Text style={[settingStyles.label, labelColor && { color: labelColor }]}>{label}</Text>
        {subtitle ? <Text style={settingStyles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </Wrapper>
  );
}

const settingStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    gap: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1A1A2E',
  },
  subtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 1,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A2E',
    letterSpacing: -0.5,
  },
  scroll: {
    padding: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#6C63FF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
    fontWeight: '500',
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  version: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  infoCard: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  infoText: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  infoBody: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 19,
  },
  infoBold: {
    fontWeight: '700',
    color: '#1A1A2E',
  },
});
