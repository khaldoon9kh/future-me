import AsyncStorage from '@react-native-async-storage/async-storage';

const ITEMS_KEY = '@future_me:items';

/** Generates a simple unique ID without an external library */
const generateId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const storageService = {
  /** Returns all saved items, newest first. */
  async getAllItems() {
    try {
      const json = await AsyncStorage.getItem(ITEMS_KEY);
      return json ? JSON.parse(json) : [];
    } catch (e) {
      console.error('[storage] getAllItems failed:', e);
      return [];
    }
  },

  /** Saves a new item and returns the saved object (with generated id/createdAt). */
  async saveItem(item) {
    try {
      const items = await this.getAllItems();
      const newItem = {
        id: generateId(),
        url: item.url ?? '',
        title: item.title ?? '',
        actionType: item.actionType ?? 'reminder',
        reminderDateTime: item.reminderDateTime ?? null,
        notificationId: item.notificationId ?? null,
        recipientName: item.recipientName ?? '',
        notes: item.notes ?? '',
        imageUrl: item.imageUrl ?? '',
        description: item.description ?? '',
        createdAt: new Date().toISOString(),
        completed: false,
      };
      // Prepend so newest items appear first
      const updated = [newItem, ...items];
      await AsyncStorage.setItem(ITEMS_KEY, JSON.stringify(updated));
      return newItem;
    } catch (e) {
      console.error('[storage] saveItem failed:', e);
      throw e;
    }
  },

  /** Merges `updates` into the item with the given `id`. */
  async updateItem(id, updates) {
    try {
      const items = await this.getAllItems();
      const idx = items.findIndex((i) => i.id === id);
      if (idx === -1) throw new Error(`Item ${id} not found`);
      items[idx] = { ...items[idx], ...updates };
      await AsyncStorage.setItem(ITEMS_KEY, JSON.stringify(items));
      return items[idx];
    } catch (e) {
      console.error('[storage] updateItem failed:', e);
      throw e;
    }
  },

  /** Permanently removes an item by id. */
  async deleteItem(id) {
    try {
      const items = await this.getAllItems();
      const filtered = items.filter((i) => i.id !== id);
      await AsyncStorage.setItem(ITEMS_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.error('[storage] deleteItem failed:', e);
      throw e;
    }
  },

  /** Convenience: marks an item as completed. */
  async markCompleted(id) {
    return this.updateItem(id, { completed: true });
  },

  /** Removes all stored items (used in Settings → Clear All). */
  async clearAll() {
    try {
      await AsyncStorage.removeItem(ITEMS_KEY);
    } catch (e) {
      console.error('[storage] clearAll failed:', e);
      throw e;
    }
  },
};

export { storageService };
