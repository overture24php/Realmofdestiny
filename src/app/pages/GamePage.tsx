import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router';
import { GameProvider, useGame } from '../contexts/GameContext';
import { User, Backpack, LogOut, Heart, Sparkles } from 'lucide-react';
import ProfileModal from '../components/game/ProfileModal';
import InventoryModal from '../components/game/InventoryModal';
import { getSupabaseClient } from '../../utils/supabase-client';

function GameContent() {
  const { player, loading } = useGame();
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);
  const [showInventory, setShowInventory] = useState(false);

  useEffect(() => {
    // Redirect to village if player just entered game
    if (player && !loading) {
      const path = window.location.pathname;
      if (path === '/game' || path === '/game/') {
        navigate('/game/village');
      }
    }
  }, [player, loading, navigate]);

  const handleLogout = async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-purple-300 text-lg">Memuat dunia...</p>
        </div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-300 text-lg">Gagal memuat data pemain</p>
          <button
            onClick={() => navigate('/login')}
            className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors"
          >
            Kembali ke Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900/20 to-black text-white">
      {/* Top Bar */}
      <div className="bg-black/40 backdrop-blur-md border-b border-purple-500/30 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Player Info */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowProfile(true)}
                className="flex items-center gap-3 bg-purple-900/30 hover:bg-purple-800/40 border border-purple-500/30 rounded-lg px-4 py-2 transition-colors"
              >
                <User className="w-5 h-5 text-purple-300" />
                <div className="text-left">
                  <p className="text-sm font-bold text-purple-200">{player.name}</p>
                  <p className="text-xs text-gray-400">Level {player.level}</p>
                </div>
              </button>
              
              {/* Stats Quick View */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-red-900/30 border border-red-500/30 rounded-lg px-3 py-2">
                  <Heart className="w-4 h-4 text-red-400" />
                  <span className="text-sm font-bold text-red-200">{player.stats.hp}</span>
                </div>
                <div className="flex items-center gap-2 bg-blue-900/30 border border-blue-500/30 rounded-lg px-3 py-2">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-bold text-blue-200">{player.stats.mp}</span>
                </div>
                <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg px-3 py-2">
                  <span className="text-sm font-bold text-yellow-200">{player.gold} Gold</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowInventory(true)}
                className="flex items-center gap-2 bg-purple-900/30 hover:bg-purple-800/40 border border-purple-500/30 rounded-lg px-4 py-2 transition-colors"
              >
                <Backpack className="w-5 h-5 text-purple-300" />
                <span className="text-sm font-semibold text-purple-200">Tas</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-red-900/30 hover:bg-red-800/40 border border-red-500/30 rounded-lg px-4 py-2 transition-colors"
              >
                <LogOut className="w-5 h-5 text-red-300" />
                <span className="text-sm font-semibold text-red-200">Keluar</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Game Content */}
      <div className="container mx-auto px-4 py-6">
        <Outlet />
      </div>

      {/* Modals */}
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
      {showInventory && <InventoryModal onClose={() => setShowInventory(false)} />}
    </div>
  );
}

export default function GamePage() {
  return (
    <GameProvider>
      <GameContent />
    </GameProvider>
  );
}
