/**
 * ITrackRepository.ts
 *
 * The single contract that ALL data adapters must implement.
 * TrackContext only depends on this interface — never on SQLite or fetch directly.
 */
import { Track } from '../types/Track';

export interface ITrackRepository {
  /** Fetch all tracks, ordered by updatedAt DESC */
  getAll(): Promise<Track[]>;

  /** Fetch a single track by its local UUID */
  getById(id: string): Promise<Track | null>;

  /** Create a new track; returns the saved track (with id, createdAt, updatedAt) */
  create(track: Omit<Track, 'id' | 'createdAt' | 'updatedAt'>): Promise<Track>;

  /** Apply partial updates to an existing track; returns the updated track */
  update(id: string, changes: Partial<Omit<Track, 'id' | 'createdAt'>>): Promise<Track>;

  /** Permanently delete a track and all its tags */
  delete(id: string): Promise<void>;

  /** Add a tag to a track (no-op if already present); returns updated track */
  addTag(trackId: string, tag: string): Promise<Track>;

  /** Remove a tag from a track; returns updated track */
  removeTag(trackId: string, tag: string): Promise<Track>;

  /** Pull all tracks from the remote source (used by sync) */
  fetchAll?(): Promise<Track[]>;
}
