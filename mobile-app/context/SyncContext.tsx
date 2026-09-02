/**
 * SyncContext.tsx
 *
 * Manages the sync toggle state, backend URL, reachability check,
 * and bidirectional sync logic (local ↔ backend).
 *
 * Design:
 *  - Local (SQLite) is always the source of truth.
 *  - On sync enable: health-check → initial bidirectional sync → enable.
 *  - On each write: mirror to backend if sync is enabled.
 *  - Pull: import remote tracks that don't exist locally (identified by remoteId).
 */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import { localStorageAdapter } from '../adapters/LocalStorageAdapter';
import { apiServerAdapter } from '../adapters/ApiServerAdapter';
import { isRemoteUrl, syncDisabledReason, isInsecureUrl } from '../utils/urlValidator';

const BACKEND_URL_KEY = 'sync_backend_url';
const SYNC_ENABLED_KEY = 'sync_enabled';

export type SyncStatus =
  | 'idle'
  | 'checking'
  | 'syncing'
  | 'synced'
  | 'error'
  | 'disabled';

interface SyncContextType {
  syncEnabled: boolean;
  backendUrl: string;
  syncStatus: SyncStatus;
  syncError: string | null;
  isInsecure: boolean;
  canEnableSync: boolean;
  disabledReason: string | null;
  setSyncEnabled: (enabled: boolean) => Promise<void>;
  setBackendUrl: (url: string) => Promise<void>;
  triggerSync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const useSyncContext = (): SyncContextType => {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSyncContext must be used within SyncProvider');
  return ctx;
};

export const SyncProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [backendUrl, setUrlState] = useState('');
  const [syncEnabled, setSyncState] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);

  // Derived
  const canEnableSync = isRemoteUrl(backendUrl);
  const disabledReason = syncDisabledReason(backendUrl);
  const isInsecure = isInsecureUrl(backendUrl);

  // ── Load persisted state on mount ──────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const url = (await SecureStore.getItemAsync(BACKEND_URL_KEY)) ?? '';
      const enabled = (await SecureStore.getItemAsync(SYNC_ENABLED_KEY)) === 'true';
      setUrlState(url);
      if (enabled && isRemoteUrl(url)) {
        setSyncState(true);
        setSyncStatus('idle');
      }
    })();
  }, []);

  // ── Set backend URL ────────────────────────────────────────────────────────
  const setBackendUrl = useCallback(async (url: string) => {
    setUrlState(url);
    await SecureStore.setItemAsync(BACKEND_URL_KEY, url);
    // If sync was enabled but URL changed to local, disable
    if (!isRemoteUrl(url) && syncEnabled) {
      setSyncState(false);
      setSyncStatus('disabled');
      await SecureStore.setItemAsync(SYNC_ENABLED_KEY, 'false');
    }
  }, [syncEnabled]);

  // ── Enable / disable sync ─────────────────────────────────────────────────
  const setSyncEnabled = useCallback(async (enabled: boolean) => {
    if (!enabled) {
      setSyncState(false);
      setSyncStatus('idle');
      setSyncError(null);
      await SecureStore.setItemAsync(SYNC_ENABLED_KEY, 'false');
      return;
    }

    if (!canEnableSync) {
      setSyncError(disabledReason ?? 'Sync unavailable for this URL.');
      return;
    }

    setSyncStatus('checking');
    setSyncError(null);

    try {
      const reachable = await apiServerAdapter.isReachable();
      if (!reachable) {
        setSyncStatus('error');
        setSyncError('Cannot reach server. Check the URL and try again.');
        return;
      }

      // Reachable — run initial bidirectional sync before enabling
      setSyncStatus('syncing');
      await runBidirectionalSync();

      setSyncState(true);
      setSyncStatus('synced');
      await SecureStore.setItemAsync(SYNC_ENABLED_KEY, 'true');
    } catch (e: any) {
      setSyncStatus('error');
      setSyncError(e?.message ?? 'Sync failed. Please try again.');
    }
  }, [canEnableSync, disabledReason]);

  // ── Bidirectional sync ─────────────────────────────────────────────────────
  const runBidirectionalSync = useCallback(async () => {
    // Pull: fetch all from backend
    const remoteTrackers = await apiServerAdapter.fetchAll!();
    const localTrackers = await localStorageAdapter.getAll();

    const localRemoteIds = new Set(
      localTrackers.map((t) => t.remoteId).filter(Boolean)
    );

    // Import remote tracks that don't exist locally
    for (const remote of remoteTrackers) {
      if (remote.remoteId && !localRemoteIds.has(remote.remoteId)) {
        await localStorageAdapter.create({
          title: remote.title,
          description: remote.description,
          status: remote.status,
          priority: remote.priority,
          startTime: remote.startTime,
          endTime: remote.endTime,
          tags: remote.tags,
          remoteId: remote.remoteId,
        });
      }
    }

    // Push: send local tracks that have no remoteId to backend
    const freshLocal = await localStorageAdapter.getAll();
    for (const local of freshLocal) {
      if (!local.remoteId) {
        try {
          const created = await apiServerAdapter.create({
            title: local.title,
            description: local.description,
            status: local.status,
            priority: local.priority,
            startTime: local.startTime,
            endTime: local.endTime,
            tags: local.tags,
          });
          // Store the remote ID back into the local record
          await localStorageAdapter.update(local.id, { remoteId: created.remoteId });
        } catch {
          // Non-fatal: skip this record, will retry on next sync
        }
      }
    }
  }, []);

  const triggerSync = useCallback(async () => {
    if (!syncEnabled || !canEnableSync) return;
    setSyncStatus('syncing');
    setSyncError(null);
    try {
      const reachable = await apiServerAdapter.isReachable();
      if (!reachable) {
        setSyncStatus('error');
        setSyncError('Server unreachable.');
        return;
      }
      await runBidirectionalSync();
      setSyncStatus('synced');
    } catch (e: any) {
      setSyncStatus('error');
      setSyncError(e?.message ?? 'Sync error.');
    }
  }, [syncEnabled, canEnableSync, runBidirectionalSync]);

  return (
    <SyncContext.Provider
      value={{
        syncEnabled,
        backendUrl,
        syncStatus,
        syncError,
        isInsecure,
        canEnableSync,
        disabledReason,
        setSyncEnabled,
        setBackendUrl,
        triggerSync,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
};
