import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, X, Compass } from 'lucide-react';
import { useGame } from '../../contexts/GameContext';
import { getLocation, getNeighborId, DIR_META } from '../../data/worldMapData';
import { WalkingTransitionOverlay } from './WalkingTransitionOverlay';
import type { WorldLocation } from '../../data/worldMapData';

// ─── Derive current location ID from player data + route ─────────────────────

function useCurrentLocationId(): string {
  const { player } = useGame();
  const routePath   = useLocation().pathname;

  const match = routePath.match(/^\/game\/location\/(.+)$/);
  if (match) return match[1];

  if (routePath.startsWith('/game/village')) return 'desa-daun-hijau';

  const raw = player?.location || 'desa-daun-hijau';
  if (raw === 'greenleaf_village') return 'desa-daun-hijau';
  return raw;
}

// ─── Compass Direction Button ─────────────────────────────────────────────────

function DirButton({
  dir,
  destId,
  onTravel,
  disabled,
}: {
  dir:      string;
  destId:   string | undefined;
  onTravel: (destId: string) => void;
  disabled: boolean;
}) {
  const dest  = destId ? getLocation(destId) : undefined;
  const meta  = DIR_META[dir];
  const empty = !dest;

  return (
    <motion.button
      disabled={empty || disabled}
      onClick={() => dest && !disabled && onTravel(dest.id)}
      whileHover={empty || disabled ? {} : { scale: 1.06 }}
      whileTap={empty   || disabled ? {} : { scale: 0.94 }}
      className={`flex flex-col items-center justify-center gap-1 rounded-xl px-3 py-2.5 border transition-all
        ${empty || disabled
          ? 'opacity-25 cursor-not-allowed border-white/10 bg-white/5'
          : 'cursor-pointer border-white/20 bg-black/40 hover:bg-white/10'
        }`}
      style={dest && !disabled ? {
        borderColor: dest.borderColor + '60',
        boxShadow:   `0 0 12px ${dest.accentColor}20`,
      } : {}}
    >
      <span className="text-xl leading-none"
        style={{ color: dest && !disabled ? dest.accentColor : '#374151' }}>
        {meta.arrow}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-wider"
        style={{ color: dest && !disabled ? dest.accentColor + 'cc' : '#4b5563' }}>
        {meta.label}
      </span>
      <span className={`text-center leading-tight ${dest && !disabled ? 'text-white/80' : 'text-gray-600'}`}
        style={{ fontSize: 9 }}>
        {dest ? dest.shortName : '—'}
      </span>
    </motion.button>
  );
}

// ─── Main Floating Button ─────────────────────────────────────────────────────

const TRAVEL_DURATION = 10_000; // 10 seconds

