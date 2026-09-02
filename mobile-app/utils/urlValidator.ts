/**
 * urlValidator.ts
 *
 * Determines whether a given backend URL points to a real remote server
 * (sync-eligible) or a local/development server (sync disabled).
 */

const LOCAL_HOSTNAMES = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
];

const LOCAL_PREFIXES = [
  '192.168.',
  '10.',
  '172.16.',
  '172.17.',
  '172.18.',
  '172.19.',
  '172.20.',
  '172.21.',
  '172.22.',
  '172.23.',
  '172.24.',
  '172.25.',
  '172.26.',
  '172.27.',
  '172.28.',
  '172.29.',
  '172.30.',
  '172.31.',
];

/**
 * Returns true only if the URL is a proper remote URL (not localhost / LAN).
 * The sync toggle is only enabled when this returns true.
 */
export function isRemoteUrl(raw: string): boolean {
  if (!raw || raw.trim() === '') return false;

  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return false;
  }

  const hostname = url.hostname.toLowerCase();

  if (LOCAL_HOSTNAMES.includes(hostname)) return false;
  if (LOCAL_PREFIXES.some((prefix) => hostname.startsWith(prefix))) return false;

  return true;
}

/**
 * Returns a human-readable reason why sync is disabled for a given URL.
 * Returns null if the URL is valid for sync.
 */
export function syncDisabledReason(raw: string): string | null {
  if (!raw || raw.trim() === '') return 'No backend URL configured.';

  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return 'Invalid URL format.';
  }

  const hostname = url.hostname.toLowerCase();

  if (LOCAL_HOSTNAMES.includes(hostname)) {
    return 'Sync unavailable for local servers.';
  }
  if (LOCAL_PREFIXES.some((prefix) => hostname.startsWith(prefix))) {
    return 'Sync unavailable for LAN addresses.';
  }

  return null; // valid for sync
}

/**
 * Returns true if the URL uses HTTP (not HTTPS) — used to show a security warning.
 */
export function isInsecureUrl(raw: string): boolean {
  try {
    const url = new URL(raw.trim());
    return url.protocol === 'http:';
  } catch {
    return false;
  }
}
