/**
 * GameContext — Player data stored in Supabase Auth user_metadata.
 *
 * Why user_metadata instead of edge function:
 *   - Edge function deployment keeps failing (403), so old backend code runs.
 *   - supabase.auth.getUser()      → validates JWT directly with Supabase Auth API.
 *   - supabase.auth.updateUser()   → writes to user_metadata via Supabase Auth API.
 *   - Both calls are authenticated natively; no edge function, no RLS, no Invalid JWT.
 */
import {
  createContext, useContext, useState, useEffect, useRef, ReactNode,
} from 'react';
import { getSupabaseClient } from '../../utils/supabase-client';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PlayerStats {
  hp: number;
  mp: number;
  physicalAtk: number;
  magicAtk: number;
  physicalDef: number;
  magicDef: number;
  dodge: number;
  accuracy: number;
}

export interface Equipment {
  helm: any | null;
  rightHand: any | null;
  leftHand: any | null;
  armor: any | null;
  boots: any | null;
}

export interface TutorialProgress {
  gotWeapon: boolean;
  trainedAtArena: boolean;
  defeatedBoars: number;
  meditated: boolean;
  completed: boolean;
}

export interface PlayerData {
  id: string;
  name: string;
  email: string;
  role: string;
  karma: number;
  faction: string;
  level: number;
  experience: number;
  gold: number;
  stats: PlayerStats;
  equipment: Equipment;
  inventory: any[];
  tutorialProgress: TutorialProgress;
  location: string;
  createdAt: string;
}

interface GameContextType {
  player: PlayerData | null;
  loading: boolean;
  error: string | null;
  fetchPlayer: () => Promise<void>;
  updatePlayer: (updates: Partial<PlayerData>) => Promise<void>;
  completeTutorialStep: (step: string) => Promise<void>;
}

// ── Defaults ──────────────────────────────────────────────────────────────────

function createDefaultPlayer(
  userId: string,
  email: string,
  name: string,
  role = 'citizen',
): PlayerData {
  return {
    id: userId,
    name,
    email,
    role,
    karma: 0,
    faction: 'neutral',
    level: 1,
    experience: 0,
    gold: 100,
    stats: {
      hp: 100, mp: 50,
      physicalAtk: 10, magicAtk: 10,
      physicalDef: 10, magicDef: 10,
      dodge: 5, accuracy: 10,
    },
    equipment: { helm: null, rightHand: null, leftHand: null, armor: null, boots: null },
    inventory: [],
    tutorialProgress: {
      gotWeapon: false, trainedAtArena: false,
      defeatedBoars: 0, meditated: false, completed: false,
    },
    location: 'greenleaf_village',
    createdAt: new Date().toISOString(),
  };
}

// ── Context ───────────────────────────────────────────────────────────────────

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [player, setPlayer]   = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const fetchingRef           = useRef(false);

  // ── fetchPlayer ─────────────────────────────────────────────────────────────
  const fetchPlayer = async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();

      /**
       * getUser() sends the JWT to Supabase Auth API (not an edge function).
       * Supabase validates its own JWT natively → no "Invalid JWT" possible.
       * It also triggers a silent token refresh if the session is near expiry.
       */
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        console.log('[GameContext] getUser failed:', userError?.message);
        setError('Tidak ada sesi aktif. Silakan login kembali.');
        setLoading(false);
        fetchingRef.current = false;
        return;
      }

      console.log('[GameContext] User authenticated:', user.id, user.email);

      // Player data lives in user_metadata.playerData
      let playerData: PlayerData | null = user.user_metadata?.playerData ?? null;

      if (!playerData) {
        // First login — create default player and persist it
        console.log('[GameContext] No player data found, creating defaults...');
        const name = user.user_metadata?.name
          ?? user.email?.split('@')[0]
          ?? 'Player';

        playerData = createDefaultPlayer(user.id, user.email ?? '', name);

        // updateUser() also goes directly to Supabase Auth API — no edge function
        const { error: saveErr } = await supabase.auth.updateUser({
          data: { playerData },
        });

        if (saveErr) {
          console.warn('[GameContext] Could not persist new player data:', saveErr.message);
          // Still show the player even if save failed
        } else {
          console.log('[GameContext] Default player data saved to user_metadata');
        }
      }

      // Ensure id is always the real Supabase user id (in case of legacy data)
      if (playerData.id !== user.id) {
        playerData = { ...playerData, id: user.id };
      }

      console.log('[GameContext] Player loaded:', playerData.name, 'level', playerData.level);
      setPlayer(playerData);
      setError(null);
    } catch (err: any) {
      console.error('[GameContext] fetchPlayer exception:', err.message);
      setError(err.message || 'Gagal memuat data pemain');
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  // ── updatePlayer ────────────────────────────────────────────────────────────
  const updatePlayer = async (updates: Partial<PlayerData>) => {
    if (!player) return;

    // Optimistic local update first
    const updated = { ...player, ...updates };
    setPlayer(updated);

    try {
      const supabase = getSupabaseClient();
      const { error: saveErr } = await supabase.auth.updateUser({
        data: { playerData: updated },
      });
      if (saveErr) {
        console.warn('[GameContext] updatePlayer save error:', saveErr.message);
      }
    } catch (err: any) {
      console.warn('[GameContext] updatePlayer exception:', err.message);
      // Optimistic update stays — better UX
    }
  };

  // ── completeTutorialStep ────────────────────────────────────────────────────
  const completeTutorialStep = async (step: string) => {
    if (!player) return;

    // Compute new tutorial progress
    const prog = { ...player.tutorialProgress };
    switch (step) {
      case 'weapon':   prog.gotWeapon = true; break;
      case 'arena':    prog.trainedAtArena = true; break;
      case 'boars':    prog.defeatedBoars = 4; break;
      case 'meditate': prog.meditated = true; break;
    }
    if (prog.gotWeapon && prog.trainedAtArena && prog.defeatedBoars >= 4 && prog.meditated) {
      prog.completed = true;
    }

    await updatePlayer({ tutorialProgress: prog });
  };

  // ── Auth state listener ─────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = getSupabaseClient();

    // Check session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchPlayer();
      } else {
        setLoading(false);
      }
    });

    // React to login / logout / token refresh
    // Note: we do NOT reference `player` or `error` here to avoid stale closures.
    // fetchPlayer() reads fresh state internally via supabase.auth.getUser().
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[GameContext] Auth event:', event);
      if (event === 'SIGNED_IN' && session) {
        // Always re-fetch on sign-in to ensure fresh player data
        fetchPlayer();
      } else if (event === 'SIGNED_OUT') {
        setPlayer(null);
        setError(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <GameContext.Provider value={{ player, loading, error, fetchPlayer, updatePlayer, completeTutorialStep }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within a GameProvider');
  return ctx;
}