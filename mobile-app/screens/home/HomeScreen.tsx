import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTrackContext } from '../../context/TrackContext';
import { useTheme } from '../../context/ThemeContext';
import { HomeScreenNavigationProp } from '../../navigation/types';
import { SafeAreaView } from '../../components/layout/SafeAreaView';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

interface Props {
  navigation: HomeScreenNavigationProp;
}

export default function HomeScreen({ navigation }: Props) {
  const { tracks, deleteTrack, searchTracks, refreshTracks } = useTrackContext();
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
    },
    searchContainer: {
      padding: 16,
    },
    trackCard: {
      marginHorizontal: 16,
      marginBottom: 12,
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
      marginTop: 8,
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
      textAlign: 'center',
    },
    fab: {
      position: 'absolute',
      right: 20,
      bottom: 20,
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
    <SafeAreaView edges={['top']}>
      <View style={styles.container}>
        <Header title="Task Tracker" />

        <View style={styles.searchContainer}>
          <Input
            placeholder="Search tracks..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            icon="🔍"
          />
        </View>

        <FlatList
          data={displayedTracks}
          keyExtractor={(item) => item.id.toString()}
          refreshing={refreshing}
          onRefresh={onRefresh}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => navigation.navigate('TrackDetails', { id: item.id })}
            >
              <Card style={styles.trackCard}>
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
                    <Button
                      title="Edit"
                      size="small"
                      variant="secondary"
                      onPress={() => navigation.navigate('CreateEdit', { id: item.id })}
                    />
                    <Button
                      title="Delete"
                      size="small"
                      variant="danger"
                      onPress={() => handleDelete(item.id, item.title)}
                    />
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
              </Card>
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
    </SafeAreaView>
  );
}
