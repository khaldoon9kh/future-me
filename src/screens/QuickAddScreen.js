import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { storageService } from '../storage/storageService';
import { notificationService } from '../services/notificationService';
import { fetchLinkMetadata } from '../services/linkMetadataService';
import { normalizeUrl, isValidUrl } from '../utils/urlUtils';
import { formatDateTime } from '../utils/dateUtils';
import LinkPreviewCard from '../components/LinkPreviewCard';

// Action type options shown in the picker grid
const ACTION_TYPES = [
  { key: 'reminder', label: 'Reminder', icon: 'alarm-outline', color: '#F59E0B' },
  { key: 'send_later', label: 'Send Later', icon: 'paper-plane-outline', color: '#10B981' },
  { key: 'other', label: 'Other', icon: 'ellipsis-horizontal-circle-outline', color: '#6B7280' },
];

// Default reminder is 1 hour from now
const defaultReminderDate = () => {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return d;
};

export default function QuickAddScreen() {
  const navigation = useNavigation();
  const route = useRoute();

  // Form state
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [actionType, setActionType] = useState('reminder');
  const [reminderDate, setReminderDate] = useState(defaultReminderDate());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Link preview state: null | { loading: true } | { title, description, imageUrl }
  const [preview, setPreview] = useState(null);
  const fetchTimerRef = useRef(null);

  // Edit mode state
  const [editItemId, setEditItemId] = useState(null);
  const isEditMode = !!editItemId;

  // Pre-fill the form when receiving shared content or editing an existing item
  useEffect(() => {
    const params = route.params || {};

    if (params.editMode && params.itemData) {
      // Editing an existing item: restore all fields
      const item = params.itemData;
      setEditItemId(item.id);
      setUrl(item.url || '');
      setTitle(item.title || '');
      setActionType(item.actionType || 'reminder');
      if (item.reminderDateTime) setReminderDate(new Date(item.reminderDateTime));
      setRecipientName(item.recipientName || '');
      setNotes(item.notes || '');
      // Show stored preview data for edit mode (no re-fetch needed)
      if (item.imageUrl || item.description) {
        setPreview({ title: item.title, description: item.description || '', imageUrl: item.imageUrl || '' });
      }
    } else {
      // New item — pre-fill from share intent data if present
      if (params.sharedUrl) setUrl(normalizeUrl(params.sharedUrl));
      if (params.sharedTitle) setTitle(params.sharedTitle);
      if (params.sharedNotes) setNotes(params.sharedNotes);
    }
  }, []);

  // Debounced URL → metadata fetch (600 ms after the user stops typing)
  useEffect(() => {
    if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current);
    const normalized = url.trim() ? normalizeUrl(url.trim()) : '';
    if (!normalized || !isValidUrl(normalized)) {
      setPreview(null);
      return;
    }
    setPreview({ loading: true });
    fetchTimerRef.current = setTimeout(async () => {
      const meta = await fetchLinkMetadata(normalized);
      setPreview(meta);
    }, 600);
    return () => {
      if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current);
    };
  }, [url]);

  // Auto-fill title from preview when the title field is still blank
  useEffect(() => {
    if (preview && !preview.loading && preview.title && !title.trim() && !isEditMode) {
      setTitle(preview.title);
    }
  }, [preview]);

  const handleSave = async () => {
    if (!url.trim() && !title.trim() && !notes.trim()) {
      Alert.alert('Nothing to save', 'Add at least a URL, title, or note.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        url: url.trim() ? normalizeUrl(url.trim()) : '',
        title: title.trim(),
        actionType,
        reminderDateTime:
          (actionType === 'reminder' || actionType === 'send_later') ? reminderDate.toISOString() : null,
        recipientName: actionType === 'send_later' ? recipientName.trim() : '',
        notes: notes.trim(),
        imageUrl: preview && !preview.loading ? (preview.imageUrl || '') : '',
        description: preview && !preview.loading ? (preview.description || '') : '',
      };

      if (isEditMode) {
        // Cancel the previously scheduled notification before saving updated fields.
        // Without this, the old notification would still fire at the original time.
        const all = await storageService.getAllItems();
        const existing = all.find((i) => i.id === editItemId);
        if (existing?.notificationId) {
          await notificationService.cancelReminder(existing.notificationId);
        }

        const isFuture =
          (actionType === 'reminder' || actionType === 'send_later') &&
          reminderDate > new Date();

        // Auto-clear completed when the user reschedules to a future time
        // so the item re-enters the active inbox.
        await storageService.updateItem(editItemId, {
          ...payload,
          notificationId: null,
          ...(isFuture && { completed: false }),
        });

        // Re-schedule notification for future-dated timed actions.
        if (isFuture) {
          const updatedItem = { ...existing, ...payload, id: editItemId, completed: false };
          const notifId = await notificationService.scheduleReminder(updatedItem);
          if (notifId) {
            await storageService.updateItem(editItemId, { notificationId: notifId });
          }
        }
      } else {
        const saved = await storageService.saveItem(payload);
        // Schedule a local notification for reminders and send_later.
        if ((actionType === 'reminder' || actionType === 'send_later') && reminderDate > new Date()) {
          const notifId = await notificationService.scheduleReminder(saved);
          if (notifId) {
            await storageService.updateItem(saved.id, { notificationId: notifId });
          }
        }
      }

      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Could not save the item. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Date/time picker handlers ──

  const onDateChange = (event, selected) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selected) {
      const next = new Date(reminderDate);
      next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      setReminderDate(next);
    }
  };

  const onTimeChange = (event, selected) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (selected) {
      const next = new Date(reminderDate);
      next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      setReminderDate(next);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditMode ? 'Edit Item' : 'Quick Add'}
          </Text>
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveBtnText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── URL ── */}
          <Field label="URL">
            <InputRow icon="link-outline">
              <TextInput
                style={styles.textInput}
                value={url}
                onChangeText={setUrl}
                placeholder="https://..."
                placeholderTextColor="#C4C9D4"
                autoCapitalize="none"
                keyboardType="url"
                autoCorrect={false}
                returnKeyType="next"
              />
            </InputRow>
          </Field>

          {/* ── Link Preview ── */}
          {preview && (
            <View style={styles.previewWrap}>
              <LinkPreviewCard
                preview={preview}
                url={url}
                onRetry={() => {
                  setPreview({ loading: true });
                  fetchLinkMetadata(normalizeUrl(url.trim())).then(setPreview);
                }}
              />
            </View>
          )}

          {/* ── Title ── */}
          <Field label="Title (optional)">
            <InputRow icon="text-outline">
              <TextInput
                style={styles.textInput}
                value={title}
                onChangeText={setTitle}
                placeholder="Add a descriptive title..."
                placeholderTextColor="#C4C9D4"
                returnKeyType="next"
              />
            </InputRow>
          </Field>

          {/* ── Action type grid ── */}
          <Field label="What do you want to do with this?">
            <View style={styles.actionGrid}>
              {ACTION_TYPES.map((type) => {
                const active = actionType === type.key;
                return (
                  <TouchableOpacity
                    key={type.key}
                    style={[
                      styles.actionOption,
                      active && {
                        borderColor: type.color,
                        backgroundColor: `${type.color}12`,
                      },
                    ]}
                    onPress={() => setActionType(type.key)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={type.icon}
                      size={22}
                      color={active ? type.color : '#9CA3AF'}
                    />
                    <Text
                      style={[
                        styles.actionLabel,
                        active && { color: type.color, fontWeight: '700' },
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Field>

          {/* ── Reminder date/time ── */}
          {(actionType === 'reminder' || actionType === 'send_later') && (
            <>
              <Field label="Pick a date">
                <TouchableOpacity
                  style={styles.datePickerBtn}
                  onPress={() => setShowDatePicker(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="calendar-outline" size={18} color="#6C63FF" />
                  <Text style={styles.datePickerText}>
                    {reminderDate.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
                </TouchableOpacity>

                {showDatePicker && Platform.OS === 'android' && (
                  <DateTimePicker
                    value={reminderDate}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                    minimumDate={new Date()}
                  />
                )}

                {showDatePicker && Platform.OS === 'ios' && (
                  <View style={styles.iosPickerWrap}>
                    <DateTimePicker
                      value={reminderDate}
                      mode="date"
                      display="spinner"
                      onChange={onDateChange}
                      minimumDate={new Date()}
                      style={styles.iosPicker}
                      textColor="#1A1A2E"
                    />
                    <TouchableOpacity
                      style={styles.iosPickerDone}
                      onPress={() => setShowDatePicker(false)}
                    >
                      <Text style={styles.iosPickerDoneText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </Field>

              <Field label="Pick a time">
                <TouchableOpacity
                  style={styles.datePickerBtn}
                  onPress={() => setShowTimePicker(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="time-outline" size={18} color="#6C63FF" />
                  <Text style={styles.datePickerText}>
                    {reminderDate.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
                </TouchableOpacity>

                {showTimePicker && Platform.OS === 'android' && (
                  <DateTimePicker
                    value={reminderDate}
                    mode="time"
                    display="default"
                    onChange={onTimeChange}
                  />
                )}

                {showTimePicker && Platform.OS === 'ios' && (
                  <View style={styles.iosPickerWrap}>
                    <DateTimePicker
                      value={reminderDate}
                      mode="time"
                      display="spinner"
                      onChange={onTimeChange}
                      style={styles.iosPicker}
                      textColor="#1A1A2E"
                    />
                    <TouchableOpacity
                      style={styles.iosPickerDone}
                      onPress={() => setShowTimePicker(false)}
                    >
                      <Text style={styles.iosPickerDoneText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </Field>
            </>
          )}

          {/* ── Recipient ── */}
          {actionType === 'send_later' && (
            <Field label="Send to">
              <InputRow icon="person-outline">
                <TextInput
                  style={styles.textInput}
                  value={recipientName}
                  onChangeText={setRecipientName}
                  placeholder="Name or contact..."
                  placeholderTextColor="#C4C9D4"
                  returnKeyType="next"
                />
              </InputRow>
            </Field>
          )}

          {/* ── Notes ── */}
          <Field label="Notes">
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add a private note about this item..."
              placeholderTextColor="#C4C9D4"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </Field>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Small helpers ──────────────────────────────────────────────────────────

function Field({ label, children }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function InputRow({ icon, children }) {
  return (
    <View style={styles.inputRow}>
      <Ionicons name={icon} size={18} color="#9CA3AF" style={styles.inputIcon} />
      {children}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 24 : 0,
  },
  flex: {
    flex: 1,
    paddingTop: 8,
    marginTop: 24,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  closeBtn: {
    padding: 4,
    width: 36,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  saveBtn: {
    backgroundColor: '#6C63FF',
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 20,
    minWidth: 72,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  form: {
    padding: 20,
    paddingBottom: 48,
  },
  field: {
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#1A1A2E',
    padding: 0,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionOption: {
    width: '47.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F0EEFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  datePickerText: {
    flex: 1,
    fontSize: 15,
    color: '#6C63FF',
    fontWeight: '500',
  },
  iosPickerWrap: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    padding: 4,
  },
  iosPicker: {
    height: 120,
  },
  iosPickerDone: {
    alignSelf: 'flex-end',
    backgroundColor: '#6C63FF',
    marginTop: 4,
    marginBottom: 4,
    marginRight: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  iosPickerDoneText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  notesInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    fontSize: 15,
    color: '#1A1A2E',
    minHeight: 110,
  },
  previewWrap: {
    marginTop: -8,
    marginBottom: 16,
  },
});
