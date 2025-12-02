import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/Track';
import { useTrackContext } from '../context/TrackContext';

type TrackDetailsScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'TrackDetails'
>;
type TrackDetailsScreenRouteProp = RouteProp<RootStackParamList, 'TrackDetails'>;

interface Props {
  navigation: TrackDetailsScreenNavigationProp;
  route: TrackDetailsScreenRouteProp;
}

export default function TrackDetailsScreen({ navigation, route }: Props) {
  const { trackId } = route.params;
  const { getTrackById, deleteTrack } = useTrackContext();

  const track = getTrackById(trackId);

  if (!track) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Track not found</Text>
      </View>
    );
  }

  const handleDelete = () => {
    Alert.alert(
      'Delete Track',
      `Are you sure you want to delete "${track.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteTrack(trackId);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#4CAF50';
      case 'in-progress':
        return '#FF9800';
      default:
        return '#9E9E9E';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#F44336';
      case 'medium':
        return '#FF9800';
      default:
        return '#2196F3';
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{track.title}</Text>
        <View style={styles.badges}>
          <View
            style={[
              styles.badge,
              { backgroundColor: getPriorityColor(track.priority) },
            ]}
          >
            <Text style={styles.badgeText}>{track.priority}</Text>
          </View>
          <View
            style={[
              styles.badge,
              { backgroundColor: getStatusColor(track.status) },
            ]}
          >
            <Text style={styles.badgeText}>{track.status}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.description}>{track.description}</Text>
      </View>

      {track.tags && track.tags.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tags</Text>
          <View style={styles.tagsContainer}>
            {track.tags.map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Timeline</Text>
        <View style={styles.timelineItem}>
          <Text style={styles.timelineLabel}>Created:</Text>
          <Text style={styles.timelineValue}>{formatDate(track.createdAt)}</Text>
        </View>
        <View style={styles.timelineItem}>
          <Text style={styles.timelineLabel}>Last Updated:</Text>
          <Text style={styles.timelineValue}>{formatDate(track.updatedAt)}</Text>
        </View>
        {track.endTime && (
          <View style={styles.timelineItem}>
            <Text style={styles.timelineLabel}>End Time:</Text>
            <Text style={styles.timelineValue}>{formatDate(track.endTime)}</Text>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.editButton]}
          onPress={() => navigation.navigate('CreateEdit', { trackId })}
        >
          <Text style={styles.editButtonText}>✏️ Edit Track</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.deleteButton]}
          onPress={handleDelete}
        >
          <Text style={styles.deleteButtonText}>🗑️ Delete Track</Text>
        </TouchableOpacity>
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
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  tagText: {
    color: '#1976D2',
    fontSize: 14,
  },
  timelineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  timelineLabel: {
    fontSize: 14,
    color: '#666',
  },
  timelineValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  actions: {
    padding: 20,
    gap: 12,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#2196F3',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 40,
  },
});
