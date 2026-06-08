import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

const notificationService = {
  /**
   * Asks the user for notification permission (once).
   * Returns true if granted, false otherwise.
   */
  async requestPermissions() {
    if (!Device.isDevice) {
      // Simulators/emulators cannot receive push notifications.
      // Local scheduled notifications still work on simulators.
      console.warn('[notifications] Running on simulator — some features limited.');
    }

    const { status: current } = await Notifications.getPermissionsAsync();
    if (current === 'granted') return true;

    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });

    if (status === 'granted' && Platform.OS === 'android') {
      // Android 13+ requires an explicit notification channel
      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'FutureMe Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6C63FF',
        sound: 'default',
      });
    }

    return status === 'granted';
  },

  /**
   * Schedules a local notification for the given item.
   * Returns the notification ID (string) or null if scheduling failed.
   */
  async scheduleReminder(item) {
    if (!item.reminderDateTime) return null;

    const trigger = new Date(item.reminderDateTime);
    if (trigger <= new Date()) return null; // already in the past

    try {
      const notifId = await Notifications.scheduleNotificationAsync({
        content: {
          title: item.title || 'FutureMe Reminder',
          body: item.notes || item.url || 'Tap to open your saved item.',
          data: { itemId: item.id },
          sound: 'default',
          ...(Platform.OS === 'android' && { channelId: 'reminders' }),
        },
        trigger: { date: trigger },
      });
      return notifId;
    } catch (e) {
      console.error('[notifications] scheduleReminder failed:', e);
      return null;
    }
  },

  /** Cancels a specific scheduled notification by its ID. */
  async cancelReminder(notificationId) {
    if (!notificationId) return;
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (e) {
      console.error('[notifications] cancelReminder failed:', e);
    }
  },

  /** Cancels every scheduled notification (used in Settings → Clear All). */
  async cancelAllReminders() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (e) {
      console.error('[notifications] cancelAllReminders failed:', e);
    }
  },

  /** Returns the current permission status string. */
  async getPermissionStatus() {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  },
};

export { notificationService };
