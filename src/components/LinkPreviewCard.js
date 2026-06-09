import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { extractDomain, detectPlatform } from '../utils/urlUtils';

// Maps platform slugs to Ionicons names for the no-image placeholder
const PLATFORM_ICONS = {
  youtube:   'logo-youtube',
  tiktok:    'musical-notes',
  instagram: 'logo-instagram',
  twitter:   'logo-twitter',
  reddit:    'logo-reddit',
  vimeo:     'film-outline',
  link:      'link-outline',
};

export default function LinkPreviewCard({ preview, url, onRetry }) {
  const [imgError, setImgError] = useState(false);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (preview?.loading) {
    return (
      <View style={styles.loadingRow}>
        <ActivityIndicator size="small" color="#6C63FF" />
        <Text style={styles.loadingText}>Fetching preview…</Text>
      </View>
    );
  }

  // ── Nothing to show yet ────────────────────────────────────────────────────
  if (!preview) return null;

  const hasImage = !!preview.imageUrl && !imgError;
  const hasContent = preview.title || preview.description || hasImage;
  const platform = detectPlatform(url);
  const platformIcon = PLATFORM_ICONS[platform] || PLATFORM_ICONS.link;

  // ── No metadata available ──────────────────────────────────────────────────
  if (!hasContent) {
    return (
      <View style={styles.emptyRow}>
        <Ionicons name="alert-circle-outline" size={15} color="#9CA3AF" />
        <Text style={styles.emptyText}>No preview available</Text>
        {onRetry && (
          <TouchableOpacity onPress={onRetry} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // ── Full preview ───────────────────────────────────────────────────────────
  return (
    <View style={styles.card}>
      {/* Thumbnail */}
      {hasImage ? (
        <Image
          source={{ uri: preview.imageUrl }}
          style={styles.thumbnail}
          resizeMode="cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <View style={styles.iconPlaceholder}>
          <Ionicons name={platformIcon} size={28} color="#9CA3AF" />
        </View>
      )}

      {/* Text info */}
      <View style={styles.info}>
        {preview.title ? (
          <Text style={styles.previewTitle} numberOfLines={2}>
            {preview.title}
          </Text>
        ) : null}
        <Text style={styles.domain}>{extractDomain(url)}</Text>
        {preview.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {preview.description}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  loadingText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  emptyText: {
    flex: 1,
    fontSize: 13,
    color: '#9CA3AF',
  },
  retryBtn: {
    paddingHorizontal: 8,
  },
  retryText: {
    fontSize: 13,
    color: '#6C63FF',
    fontWeight: '600',
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  thumbnail: {
    width: 90,
    height: 90,
    backgroundColor: '#E5E7EB',
    flexShrink: 0,
  },
  iconPlaceholder: {
    width: 90,
    height: 90,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  info: {
    flex: 1,
    padding: 10,
    justifyContent: 'center',
    gap: 3,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A2E',
    lineHeight: 18,
  },
  domain: {
    fontSize: 11,
    color: '#6C63FF',
    fontWeight: '600',
  },
  description: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
});
