/**
 * adapters/index.ts
 *
 * Factory — re-exports both adapters and the shared interface.
 * Import adapters from here, never from individual adapter files in UI code.
 */
export type { ITrackRepository } from './ITrackRepository';
export { localStorageAdapter } from './LocalStorageAdapter';
export { apiServerAdapter } from './ApiServerAdapter';
