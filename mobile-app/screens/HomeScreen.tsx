import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/Track';
import { useTrackContext } from '../context/TrackContext';
import { useTheme } from '../theme/ThemeContext';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

export default function HomeScreen({ navigation }: Props) {
  const { tracks, deleteTrack, searchTracks, loading, refreshTracks } = useTrackContext();
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const displayedTracks = searchQuery ? searchTracks(searchQuery) : tracks;

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshTracks();
    setRefreshing(false);
  };

  const handleDelete = (id: number, title: string) => {
    Alert.alert(
      'Delete Track',
      `Are you sure you want to delete "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteTrack(id),
        },
      ]
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 40,
      paddingBottom: 20,
      paddingHorizontal: 20,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
    },
    headerButtons: {
      flexDirection: 'row',
      gap: 8,
    },
    headerButton: {
      padding: 8,
    },
    headerButtonText: {
      fontSize: 24,
    },
    searchInput: {
      margin: 16,
      padding: 12,
      backgroundColor: colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      fontSize: 16,
      color: colors.text,
    },
    trackCard: {
      backgroundColor: colors.card,
      marginHorizontal: 16,
      marginBottom: 12,
      padding: 16,
      borderRadius: 12,
      elevation: 2,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    trackHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    trackTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      flex: 1,
    },
    badges: {
      flexDirection: 'row',
      gap: 4,
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    badgeText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: 'bold',
    },
    trackDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 12,
    },
    trackFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    statusBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
    },
    statusText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: 'bold',
    },
    actions: {
      flexDirection: 'row',
      gap: 8,
    },
    editButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: colors.info,
      borderRadius: 6,
    },
    editButtonText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: 'bold',
    },
    deleteButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: colors.error,
      borderRadius: 6,
    },
    deleteButtonText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: 'bold',
    },
    tagsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: 8,
      gap: 6,
    },
    tag: {
      backgroundColor: colors.primaryLight + '20',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: colors.primaryLight,
    },
    tagText: {
      color: colors.primary,
      fontSize: 12,
    },
    emptyContainer: {
      padding: 40,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 16,
      color: colors.textTertiary,
    },
    fab: {
      position: 'absolute',
      right: 20,
      bottom: 40,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 4,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
    },
    fabText: {
      fontSize: 32,
      color: '#fff',
      fontWeight: 'bold',
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Task Tracker</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.headerButtonText}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Search tracks..."
        placeholderTextColor={colors.placeholder}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      <FlatList
        data={displayedTracks}
        keyExtractor={(item) => item.id.toString()}
        refreshing={refreshing}
        onRefresh={onRefresh}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.trackCard}
            onPress={() => navigation.navigate('TrackDetails', { trackId: item.id })}
          >
            <View style={styles.trackHeader}>
              <Text style={styles.trackTitle}>{item.title}</Text>
              <View style={styles.badges}>
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: 
                      item.priority === 'high' ? colors.priorityHigh :
                      item.priority === 'medium' ? colors.priorityMedium :
                      colors.priorityLow
                    },
                  ]}
                >
                  <Text style={styles.badgeText}>{item.priority}</Text>
                </View>
              </View>
            </View>

            <Text style={styles.trackDescription} numberOfLines={2}>
              {item.description}
            </Text>

            <View style={styles.trackFooter}>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor:
                    item.status === 'completed' ? colors.statusCompleted :
                    item.status === 'in-progress' ? colors.statusInProgress :
                    colors.statusPending
                  },
                ]}
              >
                <Text style={styles.statusText}>{item.status}</Text>
              </View>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() =>
                    navigation.navigate('CreateEdit', { trackId: item.id })
                  }
                >
                  <Text style={styles.editButtonText}>✏️ Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDelete(item.id, item.title)}
                >
                  <Text style={styles.deleteButtonText}>🗑️ Delete</Text>
                </TouchableOpacity>
              </View>
            </View>

            {item.tags && item.tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {item.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery ? 'No tracks found' : 'No tracks yet. Create one!'}
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateEdit', {})}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}