export function MapFloatingButton() {
  const [open,        setOpen]        = useState(false);
  const [traveling,   setTraveling]   = useState(false);
  const [destination, setDestination] = useState<WorldLocation | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { updatePlayer } = useGame();
  const currentId = useCurrentLocationId();
  const current   = getLocation(currentId);

  // Close panel on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleTravel = async (destId: string) => {
    const dest = getLocation(destId);
    if (!dest || traveling) return;

    setDestination(dest);
    setTraveling(true);
    setOpen(false);

    // Save location to player data immediately
    await updatePlayer({ location: destId });

    // Walking animation: 10 seconds
    await new Promise(r => setTimeout(r, TRAVEL_DURATION));

    navigate(dest.route);

    // Small delay before clearing overlay so exit animation can play
    setTimeout(() => {
      setTraveling(false);
      setDestination(null);
    }, 400);
  };

  const dirs: Record<string, string | undefined> = {
    north: current ? getNeighborId(currentId, 'north') : undefined,
    south: current ? getNeighborId(currentId, 'south') : undefined,
    east:  current ? getNeighborId(currentId, 'east')  : undefined,
    west:  current ? getNeighborId(currentId, 'west')  : undefined,
  };

  const accent = current?.accentColor ?? '#a78bfa';

  return (
    <>
      {/* ── Walking Transition Overlay (fixed, full-screen) ── */}
      <WalkingTransitionOverlay isActive={traveling} destination={destination} />

      {/* ── Floating Panel + Button ── */}
      <div className="fixed bottom-6 right-6 z-50" ref={panelRef}>

        {/* Popup Panel */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 16 }}
              animate={{ opacity: 1, scale: 1,    y: 0  }}
              exit={{    opacity: 0, scale: 0.85,  y: 16 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="absolute bottom-[72px] right-0 w-64 rounded-2xl border overflow-hidden shadow-2xl"
              style={{
                background:   'rgba(5, 5, 15, 0.92)',
                backdropFilter: 'blur(20px)',
                borderColor:  accent + '40',
                boxShadow:    `0 8px 40px rgba(0,0,0,0.7), 0 0 30px ${accent}15`,
              }}
            >
              {/* Header */}
              <div className="px-4 pt-4 pb-3 border-b" style={{ borderColor: accent + '25' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4" style={{ color: accent }} />
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: accent }}>
                      Navigasi Dunia
                    </span>
                  </div>
                  <button onClick={() => setOpen(false)}
                    className="text-gray-500 hover:text-gray-300 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Current location badge */}
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                  style={{ background: accent + '15', borderColor: accent + '40' }}
                >
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" style={{ color: accent }} />
                  <div className="min-w-0">
                    <p className="text-[9px] text-gray-500 uppercase tracking-widest">Lokasi Saat Ini</p>
                    <p className="text-xs font-bold truncate" style={{ color: accent }}>
                      {current?.name ?? '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-2 px-4 py-2">
                <div className="h-px flex-1"
                  style={{ background: `linear-gradient(to right, transparent, ${accent}40)` }} />
                <span className="text-[9px] tracking-widest text-gray-600 uppercase">Arah Perjalanan</span>
                <div className="h-px flex-1"
                  style={{ background: `linear-gradient(to left, transparent, ${accent}40)` }} />
              </div>

              {/* Compass grid */}
              <div className="px-3 pb-4">
                <div className="grid grid-cols-3 gap-1.5">
                  {/* Row 1 */}
                  <div />
                  <DirButton dir="north" destId={dirs.north} onTravel={handleTravel} disabled={traveling} />
                  <div />

                  {/* Row 2 */}
                  <DirButton dir="west" destId={dirs.west} onTravel={handleTravel} disabled={traveling} />

                  {/* Center */}
                  <div
                    className="flex flex-col items-center justify-center rounded-xl border py-2"
                    style={{ borderColor: accent + '40', background: accent + '10' }}
                  >
                    <motion.span
                      className="text-lg"
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                    >
                      🧭
                    </motion.span>
                    <span className="text-[8px] text-gray-500 mt-0.5 uppercase tracking-wider">Di Sini</span>
                  </div>

                  <DirButton dir="east" destId={dirs.east} onTravel={handleTravel} disabled={traveling} />

                  {/* Row 3 */}
                  <div />
                  <DirButton dir="south" destId={dirs.south} onTravel={handleTravel} disabled={traveling} />
                  <div />
                </div>
              </div>

              {/* Travel time warning */}
              <div
                className="px-4 py-2 border-t"
                style={{ borderColor: accent + '20', background: accent + '08' }}
              >
                <p className="text-center text-gray-500" style={{ fontSize: 9 }}>
                  ⏱ Setiap perjalanan memakan waktu <span style={{ color: accent }}>10 detik</span>
                </p>
                <p className="text-center text-gray-600 mt-0.5" style={{ fontSize: 8 }}>
                  ✦ Klik arah untuk berpindah lokasi ✦
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Button */}
        <motion.button
          onClick={() => !traveling && setOpen(v => !v)}
          whileHover={traveling ? {} : { scale: 1.1 }}
          whileTap={traveling   ? {} : { scale: 0.93 }}
          className="relative w-14 h-14 rounded-2xl border-2 flex items-center justify-center shadow-2xl transition-colors"
          style={{
            background:  open
              ? `linear-gradient(135deg, ${accent}40, rgba(10,10,25,0.97))`
              : 'linear-gradient(135deg, rgba(20,10,40,0.95), rgba(5,5,15,0.97))',
            borderColor: open ? accent : accent + '60',
            boxShadow:   `0 4px 24px rgba(0,0,0,0.5), 0 0 20px ${accent}${open ? '50' : '25'}`,
            opacity:     traveling ? 0.5 : 1,
          }}
        >
          {/* Pulse ring when idle */}
          {!open && !traveling && (
            <motion.div
              className="absolute inset-0 rounded-2xl border-2"
              style={{ borderColor: accent + '50' }}
              animate={{ scale: [1, 1.35], opacity: [0.6, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
            />
          )}

          <Compass className="w-6 h-6"
            style={{ color: traveling ? '#6b7280' : open ? accent : '#c4b5fd' }} />
        </motion.button>

        {/* Label */}
        <motion.p
          className="text-center mt-1"
          style={{ fontSize: 9, color: traveling ? '#6b7280' : accent + 'cc', letterSpacing: '0.12em' }}
          animate={{ opacity: traveling ? [0.3, 0.6, 0.3] : [0.5, 1, 0.5] }}
          transition={{ duration: traveling ? 0.8 : 3, repeat: Infinity }}
        >
          {traveling ? '...' : 'PETA'}
        </motion.p>
      </div>
    </>
  );
}
