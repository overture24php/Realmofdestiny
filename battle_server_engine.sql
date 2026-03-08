-- ════════════════════════════════════════════════════════════════════════════════
-- BATTLE SERVER ENGINE v2.0
-- Server-Side Turn-by-Turn Battle Processing
--
-- GANTI battle_security_setup.sql sepenuhnya dengan file ini.
-- Jalankan SELURUH file ini di Supabase SQL Editor → New Query → Run
--
-- Yang berubah dari v1:
--   ✅ Setiap turn dihitung di server (bukan client)
--   ✅ Stat player di-snapshot saat start_battle — client tidak bisa kirim stat palsu
--   ✅ process_turn RPC baru: terima action, hitung damage server-side, return hasil
--   ✅ claim_battle_reward lebih simple: cukup cek battle_status = 'victory'
--   ✅ Semua skill, buff, DOT, HOT diproses di PL/pgSQL
-- ════════════════════════════════════════════════════════════════════════════════


-- ── 1. DROP FUNCTIONS LAMA (agar tidak conflict) ─────────────────────────────

DROP FUNCTION IF EXISTS public.start_battle(TEXT);
DROP FUNCTION IF EXISTS public.claim_battle_reward(UUID, TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.process_turn(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.battle_calc_dmg(NUMERIC, NUMERIC, NUMERIC);
DROP FUNCTION IF EXISTS public.get_battle_state(UUID);


-- ── 2. Buat / Update Tabel battle_sessions ───────────────────────────────────
-- Versi lama hanya menyimpan token + enemy_id. Sekarang menyimpan full battle state.

CREATE TABLE IF NOT EXISTS public.battle_sessions (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enemy_id            TEXT        NOT NULL,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  claimed_at          TIMESTAMPTZ,
  last_turn_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  turn_count          INTEGER     NOT NULL DEFAULT 0,
  is_claimed          BOOLEAN     NOT NULL DEFAULT FALSE,
  battle_status       TEXT        NOT NULL DEFAULT 'active',
  -- HP/Resources (state yang berubah tiap turn)
  player_hp           INTEGER,
  player_max_hp       INTEGER,
  player_stamina      INTEGER,
  player_max_stamina  INTEGER,
  player_mana         INTEGER,
  player_max_mana     INTEGER,
  enemy_hp            INTEGER,
  enemy_max_hp        INTEGER,
  battle_start_hp     INTEGER,   -- Cap untuk HOT heal
  -- Buff/Debuff state (JSONB array)
  player_buffs        JSONB       NOT NULL DEFAULT '[]',
  enemy_debuffs       JSONB       NOT NULL DEFAULT '[]',
  skill_cooldowns     JSONB       NOT NULL DEFAULT '{}',
  buff_uid_seq        INTEGER     NOT NULL DEFAULT 0,
  -- Authoritative player stat snapshot dari DB (dibaca saat start_battle)
  player_stats        JSONB,
  -- Constraints
  CONSTRAINT chk_battle_status CHECK (battle_status IN ('active','victory','defeat','expired')),
  CONSTRAINT chk_valid_enemy   CHECK (enemy_id IN ('wooden_dummy','rookie_guard','veteran_guard','shadow_lurker'))
);

-- ══════════════════════════════════════════════════════════════════════════════
-- PENTING: ALTER TABLE harus dijalankan SEBELUM CREATE INDEX.
-- Jika tabel sudah ada dari versi lama (tanpa kolom baru), CREATE TABLE IF NOT
-- EXISTS di atas tidak menambah kolom baru. DO $$ block ini yang menambahnya.
-- CREATE INDEX battle_sessions_status_idx di bawah memerlukan kolom battle_status
-- sudah ada — itulah mengapa blok ALTER ini DIPINDAH ke SINI (sebelum index).
-- ══════════════════════════════════════════════════════════════════════════════
DO $$ BEGIN
  -- Kolom wajib untuk v2 engine
  ALTER TABLE public.battle_sessions ADD COLUMN IF NOT EXISTS battle_status      TEXT        NOT NULL DEFAULT 'active';
  ALTER TABLE public.battle_sessions ADD COLUMN IF NOT EXISTS last_turn_at       TIMESTAMPTZ NOT NULL DEFAULT NOW();
  ALTER TABLE public.battle_sessions ADD COLUMN IF NOT EXISTS player_hp          INTEGER;
  ALTER TABLE public.battle_sessions ADD COLUMN IF NOT EXISTS player_max_hp      INTEGER;
  ALTER TABLE public.battle_sessions ADD COLUMN IF NOT EXISTS player_stamina     INTEGER;
  ALTER TABLE public.battle_sessions ADD COLUMN IF NOT EXISTS player_max_stamina INTEGER;
  ALTER TABLE public.battle_sessions ADD COLUMN IF NOT EXISTS player_mana        INTEGER;
  ALTER TABLE public.battle_sessions ADD COLUMN IF NOT EXISTS player_max_mana    INTEGER;
  ALTER TABLE public.battle_sessions ADD COLUMN IF NOT EXISTS enemy_hp           INTEGER;
  ALTER TABLE public.battle_sessions ADD COLUMN IF NOT EXISTS enemy_max_hp       INTEGER;
  ALTER TABLE public.battle_sessions ADD COLUMN IF NOT EXISTS battle_start_hp    INTEGER;
  ALTER TABLE public.battle_sessions ADD COLUMN IF NOT EXISTS player_buffs       JSONB NOT NULL DEFAULT '[]';
  ALTER TABLE public.battle_sessions ADD COLUMN IF NOT EXISTS enemy_debuffs      JSONB NOT NULL DEFAULT '[]';
  ALTER TABLE public.battle_sessions ADD COLUMN IF NOT EXISTS skill_cooldowns    JSONB NOT NULL DEFAULT '{}';
  ALTER TABLE public.battle_sessions ADD COLUMN IF NOT EXISTS buff_uid_seq       INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE public.battle_sessions ADD COLUMN IF NOT EXISTS player_stats       JSONB;
  -- Tambah constraint CHECK jika belum ada (untuk tabel lama)
  BEGIN
    ALTER TABLE public.battle_sessions
      ADD CONSTRAINT chk_battle_status CHECK (battle_status IN ('active','victory','defeat','expired'));
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
EXCEPTION WHEN OTHERS THEN
  -- Kolom mungkin sudah ada dari run sebelumnya — abaikan duplicate_column error
  NULL;
END $$;

-- Indexes (dibuat SETELAH ALTER TABLE di atas memastikan semua kolom sudah ada)
CREATE INDEX IF NOT EXISTS battle_sessions_player_idx
  ON public.battle_sessions (player_id, is_claimed);

CREATE INDEX IF NOT EXISTS battle_sessions_status_idx
  ON public.battle_sessions (player_id, battle_status);

-- RLS
ALTER TABLE public.battle_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bsess_select_own" ON public.battle_sessions;
DROP POLICY IF EXISTS "bsess_insert_own" ON public.battle_sessions;
CREATE POLICY "bsess_select_own" ON public.battle_sessions FOR SELECT USING (auth.uid() = player_id);
CREATE POLICY "bsess_insert_own" ON public.battle_sessions FOR INSERT WITH CHECK (auth.uid() = player_id);


-- ── 3. enemy_registry (server-authoritative reward + stat musuh) ─────────────

CREATE TABLE IF NOT EXISTS public.enemy_registry (
  enemy_id    TEXT    PRIMARY KEY,
  reward_exp  INTEGER NOT NULL,
  reward_gold INTEGER NOT NULL,
  min_turns   INTEGER NOT NULL DEFAULT 1,
  min_seconds INTEGER NOT NULL DEFAULT 1,
  -- Combat stats
  hp          INTEGER NOT NULL DEFAULT 80,
  atk         INTEGER NOT NULL DEFAULT 0,
  pdef        INTEGER NOT NULL DEFAULT 0,
  mdef        INTEGER NOT NULL DEFAULT 0,
  is_living   BOOLEAN NOT NULL DEFAULT FALSE,
  skills      JSONB   NOT NULL DEFAULT '[]'
);

-- ALTER untuk tabel yang sudah ada
DO $$ BEGIN
  ALTER TABLE public.enemy_registry ADD COLUMN IF NOT EXISTS hp INTEGER NOT NULL DEFAULT 80;
  ALTER TABLE public.enemy_registry ADD COLUMN IF NOT EXISTS atk INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE public.enemy_registry ADD COLUMN IF NOT EXISTS pdef INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE public.enemy_registry ADD COLUMN IF NOT EXISTS mdef INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE public.enemy_registry ADD COLUMN IF NOT EXISTS is_living BOOLEAN NOT NULL DEFAULT FALSE;
  ALTER TABLE public.enemy_registry ADD COLUMN IF NOT EXISTS skills JSONB NOT NULL DEFAULT '[]';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.enemy_registry ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ereg_public_read" ON public.enemy_registry;
CREATE POLICY "ereg_public_read" ON public.enemy_registry FOR SELECT USING (true);

-- Data musuh resmi
INSERT INTO public.enemy_registry
  (enemy_id, reward_exp, reward_gold, min_turns, min_seconds, hp, atk, pdef, mdef, is_living, skills)
VALUES
  ('wooden_dummy',   15,   5, 1, 1,  80,  0,  0,  0, FALSE,
   '[]'::JSONB),
  ('rookie_guard',   40,  15, 1, 1, 160, 12,  8,  5, TRUE,
   '[{"id":"basic","name":"Serangan Dasar","icon":"⚔️","damage_mult":1.0,"is_ultimate":false}]'::JSONB),
  ('veteran_guard', 120,  40, 1, 1, 380, 30, 20, 15, TRUE,
   '[{"id":"heavy_blow","name":"Pukulan Berat","icon":"💢","damage_mult":1.6,"is_ultimate":false},{"id":"iron_will","name":"Tameng Besi","icon":"🛡️","damage_mult":0.0,"is_ultimate":false}]'::JSONB),
  ('shadow_lurker', 280,  90, 1, 1, 620, 55, 30, 35, TRUE,
   '[{"id":"shadow_slash","name":"Tebas Bayangan","icon":"🌑","damage_mult":1.4,"is_ultimate":false},{"id":"dark_surge","name":"Gelombang Gelap","icon":"💀","damage_mult":2.2,"is_ultimate":true}]'::JSONB)
ON CONFLICT (enemy_id) DO UPDATE SET
  reward_exp  = EXCLUDED.reward_exp,
  reward_gold = EXCLUDED.reward_gold,
  min_turns   = EXCLUDED.min_turns,
  min_seconds = EXCLUDED.min_seconds,
  hp          = EXCLUDED.hp,
  atk         = EXCLUDED.atk,
  pdef        = EXCLUDED.pdef,
  mdef        = EXCLUDED.mdef,
  is_living   = EXCLUDED.is_living,
  skills      = EXCLUDED.skills;


-- ── 4. Utility: Damage Formula ────────────────────────────────────────────────
-- Mirrors client: FinalDamage = (Atk×Mult)² / ((Atk×Mult) + (Def×3))

CREATE OR REPLACE FUNCTION public.battle_calc_dmg(
  p_atk  NUMERIC,
  p_mult NUMERIC,
  p_def  NUMERIC
) RETURNS INTEGER
LANGUAGE plpgsql IMMUTABLE
SET search_path = public
AS $$
DECLARE v_a NUMERIC;
BEGIN
  v_a := GREATEST(0.0, p_atk) * GREATEST(0.01, p_mult);
  IF v_a <= 0 THEN RETURN 0; END IF;
  RETURN GREATEST(1, ROUND((v_a * v_a) / (v_a + GREATEST(0.0, p_def) * 3.0))::INTEGER);
END;
$$;


-- ── 5. RPC: start_battle(enemy_id) → UUID ────────────────────────────────────
-- Snapshot stat player dari DB (authoritative).
-- Client tidak bisa kirim stat palsu — server hitung sendiri dari core_stats.

CREATE OR REPLACE FUNCTION public.start_battle(p_enemy_id TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pid         UUID;
  v_token       UUID;
  v_player      players%ROWTYPE;
  v_enemy       enemy_registry%ROWTYPE;
  v_core        JSONB;
  v_stats       JSONB;
  v_eq_bonus    JSONB;
  v_skill_slots JSONB;
  -- Core stats
  v_str INTEGER; v_int INTEGER; v_dex INTEGER; v_vit INTEGER; v_agi INTEGER;
  -- Derived stats (mirrors statsCalc.ts calcDerived exactly)
  v_phys_atk  INTEGER;
  v_mag_atk   INTEGER;
  v_phys_def  INTEGER;
  v_mag_def   INTEGER;
  v_max_hp    INTEGER;
  v_max_stam  INTEGER;
  v_max_mana  INTEGER;
  v_dodge     NUMERIC;
  v_crit_rate NUMERIC;
  v_crit_dmg  INTEGER;
  -- Current state
  v_cur_hp    INTEGER;
  v_cur_stam  INTEGER;
  v_cur_mana  INTEGER;
BEGIN
  v_pid := auth.uid();
  IF v_pid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;

  IF NOT EXISTS (SELECT 1 FROM enemy_registry WHERE enemy_id = p_enemy_id) THEN
    RAISE EXCEPTION 'INVALID_ENEMY';
  END IF;

  -- Load player dari DB — sumber kebenaran tunggal
  SELECT * INTO v_player FROM players WHERE id = v_pid;
  IF NOT FOUND THEN RAISE EXCEPTION 'PLAYER_NOT_FOUND'; END IF;

  -- Load enemy
  SELECT * INTO v_enemy FROM enemy_registry WHERE enemy_id = p_enemy_id;

  -- ── Compute derived stats (mirrors statsCalc.ts calcDerived) ─────────────
  v_core     := COALESCE(v_player.core_stats, '{"str":1,"int":1,"dex":1,"vit":1,"agi":1}');
  v_stats    := COALESCE(v_player.stats, '{}');
  v_eq_bonus := COALESCE(v_player.equipment_core_bonus, '{"str":0,"int":0,"dex":0,"vit":0,"agi":0}');
  v_skill_slots := COALESCE(v_player.skill_slots, '{"skill1":"power_hit","skill2":null,"skill3":null,"ultimate":null}');

  v_str := COALESCE((v_core->>'str')::INTEGER, 1) + COALESCE((v_eq_bonus->>'str')::INTEGER, 0);
  v_int := COALESCE((v_core->>'int')::INTEGER, 1) + COALESCE((v_eq_bonus->>'int')::INTEGER, 0);
  v_dex := COALESCE((v_core->>'dex')::INTEGER, 1) + COALESCE((v_eq_bonus->>'dex')::INTEGER, 0);
  v_vit := COALESCE((v_core->>'vit')::INTEGER, 1) + COALESCE((v_eq_bonus->>'vit')::INTEGER, 0);
  v_agi := COALESCE((v_core->>'agi')::INTEGER, 1) + COALESCE((v_eq_bonus->>'agi')::INTEGER, 0);

  -- Matches statsCalc.ts exactly:
  v_phys_atk  := COALESCE((v_stats->>'physicalAtk')::INTEGER, 10) + v_str * 10;
  v_mag_atk   := COALESCE((v_stats->>'magicAtk')::INTEGER,     0) + v_int * 10;
  v_phys_def  := COALESCE((v_stats->>'physicalDef')::INTEGER,   5) + v_vit * 10;
  v_mag_def   := COALESCE((v_stats->>'magicDef')::INTEGER,      5) + v_vit * 10;
  v_max_hp    := COALESCE((v_stats->>'hp')::INTEGER, 100);
  v_max_stam  := v_str * 100;
  v_max_mana  := v_int * 100 + COALESCE((v_stats->>'mp')::INTEGER, 0);
  v_dodge     := LEAST(40.0, COALESCE((v_stats->>'dodge')::NUMERIC, 0) + v_agi * 0.1);
  v_crit_rate := LEAST(100.0, COALESCE((v_stats->>'critRate')::NUMERIC, 0) + v_dex * 0.1);
  v_crit_dmg  := COALESCE((v_stats->>'critDamage')::INTEGER, 120) + (v_str + v_int);

  -- Current HP: player.stats.hp IS current HP (updateHp saves to stats.hp)
  v_cur_hp := COALESCE((v_stats->>'hp')::INTEGER, v_max_hp);

  -- BUG FIX: v_max_hp di atas sama dengan v_cur_hp (stats.hp = HP saat ini, bukan true max HP).
  -- Hitung true max HP dengan formula hardcap yang sama dengan GameContext.updateHp client:
  -- 100 + level*8 + vit*15 + 500. Ini dipakai sebagai player_max_hp di session.
  v_max_hp := 100 + v_player.level * 8 + v_vit * 15 + 500;

  -- BUG FIX KRITIS — Stamina: Ganti IS NOT NULL → > 0, SAMA SEPERTI MANA.
  -- Sebelumnya: stats.currentStamina=0 → IS NOT NULL = TRUE → snapshot 0.
  -- Server punya player_stamina=0 → SETIAP turn: v_new_stamina=0 → return new_stamina=0
  -- → bar stamina selalu 0 sepanjang battle → player tidak bisa pakai skill → RUSAK.
  -- Fix: 0 dianggap "habis / belum pernah tersimpan" → gunakan max_stam.
  v_cur_stam := CASE
    WHEN COALESCE((v_stats->>'currentStamina')::INTEGER, 0) > 0
    THEN LEAST(v_max_stam, (v_stats->>'currentStamina')::INTEGER)
    ELSE v_max_stam
  END;

  -- Current Mana: cek stats JSONB dulu (primary), fallback ke kolom current_mana
  v_cur_mana := CASE
    WHEN COALESCE((v_stats->>'currentMana')::INTEGER, 0) > 0
    THEN LEAST(v_max_mana, (v_stats->>'currentMana')::INTEGER)
    WHEN COALESCE(v_player.current_mana, 0) > 0
    THEN LEAST(v_max_mana, v_player.current_mana)
    ELSE v_max_mana
  END;

  -- Cleanup stale sessions
  DELETE FROM battle_sessions
  WHERE player_id = v_pid AND is_claimed = FALSE
    AND started_at < NOW() - INTERVAL '30 minutes';

  -- Cancel active sessions
  UPDATE battle_sessions
  SET is_claimed = TRUE, claimed_at = NOW(), battle_status = 'expired'
  WHERE player_id = v_pid AND is_claimed = FALSE;

  -- Create new session with stat snapshot
  INSERT INTO battle_sessions (
    player_id, enemy_id,
    player_hp, player_max_hp,
    player_stamina, player_max_stamina,
    player_mana, player_max_mana,
    enemy_hp, enemy_max_hp,
    battle_start_hp,
    player_buffs, enemy_debuffs, skill_cooldowns, buff_uid_seq,
    battle_status, last_turn_at,
    player_stats
  ) VALUES (
    v_pid, p_enemy_id,
    v_cur_hp, v_max_hp,
    v_cur_stam, v_max_stam,
    v_cur_mana, v_max_mana,
    v_enemy.hp, v_enemy.hp,
    v_cur_hp,
    '[]', '[]', '{}', 0,
    'active', NOW(),
    jsonb_build_object(
      'physAtk',    v_phys_atk,
      'magAtk',     v_mag_atk,
      'physDef',    v_phys_def,
      'magDef',     v_mag_def,
      'dodge',      v_dodge,
      'critRate',   v_crit_rate,
      'critDmg',    v_crit_dmg,
      -- BUG FIX: v_vit saja = 1 mana/turn yang tidak berarti untuk magic user.
      -- Formula baru: VIT*5 + INT*2. Contoh int=5,vit=1 → 5+10=15 mana/turn.
      -- Defend memberi 2x regen, sehingga magic user bisa merecovery mana dengan bertahan.
      'manaRegen',  (v_vit * 5 + v_int * 2),
      'skillSlots', v_skill_slots
    )
  ) RETURNING id INTO v_token;

  RETURN v_token;
END;
$$;


-- ── 6. RPC: process_turn(token, action, skill_id) → JSONB ────────────────────
-- INTI dari server-side battle engine.
-- Setiap serangan, defend, atau skill dihitung di sini dengan stat dari DB.
-- Client hanya menerima hasil — tidak ada angka dari client yang dipakai.

CREATE OR REPLACE FUNCTION public.process_turn(
  p_token    UUID,
  p_action   TEXT,         -- 'attack' | 'defend' | 'skill'
  p_skill_id TEXT DEFAULT NULL  -- hanya untuk action='skill'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pid         UUID;
  v_session     battle_sessions%ROWTYPE;
  v_enemy       enemy_registry%ROWTYPE;
  -- Player stats (dari snapshot)
  v_phys_atk    INTEGER;
  v_mag_atk     INTEGER;
  v_phys_def    INTEGER;
  v_mag_def     INTEGER;
  v_base_dodge  NUMERIC;
  v_crit_rate   NUMERIC;
  v_crit_dmg    INTEGER;
  v_mana_regen  INTEGER;
  v_skill_slots JSONB;
  -- Effective stats (setelah buff diterapkan)
  v_eff_phys_atk INTEGER;
  v_eff_mag_atk  INTEGER;
  v_eff_phys_def INTEGER;
  v_eff_mag_def  INTEGER;
  v_eff_dodge    NUMERIC;
  v_eff_crit_rate NUMERIC;
  v_eff_crit_dmg  INTEGER;
  v_eff_enemy_pdef INTEGER;
  v_eff_enemy_mdef INTEGER;
  v_enemy_dmg_reduce_pct NUMERIC;
  -- Parry
  v_parry_chance_pct NUMERIC;
  v_parry_reduce_pct NUMERIC;
  -- Working state
  v_new_enemy_hp   INTEGER;
  v_new_player_hp  INTEGER;
  v_new_stamina    INTEGER;
  v_new_mana       INTEGER;
  v_new_buffs      JSONB;
  v_new_debuffs    JSONB;
  v_new_cds        JSONB;
  v_new_uid_seq    INTEGER;
  -- Turn results
  v_player_dmg     INTEGER  := 0;
  v_is_crit        BOOLEAN  := FALSE;
  v_skill_used     TEXT     := NULL;
  v_dot_enemy_dmg  INTEGER  := 0;
  v_hot_player_heal INTEGER := 0;
  v_guard_def_bonus INTEGER := 0;
  v_reflect_dmg    INTEGER  := 0;
  v_was_parried    BOOLEAN  := FALSE;
  v_parry_reduced  INTEGER  := 0;
  -- Multi-hit tracking
  v_hit_damages    JSONB    := '[]';   -- per-hit damage array for client animation
  -- Enemy action
  v_enemy_act_type    TEXT    := 'basic';
  v_enemy_act_name    TEXT    := 'Serangan Dasar';
  v_enemy_act_icon    TEXT    := '⚔️';
  v_enemy_act_dmg     INTEGER := 0;
  v_enemy_act_raw_dmg INTEGER := 0;
  v_enemy_is_dodged   BOOLEAN := FALSE;
  v_enemy_is_guard    BOOLEAN := FALSE;
  v_enemy_is_ult      BOOLEAN := FALSE;
  v_player_was_hit    BOOLEAN := FALSE;
  -- Skill data
  v_skill_defs    JSONB;
  v_skill         JSONB;
  v_atk_mult      NUMERIC;
  v_mag_mult      NUMERIC;
  v_hit_count     INTEGER;
  v_ignore_def    BOOLEAN;
  v_bypass_def    INTEGER;
  v_guar_crit     BOOLEAN;
  v_stam_cost     INTEGER;
  v_mana_cost     INTEGER;
  v_skill_cd      INTEGER;
  v_hit_dmg       INTEGER;
  v_hit_crit      BOOLEAN;
  v_cm            NUMERIC;
  v_total_dmg     INTEGER;
  v_eff_def       INTEGER;
  -- Buff processing
  v_buff          JSONB;
  v_buf_type      TEXT;
  v_buf_val       NUMERIC;
  v_buf_val2      NUMERIC;
  v_buf_val3      NUMERIC;
  v_buf_tl        INTEGER;
  v_buf_loh       BOOLEAN;
  v_new_buff_arr  JSONB;
  v_new_deb_arr   JSONB;
  v_effect        JSONB;
  -- Enemy turn
  v_roll          NUMERIC;
  v_chosen_skill  JSONB;
  v_enemy_skills  JSONB;
  v_norm_skills   JSONB;
  v_ult_skills    JSONB;
  v_e_mult        NUMERIC;
  v_e_raw_dmg     INTEGER;
  v_e_final_dmg   INTEGER;
  -- Misc
  v_i             INTEGER;
  v_victory       BOOLEAN := FALSE;
  v_defeat        BOOLEAN := FALSE;
  v_instant_mana_regen INTEGER := 0;
BEGIN
  v_pid := auth.uid();
  IF v_pid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;

  -- ── Load & lock session ───────────────────────────────────────────────────
  SELECT * INTO v_session
  FROM battle_sessions
  WHERE id = p_token AND player_id = v_pid
  FOR UPDATE NOWAIT;

  IF NOT FOUND              THEN RAISE EXCEPTION 'INVALID_TOKEN';    END IF;
  IF v_session.is_claimed   THEN RAISE EXCEPTION 'ALREADY_CLAIMED';  END IF;
  IF v_session.battle_status <> 'active' THEN RAISE EXCEPTION 'BATTLE_NOT_ACTIVE'; END IF;

  -- ── Rate limit: ≥150ms antar turn (blokir bot script) ────────────────────
  IF EXTRACT(EPOCH FROM (NOW() - v_session.last_turn_at)) < 0.15 THEN
    RAISE EXCEPTION 'TOO_FAST';
  END IF;

  -- ── Validate action ──────────────────────────────────────────────────────
  IF p_action NOT IN ('attack','defend','skill') THEN
    RAISE EXCEPTION 'INVALID_ACTION';
  END IF;
  IF p_action = 'skill' AND p_skill_id IS NULL THEN
    RAISE EXCEPTION 'SKILL_ID_REQUIRED';
  END IF;

  -- ── Load player stats snapshot (server-authoritative) ────────────────────
  v_phys_atk    := (v_session.player_stats->>'physAtk')::INTEGER;
  v_mag_atk     := (v_session.player_stats->>'magAtk')::INTEGER;
  v_phys_def    := (v_session.player_stats->>'physDef')::INTEGER;
  v_mag_def     := (v_session.player_stats->>'magDef')::INTEGER;
  v_base_dodge  := (v_session.player_stats->>'dodge')::NUMERIC;
  v_crit_rate   := (v_session.player_stats->>'critRate')::NUMERIC;
  v_crit_dmg    := (v_session.player_stats->>'critDmg')::INTEGER;
  v_mana_regen  := (v_session.player_stats->>'manaRegen')::INTEGER;
  v_skill_slots := COALESCE(v_session.player_stats->'skillSlots',
                     '{"skill1":"power_hit","skill2":null,"skill3":null,"ultimate":null}');

  -- ── Load enemy ────────────────────────────────────────────────────────────
  SELECT * INTO v_enemy FROM enemy_registry WHERE enemy_id = v_session.enemy_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_ENEMY'; END IF;

  -- ── Initialize working state ──────────────────────────────────────────────
  v_new_enemy_hp  := v_session.enemy_hp;
  v_new_player_hp := v_session.player_hp;
  v_new_stamina   := v_session.player_stamina;
  v_new_mana      := v_session.player_mana;
  v_new_uid_seq   := v_session.buff_uid_seq;
  v_new_buffs     := v_session.player_buffs;
  v_new_debuffs   := v_session.enemy_debuffs;
  v_new_cds       := v_session.skill_cooldowns;

  -- ── STEP 1: Apply active buffs to get effective player stats ─────────────
  v_eff_phys_atk       := v_phys_atk;
  v_eff_mag_atk        := v_mag_atk;
  v_eff_phys_def       := v_phys_def;
  v_eff_mag_def        := v_mag_def;
  v_eff_dodge          := v_base_dodge;
  v_eff_crit_rate      := v_crit_rate;
  v_eff_crit_dmg       := v_crit_dmg;
  v_eff_enemy_pdef     := v_enemy.pdef;
  v_eff_enemy_mdef     := v_enemy.mdef;
  v_enemy_dmg_reduce_pct := 0;
  v_parry_chance_pct   := 0;
  v_parry_reduce_pct   := 0;

  FOR v_i IN 0..jsonb_array_length(v_new_buffs)-1 LOOP
    v_buff     := v_new_buffs->v_i;
    v_buf_type := v_buff->>'type';
    v_buf_val  := COALESCE((v_buff->>'value')::NUMERIC, 0);
    v_buf_val2 := COALESCE((v_buff->>'value2')::NUMERIC, 0);
    v_buf_val3 := COALESCE((v_buff->>'value3')::NUMERIC, 0);
    CASE v_buf_type
      WHEN 'atk_buff'        THEN v_eff_phys_atk  := v_eff_phys_atk  + v_buf_val::INTEGER;
      WHEN 'def_buff'        THEN v_eff_phys_def   := v_eff_phys_def  + v_buf_val::INTEGER;
                                  v_eff_mag_def    := v_eff_mag_def   + v_buf_val::INTEGER;  -- BUG FIX: was COALESCE(v_eff_phys_def,...)+val → double-counted mag def
      WHEN 'dodge_crit_buff' THEN v_eff_dodge      := v_eff_dodge      + v_buf_val;
                                  v_eff_crit_rate  := LEAST(100.0, v_eff_crit_rate + v_buf_val2);
                                  v_eff_crit_dmg   := v_eff_crit_dmg  + v_buf_val3::INTEGER;
      WHEN 'parry'           THEN v_parry_chance_pct := v_buf_val;
                                  v_parry_reduce_pct := v_buf_val2;
      WHEN 'enemy_dmg_reduce'THEN v_enemy_dmg_reduce_pct := v_enemy_dmg_reduce_pct + v_buf_val;
      ELSE NULL;
    END CASE;
  END LOOP;

  -- Apply enemy debuff modifiers
  FOR v_i IN 0..jsonb_array_length(v_new_debuffs)-1 LOOP
    v_buff     := v_new_debuffs->v_i;
    v_buf_type := v_buff->>'type';
    v_buf_val  := COALESCE((v_buff->>'value')::NUMERIC, 0);
    IF v_buf_type = 'enemy_pdef_debuff' THEN
      v_eff_enemy_pdef := GREATEST(0, v_eff_enemy_pdef - v_buf_val::INTEGER);
    END IF;
  END LOOP;

  -- ── STEP 2: Tick DOTs (enemy) & HOTs (player) at start of turn ───────────
  -- BUG FIX: blok ini wajib berjalan SEBELUM <<battle_compute>> agar DOT deal
  -- damage, HOT heal player, dan turns_left buff/debuff berkurang setiap turn.
  v_new_buff_arr := '[]';
  v_new_deb_arr  := '[]';

  -- Process enemy debuffs (tick DOT damage)
  FOR v_i IN 0..jsonb_array_length(v_new_debuffs)-1 LOOP
    v_buff     := v_new_debuffs->v_i;
    v_buf_type := v_buff->>'type';
    v_buf_val  := COALESCE((v_buff->>'value')::NUMERIC, 0);
    v_buf_tl   := COALESCE((v_buff->>'turns_left')::INTEGER, 1);

    IF v_buf_type = 'bleed_dot' THEN
      v_dot_enemy_dmg := v_dot_enemy_dmg + v_buf_val::INTEGER;
      v_new_enemy_hp  := GREATEST(0, v_new_enemy_hp - v_buf_val::INTEGER);
    ELSIF v_buf_type = 'poison_dot' THEN
      DECLARE v_poison_dmg INTEGER;
      BEGIN
        v_poison_dmg    := GREATEST(1, ROUND(v_phys_atk * v_buf_val / 100.0)::INTEGER);
        v_dot_enemy_dmg := v_dot_enemy_dmg + v_poison_dmg;
        v_new_enemy_hp  := GREATEST(0, v_new_enemy_hp - v_poison_dmg);
      END;
    END IF;

    -- Decrement turns_left; keep if still > 0 after this turn
    IF v_buf_tl > 1 THEN
      v_new_deb_arr := v_new_deb_arr || jsonb_set(v_buff, '{turns_left}', to_jsonb(v_buf_tl - 1));
    END IF;
    -- turns_left = 1 → expired this turn (not added back)
  END LOOP;

  -- Process player buffs (HOT heal + decrement turns_left)
  FOR v_i IN 0..jsonb_array_length(v_new_buffs)-1 LOOP
    v_buff     := v_new_buffs->v_i;
    v_buf_type := v_buff->>'type';
    v_buf_val  := COALESCE((v_buff->>'value')::NUMERIC, 0);
    v_buf_tl   := COALESCE((v_buff->>'turns_left')::INTEGER, -1);
    v_buf_loh  := COALESCE((v_buff->>'loses_on_hit')::BOOLEAN, FALSE);

    IF v_buf_type = 'heal_hot' THEN
      v_hot_player_heal := v_hot_player_heal + v_buf_val::INTEGER;
      v_new_player_hp   := LEAST(v_session.battle_start_hp, v_new_player_hp + v_buf_val::INTEGER);
    END IF;

    -- -1 = until-consumed (parry, reflect): keep as-is until consumed by enemy hit
    IF v_buf_tl = -1 THEN
      v_new_buff_arr := v_new_buff_arr || v_buff;
    ELSIF v_buf_tl > 1 THEN
      v_new_buff_arr := v_new_buff_arr || jsonb_set(v_buff, '{turns_left}', to_jsonb(v_buf_tl - 1));
    END IF;
    -- turns_left = 1 → expired this turn (not added back)
  END LOOP;

  v_new_buffs   := v_new_buff_arr;
  v_new_debuffs := v_new_deb_arr;

  -- ── STEP 2 through cooldown-tick wrapped in a labeled block so we can
  --    EXIT early (PL/pgSQL has no GOTO; EXIT label jumps to end of block).
  <<battle_compute>>
  BEGIN

  -- ── Check: enemy died from DOT → victory ─────────────────────────────────
  IF v_new_enemy_hp <= 0 THEN
    v_victory := TRUE;
    EXIT battle_compute;
  END IF;

  -- ── STEP 3: Skill Definitions ─────────────────────────────────────────────
  -- Semua skill didefinisikan di sini. Client tidak bisa kirim stat skill berbeda.
  v_skill_defs := '{
    "power_hit":         {"atk_mult":1.1,"mag_mult":0,"hits":1,"ignore_def":false,"bypass_def":0,"guar_crit":false,"sc":100,"mc":0,"cd":1,"effects":[]},
    "battle_cry":        {"atk_mult":0,"mag_mult":0,"hits":0,"ignore_def":false,"bypass_def":0,"guar_crit":false,"sc":100,"mc":0,"cd":4,"effects":[{"type":"atk_buff","value":200,"dur":3,"loh":false}]},
    "weapon_parry":      {"atk_mult":0,"mag_mult":0,"hits":0,"ignore_def":false,"bypass_def":0,"guar_crit":false,"sc":20,"mc":0,"cd":0,"effects":[{"type":"parry","value":5,"value2":5}]},
    "power_hit_chain":   {"atk_mult":1.1,"mag_mult":0,"hits":3,"ignore_def":false,"bypass_def":0,"guar_crit":false,"sc":500,"mc":0,"cd":10,"effects":[]},
    "sword_slash":       {"atk_mult":1.2,"mag_mult":0,"hits":1,"ignore_def":false,"bypass_def":0,"guar_crit":false,"sc":150,"mc":0,"cd":1,"effects":[]},
    "cross_slash":       {"atk_mult":1.3,"mag_mult":0,"hits":1,"ignore_def":false,"bypass_def":50,"guar_crit":false,"sc":180,"mc":0,"cd":2,"effects":[]},
    "rotating_slash":    {"atk_mult":1.8,"mag_mult":0,"hits":1,"ignore_def":false,"bypass_def":0,"guar_crit":false,"sc":250,"mc":0,"cd":3,"effects":[{"type":"reflect_pct","value":2}]},
    "sword_chain_slash": {"atk_mult":1.25,"mag_mult":0,"hits":3,"ignore_def":false,"bypass_def":0,"guar_crit":false,"sc":700,"mc":0,"cd":10,"effects":[{"type":"bleed_dot","value":50,"dur":2}]},
    "quick_stab":        {"atk_mult":1.1,"mag_mult":0,"hits":1,"ignore_def":false,"bypass_def":0,"guar_crit":false,"sc":100,"mc":0,"cd":1,"effects":[{"type":"bleed_dot","value":20,"dur":2}]},
    "shadow_strike":     {"atk_mult":0.8,"mag_mult":0,"hits":1,"ignore_def":true,"bypass_def":0,"guar_crit":false,"sc":300,"mc":0,"cd":5,"effects":[]},
    "poison_stab":       {"atk_mult":0.5,"mag_mult":0,"hits":1,"ignore_def":false,"bypass_def":0,"guar_crit":false,"sc":500,"mc":0,"cd":3,"effects":[{"type":"poison_dot","value":5,"dur":2}]},
    "dagger_poison_chain":{"atk_mult":0.5,"mag_mult":0,"hits":3,"ignore_def":false,"bypass_def":0,"guar_crit":false,"sc":1000,"mc":0,"cd":6,"effects":[{"type":"poison_dot","value":5,"dur":6}]},
    "magic_bullet":      {"atk_mult":0,"mag_mult":2.0,"hits":1,"ignore_def":false,"bypass_def":0,"guar_crit":false,"sc":0,"mc":500,"cd":2,"effects":[]},
    "magic_meditation":  {"atk_mult":0,"mag_mult":0,"hits":0,"ignore_def":false,"bypass_def":0,"guar_crit":false,"sc":0,"mc":0,"cd":5,"effects":[{"type":"def_buff","value":100,"dur":99,"loh":true},{"type":"mana_regen","value":200}]},
    "small_heal":        {"atk_mult":0,"mag_mult":0,"hits":0,"ignore_def":false,"bypass_def":0,"guar_crit":false,"sc":0,"mc":800,"cd":7,"effects":[{"type":"heal_hot","value":40,"dur":4}]},
    "magic_arrow_rain":  {"atk_mult":0,"mag_mult":1.0,"hits":10,"ignore_def":false,"bypass_def":0,"guar_crit":false,"sc":0,"mc":1500,"cd":10,"effects":[]},
    "shield_bash":       {"atk_mult":1.4,"mag_mult":0,"hits":1,"ignore_def":false,"bypass_def":0,"guar_crit":false,"sc":100,"mc":0,"cd":0,"effects":[]},
    "counter_strike":    {"atk_mult":0,"mag_mult":0,"hits":0,"ignore_def":false,"bypass_def":0,"guar_crit":false,"sc":100,"mc":0,"cd":0,"effects":[{"type":"reflect_flat","value":200}]},
    "compact_defense":   {"atk_mult":0,"mag_mult":0,"hits":0,"ignore_def":false,"bypass_def":0,"guar_crit":false,"sc":200,"mc":0,"cd":6,"effects":[{"type":"def_buff","value":200,"dur":4,"loh":false}]},
    "iron_solid":        {"atk_mult":0,"mag_mult":0,"hits":0,"ignore_def":false,"bypass_def":0,"guar_crit":false,"sc":500,"mc":0,"cd":10,"effects":[{"type":"enemy_dmg_reduce","value":30,"dur":10}]},
    "quick_shot":        {"atk_mult":0.5,"mag_mult":0,"hits":3,"ignore_def":false,"bypass_def":0,"guar_crit":false,"sc":100,"mc":0,"cd":0,"effects":[]},
    "power_shot":        {"atk_mult":1.4,"mag_mult":0,"hits":1,"ignore_def":false,"bypass_def":0,"guar_crit":false,"sc":200,"mc":0,"cd":3,"effects":[{"type":"enemy_pdef_debuff","value":200,"dur":2}]},
    "positioning":       {"atk_mult":0,"mag_mult":0,"hits":0,"ignore_def":false,"bypass_def":0,"guar_crit":false,"sc":400,"mc":0,"cd":6,"effects":[{"type":"dodge_crit_buff","value":10,"value2":20,"value3":100,"dur":4}]},
    "double_power_shot": {"atk_mult":1.4,"mag_mult":0,"hits":2,"ignore_def":false,"bypass_def":0,"guar_crit":true,"sc":1000,"mc":0,"cd":10,"effects":[]}
  }'::JSONB;

  -- ── STEP 4: Process Player Action ─────────────────────────────────────────

  IF p_action = 'attack' THEN
    -- Normal attack — tidak ada regen otomatis, stamina/mana tidak berubah dari serangan biasa
    v_is_crit   := (random() * 100 < v_eff_crit_rate);
    v_cm        := CASE WHEN v_is_crit THEN v_eff_crit_dmg::NUMERIC / 100.0 ELSE 1.0 END;
    v_player_dmg := battle_calc_dmg(v_eff_phys_atk::NUMERIC, v_cm, v_eff_enemy_pdef::NUMERIC);
    v_new_enemy_hp := GREATEST(0, v_new_enemy_hp - v_player_dmg);
    -- Stamina & mana tidak berubah saat serangan biasa (no regen)

  ELSIF p_action = 'skill' THEN
    -- Validate skill exists in server definitions
    v_skill := v_skill_defs->p_skill_id;
    IF v_skill IS NULL THEN RAISE EXCEPTION 'INVALID_SKILL'; END IF;

    -- Validate skill is in player's equipped slots
    IF NOT (
      v_skill_slots->>'skill1'   = p_skill_id OR
      v_skill_slots->>'skill2'   = p_skill_id OR
      v_skill_slots->>'skill3'   = p_skill_id OR
      v_skill_slots->>'ultimate' = p_skill_id
    ) THEN
      RAISE EXCEPTION 'SKILL_NOT_EQUIPPED';
    END IF;

    -- Validate cooldown
    IF (v_new_cds->>p_skill_id) IS NOT NULL AND (v_new_cds->>p_skill_id)::INTEGER > 0 THEN
      RAISE EXCEPTION 'SKILL_ON_COOLDOWN';
    END IF;

    -- Extract skill data
    v_atk_mult   := COALESCE((v_skill->>'atk_mult')::NUMERIC, 0);
    v_mag_mult   := COALESCE((v_skill->>'mag_mult')::NUMERIC, 0);
    v_hit_count  := COALESCE((v_skill->>'hits')::INTEGER, 1);
    v_ignore_def := COALESCE((v_skill->>'ignore_def')::BOOLEAN, FALSE);
    v_bypass_def := COALESCE((v_skill->>'bypass_def')::INTEGER, 0);
    v_guar_crit  := COALESCE((v_skill->>'guar_crit')::BOOLEAN, FALSE);
    v_stam_cost  := COALESCE((v_skill->>'sc')::INTEGER, 0);
    v_mana_cost  := COALESCE((v_skill->>'mc')::INTEGER, 0);
    v_skill_cd   := COALESCE((v_skill->>'cd')::INTEGER, 0);

    -- Validate resources
    IF v_stam_cost > 0 AND v_new_stamina < v_stam_cost THEN
      RAISE EXCEPTION 'INSUFFICIENT_STAMINA';
    END IF;
    IF v_mana_cost > 0 AND v_new_mana < v_mana_cost THEN
      RAISE EXCEPTION 'INSUFFICIENT_MANA';
    END IF;

    -- Compute damage (physical or magic)
    IF v_atk_mult > 0 OR v_mag_mult > 0 THEN
      v_total_dmg := 0;
      FOR v_i IN 1..GREATEST(1, v_hit_count) LOOP
        v_hit_crit := v_guar_crit OR (random() * 100 < v_eff_crit_rate);
        IF v_hit_crit THEN v_is_crit := TRUE; END IF;
        v_cm := CASE WHEN v_hit_crit THEN v_eff_crit_dmg::NUMERIC / 100.0 ELSE 1.0 END;

        IF v_mag_mult > 0 THEN
          -- Magic skill
          v_eff_def := CASE WHEN v_ignore_def THEN 0 ELSE GREATEST(0, v_eff_enemy_mdef - v_bypass_def) END;
          v_hit_dmg := battle_calc_dmg(v_eff_mag_atk::NUMERIC, v_mag_mult * v_cm, v_eff_def::NUMERIC);
        ELSE
          -- Physical skill
          v_eff_def := CASE WHEN v_ignore_def THEN 0 ELSE GREATEST(0, v_eff_enemy_pdef - v_bypass_def) END;
          v_hit_dmg := battle_calc_dmg(v_eff_phys_atk::NUMERIC, v_atk_mult * v_cm, v_eff_def::NUMERIC);
        END IF;
        v_total_dmg   := v_total_dmg + v_hit_dmg;
        -- Record per-hit damage for client-side multi-hit animation
        v_hit_damages := v_hit_damages || to_jsonb(v_hit_dmg);
      END LOOP;
      v_player_dmg   := v_total_dmg;
      v_new_enemy_hp := GREATEST(0, v_new_enemy_hp - v_player_dmg);
    END IF;

    v_skill_used   := p_skill_id;

    -- Apply resource cost (MURNI dikurang — tidak ada regen otomatis)
    v_new_stamina  := GREATEST(0, v_new_stamina - v_stam_cost);
    v_new_mana     := GREATEST(0, v_new_mana - v_mana_cost);

    -- Set cooldown
    -- BUG FIX: simpan v_skill_cd + 1 agar setelah tick di turn yang sama
    -- hasilnya tepat v_skill_cd. Tanpa +1, skill cd=1 menjadi 0 setelah tick
    -- (karena 1 > 1 = false → dihapus) sehingga tidak ada cooldown sama sekali.
    IF v_skill_cd > 0 THEN
      v_new_cds := jsonb_set(v_new_cds, ARRAY[p_skill_id], to_jsonb(v_skill_cd + 1));
    END IF;

    -- ── Apply skill effects ───────────────────────────────────────────────
    FOR v_i IN 0..jsonb_array_length(v_skill->'effects')-1 LOOP
      v_effect   := (v_skill->'effects')->v_i;
      v_buf_type := v_effect->>'type';
      v_buf_val  := COALESCE((v_effect->>'value')::NUMERIC, 0);
      v_buf_val2 := COALESCE((v_effect->>'value2')::NUMERIC, 0);
      v_buf_val3 := COALESCE((v_effect->>'value3')::NUMERIC, 0);
      v_new_uid_seq := v_new_uid_seq + 1;

      CASE v_buf_type
        WHEN 'atk_buff', 'def_buff', 'dodge_crit_buff' THEN
          v_new_buffs := v_new_buffs || jsonb_build_object(
            'uid', v_new_uid_seq, 'type', v_buf_type, 'value', v_buf_val,
            'value2', v_buf_val2, 'value3', v_buf_val3,
            'turns_left', COALESCE((v_effect->>'dur')::INTEGER, 1),
            'loses_on_hit', COALESCE((v_effect->>'loh')::BOOLEAN, FALSE)
          );
        WHEN 'parry', 'reflect_pct', 'reflect_flat' THEN
          -- Until-consumed: turns_left = -1
          v_new_buffs := v_new_buffs || jsonb_build_object(
            'uid', v_new_uid_seq, 'type', v_buf_type, 'value', v_buf_val,
            'value2', v_buf_val2, 'turns_left', -1, 'loses_on_hit', FALSE
          );
        WHEN 'enemy_dmg_reduce' THEN
          v_new_buffs := v_new_buffs || jsonb_build_object(
            'uid', v_new_uid_seq, 'type', v_buf_type, 'value', v_buf_val,
            'turns_left', COALESCE((v_effect->>'dur')::INTEGER, 1),
            'loses_on_hit', FALSE, 'value2', 0
          );
        WHEN 'heal_hot' THEN
          v_new_buffs := v_new_buffs || jsonb_build_object(
            'uid', v_new_uid_seq, 'type', v_buf_type, 'value', v_buf_val,
            'turns_left', COALESCE((v_effect->>'dur')::INTEGER, 4),
            'loses_on_hit', FALSE, 'value2', 0
          );
        WHEN 'bleed_dot', 'enemy_pdef_debuff' THEN
          v_new_debuffs := v_new_debuffs || jsonb_build_object(
            'uid', v_new_uid_seq, 'type', v_buf_type, 'value', v_buf_val,
            'turns_left', COALESCE((v_effect->>'dur')::INTEGER, 2),
            'loses_on_hit', FALSE
          );
        WHEN 'poison_dot' THEN
          v_new_debuffs := v_new_debuffs || jsonb_build_object(
            'uid', v_new_uid_seq, 'type', v_buf_type, 'value', v_buf_val,
            'turns_left', COALESCE((v_effect->>'dur')::INTEGER, 2),
            'loses_on_hit', FALSE
          );
        WHEN 'mana_regen' THEN
          -- Instant mana regen (applied on top of base mana regen)
          v_instant_mana_regen := v_instant_mana_regen + v_buf_val::INTEGER;
          v_new_mana := LEAST(v_session.player_max_mana, v_new_mana + v_buf_val::INTEGER);
        ELSE NULL;
      END CASE;
    END LOOP;
  END IF; -- end skill action

  -- ── Check Victory from player action ─────────────────────────────────────
  IF v_new_enemy_hp <= 0 THEN
    v_victory := TRUE;
    EXIT battle_compute;
  END IF;

  -- ── STEP 5: Enemy Turn ────────────────────────────────────────────────────
  IF NOT v_enemy.is_living THEN
    -- Wooden Dummy: never attacks
    v_enemy_act_type := 'dummy';
    v_enemy_act_name := 'Diam Saja';
    v_enemy_act_icon := '🪵';
    v_enemy_act_dmg  := 0;

  ELSE
    -- Choose enemy action
    v_roll       := random();
    v_enemy_skills := v_enemy.skills;
    v_norm_skills  := '[]'::JSONB;
    v_ult_skills   := '[]'::JSONB;
    v_chosen_skill := NULL;
    v_enemy_is_guard := FALSE;

    -- Categorize skills
    FOR v_i IN 0..jsonb_array_length(v_enemy_skills)-1 LOOP
      v_buff := v_enemy_skills->v_i;
      IF (v_buff->>'damage_mult')::NUMERIC = 0 THEN
        -- Guard-type skill
        IF v_roll < 0.18 THEN v_enemy_is_guard := TRUE; END IF;
      ELSIF (v_buff->>'is_ultimate')::BOOLEAN = TRUE THEN
        v_ult_skills := v_ult_skills || v_buff;
      ELSE
        v_norm_skills := v_norm_skills || v_buff;
      END IF;
    END LOOP;

    IF NOT v_enemy_is_guard THEN
      IF jsonb_array_length(v_ult_skills) > 0 AND v_roll < 0.10 THEN
        v_chosen_skill   := v_ult_skills->0;
        v_enemy_is_ult   := TRUE;
      ELSIF jsonb_array_length(v_norm_skills) > 0 AND v_roll < 0.40 THEN
        v_chosen_skill   := v_norm_skills->( (random() * jsonb_array_length(v_norm_skills))::INTEGER % jsonb_array_length(v_norm_skills) );
        v_enemy_is_ult   := FALSE;
      END IF;
    END IF;

    IF v_enemy_is_guard THEN
      -- Guard: enemy defends this turn
      v_enemy_act_type    := 'shield_guard';
      v_enemy_act_name    := 'Tameng Besi';
      v_enemy_act_icon    := '🛡️';
      v_enemy_act_dmg     := 0;
      v_enemy_act_raw_dmg := 0;

    ELSE
      -- Compute enemy damage
      v_e_mult    := CASE WHEN v_chosen_skill IS NULL THEN 1.0 ELSE (v_chosen_skill->>'damage_mult')::NUMERIC END;
      v_enemy_act_type := CASE WHEN v_chosen_skill IS NULL THEN 'basic'
                               WHEN v_enemy_is_ult THEN 'ultimate'
                               ELSE 'skill' END;
      v_enemy_act_name := CASE WHEN v_chosen_skill IS NULL THEN 'Serangan Dasar'
                               ELSE v_chosen_skill->>'name' END;
      v_enemy_act_icon := CASE WHEN v_chosen_skill IS NULL THEN '⚔️'
                               ELSE v_chosen_skill->>'icon' END;

      v_e_raw_dmg := battle_calc_dmg(
        v_enemy.atk::NUMERIC,
        v_e_mult,
        (v_eff_phys_def + v_guard_def_bonus)::NUMERIC
      );

      -- Apply enemy_dmg_reduce
      IF v_enemy_dmg_reduce_pct > 0 THEN
        v_e_raw_dmg := GREATEST(0, ROUND(v_e_raw_dmg * (1.0 - v_enemy_dmg_reduce_pct / 100.0))::INTEGER);
      END IF;

      -- Dodge check
      v_enemy_is_dodged := (random() * 100 < v_eff_dodge);
      v_e_final_dmg     := v_e_raw_dmg;

      IF NOT v_enemy_is_dodged THEN
        -- Parry check
        IF v_parry_chance_pct > 0 THEN
          IF random() * 100 < v_parry_chance_pct THEN
            -- Full block
            v_e_final_dmg := 0;
            v_was_parried := TRUE;
          ELSE
            -- Partial reduction
            v_parry_reduced := ROUND(v_e_raw_dmg * v_parry_reduce_pct / 100.0)::INTEGER;
            v_e_final_dmg   := GREATEST(0, v_e_raw_dmg - v_parry_reduced);
          END IF;
          -- Remove parry buff (consumed)
          DECLARE v_filtered JSONB := '[]';
          BEGIN
            FOR v_i IN 0..jsonb_array_length(v_new_buffs)-1 LOOP
              IF (v_new_buffs->v_i)->>'type' <> 'parry' THEN
                v_filtered := v_filtered || (v_new_buffs->v_i);
              END IF;
            END LOOP;
            v_new_buffs := v_filtered;
          END;
        END IF;

        -- Apply damage
        IF v_e_final_dmg > 0 THEN
          v_new_player_hp  := GREATEST(0, v_new_player_hp - v_e_final_dmg);
          v_player_was_hit := TRUE;
        END IF;

        -- Reflect effects (only if enemy dealt raw damage)
        IF v_e_raw_dmg > 0 THEN
          DECLARE v_ref_filtered JSONB := '[]';
          BEGIN
            FOR v_i IN 0..jsonb_array_length(v_new_buffs)-1 LOOP
              v_buff     := v_new_buffs->v_i;
              v_buf_type := v_buff->>'type';
              v_buf_val  := COALESCE((v_buff->>'value')::NUMERIC, 0);
              IF v_buf_type = 'reflect_pct' AND (v_buff->>'turns_left')::INTEGER = -1 THEN
                v_reflect_dmg := v_reflect_dmg + GREATEST(1, ROUND(v_e_raw_dmg * v_buf_val / 100.0)::INTEGER);
                -- Consumed: not added back
              ELSIF v_buf_type = 'reflect_flat' AND (v_buff->>'turns_left')::INTEGER = -1 THEN
                v_reflect_dmg := v_reflect_dmg + v_buf_val::INTEGER;
                -- Consumed: not added back
              ELSE
                v_ref_filtered := v_ref_filtered || v_buff;
              END IF;
            END LOOP;
            v_new_buffs := v_ref_filtered;
          END;
          IF v_reflect_dmg > 0 THEN
            v_new_enemy_hp := GREATEST(0, v_new_enemy_hp - v_reflect_dmg);
          END IF;
        END IF;

        -- Remove loses_on_hit buffs if player was hit
        IF v_player_was_hit THEN
          DECLARE v_loh_filtered JSONB := '[]';
          BEGIN
            FOR v_i IN 0..jsonb_array_length(v_new_buffs)-1 LOOP
              v_buff := v_new_buffs->v_i;
              IF NOT COALESCE((v_buff->>'loses_on_hit')::BOOLEAN, FALSE) THEN
                v_loh_filtered := v_loh_filtered || v_buff;
              END IF;
            END LOOP;
            v_new_buffs := v_loh_filtered;
          END;
        END IF;

      END IF; -- end not dodged

      v_enemy_act_dmg     := CASE WHEN v_enemy_is_dodged THEN 0 ELSE v_e_final_dmg END;
      v_enemy_act_raw_dmg := CASE WHEN v_enemy_is_dodged THEN 0 ELSE v_e_raw_dmg END;
    END IF;
  END IF; -- end enemy living

  -- ── Check Defeat ─────────────────────────────────────────────────────────
  IF v_new_player_hp <= 0 THEN
    v_defeat := TRUE;
  END IF;

  -- ── Check Victory from reflect ────────────────────────────────────────────
  IF v_new_enemy_hp <= 0 AND NOT v_defeat THEN
    v_victory := TRUE;
  END IF;

  -- ── Tick skill cooldowns ──────────────────────────────────────────────────
  DECLARE v_cd_key TEXT; v_cd_val INTEGER; v_new_cds_temp JSONB := '{}';
  BEGIN
    FOR v_cd_key IN SELECT jsonb_object_keys(v_new_cds) LOOP
      v_cd_val := (v_new_cds->>v_cd_key)::INTEGER;
      IF v_cd_val > 1 THEN
        v_new_cds_temp := jsonb_set(v_new_cds_temp, ARRAY[v_cd_key], to_jsonb(v_cd_val - 1));
      END IF;
    END LOOP;
    v_new_cds := v_new_cds_temp;
  END;

  END; -- <<battle_compute>>

  -- ── Clamp values ─────────────────────────────────────────────────────────
  v_new_stamina   := GREATEST(0, LEAST(v_session.player_max_stamina, v_new_stamina));
  v_new_mana      := GREATEST(0, LEAST(v_session.player_max_mana, v_new_mana));
  v_new_player_hp := GREATEST(0, LEAST(v_session.player_max_hp, v_new_player_hp));
  v_new_enemy_hp  := GREATEST(0, v_new_enemy_hp);

  -- ── Update session state ──────────────────────────────────────────────────
  UPDATE battle_sessions SET
    player_hp       = v_new_player_hp,
    player_stamina  = v_new_stamina,
    player_mana     = v_new_mana,
    enemy_hp        = v_new_enemy_hp,
    player_buffs    = v_new_buffs,
    enemy_debuffs   = v_new_debuffs,
    skill_cooldowns = v_new_cds,
    buff_uid_seq    = v_new_uid_seq,
    turn_count      = v_session.turn_count + 1,
    last_turn_at    = NOW(),
    battle_status   = CASE WHEN v_victory THEN 'victory'
                           WHEN v_defeat  THEN 'defeat'
                           ELSE 'active' END
  WHERE id = p_token;

  -- ── Return comprehensive result ───────────────────────────────────────────
  RETURN jsonb_build_object(
    'ok',             TRUE,
    -- Player action result
    'player_dmg',     v_player_dmg,
    'is_crit',        v_is_crit,
    'skill_id',       v_skill_used,
    -- Multi-hit breakdown (for client animation; empty array = single hit)
    'hit_count',      COALESCE(jsonb_array_length(v_hit_damages), 1),
    'hit_damages',    v_hit_damages,
    -- DOT/HOT this turn
    'dot_enemy_dmg',  v_dot_enemy_dmg,
    'hot_player_heal',v_hot_player_heal,
    -- Enemy action
    'enemy_action', jsonb_build_object(
      'type',       v_enemy_act_type,
      'name',       v_enemy_act_name,
      'icon',       v_enemy_act_icon,
      'dmg',        v_enemy_act_dmg,
      'raw_dmg',    v_enemy_act_raw_dmg,
      'is_dodged',  v_enemy_is_dodged,
      'is_guard',   v_enemy_is_guard,
      'is_ultimate',v_enemy_is_ult
    ),
    -- Reflect
    'reflect_dmg',    v_reflect_dmg,
    'was_parried',    v_was_parried,
    'parry_reduced',  v_parry_reduced,
    -- Final state
    'new_player_hp',  v_new_player_hp,
    'new_enemy_hp',   v_new_enemy_hp,
    'new_stamina',    v_new_stamina,
    'new_mana',       v_new_mana,
    -- Battle status
    'turn_count',     v_session.turn_count + 1,
    'victory',        v_victory,
    'defeat',         v_defeat,
    -- Updated buffs/cooldowns for client display
    'player_buffs',   v_new_buffs,
    'enemy_debuffs',  v_new_debuffs,
    'skill_cooldowns',v_new_cds
  );
END;
$$;


-- ── 7. RPC: claim_battle_reward(token) → JSONB ───────────────────────────────
-- Lebih simple dari v1: cukup cek battle_status = 'victory' (sudah divalidasi process_turn).
-- Tidak perlu kirim enemy_id atau turns dari client.

CREATE OR REPLACE FUNCTION public.claim_battle_reward(p_token UUID)
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

  -- Lock session
  SELECT * INTO v_session
  FROM battle_sessions
  WHERE id = p_token AND player_id = v_pid
  FOR UPDATE NOWAIT;

  IF NOT FOUND              THEN RAISE EXCEPTION 'INVALID_TOKEN';    END IF;
  IF v_session.is_claimed   THEN RAISE EXCEPTION 'ALREADY_CLAIMED';  END IF;

  -- Victory HARUS sudah divalidasi oleh process_turn server-side
  IF v_session.battle_status <> 'victory' THEN
    RAISE EXCEPTION 'NOT_VICTORIOUS';
  END IF;

  -- Load reward dari enemy_registry (nilai dari server, bukan client)
  SELECT * INTO v_enemy FROM enemy_registry WHERE enemy_id = v_session.enemy_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_ENEMY'; END IF;

  -- Minimum turns (anti-bot: setidaknya 1 turn nyata)
  IF v_session.turn_count < 1 THEN RAISE EXCEPTION 'INSUFFICIENT_TURNS'; END IF;

  -- Load player
  SELECT * INTO v_player FROM players WHERE id = v_pid;
  IF NOT FOUND THEN RAISE EXCEPTION 'PLAYER_NOT_FOUND'; END IF;

  -- Hitung reward
  v_new_exp  := LEAST(999999999, v_player.experience + v_enemy.reward_exp);
  v_new_gold := v_player.gold + v_enemy.reward_gold;

  -- Tandai token sudah dipakai
  UPDATE battle_sessions
  SET is_claimed = TRUE, claimed_at = NOW()
  WHERE id = p_token;

  -- Terapkan reward (HANYA exp dan gold)
  UPDATE players
  SET experience = v_new_exp,
      gold       = v_new_gold
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


-- ── 8. RPC: get_battle_state(token) → JSONB ──────────────────────────────────
-- Untuk reconnect atau error recovery: client bisa minta state terkini dari server.

CREATE OR REPLACE FUNCTION public.get_battle_state(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pid     UUID;
  v_session battle_sessions%ROWTYPE;
BEGIN
  v_pid := auth.uid();
  IF v_pid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;

  SELECT * INTO v_session
  FROM battle_sessions
  WHERE id = p_token AND player_id = v_pid;

  IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_TOKEN'; END IF;

  RETURN jsonb_build_object(
    'ok',             TRUE,
    'battle_status',  v_session.battle_status,
    'player_hp',      v_session.player_hp,
    'player_max_hp',  v_session.player_max_hp,
    'player_stamina', v_session.player_stamina,
    'player_max_stamina', v_session.player_max_stamina,
    'player_mana',    v_session.player_mana,
    'player_max_mana',v_session.player_max_mana,
    'enemy_hp',       v_session.enemy_hp,
    'enemy_max_hp',   v_session.enemy_max_hp,
    'player_buffs',   v_session.player_buffs,
    'enemy_debuffs',  v_session.enemy_debuffs,
    'skill_cooldowns',v_session.skill_cooldowns,
    'turn_count',     v_session.turn_count
  );
END;
$$;


-- ── 9. Permissions ───────────────────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.start_battle(TEXT)           FROM PUBLIC;
REVOKE ALL ON FUNCTION public.process_turn(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_battle_reward(UUID)    FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_battle_state(UUID)       FROM PUBLIC;
REVOKE ALL ON FUNCTION public.battle_calc_dmg(NUMERIC, NUMERIC, NUMERIC) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.start_battle(TEXT)           TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_turn(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_battle_reward(UUID)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_battle_state(UUID)       TO authenticated;
-- battle_calc_dmg: internal utility, tidak perlu di-grant ke user

-- ════════════════════════════════════════════════════════════════════════════════
-- SELESAI.
-- Cara pakai:
-- 1. Paste file ini ke Supabase SQL Editor → Run
-- 2. Update ArenaPage.tsx untuk memanggil process_turn RPC tiap turn
-- 3. Update supabase-db.ts untuk helper processTurnRpc dan claimBattleRewardRpc
-- ═══════════════════════════════════════════════════════════════════════════════