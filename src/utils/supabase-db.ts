/**
 * supabase-db.ts
 * Helper untuk operasi database `players` table.
 * Data game sepenuhnya server-side — tidak ada di user_metadata.
 *
 * Patch v2:
 *  - skill_slots  → kolom JSONB dedikasi (tidak lagi embed di stats._skillSlots)
 *  - current_mana → kolom INTEGER dedikasi (persisten antar battle/sesi)
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PlayerData, CoreStats, PlayerStats, Equipment, TutorialProgress, ElementType } from '../app/contexts/GameContext';
import type { SkillSlots } from '../app/data/skillsData';
import { ITEM_DEFS } from '../app/data/itemData';
import type { InventoryItem } from '../app/data/itemData';

// ── SQL untuk setup tabel (jalankan sekali di Supabase SQL Editor) ─────────────
export const SETUP_SQL = `
-- Tabel utama data pemain
CREATE TABLE IF NOT EXISTS public.players (
  id                   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name                 TEXT,
  email                TEXT,
  gender               TEXT,
  role                 TEXT DEFAULT 'unknown',
  karma                INTEGER DEFAULT 0,
  faction              TEXT DEFAULT 'neutral',
  level                INTEGER DEFAULT 1,
  experience           BIGINT DEFAULT 0,
  gold                 INTEGER DEFAULT 100,
  free_points          INTEGER DEFAULT 2,
  location             TEXT DEFAULT 'greenleaf_village',
  element_affinity     TEXT DEFAULT 'none',
  core_stats           JSONB DEFAULT '{"str":1,"int":1,"dex":1,"vit":1,"agi":1}',
  stats                JSONB,
  equipment            JSONB,
  inventory            JSONB DEFAULT '[]',
  equipment_core_bonus JSONB DEFAULT '{"str":0,"int":0,"dex":0,"vit":0,"agi":0}',
  tutorial_progress    JSONB,
  skill_slots          JSONB DEFAULT '{"skill1":"power_hit","skill2":null,"skill3":null,"ultimate":null}',
  current_mana         INTEGER DEFAULT 0,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS players_updated_at ON public.players;
CREATE TRIGGER players_updated_at
  BEFORE UPDATE ON public.players
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Row Level Security
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "players_select_own" ON public.players;
DROP POLICY IF EXISTS "players_insert_own" ON public.players;
DROP POLICY IF EXISTS "players_update_own" ON public.players;

CREATE POLICY "players_select_own" ON public.players
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "players_insert_own" ON public.players
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "players_update_own" ON public.players
  FOR UPDATE USING (auth.uid() = id);
-- Service Role key bypass RLS secara otomatis (untuk AdminPage)
`;

// ── Type untuk row dari database ───────────────────────────────────────────────
export interface PlayerRow {
  id                   : string;
  name                 : string | null;
  email                : string | null;
  gender               : string | null;
  role                 : string;
  karma                : number;
  faction              : string;
  level                : number;
  experience           : number;
  gold                 : number;
  free_points          : number;
  location             : string;
  element_affinity     : string;
  core_stats           : CoreStats;
  stats                : PlayerStats | null;
  equipment            : Equipment | null;
  inventory            : any[];
  equipment_core_bonus : CoreStats;
  tutorial_progress    : TutorialProgress | null;
  /** Kolom dedikasi untuk skill slots (patch v2) */
  skill_slots          : SkillSlots | null;
  /** Kolom dedikasi untuk mana saat ini (patch v2). 0 = belum tersimpan → pakai max */
  current_mana         : number;
  created_at           : string;
  updated_at           : string;
}

// ── Default SkillSlots ────────────────────────────────────────────────────────
const DEFAULT_SKILL_SLOTS: SkillSlots = {
  skill1: 'power_hit', skill2: null, skill3: null, ultimate: null,
};

