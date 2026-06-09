/** Returns the domain name stripped of "www.", e.g. "youtube.com". */
export function extractDomain(url) {
  if (!url) return '';
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** Adds "https://" if the URL has no scheme. */
export function normalizeUrl(url) {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return `https://${trimmed}`;
}

/** Returns true for strings that look like a URL. */
export function isValidUrl(str) {
  if (!str) return false;
  try {
    new URL(str);
    return true;
  } catch {
    try {
      new URL(`https://${str}`);
      return str.includes('.');
    } catch {
      return false;
    }
  }
}

/** Maps a URL to a known platform slug for icon selection. */
export function detectPlatform(url) {
  if (!url) return 'link';
  const lower = url.toLowerCase();
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
  if (lower.includes('tiktok.com')) return 'tiktok';
  if (lower.includes('instagram.com')) return 'instagram';
  if (lower.includes('twitter.com') || lower.includes('x.com')) return 'twitter';
  if (lower.includes('reddit.com')) return 'reddit';
  if (lower.includes('vimeo.com')) return 'vimeo';
  return 'link';
}

/** Ionicons icon name for a given platform slug. */
export function platformIcon(platform) {
  const map = {
    youtube: 'logo-youtube',
    tiktok: 'musical-notes-outline',
    instagram: 'logo-instagram',
    twitter: 'logo-twitter',
    reddit: 'logo-reddit',
    link: 'link-outline',
  };
  return map[platform] || 'link-outline';
}
