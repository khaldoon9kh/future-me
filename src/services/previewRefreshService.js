import { storageService } from '../storage/storageService';
import { fetchLinkMetadata } from './linkMetadataService';

// Items already re-fetched this app session — avoids hammering a site that
// keeps failing, and stops a broken image from re-triggering forever.
const attempted = new Set();
let running = false;

const needsPreview = (item) => !!item.url && !item.imageUrl && !item.description;

/**
 * Re-fetches link metadata for one saved item and stores what it finds.
 * Only fills in the preview: imageUrl is replaced (old ones expire),
 * description and title are set only if they are empty, so nothing the
 * user typed is overwritten. Returns the updated item, or null.
 */
export async function refreshItemPreview(item) {
  if (!item?.url || attempted.has(item.id)) return null;
  attempted.add(item.id);

  const meta = await fetchLinkMetadata(item.url);
  const updates = {};
  if (meta.imageUrl && meta.imageUrl !== item.imageUrl) updates.imageUrl = meta.imageUrl;
  if (meta.description && !item.description) updates.description = meta.description;
  if (meta.title && !item.title?.trim()) updates.title = meta.title;
  if (Object.keys(updates).length === 0) return null;

  try {
    return await storageService.updateItem(item.id, updates);
  } catch {
    return null; // item was deleted while we were fetching
  }
}

/**
 * Fetches previews for every item that has a URL but no preview data,
 * one at a time. `onUpdated` is called with each item as it is saved.
 */
export async function refreshMissingPreviews(items, onUpdated) {
  if (running) return;
  running = true;
  try {
    for (const item of items.filter(needsPreview)) {
      const updated = await refreshItemPreview(item);
      if (updated) onUpdated?.(updated);
    }
  } finally {
    running = false;
  }
}
