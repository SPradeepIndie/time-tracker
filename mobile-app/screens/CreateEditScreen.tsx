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
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/Track';
import { useTrackContext } from '../context/TrackContext';

type CreateEditScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'CreateEdit'
>;
type CreateEditScreenRouteProp = RouteProp<RootStackParamList, 'CreateEdit'>;

interface Props {
  navigation: CreateEditScreenNavigationProp;
  route: CreateEditScreenRouteProp;
}

export default function CreateEditScreen({ navigation, route }: Props) {
  const { trackId } = route.params;
  const { addTrack, updateTrack, getTrackById } = useTrackContext();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'pending' | 'in-progress' | 'completed'>('pending');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [tags, setTags] = useState('');

  const isEdit = !!trackId;

  useEffect(() => {
    if (trackId) {
      const track = getTrackById(trackId);
      if (track) {
        setTitle(track.title);
        setDescription(track.description);
        setStatus(track.status);
        setPriority(track.priority);
        setTags(track.tags?.join(', ') || '');
      }
    }
  }, [trackId]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }

    const tagsArray = tags
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    try {
      if (isEdit && trackId) {
        await updateTrack(trackId, {
          title: title.trim(),
          description: description.trim(),
          status,
          priority,
          tags: tagsArray,
        });
        Alert.alert('Success', 'Track updated successfully', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        await addTrack({
          title: title.trim(),
          description: description.trim(),
          status,
          priority,
          tags: tagsArray,
          startTime: new Date(),
          endTime: status === 'completed' ? new Date() : undefined,
        });
        Alert.alert('Success', 'Track created successfully', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save track. Please try again.');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {isEdit ? 'Edit Track' : 'Create New Track'}
        </Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter track title"
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Enter track description"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />

        <Text style={styles.label}>Status</Text>
        <View style={styles.optionsContainer}>
          {['pending', 'in-progress', 'completed'].map((s) => (
            <TouchableOpacity
              key={s}
              style={[
                styles.optionButton,
                status === s && styles.optionButtonActive,
              ]}
              onPress={() => setStatus(s as any)}
            >
              <Text
                style={[
                  styles.optionButtonText,
                  status === s && styles.optionButtonTextActive,
                ]}
              >
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Priority</Text>
        <View style={styles.optionsContainer}>
          {['low', 'medium', 'high'].map((p) => (
            <TouchableOpacity
              key={p}
              style={[
                styles.optionButton,
                priority === p && styles.optionButtonActive,
              ]}
              onPress={() => setPriority(p as any)}
            >
              <Text
                style={[
                  styles.optionButtonText,
                  priority === p && styles.optionButtonTextActive,
                ]}
              >
                {p}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Tags (comma separated)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. work, urgent, bug"
          value={tags}
          onChangeText={setTags}
        />

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.saveButton]}
            onPress={handleSave}
          >
            <Text style={styles.saveButtonText}>
              {isEdit ? 'Update' : 'Create'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  optionsContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  optionButtonActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  optionButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  optionButtonTextActive: {
    color: '#fff',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#2196F3',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
