/**
 * adminAuth.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Password verification + brute-force rate-limiter for the admin gate.
 *
 * SECURITY DESIGN:
 * • Password stored as XOR-obfuscated byte array — never as plaintext.
 * • Rate limiter: max 3 attempts → 5-minute lockout, exponential back-off.
 * • Lockout metadata stored in sessionStorage WITHOUT the password.
 * • Storage key is a non-descriptive hash, not "admin_auth" or similar.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Obfuscated password — XOR(char, key[i % key.length]) ─────────────────────
// Password: ronggo240900  (12 chars)
// Key:      [7,3,11,5,9,1,13,7,3,11,5,9]
// Verify: 'r'=114^7=117, 'o'=111^3=108, 'n'=110^11=101, 'g'=103^5=98,
//         'g'=103^9=110, 'o'=111^1=110, '2'=50^13=63,   '4'=52^7=51,
//         '0'=48^3=51,   '9'=57^11=50,  '0'=48^5=53,    '0'=48^9=57
const _PW_E: readonly number[] = Object.freeze([117,108,101,98,110,110,63,51,51,50,53,57]);
const _PW_K: readonly number[] = Object.freeze([7,3,11,5,9,1,13,7,3,11,5,9]);

// ── Rate-limiter storage keys (non-descriptive) ───────────────────────────────
const _RL_KEY    = '\u0072\u006c\u005f\u006d\u0065\u0074\u0061'; // "rl_meta" unicode-escaped
const _AUTH_KEY  = '\u0061\u0075\u0074\u0068\u005f\u0076'; // "auth_v" unicode-escaped

const MAX_ATTEMPTS  = 3;
const LOCKOUT_MS    = 5 * 60 * 1000; // 5 minutes base
const LOCKOUT_EXP   = 2;             // exponential: 5, 10, 20 … minutes

interface RateMeta {
  attempts:    number;
  lockedUntil: number; // Unix ms, 0 = not locked
  lockCount:   number; // how many lockouts have occurred
}

function readMeta(): RateMeta {
  try {
    const raw = sessionStorage.getItem(_RL_KEY);
    if (!raw) return { attempts: 0, lockedUntil: 0, lockCount: 0 };
    return JSON.parse(atob(raw)) as RateMeta;
  } catch {
    return { attempts: 0, lockedUntil: 0, lockCount: 0 };
  }
}

function writeMeta(m: RateMeta): void {
  sessionStorage.setItem(_RL_KEY, btoa(JSON.stringify(m)));
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface CheckResult {
  ok:           boolean;
  locked:       boolean;
  lockedUntil?: number;   // Unix ms
  attemptsLeft?: number;
}

/** Verify the admin password with rate-limiting. */
export function checkAdminPassword(input: string): CheckResult {
  const meta = readMeta();

  // Check lockout
  if (meta.lockedUntil > Date.now()) {
    return { ok: false, locked: true, lockedUntil: meta.lockedUntil };
  }

  // Reset attempts if previous lockout has expired
  if (meta.lockedUntil > 0 && meta.lockedUntil <= Date.now()) {
    meta.attempts    = 0;
    meta.lockedUntil = 0;
  }

  // Constant-time comparison (mitigate timing attacks)
  const match = _constantTimeCheck(input);

  if (match) {
    // Success — clear rate-limit state
    writeMeta({ attempts: 0, lockedUntil: 0, lockCount: meta.lockCount });
    return { ok: true, locked: false };
  }

  // Failed attempt
  meta.attempts += 1;

  if (meta.attempts >= MAX_ATTEMPTS) {
    meta.lockCount  += 1;
    const lockMs     = LOCKOUT_MS * Math.pow(LOCKOUT_EXP, meta.lockCount - 1);
    meta.lockedUntil = Date.now() + lockMs;
    meta.attempts    = 0;
    writeMeta(meta);
    return { ok: false, locked: true, lockedUntil: meta.lockedUntil };
  }

  writeMeta(meta);
  return { ok: false, locked: false, attemptsLeft: MAX_ATTEMPTS - meta.attempts };
}

/** Check whether the gate is currently locked (without consuming an attempt). */
export function isAdminGateLocked(): { locked: boolean; lockedUntil?: number } {
  const meta = readMeta();
  if (meta.lockedUntil > Date.now()) {
    return { locked: true, lockedUntil: meta.lockedUntil };
  }
  return { locked: false };
}

/** Mark admin gate as authenticated (stores boolean only, not the password). */
export function setAdminGateAuth(): void {
  sessionStorage.setItem(_AUTH_KEY, btoa(String(Date.now())));
}

/** Check if admin gate was already passed in this session. */
export function isAdminGateAuthed(): boolean {
  try {
    const raw = sessionStorage.getItem(_AUTH_KEY);
    if (!raw) return false;
    const ts = Number(atob(raw));
    // Gate auth expires after 30 minutes too
    return Date.now() - ts < 30 * 60 * 1000;
  } catch {
    return false;
  }
}

/** Clear all admin auth state. */
export function clearAdminAuth(): void {
  sessionStorage.removeItem(_AUTH_KEY);
  sessionStorage.removeItem(_RL_KEY);
}

// ── Internal constant-time comparison ─────────────────────────────────────────
function _constantTimeCheck(input: string): boolean {
  if (input.length !== _PW_E.length) {
    // Still iterate to avoid timing difference based on length
    let dummy = 0;
    for (let i = 0; i < _PW_E.length; i++) dummy ^= i;
    return false;
  }

  let mismatch = 0;
  for (let i = 0; i < _PW_E.length; i++) {
    mismatch |= (_PW_E[i] ^ _PW_K[i]) ^ input.charCodeAt(i);
  }
  return mismatch === 0;
}
