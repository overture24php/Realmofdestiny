import { X, Heart, Sparkles, Sword, Shield, Target, Eye } from 'lucide-react';
import { useGame } from '../../contexts/GameContext';

interface ProfileModalProps {
  onClose: () => void;
}

export default function ProfileModal({ onClose }: ProfileModalProps) {
  const { player } = useGame();

  if (!player) return null;

  const stats = player.stats;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-gradient-to-br from-purple-900/90 to-black/90 border-2 border-purple-500/50 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl shadow-purple-500/30">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-900 to-pink-900 border-b border-purple-500/50 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Profile Pemain</h2>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Player Info */}
          <div className="bg-black/40 rounded-xl p-6 border border-purple-500/30">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">Nama</p>
                <p className="text-lg font-bold text-purple-200">{player.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Level</p>
                <p className="text-lg font-bold text-purple-200">{player.level}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Role</p>
                <p className="text-lg font-bold text-purple-200 capitalize">{player.role}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Faksi</p>
                <p className="text-lg font-bold text-purple-200 capitalize">{player.faction}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Karma</p>
                <p className={`text-lg font-bold ${player.karma < 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {player.karma}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Gold</p>
                <p className="text-lg font-bold text-yellow-400">{player.gold}</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-black/40 rounded-xl p-6 border border-purple-500/30">
            <h3 className="text-xl font-bold text-purple-300 mb-4">Statistik</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* HP */}
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="w-5 h-5 text-red-400" />
                  <p className="font-semibold text-red-200">Health Points</p>
                </div>
                <p className="text-2xl font-bold text-red-300">{stats.hp}</p>
                <p className="text-xs text-gray-400 mt-1">Permanen & Fleksibel</p>
              </div>

              {/* MP */}
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-blue-400" />
                  <p className="font-semibold text-blue-200">Mana Points</p>
                </div>
                <p className="text-2xl font-bold text-blue-300">{stats.mp}</p>
                <p className="text-xs text-gray-400 mt-1">Untuk skill khusus</p>
              </div>

              {/* Physical ATK */}
              <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sword className="w-5 h-5 text-orange-400" />
                  <p className="font-semibold text-orange-200">Physical ATK</p>
                </div>
                <p className="text-2xl font-bold text-orange-300">{stats.physicalAtk}</p>
              </div>

              {/* Magic ATK */}
              <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  <p className="font-semibold text-purple-200">Magic ATK</p>
                </div>
                <p className="text-2xl font-bold text-purple-300">{stats.magicAtk}</p>
              </div>

              {/* Physical DEF */}
              <div className="bg-cyan-900/20 border border-cyan-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-cyan-400" />
                  <p className="font-semibold text-cyan-200">Physical DEF</p>
                </div>
                <p className="text-2xl font-bold text-cyan-300">{stats.physicalDef}</p>
              </div>

              {/* Magic DEF */}
              <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-indigo-400" />
                  <p className="font-semibold text-indigo-200">Magic DEF</p>
                </div>
                <p className="text-2xl font-bold text-indigo-300">{stats.magicDef}</p>
              </div>

              {/* Dodge */}
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="w-5 h-5 text-green-400" />
                  <p className="font-semibold text-green-200">Dodge</p>
                </div>
                <p className="text-2xl font-bold text-green-300">{stats.dodge}%</p>
                <p className="text-xs text-gray-400 mt-1">Max 50%</p>
              </div>

              {/* Accuracy */}
              <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-5 h-5 text-yellow-400" />
                  <p className="font-semibold text-yellow-200">Accuracy</p>
                </div>
                <p className="text-2xl font-bold text-yellow-300">{stats.accuracy}%</p>
                <p className="text-xs text-gray-400 mt-1">Max 40%</p>
              </div>
            </div>
          </div>

          {/* Tutorial Progress */}
          {!player.tutorialProgress.completed && (
            <div className="bg-black/40 rounded-xl p-6 border border-yellow-500/30">
              <h3 className="text-xl font-bold text-yellow-300 mb-4">Progress Tutorial</h3>
              <div className="space-y-2">
                <div className={`flex items-center gap-2 ${player.tutorialProgress.gotWeapon ? 'text-green-400' : 'text-gray-400'}`}>
                  <div className={`w-4 h-4 rounded-full border-2 ${player.tutorialProgress.gotWeapon ? 'bg-green-500 border-green-500' : 'border-gray-500'}`}></div>
                  <span>Ambil senjata dari pandai besi</span>
                </div>
                <div className={`flex items-center gap-2 ${player.tutorialProgress.trainedAtArena ? 'text-green-400' : 'text-gray-400'}`}>
                  <div className={`w-4 h-4 rounded-full border-2 ${player.tutorialProgress.trainedAtArena ? 'bg-green-500 border-green-500' : 'border-gray-500'}`}></div>
                  <span>Berlatih di arena</span>
                </div>
                <div className={`flex items-center gap-2 ${player.tutorialProgress.defeatedBoars >= 4 ? 'text-green-400' : 'text-gray-400'}`}>
                  <div className={`w-4 h-4 rounded-full border-2 ${player.tutorialProgress.defeatedBoars >= 4 ? 'bg-green-500 border-green-500' : 'border-gray-500'}`}></div>
                  <span>Kalahkan 4 babi hutan ({player.tutorialProgress.defeatedBoars}/4)</span>
                </div>
                <div className={`flex items-center gap-2 ${player.tutorialProgress.meditated ? 'text-green-400' : 'text-gray-400'}`}>
                  <div className={`w-4 h-4 rounded-full border-2 ${player.tutorialProgress.meditated ? 'bg-green-500 border-green-500' : 'border-gray-500'}`}></div>
                  <span>Bermeditasi di kuil (+10 HP)</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
