/**
 * CreateEditScreen.tsx
 *
 * Create or edit a track.
 * Tags: predefined chips + ability to type a custom tag.
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { CreateEditScreenNavigationProp, CreateEditScreenRouteProp } from '../../navigation/types';
import { useTrackContext } from '../../context/TrackContext';
import { useTheme } from '../../context/ThemeContext';
import { PREDEFINED_TAGS, TaskStatus } from '../../types/Track';
import { SafeAreaView } from '../../components/layout/SafeAreaView';

interface Props {
  navigation: CreateEditScreenNavigationProp;
  route: CreateEditScreenRouteProp;
}

export default function CreateEditScreen({ navigation, route }: Props) {
  const { id } = route.params ?? {};
  const { addTrack, updateTrack, getTrackById } = useTrackContext();
  const { colors } = useTheme();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('created');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');

  const isEdit = !!id;

  useEffect(() => {
    if (id) {
      const track = getTrackById(id);
      if (track) {
        setTitle(track.title);
        setDescription(track.description);
        setStatus(track.status);
        setPriority(track.priority);
        setSelectedTags(track.tags ?? []);
      }
    }
  }, [id]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const addCustomTag = () => {
    const tag = customTag.trim().toLowerCase().replace(/\s+/g, '-');
    if (!tag || selectedTags.includes(tag)) {
      setCustomTag('');
      return;
    }
    setSelectedTags((prev) => [...prev, tag]);
    setCustomTag('');
  };

  const removeTag = (tag: string) => {
    setSelectedTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Please enter a title for this track.');
      return;
    }

    try {
      if (isEdit && id) {
        await updateTrack(id, {
          title: title.trim(),
          description: description.trim(),
          status,
          priority,
          tags: selectedTags,
          endTime: status === 'completed' ? new Date() : undefined,
        });
        Alert.alert('Updated', 'Track updated successfully.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        await addTrack({
          title: title.trim(),
          description: description.trim(),
          status,
          priority,
          taskType: 'unallocated',
          tags: selectedTags,
          startTime: new Date(),
          endTime: status === 'completed' ? new Date() : undefined,
        });
        Alert.alert('Created', 'Track created successfully.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch {
      Alert.alert('Error', 'Failed to save. Please try again.');
    }
  };

  const s = makeStyles(colors);

  return (
    <SafeAreaView edges={['bottom']}>
      <ScrollView style={s.container} keyboardShouldPersistTaps="handled">
        <Text style={s.screenTitle}>{isEdit ? 'Edit Track' : 'New Track'}</Text>

        {/* Title */}
        <Text style={s.label}>Title <Text style={s.required}>*</Text></Text>
        <TextInput
          style={s.input}
          placeholder="What are you working on?"
          placeholderTextColor={colors.textTertiary}
          value={title}
          onChangeText={setTitle}
        />

        {/* Description */}
        <Text style={s.label}>Description</Text>
        <TextInput
          style={[s.input, s.textArea]}
          placeholder="Add more context (optional)"
          placeholderTextColor={colors.textTertiary}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        {/* Status */}
        <Text style={s.label}>Status</Text>
        <View style={s.chips}>
          {(['pending', 'in-progress', 'completed'] as const).map((s_) => (
            <TouchableOpacity
              key={s_}
              style={[s.chip, status === s_ && s.chipActive]}
              onPress={() => setStatus(s_)}
            >
              <Text style={[s.chipText, status === s_ && s.chipTextActive]}>{s_}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Priority */}
        <Text style={s.label}>Priority</Text>
        <View style={s.chips}>
          {(['low', 'medium', 'high'] as const).map((p) => (
            <TouchableOpacity
              key={p}
              style={[s.chip, priority === p && s.chipActive]}
              onPress={() => setPriority(p)}
            >
              <Text style={[s.chipText, priority === p && s.chipTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tags */}
        <Text style={s.label}>Tags</Text>

        {/* Selected tags */}
        {selectedTags.length > 0 && (
          <View style={s.selectedTags}>
            {selectedTags.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={s.selectedTag}
                onPress={() => removeTag(tag)}
              >
                <Text style={s.selectedTagText}>#{tag}</Text>
                <Text style={s.selectedTagRemove}> ✕</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Predefined tag chips */}
        <View style={s.chips}>
          {PREDEFINED_TAGS.filter((t) => !selectedTags.includes(t)).map((tag) => (
            <TouchableOpacity
              key={tag}
              style={s.chip}
              onPress={() => toggleTag(tag)}
            >
              <Text style={s.chipText}>+ {tag}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Custom tag input */}
        <View style={s.customTagRow}>
          <TextInput
            style={[s.input, s.customTagInput]}
            placeholder="Add custom tag…"
            placeholderTextColor={colors.textTertiary}
            value={customTag}
            onChangeText={setCustomTag}
            onSubmitEditing={addCustomTag}
            returnKeyType="done"
            autoCapitalize="none"
          />
          <TouchableOpacity style={s.addTagBtn} onPress={addCustomTag}>
            <Text style={s.addTagBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Actions */}
        <View style={s.actions}>
          <TouchableOpacity style={s.cancelBtn} onPress={() => navigation.goBack()}>
            <Text style={s.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
            <Text style={s.saveBtnText}>{isEdit ? 'Update' : 'Create'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, padding: 20 },
    screenTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 20,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      marginTop: 18,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    required: { color: colors.priorityHigh },
    input: {
      backgroundColor: colors.surface,
      color: colors.text,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      fontSize: 15,
    },
    textArea: { height: 100 },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    chipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    chipText: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    chipTextActive: {
      color: '#fff',
    },
    selectedTags: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 10,
    },
    selectedTag: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: colors.primary + '22',
      borderWidth: 1,
      borderColor: colors.primary,
    },
    selectedTagText: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '500',
    },
    selectedTagRemove: {
      color: colors.primary,
      fontSize: 12,
      marginLeft: 2,
    },
    customTagRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 12,
      alignItems: 'center',
    },
    customTagInput: { flex: 1 },
    addTagBtn: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: colors.primary,
    },
    addTagBtnText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 14,
    },
    actions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 36,
      marginBottom: 20,
    },
    cancelBtn: {
      flex: 1,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    cancelBtnText: {
      color: colors.textSecondary,
      fontSize: 16,
      fontWeight: '600',
    },
    saveBtn: {
      flex: 1,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      backgroundColor: colors.primary,
    },
    saveBtnText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
  });
}
