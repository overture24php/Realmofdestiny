import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { useGame } from '../contexts/GameContext';
import { Home, Hammer, Church, Swords, ChevronRight } from 'lucide-react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';

// ─── Floating Leaf ────────────────────────────────────────────────────────────

function FloatingLeaf({ index }: { index: number }) {
  const startX  = 5 + (index * 17.3) % 90;
  const delay   = (index * 1.7) % 5;
  const dur     = 6 + (index * 1.3) % 6;
  const size    = 10 + (index * 3) % 14;
  const colors  = ['#4ade80','#86efac','#a3e635','#bbf7d0','#d9f99d','#6ee7b7'];
  const color   = colors[index % colors.length];
  const rotate  = (index % 2 === 0) ? [0, 180, 360] : [0, -180, -360];

  return (
    <motion.div
      className="absolute pointer-events-none select-none"
      style={{ left: `${startX}%`, top: -30, fontSize: size, color }}
      initial={{ y: -30, x: 0, opacity: 0 }}
      animate={{
        y: ['0%', '120vh'],
        x: [0, 30 * (index % 2 === 0 ? 1 : -1), -20 * (index % 2 === 0 ? 1 : -1), 0],
        opacity: [0, 0.8, 0.8, 0],
        rotate,
      }}
      transition={{
        duration: dur,
        delay,
        repeat: Infinity,
        ease: 'linear',
        times: [0, 0.1, 0.9, 1],
      }}
    >
      {['🍃','🌿','🍀','🌱','🍂','🌾'][index % 6]}
    </motion.div>
  );
}

// ─── Firefly Particle ─────────────────────────────────────────────────────────

