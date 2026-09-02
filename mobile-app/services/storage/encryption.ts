/**
 * encryption.ts
 *
 * App-level row encryption — zero native module dependencies, zero globals.
 *
 * Why Math.random() for key generation?
 *   crypto.getRandomValues() is NOT available in Expo Go's Hermes runtime.
 *   For a personal time tracker (not banking/medical data), Math.random()
 *   seeded key is sufficient to protect against casual file-system reads.
 *   The key is stored in hardware-backed expo-secure-store regardless.
 *
 * Cipher: SHA-256 XOR keystream
 *   expo-crypto.digestStringAsync(SHA-256) is pure hashing — no AES,
 *   works in Expo Go. Used to derive a keystream from the stored key.
 */
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const DB_KEY_ALIAS = 'time_tracker_db_key';

// ─── Pure-JS helpers (no Buffer, no crypto global) ───────────────────────────

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

/** UTF-8 string → Uint8Array (no TextEncoder needed) */
function strToBytes(str: string): Uint8Array {
  const encoded = encodeURIComponent(str);
  const out: number[] = [];
  for (let i = 0; i < encoded.length; i++) {
    if (encoded[i] === '%') {
      out.push(parseInt(encoded.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      out.push(encoded.charCodeAt(i));
    }
  }
  return new Uint8Array(out);
}

/** Uint8Array → UTF-8 string */
function bytesToStr(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b < 128) {
      out += String.fromCharCode(b);
    } else {
      out += '%' + b.toString(16).padStart(2, '0');
    }
  }
  try {
    return decodeURIComponent(out);
  } catch {
    return out;
  }
}

// ─── Key management ───────────────────────────────────────────────────────────

/**
 * Generate a 32-byte random key using Math.random().
 * Math.random() is universally available in every JS runtime including Expo Go.
 */
function generateKey(): string {
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return uint8ToBase64(bytes);
}

export async function getOrCreateEncryptionKey(): Promise<string> {
  let key = await SecureStore.getItemAsync(DB_KEY_ALIAS);
  if (!key) {
    key = generateKey();
    await SecureStore.setItemAsync(DB_KEY_ALIAS, key, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED,
    });
  }
  return key;
}

/** Delete the stored encryption key (used on full data reset). */
export async function deleteEncryptionKey(): Promise<void> {
  await SecureStore.deleteItemAsync(DB_KEY_ALIAS);
}

// ─── XOR cipher with SHA-256 keystream ───────────────────────────────────────

async function deriveKeystream(key: string, length: number): Promise<Uint8Array> {
  const hexHash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    key,
    { encoding: Crypto.CryptoEncoding.HEX }
  );
  const hashBytes = new Uint8Array(
    hexHash.match(/.{2}/g)!.map((h) => parseInt(h, 16))
  );
  const stream = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    stream[i] = hashBytes[i % hashBytes.length];
  }
  return stream;
}

export async function encrypt(plaintext: string, key: string): Promise<string> {
  if (!plaintext) return plaintext;
  const input = strToBytes(plaintext);
  const stream = await deriveKeystream(key, input.length);
  const out = new Uint8Array(input.length);
  for (let i = 0; i < input.length; i++) out[i] = input[i] ^ stream[i];
  return uint8ToBase64(out);
}

export async function decrypt(ciphertext: string, key: string): Promise<string> {
  if (!ciphertext) return ciphertext;
  try {
    const enc = base64ToUint8(ciphertext);
    const stream = await deriveKeystream(key, enc.length);
    const out = new Uint8Array(enc.length);
    for (let i = 0; i < enc.length; i++) out[i] = enc[i] ^ stream[i];
    return bytesToStr(out);
  } catch {
    return ciphertext;
  }
}
