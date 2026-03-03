import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useGame } from '../contexts/GameContext';
import { Home, Hammer, Church, Swords } from 'lucide-react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';

export default function VillagePage() {
  const { player } = useGame();
  const navigate = useNavigate();

  const buildings = [
    {
      id: 'chief-house',
      name: 'Rumah Kepala Desa',
      description: 'Tempat kepala desa memberikan arahan dan quest',
      icon: Home,
      image: 'https://images.unsplash.com/photo-1720129766483-e3554ee97d11?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZWRpZXZhbCUyMHZpbGxhZ2UlMjBob3VzZXN8ZW58MXx8fHwxNzcyNTI3ODUyfDA&ixlib=rb-4.1.0&q=80&w=1080',
      route: '/game/village/chief-house',
      locked: false,
    },
    {
      id: 'blacksmith',
      name: 'Pandai Besi Desa',
      description: 'Tempat membeli dan menempa senjata',
      icon: Hammer,
      image: 'https://images.unsplash.com/photo-1596441560548-2bc4b5e2c361?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxibGFja3NtaXRoJTIwd29ya3Nob3AlMjB0b29sc3xlbnwxfHx8fDE3NzI1Mjc4NTZ8MA&ixlib=rb-4.1.0&q=80&w=1080',
      route: '/game/village/blacksmith',
      locked: false,
    },
    {
      id: 'temple',
      name: 'Kuil Desa',
      description: 'Tempat bermeditasi untuk meningkatkan HP',
      icon: Church,
      image: 'https://images.unsplash.com/photo-1644413239414-33a8bf405db9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxqYXBhbmVzZSUyMHRlbXBsZSUyMHNocmluZXxlbnwxfHx8fDE3NzI1Mjc4NTJ8MA&ixlib=rb-4.1.0&q=80&w=1080',
      route: '/game/village/temple',
      locked: false,
    },
    {
      id: 'arena',
      name: 'Arena Latihan Pasukan Penjaga',
      description: 'Berlatih melawan dummy dan pasukan penjaga',
      icon: Swords,
      image: 'https://images.unsplash.com/photo-1727986760616-0d8f65a6ab92?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cmFpbmluZyUyMGFyZW5hJTIwbWVkaWV2YWx8ZW58MXx8fHwxNzcyNTI3ODUzfDA&ixlib=rb-4.1.0&q=80&w=1080',
      route: '/game/village/arena',
      locked: false,
    },
  ];

  // Force player to visit chief house first if tutorial not started
  useEffect(() => {
    if (player && player.tutorialProgress && !player.tutorialProgress.completed) {
      // Check if player hasn't started any tutorial yet
      const progress = player.tutorialProgress;
      if (!progress.gotWeapon && !progress.trainedAtArena && 
          progress.defeatedBoars === 0 && !progress.meditated) {
        // Force to chief house
        navigate('/game/village/chief-house');
      }
    }
  }, [player, navigate]);

  if (!player) return null;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Village Header */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent mb-3">
          Desa Daun Hijau
        </h1>
        <p className="text-gray-400 text-lg">
          Desa yang damai di kaki gunung, tempat petualanganmu dimulai
        </p>
      </div>

      {/* Tutorial Alert */}
      {!player.tutorialProgress.completed && (
        <div className="mb-6 bg-yellow-900/30 border-2 border-yellow-500/50 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 animate-pulse"></div>
            <div>
              <h3 className="font-bold text-yellow-300 mb-1">Tutorial Aktif</h3>
              <p className="text-sm text-yellow-200/80">
                Kunjungi Rumah Kepala Desa untuk memulai petualanganmu dan mempelajari dasar-dasar game!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Buildings Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {buildings.map((building) => {
          const Icon = building.icon;
          return (
            <div
              key={building.id}
              onClick={() => !building.locked && navigate(building.route)}
              className={`group bg-gradient-to-br from-purple-900/40 to-black/60 backdrop-blur-sm border-2 border-purple-500/30 rounded-xl overflow-hidden transition-all duration-300 ${
                building.locked
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:border-purple-400/50 hover:shadow-xl hover:shadow-purple-500/20 cursor-pointer transform hover:scale-[1.02]'
              }`}
            >
              {/* Image */}
              <div className="relative h-48 overflow-hidden">
                <ImageWithFallback
                  src={building.image}
                  alt={building.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                
                {/* Icon Badge */}
                <div className="absolute top-4 right-4 w-12 h-12 bg-purple-600/80 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-purple-400/50">
                  <Icon className="w-6 h-6 text-white" />
                </div>

                {building.locked && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                    <div className="text-center">
                      <div className="text-4xl mb-2">🔒</div>
                      <p className="text-sm text-gray-300 font-semibold">Terkunci</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-5">
                <h3 className="text-xl font-bold text-purple-200 mb-2 group-hover:text-purple-100 transition-colors">
                  {building.name}
                </h3>
                <p className="text-sm text-gray-400">
                  {building.description}
                </p>

                {/* Action Hint */}
                {!building.locked && (
                  <div className="mt-4 flex items-center gap-2 text-purple-400 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Klik untuk masuk</span>
                    <span>→</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Village Info */}
      <div className="mt-8 bg-black/40 backdrop-blur-sm border border-purple-500/30 rounded-xl p-6">
        <h3 className="text-lg font-bold text-purple-300 mb-3">Tentang Desa Daun Hijau</h3>
        <p className="text-gray-400 leading-relaxed">
          Desa Daun Hijau adalah tempat yang damai, dikelilingi oleh hutan lebat dan pegunungan yang menjulang. 
          Desa ini menjadi rumah bagi para petani, pandai besi, dan prajurit yang melindungi wilayah dari ancaman iblis. 
          Kepala desa yang bijaksana selalu siap memberikan arahan kepada petualang baru.
        </p>
      </div>
    </div>
  );
}
