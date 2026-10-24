import { normalizeUrl, detectPlatform } from '../utils/urlUtils';

const TIMEOUT_MS = 7000;

const MOBILE_UA =
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

// Instagram serves a login wall (no OG tags) to normal browsers, but still
// serves full OG tags to Facebook's link-preview crawler.
const CRAWLER_UA =
  'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)';

const EMPTY = { title: '', description: '', imageUrl: '' };

// oEmbed endpoints that work without authentication.
// (TikTok's oEmbed now returns only an iframe — no title or thumbnail —
// so TikTok is handled by tryTikTok below instead.)
const OEMBED_ENDPOINTS = {
  youtube: 'https://www.youtube.com/oembed',
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
  // Match the value inside its own quote type so apostrophes in a
  // double-quoted value (e.g. "Don't miss this") don't cut it short.
  const val = `(?:"([^"]{1,2000})"|'([^']{1,2000})')`;
  // attr before content
  const p1 = new RegExp(
    `<meta[^>]*?${attrType}=["']${key}["'][^>]*?content=${val}`,
    'i'
  );
  // content before attr
  const p2 = new RegExp(
    `<meta[^>]*?content=${val}[^>]*?${attrType}=["']${key}["']`,
    'i'
  );
  const m = html.match(p1) || html.match(p2);
  return m ? decodeEntities(m[1] ?? m[2]) : '';
}

