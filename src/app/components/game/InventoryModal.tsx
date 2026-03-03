import { X } from 'lucide-react';
import { useGame } from '../../contexts/GameContext';

interface InventoryModalProps {
  onClose: () => void;
}

export default function InventoryModal({ onClose }: InventoryModalProps) {
  const { player } = useGame();

  if (!player) return null;

  const equipment = player.equipment;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-gradient-to-br from-purple-900/90 to-black/90 border-2 border-purple-500/50 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl shadow-purple-500/30">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-900 to-pink-900 border-b border-purple-500/50 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Tas & Equipment</h2>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Equipment Slots with Body */}
            <div>
              <h3 className="text-xl font-bold text-purple-300 mb-4">Equipment</h3>
              <div className="bg-black/40 rounded-xl p-6 border border-purple-500/30">
                {/* Body Layout */}
                <div className="relative">
                  {/* Character Silhouette (Simple representation) */}
                  <div className="relative mx-auto" style={{ width: '200px', height: '400px' }}>
                    {/* Helm Slot - Top */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2">
                      <EquipmentSlot
                        label="Helm"
                        item={equipment.helm}
                        position="top"
                      />
                    </div>

                    {/* Right Hand - Left side (from viewer) */}
                    <div className="absolute top-28 -left-20">
                      <EquipmentSlot
                        label="Tangan Kanan"
                        item={equipment.rightHand}
                        position="left"
                      />
                    </div>

                    {/* Left Hand - Right side (from viewer) */}
                    <div className="absolute top-28 -right-20">
                      <EquipmentSlot
                        label="Tangan Kiri"
                        item={equipment.leftHand}
                        position="right"
                      />
                    </div>

                    {/* Armor - Center */}
                    <div className="absolute top-32 left-1/2 -translate-x-1/2">
                      <EquipmentSlot
                        label="Armor"
                        item={equipment.armor}
                        position="center"
                      />
                    </div>

                    {/* Boots - Bottom */}
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
                      <EquipmentSlot
                        label="Sepatu"
                        item={equipment.boots}
                        position="bottom"
                      />
                    </div>

                    {/* Character Body Silhouette */}
                    <svg
                      viewBox="0 0 200 400"
                      className="absolute inset-0 pointer-events-none opacity-20"
                    >
                      {/* Head */}
                      <circle cx="100" cy="40" r="30" fill="white" />
                      
                      {/* Body */}
                      <rect x="70" y="70" width="60" height="100" rx="10" fill="white" />
                      
                      {/* Arms */}
                      <rect x="30" y="80" width="40" height="15" rx="7" fill="white" />
                      <rect x="130" y="80" width="40" height="15" rx="7" fill="white" />
                      <rect x="30" y="95" width="15" height="60" rx="7" fill="white" />
                      <rect x="155" y="95" width="15" height="60" rx="7" fill="white" />
                      
                      {/* Legs */}
                      <rect x="75" y="170" width="20" height="80" rx="10" fill="white" />
                      <rect x="105" y="170" width="20" height="80" rx="10" fill="white" />
                      
                      {/* Feet */}
                      <ellipse cx="85" cy="260" rx="15" ry="8" fill="white" />
                      <ellipse cx="115" cy="260" rx="15" ry="8" fill="white" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Inventory Grid */}
            <div>
              <h3 className="text-xl font-bold text-purple-300 mb-4">Inventory</h3>
              <div className="bg-black/40 rounded-xl p-6 border border-purple-500/30">
                {player.inventory.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-400">Inventory kosong</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Kumpulkan item dari quest dan battle
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-3">
                    {player.inventory.map((item: any, index: number) => (
                      <div
                        key={index}
                        className="aspect-square bg-purple-900/30 border border-purple-500/30 rounded-lg p-2 hover:border-purple-400/50 transition-colors cursor-pointer"
                      >
                        {/* Item display */}
                        <div className="text-xs text-purple-200 text-center">
                          {item.name}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface EquipmentSlotProps {
  label: string;
  item: any;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

function EquipmentSlot({ label, item, position }: EquipmentSlotProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`w-16 h-16 bg-gradient-to-br from-purple-900/50 to-black/50 border-2 ${
        item ? 'border-yellow-500/50' : 'border-purple-500/30'
      } rounded-lg flex items-center justify-center hover:border-purple-400/50 transition-colors cursor-pointer group relative`}>
        {item ? (
          <div className="text-center">
            <div className="text-yellow-400 text-xs font-bold">{item.name}</div>
          </div>
        ) : (
          <div className="text-4xl text-gray-600 group-hover:text-gray-500 transition-colors">+</div>
        )}
        
        {/* Tooltip */}
        <div className="absolute hidden group-hover:block bg-black/90 border border-purple-500/50 rounded-lg px-3 py-2 text-xs whitespace-nowrap z-10"
          style={{
            [position === 'top' ? 'bottom' : 'top']: '100%',
            marginTop: position === 'top' ? '' : '0.5rem',
            marginBottom: position === 'top' ? '0.5rem' : '',
          }}
        >
          {item ? item.name : `Slot ${label} Kosong`}
        </div>
      </div>
      <span className="text-xs text-purple-300 text-center">{label}</span>
    </div>
  );
}
