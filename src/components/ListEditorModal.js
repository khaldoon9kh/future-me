import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { storageService } from '../storage/storageService';
import { LIST_COLORS, LIST_ICONS } from '../constants/lists';

/**
 * Create or edit a list.
 *   list      – the list to edit, or null to create a new one
 *   lists     – all existing lists (used to block duplicate names)
 *   onSaved   – called with the created/updated list
 *   onDeleted – called with the id of a deleted list
 */
export default function ListEditorModal({ visible, list, lists = [], onClose, onSaved, onDeleted }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(LIST_COLORS[0]);
  const [icon, setIcon] = useState(LIST_ICONS[0]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Reset the form each time the modal opens
  useEffect(() => {
    if (!visible) return;
    setName(list?.name ?? '');
    setColor(list?.color ?? LIST_COLORS[lists.length % LIST_COLORS.length]);
    setIcon(list?.icon ?? LIST_ICONS[0]);
    setError('');
  }, [visible, list]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Give the list a name.');
      return;
    }
    const duplicate = lists.some(
      (l) => l.id !== list?.id && l.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      setError('You already have a list with that name.');
      return;
    }

    setSaving(true);
    try {
      const saved = list
        ? await storageService.updateList(list.id, { name: trimmed, color, icon })
        : await storageService.createList({ name: trimmed, color, icon });
      onSaved?.(saved);
      onClose();
    } catch {
      Alert.alert('Error', 'Could not save the list. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      `Delete "${list.name}"?`,
      'The list is removed, but the posts in it are kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete List',
          style: 'destructive',
          onPress: async () => {
            try {
              await storageService.deleteList(list.id);
              onDeleted?.(list.id);
              onClose();
            } catch {
              Alert.alert('Error', 'Could not delete the list. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{list ? 'Edit List' : 'New List'}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Name + live preview of the chip */}
            <View style={styles.nameRow}>
              <View style={[styles.previewIcon, { backgroundColor: `${color}18` }]}>
                <Ionicons name={icon} size={20} color={color} />
              </View>
              <TextInput
                style={styles.nameInput}
                value={name}
                onChangeText={(t) => {
                  setName(t);
                  setError('');
                }}
                placeholder="e.g. Games, Music, Movies"
                placeholderTextColor="#C4C9D4"
                maxLength={30}
                autoFocus={!list}
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Text style={styles.label}>Color</Text>
            <View style={styles.grid}>
              {LIST_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorDotActive]}
                  onPress={() => setColor(c)}
                >
                  {color === c && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Icon</Text>
            <View style={styles.grid}>
              {LIST_ICONS.map((i) => {
                const active = icon === i;
                return (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.iconOption,
                      active && { borderColor: color, backgroundColor: `${color}12` },
                    ]}
                    onPress={() => setIcon(i)}
                  >
                    <Ionicons name={i} size={20} color={active ? color : '#9CA3AF'} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.actions}>
            {list ? (
              <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveBtnText}>{list ? 'Save' : 'Create List'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 8,
  },
  previewIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameInput: {
    flex: 1,
    fontSize: 15,
    color: '#1A1A2E',
    padding: 0,
  },
  error: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 6,
    marginLeft: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 18,
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDotActive: {
    borderWidth: 2,
    borderColor: '#1A1A2E',
  },
  iconOption: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  deleteBtn: {
    width: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#6C63FF',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
