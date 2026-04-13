-- ════════════════════════════════════════════════════════════════════════════════
-- PATCH v2 — Penjaga Desa Pemula, Veteran & Elit
--
-- rookie_guard (Pemula):
--   ✅ HP = 100
--   ✅ 5 skill: normal(40%) | tusukan_pemula(25%) | angkat_perisai_pemula(20%)
--              ayunan_tombak_asal(10%) | tusukan_bertubi_tubi ULTIMATE(5%) 5×0.3× abaikan 50%DEF
--
-- veteran_guard (Veteran):
--   ✅ HP = 500  (level display: 7)
--   ✅ 5 skill: normal(40%) | tusukan_tombak(25%) | angkat_perisai_tangguh(20%)
--              ayunan_tombak_terukur(10%) 1.4× single | tusukan_bertubi_tubi ULTIMATE(5%) 5×0.3× abaikan 50%DEF
--
-- shadow_lurker (Elit):
--   ✅ HP = 1000  (level display: 17)
--   ✅ 5 skill: normal(40%) | tusukan_maut(25%) 1.5× | battle_cry(20%) ATK+100/DEF+300 3turn
--              ayunan_kuat(10%) 1.75× abaikan 20%DEF | tusukan_kuat_bertubi_tubi ULTIMATE(5%) 5×0.4× abaikan 50%DEF
--
-- Cara deploy:
--   Supabase Dashboard → SQL Editor → New Query → tempel isi file ini → RUN
-- ════════════════════════════════════════════════════════════════════════════════

-- ── Penjaga Desa Pemula ───────────────────────────────────────────────────────
UPDATE public.enemy_registry
SET
  hp        = 100,
  atk       = 10,
  pdef      = 30,
  mdef      = 30,
  is_living = TRUE,
  skills    = '[
    {
      "id": "normal_attack",
      "name": "Serangan Normal",
      "icon": "⚔️",
      "damage_mult": 1.0,
      "probability": 40,
      "hit_count": 1,
      "def_penetration": 0
    },
    {
      "id": "tusukan_pemula",
      "name": "Tusukan Pemula",
      "icon": "🗡",
      "damage_mult": 1.1,
      "probability": 25,
      "hit_count": 1,
      "def_penetration": 0
    },
    {
      "id": "angkat_perisai_pemula",
      "name": "Angkat Perisai Pemula",
      "icon": "🛡",
      "damage_mult": 0,
      "probability": 20,
      "buff_atk": 0,
      "buff_pdef": 20,
      "buff_mdef": 20,
      "buff_turns": 2
    },
    {
      "id": "ayunan_tombak_asal",
      "name": "Ayunan Tombak Asal",
      "icon": "🏹",
      "damage_mult": 1.15,
      "probability": 10,
      "hit_count": 1,
      "def_penetration": 0
    },
    {
      "id": "tusukan_bertubi_tubi",
      "name": "Tusukan Bertubi-tubi",
      "icon": "💥",
      "damage_mult": 0.3,
      "probability": 5,
      "hit_count": 5,
      "def_penetration": 50,
      "is_ultimate": true
    }
  ]'::JSONB
WHERE enemy_id = 'rookie_guard';

-- ── Penjaga Desa Veteran ────��─────────────────────────────────────────────────
UPDATE public.enemy_registry
SET
  hp        = 500,
  atk       = 50,
  pdef      = 90,
  mdef      = 90,
  is_living = TRUE,
  skills    = '[
    {
      "id": "normal_attack",
      "name": "Serangan Normal",
      "icon": "⚔️",
      "damage_mult": 1.0,
      "probability": 40,
      "hit_count": 1,
      "def_penetration": 0
    },
    {
      "id": "tusukan_tombak",
      "name": "Tusukan Tombak",
      "icon": "🏹",
      "damage_mult": 1.3,
      "probability": 25,
      "hit_count": 1,
      "def_penetration": 0
    },
    {
      "id": "angkat_perisai_tangguh",
      "name": "Angkat Perisai Tangguh",
      "icon": "🛡",
      "damage_mult": 0,
      "probability": 20,
      "buff_atk": 0,
      "buff_pdef": 40,
      "buff_mdef": 40,
      "buff_turns": 3
    },
    {
      "id": "ayunan_tombak_terukur",
      "name": "Ayunan Tombak Terukur",
      "icon": "⚡",
      "damage_mult": 1.4,
      "probability": 10,
      "hit_count": 1,
      "def_penetration": 0
    },
    {
      "id": "tusukan_bertubi_tubi_v",
      "name": "Tusukan Bertubi-tubi",
      "icon": "💥",
      "damage_mult": 0.3,
      "probability": 5,
      "hit_count": 5,
      "def_penetration": 50,
      "is_ultimate": true
    }
  ]'::JSONB
WHERE enemy_id = 'veteran_guard';

-- ── Penjaga Desa Elit ─────────────────────────────────────────────────────────
UPDATE public.enemy_registry
SET
  hp        = 1000,
  atk       = 250,
  pdef      = 300,
  mdef      = 300,
  is_living = TRUE,
  skills    = '[
    {
      "id": "normal_attack",
      "name": "Serangan Normal",
      "icon": "⚔️",
      "damage_mult": 1.0,
      "probability": 40,
      "hit_count": 1,
      "def_penetration": 0
    },
    {
      "id": "tusukan_maut_e",
      "name": "Tusukan Maut",
      "icon": "🗡",
      "damage_mult": 1.5,
      "probability": 25,
      "hit_count": 1,
      "def_penetration": 0
    },
    {
      "id": "battle_cry",
      "name": "Battle Cry (Desa Daun)",
      "icon": "📯",
      "damage_mult": 0,
      "probability": 20,
      "buff_atk": 100,
      "buff_pdef": 300,
      "buff_mdef": 300,
      "buff_turns": 3
    },
    {
      "id": "ayunan_kuat",
      "name": "Ayunan Kuat",
      "icon": "💀",
      "damage_mult": 1.75,
      "probability": 10,
      "hit_count": 1,
      "def_penetration": 20
    },
    {
      "id": "tusukan_kuat_bertubi_v",
      "name": "Tusukan Kuat Bertubi-tubi",
      "icon": "💥",
      "damage_mult": 0.4,
      "probability": 5,
      "hit_count": 5,
      "def_penetration": 50,
      "is_ultimate": true
    }
  ]'::JSONB
WHERE enemy_id = 'shadow_lurker';

-- ── Verifikasi ────────────────────────────────────────────────────────────────
SELECT
  e.enemy_id,
  e.hp, e.atk, e.pdef, e.mdef,
  jsonb_array_length(e.skills) AS skill_count,
  v.skill_summary
FROM public.enemy_registry e
LEFT JOIN LATERAL (
  SELECT string_agg(
    (s->>'name')::text || ' (' || (s->>'probability')::text || '%)',
    ' | '
    ORDER BY (s->>'probability')::int DESC
  ) AS skill_summary
  FROM jsonb_array_elements(e.skills) AS s
) v ON TRUE
WHERE e.enemy_id IN ('rookie_guard', 'veteran_guard', 'shadow_lurker')
ORDER BY e.hp;