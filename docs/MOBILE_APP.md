# Mobile App — Architecture & Implementation Guide

> **Status:** Active development — standalone mode implemented  
> **Framework:** React Native + Expo (~54, managed workflow)  
> **Last updated:** 2026-09-03

---

## Overview

The time tracker mobile app runs fully standalone. All data is stored locally on the
device in an encrypted SQLite database. No network connection is required for normal use.
An optional sync feature can push/pull data to/from the Go backend when the user provides
a valid remote URL in Settings.

The backend (`/backend`) and web dashboard (`/web-dashboard`) are **not affected** by
this mobile architecture and remain fully operational independently.

---

## Key Architectural Decisions

| Decision | Choice | Reason |
|---|---|---|
| Primary storage | expo-sqlite | Full SQL, unlimited size, app sandbox |
| Encryption | App-level row encryption (SHA-256 XOR cipher) | Stays in Expo managed workflow; no ejecting |
| Key storage | expo-secure-store (Android Keystore / iOS Keychain) | Hardware-backed, not included in backups |
| Sync abstraction | Adapter Pattern (`ITrackRepository`) | Swap local ↔ remote without touching UI |
| Authentication | 4-digit PIN + biometric (expo-local-authentication) | Auto-prompt biometric on launch |
| Tag storage | Normalised `tags` table (not JSON blob) | Individual tag CRUD via clean SQL |
| ID strategy | UUID (`expo-crypto.randomUUID()`) | No collisions; no dependency on backend sequence |

---

## Folder Structure

```
mobile-app/
│
├── adapters/                         ← Adapter Pattern (data abstraction layer)
│   ├── ITrackRepository.ts           ← Interface: contract all adapters must implement
│   ├── LocalStorageAdapter.ts        ← SQLite implementation (always active)
│   ├── ApiServerAdapter.ts           ← Backend HTTP implementation (sync only)
│   └── index.ts                      ← Barrel export
│
├── services/
│   ├── api.ts                        ← ✅ UNTOUCHED — Go backend HTTP client
│   └── storage/                      ← SQLite internals (never imported by UI)
│       ├── db.ts                     ← DB init, schema, WAL mode, migration runner
│       ├── encryption.ts             ← AES key lifecycle + encrypt/decrypt helpers
│       └── trackQueries.ts           ← Raw SQL CRUD + tag operations
│
├── context/
│   ├── TrackContext.tsx              ← Track CRUD — depends only on ITrackRepository
│   ├── SyncContext.tsx               ← Sync toggle, URL validation, bidirectional sync
│   └── ThemeContext.tsx              ← Dark/light theme
│
├── screens/
│   ├── auth/
│   │   ├── AuthScreen.tsx            ← PIN pad + biometric gate (every launch)
│   │   └── PinSetupScreen.tsx        ← First-time 4-digit PIN creation
│   ├── home/HomeScreen.tsx           ← Track list with search
│   ├── details/TrackDetailsScreen    ← Track detail view
│   ├── create-edit/
│   │   └── CreateEditScreen.tsx      ← Create/edit track + tag CRUD UI
│   ├── settings/
│   │   └── SettingsScreen.tsx        ← Security + sync + appearance settings
│   └── about.tsx                     ← App info
│
├── components/
│   ├── sync/
│   │   └── SyncStatusBadge.tsx       ← Live sync status indicator (color-coded)
│   ├── layout/                       ← SafeAreaView, Header
│   └── ui/                           ← Card, Button, Input
│
├── navigation/
│   ├── RootNavigator.tsx             ← Auth gate → PinSetup or MainTabs
│   ├── TabNavigator.tsx              ← Home + Settings tabs
│   ├── types.ts                      ← Navigation param types
│   └── index.ts
│
├── types/
│   └── Track.ts                      ← Track model, PREDEFINED_TAGS, nav param types
│
└── utils/
    ├── trackMapper.ts                ← Backend ↔ frontend data mapping (untouched)
    └── urlValidator.ts               ← isRemoteUrl, syncDisabledReason, isInsecureUrl
```

---

## Data Layer: Adapter Pattern

```
ITrackRepository (interface)
    │
    ├── LocalStorageAdapter   — SQLite + encryption (ALWAYS active)
    └── ApiServerAdapter      — Go backend via api.ts (ONLY when sync enabled)
```

`TrackContext` holds a reference to `LocalStorageAdapter` and never imports
SQLite or `fetch` directly. When sync is enabled, writes are **mirrored** to
`ApiServerAdapter` silently after the local write succeeds.

### ITrackRepository Interface