// ── Mapping: PlayerData → database row ───────────────────────────────────────
export function playerDataToRow(pd: PlayerData): Omit<PlayerRow, 'created_at' | 'updated_at'> {
  // Clean stats: pastikan tidak ada _skillSlots yang tersimpan di stats
  const cleanStats = { ...(pd.stats ?? {}) } as any;
  delete cleanStats._skillSlots; // hapus hack lama jika ada

  // BUGFIX: embed top-level currentStamina ke dalam stats JSONB untuk persistensi DB
  // Ini diperlukan agar nilai stamina tersimpan meski tidak ada kolom dedicated di DB.
  if (typeof pd.currentStamina === 'number') {
    cleanStats.currentStamina = pd.currentStamina;
  }
  // BUGFIX: embed currentMana di JSONB juga — sehingga nilai 0 mana yang genuine
  // tidak salah dibaca sebagai "undefined (pakai max)" lewat sentinel kolom current_mana.
  if (typeof pd.currentMana === 'number') {
    cleanStats.currentMana = pd.currentMana;
  }

  return {
    id                   : pd.id,
    name                 : pd.name,
    email                : pd.email,
    gender               : pd.gender ?? null,
    role                 : pd.role,
    karma                : pd.karma,
    faction              : pd.faction,
    level                : pd.level,
    experience           : pd.experience,
    gold                 : pd.gold,
    free_points          : pd.freePoints,
    location             : pd.location,
    element_affinity     : pd.elementAffinity ?? 'none',
    core_stats           : pd.coreStats,
    stats                : cleanStats,
    equipment            : pd.equipment,
    inventory            : pd.inventory,
    equipment_core_bonus : pd.equipmentCoreBonus,
    tutorial_progress    : pd.tutorialProgress,
    // ── Kolom dedikasi patch v2 ──────────────────────────────────────────
    skill_slots          : pd.skillSlots ?? DEFAULT_SKILL_SLOTS,
    // current_mana kolom dipertahankan untuk backward-compat & fallback lama.
    // Primary storage sekarang adalah stats JSONB (cleanStats.currentMana di atas).
    current_mana         : pd.currentMana !== undefined ? pd.currentMana : null,
  };
}

