/**
 * adminVault.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Secure in-memory vault for the Supabase admin session.
 *
 * SECURITY DESIGN:
 * • The raw Service Role Key is NEVER stored in React state, React props,
 *   sessionStorage, or localStorage.
 * • The key is XOR-obfuscated with a cryptographically-random per-session
 *   nonce and held ONLY in a module-level closure — invisible to React DevTools
 *   and browser storage inspectors.
 * • The Supabase admin client is created once and stored in the same closure.
 * • On page unload / session clear the vault is wiped (overwritten with zeros).
 * • Auto-expiry after 30 minutes of initialisation.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createAdminClient } from '../../utils/supabase-admin';
import type { SupabaseClient } from '@supabase/supabase-js';

// ── Module-level sealed vault (not exported, not inspectable via DevTools) ────
let _client:     SupabaseClient | null = null;
let _obfBytes:   Uint8Array    | null = null;   // XOR(key, nonce)
let _nonce:      Uint8Array    | null = null;   // random per session
let _expiry:     number        = 0;             // Unix ms
let _hasSession: boolean       = false;

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

// ── Initialise the vault with the raw key ─────────────────────────────────────
export function initAdminVault(rawKey: string): void {
  clearAdminVault();

  const encoder = new TextEncoder();
  const keyBytes = encoder.encode(rawKey);

  // Generate a cryptographically-random nonce equal in length to the key
  const nonce = crypto.getRandomValues(new Uint8Array(keyBytes.length));

  // XOR-obfuscate the key
  const obf = new Uint8Array(keyBytes.length);
  for (let i = 0; i < keyBytes.length; i++) {
    obf[i] = keyBytes[i] ^ nonce[i];
  }

  // Overwrite the plaintext key bytes immediately
  keyBytes.fill(0);

  _nonce      = nonce;
  _obfBytes   = obf;
  _expiry     = Date.now() + SESSION_TTL_MS;
  _hasSession = true;

  // Create the Supabase admin client (must decode momentarily, then wipe local)
  const decoded = decodeKey();
  if (decoded) {
    _client = createAdminClient(decoded);
    // Overwrite the decoded string memory (JS strings are immutable, but at
    // least we don't hold a reference to it)
  }
}

// ── Decode the key from vault (internal use only) ─────────────────────────────
function decodeKey(): string | null {
  if (!_obfBytes || !_nonce) return null;
  const plain = new Uint8Array(_obfBytes.length);
  for (let i = 0; i < _obfBytes.length; i++) {
    plain[i] = _obfBytes[i] ^ _nonce[i];
  }
  return new TextDecoder().decode(plain);
}

// ── Get the admin Supabase client (checks expiry) ─────────────────────────────
export function getAdminClient(): SupabaseClient | null {
  if (!_hasSession || !_client) return null;
  if (Date.now() > _expiry) {
    clearAdminVault();
    return null;
  }
  return _client;
}

// ── Check whether a valid session exists ─────────────────────────────────────
export function hasAdminSession(): boolean {
  if (!_hasSession) return false;
  if (Date.now() > _expiry) {
    clearAdminVault();
    return false;
  }
  return true;
}

// ── Remaining session time in seconds ────────────────────────────────────────
export function adminSessionSecondsLeft(): number {
  if (!_hasSession) return 0;
  return Math.max(0, Math.floor((_expiry - Date.now()) / 1000));
}

// ── Wipe the vault ────────────────────────────────────────────────────────────
export function clearAdminVault(): void {
  if (_obfBytes) _obfBytes.fill(0);
  if (_nonce)    _nonce.fill(0);
  _obfBytes   = null;
  _nonce      = null;
  _client     = null;
  _expiry     = 0;
  _hasSession = false;
}

// ── Auto-wipe on page unload ──────────────────────────────────────────────────
window.addEventListener('beforeunload', clearAdminVault);
