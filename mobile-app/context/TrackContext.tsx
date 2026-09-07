/**
 * TrackContext.tsx
 *
 * Provides track CRUD to the entire app.
 * Now depends only on ITrackRepository (via LocalStorageAdapter).
 * Mirror writes to ApiServerAdapter happen here when sync is enabled.
 */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Track } from '../types/Track';
import { localStorageAdapter } from '../adapters/LocalStorageAdapter';
import { apiServerAdapter } from '../adapters/ApiServerAdapter';
import { useSyncContext } from './SyncContext';
import { resetDatabase } from '../services/storage/db';

interface TrackContextType {
  tracks: Track[];
  loading: boolean;
  error: string | null;
  addTrack: (track: Omit<Track, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTrack: (id: string, changes: Partial<Omit<Track, 'id' | 'createdAt'>>) => Promise<void>;
  deleteTrack: (id: string) => Promise<void>;
  getTrackById: (id: string) => Track | undefined;
  searchTracks: (query: string) => Track[];
  refreshTracks: () => Promise<void>;
  addTag: (trackId: string, tag: string) => Promise<void>;
  removeTag: (trackId: string, tag: string) => Promise<void>;
  /** Wipe all local data. Pass deleteKey=true for a full factory reset. */
  clearAllData: (deleteKey?: boolean) => Promise<void>;
}

const TrackContext = createContext<TrackContextType | undefined>(undefined);

export const useTrackContext = (): TrackContextType => {
  const ctx = useContext(TrackContext);
  if (!ctx) throw new Error('useTrackContext must be used within a TrackProvider');
  return ctx;
};

export const TrackProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { syncEnabled } = useSyncContext();

  // ── Helpers ─────────────────────────────────────────────────────────────────

  /** Mirror a write to the backend silently when sync is enabled. */
  const mirrorToRemote = async (action: () => Promise<void>) => {
    if (!syncEnabled) return;
    try {
      await action();
    } catch {
      // Silent — local write already succeeded; sync error shown by SyncContext badge
    }
  };

  // ── Load ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    refreshTracks();
  }, []);

  const refreshTracks = async () => {
    try {
      setLoading(true);
      setError(null);
      const all = await localStorageAdapter.getAll();
      setTracks(all);
    } catch (e) {
      setError('Failed to load tracks.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ── CRUD ──────────────────────────────────────────────────────────────────────

  const addTrack = async (
    track: Omit<Track, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<void> => {
    setError(null);
    const created = await localStorageAdapter.create(track);
    setTracks((prev) => [created, ...prev]);

    await mirrorToRemote(async () => {
      const remote = await apiServerAdapter.create(track);
      // Store remoteId back locally
      await localStorageAdapter.update(created.id, { remoteId: remote.remoteId });
      setTracks((prev) =>
        prev.map((t) => (t.id === created.id ? { ...t, remoteId: remote.remoteId } : t))
      );
    });
  };

  const updateTrack = async (
    id: string,
    changes: Partial<Omit<Track, 'id' | 'createdAt'>>
  ): Promise<void> => {
    setError(null);
    const updated = await localStorageAdapter.update(id, changes);
    setTracks((prev) => prev.map((t) => (t.id === id ? updated : t)));

    await mirrorToRemote(async () => {
      const current = tracks.find((t) => t.id === id);
      if (current?.remoteId) {
        await apiServerAdapter.update(current.remoteId.toString(), changes);
      }
    });
  };

  const deleteTrack = async (id: string): Promise<void> => {
    setError(null);
    const current = tracks.find((t) => t.id === id);
    await localStorageAdapter.delete(id);
    setTracks((prev) => prev.filter((t) => t.id !== id));

    await mirrorToRemote(async () => {
      if (current?.remoteId) {
        await apiServerAdapter.delete(current.remoteId.toString());
      }
    });
  };

  const addTag = async (trackId: string, tag: string): Promise<void> => {
    setError(null);
    const updated = await localStorageAdapter.addTag(trackId, tag);
    setTracks((prev) => prev.map((t) => (t.id === trackId ? updated : t)));

    await mirrorToRemote(async () => {
      const current = tracks.find((t) => t.id === trackId);
      if (current?.remoteId) {
        await apiServerAdapter.addTag(current.remoteId.toString(), tag);
      }
    });
  };

  const removeTag = async (trackId: string, tag: string): Promise<void> => {
    setError(null);
    const updated = await localStorageAdapter.removeTag(trackId, tag);
    setTracks((prev) => prev.map((t) => (t.id === trackId ? updated : t)));

    await mirrorToRemote(async () => {
      const current = tracks.find((t) => t.id === trackId);
      if (current?.remoteId) {
        await apiServerAdapter.removeTag(current.remoteId.toString(), tag);
      }
    });
  };

  const clearAllData = async (deleteKey = false): Promise<void> => {
    setError(null);
    await localStorageAdapter.clearAllData(deleteKey);
    setTracks([]);
    if (deleteKey) {
      await resetDatabase();
    }
  };

  const getTrackById = (id: string): Track | undefined =>
    tracks.find((t) => t.id === id);

  const searchTracks = (query: string): Track[] => {
    const q = query.toLowerCase();
    return tracks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags?.some((tag) => tag.toLowerCase().includes(q))
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
        addTag,
        removeTag,
        clearAllData,
      }}
    >
      {children}
    </TrackContext.Provider>
  );
};
