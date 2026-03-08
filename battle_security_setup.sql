-- ════════════════════════════════════════════════════════════════════════════
-- BATTLE SECURITY SETUP
-- Jalankan SELURUH file ini SEKALI di Supabase SQL Editor
-- Database → SQL Editor → New query → paste → Run
-- ════════════════════════════════════════════════════════════════════════════


-- ── 1. Tabel battle_sessions ─────────────────────────────────────────────────
-- Setiap battle menerbitkan UUID token sekali pakai.
-- Klaim reward mengkonsumsi token; double-claim dan replay ditolak oleh RPC.

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

-- Tidak ada UPDATE/DELETE policy: hanya SECURITY DEFINER function yang boleh mengubah


-- ── 2. Tabel enemy_registry (nilai reward HANYA ada di sini) ─────────────────
-- Client mengirim enemy_id; RPC yang mencari reward-nya sendiri.
-- Nilai dari client sepenuhnya diabaikan.

CREATE TABLE IF NOT EXISTS public.enemy_registry (
  enemy_id    TEXT    PRIMARY KEY,
  reward_exp  INTEGER NOT NULL,
  reward_gold INTEGER NOT NULL,
  min_turns   INTEGER NOT NULL DEFAULT 1,
  min_seconds INTEGER NOT NULL DEFAULT 3
);

ALTER TABLE public.enemy_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ereg_public_read" ON public.enemy_registry;
CREATE POLICY "ereg_public_read" ON public.enemy_registry
  FOR SELECT USING (true);

-- Data reward resmi — hanya bisa diubah langsung di sini oleh developer
-- min_seconds = 1  → cukup blokir bot instan (<200ms), tanpa menghukum pemain kuat
-- min_turns   = 1  → pemain kuat boleh one-shot musuh secara legal
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


-- ── 3. RPC: start_battle(enemy_id) → UUID token ──────────────────────────────
-- Dipanggil sebelum battle dimulai. Mencatat waktu mulai dan enemy_id di DB.
-- Hanya 1 sesi aktif per pemain pada satu waktu.

-- Drop dulu jika sudah ada versi lama (mencegah error "cannot change return type")
DROP FUNCTION IF EXISTS public.start_battle(TEXT);
DROP FUNCTION IF EXISTS public.claim_battle_reward(UUID, TEXT, INTEGER);

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

  -- Tolak enemy yang tidak dikenal
  IF NOT EXISTS (SELECT 1 FROM enemy_registry WHERE enemy_id = p_enemy_id) THEN
    RAISE EXCEPTION 'INVALID_ENEMY';
  END IF;

  -- Hapus sesi lama yang sudah > 30 menit (cleanup)
  DELETE FROM battle_sessions
  WHERE player_id = v_pid
    AND is_claimed = FALSE
    AND started_at < NOW() - INTERVAL '30 minutes';

  -- Batalkan sesi aktif sebelumnya (maksimal 1 sesi aktif per pemain)
  UPDATE battle_sessions
  SET is_claimed = TRUE, claimed_at = NOW()
  WHERE player_id = v_pid AND is_claimed = FALSE;

  -- Buat token baru
  INSERT INTO battle_sessions (player_id, enemy_id)
  VALUES (v_pid, p_enemy_id)
  RETURNING id INTO v_token;

  RETURN v_token;
END;
$$;


-- ── 4. RPC: claim_battle_reward(token, enemy_id, turns) → JSONB ──────────────
-- SATU-SATUNYA cara EXP dan Gold bisa diberikan dari battle.
-- Validasi: token valid, sekali pakai, enemy cocok, durasi minimum, jumlah turn minimum.
-- Nilai reward diambil dari enemy_registry — bukan dari client.

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

  -- Lock baris sesi untuk mencegah double-claim bersamaan
  SELECT * INTO v_session
  FROM battle_sessions
  WHERE id = p_token AND player_id = v_pid
  FOR UPDATE NOWAIT;

  IF NOT FOUND             THEN RAISE EXCEPTION 'INVALID_TOKEN';    END IF;
  IF v_session.is_claimed  THEN RAISE EXCEPTION 'ALREADY_CLAIMED';  END IF;
  IF v_session.enemy_id <> p_enemy_id THEN RAISE EXCEPTION 'ENEMY_MISMATCH'; END IF;

  -- Ambil data reward resmi dari server
  SELECT * INTO v_enemy FROM enemy_registry WHERE enemy_id = p_enemy_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_ENEMY'; END IF;

  -- Validasi durasi minimum (blokir instant-win via manipulasi phase)
  IF EXTRACT(EPOCH FROM (NOW() - v_session.started_at)) < v_enemy.min_seconds THEN
    RAISE EXCEPTION 'TOO_FAST';
  END IF;

  -- Validasi jumlah turn minimum (blokir 0-turn claim via DevTools)
  IF p_turns < v_enemy.min_turns THEN RAISE EXCEPTION 'INSUFFICIENT_TURNS'; END IF;
  IF p_turns > 2000              THEN RAISE EXCEPTION 'INVALID_TURNS';       END IF;

  -- Ambil data pemain saat ini
  SELECT * INTO v_player FROM players WHERE id = v_pid;
  IF NOT FOUND THEN RAISE EXCEPTION 'PLAYER_NOT_FOUND'; END IF;

  -- Hitung reward menggunakan HANYA nilai dari server (nilai dari client diabaikan)
  v_new_exp  := LEAST(999999999, v_player.experience + v_enemy.reward_exp);
  v_new_gold := v_player.gold + v_enemy.reward_gold;

  -- Tandai token sebagai sudah dipakai (sekali pakai — mencegah replay attack)
  UPDATE battle_sessions
  SET is_claimed = TRUE, claimed_at = NOW(), turn_count = p_turns
  WHERE id = p_token;

  -- Terapkan reward (HANYA experience dan gold — tidak ada yang lain berubah)
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


-- ── 5. Hak akses: hanya user yang login yang boleh memanggil RPC ─────────────

REVOKE ALL ON FUNCTION public.start_battle(TEXT)                       FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_battle_reward(UUID, TEXT, INTEGER)  FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.start_battle(TEXT)                       TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_battle_reward(UUID, TEXT, INTEGER)  TO authenticated;