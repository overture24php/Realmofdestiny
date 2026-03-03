import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useGame } from '../contexts/GameContext';
import { ArrowLeft, Sword, Shield as ShieldIcon, Wand2, Crosshair, CircleDot, Coins, Wrench } from 'lucide-react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';

const WEAPONS = [
  {
    id: 'wooden-dagger',
    name: 'Belati Kayu',
    type: 'dagger',
    material: 'wood',
    icon: CircleDot,
    stats: { physicalAtk: 5, accuracy: 5 },
    price: 0,
    questItem: true,
    description: 'Belati kayu sederhana. Ringan dan cepat.'
  },
  {
    id: 'wooden-sword',
    name: 'Pedang Kayu',
    type: 'sword',
    material: 'wood',
    icon: Sword,
    stats: { physicalAtk: 8, physicalDef: 2 },
    price: 0,
    questItem: true,
    description: 'Pedang kayu untuk latihan dasar.'
  },
  {
    id: 'wooden-staff',
    name: 'Tongkat Kayu',
    type: 'staff',
    material: 'wood',
    icon: Wand2,
    stats: { magicAtk: 10, mp: 10 },
    price: 0,
    questItem: true,
    description: 'Tongkat kayu yang membantu fokus sihir.'
  },
  {
    id: 'wooden-bow',
    name: 'Busur Kayu',
    type: 'bow',
    material: 'wood',
    icon: Crosshair,
    stats: { physicalAtk: 7, accuracy: 8 },
    price: 0,
    questItem: true,
    description: 'Busur kayu untuk serangan jarak jauh.'
  },
  {
    id: 'wooden-shield',
    name: 'Perisai Kayu',
    type: 'shield',
    material: 'wood',
    icon: ShieldIcon,
    stats: { physicalDef: 10, dodge: 3 },
    price: 0,
    questItem: true,
    description: 'Perisai kayu untuk bertahan.'
  },
  // Forged weapons
  {
    id: 'forged-dagger',
    name: 'Belati Tempa',
    type: 'dagger',
    material: 'forged',
    icon: CircleDot,
    stats: { physicalAtk: 12, accuracy: 10 },
    price: 50,
    questItem: false,
    description: 'Belati yang telah ditempa dengan baik.'
  },
  {
    id: 'forged-sword',
    name: 'Pedang Tempa',
    type: 'sword',
    material: 'forged',
    icon: Sword,
    stats: { physicalAtk: 18, physicalDef: 5 },
    price: 75,
    questItem: false,
    description: 'Pedang yang kuat dan kokoh.'
  },
  {
    id: 'forged-staff',
    name: 'Tongkat Tempa',
    type: 'staff',
    material: 'forged',
    icon: Wand2,
    stats: { magicAtk: 20, mp: 20 },
    price: 80,
    questItem: false,
    description: 'Tongkat dengan kristal yang memperkuat sihir.'
  },
  {
    id: 'forged-bow',
    name: 'Busur Tempa',
    type: 'bow',
    material: 'forged',
    icon: Crosshair,
    stats: { physicalAtk: 15, accuracy: 15 },
    price: 70,
    questItem: false,
    description: 'Busur dengan tali yang kuat.'
  },
  {
    id: 'forged-shield',
    name: 'Perisai Tempa',
    type: 'shield',
    material: 'forged',
    icon: ShieldIcon,
    stats: { physicalDef: 20, dodge: 8 },
    price: 60,
    questItem: false,
    description: 'Perisai besi yang sangat kokoh.'
  },
];