// ── Mapping: database row → PlayerData ───────────────────────────────────────
export function rowToPlayerData(row: PlayerRow): PlayerData {
  const DEFAULT_ELEMENTAL = { fire:0,water:0,wind:0,earth:0,lightning:0,forest:0,light:0,dark:0 };
  const DEFAULT_RESIST    = { poison:0,burn:0,bleed:0 };

  const rawStats = row.stats ?? {};
  const stats: PlayerStats = {
    hp            : (rawStats as any).hp            ?? 100,
    mp            : (rawStats as any).mp            ?? 0,
    stamina       : (rawStats as any).stamina       ?? 100,
    physicalAtk   : (rawStats as any).physicalAtk   ?? 10,
    magicAtk      : (rawStats as any).magicAtk      ?? 0,
    accuracy      : (rawStats as any).accuracy      ?? 100,
    critRate      : (rawStats as any).critRate      ?? 0,
    critDamage    : (rawStats as any).critDamage    ?? 120,
    physicalDef   : (rawStats as any).physicalDef   ?? 5,
    magicDef      : (rawStats as any).magicDef      ?? 5,
    dodge         : (rawStats as any).dodge         ?? 0,
    critDmgReduce : (rawStats as any).critDmgReduce ?? 0,
    statusResist  : (rawStats as any).statusResist  ?? { ...DEFAULT_RESIST },
    elementalAtk  : (rawStats as any).elementalAtk  ?? { ...DEFAULT_ELEMENTAL },
    elementalDef  : (rawStats as any).elementalDef  ?? { ...DEFAULT_ELEMENTAL },
  };

  // ── Skill slots: baca dari kolom dedikasi dulu, fallback ke hack lama ───
  const skillSlots: SkillSlots =
    row.skill_slots ??
    (rawStats as any)._skillSlots ??
    DEFAULT_SKILL_SLOTS;

  const equipment: Equipment = row.equipment ?? {
    helm: null, rightHand: null, leftHand: null, armor: null,
    boots: null, pants: null, ringRight: null, ringLeft: null,
    earringRight: null, earringLeft: null,
  };

  // ── Migrasi: pastikan setiap InventoryItem punya weaponType yang benar ──────
  // Item lama (sebelum weaponType ditambahkan) tidak memiliki field ini di JSONB.
  // Kita restore dari ITEM_DEFS berdasarkan defId agar weapon detection tidak rusak.
  const hydrateItem = (item: any): InventoryItem | null => {
    if (!item) return null;
    if (item.weaponType !== undefined) return item as InventoryItem; // sudah ada, skip
    const def = item.defId ? ITEM_DEFS[item.defId] : null;
    return { ...item, weaponType: def?.weaponType } as InventoryItem;
  };

  const hydratedEquipment: Equipment = {
    helm         : hydrateItem(equipment.helm),
    rightHand    : hydrateItem(equipment.rightHand),
    leftHand     : hydrateItem(equipment.leftHand),
    armor        : hydrateItem(equipment.armor),
    boots        : hydrateItem(equipment.boots),
    pants        : hydrateItem(equipment.pants),
    ringRight    : hydrateItem(equipment.ringRight),
    ringLeft     : hydrateItem(equipment.ringLeft),
    earringRight : hydrateItem(equipment.earringRight),
    earringLeft  : hydrateItem(equipment.earringLeft),
  };

  const hydratedInventory: InventoryItem[] = (row.inventory ?? []).map((item: any) => hydrateItem(item) ?? item);

  const tutorialProgress: TutorialProgress = {
    gotWeapon      : (row.tutorial_progress as any)?.gotWeapon       ?? false,
    defeatedDummies: (row.tutorial_progress as any)?.defeatedDummies ?? ((row.tutorial_progress as any)?.defeatedBoars >= 4 ? 3 : 0),
    defeatedGuards : (row.tutorial_progress as any)?.defeatedGuards  ?? ((row.tutorial_progress as any)?.trainedAtArena ? 5 : 0),
    meditated      : (row.tutorial_progress as any)?.meditated       ?? false,
    reachedLevel5  : (row.tutorial_progress as any)?.reachedLevel5   ?? false,
    completed      : (row.tutorial_progress as any)?.completed       ?? false,
  };

  // ── currentMana: baca dari JSONB dulu (primary), fallback ke kolom untuk data lama ──
  // Alasan JSONB-first: kolom current_mana menggunakan sentinel 0 = "belum pernah disimpan"
  // (DEFAULT 0), sehingga nilai 0 yang genuine (habis) tidak bisa dibedakan dari new player.
  // JSONB tidak punya masalah ini: nilainya hanya ada jika memang pernah disimpan eksplisit.
  const manaFromJsonb: number | undefined =
    typeof (rawStats as any).currentMana === 'number' && (rawStats as any).currentMana >= 0
      ? (rawStats as any).currentMana
      : undefined;
  // Fallback: kolom current_mana lama — pakai sentinel > 0 agar tidak salah ambil DEFAULT 0
  const manaFromCol: number | undefined =
    (row.current_mana != null && row.current_mana > 0) ? row.current_mana : undefined;
  const currentMana: number | undefined = manaFromJsonb !== undefined ? manaFromJsonb : manaFromCol;

  // ── currentStamina: baca dari stats JSONB — undefined = "gunakan max" ──
  const currentStamina: number | undefined =
    typeof (rawStats as any).currentStamina === 'number' && (rawStats as any).currentStamina >= 0
      ? (rawStats as any).currentStamina
      : undefined;

  return {
    id               : row.id,
    name             : row.name ?? '',
    email            : row.email ?? '',
    gender           : (row.gender as any) ?? undefined,
    elementAffinity  : (row.element_affinity as ElementType) ?? 'none',
    role             : row.role ?? 'unknown',
    karma            : row.karma ?? 0,
    faction          : row.faction ?? 'neutral',
    level            : row.level ?? 1,
    experience       : row.experience ?? 0,
    gold             : row.gold ?? 100,
    coreStats        : row.core_stats ?? { str:1, int:1, dex:1, vit:1, agi:1 },
    freePoints       : row.free_points ?? 0,
    equipmentCoreBonus: row.equipment_core_bonus ?? { str:0, int:0, dex:0, vit:0, agi:0 },
    stats,
    skillSlots,
    currentMana,       // undefined → ArenaPage akan pakai max mana
    currentStamina,    // undefined → ArenaPage akan pakai max stamina
    equipment  : hydratedEquipment,
    inventory  : hydratedInventory,
    tutorialProgress,
    location         : row.location ?? 'greenleaf_village',
    createdAt        : row.created_at ?? new Date().toISOString(),
  };
}

// ── Fetch player row dari database ───────────────────────────────────────────
export async function fetchPlayerRow(supabase: SupabaseClient, userId: string): Promise<PlayerRow | null> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    // PGRST116 = no rows found — normal untuk pemain baru
    if (error.code === 'PGRST116') return null;
    throw new Error(error.message);
  }
  return data as PlayerRow;
}

