import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Track } from '../types/Track';
import { apiService } from '../services/api';
import { backendToFrontend, frontendToBackendCreate, frontendToBackendUpdate } from '../utils/trackMapper';

interface TrackContextType {
  tracks: Track[];
  loading: boolean;
  error: string | null;
  addTrack: (track: Omit<Track, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTrack: (id: number, track: Partial<Track>) => Promise<void>;
  deleteTrack: (id: number) => Promise<void>;
  getTrackById: (id: number) => Track | undefined;
  searchTracks: (query: string) => Track[];
  refreshTracks: () => Promise<void>;
}

const TrackContext = createContext<TrackContextType | undefined>(undefined);

export const useTrackContext = () => {
  const context = useContext(TrackContext);
  if (!context) {
    throw new Error('useTrackContext must be used within a TrackProvider');
  }
  return context;
};

interface TrackProviderProps {
  children: ReactNode;
}

export const TrackProvider: React.FC<TrackProviderProps> = ({ children }) => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch tracks from backend on mount
  useEffect(() => {
    refreshTracks();
  }, []);

  const refreshTracks = async () => {
    try {
      setLoading(true);
      setError(null);
      const backendTrackers = await apiService.getAllTrackers();
      const frontendTracks = backendTrackers.map(backendToFrontend);
      setTracks(frontendTracks);
    } catch (err) {
      setError('Failed to load tracks from server');
      console.error('Error loading tracks:', err);
    } finally {
      setLoading(false);
    }
  };

  const addTrack = async (track: Omit<Track, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setError(null);
      const createRequest = frontendToBackendCreate(track);
      const backendTracker = await apiService.createTracker(createRequest);
      const newTrack = backendToFrontend(backendTracker);
      setTracks((prev) => [newTrack, ...prev]);
    } catch (err) {
      setError('Failed to create track');
      console.error('Error creating track:', err);
      throw err;
    }
  };

  const updateTrack = async (id: number, updatedFields: Partial<Track>) => {
    try {
      setError(null);
      // Get the current track to merge fields
      const currentTrack = tracks.find(t => t.id === id);
      if (!currentTrack) {
        throw new Error('Track not found');
      }

      // Merge current track with updates for complete data
      const mergedTrack = { ...currentTrack, ...updatedFields };
      const updateRequest = frontendToBackendUpdate(mergedTrack);
      
      const backendTracker = await apiService.updateTracker(id, updateRequest);
      const updatedTrack = backendToFrontend(backendTracker);
      
      setTracks((prev) =>
        prev.map((track) => (track.id === id ? updatedTrack : track))
      );
    } catch (err) {
      setError('Failed to update track');
      console.error('Error updating track:', err);
      throw err;
    }
  };

  const deleteTrack = async (id: number) => {
    try {
      setError(null);
      await apiService.deleteTracker(id);
      setTracks((prev) => prev.filter((track) => track.id !== id));
    } catch (err) {
      setError('Failed to delete track');
      console.error('Error deleting track:', err);
      throw err;
    }
  };

  const getTrackById = (id: number): Track | undefined => {
    return tracks.find((track) => track.id === id);
  };

  const searchTracks = (query: string): Track[] => {
    const lowerQuery = query.toLowerCase();
    return tracks.filter(
      (track) =>
        track.title.toLowerCase().includes(lowerQuery) ||
        track.description.toLowerCase().includes(lowerQuery) ||
        track.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))
    );
  };

  return (
    <TrackContext.Provider
      value={{
        tracks,
        loading,
        error,
        addTrack,
        updateTrack,
        deleteTrack,
        getTrackById,
        searchTracks,
        refreshTracks,
      }}
    >
      {children}
    </TrackContext.Provider>
  );
};
