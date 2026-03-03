import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useGame } from '../contexts/GameContext';
import { ArrowLeft, Target, Shield, Swords, Skull } from 'lucide-react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';

const TRAINING_OPPONENTS = [
  {
    id: 'wooden-dummy',
    name: 'Boneka Kayu',
    icon: Target,
    difficulty: 'Sangat Mudah',
    difficultyColor: 'text-green-400',
    image: 'https://images.unsplash.com/photo-1603723197165-5692de8defba?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b29kZW4lMjBkdW1teSUyMHRyYWluaW5nfGVufDF8fHx8MTc3MjUyNzg1M3ww&ixlib=rb-4.1.0&q=80&w=1080',
    description: 'Boneka kayu untuk latihan dasar. Tidak akan melawan balik.',
    stats: {
      hp: 50,
      atk: 0,
      def: 5,
    },
    reward: {
      exp: 10,
      gold: 5,
    },
  },
  {
    id: 'novice-guard',
    name: 'Pasukan Penjaga Pemula',
    icon: Shield,
    difficulty: 'Mudah',
    difficultyColor: 'text-blue-400',
    image: 'https://images.unsplash.com/photo-1727986760616-0d8f65a6ab92?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cmFpbmluZyUyMGFyZW5hJTIwbWVkaWV2YWx8ZW58MXx8fHwxNzcyNTI3ODUzfDA&ixlib=rb-4.1.0&q=80&w=1080',
    description: 'Pasukan penjaga yang baru direkrut. Akan melawan dengan serius tapi masih lemah.',
    stats: {
      hp: 80,
      atk: 8,
      def: 10,
    },
    reward: {
      exp: 25,
      gold: 15,
    },
  },
  {
    id: 'senior-guard',
    name: 'Pasukan Penjaga Senior',
    icon: Swords,
    difficulty: 'Sedang',
    difficultyColor: 'text-yellow-400',
    image: 'https://images.unsplash.com/photo-1727986760616-0d8f65a6ab92?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cmFpbmluZyUyMGFyZW5hJTIwbWVkaWV2YWx8ZW58MXx8fHwxNzcyNTI3ODUzfDA&ixlib=rb-4.1.0&q=80&w=1080',
    description: 'Pasukan penjaga berpengalaman. Akan memberikan perlawanan yang signifikan.',
    stats: {
      hp: 120,
      atk: 15,
      def: 15,
    },
    reward: {
      exp: 50,
      gold: 30,
    },
  },
  {
    id: 'elite-guard',
    name: 'Pasukan Penjaga Elit',
    icon: Skull,
    difficulty: 'Sulit',
    difficultyColor: 'text-red-400',
    image: 'https://images.unsplash.com/photo-1734122373993-36745ac6b688?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYW50YXN5JTIwd2FycmlvciUyMGVxdWlwbWVudCUyMGFybW9yfGVufDF8fHx8MTc3MjUyNzg1M3ww&ixlib=rb-4.1.0&q=80&w=1080',
    description: 'Pasukan elit terkuat di desa. Hanya yang berani dan terlatih yang bisa melawannya.',
    stats: {
      hp: 180,
      atk: 25,
      def: 25,
    },
    reward: {
      exp: 100,
      gold: 60,
    },
  },
];

