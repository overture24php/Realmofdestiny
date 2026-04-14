/**
 * useMapData.ts
 * Hook untuk loading map data secara dinamis dari Supabase.
 * DB maps override static maps dengan ID yang sama.
 * Fallback ke static maps jika DB tidak tersedia / offline.
 *
 * Cara pakai:
 *   const { maps, mapsRef, loading } = useMapData();
 *   // gunakan mapsRef.current[mapId] di dalam game loop (no re-render)
 *   // gunakan maps[mapId] di dalam render / JSX
 */

import { useState, useEffect, useRef } from 'react';
import { MAPS as INN_MAPS, TileMap } from '../data/innMapData';
import { VILLAGE_MAP } from '../data/villageMapData';
import { getSupabaseClient } from '../../utils/supabase-client';
import { loadAllMapsFromDb } from '../../utils/supabase-maps';

// Static fallback — selalu tersedia meski offline
export const STATIC_MAPS: Record<string, TileMap> = {
  ...INN_MAPS,
  village: VILLAGE_MAP,
};

export function useMapData() {
  const [maps,    setMaps]    = useState<Record<string, TileMap>>(STATIC_MAPS);
  const [loading, setLoading] = useState(true);
  // mapsRef: gunakan ini di dalam game loop (60fps) agar tidak trigger re-render
  const mapsRef = useRef<Record<string, TileMap>>(STATIC_MAPS);

  useEffect(() => {
    let cancelled = false;

    async function fetchMaps() {
      try {
        const supabase = getSupabaseClient();
        const dbMaps   = await loadAllMapsFromDb(supabase);

        if (!cancelled) {
          // DB maps override static maps (same id → DB menang)
          const merged: Record<string, TileMap> = { ...STATIC_MAPS, ...dbMaps };
          mapsRef.current = merged;
          setMaps(merged);
        }
      } catch (err) {
        // Fallback ke static maps — game tetap jalan tanpa internet
        console.warn('[useMapData] Gagal load dari DB, pakai static fallback:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchMaps();
    return () => { cancelled = true; };
  }, []);

  /** Paksa reload dari DB (gunakan setelah save dari Map Editor) */
  async function refetch() {
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const dbMaps   = await loadAllMapsFromDb(supabase);
      const merged   = { ...STATIC_MAPS, ...dbMaps };
      mapsRef.current = merged;
      setMaps(merged);
    } catch (err) {
      console.warn('[useMapData] refetch gagal:', err);
    } finally {
      setLoading(false);
    }
  }

  return { maps, mapsRef, loading, refetch };
}
