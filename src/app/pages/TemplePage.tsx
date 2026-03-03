import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useGame } from '../contexts/GameContext';
import { ArrowLeft, Play, Pause, Heart } from 'lucide-react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';

export default function TemplePage() {
  const { player, updatePlayer, completeTutorialStep } = useGame();
  const navigate = useNavigate();
  const [isMeditating, setIsMeditating] = useState(false);
  const [meditationTime, setMeditationTime] = useState(0); // in seconds
  const [hpGained, setHpGained] = useState(0);
  const intervalRef = useRef<number | null>(null);

  if (!player) return null;

  const startMeditation = () => {
    setIsMeditating(true);
    setMeditationTime(0);
    setHpGained(0);

    // Timer interval
    intervalRef.current = window.setInterval(() => {
      setMeditationTime((prev) => prev + 1);
    }, 1000);

    // HP gain interval (every 10 seconds)
    const hpInterval = window.setInterval(async () => {
      setHpGained((prev) => {
        const newHpGained = prev + 1;
        // Update player HP in real-time
        updatePlayer({
          stats: {
            ...player.stats,
            hp: player.stats.hp + 1,
          },
        });
        return newHpGained;
      });
    }, 10000);

    // Store both intervals
    (intervalRef.current as any).hpInterval = hpInterval;
  };

  const stopMeditation = async () => {
    setIsMeditating(false);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      clearInterval((intervalRef.current as any).hpInterval);
      intervalRef.current = null;
    }

    // Check if tutorial quest is complete (gained at least 10 HP)
    if (hpGained >= 10 && player.tutorialProgress && !player.tutorialProgress.meditated) {
      await completeTutorialStep('meditate');
      alert('Tutorial meditasi selesai! Kembali ke Kepala Desa untuk instruksi terakhir.');
      navigate('/game/village/chief-house');
    } else {
      navigate('/game/village');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        clearInterval((intervalRef.current as any).hpInterval);
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const nextHpIn = isMeditating ? 10 - (meditationTime % 10) : 10;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back Button - Hidden when meditating */}
      {!isMeditating && (
        <button
          onClick={() => navigate('/game/village')}
          className="mb-6 flex items-center gap-2 text-purple-300 hover:text-purple-200 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Kembali ke Desa</span>
        </button>
      )}

      <div className="bg-gradient-to-br from-indigo-900/40 to-black/60 backdrop-blur-sm border-2 border-indigo-500/30 rounded-xl overflow-hidden">
        {/* Temple Image */}
        <div className="relative h-64">
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1644413239414-33a8bf405db9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxqYXBhbmVzZSUyMHRlbXBsZSUyMHNocmluZXxlbnwxfHx8fDE3NzI1Mjc4NTJ8MA&ixlib=rb-4.1.0&q=80&w=1080"
            alt="Temple"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
          <div className="absolute bottom-4 left-6">
            <h1 className="text-3xl font-bold text-white mb-1">Kuil Desa</h1>
            <p className="text-indigo-200">Tempat Suci untuk Meditasi</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {!isMeditating ? (
            <>
              {/* Welcome Dialog */}
              <div className="bg-black/40 border border-indigo-500/30 rounded-lg p-6 mb-6">
                <p className="text-gray-300 leading-relaxed mb-4">
                  Tempat yang tenang dan penuh energi spiritual. Di sini kamu bisa bermeditasi untuk meningkatkan HP-mu secara permanen.
                </p>
                <p className="text-indigo-300 leading-relaxed">
                  Setiap 10 detik meditasi akan meningkatkan HP-mu sebanyak 1 point. Tidak ada batas maksimal HP!
                </p>
              </div>

              {/* Tutorial Quest Info */}
              {player.tutorialProgress && !player.tutorialProgress.meditated && (
                <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 animate-pulse"></div>
                    <div>
                      <h3 className="font-bold text-yellow-300 mb-1">Quest Tutorial Aktif</h3>
                      <p className="text-sm text-yellow-200/80">
                        Bermeditasi setidaknya untuk mendapatkan +10 HP
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Current HP Display */}
              <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-6 mb-6">
                <div className="flex items-center justify-center gap-3">
                  <Heart className="w-8 h-8 text-red-400" />
                  <div>
                    <p className="text-sm text-gray-400">HP Saat Ini</p>
                    <p className="text-3xl font-bold text-red-300">{player.stats.hp}</p>
                  </div>
                </div>
              </div>

              {/* Start Button */}
              <div className="text-center">
                <button
                  onClick={startMeditation}
                  className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-lg text-white font-bold text-lg shadow-lg shadow-indigo-500/30 transition-all duration-300 transform hover:scale-105"
                >
                  <Play className="w-6 h-6" />
                  Mulai Meditasi
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Meditating State */}
              <div className="text-center space-y-8">
                {/* Meditation Animation */}
                <div className="relative">
                  <div className="w-32 h-32 mx-auto bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full animate-pulse flex items-center justify-center">
                    <div className="w-24 h-24 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-indigo-700 to-purple-700 rounded-full"></div>
                    </div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-4xl animate-pulse">🧘</div>
                  </div>
                </div>

                <div>
                  <h2 className="text-3xl font-bold text-indigo-300 mb-2">Bermeditasi...</h2>
                  <p className="text-gray-400">Fokuskan pikiranmu dan rasakan energi mengalir</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-6 max-w-2xl mx-auto">
                  {/* Time */}
                  <div className="bg-black/40 border border-indigo-500/30 rounded-xl p-6">
                    <p className="text-sm text-gray-400 mb-2">Waktu Meditasi</p>
                    <p className="text-4xl font-bold text-indigo-300">{formatTime(meditationTime)}</p>
                  </div>

                  {/* HP Gained */}
                  <div className="bg-black/40 border border-red-500/30 rounded-xl p-6">
                    <p className="text-sm text-gray-400 mb-2">HP Ditingkatkan</p>
                    <div className="flex items-center justify-center gap-2">
                      <Heart className="w-6 h-6 text-red-400" />
                      <p className="text-4xl font-bold text-red-300">+{hpGained}</p>
                    </div>
                  </div>
                </div>

                {/* Next HP Counter */}
                <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-4">
                  <p className="text-green-300 font-semibold">
                    +1 HP dalam {nextHpIn} detik
                  </p>
                </div>

                {/* Current HP */}
                <div className="bg-black/40 border border-purple-500/30 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">HP Saat Ini</p>
                  <p className="text-2xl font-bold text-purple-300">{player.stats.hp + hpGained}</p>
                </div>

                {/* Stop Button */}
                <div>
                  <button
                    onClick={stopMeditation}
                    className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 rounded-lg text-white font-bold text-lg shadow-lg shadow-red-500/30 transition-all duration-300 transform hover:scale-105"
                  >
                    <Pause className="w-6 h-6" />
                    Berhenti Meditasi
                  </button>
                  <p className="text-xs text-gray-500 mt-3">
                    HP yang didapat akan tersimpan secara otomatis
                  </p>
                </div>

                {/* Tutorial Progress */}
                {player.tutorialProgress && !player.tutorialProgress.meditated && hpGained < 10 && (
                  <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-4">
                    <p className="text-yellow-300 font-semibold">
                      Progress Quest: {hpGained}/10 HP
                    </p>
                  </div>
                )}

                {player.tutorialProgress && !player.tutorialProgress.meditated && hpGained >= 10 && (
                  <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-4 animate-pulse">
                    <p className="text-green-300 font-bold text-lg">
                      ✓ Quest Selesai! Kamu bisa berhenti sekarang.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