function Firefly({ index }: { index: number }) {
  const x = 10 + (index * 19.7) % 80;
  const y = 20 + (index * 13.3) % 60;
  const dur = 3 + (index % 3);

  return (
    <motion.div
      className="absolute w-1.5 h-1.5 rounded-full pointer-events-none"
      style={{ left: `${x}%`, top: `${y}%`, background: '#86efac', boxShadow: '0 0 8px 3px #4ade8080' }}
      animate={{
        x: [0, 20 * Math.sin(index), -15 * Math.cos(index), 0],
        y: [0, -20 * Math.cos(index), 15 * Math.sin(index), 0],
        opacity: [0, 1, 0.6, 0],
        scale: [0.5, 1.2, 0.8, 0.5],
      }}
      transition={{
        duration: dur,
        delay: index * 0.6,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
}

// ─── Animated vine separator ──────────────────────────────────────────────────

function VineSeparator() {
  return (
    <div className="flex items-center justify-center gap-3 my-1">
      {/* Left vine */}
      <svg width="120" height="20" viewBox="0 0 120 20" className="opacity-70">
        <path d="M0,10 C20,3 40,17 60,10 C80,3 100,17 120,10"
          fill="none" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="20" cy="6" r="3" fill="#4ade80" opacity="0.7"/>
        <circle cx="50" cy="14" r="2.5" fill="#86efac" opacity="0.6"/>
        <circle cx="80" cy="5" r="3" fill="#4ade80" opacity="0.7"/>
        <circle cx="100" cy="14" r="2" fill="#a3e635" opacity="0.5"/>
      </svg>

      {/* Center leaf cluster */}
      <span className="text-xl">🌿</span>

      {/* Right vine (mirrored) */}
      <svg width="120" height="20" viewBox="0 0 120 20" className="opacity-70 scale-x-[-1]">
        <path d="M0,10 C20,3 40,17 60,10 C80,3 100,17 120,10"
          fill="none" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="20" cy="6" r="3" fill="#4ade80" opacity="0.7"/>
        <circle cx="50" cy="14" r="2.5" fill="#86efac" opacity="0.6"/>
        <circle cx="80" cy="5" r="3" fill="#4ade80" opacity="0.7"/>
        <circle cx="100" cy="14" r="2" fill="#a3e635" opacity="0.5"/>
      </svg>
    </div>
  );
}

// ─── Corner Ornament ──────────────────────────────────────────────────────────

function CornerOrnament({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      width="64" height="64" viewBox="0 0 64 64"
      className="opacity-60"
      style={{ transform: flip ? 'scaleX(-1)' : 'none' }}
    >
      {/* Corner bracket */}
      <path d="M4,60 L4,4 L60,4" fill="none" stroke="#4ade80" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"/>
      {/* Inner decorative curve */}
      <path d="M12,56 L12,12 L56,12" fill="none" stroke="#86efac" strokeWidth="1"
        strokeLinecap="round" opacity="0.6"/>
      {/* Leaf at corner */}
      <circle cx="8" cy="8" r="5" fill="#14532d" stroke="#4ade80" strokeWidth="1.5"/>
      <path d="M8,8 C5,5 8,3 11,6 C8,9 5,9 8,8Z" fill="#4ade80" opacity="0.9"/>
      {/* Small dots */}
      <circle cx="22" cy="4" r="2" fill="#4ade80" opacity="0.7"/>
      <circle cx="4" cy="22" r="2" fill="#4ade80" opacity="0.7"/>
      <circle cx="32" cy="12" r="1.5" fill="#86efac" opacity="0.5"/>
      <circle cx="12" cy="32" r="1.5" fill="#86efac" opacity="0.5"/>
    </svg>
  );
}

// ─── Village Header Banner ───────────────────────────────────────────────────

function VillageBanner() {
  return (
    <div className="relative mb-10 overflow-hidden">
      {/* Glowing aura behind banner */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          className="w-[600px] h-32 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(ellipse, rgba(74,222,128,0.18) 0%, transparent 70%)' }}
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Banner container */}
      <div className="relative">
        {/* Top ornamental border */}
        <motion.div
          className="flex items-center justify-center gap-2 mb-3"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="h-px flex-1 max-w-48 bg-gradient-to-r from-transparent via-green-500/60 to-green-400" />
          <span className="text-green-400 text-xs tracking-[0.4em] font-semibold uppercase opacity-80">✦ Selamat Datang di ✦</span>
          <div className="h-px flex-1 max-w-48 bg-gradient-to-l from-transparent via-green-500/60 to-green-400" />
        </motion.div>

        {/* Main banner plate */}
        <motion.div
          className="relative mx-auto max-w-2xl"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          {/* Plate shadow */}
          <div className="absolute inset-0 rounded-2xl blur-xl"
            style={{ background: 'rgba(20,83,45,0.4)', transform: 'translateY(6px) scaleX(0.92)' }} />

          {/* Main plate */}
          <div
            className="relative rounded-2xl border-2 px-8 py-5 overflow-hidden"
            style={{
              background: 'linear-gradient(160deg, rgba(5,46,22,0.97) 0%, rgba(2,26,12,0.98) 40%, rgba(5,46,22,0.97) 100%)',
              borderColor: 'rgba(74,222,128,0.5)',
              boxShadow: '0 0 40px rgba(74,222,128,0.15), inset 0 1px 0 rgba(74,222,128,0.2), inset 0 -1px 0 rgba(74,222,128,0.1)',
            }}
          >
            {/* Wood grain texture lines */}
            {[15,35,55,75].map(y => (
              <div key={y} className="absolute inset-x-0 h-px opacity-[0.04]"
                style={{ top: `${y}%`, background: 'linear-gradient(90deg, transparent, #4ade80, transparent)' }} />
            ))}

            {/* Animated shimmer */}
            <motion.div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                background: 'linear-gradient(105deg, transparent 40%, rgba(74,222,128,0.3) 50%, transparent 60%)',
              }}
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear', repeatDelay: 3 }}
            />

            {/* Corner ornaments */}
            <div className="absolute top-2 left-2">
              <CornerOrnament />
            </div>
            <div className="absolute top-2 right-2">
              <CornerOrnament flip />
            </div>
            <div className="absolute bottom-2 left-2" style={{ transform: 'scaleY(-1)' }}>
              <CornerOrnament />
            </div>
            <div className="absolute bottom-2 right-2" style={{ transform: 'scale(-1)' }}>
              <CornerOrnament flip />
            </div>

            {/* Content */}
            <div className="relative text-center">
              {/* Subtitle */}
              <motion.p
                className="text-green-400/80 text-xs tracking-[0.5em] uppercase mb-2 font-medium"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                ⚔ &nbsp; Realm of Destiny &nbsp; ⚔
              </motion.p>

              {/* Village name */}
              <motion.h1
                className="relative inline-block"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                <span
                  className="text-5xl font-black tracking-wide"
                  style={{
                    display: 'inline-block',
                    backgroundImage: 'linear-gradient(180deg, #86efac 0%, #4ade80 35%, #16a34a 70%, #4ade80 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    textShadow: 'none',
                    filter: 'drop-shadow(0 0 20px rgba(74,222,128,0.6))',
                    letterSpacing: '0.06em',
                  }}
                >
                  Desa Daun Hijau
                </span>

                {/* Animated glow under title */}
                <motion.div
                  className="absolute -bottom-1 left-0 right-0 h-px"
                  style={{ background: 'linear-gradient(90deg, transparent, #4ade80, #86efac, #4ade80, transparent)' }}
                  animate={{ opacity: [0.4, 1, 0.4], scaleX: [0.8, 1, 0.8] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                />
              </motion.h1>

              {/* Vine separator */}
              <motion.div
                initial={{ opacity: 0, scaleX: 0.5 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <VineSeparator />
              </motion.div>

              {/* Tagline */}
              <motion.p
                className="text-emerald-300/70 text-sm tracking-widest font-light italic"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                🌿 &ldquo;Desa yang damai di kaki pegunungan, tempat petualanganmu dimulai&rdquo; 🌿
              </motion.p>

              {/* Status indicators */}
              <motion.div
                className="flex items-center justify-center gap-4 mt-3"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                {[
                  { icon: '☀️', label: 'Cuaca Cerah' },
                  { icon: '🛡️', label: 'Zona Aman' },
                  { icon: '🏡', label: '4 Fasilitas' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-1.5 text-xs text-green-400/60">
                    <span>{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Bottom ornamental border */}
        <motion.div
          className="flex items-center justify-center gap-2 mt-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="h-px flex-1 max-w-48 bg-gradient-to-r from-transparent via-green-500/40 to-green-400/60" />
          <span className="text-green-500/50 text-[10px] tracking-[0.6em] uppercase">✦ ✦ ✦</span>
          <div className="h-px flex-1 max-w-48 bg-gradient-to-l from-transparent via-green-500/40 to-green-400/60" />
        </motion.div>
      </div>
    </div>
  );
}

// ─── Building Card ────────────────────────────────────────────────────────────

const CARD_ACCENTS: Record<string, { from: string; to: string; glow: string; border: string }> = {
  'chief-house': { from: '#064e3b', to: '#14532d', glow: 'rgba(16,185,129,0.3)',  border: '#10b981' },
  'blacksmith':  { from: '#431407', to: '#7c2d12', glow: 'rgba(249,115,22,0.3)', border: '#f97316' },
  'temple':      { from: '#1e1b4b', to: '#312e81', glow: 'rgba(99,102,241,0.3)', border: '#818cf8' },
  'arena':       { from: '#4a0505', to: '#7f1d1d', glow: 'rgba(239,68,68,0.3)',  border: '#f87171' },
};

interface Building {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  image: string;
  route: string;
  locked: boolean;
  badge?: string;
}

function BuildingCard({ building, index }: { building: Building; index: number }) {
  const navigate = useNavigate();
  const Icon = building.icon;
  const accent = CARD_ACCENTS[building.id] || CARD_ACCENTS['chief-house'];

  return (
    <motion.div
      key={building.id}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 * index }}
      onClick={() => !building.locked && navigate(building.route)}
      className={`group relative rounded-2xl overflow-hidden border-2 transition-all duration-400 ${
        building.locked
          ? 'opacity-50 cursor-not-allowed'
          : 'cursor-pointer'
      }`}
      style={{
        borderColor: building.locked ? 'rgba(75,85,99,0.5)' : accent.border + '50',
        background: `linear-gradient(145deg, ${accent.from}ee, ${accent.to}dd)`,
        boxShadow: building.locked ? 'none' : `0 4px 24px ${accent.glow}`,
      }}
      whileHover={building.locked ? {} : { scale: 1.025, y: -3 }}
      whileTap={building.locked ? {} : { scale: 0.98 }}
    >
      {/* Hover glow overlay */}
      {!building.locked && (
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"
          style={{ boxShadow: `inset 0 0 40px ${accent.glow}` }}
        />
      )}

      {/* Image section */}
      <div className="relative h-52 overflow-hidden">
        <ImageWithFallback
          src={building.image}
          alt={building.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
        />

        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to top, ${accent.from}f0 0%, ${accent.from}80 40%, transparent 100%)`,
          }}
        />

        {/* Animated shimmer on hover */}
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none"
          style={{
            background: `linear-gradient(105deg, transparent 35%, ${accent.border}18 50%, transparent 65%)`,
          }}
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
        />

        {/* Icon badge */}
        <div
          className="absolute top-4 right-4 w-12 h-12 rounded-xl flex items-center justify-center border-2 backdrop-blur-sm shadow-lg"
          style={{
            background: accent.from + 'cc',
            borderColor: accent.border + '80',
            boxShadow: `0 0 16px ${accent.glow}`,
          }}
        >
          <Icon className="w-6 h-6" style={{ color: accent.border }} />
        </div>

        {/* Optional badge */}
        {building.badge && (
          <div className="absolute top-4 left-4">
            <span
              className="text-xs px-2.5 py-1 rounded-full font-bold border"
              style={{
                background: accent.from + 'cc',
                borderColor: accent.border + '60',
                color: accent.border,
              }}
            >
              {building.badge}
            </span>
          </div>
        )}

        {/* Locked overlay */}
        {building.locked && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="text-center">
              <div className="text-4xl mb-2">🔒</div>
              <p className="text-sm text-gray-300 font-semibold">Terkunci</p>
            </div>
          </div>
        )}

        {/* Building name on image bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3
            className="text-xl font-black tracking-wide"
            style={{
              backgroundImage: `linear-gradient(90deg, #fff, ${accent.border})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: `drop-shadow(0 0 12px ${accent.glow})`,
            }}
          >
            {building.name}
          </h3>
        </div>
      </div>

      {/* Info section */}
      <div className="p-4 pb-5">
        <p className="text-sm text-gray-400 leading-relaxed mb-4">{building.description}</p>

        {/* Enter button */}
        {!building.locked && (
          <div
            className="flex items-center justify-between px-4 py-2.5 rounded-xl border opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0"
            style={{
              background: accent.border + '15',
              borderColor: accent.border + '40',
            }}
          >
            <span className="text-sm font-semibold" style={{ color: accent.border }}>
              Masuk ke {building.name.split(' ')[0]}
            </span>
            <ChevronRight className="w-4 h-4" style={{ color: accent.border }} />
          </div>
        )}
      </div>

      {/* Bottom glow line */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: `linear-gradient(90deg, transparent, ${accent.border}, transparent)` }}
      />
    </motion.div>
  );
}

// ─── Main VillagePage ─────────────────────────────────────────────────────────

const BG_IMAGE = 'https://images.unsplash.com/photo-1737878609267-152480e98700?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYW50YXN5JTIwbWVkaWV2YWwlMjB2aWxsYWdlJTIwbmlnaHQlMjBsYW50ZXJuJTIwZm9nZ3klMjBlbmNoYW50ZWR8ZW58MXx8fHwxNzcyNjI0MTUyfDA&ixlib=rb-4.1.0&q=80&w=1080';

export default function VillagePage() {
  const { player, updatePlayer } = useGame();
  const navigate   = useNavigate();
  // Sync location to village when player is here
  const syncedRef = useRef(false);
  useEffect(() => {
    if (player && !syncedRef.current) {
      syncedRef.current = true;
      const loc = player.location;
      const isVillageLoc = loc === 'desa-daun-hijau' || loc === 'greenleaf_village' || !loc;
      if (!isVillageLoc) {
        // Only update if coming from a field
      } else if (loc !== 'desa-daun-hijau') {
        updatePlayer({ location: 'desa-daun-hijau' });
      }
    }
  }, [player, updatePlayer]);

  const buildings: Building[] = [
    {
      id: 'chief-house',
      name: 'Rumah Kepala Desa',
      description: 'Kediaman Kepala Desa yang bijaksana. Dapatkan arahan, misi, dan mulai petualanganmu di sini.',
      icon: Home,
      image: 'https://images.unsplash.com/photo-1769675796309-144ee7cbf51f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3p5JTIwbWVkaWV2YWwlMjB2aWxsYWdlJTIwY2hpZWYlMjBob3VzZSUyMGdyZWVuJTIwaXZ5JTIwY290dGFnZXxlbnwxfHx8fDE3NzI2MjQxNTJ8MA&ixlib=rb-4.1.0&q=80&w=1080',
      route: '/game/village/chief-house',
      locked: false,
      badge: '📜 Tutorial',
    },
    {
      id: 'blacksmith',
      name: 'Pandai Besi Desa',
      description: 'Tempa dan beli perlengkapan perang. Senjata terbaik lahir dari tangan sang pandai besi.',
      icon: Hammer,
      image: 'https://images.unsplash.com/photo-1596441560548-2bc4b5e2c361?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxibGFja3NtaXRoJTIwd29ya3Nob3AlMjB0b29sc3xlbnwxfHx8fDE3NzI1Mjc4NTZ8MA&ixlib=rb-4.1.0&q=80&w=1080',
      route: '/game/village/blacksmith',
      locked: false,
    },
    {
      id: 'temple',
      name: 'Kuil Desa',
      description: 'Meditasi untuk memulihkan dan meningkatkan HP/MP. Temukan kedamaian batin di sini.',
      icon: Church,
      image: 'https://images.unsplash.com/photo-1644413239414-33a8bf405db9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxqYXBhbmVzZSUyMHRlbXBsZSUyMHNocmluZXxlbnwxfHx8fDE3NzI1Mjc4NTJ8MA&ixlib=rb-4.1.0&q=80&w=1080',
      route: '/game/village/temple',
      locked: false,
    },
    {
      id: 'arena',
      name: 'Arena Latihan Pasukan Penjaga',
      description: 'Berlatih melawan boneka kayu dan pasukan penjaga. Asah kemampuan tempurmu di sini.',
      icon: Swords,
      image: 'https://images.unsplash.com/photo-1727986760616-0d8f65a6ab92?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cmFpbmluZyUyMGFyZW5hJTIwbWVkaWV2YWx8ZW58MXx8fHwxNzcyNTI3ODUzfDA&ixlib=rb-4.1.0&q=80&w=1080',
      route: '/game/village/arena',
      locked: false,
    },
  ];

  // Force player to chief house if tutorial not started
  useEffect(() => {
    if (player && player.tutorialProgress && !player.tutorialProgress.completed) {
      const p = player.tutorialProgress;
      if (!p.gotWeapon && !p.trainedAtArena && p.defeatedBoars === 0 && !p.meditated) {
        navigate('/game/village/chief-house');
      }
    }
  }, [player, navigate]);

  if (!player) return null;

  return (
    <div className="relative max-w-5xl mx-auto">

      {/* ── Full-page background illustration ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Village background image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${BG_IMAGE})` }}
        />
        {/* Multi-layer overlay for readability while preserving atmosphere */}
        <div className="absolute inset-0" style={{ background: 'rgba(2,14,5,0.62)' }} />
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at 50% 40%, rgba(20,83,45,0.25) 0%, transparent 65%)',
        }} />
        {/* Bottom gradient for clean content transition */}
        <div className="absolute bottom-0 left-0 right-0 h-40"
          style={{ background: 'linear-gradient(to bottom, transparent, rgba(2,14,5,0.8))' }} />
        {/* Top vignette */}
        <div className="absolute top-0 left-0 right-0 h-24"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)' }} />
        {/* Side vignettes */}
        <div className="absolute inset-y-0 left-0 w-24"
          style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.4), transparent)' }} />
        <div className="absolute inset-y-0 right-0 w-24"
          style={{ background: 'linear-gradient(to left, rgba(0,0,0,0.4), transparent)' }} />
      </div>

      {/* ── Floating ambient particles ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {Array.from({ length: 12 }).map((_, i) => (
          <FloatingLeaf key={i} index={i} />
        ))}
        {Array.from({ length: 10 }).map((_, i) => (
          <Firefly key={i} index={i} />
        ))}
      </div>

      {/* ── Content (above background) ── */}
      <div className="relative z-10">

        {/* ── Fantasy Banner Header ── */}
        <div className="pt-4 pb-2">
          <VillageBanner />
        </div>

        {/* ── Tutorial Alert ── */}
        {!player.tutorialProgress.completed && (
          <motion.div
            className="mb-7 rounded-xl p-4 border-2"
            style={{
              background: 'rgba(120,53,15,0.35)',
              borderColor: 'rgba(251,191,36,0.5)',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 0 24px rgba(251,191,36,0.1)',
            }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <div className="flex items-start gap-3">
              <motion.div
                className="w-3 h-3 bg-yellow-400 rounded-full mt-1.5 flex-shrink-0"
                animate={{ opacity: [1, 0.2, 1], scale: [1, 1.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <div>
                <h3 className="font-bold text-yellow-300 mb-1 flex items-center gap-2">
                  📜 Tutorial Aktif
                </h3>
                <p className="text-sm text-yellow-200/80">
                  Kunjungi <span className="text-yellow-300 font-semibold">Rumah Kepala Desa</span> untuk memulai petualanganmu dan mempelajari dasar-dasar dunia Realm of Destiny!
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Buildings Grid ── */}
        <div className="grid md:grid-cols-2 gap-6">
          {buildings.map((building, i) => (
            <BuildingCard key={building.id} building={building} index={i} />
          ))}
        </div>

        {/* ── Village lore footer ── */}
        <motion.div
          className="mt-8 rounded-2xl p-6 border"
          style={{
            background: 'rgba(5,46,22,0.5)',
            borderColor: 'rgba(74,222,128,0.2)',
            backdropFilter: 'blur(12px)',
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <div className="flex items-start gap-4">
            <div className="text-4xl flex-shrink-0">📜</div>
            <div>
              <h3 className="font-bold text-emerald-300 mb-2 flex items-center gap-2">
                <span>Tentang Desa Daun Hijau</span>
                <VineSeparator />
              </h3>
              <p className="text-gray-300/80 text-sm leading-relaxed">
                Desa Daun Hijau berdiri di kaki <span className="text-emerald-400">Pegunungan Hijau Abadi</span>, dikelilingi hutan lebat yang selalu segar sepanjang tahun. 
                Penduduknya hidup tenteram — para petani, pandai besi, dan ksatria penjaga berdampingan. 
                Namun kedamaian ini mulai terusik sejak kabar kebangkitan <span className="text-red-400">Raja Iblis</span> tersebar. 
                Kepala Desa yang bijaksana kini mencari jiwa-jiwa pemberani untuk melindungi tanah ini.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Bottom padding */}
        <div className="h-12" />
      </div>
    </div>
  );
}