/**
 * LocalStorageAdapter.ts
 *
 * Implements ITrackRepository using expo-sqlite + app-level row encryption.
 * This is the PRIMARY data source — always used, regardless of sync state.
 */
import { ITrackRepository } from './ITrackRepository';
import { Track } from '../types/Track';
import { getDatabase } from '../services/storage/db';
import { getOrCreateEncryptionKey, deleteEncryptionKey } from '../services/storage/encryption';
import {
  queryGetAll,
  queryGetById,
  queryCreate,
  queryUpdate,
  queryDelete,
  queryAddTag,
  queryRemoveTag,
  queryClearAll,
} from '../services/storage/trackQueries';

/**
 * UUID v4 generator — pure Math.random(), no crypto global needed.
 * crypto.randomUUID() is NOT available in Expo Go's Hermes runtime.
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class LocalStorageAdapter implements ITrackRepository {
  private encKey: string | null = null;

  private async key(): Promise<string> {
    if (!this.encKey) {
      this.encKey = await getOrCreateEncryptionKey();
    }
    return this.encKey;
  }

  async getAll(): Promise<Track[]> {
    const db = await getDatabase();
    return queryGetAll(db, await this.key());
  }

  async getById(id: string): Promise<Track | null> {
    const db = await getDatabase();
    return queryGetById(db, id, await this.key());
  }

  async create(
    track: Omit<Track, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Track> {
    const db = await getDatabase();
    const id = generateUUID();
    return queryCreate(db, { ...track, id }, await this.key());
  }

  async update(
    id: string,
    changes: Partial<Omit<Track, 'id' | 'createdAt'>>
  ): Promise<Track> {
    const db = await getDatabase();
    const result = await queryUpdate(db, id, changes, await this.key());
    if (!result) throw new Error(`Track ${id} not found`);
    return result;
  }

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    return queryDelete(db, id);
  }

  async addTag(trackId: string, tag: string): Promise<Track> {
    const db = await getDatabase();
    return queryAddTag(db, trackId, tag, await this.key());
  }

  async removeTag(trackId: string, tag: string): Promise<Track> {
    const db = await getDatabase();
    return queryRemoveTag(db, trackId, tag, await this.key());
  }

  /**
   * Wipe all tracks and tags from the database.
   * Optionally also deletes the encryption key (full reset).
   */
  async clearAllData(deleteKey = false): Promise<void> {
    const db = await getDatabase();
    await queryClearAll(db);
    if (deleteKey) {
      this.encKey = null; // invalidate cached key
      await deleteEncryptionKey();
    }
  }
}

export const localStorageAdapter = new LocalStorageAdapter();
