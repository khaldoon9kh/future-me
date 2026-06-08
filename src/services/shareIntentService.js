/**
 * Normalises raw expo-share-intent payloads into a consistent shape
 * that the rest of the app can consume without knowing about the library.
 */

const URL_REGEX = /https?:\/\/[^\s]+/;

/**
 * Returns `true` if `str` looks like a full URL with a scheme.
 */
export function looksLikeUrl(str) {
  if (!str) return false;
  return URL_REGEX.test(str);
}

/**
 * Extracts the first URL found in a string.
 * Useful when the user shares plain text that contains an embedded link
 * (e.g. Instagram DMs sometimes send "Check this out: https://...").
 */
function extractUrlFromText(text) {
  if (!text) return '';
  const match = text.match(URL_REGEX);
  return match ? match[0] : '';
}

/**
 * Takes the raw shareIntent object returned by expo-share-intent
 * and returns { url, title, notes }.
 *
 * shareIntent properties used:
 *   - webUrl  – direct URL (most common for browser/app shares)
 *   - text    – plain text (may contain a URL or be a note)
 *   - title   – page title if available
 *   - files   – file array (not handled here — this app is link-focused)
 */
export function processShareIntent(shareIntent) {
  if (!shareIntent) {
    return { url: '', title: '', notes: '' };
  }

  const webUrl = shareIntent.webUrl || '';
  const rawText = shareIntent.text || '';
  const title = shareIntent.title || '';

  // Prefer an explicit web URL; fall back to extracting one from plain text
  const url = webUrl || extractUrlFromText(rawText);

  // If the text is just the URL itself, don't duplicate it as a note
  const notes = rawText && rawText.trim() !== url.trim() ? rawText : '';

  return { url, title, notes };
}