export default function BlacksmithPage() {
  const { player, updatePlayer, completeTutorialStep } = useGame();
  const navigate = useNavigate();
  const [selectedMenu, setSelectedMenu] = useState<'quest' | 'buy' | 'forge' | null>(null);
  const [selectedWeapon, setSelectedWeapon] = useState<string | null>(null);

  if (!player) return null;

  const isQuestActive = player.tutorialProgress && !player.tutorialProgress.gotWeapon;

  const handleGetQuestWeapon = async (weaponId: string) => {
    const weapon = WEAPONS.find(w => w.id === weaponId);
    if (!weapon) return;

    // Add weapon to inventory
    const newInventory = [...player.inventory, weapon];
    
    // Auto-equip to right hand if it's a weapon (not shield)
    const newEquipment = { ...player.equipment };
    if (weapon.type !== 'shield') {
      newEquipment.rightHand = weapon;
    } else {
      newEquipment.leftHand = weapon;
    }

    // Update stats based on weapon
    const newStats = { ...player.stats };
    Object.entries(weapon.stats).forEach(([stat, value]) => {
      if (stat in newStats) {
        (newStats as any)[stat] += value;
      }
    });

    await updatePlayer({
      inventory: newInventory,
      equipment: newEquipment,
      stats: newStats,
    });

    await completeTutorialStep('weapon');

    alert(`Kamu mendapatkan ${weapon.name}!`);
    navigate('/game/village/chief-house');
  };

  const handleBuyWeapon = async (weaponId: string) => {
    const weapon = WEAPONS.find(w => w.id === weaponId);
    if (!weapon) return;

    if (player.gold < weapon.price) {
      alert('Gold tidak cukup!');
      return;
    }

    const newInventory = [...player.inventory, weapon];
    const newGold = player.gold - weapon.price;

    await updatePlayer({
      inventory: newInventory,
      gold: newGold,
    });

    alert(`Kamu membeli ${weapon.name} seharga ${weapon.price} Gold!`);
    setSelectedWeapon(null);
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

      <div className="bg-gradient-to-br from-orange-900/40 to-black/60 backdrop-blur-sm border-2 border-orange-500/30 rounded-xl overflow-hidden">
        {/* Blacksmith Image */}
        <div className="relative h-64">
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1596441560548-2bc4b5e2c361?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxibGFja3NtaXRoJTIwd29ya3Nob3AlMjB0b29sc3xlbnwxfHx8fDE3NzI1Mjc4NTZ8MA&ixlib=rb-4.1.0&q=80&w=1080"
            alt="Blacksmith"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
          <div className="absolute bottom-4 left-6">
            <h1 className="text-3xl font-bold text-white mb-1">Pandai Besi Desa</h1>
            <p className="text-orange-200">Thorin Ironhammer</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {!selectedMenu ? (
            <>
              {/* Welcome Dialog */}
              <div className="bg-black/40 border border-orange-500/30 rounded-lg p-6 mb-6">
                <p className="text-gray-300 leading-relaxed mb-4">
                  "Selamat datang di bengkelku! Aku Thorin, pandai besi terbaik di desa ini."
                </p>
                {isQuestActive && (
                  <p className="text-yellow-300 leading-relaxed">
                    "Ah, Kepala Desa bilang kamu akan datang. Aku sudah siapkan beberapa senjata kayu untukmu. Pilih yang kamu suka!"
                  </p>
                )}
              </div>

              {/* Menu Options */}
              <div className="grid md:grid-cols-3 gap-4">
                {isQuestActive && (
                  <button
                    onClick={() => setSelectedMenu('quest')}
                    className="bg-gradient-to-br from-yellow-600/30 to-orange-600/30 border-2 border-yellow-500/50 rounded-xl p-6 hover:border-yellow-400/70 transition-all duration-300 transform hover:scale-105"
                  >
                    <Sword className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
                    <h3 className="font-bold text-yellow-200 mb-2">Misi: Ambil Senjata</h3>
                    <p className="text-sm text-yellow-300/80">Dapatkan senjata gratis dari quest</p>
                  </button>
                )}

                <button
                  onClick={() => setSelectedMenu('buy')}
                  className="bg-gradient-to-br from-orange-600/30 to-red-600/30 border-2 border-orange-500/50 rounded-xl p-6 hover:border-orange-400/70 transition-all duration-300 transform hover:scale-105"
                >
                  <Coins className="w-12 h-12 text-orange-400 mx-auto mb-3" />
                  <h3 className="font-bold text-orange-200 mb-2">Beli Senjata</h3>
                  <p className="text-sm text-orange-300/80">Lihat koleksi senjata yang dijual</p>
                </button>

                <button
                  onClick={() => setSelectedMenu('forge')}
                  className="bg-gradient-to-br from-purple-600/30 to-pink-600/30 border-2 border-purple-500/50 rounded-xl p-6 hover:border-purple-400/70 transition-all duration-300 transform hover:scale-105"
                >
                  <Wrench className="w-12 h-12 text-purple-400 mx-auto mb-3" />
                  <h3 className="font-bold text-purple-200 mb-2">Tempa Senjata Custom</h3>
                  <p className="text-sm text-purple-300/80">Coming Soon</p>
                </button>
              </div>

              <div className="mt-6 text-center">
                <button
                  onClick={() => navigate('/game/village')}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-200 font-semibold transition-colors"
                >
                  Keluar dari Toko
                </button>
              </div>
            </>
          ) : selectedMenu === 'forge' ? (
            <div className="text-center py-12">
              <Wrench className="w-24 h-24 text-purple-400 mx-auto mb-4 opacity-50" />
              <h3 className="text-2xl font-bold text-purple-300 mb-3">Coming Soon</h3>
              <p className="text-gray-400 mb-6">
                Fitur tempa senjata custom akan segera hadir!<br />
                Kamu akan bisa mencampur bahan dari monster untuk membuat senjata unik.
              </p>
              <button
                onClick={() => setSelectedMenu(null)}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg text-white font-semibold transition-colors"
              >
                Kembali
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-orange-300">
                  {selectedMenu === 'quest' ? 'Pilih Senjata Quest' : 'Beli Senjata'}
                </h2>
                <button
                  onClick={() => {
                    setSelectedMenu(null);
                    setSelectedWeapon(null);
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-200 transition-colors"
                >
                  Kembali
                </button>
              </div>

              {/* Weapons Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {WEAPONS.filter(w => selectedMenu === 'quest' ? w.questItem : !w.questItem).map((weapon) => {
                  const Icon = weapon.icon;
                  const canAfford = player.gold >= weapon.price;
                  
                  return (
                    <div
                      key={weapon.id}
                      className={`bg-black/40 border-2 ${
                        selectedWeapon === weapon.id ? 'border-yellow-500' : 'border-orange-500/30'
                      } rounded-xl p-4 hover:border-orange-400/50 transition-all cursor-pointer`}
                      onClick={() => setSelectedWeapon(weapon.id)}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-12 h-12 bg-orange-600/30 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Icon className="w-6 h-6 text-orange-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-orange-200">{weapon.name}</h3>
                          <p className="text-xs text-gray-400 capitalize">{weapon.material}</p>
                        </div>
                      </div>

                      <p className="text-sm text-gray-400 mb-3">{weapon.description}</p>

                      {/* Stats */}
                      <div className="space-y-1 mb-3">
                        {Object.entries(weapon.stats).map(([stat, value]) => (
                          <div key={stat} className="flex justify-between text-xs">
                            <span className="text-gray-400 capitalize">{stat.replace(/([A-Z])/g, ' $1').trim()}</span>
                            <span className="text-green-400 font-semibold">+{value}</span>
                          </div>
                        ))}
                      </div>

                      {/* Price/Action */}
                      {selectedMenu === 'quest' ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGetQuestWeapon(weapon.id);
                          }}
                          className="w-full py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-lg text-white font-semibold transition-colors"
                        >
                          Ambil (Gratis)
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBuyWeapon(weapon.id);
                          }}
                          disabled={!canAfford}
                          className={`w-full py-2 rounded-lg font-semibold transition-colors ${
                            canAfford
                              ? 'bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white'
                              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          {weapon.price} Gold
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