// ── Insert player baru ───────────────────────────────────────────────────────
export async function insertPlayerRow(supabase: SupabaseClient, pd: PlayerData): Promise<void> {
  const row = playerDataToRow(pd);
  const { error } = await supabase.from('players').insert(row);
  if (error) throw new Error(error.message);
}

// ── Update player ─────────────────────────────────────────────────────────────
export async function updatePlayerRow(supabase: SupabaseClient, pd: PlayerData): Promise<void> {
  const row = playerDataToRow(pd);
  const { error } = await supabase.from('players').update(row).eq('id', pd.id);
  if (error) throw new Error(error.message);
}

// ── Fetch ALL players (admin only — butuh service role) ───────────────────────
export async function fetchAllPlayerRows(adminClient: SupabaseClient): Promise<PlayerRow[]> {
  const { data, error } = await adminClient.from('players').select('*').order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as PlayerRow[];
}

// ── Update player by admin ────────────────────────────────────────────────────
export async function adminUpdatePlayerRow(adminClient: SupabaseClient, id: string, fields: Partial<PlayerRow>): Promise<void> {
  const { error } = await adminClient.from('players').update(fields).eq('id', id);
  if (error) throw new Error(error.message);
}

// ── Delete player data (bukan akun auth — hanya baris di players table) ──────
export async function adminDeletePlayerRow(adminClient: SupabaseClient, id: string): Promise<void> {
  const { error } = await adminClient.from('players').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ════════════════════════════════════════════════════════════════════════════════
// BATTLE SECURITY LAYER
// Run BATTLE_SECURITY_SQL once in the Supabase SQL Editor to set up the
// battle_sessions table, enemy_registry, and two SECURITY DEFINER RPCs.
// ════════════════════════════════════════════════════════════════════════════════

export const BATTLE_SECURITY_SQL = `
-- ── 1. Battle sessions ─────────────────────────────────────────────��─────────
-- Each battle issues a single-use UUID token. Claiming a reward consumes
-- the token; double-claims and replays are rejected by the RPC.
CREATE TABLE IF NOT EXISTS public.battle_sessions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enemy_id   TEXT        NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  claimed_at TIMESTAMPTZ,
  turn_count INTEGER     DEFAULT 0,
  is_claimed BOOLEAN     NOT NULL DEFAULT FALSE,
  CONSTRAINT chk_valid_enemy
    CHECK (enemy_id IN ('wooden_dummy','rookie_guard','veteran_guard','shadow_lurker'))
);
CREATE INDEX IF NOT EXISTS battle_sessions_player_idx
  ON public.battle_sessions (player_id, is_claimed);

ALTER TABLE public.battle_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bsess_select_own" ON public.battle_sessions;
DROP POLICY IF EXISTS "bsess_insert_own" ON public.battle_sessions;
CREATE POLICY "bsess_select_own" ON public.battle_sessions
  FOR SELECT USING (auth.uid() = player_id);
CREATE POLICY "bsess_insert_own" ON public.battle_sessions
  FOR INSERT WITH CHECK (auth.uid() = player_id);
-- No UPDATE/DELETE policies: only SECURITY DEFINER functions can mutate

-- ── 2. Server-authoritative enemy reward registry ─────────────────────────────
-- Reward values live ONLY here. The client submits the enemy_id;
-- the RPC looks up and applies the correct amount — client numbers are ignored.
CREATE TABLE IF NOT EXISTS public.enemy_registry (
  enemy_id    TEXT    PRIMARY KEY,
  reward_exp  INTEGER NOT NULL,
  reward_gold INTEGER NOT NULL,
  min_turns   INTEGER NOT NULL DEFAULT 1,
  min_seconds INTEGER NOT NULL DEFAULT 3
);
ALTER TABLE public.enemy_registry ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ereg_public_read" ON public.enemy_registry;
CREATE POLICY "ereg_public_read" ON public.enemy_registry FOR SELECT USING (true);

INSERT INTO public.enemy_registry (enemy_id, reward_exp, reward_gold, min_turns, min_seconds) VALUES
  ('wooden_dummy',   15,   5,  1,  1),
  ('rookie_guard',   40,  15,  1,  1),
  ('veteran_guard', 120,  40,  1,  1),
  ('shadow_lurker', 280,  90,  1,  1)
ON CONFLICT (enemy_id) DO UPDATE SET
  reward_exp  = EXCLUDED.reward_exp,
  reward_gold = EXCLUDED.reward_gold,
  min_turns   = EXCLUDED.min_turns,
  min_seconds = EXCLUDED.min_seconds;

-- ── 3. RPC: start_battle(enemy_id) → UUID token ───────────────────────────────
CREATE OR REPLACE FUNCTION public.start_battle(p_enemy_id TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pid   UUID;
  v_token UUID;
BEGIN
  v_pid := auth.uid();
  IF v_pid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;

  -- Reject unknown enemies immediately
  IF NOT EXISTS (SELECT 1 FROM enemy_registry WHERE enemy_id = p_enemy_id) THEN
    RAISE EXCEPTION 'INVALID_ENEMY';
  END IF;

  -- Purge sessions older than 30 minutes
  DELETE FROM battle_sessions
  WHERE player_id = v_pid AND is_claimed = FALSE
    AND started_at < NOW() - INTERVAL '30 minutes';

  -- Cancel any still-active session (only 1 active per player at a time)
  UPDATE battle_sessions
  SET is_claimed = TRUE, claimed_at = NOW()
  WHERE player_id = v_pid AND is_claimed = FALSE;

  -- Issue fresh token
  INSERT INTO battle_sessions (player_id, enemy_id)
  VALUES (v_pid, p_enemy_id)
  RETURNING id INTO v_token;

  RETURN v_token;
END;
$$;

-- ── 4. RPC: claim_battle_reward(token, enemy_id, turns) → JSONB ───────────────
-- This is the ONLY path that awards EXP and Gold.
-- Validations: token ownership, single-use, enemy match, timing, turn count.
-- Reward amounts come from enemy_registry, NOT from the client.
CREATE OR REPLACE FUNCTION public.claim_battle_reward(
  p_token    UUID,
  p_enemy_id TEXT,
  p_turns    INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pid      UUID;
  v_session  battle_sessions%ROWTYPE;
  v_enemy    enemy_registry%ROWTYPE;
  v_player   players%ROWTYPE;
  v_new_exp  BIGINT;
  v_new_gold INTEGER;
BEGIN
  v_pid := auth.uid();
  IF v_pid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;

  -- Lock session row to prevent concurrent double-claims (NOWAIT = fail fast)
  SELECT * INTO v_session
  FROM battle_sessions
  WHERE id = p_token AND player_id = v_pid
  FOR UPDATE NOWAIT;

  IF NOT FOUND          THEN RAISE EXCEPTION 'INVALID_TOKEN';    END IF;
  IF v_session.is_claimed THEN RAISE EXCEPTION 'ALREADY_CLAIMED'; END IF;
  IF v_session.enemy_id <> p_enemy_id THEN RAISE EXCEPTION 'ENEMY_MISMATCH'; END IF;

  -- Authoritative reward data
  SELECT * INTO v_enemy FROM enemy_registry WHERE enemy_id = p_enemy_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_ENEMY'; END IF;

  -- Minimum battle duration (blocks instant-win exploits via phase manipulation)
  IF EXTRACT(EPOCH FROM (NOW() - v_session.started_at)) < v_enemy.min_seconds THEN
    RAISE EXCEPTION 'TOO_FAST';
  END IF;

  -- Minimum turn count (blocks 0-turn insta-claim via DevTools state injection)
  IF p_turns < v_enemy.min_turns  THEN RAISE EXCEPTION 'INSUFFICIENT_TURNS'; END IF;
  IF p_turns > 2000               THEN RAISE EXCEPTION 'INVALID_TURNS';       END IF;

  -- Current player data
  SELECT * INTO v_player FROM players WHERE id = v_pid;
  IF NOT FOUND THEN RAISE EXCEPTION 'PLAYER_NOT_FOUND'; END IF;

  -- Compute rewards using ONLY server-side values (client amounts are never used)
  v_new_exp  := LEAST(999999999, v_player.experience + v_enemy.reward_exp);
  v_new_gold := v_player.gold + v_enemy.reward_gold;

  -- Consume token (single-use — prevents replay attacks)
  UPDATE battle_sessions
  SET is_claimed = TRUE, claimed_at = NOW(), turn_count = p_turns
  WHERE id = p_token;

  -- Apply rewards (ONLY experience and gold — nothing else changes here)
  UPDATE players
  SET experience = v_new_exp, gold = v_new_gold
  WHERE id = v_pid;

  RETURN jsonb_build_object(
    'ok',          TRUE,
    'exp_gained',  v_enemy.reward_exp,
    'gold_gained', v_enemy.reward_gold,
    'new_exp',     v_new_exp,
    'new_gold',    v_new_gold
  );
END;
$$;

-- Grant execute rights to authenticated users only
REVOKE ALL ON FUNCTION public.start_battle(TEXT)                      FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_battle_reward(UUID, TEXT, INTEGER) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.start_battle(TEXT)                      TO authenticated;
GRANT  EXECUTE ON FUNCTION public.claim_battle_reward(UUID, TEXT, INTEGER) TO authenticated;
`;

// ── TypeScript helpers for battle RPC calls ───────────────────────────────────

/**
 * Call start_battle RPC — creates a server-side battle session with player stat snapshot.
 * Returns the battle token (UUID string) or throws on failure.
 * With server-side engine, a missing token means battle CANNOT start.
 */
export async function startBattleSession(
  supabase: SupabaseClient,
  enemyId : string,
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('start_battle', { p_enemy_id: enemyId });
    if (error) {
      console.warn('[BattleSec] start_battle failed:', error.message);
      return null;
    }
    return data as string;
  } catch (err: any) {
    console.warn('[BattleSec] start_battle exception:', err.message);
    return null;
  }
}

