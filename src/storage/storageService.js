import AsyncStorage from '@react-native-async-storage/async-storage';

const ITEMS_KEY = '@future_me:items';

/** Generates a simple unique ID without an external library */
const generateId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Reads the stored items and throws if they can't be read or parsed.
 * Every write goes through this, so a failed read can never cause the
 * saved list to be overwritten with an empty one.
 */
async function readItems() {
  const json = await AsyncStorage.getItem(ITEMS_KEY);
  if (!json) return [];
  const items = JSON.parse(json);
  if (!Array.isArray(items)) throw new Error('Stored items are not a list');
  return items;
}

// Writes are read-modify-write on one key, so run them one at a time —
// otherwise a background preview refresh could undo a concurrent edit.
let writeQueue = Promise.resolve();
function serialized(fn) {
  const run = writeQueue.then(fn, fn);
  writeQueue = run.catch(() => {});
  return run;
}

const storageService = {
  /** Returns all saved items, newest first. */
  async getAllItems() {
    try {
      return await readItems();
    } catch (e) {
      console.error('[storage] getAllItems failed:', e);
      return [];
    }
  },

  /** Saves a new item and returns the saved object (with generated id/createdAt). */
  saveItem(item) {
    return serialized(async () => {
      try {
        const items = await readItems();
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
    });
  },

  /** Merges `updates` into the item with the given `id`. */
  updateItem(id, updates) {
    return serialized(async () => {
      try {
        const items = await readItems();
        const idx = items.findIndex((i) => i.id === id);
        if (idx === -1) throw new Error(`Item ${id} not found`);
        items[idx] = { ...items[idx], ...updates };
        await AsyncStorage.setItem(ITEMS_KEY, JSON.stringify(items));
        return items[idx];
      } catch (e) {
        console.error('[storage] updateItem failed:', e);
        throw e;
      }
    });
  },

  /** Permanently removes an item by id. */
  deleteItem(id) {
    return serialized(async () => {
      try {
        const items = await readItems();
        const filtered = items.filter((i) => i.id !== id);
        await AsyncStorage.setItem(ITEMS_KEY, JSON.stringify(filtered));
      } catch (e) {
        console.error('[storage] deleteItem failed:', e);
        throw e;
      }
    });
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
