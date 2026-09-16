import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { TrackDetailsScreenNavigationProp, TrackDetailsScreenRouteProp } from '../../navigation/types';
import { useTrackContext } from '../../context/TrackContext';
import { useTheme } from '../../context/ThemeContext';
import { AppIcon } from '../../components/ui/AppIcon';

interface Props {
  navigation: TrackDetailsScreenNavigationProp;
  route: TrackDetailsScreenRouteProp;
}

export default function TrackDetailsScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const { getTrackById, deleteTrack, addTrack } = useTrackContext();
  const { colors } = useTheme();

  const track = getTrackById(id);
  const styles = makeStyles(colors);

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
            deleteTrack(id);
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

  const handleDuplicate = async () => {
    try {
      await addTrack({
        title: `${track.title} (Copy)`,
        description: track.description,
        status: track.taskType === 'allocated' ? 'time-allocated' : 'created',
        priority: track.priority,
        taskType: track.taskType,
        timeInputMode: track.timeInputMode,
        allocatedStartTime: track.allocatedStartTime,
        allocatedEndTime: track.allocatedEndTime,
        blockMultiplier: track.blockMultiplier,
        durationMinutes: track.durationMinutes,
        startTime: track.startTime || new Date(),
        tags: track.tags,
      });
      Alert.alert('Task Duplicated', 'Task was copied successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to duplicate task.');
    }
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

      {track.description ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{track.description}</Text>
        </View>
      ) : null}

      {track.tags && track.tags.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tags</Text>
          <View style={styles.tagsContainer}>
            {track.tags.map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
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
          style={[styles.button, styles.duplicateButton, { flexDirection: 'row', justifyContent: 'center', gap: 8 }]}
          onPress={handleDuplicate}
        >
          <AppIcon name="copy-outline" size={18} color="#fff" />
          <Text style={styles.editButtonText}>Duplicate Task</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.editButton, { flexDirection: 'row', justifyContent: 'center', gap: 8 }]}
          onPress={() => navigation.navigate('CreateEdit', { id })}
        >
          <AppIcon name="create-outline" size={18} color="#fff" />
          <Text style={styles.editButtonText}>Edit Track</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.deleteButton, { flexDirection: 'row', justifyContent: 'center', gap: 8 }]}
          onPress={handleDelete}
        >
          <AppIcon name="trash-outline" size={18} color="#fff" />
          <Text style={styles.deleteButtonText}>Delete Track</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      backgroundColor: colors.card,
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
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
      backgroundColor: colors.card,
      padding: 20,
      marginTop: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 12,
    },
    description: {
      fontSize: 16,
      color: colors.textSecondary,
      lineHeight: 24,
    },
    tagsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    tag: {
      backgroundColor: colors.primary + '20',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 4,
    },
    tagText: {
      color: colors.primary,
      fontSize: 14,
    },
    timelineItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
    },
    timelineLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    timelineValue: {
      fontSize: 14,
      color: colors.text,
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
    duplicateButton: {
      backgroundColor: colors.info,
    },
    editButton: {
      backgroundColor: colors.primary,
    },
    editButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
    deleteButton: {
      backgroundColor: colors.error || '#EF4444',
    },
    deleteButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
    errorText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 40,
    },
  });
}