```typescript
interface ITrackRepository {
  getAll(): Promise<Track[]>;
  getById(id: string): Promise<Track | null>;
  create(track: Omit<Track, 'id' | 'createdAt' | 'updatedAt'>): Promise<Track>;
  update(id: string, changes: Partial<...>): Promise<Track>;
  delete(id: string): Promise<void>;
  addTag(trackId: string, tag: string): Promise<Track>;
  removeTag(trackId: string, tag: string): Promise<Track>;
  fetchAll?(): Promise<Track[]>;   // optional, used by SyncContext
}
```

---

## Security Layer

### expo-secure-store keys

| Key | Value | Purpose |
|---|---|---|
| `time_tracker_db_key` | 32-byte base64 AES key | Encrypts title + description in SQLite |
| `app_pin_hash` | SHA-256 hash of 4-digit PIN | Verified on every launch |
| `sync_backend_url` | URL string | Backend URL for sync |
| `sync_enabled` | `'true'` / `'false'` | Persisted sync toggle state |

### Encryption approach

- Key generated once on first launch via `expo-crypto.getRandomBytesAsync(32)`
- Stored in hardware-backed secure storage (Android Keystore / iOS Keychain)
- **Encrypted fields**: `title`, `description` (per row in SQLite)
- **Plaintext fields**: `status`, `priority`, `start_time`, `end_time`, timestamps
- Cipher: SHA-256 derived XOR keystream (no native module required)

### Authentication flow

```
App cold start
      ↓
Is app_pin_hash in secure-store?
  ├── No  → PinSetupScreen (create 4-digit PIN, store SHA-256 hash)
  └── Yes → AuthScreen
               ↓
          Biometric available? → auto-prompt
            ├── success → MainTabs
            └── fail    → PIN pad (4-digit, vibrate on error)
```

---

## Sync Logic

### URL validation rules

| URL | Sync toggle |
|---|---|
| `localhost`, `127.0.0.1`, `::1` | ❌ Disabled |
| `192.168.x.x`, `10.x.x.x` (LAN) | ❌ Disabled |
| `https://myapp.example.com` | ✅ Enabled |
| `http://myapp.example.com` | ✅ Enabled (⚠ HTTP warning shown) |
| Empty / invalid | ❌ Disabled |

### Enabling sync

1. User enters URL → validated live in UI
2. User flips toggle → health check (`GET /health`) runs
3. Health check fails → toggle stays off, error shown
4. Health check passes → bidirectional sync runs → toggle turns on

### Bidirectional sync

```
Pull:  remote tracks not in local (by remoteId) → insert into SQLite
Push:  local tracks without remoteId → POST to backend → store remoteId locally
```

### Write mirroring (when sync is on)

```
User creates / edits / deletes
    ↓
LocalStorageAdapter (always first — local is source of truth)
    ↓ (if sync enabled)
ApiServerAdapter (silent — failure does NOT undo local write)
```

---

## SQLite Schema

```sql
CREATE TABLE tracks (
  id          TEXT PRIMARY KEY,       -- UUID
  remote_id   INTEGER,                -- backend integer ID (set after sync)
  title       TEXT NOT NULL,          -- AES encrypted
  description TEXT NOT NULL,          -- AES encrypted
  status      TEXT NOT NULL DEFAULT 'pending',
  priority    TEXT NOT NULL DEFAULT 'medium',
  start_time  TEXT NOT NULL,
  end_time    TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE tags (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  track_id  TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  UNIQUE(track_id, name)
);

CREATE TABLE schema_version (
  version INTEGER PRIMARY KEY
);
```

---

## Tags

- 10 predefined tags: `work`, `personal`, `urgent`, `bug`, `feature`,
  `meeting`, `research`, `review`, `blocked`, `follow-up`
- Users can add free-form custom tags (stored in the same `tags` table)
- Tags are shown as dismissible chips in CreateEditScreen
- Tags are fully filterable via `searchTracks()`

---

## Packages Added

```
expo-sqlite            — SQLite database
expo-secure-store      — Hardware-backed key/PIN storage
expo-crypto            — UUID generation + SHA-256 hashing
expo-local-authentication — Biometric / fingerprint / Face ID
```

All are part of the Expo SDK — **no ejecting from managed workflow required**.

---

## What Is NOT Changed

| File/Folder | Status |
|---|---|
| `backend/` | ✅ Zero changes |
| `web-dashboard/` | ✅ Zero changes |
| `services/api.ts` | ✅ Zero changes (wrapped by ApiServerAdapter) |
| `utils/trackMapper.ts` | ✅ Zero changes |
| `theme/` | ✅ Zero changes |
