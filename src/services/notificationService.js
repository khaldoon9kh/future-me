import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

const CHANNEL_ID = 'reminders';

const notificationService = {
  // ── Android channel ────────────────────────────────────────────────────────

  /**
   * Creates (or updates) the Android notification channel.
   * setNotificationChannelAsync is idempotent — safe to call on every launch
   * and before every scheduled notification, not just on first permission grant.
   */
  async _ensureAndroidChannel() {
    if (Platform.OS !== 'android') return;
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'FutureMe Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6C63FF',
      sound: 'default',
    });
  },

  // ── Permissions ────────────────────────────────────────────────────────────

  /**
   * Requests notification permission and ensures the Android channel exists.
   * Returns true if granted.
   */
  async requestPermissions() {
    if (!Device.isDevice) {
      console.warn('[notifications] Simulator detected — some features may be limited.');
    }

    const { status: current } = await Notifications.getPermissionsAsync();

    if (current === 'granted') {
      // Channel must still be created on every launch — not just on first grant.
      await this._ensureAndroidChannel();
      return true;
    }

    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });

    if (status === 'granted') {
      await this._ensureAndroidChannel();
    }

    return status === 'granted';
  },

  // ── Scheduling ─────────────────────────────────────────────────────────────

  /**
   * Schedules a local notification for the given item.
   *
   * IMPORTANT: trigger must use SchedulableTriggerInputTypes.DATE with an
   * explicit `type` field. The legacy `{ date }` object (without `type`) is
   * not recognised by expo-notifications v0.28+ and causes the notification
   * to fire immediately instead of at the scheduled time.
   *
   * Returns the notification ID string, or null if date is in the past or
   * scheduling fails.
   */
  async scheduleReminder(item) {
    if (!item.reminderDateTime) return null;

    const triggerDate = new Date(item.reminderDateTime);
    if (triggerDate <= new Date()) return null; // already in the past

    // Ensure the Android channel exists before every schedule call.
    await this._ensureAndroidChannel();

    try {
      const notifId = await Notifications.scheduleNotificationAsync({
        content: {
          title: _notificationTitle(item),
          body: _notificationBody(item),
          data: { itemId: item.id },
          sound: 'default',
        },
        trigger: {
          // Explicit type is required — omitting it causes immediate delivery.
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
          // channelId belongs in the trigger, not in content, on Android.
          ...(Platform.OS === 'android' && { channelId: CHANNEL_ID }),
        },
      });
      return notifId;
    } catch (e) {
      console.error('[notifications] scheduleReminder failed:', e);
      return null;
    }
  },

  /** Cancels a single scheduled notification. */
  async cancelReminder(notificationId) {
    if (!notificationId) return;
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (e) {
      console.error('[notifications] cancelReminder failed:', e);
    }
  },

  /** Cancels every pending notification (used from Settings → Clear All). */
  async cancelAllReminders() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (e) {
      console.error('[notifications] cancelAllReminders failed:', e);
    }
  },

  /** Returns the raw permission status string. */
  async getPermissionStatus() {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  },
};

// ── Private helpers ──────────────────────────────────────────────────────────

function _notificationTitle(item) {
  if (item.actionType === 'send_later' && item.recipientName) {
    return `Time to send to ${item.recipientName}`;
  }
  return item.title || 'FutureMe Reminder';
}

function _notificationBody(item) {
  if (item.notes) return item.notes;
  if (item.url) return item.url;
  return 'Tap to open your saved item.';
}

export { notificationService };
