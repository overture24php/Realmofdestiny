import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router';
import { useGame } from '../contexts/GameContext';
import { Backpack, LogOut, Zap } from 'lucide-react';
import ProfileModal from '../components/game/ProfileModal';
import InventoryModal from '../components/game/InventoryModal';
import SkillMenuModal from '../components/game/SkillMenuModal';
import GenderSelectModal from '../components/game/GenderSelectModal';
import { getSupabaseClient } from '../../utils/supabase-client';
import { MapFloatingButton } from '../components/game/MapFloatingButton';
import { getElement } from '../data/statsCalc';
import maleImg from 'figma:asset/0d288298f55234e645afbd915a4e01469027b0fa.png';
import femaleImg from 'figma:asset/998d51489ca786ac6d73a705dcfca0031ec6408c.png';

/**
 * GamePage — authenticated shell with top bar.
 *
 * GameProvider is now supplied by the root layout (routes.tsx), so this
 * component simply calls useGame() — no need to wrap anything in a provider.
 */
export default function GamePage() {
  const { player, loading, error, fetchPlayer, updatePlayer } = useGame();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [showProfile, setShowProfile]     = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [showSkillMenu, setShowSkillMenu] = useState(false);
  const [battleActive, setBattleActive]   = useState(false);

  // Redirect to login if no session
  useEffect(() => {
    const check = async () => {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
      }
    };
    check();
  }, [navigate]);

  // Listen for game:openProfile event from LevelUpModal and other pages
  useEffect(() => {
    const handler = () => setShowProfile(true);
    window.addEventListener('game:openProfile', handler);
    return () => window.removeEventListener('game:openProfile', handler);
  }, []);

  // Sembunyikan header saat interface battle aktif (bukan saat pilih lawan)
  useEffect(() => {
    const handler = (e: Event) => {
      setBattleActive((e as CustomEvent<{ active: boolean }>).detail.active);
    };
    window.addEventListener('game:battleActive', handler);
    return () => window.removeEventListener('game:battleActive', handler);
  }, []);

  // Redirect /game → village
  useEffect(() => {
    if (player && !loading) {
      if (pathname === '/game' || pathname === '/game/') {
        navigate('/game/village');
      }
    }
  }, [player, loading, navigate, pathname]);

  // Force redirect to clinic if player HP < 1 (and not already there)
  useEffect(() => {
    if (player && !loading) {
      const curHp = player.stats.hp;
      if (curHp < 1 && !pathname.includes('/clinic')) {
        navigate('/game/village/clinic');
      }
    }
  }, [player, loading, navigate, pathname]);

  const handleLogout = async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    navigate('/');
  };

  // Sembunyikan header saat di halaman battle arena
  const isArena = pathname.includes('/arena');

  // ── Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-purple-300 text-lg">Memuat dunia...</p>
          <p className="text-purple-400/60 text-sm mt-2">Menghubungkan ke Supabase...</p>
        </div>
      </div>
    );
  }

  // ── Error / no player ───────────────────────────────────────────────────────
  if (!player) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900/20 to-black flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 bg-gradient-to-br from-red-500/20 to-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-red-500/30">
            <span className="text-5xl">⚠️</span>
          </div>
          <h2 className="text-3xl font-bold text-transparent bg-gradient-to-r from-red-400 to-purple-400 bg-clip-text mb-3">
            Gagal Memuat Data
          </h2>
          {error && (
            <p className="text-red-400/80 text-sm mb-4 bg-red-900/20 border border-red-500/30 rounded-lg p-3">
              {error}
            </p>
          )}
          <div className="space-y-3">
            <button onClick={fetchPlayer}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg transition-all font-semibold shadow-lg shadow-purple-500/50 transform hover:scale-[1.02]">
              🔄 Muat Ulang
            </button>
            <button onClick={() => navigate('/diagnostic')}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors font-medium">
              🔬 Test Koneksi
            </button>
            <button onClick={handleLogout}
              className="w-full px-6 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg transition-colors font-medium">
              ← Login Ulang
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main UI ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900/20 to-black text-white">

      {/* Gender + element selection gate — blocks all UI until both are chosen */}
      {(!player.gender || !player.elementAffinity) && (
        <GenderSelectModal
          existingGender={player.gender}
          onSelect={async (gender, element) => {
            // Regular elements (not none/light/dark) get +100 to their elementalAtk at the start
            const ELEM_ATK_BONUS = new Set(['fire', 'water', 'wind', 'earth', 'lightning', 'forest']);
            const updates: Parameters<typeof updatePlayer>[0] = { gender, elementAffinity: element };

            if (ELEM_ATK_BONUS.has(element)) {
              const curElemAtk = player.stats.elementalAtk ?? {};
              updates.stats = {
                ...player.stats,
                elementalAtk: {
                  fire      : 0, water: 0, wind: 0, earth: 0,
                  lightning : 0, forest: 0, light: 0, dark: 0,
                  ...curElemAtk,
                  [element] : ((curElemAtk as Record<string, number>)[element] ?? 0) + 100,
                },
              };
            }

            await updatePlayer(updates);
          }}
        />
      )}

      {/* Top Bar */}
      {!isArena && !battleActive && (
      <div className="bg-black/40 backdrop-blur-md border-b border-purple-500/30 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">

            {/* Player info */}
            <div className="flex items-center gap-3">
              <button onClick={() => setShowProfile(true)}
                className="flex items-center gap-3 bg-purple-900/30 hover:bg-purple-800/40 border border-purple-500/30 rounded-lg px-3 py-2 transition-colors">
                {/* Avatar thumbnail */}
                <div
                  className="rounded-full overflow-hidden flex-shrink-0"
                  style={{
                    width: 36, height: 36,
                    border: `2px solid ${player.gender === 'female' ? '#ec4899' : '#3b82f6'}`,
                    boxShadow: `0 0 10px ${player.gender === 'female' ? '#ec489966' : '#3b82f666'}`,
                    background: '#0a0418',
                  }}
                >
                  {player.gender ? (
                    <img
                      src={player.gender === 'female' ? femaleImg : maleImg}
                      alt="avatar"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-purple-300 text-sm">?</div>
                  )}
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-purple-200">{player.name}</p>
                  {/* Element label — colored, no icon, white for none */}
                  {(() => {
                    const affinity = player.elementAffinity;
                    if (!affinity) return null;
                    if (affinity === 'none') {
                      return (
                        <p style={{ fontSize: '0.58rem', color: '#ffffff', fontWeight: 600, letterSpacing: '0.08em', lineHeight: 1.2 }}>
                          Non-Elemen
                        </p>
                      );
                    }
                    const el = getElement(affinity);
                    if (!el) return null;
                    return (
                      <p style={{ fontSize: '0.58rem', color: el.color, fontWeight: 600, letterSpacing: '0.08em', lineHeight: 1.2 }}>
                        {el.label}
                      </p>
                    );
                  })()}
                  <p className="text-xs text-gray-400">Lv.{player.level} · {player.role}</p>
                </div>
              </button>

              <div className="hidden sm:flex items-center gap-2">
                {/* Gold */}
                <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg px-3 py-2">
                  <span className="text-sm font-bold text-yellow-200">{player.gold} 🪙</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button onClick={() => setShowSkillMenu(true)}
                className="flex items-center gap-2 bg-yellow-900/30 hover:bg-yellow-800/40 border border-yellow-500/30 rounded-lg px-4 py-2 transition-colors">
                <Zap className="w-5 h-5 text-yellow-300" />
                <span className="text-sm font-semibold text-yellow-200 hidden sm:inline">Skill</span>
              </button>
              <button onClick={() => setShowInventory(true)}
                className="flex items-center gap-2 bg-purple-900/30 hover:bg-purple-800/40 border border-purple-500/30 rounded-lg px-4 py-2 transition-colors">
                <Backpack className="w-5 h-5 text-purple-300" />
                <span className="text-sm font-semibold text-purple-200 hidden sm:inline">Tas</span>
              </button>
              <button onClick={handleLogout}
                className="flex items-center gap-2 bg-red-900/30 hover:bg-red-800/40 border border-red-500/30 rounded-lg px-4 py-2 transition-colors">
                <LogOut className="w-5 h-5 text-red-300" />
                <span className="text-sm font-semibold text-red-200 hidden sm:inline">Keluar</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Page content — child routes render here */}
      <div className={`container mx-auto px-4 ${battleActive ? 'py-0' : 'py-6'}`}>
        <Outlet />
      </div>

      {/* Floating map compass — always visible inside game */}
      <MapFloatingButton />

      {showProfile   && <ProfileModal   onClose={() => setShowProfile(false)} />}
      {showInventory && <InventoryModal onClose={() => setShowInventory(false)} />}
      {showSkillMenu && <SkillMenuModal onClose={() => setShowSkillMenu(false)} />}
    </div>
  );
}