export default function ArenaPage() {
  const { player, completeTutorialStep } = useGame();
  const navigate = useNavigate();
  const [selectedOpponent, setSelectedOpponent] = useState<string | null>(null);

  if (!player) return null;

  const isQuestActive = player.tutorialProgress && !player.tutorialProgress.trainedAtArena;

  const handleStartTraining = async (opponentId: string) => {
    const opponent = TRAINING_OPPONENTS.find(o => o.id === opponentId);
    if (!opponent) return;

    // Complete tutorial if it's active
    if (isQuestActive) {
      await completeTutorialStep('arena');
      alert(`Latihan dengan ${opponent.name} selesai! Tutorial berlatih complete. Kembali ke Kepala Desa untuk instruksi selanjutnya.`);
      navigate('/game/village/chief-house');
    } else {
      alert(`Sistem battle akan dibuat nanti. Untuk sekarang, kamu mendapat ${opponent.reward.exp} EXP dan ${opponent.reward.gold} Gold!`);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => navigate('/game/village')}
        className="mb-6 flex items-center gap-2 text-purple-300 hover:text-purple-200 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Kembali ke Desa</span>
      </button>

      <div className="bg-gradient-to-br from-red-900/40 to-black/60 backdrop-blur-sm border-2 border-red-500/30 rounded-xl overflow-hidden">
        {/* Arena Image */}
        <div className="relative h-64">
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1727986760616-0d8f65a6ab92?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cmFpbmluZyUyMGFyZW5hJTIwbWVkaWV2YWx8ZW58MXx8fHwxNzcyNTI3ODUzfDA&ixlib=rb-4.1.0&q=80&w=1080"
            alt="Arena"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
          <div className="absolute bottom-4 left-6">
            <h1 className="text-3xl font-bold text-white mb-1">Arena Latihan Pasukan Penjaga</h1>
            <p className="text-red-200">Asah kemampuan bertarungmu</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Welcome Dialog */}
          <div className="bg-black/40 border border-red-500/30 rounded-lg p-6 mb-6">
            <p className="text-gray-300 leading-relaxed mb-4">
              "Selamat datang di Arena Latihan! Disini kamu bisa berlatih bertarung dengan aman."
            </p>
            {isQuestActive && (
              <p className="text-yellow-300 leading-relaxed">
                "Kepala Desa bilang kamu perlu latihan? Bagus! Pilih lawan latihanmu dan tunjukkan kemampuanmu!"
              </p>
            )}
          </div>

          {/* Tutorial Quest Info */}
          {isQuestActive && (
            <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 animate-pulse"></div>
                <div>
                  <h3 className="font-bold text-yellow-300 mb-1">Quest Tutorial Aktif</h3>
                  <p className="text-sm text-yellow-200/80">
                    Pilih salah satu lawan untuk berlatih dan selesaikan quest ini
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Opponents Grid */}
          <h2 className="text-2xl font-bold text-red-300 mb-4">Pilih Lawan Latihan</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {TRAINING_OPPONENTS.map((opponent) => {
              const Icon = opponent.icon;
              return (
                <div
                  key={opponent.id}
                  onClick={() => setSelectedOpponent(opponent.id)}
                  className={`bg-black/40 border-2 ${
                    selectedOpponent === opponent.id ? 'border-yellow-500' : 'border-red-500/30'
                  } rounded-xl overflow-hidden hover:border-red-400/50 transition-all cursor-pointer transform hover:scale-[1.02]`}
                >
                  {/* Opponent Image */}
                  <div className="relative h-40">
                    <ImageWithFallback
                      src={opponent.image}
                      alt={opponent.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
                    <div className="absolute top-3 right-3 w-12 h-12 bg-red-600/80 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-red-400/50">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-xl font-bold text-red-200 mb-1">{opponent.name}</h3>
                        <p className={`text-sm font-semibold ${opponent.difficultyColor}`}>
                          {opponent.difficulty}
                        </p>
                      </div>
                    </div>

                    <p className="text-sm text-gray-400 mb-4">{opponent.description}</p>

                    {/* Stats */}
                    <div className="bg-black/40 border border-red-500/20 rounded-lg p-3 mb-4">
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                          <p className="text-xs text-gray-400 mb-1">HP</p>
                          <p className="text-lg font-bold text-red-300">{opponent.stats.hp}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-1">ATK</p>
                          <p className="text-lg font-bold text-orange-300">{opponent.stats.atk}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-1">DEF</p>
                          <p className="text-lg font-bold text-blue-300">{opponent.stats.def}</p>
                        </div>
                      </div>
                    </div>

                    {/* Rewards */}
                    <div className="flex items-center justify-between text-sm mb-4">
                      <div>
                        <span className="text-gray-400">Reward: </span>
                        <span className="text-purple-300 font-semibold">{opponent.reward.exp} EXP</span>
                      </div>
                      <div>
                        <span className="text-yellow-300 font-semibold">{opponent.reward.gold} Gold</span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartTraining(opponent.id);
                      }}
                      className="w-full py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 rounded-lg text-white font-bold transition-all duration-300 shadow-lg shadow-red-500/30"
                    >
                      Mulai Latihan
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Coming Soon Notice */}
          <div className="mt-8 bg-blue-900/30 border border-blue-500/30 rounded-lg p-4 text-center">
            <p className="text-blue-300 text-sm">
              💡 Sistem battle lengkap akan dibuat nanti. Untuk sekarang, semua latihan akan langsung menyelesaikan quest tutorial.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
