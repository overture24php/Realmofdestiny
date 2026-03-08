/**
 * battleSecurity.ts — Multi-layer Client-Side Battle Hardening
 *
 * Layer 1 — DevTools neutralization:
 *   Overrides React DevTools global hook to prevent the "Components" panel
 *   from inspecting or modifying component state (production only).
 *
 * Layer 2 — Sealed battle state (useRef, not useState):
 *   All critical HP/stamina/mana values live in a useRef object.
 *   useRef values are NOT shown in the React DevTools state panel and
 *   cannot be modified through it. useState is used only for display rendering.
 *
 * Layer 3 — Rolling FNV-1a integrity checksum:
 *   Every update to SealedBattleState recomputes a 32-bit checksum over all
 *   critical fields. If any value is modified without calling updateSealedState,
 *   verifyIntegrity() will fail and the battle is locked as void.
 *
 * Layer 4 — Enemy data freezing:
 *   Enemy definitions are Object.freeze()'d at module load so console
 *   assignment (e.g. enemy.reward_exp = 99999) throws in strict mode and
 *   silently fails otherwise.
 *
 * Layer 5 — Server-side authority (Supabase RPC):
 *   EXP and Gold rewards are validated and applied exclusively by a
 *   SECURITY DEFINER Postgres function. The client submits only the
 *   battle token + turn count; the server looks up rewards itself.
 *   See BATTLE_SECURITY_SQL in supabase-db.ts for the SQL.
 */

// ── Layer 1: React DevTools Neutralization ────────────────────────────────────

/**
 * Call ONCE at app start (or just before battle) in production builds.
 * Overrides the React DevTools global hook callbacks that enable state
 * inspection and live editing. React itself continues to work normally.
 *
 * Note: This targets the official React DevTools extension mechanism.
 * It does NOT break legitimate use cases (performance profiling, etc.)
 * but removes the ability to read or write component state via DevTools UI.
 */
export function neutralizeDevTools(): void {
  if (typeof window === 'undefined') return;
  // Keep DevTools available in development — only harden in production
  if (import.meta.env.DEV) return;

  try {
    const w   = window as any;
    const nop = () => undefined;

    const applyTo = (hook: any) => {
      if (!hook || typeof hook !== 'object') return;
      // 'inject' and 'supportsFiber' must remain — React needs them to register.
      // We silence all state-tracking callbacks that DevTools uses to read/update state.
      hook.onCommitFiberRoot     = nop;
      hook.onCommitFiberUnmount  = nop;
      hook.onPostCommitFiberRoot = nop;
      hook.emit                  = nop;
      // 'isDisabled: true' causes DevTools to show a "disabled" notice in its UI
      try { hook.isDisabled = true; } catch { /* read-only in some DevTools versions */ }
    };

    // Neutralize any hook that was already installed (DevTools loads before React)
    if (w.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      applyTo(w.__REACT_DEVTOOLS_GLOBAL_HOOK__);
    }

    // Intercept any future installation (DevTools loads after React)
    let _hook = w.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    try {
      Object.defineProperty(w, '__REACT_DEVTOOLS_GLOBAL_HOOK__', {
        configurable: true,
        enumerable  : false,
        get() { return _hook; },
        set(v: any) { _hook = v; applyTo(v); },
      });
    } catch { /* some environments block defineProperty on window */ }
  } catch { /* fail silently — security is best-effort at this layer */ }
}

// ── Layer 2 + 3: Sealed Battle State with Integrity Checksum ─────────────────

export interface SealedBattleState {
  enemyHp    : number;
  playerHp   : number;
  stamina    : number;
  mana       : number;
  turnCount  : number;
  /** FNV-1a 32-bit checksum of the five fields above */
  integrity  : number;
  /** Set to true when tampering is detected — battle becomes void */
  locked     : boolean;
}

/**
 * FNV-1a 32-bit hash of all critical numeric fields.
 * Not cryptographic, but deterministic and fast — sufficient to detect
 * naive console-based tampering that modifies individual fields without
 * recomputing the correct checksum.
 */
function computeIntegrity(s: SealedBattleState): number {
  let h = 0x811c9dc5; // FNV-1a 32-bit offset basis
  const vals = [s.enemyHp, s.playerHp, s.stamina, s.mana, s.turnCount];
  for (const v of vals) {
    const buf  = new Float64Array([v]).buffer;
    const view = new Uint8Array(buf);
    for (let i = 0; i < 8; i++) {
      h ^= view[i];
      // FNV-1a prime multiply, keep as unsigned 32-bit
      h = Math.imul(h, 0x01000193) >>> 0;
    }
  }
  return h;
}

/** Create the initial sealed battle state with correct checksum */
export function createSealedState(
  enemyHp : number,
  playerHp: number,
  stamina : number,
  mana    : number,
): SealedBattleState {
  const s: SealedBattleState = {
    enemyHp, playerHp, stamina, mana,
    turnCount: 0,
    integrity: 0,
    locked   : false,
  };
  s.integrity = computeIntegrity(s);
  return s;
}

/**
 * Returns true if all critical values match their stored checksum.
 * A mismatch means either a bug or external modification.
 */
export function verifyIntegrity(s: SealedBattleState): boolean {
  if (s.locked) return false;
  return s.integrity === computeIntegrity(s);
}

/**
 * Atomically update critical fields and recompute checksum.
 * All changes to SealedBattleState MUST go through this function.
 */
export function updateSealedState(
  s      : SealedBattleState,
  updates: Partial<Pick<SealedBattleState, 'enemyHp' | 'playerHp' | 'stamina' | 'mana' | 'turnCount'>>,
): void {
  if (s.locked) return; // void battles cannot be updated
  Object.assign(s, updates);
  s.integrity = computeIntegrity(s);
}

/** Permanently lock a battle — called when tampering is detected */
export function lockBattle(s: SealedBattleState): void {
  s.locked    = true;
  s.integrity = 0; // ensures verifyIntegrity always returns false
}

// ── Layer 4: Enemy Data Freezing ──────────────────────────────────────────────

/**
 * Deep-freeze an array of enemy definition objects.
 * After this, attempts to modify enemy.reward_exp (etc.) at runtime via
 * the console throw a TypeError in strict mode / are silently ignored otherwise.
 */
export function freezeEnemies<T extends object>(list: T[]): readonly T[] {
  return Object.freeze(list.map(e => Object.freeze({ ...e }))) as readonly T[];
}

// ── Layer 5: Client-side reward caps (server is the real authority) ───────────

/**
 * Maximum legitimate reward per enemy type.
 * MUST match the server-side enemy_registry values in BATTLE_SECURITY_SQL.
 * Used as a first-pass client guard only; the Supabase RPC enforces the real caps.
 */
export const SERVER_REWARD_CAPS: Readonly<Record<string, { exp: number; gold: number; minTurns: number; minSeconds: number }>> =
  Object.freeze({
    wooden_dummy : { exp: 15,  gold: 5,  minTurns: 1, minSeconds: 3  },
    rookie_guard : { exp: 40,  gold: 15, minTurns: 3, minSeconds: 8  },
    veteran_guard: { exp: 120, gold: 40, minTurns: 4, minSeconds: 10 },
    shadow_lurker: { exp: 280, gold: 90, minTurns: 5, minSeconds: 15 },
  });

/** Absolute maximum EXP that any single battle can legitimately award */
export const MAX_SINGLE_BATTLE_EXP  = 280;
/** Absolute maximum Gold that any single battle can legitimately award */
export const MAX_SINGLE_BATTLE_GOLD = 90;
