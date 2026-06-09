import { normalizeUrl, detectPlatform } from '../utils/urlUtils';

const TIMEOUT_MS = 7000;

// oEmbed endpoints that work without authentication
const OEMBED_ENDPOINTS = {
  youtube: 'https://www.youtube.com/oembed',
  tiktok:  'https://www.tiktok.com/oembed',
  vimeo:   'https://vimeo.com/api/oembed.json',
  twitter: 'https://publish.twitter.com/oembed',
};

// ── Utilities ────────────────────────────────────────────────────────────────

function withTimeout(ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, clear: () => clearTimeout(timer) };
}

function decodeEntities(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
    .trim();
}

/**
 * Extracts the `content` attribute of a meta tag identified by
 * property/name=`key`, handling both attribute orderings.
 */
function extractMeta(html, key, attrType = 'property') {
  // attr before content
  const p1 = new RegExp(
    `${attrType}=["']${key}["'][^>]*content=["']([^"']{1,2000})["']`,
    'i'
  );
  // content before attr
  const p2 = new RegExp(
    `content=["']([^"']{1,2000})["'][^>]*${attrType}=["']${key}["']`,
    'i'
  );
  const m = html.match(p1) || html.match(p2);
  return m ? decodeEntities(m[1]) : '';
}

function parseHtml(html) {
  // Limit parsing to first 60 kB — avoids huge script blobs after <head>
  const head = html.slice(0, 60000);

  const title =
    extractMeta(head, 'og:title') ||
    extractMeta(head, 'twitter:title') ||
    (() => {
      const m = head.match(/<title[^>]*>([^<]{1,300})<\/title>/i);
      return m ? decodeEntities(m[1]) : '';
    })();

  const description =
    extractMeta(head, 'og:description') ||
    extractMeta(head, 'twitter:description') ||
    extractMeta(head, 'description', 'name');

  const imageUrl =
    extractMeta(head, 'og:image') ||
    extractMeta(head, 'og:image:secure_url') ||
    extractMeta(head, 'twitter:image') ||
    extractMeta(head, 'twitter:image:src') ||
    extractMeta(head, 'twitter:image', 'name');

  return {
    title:       title.slice(0, 200),
    description: description.slice(0, 400),
    imageUrl,
  };
}

// ── oEmbed ───────────────────────────────────────────────────────────────────

async function tryOEmbed(platform, url) {
  const base = OEMBED_ENDPOINTS[platform];
  if (!base) return null;

  const { signal, clear } = withTimeout(5000);
  try {
    const res = await fetch(
      `${base}?url=${encodeURIComponent(url)}&format=json`,
      { signal }
    );
    clear();
    if (!res.ok) return null;

    const data = await res.json();

    // Twitter oEmbed returns embed HTML — strip tags to get text content
    let description = '';
    if (platform === 'twitter' && data.html) {
      description = data.html
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim()
        .slice(0, 400);
    } else if (data.author_name) {
      description = `by ${data.author_name}`;
    }

    return {
      title:       (data.title || '').slice(0, 200),
      description,
      imageUrl:    data.thumbnail_url || '',
    };
  } catch {
    clear();
    return null;
  }
}

// ── Open Graph fallback ──────────────────────────────────────────────────────

async function tryOpenGraph(url) {
  const { signal, clear } = withTimeout(TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal,
      headers: {
        // Present as a mobile browser so sites serve full meta tags
        'User-Agent':
          'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    clear();
    if (!res.ok) return null;

    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('text/html') && !ct.includes('application/xhtml')) return null;

    const text = await res.text();
    return parseHtml(text);
  } catch {
    clear();
    return null;
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetches title, description, and imageUrl for any URL.
 *
 * Strategy (per platform):
 *   YouTube / TikTok / Vimeo / Twitter  →  oEmbed API (no auth needed)
 *   Instagram / Reddit / all others     →  fetch HTML and parse OG/Twitter-card tags
 *
 * Always resolves — never rejects. Returns empty strings on any failure.
 */
export async function fetchLinkMetadata(rawUrl) {
  try {
    const url = normalizeUrl(rawUrl);
    if (!url) return { title: '', description: '', imageUrl: '' };

    const platform = detectPlatform(url);

    // Try oEmbed first for supported platforms
    if (OEMBED_ENDPOINTS[platform]) {
      const result = await tryOEmbed(platform, url);
      if (result && (result.title || result.imageUrl)) return result;
    }

    // Fall back to parsing Open Graph tags from the page HTML
    const og = await tryOpenGraph(url);
    return og || { title: '', description: '', imageUrl: '' };
  } catch {
    return { title: '', description: '', imageUrl: '' };
  }
}
