/**
 * ApiServerAdapter.ts
 *
 * Implements ITrackRepository by calling the Go backend via services/api.ts.
 * Used ONLY when the user enables sync in Settings.
 * The local UUID is preserved; the backend integer ID is stored as remoteId.
 */
import { ITrackRepository } from './ITrackRepository';
import { Track } from '../types/Track';
import { apiService, BackendTracker } from '../services/api';
import {
  backendToFrontend,
  frontendToBackendCreate,
  frontendToBackendUpdate,
} from '../utils/trackMapper';

export class ApiServerAdapter implements ITrackRepository {
  /**
   * Maps a BackendTracker → Track, preserving the local UUID if provided via tags.
   * The backend doesn't know about UUIDs — we store the remote int ID in remoteId.
   */
  private fromBackend(bt: BackendTracker): Track {
    const track = backendToFrontend(bt);
    return {
      ...track,
      id: track.id.toString(), // backend int → string (used as remoteId mapping)
      remoteId: bt.id,
    };
  }

  async getAll(): Promise<Track[]> {
    const backendTrackers = await apiService.getAllTrackers();
    return backendTrackers.map((bt) => this.fromBackend(bt));
  }

  async getById(id: string): Promise<Track | null> {
    try {
      // id here is remoteId as string
      const bt = await apiService.getTrackerById(parseInt(id, 10));
      return this.fromBackend(bt);
    } catch {
      return null;
    }
  }

  async create(
    track: Omit<Track, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Track> {
    const request = frontendToBackendCreate(track);
    const bt = await apiService.createTracker(request);
    return this.fromBackend(bt);
  }

  async update(
    id: string,
    changes: Partial<Omit<Track, 'id' | 'createdAt'>>
  ): Promise<Track> {
    const remoteId = parseInt(id, 10);
    const request = frontendToBackendUpdate(changes);
    const bt = await apiService.updateTracker(remoteId, request);
    return this.fromBackend(bt);
  }

  async delete(id: string): Promise<void> {
    await apiService.deleteTracker(parseInt(id, 10));
  }

  async addTag(trackId: string, tag: string): Promise<Track> {
    // Fetch current, merge tag, push update
    const current = await this.getById(trackId);
    if (!current) throw new Error('Track not found on remote');
    const updatedTags = [...new Set([...(current.tags ?? []), tag])];
    return this.update(trackId, { tags: updatedTags });
  }

  async removeTag(trackId: string, tag: string): Promise<Track> {
    const current = await this.getById(trackId);
    if (!current) throw new Error('Track not found on remote');
    const updatedTags = (current.tags ?? []).filter((t) => t !== tag);
    return this.update(trackId, { tags: updatedTags });
  }

  /** fetchAll — used by SyncContext to pull all remote tracks */
  async fetchAll(): Promise<Track[]> {
    return this.getAll();
  }

  /** Health check — used by SyncContext before enabling sync */
  async isReachable(): Promise<boolean> {
    return apiService.healthCheck();
  }
}

export const apiServerAdapter = new ApiServerAdapter();
