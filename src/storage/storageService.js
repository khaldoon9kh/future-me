import AsyncStorage from '@react-native-async-storage/async-storage';

const ITEMS_KEY = '@future_me:items';
const LISTS_KEY = '@future_me:lists';

/** Generates a simple unique ID without an external library */
const generateId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Reads the stored items and throws if they can't be read or parsed.
 * Every write goes through this, so a failed read can never cause the
 * saved list to be overwritten with an empty one.
 */
async function readArray(key) {
  const json = await AsyncStorage.getItem(key);
  if (!json) return [];
  const data = JSON.parse(json);
  if (!Array.isArray(data)) throw new Error(`Stored value for ${key} is not a list`);
  return data;
}

const readItems = () => readArray(ITEMS_KEY);
const readLists = () => readArray(LISTS_KEY);

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
          listIds: item.listIds ?? [],
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

  // ── Lists (user-made tags like "Games" or "Music") ──
  // Items reference lists by id in `item.listIds`. Items saved before lists
  // existed have no `listIds` field and are treated as being in no list.

  /** Returns all lists in the order they were created. */
  async getAllLists() {
    try {
      return await readLists();
    } catch (e) {
      console.error('[storage] getAllLists failed:', e);
      return [];
    }
  },

  /** Creates a list and returns it. */
  createList({ name, color, icon }) {
    return serialized(async () => {
      try {
        const lists = await readLists();
        const newList = {
          id: generateId(),
          name: name.trim(),
          color,
          icon,
          createdAt: new Date().toISOString(),
        };
        await AsyncStorage.setItem(LISTS_KEY, JSON.stringify([...lists, newList]));
        return newList;
      } catch (e) {
        console.error('[storage] createList failed:', e);
        throw e;
      }
    });
  },

  /** Merges `updates` (name/color/icon) into the list with the given `id`. */
  updateList(id, updates) {
    return serialized(async () => {
      try {
        const lists = await readLists();
        const idx = lists.findIndex((l) => l.id === id);
        if (idx === -1) throw new Error(`List ${id} not found`);
        lists[idx] = { ...lists[idx], ...updates };
        await AsyncStorage.setItem(LISTS_KEY, JSON.stringify(lists));
        return lists[idx];
      } catch (e) {
        console.error('[storage] updateList failed:', e);
        throw e;
      }
    });
  },

  /** Deletes a list. Its posts are kept — only the tag is removed from them. */
  deleteList(id) {
    return serialized(async () => {
      try {
        const lists = await readLists();
        const items = await readItems();
        const untagged = items.map((i) =>
          i.listIds?.includes(id) ? { ...i, listIds: i.listIds.filter((l) => l !== id) } : i
        );
        await AsyncStorage.setItem(ITEMS_KEY, JSON.stringify(untagged));
        await AsyncStorage.setItem(LISTS_KEY, JSON.stringify(lists.filter((l) => l.id !== id)));
      } catch (e) {
        console.error('[storage] deleteList failed:', e);
        throw e;
      }
    });
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