// ── Types for server-side turn processing ────────────────────────────────────

export interface ServerBuff {
  uid        : number;
  type       : string;
  value      : number;
  value2?    : number;
  value3?    : number;
  turns_left : number;   // -1 = until-consumed
  loses_on_hit: boolean;
}

export interface ServerEnemyAction {
  type       : string;
  name       : string;
  icon       : string;
  dmg        : number;
  raw_dmg    : number;
  is_dodged  : boolean;
  is_guard   : boolean;
  is_ultimate: boolean;
}

export interface ProcessTurnResult {
  ok              : boolean;
  // Player action
  player_dmg      : number;
  is_crit         : boolean;
  skill_id        : string | null;
  // Multi-hit breakdown (empty array = single hit / normal attack)
  hit_count       : number;
  hit_damages     : number[];
  // DOT/HOT
  dot_enemy_dmg   : number;
  hot_player_heal : number;
  // Enemy action
  enemy_action    : ServerEnemyAction;
  reflect_dmg     : number;
  was_parried     : boolean;
  parry_reduced   : number;
  // Final state — null berarti server tidak mengembalikan field ini (jangan update nilai lama)
  new_player_hp   : number | null;
  new_enemy_hp    : number | null;
  new_stamina     : number | null;
  new_mana        : number | null;
  // Battle outcome
  turn_count      : number;
  victory         : boolean;
  defeat          : boolean;
  // Updated state for display
  player_buffs    : ServerBuff[];
  enemy_debuffs   : ServerBuff[];
  skill_cooldowns : Record<string, number>;
}