function parseHtml(html) {
  // Only parse <head>. Some sites (Instagram) put 100 kB+ of inline scripts
  // before their meta tags, so a fixed byte cut-off misses them.
  const headEnd = html.indexOf('</head>');
  const head = html.slice(0, headEnd > 0 ? headEnd : 500000);

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

async function fetchHtml(url, userAgent = MOBILE_UA) {
  const { signal, clear } = withTimeout(TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal,
      headers: {
        'User-Agent': userAgent,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (!res.ok) return null;

    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('text/html') && !ct.includes('application/xhtml')) return null;

    const html = await res.text();
    return { html, finalUrl: res.url || url };
  } catch {
    return null;
  } finally {
    clear();
  }
}

async function tryOpenGraph(url, userAgent) {
  const page = await fetchHtml(url, userAgent);
  return page ? parseHtml(page.html) : null;
}

// ── Instagram ────────────────────────────────────────────────────────────────

// Matches /p/CODE, /reel/CODE, /reels/CODE, /tv/CODE and /username/p/CODE
const IG_SHORTCODE = /instagram\.com\/(?:[^/?#]+\/)?(?:p|reels?|tv)\/([A-Za-z0-9_-]+)/i;

function instagramShortcode(url) {
  const m = (url || '').match(IG_SHORTCODE);
  return m ? m[1] : '';
}

/** Login walls and error pages come back with a bare "Instagram" title and no image. */
function isUsefulInstagramMeta(meta) {
  if (!meta) return false;
  if (meta.imageUrl) return true;
  return !!meta.title && !/^(?:login\s*•\s*)?instagram$/i.test(meta.title.trim());
}

/** Parses the public embed page (instagram.com/p/CODE/embed/captioned/). */
function parseInstagramEmbed(html) {
  const imgTag = html.match(/<img[^>]*class="[^"]*EmbeddedMediaImage[^"]*"[^>]*>/i);
  const src = imgTag && imgTag[0].match(/\ssrc="([^"]+)"/i);
  let imageUrl = src ? decodeEntities(src[1]) : '';
  if (!imageUrl) {
    // Video posts keep the poster image in embedded JSON instead of an <img>
    const json = html.match(/"display_url"\s*:\s*"([^"]+)"/);
    if (json) imageUrl = json[1].replace(/\\\//g, '/').replace(/\\u0026/g, '&');
  }

  const userMatch = html.match(/class="[^"]*UsernameText[^"]*"[^>]*>([^<]{1,100})</i);
  const username = userMatch ? decodeEntities(userMatch[1]) : '';

  let caption = '';
  const capMatch = html.match(/<div[^>]*class="[^"]*Caption[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  if (capMatch) {
    caption = decodeEntities(
      capMatch[1]
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s{2,}/g, ' ')
    );
    // The caption block starts with the username — drop the duplicate
    if (username && caption.startsWith(username)) {
      caption = caption.slice(username.length).trim();
    }
  }

  return {
    title:       (username ? `${username} on Instagram` : '').slice(0, 200),
    description: caption.slice(0, 400),
    imageUrl,
  };
}

async function tryInstagram(url) {
  // Drop share-tracking params (?igsh=…, ?utm_source=…) — they add nothing
  const clean = url.split(/[?#]/)[0];

  // 1. The page itself, requested as Facebook's crawler
  const page = await fetchHtml(clean, CRAWLER_UA);
  if (page) {
    const og = parseHtml(page.html);
    if (isUsefulInstagramMeta(og)) return og;
  }

  // 2. The public embed page. Short /share/ links only reveal the shortcode
  //    after redirecting, so check the final URL too.
  const code = instagramShortcode(page?.finalUrl) || instagramShortcode(clean);
  if (!code) return null;

  const embed = await fetchHtml(`https://www.instagram.com/p/${code}/embed/captioned/`);
  if (!embed) return null;
  const meta = parseInstagramEmbed(embed.html);
  return meta.title || meta.imageUrl ? meta : null;
}

// ── TikTok ───────────────────────────────────────────────────────────────────

// Matches /@user/video/ID and /@user/photo/ID
const TIKTOK_POST = /tiktok\.com\/@[^/?#]+\/(?:video|photo)\/\d+/i;

async function tryTikTok(url) {
  // Like Instagram, TikTok serves a JS-only shell to browsers but full OG
  // tags to Facebook's crawler. Short vt./vm.tiktok.com links redirect to the
  // post; fetch follows that.
  const page = await fetchHtml(url, CRAWLER_UA);
  if (!page) return null;

  // Dead or expired short links redirect to the homepage, whose generic
  // "TikTok - Make Your Day" tags would be a misleading preview.
  if (!TIKTOK_POST.test(page.finalUrl) && !TIKTOK_POST.test(url)) return null;

  const og = parseHtml(page.html);
  // og:title comes back as "TikTok · Author Name"
  const author = og.title.replace(/^TikTok\s*·\s*/i, '').trim();
  return {
    title:       author ? `${author} on TikTok` : og.title,
    description: og.description,
    imageUrl:    og.imageUrl,
  };
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetches title, description, and imageUrl for any URL.
 *
 * Strategy (per platform):
 *   YouTube / Vimeo / Twitter           →  oEmbed API (no auth needed)
 *   Instagram                           →  OG tags via crawler UA, then public embed page
 *   TikTok                              →  OG tags via crawler UA
 *   Reddit / all others                 →  fetch HTML and parse OG/Twitter-card tags
 *
 * Always resolves — never rejects. Returns empty strings on any failure.
 */
export async function fetchLinkMetadata(rawUrl) {
  try {
    const url = normalizeUrl(rawUrl);
    if (!url) return EMPTY;

    const platform = detectPlatform(url);

    if (platform === 'instagram') {
      const ig = await tryInstagram(url);
      if (ig) return ig;
    }

    if (platform === 'tiktok') {
      // The generic fallback only ever sees TikTok's homepage shell
      const tt = await tryTikTok(url);
      return tt && (tt.title || tt.imageUrl) ? tt : EMPTY;
    }

    // Try oEmbed first for supported platforms
    if (OEMBED_ENDPOINTS[platform]) {
      const result = await tryOEmbed(platform, url);
      if (result && (result.title || result.imageUrl)) return result;
    }

    // Fall back to parsing Open Graph tags from the page HTML
    const og = await tryOpenGraph(url);
    return og || EMPTY;
  } catch {
    return EMPTY;
  }
}
