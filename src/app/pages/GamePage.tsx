import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router';
import { useGame } from '../contexts/GameContext';
import { User, Backpack, LogOut, Heart, Sparkles } from 'lucide-react';
import ProfileModal from '../components/game/ProfileModal';
import InventoryModal from '../components/game/InventoryModal';
import { getSupabaseClient } from '../../utils/supabase-client';
import { MapFloatingButton } from '../components/game/MapFloatingButton';

/**
 * GamePage — authenticated shell with top bar.
 *
 * GameProvider is now supplied by the root layout (routes.tsx), so this
 * component simply calls useGame() — no need to wrap anything in a provider.
 */
export default function GamePage() {
  const { player, loading, error, fetchPlayer } = useGame();
  const navigate = useNavigate();
  const [showProfile, setShowProfile]     = useState(false);
  const [showInventory, setShowInventory] = useState(false);

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

  // Redirect /game → village
  useEffect(() => {
    if (player && !loading) {
      const p = window.location.pathname;
      if (p === '/game' || p === '/game/') {
        navigate('/game/village');
      }
    }
  }, [player, loading, navigate]);

  const handleLogout = async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    navigate('/');
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
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

  // ── Error / no player ────────────────────────────────────────────────────────
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

      {/* Top Bar */}
      <div className="bg-black/40 backdrop-blur-md border-b border-purple-500/30 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">

            {/* Player info */}
            <div className="flex items-center gap-3">
              <button onClick={() => setShowProfile(true)}
                className="flex items-center gap-3 bg-purple-900/30 hover:bg-purple-800/40 border border-purple-500/30 rounded-lg px-4 py-2 transition-colors">
                <User className="w-5 h-5 text-purple-300" />
                <div className="text-left">
                  <p className="text-sm font-bold text-purple-200">{player.name}</p>
                  <p className="text-xs text-gray-400">Lv.{player.level} · {player.role}</p>
                </div>
              </button>

              <div className="hidden sm:flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-red-900/30 border border-red-500/30 rounded-lg px-3 py-2">
                  <Heart className="w-4 h-4 text-red-400" />
                  <span className="text-sm font-bold text-red-200">{player.stats.hp}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-blue-900/30 border border-blue-500/30 rounded-lg px-3 py-2">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-bold text-blue-200">{player.stats.mp}</span>
                </div>
                <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg px-3 py-2">
                  <span className="text-sm font-bold text-yellow-200">{player.gold} 🪙</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
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

      {/* Page content — child routes render here */}
      <div className="container mx-auto px-4 py-6">
        <Outlet />
      </div>

      {/* Floating map compass — always visible inside game */}
      <MapFloatingButton />

      {showProfile   && <ProfileModal   onClose={() => setShowProfile(false)} />}
      {showInventory && <InventoryModal onClose={() => setShowInventory(false)} />}
    </div>
  );
}