export interface BattleRewardResult {
  expGained  : number;
  goldGained : number;
  newExp     : number;
  newGold    : number;
}

/**
 * Call process_turn RPC — server computes the full turn result using DB-stored player stats.
 * Client sends only the action choice; damage, HP, buffs, etc. all computed server-side.
 * THROWS with the Postgres error code on failure (e.g. 'INSUFFICIENT_STAMINA', 'SKILL_ON_COOLDOWN').
 */
export async function processTurnRpc(
  supabase  : SupabaseClient,
  token     : string,
  action    : 'attack' | 'defend' | 'skill',
  skillId   : string | null = null,
): Promise<ProcessTurnResult> {
  // IMPORTANT: Do NOT send p_skill_id when null.
  // PostgREST cannot infer the type of a null parameter and will report
  // "Could not find the function … in the schema cache" even if the function
  // exists. Omitting the key lets PostgreSQL apply the DEFAULT NULL on the
  // server side, which resolves the overload correctly.
  const rpcParams: Record<string, string> = {
    p_token  : token,
    p_action : action,
  };
  if (skillId !== null && skillId !== undefined) {
    rpcParams.p_skill_id = skillId;
  }

  const { data, error } = await supabase.rpc('process_turn', rpcParams);

  if (error) {
    // Surface a clear message distinguishing "function missing" from game errors
    const msg = error.message ?? 'RPC_ERROR';
    if (msg.includes('Could not find the function') || msg.includes('schema cache')) {
      throw new Error('FUNCTION_NOT_DEPLOYED');
    }
    throw new Error(msg);
  }
  if (!data || typeof data !== 'object') {
    throw new Error('EMPTY_RESPONSE');
  }

  const d = data as any;
  return {
    ok              : d.ok              ?? false,
    player_dmg      : d.player_dmg      ?? 0,
    is_crit         : d.is_crit         ?? false,
    skill_id        : d.skill_id        ?? null,
    hit_count       : d.hit_count       ?? 1,
    hit_damages     : Array.isArray(d.hit_damages) ? d.hit_damages : [],
    dot_enemy_dmg   : d.dot_enemy_dmg   ?? 0,
    hot_player_heal : d.hot_player_heal ?? 0,
    enemy_action    : d.enemy_action    ?? { type:'basic', name:'Serangan Dasar', icon:'⚔️', dmg:0, raw_dmg:0, is_dodged:false, is_guard:false, is_ultimate:false },
    reflect_dmg     : d.reflect_dmg     ?? 0,
    was_parried     : d.was_parried     ?? false,
    parry_reduced   : d.parry_reduced   ?? 0,
    // FIX: Jangan gunakan ?? 0 untuk nilai HP/stamina/mana!
    // Jika server mengembalikan null/undefined (field tidak ada atau SQL variable belum di-set),
    // ?? 0 akan mengubahnya menjadi 0 → menyebabkan HP/stamina/mana tampil 0 di client.
    // Sekarang kita gunakan null sebagai sentinel "server tidak mengembalikan nilai ini"
    // sehingga client bisa mempertahankan nilai sebelumnya alih-alih menjadi 0.
    new_player_hp   : (d.new_player_hp  !== undefined && d.new_player_hp  !== null) ? Number(d.new_player_hp)  : null,
    new_enemy_hp    : (d.new_enemy_hp   !== undefined && d.new_enemy_hp   !== null) ? Number(d.new_enemy_hp)   : null,
    new_stamina     : (d.new_stamina    !== undefined && d.new_stamina    !== null) ? Number(d.new_stamina)    : null,
    new_mana        : (d.new_mana       !== undefined && d.new_mana       !== null) ? Number(d.new_mana)       : null,
    turn_count      : d.turn_count      ?? 0,
    victory         : d.victory         ?? false,
    defeat          : d.defeat          ?? false,
    player_buffs    : d.player_buffs    ?? [],
    enemy_debuffs   : d.enemy_debuffs   ?? [],
    skill_cooldowns : d.skill_cooldowns ?? {},
  };
}

