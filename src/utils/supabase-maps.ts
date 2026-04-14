/**
 * supabase-maps.ts
 * Helper untuk operasi database tabel `maps`.
 * Map data disimpan sebagai JSONB sehingga bisa di-upsert dari Map Editor
 * tanpa perlu edit source code.
 *
 * SQL setup (jalankan SEKALI di Supabase SQL Editor):
 * ────────────────────────────────────────────────────
 * CREATE TABLE IF NOT EXISTS public.maps (
 *   id          TEXT PRIMARY KEY,
 *   name        TEXT,
 *   data        JSONB NOT NULL,
 *   updated_at  TIMESTAMPTZ DEFAULT NOW()
 * );
 *
 * ALTER TABLE public.maps ENABLE ROW LEVEL SECURITY;
 *
 * -- Semua orang bisa baca map (data publik game)
 * CREATE POLICY "maps_read_all" ON public.maps FOR SELECT USING (true);
 *
 * -- Siapa saja bisa write (Map Editor dev tool — gunakan MAPS_SETUP_SQL di bawah)
 * CREATE POLICY "maps_write_auth" ON public.maps FOR ALL USING (true);
 * ───────────────────────��────────────────────────────
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { TileMap } from '../app/data/innMapData';

export interface MapListItem {
  id         : string;
  name       : string;
  updated_at : string;
}

// ── SQL Setup ──────────────────────────────────────────────────────────────────
export const MAPS_SETUP_SQL = `
-- Tabel penyimpanan data map game
CREATE TABLE IF NOT EXISTS public.maps (
  id          TEXT PRIMARY KEY,
  name        TEXT,
  data        JSONB NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.maps ENABLE ROW LEVEL SECURITY;

-- Semua orang bisa baca map (data publik game)
DROP POLICY IF EXISTS "maps_read_all" ON public.maps;
CREATE POLICY "maps_read_all" ON public.maps FOR SELECT USING (true);

-- Siapa saja bisa write (Map Editor adalah developer tool, batasi via Supabase dashboard jika perlu)
DROP POLICY IF EXISTS "maps_write_auth" ON public.maps;
CREATE POLICY "maps_write_auth" ON public.maps
  FOR ALL USING (true);
`;

// ── Save / Upsert ──────────────────────────────────────────────────────────────
export async function saveMapToDb(
  supabase   : SupabaseClient,
  mapData    : TileMap,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('maps')
    .upsert({
      id         : mapData.id,
      name       : mapData.name,
      data       : mapData,
      updated_at : new Date().toISOString(),
    }, { onConflict: 'id' });
  return { error: error?.message ?? null };
}

// ── Load single map ────────────────────────────────────────────────────────────
export async function loadMapFromDb(
  supabase : SupabaseClient,
  mapId    : string,
): Promise<TileMap | null> {
  const { data, error } = await supabase
    .from('maps')
    .select('data')
    .eq('id', mapId)
    .single();
  if (error || !data) return null;
  return data.data as TileMap;
}

// ── Load all maps → Record<id, TileMap> ───────────────────────────────────────
export async function loadAllMapsFromDb(
  supabase : SupabaseClient,
): Promise<Record<string, TileMap>> {
  const { data, error } = await supabase
    .from('maps')
    .select('id, data');
  if (error || !data) return {};
  return Object.fromEntries(
    (data as Array<{ id: string; data: TileMap }>).map(r => [r.id, r.data])
  );
}

// ── List map metadata (untuk dropdown di editor) ──────────────────────────────
export async function listMapsFromDb(
  supabase : SupabaseClient,
): Promise<MapListItem[]> {
  const { data, error } = await supabase
    .from('maps')
    .select('id, name, updated_at')
    .order('updated_at', { ascending: false });
  if (error || !data) return [];
  return data as MapListItem[];
}

// ── Delete map ─────────────────────────────────────────────────────────────────
export async function deleteMapFromDb(
  supabase : SupabaseClient,
  mapId    : string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('maps')
    .delete()
    .eq('id', mapId);
  return { error: error?.message ?? null };
}
