import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getSupabaseClient } from '../../utils/supabase-client';
import { projectId, publicAnonKey } from '/utils/supabase/info';

interface PlayerStats {
  hp: number;
  mp: number;
  physicalAtk: number;
  magicAtk: number;
  physicalDef: number;
  magicDef: number;
  dodge: number;
  accuracy: number;
}

interface Equipment {
  helm: any | null;
  rightHand: any | null;
  leftHand: any | null;
  armor: any | null;
  boots: any | null;
}

interface TutorialProgress {
  gotWeapon: boolean;
  trainedAtArena: boolean;
  defeatedBoars: number;
  meditated: boolean;
  completed: boolean;
}

interface PlayerData {
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

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getAccessToken = async () => {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };

  const fetchPlayer = async () => {
    try {
      setLoading(true);
      const accessToken = await getAccessToken();
      
      if (!accessToken) {
        throw new Error('No access token');
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f8fa42fe/player`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch player data');
      }

      setPlayer(data.player);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching player:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updatePlayer = async (updates: Partial<PlayerData>) => {
    try {
      const accessToken = await getAccessToken();
      
      if (!accessToken) {
        throw new Error('No access token');
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f8fa42fe/player`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(updates),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update player data');
      }

      setPlayer(data.player);
    } catch (err: any) {
      console.error('Error updating player:', err);
      setError(err.message);
    }
  };

  const completeTutorialStep = async (step: string) => {
    try {
      const accessToken = await getAccessToken();
      
      if (!accessToken) {
        throw new Error('No access token');
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f8fa42fe/player/tutorial`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ step }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete tutorial step');
      }

      setPlayer(data.player);
    } catch (err: any) {
      console.error('Error completing tutorial step:', err);
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchPlayer();
  }, []);

  return (
    <GameContext.Provider value={{ player, loading, error, fetchPlayer, updatePlayer, completeTutorialStep }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