/**
 * Call claim_battle_reward RPC (v2 — no enemy_id or turns needed from client).
 * Server validates battle_status='victory' which was set by process_turn server-side.
 * THROWS on failure.
 */
export async function claimBattleRewardRpc(
  supabase : SupabaseClient,
  token    : string,
): Promise<BattleRewardResult> {
  const { data, error } = await supabase.rpc('claim_battle_reward', {
    p_token: token,
  });

  if (error) {
    const msg = error.message ?? 'RPC_ERROR';
    if (msg.includes('Could not find the function') || msg.includes('schema cache')) {
      throw new Error('FUNCTION_NOT_DEPLOYED');
    }
    throw new Error(msg);
  }
  if (!data || typeof data !== 'object') {
    throw new Error('EMPTY_RESPONSE');
  }

  const d = data as any;
  return {
    expGained  : d.exp_gained  ?? 0,
    goldGained : d.gold_gained ?? 0,
    newExp     : d.new_exp     ?? 0,
    newGold    : d.new_gold    ?? 0,
  };
}

/**
 * Get current battle state from server (for reconnect / error recovery).
 */
export async function getBattleStateRpc(
  supabase: SupabaseClient,
  token   : string,
): Promise<{ battle_status: string; player_hp: number; new_enemy_hp: number; turn_count: number } | null> {
  try {
    const { data, error } = await supabase.rpc('get_battle_state', { p_token: token });
    if (error || !data) return null;
    return data as any;
  } catch {
    return null;
  }
}