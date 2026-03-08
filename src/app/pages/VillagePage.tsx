import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { useGame } from '../contexts/GameContext';
import {
  Home, Hammer, Church, Swords, HeartPulse, ShoppingCart,
  Leaf, Users, Waves, Building2, Heart, ChevronDown, ChevronRight,
} from 'lucide-react';
import { calcDerived } from '../data/statsCalc';

// ─── Floating Leaf ────────────────────────────────────────────────────────────
function FloatingLeaf({ index }: { index: number }) {
  const startX = 5 + (index * 17.3) % 90;
  const delay  = (index * 1.7) % 5;
  const dur    = 6 + (index * 1.3) % 6;
  const size   = 10 + (index * 3) % 14;
  const colors = ['#4ade80','#86efac','#a3e635','#bbf7d0','#d9f99d','#6ee7b7'];
  const color  = colors[index % colors.length];
  const rotate = (index % 2 === 0) ? [0, 180, 360] : [0, -180, -360];
  return (
    <motion.div
      className="absolute pointer-events-none select-none"
      style={{ left: `${startX}%`, top: -30, fontSize: size, color }}
      initial={{ y: -30, x: 0, opacity: 0 }}
      animate={{ y: ['0%','120vh'], x: [0, 30*(index%2===0?1:-1), -20*(index%2===0?1:-1), 0], opacity: [0,0.8,0.8,0], rotate }}
      transition={{ duration: dur, delay, repeat: Infinity, ease: 'linear', times: [0,0.1,0.9,1] }}
    >
      {['🍃','🌿','🍀','🌱','🍂','🌾'][index % 6]}
    </motion.div>
  );
}

// ─── Firefly ──────────────────────────────────────────────────────────────────
function Firefly({ index }: { index: number }) {
  const x   = 10 + (index * 19.7) % 80;
  const y   = 20 + (index * 13.3) % 60;
  const dur = 3 + (index % 3);
  return (
    <motion.div
      className="absolute w-1.5 h-1.5 rounded-full pointer-events-none"
      style={{ left: `${x}%`, top: `${y}%`, background: '#86efac', boxShadow: '0 0 8px 3px #4ade8080' }}
      animate={{ x: [0, 20*Math.sin(index), -15*Math.cos(index), 0], y: [0, -20*Math.cos(index), 15*Math.sin(index), 0], opacity: [0,1,0.6,0], scale: [0.5,1.2,0.8,0.5] }}
      transition={{ duration: dur, delay: index*0.6, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

// ─── Accent lookup ────────────────────────────────────────────────────────────
const ACCENTS: Record<string, { border: string; glow: string; from: string }> = {
  'chief-house': { border: '#10b981', glow: 'rgba(16,185,129,0.35)',  from: '#064e3b' },
  'blacksmith':  { border: '#f97316', glow: 'rgba(249,115,22,0.35)',  from: '#431407' },
  'temple':      { border: '#818cf8', glow: 'rgba(99,102,241,0.35)',  from: '#1e1b4b' },
  'arena':       { border: '#f87171', glow: 'rgba(239,68,68,0.35)',   from: '#4a0505' },
  'clinic':      { border: '#4ade80', glow: 'rgba(74,222,128,0.35)',  from: '#052e16' },
  'market':      { border: '#fbbf24', glow: 'rgba(251,191,36,0.35)',  from: '#3b1f00' },
  'farmland':    { border: '#86efac', glow: 'rgba(134,239,172,0.35)', from: '#0a2010' },
  'guild':       { border: '#fb7185', glow: 'rgba(251,113,133,0.35)', from: '#4a0515' },
  'river':       { border: '#22d3ee', glow: 'rgba(34,211,238,0.35)',  from: '#0c1e3b' },
  'town-hall':   { border: '#c084fc', glow: 'rgba(192,132,252,0.35)', from: '#1a0a2e' },
};

// ─── Building data type ───────────────────────────────────────────────────────
interface Building {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  image: string;
  route: string;
  locked: boolean;
  badge?: string;
  tags?: string[];
  onClickOverride?: () => void;
}

// ─── Accordion Row ────────────────────────────────────────────────────────────
function AccordionRow({
  building, index, isOpen, onToggle,
}: {
  building: Building;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const navigate = useNavigate();
  const accent   = ACCENTS[building.id] ?? ACCENTS['chief-house'];
  const Icon     = building.icon;

  const handleEnter = () => {
    if (building.locked) return;
    if (building.onClickOverride) { building.onClickOverride(); return; }
    navigate(building.route);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      className="overflow-hidden"
      style={{ borderBottom: '1px solid rgba(74,222,128,0.1)' }}
    >
      {/* ── Row bar ── */}
      <motion.div
        onClick={onToggle}
        whileHover={{ backgroundColor: accent.border + '10' }}
        whileTap={{ scale: 0.995 }}
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none relative"
        style={{
          background: isOpen
            ? `linear-gradient(90deg, ${accent.from}cc, rgba(5,15,5,0.8))`
            : 'transparent',
          transition: 'background 0.3s',
        }}
      >
        {/* Left accent bar */}
        <motion.div
          className="absolute left-0 top-0 bottom-0 w-0.5 rounded-r"
          style={{ background: accent.border }}
          animate={{ opacity: isOpen ? 1 : 0, scaleY: isOpen ? 1 : 0 }}
          transition={{ duration: 0.25 }}
        />

        {/* Index number */}
        <span style={{
          fontFamily: 'serif', fontWeight: 900, fontSize: '0.65rem',
          color: isOpen ? accent.border : 'rgba(74,222,128,0.3)',
          minWidth: 18, textAlign: 'right',
          transition: 'color 0.25s',
        }}>
          {String(index + 1).padStart(2, '0')}
        </span>

        {/* Bullet dot */}
        <motion.div
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: accent.border }}
          animate={{
            boxShadow: isOpen ? `0 0 8px 3px ${accent.glow}` : '0 0 0px 0px transparent',
            scale: isOpen ? 1.3 : 1,
          }}
          transition={{ duration: 0.3 }}
        />

        {/* Icon */}
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: isOpen ? accent.border + '22' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${isOpen ? accent.border + '50' : 'rgba(74,222,128,0.12)'}`,
            transition: 'all 0.3s',
          }}
        >
          <Icon style={{ width: 14, height: 14, color: isOpen ? accent.border : '#6b7280', transition: 'color 0.3s' }} />
        </div>

        {/* Name */}
        <span style={{
          fontFamily: 'serif', fontWeight: 800,
          color: isOpen ? '#f3f4f6' : '#9ca3af',
          fontSize: '0.88rem', flex: 1, letterSpacing: '0.02em',
          transition: 'color 0.25s',
        }}>
          {building.name}
        </span>

        {/* Badge */}
        {building.badge && (
          <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 hidden sm:inline-block" style={{
            background: accent.border + '18',
            border: `1px solid ${accent.border}40`,
            color: accent.border,
          }}>
            {building.badge}
          </span>
        )}

        {/* Arrow */}
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="flex-shrink-0"
        >
          <ChevronDown style={{ width: 14, height: 14, color: isOpen ? accent.border : '#4b5563' }} />
        </motion.div>
      </motion.div>

      {/* ── Expanded panel ── */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-4 pb-5 pt-1">
              {/* Illustration */}
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.35, delay: 0.05 }}
                className="relative rounded-2xl overflow-hidden mb-4"
                style={{
                  border: `1.5px solid ${accent.border}40`,
                  boxShadow: `0 4px 24px ${accent.glow}`,
                }}
              >
                <img
                  src={building.image}
                  alt={building.name}
                  className="w-full object-cover"
                  style={{ height: 200 }}
                />
                <div className="absolute inset-0" style={{
                  background: `linear-gradient(to top, ${accent.from}f0 0%, ${accent.from}60 40%, transparent 100%)`,
                }} />
                {/* Shimmer */}
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: `linear-gradient(105deg, transparent 35%, ${accent.border}15 50%, transparent 65%)` }}
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'linear', repeatDelay: 2 }}
                />
                {/* Bottom label */}
                <div className="absolute bottom-0 left-0 right-0 p-3 flex items-end justify-between">
                  <p style={{
                    fontFamily: 'serif', fontWeight: 900,
                    backgroundImage: `linear-gradient(90deg, #fff, ${accent.border})`,
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    filter: `drop-shadow(0 0 10px ${accent.glow})`,
                    fontSize: '1.05rem', letterSpacing: '0.04em',
                  }}>
                    {building.name}
                  </p>
                  {building.badge && (
                    <span className="text-[10px] px-2 py-1 rounded-full" style={{
                      background: accent.from + 'dd',
                      border: `1px solid ${accent.border}60`,
                      color: accent.border,
                      fontWeight: 700,
                      backdropFilter: 'blur(4px)',
                    }}>
                      {building.badge}
                    </span>
                  )}
                </div>
              </motion.div>

              {/* Description + Tags */}
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="mb-4"
              >
                <p style={{ color: '#9ca3af', fontSize: '0.78rem', lineHeight: 1.65 }}>
                  {building.description}
                </p>
                {building.tags && building.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {building.tags.map(tag => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full" style={{
                        background: 'rgba(74,222,128,0.07)',
                        border: '1px solid rgba(74,222,128,0.15)',
                        color: '#4ade8099',
                      }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>

              {/* Enter Button */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.15 }}
              >
                {building.locked ? (
                  <div className="flex items-center justify-center gap-2 py-3 rounded-xl" style={{
                    background: 'rgba(55,65,81,0.4)',
                    border: '1px solid rgba(75,85,99,0.4)',
                  }}>
                    <span style={{ color: '#6b7280', fontSize: '0.82rem' }}>🔒 Terkunci</span>
                  </div>
                ) : (
                  <motion.button
                    onClick={handleEnter}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    className="w-full py-3 rounded-xl flex items-center justify-center gap-2"
                    style={{
                      background: `linear-gradient(135deg, ${accent.from}, ${accent.border}55)`,
                      border: `1.5px solid ${accent.border}80`,
                      cursor: 'pointer',
                      boxShadow: `0 0 20px ${accent.glow}`,
                    }}
                  >
                    <span style={{
                      fontFamily: 'serif', fontWeight: 900,
                      color: accent.border, fontSize: '0.88rem',
                      letterSpacing: '0.05em',
                    }}>
                      ✦ Masuki {building.name.split(' ')[0]}
                    </span>
                    <ChevronRight style={{ width: 14, height: 14, color: accent.border }} />
                  </motion.button>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Background image ─────────────────────────────────────────────────────────
const BG_IMAGE = 'https://images.unsplash.com/photo-1737878609267-152480e98700?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYW50YXN5JTIwbWVkaWV2YWwlMjB2aWxsYWdlJTIwbmlnaHQlMjBsYW50ZXJuJTIwZm9nZ3klMjBlbmNoYW50ZWR8ZW58MXx8fHwxNzcyNjI0MTUyfDA&ixlib=rb-4.1.0&q=80&w=1080';

// ─── Main VillagePage ─────────────────────────────────────────────────────────
export default function VillagePage() {
  const { player, updatePlayer } = useGame();
  const navigate = useNavigate();
  const [showHealthyDialog, setShowHealthyDialog] = useState(false);
  const [openId, setOpenId]   = useState<string | null>(null);
  const syncedRef = useRef(false);

  useEffect(() => {
    if (player && !syncedRef.current) {
      syncedRef.current = true;
      const loc = player.location;
      const isVillageLoc = loc === 'desa-daun-hijau' || loc === 'greenleaf_village' || !loc;
      if (isVillageLoc && loc !== 'desa-daun-hijau') updatePlayer({ location: 'desa-daun-hijau' });
    }
  }, [player, updatePlayer]);

  useEffect(() => {
    if (player && player.tutorialProgress && !player.tutorialProgress.completed) {
      const p = player.tutorialProgress;
      const hasNoProgress = !p.gotWeapon && (p.defeatedDummies ?? 0) === 0 && (p.defeatedGuards ?? 0) === 0 && !p.meditated;
      if (hasNoProgress) navigate('/game/village/chief-house');
    }
  }, [player, navigate]);

  if (!player) return null;

  const derived  = calcDerived(player);
  const curHp    = player.stats.hp;
  const hpPct    = Math.max(0, Math.min(100, (curHp / Math.max(curHp, 100)) * 100));
  const isDead   = curHp < 1;
  const needsHeal = curHp < 100;
  const hpLow    = curHp > 0 && curHp < 30;

  const handleClinicClick = () => {
    navigate('/game/village/clinic');
  };

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
      tags: ['NPC', 'Misi', 'Pemula'],
    },
    {
      id: 'blacksmith',
      name: 'Pandai Besi Desa',
      description: 'Tempa dan beli perlengkapan perang. Senjata terbaik lahir dari tangan sang pandai besi Thorin Ironhammer.',
      icon: Hammer,
      image: 'https://images.unsplash.com/photo-1596441560548-2bc4b5e2c361?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxibGFja3NtaXRoJTIwd29ya3Nob3AlMjB0b29sc3xlbnwxfHx8fDE3NzI1Mjc4NTZ8MA&ixlib=rb-4.1.0&q=80&w=1080',
      route: '/game/village/blacksmith',
      locked: false,
      tags: ['Beli', 'Jual', 'Tempa'],
    },
    {
      id: 'temple',
      name: 'Kuil Desa',
      description: 'Meditasi untuk memulihkan dan meningkatkan HP/MP. Temukan kedamaian batin dan hubungan dengan kekuatan sihir.',
      icon: Church,
      image: 'https://images.unsplash.com/photo-1644413239414-33a8bf405db9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxqYXBhbmVzZSUyMHRlbXBsZSUyMHNocmluZXxlbnwxfHx8fDE3NzI1Mjc4NTJ8MA&ixlib=rb-4.1.0&q=80&w=1080',
      route: '/game/village/temple',
      locked: false,
      tags: ['Meditasi', 'HP+', 'MP+'],
    },
    {
      id: 'arena',
      name: 'Arena Latihan',
      description: 'Berlatih melawan boneka kayu dan pasukan penjaga. Asah kemampuan tempurmu dan naikkan level dengan cepat.',
      icon: Swords,
      image: 'https://images.unsplash.com/photo-1727986760616-0d8f65a6ab92?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cmFpbmluZyUyMGFyZW5hJTIwbWVkaWV2YWx8ZW58MXx8fHwxNzcyNTI3ODUzfDA&ixlib=rb-4.1.0&q=80&w=1080',
      route: '/game/village/arena',
      locked: false,
      tags: ['Battle', 'EXP', 'Latihan'],
    },
    {
      id: 'clinic',
      name: 'Klinik Penyembuhan',
      description: 'Tempat penyembuh desa merawat yang terluka. Pulihkan HP, Stamina, dan Mana di sini.',
      icon: HeartPulse,
      image: 'https://images.unsplash.com/photo-1576020363294-ab5dca00b6f8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZWRpZXZhbCUyMGFwb3RoZWNhcnklMjBoZWFsZXIlMjBoZXJiYWxpc3QlMjBzaG9wJTIwZmFudGFzeXxlbnwxfHx8fDE3NzI2OTc2NzN8MA&ixlib=rb-4.1.0&q=80&w=1080',
      route: '/game/village/clinic',
      locked: false,
      badge: isDead ? '🏥 Diperlukan!' : hpLow ? '⚠️ HP Kritis' : needsHeal ? '💊 HP Kurang' : undefined,
      tags: ['Heal', 'HP', 'Penyembuh'],
      onClickOverride: handleClinicClick,
    },
    {
      id: 'market',
      name: 'Pasar Desa',
      description: 'Beli alat, bibit, pupuk, alat pancing, barang antik, dan jual hasil panen & ikanmu di 4 stand berbeda.',
      icon: ShoppingCart,
      image: 'https://images.unsplash.com/photo-1651037049239-31cacb33da6b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZWRpZXZhbCUyMGZhbnRhc3klMjBtYXJrZXQlMjBzdGFsbHMlMjB2aWxsYWdlfGVufDF8fHx8MTc3MjkwNzUyMnww&ixlib=rb-4.1.0&q=80&w=1080',
      route: '/game/village/market',
      locked: false,
      badge: '🏪 4 Stand',
      tags: ['Beli', 'Jual', 'Perdagangan'],
    },
    {
      id: 'farmland',
      name: 'Lahan Perkebunan',
      description: 'Sewa petak lahan untuk bercocok tanam. Tanam bibit dan panen hasilnya untuk dijual di pasar desa.',
      icon: Leaf,
      image: 'https://images.unsplash.com/photo-1564046105882-bee6cd1271d7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZWRpZXZhbCUyMGZhcm1sYW5kJTIwYWdyaWN1bHR1cmUlMjBmaWVsZCUyMGNyb3BzJTIwdmlsbGFnZXxlbnwxfHx8fDE3NzI5MDc1MjR8MA&ixlib=rb-4.1.0&q=80&w=1080',
      route: '/game/village/farmland',
      locked: false,
      badge: '🌱 Coming Soon',
      tags: ['Bertani', 'Panen', 'Lahan'],
    },
    {
      id: 'guild',
      name: 'Guild Petualang',
      description: 'Rekrut party, sewa pengawal, dan ambil misi guild untuk mendapat EXP dan Gold berlimpah.',
      icon: Users,
      image: 'https://images.unsplash.com/photo-1701848055182-295e0f1e5256?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZWRpZXZhbCUyMGZhbnRhc3klMjBndWlsZCUyMGFkdmVudHVyZXIlMjBoYWxsJTIwdGF2ZXJufGVufDF8fHx8MTc3MjkwNzUyNXww&ixlib=rb-4.1.0&q=80&w=1080',
      route: '/game/village/guild',
      locked: false,
      badge: '⚔️ Coming Soon',
      tags: ['Party', 'Misi', 'Guild'],
    },
    {
      id: 'river',
      name: 'Sungai Dekat Desa',
      description: 'Sungai jernih mengalir dari pegunungan. Mancing, ambil air, dan cari tanaman herbal di tepiannya.',
      icon: Waves,
      image: 'https://images.unsplash.com/photo-1712493142073-f642a57cc5b1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwZWFjZWZ1bCUyMHJpdmVyJTIwc3RyZWFtJTIwZm9yZXN0JTIwbWVkaWV2YWwlMjBmYW50YXN5fGVufDF8fHx8MTc3MjkwNzUyNXww&ixlib=rb-4.1.0&q=80&w=1080',
      route: '/game/village/river',
      locked: false,
      badge: '🌊 Coming Soon',
      tags: ['Mancing', 'Alam', 'Eksplorasi'],
    },
    {
      id: 'town-hall',
      name: 'Balai Desa',
      description: 'Pilih jalur karir dan role hidupmu — Pedagang, Petualang, atau Penjaga Desa.',
      icon: Building2,
      image: 'https://images.unsplash.com/photo-1772465971257-01b79cae5030?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZWRpZXZhbCUyMHZpbGxhZ2UlMjBoYWxsJTIwY291bmNpbCUyMG1eXRpbmclMjBoYWxsJTIwc3RvbmV8ZW58MXx8fHwxNzcyOTA3NTI2fDA&ixlib=rb-4.1.0&q=80&w=1080',
      route: '/game/village/town-hall',
      locked: false,
      badge: '👑 Pilih Karir',
      tags: ['Karir', 'Role', 'Bonus'],
    },
  ];

  const toggleRow = (id: string) => setOpenId(prev => prev === id ? null : id);

  return (
    <div className="relative max-w-2xl mx-auto">

      {/* ── Fixed background ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${BG_IMAGE})` }} />
        <div className="absolute inset-0" style={{ background: 'rgba(2,14,5,0.72)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(20,83,45,0.2) 0%, transparent 65%)' }} />
        <div className="absolute bottom-0 left-0 right-0 h-40" style={{ background: 'linear-gradient(to bottom, transparent, rgba(2,14,5,0.8))' }} />
        <div className="absolute top-0 left-0 right-0 h-24" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)' }} />
      </div>

      {/* ── Particles ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {Array.from({ length: 10 }).map((_, i) => <FloatingLeaf key={i} index={i} />)}
        {Array.from({ length: 8 }).map((_, i) => <Firefly key={i} index={i} />)}
      </div>

      {/* ── Page content ── */}
      <div className="relative z-10 pt-4 pb-16">

        {/* ── HP Critical Banner ── */}
        <AnimatePresence>
          {(isDead || hpLow) && (
            <motion.div
              initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="mb-4 mx-1 p-3 rounded-xl flex items-center gap-3 cursor-pointer"
              style={{ background: isDead ? 'rgba(127,29,29,0.5)' : 'rgba(120,53,15,0.4)', border: `1px solid ${isDead ? 'rgba(239,68,68,0.6)' : 'rgba(251,191,36,0.5)'}` }}
              onClick={handleClinicClick}
              whileHover={{ scale: 1.01 }}
            >
              <motion.span className="text-2xl" animate={{ scale: [1,1.2,1] }} transition={{ duration: 1.5, repeat: Infinity }}>
                {isDead ? '💀' : '⚠️'}
              </motion.span>
              <div className="flex-1">
                <p style={{ fontFamily: 'serif', fontWeight: 700, color: isDead ? '#f87171' : '#fbbf24', fontSize: '0.85rem' }}>
                  {isDead ? 'HP Habis — Kamu harus ke Klinik!' : `HP Kritis! ${curHp} HP tersisa`}
                </p>
                <p style={{ color: '#9ca3af', fontSize: '0.7rem' }}>Kunjungi Klinik Penyembuhan</p>
              </div>
              <div className="w-16 h-2 rounded-full overflow-hidden flex-shrink-0" style={{ background: 'rgba(0,0,0,0.5)' }}>
                <motion.div className="h-full rounded-full"
                  style={{ width: `${hpPct}%`, background: isDead ? '#991b1b' : 'linear-gradient(90deg,#f59e0b,#f97316)' }}
                  animate={{ opacity: [0.6,1,0.6] }} transition={{ duration: 1.2, repeat: Infinity }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Village header ── */}
        <motion.div
          className="mx-1 mb-5 rounded-2xl overflow-hidden"
          initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          style={{ border: '1px solid rgba(74,222,128,0.25)', background: 'rgba(2,20,8,0.75)', backdropFilter: 'blur(16px)' }}
        >
          {/* Top shimmer line */}
          <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, #4ade80, #86efac, #4ade80, transparent)' }} />
          <div className="px-5 py-4 flex items-center justify-between">
            <div>
              <p style={{ color: '#4ade80', fontSize: '0.6rem', letterSpacing: '0.4em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 2 }}>
                ✦ Realm of Destiny ✦
              </p>
              <h1 style={{
                fontFamily: 'serif', fontWeight: 900, fontSize: '1.6rem', letterSpacing: '0.05em',
                backgroundImage: 'linear-gradient(180deg, #86efac 0%, #4ade80 50%, #16a34a 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                filter: 'drop-shadow(0 0 16px rgba(74,222,128,0.5))',
              }}>
                Desa Daun Hijau
              </h1>
              <p style={{ color: '#4ade8066', fontSize: '0.65rem', marginTop: 2, fontStyle: 'italic' }}>
                🌿 Desa damai di kaki pegunungan hijau abadi
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {[{ icon: '☀️', label: 'Zona Aman' }, { icon: '🌿', label: '10 Lokasi' }].map(item => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <span style={{ fontSize: '0.75rem' }}>{item.icon}</span>
                  <span style={{ color: '#4ade8070', fontSize: '0.62rem', fontWeight: 600 }}>{item.label}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5">
                <span style={{ fontSize: '0.75rem' }}>🪙</span>
                <span style={{ color: '#fbbf24', fontSize: '0.72rem', fontWeight: 700 }}>{(player.gold ?? 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Tutorial alert ── */}
        {!player.tutorialProgress.completed && (() => {
          const tp = player.tutorialProgress;
          const m1 = tp.gotWeapon;
          const m2 = (tp.defeatedDummies ?? 0) >= 3;
          const m3 = (tp.defeatedGuards  ?? 0) >= 5;
          const m4 = tp.meditated;
          const m5 = tp.reachedLevel5 || (player.level ?? 1) >= 5;
          const activeMission = !m1 ? 1 : !m2 ? 2 : !m3 ? 3 : !m4 ? 4 : !m5 ? 5 : 0;
          const missionTexts: Record<number,string> = {
            1: 'Misi 1: Kunjungi Pandai Besi dan ambil senjatamu!',
            2: `Misi 2: Kalahkan 3 Boneka Kayu di Arena (${tp.defeatedDummies ?? 0}/3)`,
            3: `Misi 3: Kalahkan 5 Penjaga Pemula di Arena (${tp.defeatedGuards ?? 0}/5)`,
            4: 'Misi 4: Meditasi di Kuil Desa untuk +10 HP',
            5: `Misi 5: Capai Level 5! (Level saat ini: ${player.level ?? 1})`,
          };
          return (
            <motion.div className="mb-4 mx-1 rounded-xl p-3 border"
              style={{ background: 'rgba(120,53,15,0.35)', borderColor: 'rgba(251,191,36,0.5)', backdropFilter: 'blur(8px)' }}
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
              <div className="flex items-center gap-2">
                <motion.div className="w-2 h-2 bg-yellow-400 rounded-full flex-shrink-0"
                  animate={{ opacity: [1,0.2,1], scale: [1,1.3,1] }} transition={{ duration: 1.5, repeat: Infinity }} />
                <p style={{ color: '#fde68a', fontSize: '0.78rem', fontFamily: 'serif', flex: 1 }}>
                  {missionTexts[activeMission] ?? 'Kunjungi Rumah Kepala Desa untuk detail misi!'}
                </p>
                <motion.button onClick={() => navigate('/game/village/chief-house')}
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                  className="flex-shrink-0 px-2.5 py-1 rounded-lg text-xs"
                  style={{ background: 'rgba(120,53,15,0.5)', border: '1px solid rgba(251,191,36,0.4)', color: '#fbbf24', cursor: 'pointer' }}>
                  📜 Lihat
                </motion.button>
              </div>
            </motion.div>
          );
        })()}

        {/* ── Accordion list container ── */}
        <motion.div
          className="mx-1 rounded-2xl overflow-hidden"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.15 }}
          style={{
            background: 'rgba(2,18,6,0.82)',
            border: '1.5px solid rgba(74,222,128,0.25)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(74,222,128,0.05)',
          }}
        >
          {/* ── List header tab ── */}
          <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'rgba(74,222,128,0.2)', background: 'rgba(5,30,10,0.6)' }}>
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-green-400"
              animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 2, repeat: Infinity }}
            />
            <span style={{ fontFamily: 'serif', fontWeight: 900, color: '#4ade80', fontSize: '0.75rem', letterSpacing: '0.25em', textTransform: 'uppercase' }}>
              List Tempat
            </span>
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, rgba(74,222,128,0.3), transparent)' }} />
            <span style={{ color: '#4ade8050', fontSize: '0.62rem', fontFamily: 'serif' }}>
              {buildings.length} lokasi
            </span>
          </div>

          {/* ── Rows ── */}
          {buildings.map((b, i) => (
            <AccordionRow
              key={b.id}
              building={b}
              index={i}
              isOpen={openId === b.id}
              onToggle={() => toggleRow(b.id)}
            />
          ))}

          {/* Bottom lore strip */}
          <div className="px-4 py-3 border-t" style={{ borderColor: 'rgba(74,222,128,0.1)', background: 'rgba(0,0,0,0.2)' }}>
            <p style={{ color: '#4b5563', fontSize: '0.65rem', textAlign: 'center', fontStyle: 'italic', lineHeight: 1.6 }}>
              📜 Desa Daun Hijau berdiri di kaki <span style={{ color: '#4ade8055' }}>Pegunungan Hijau Abadi</span> — kedamaian yang mulai terusik sejak kebangkitan <span style={{ color: '#f8717155' }}>Raja Iblis</span>
            </p>
          </div>
        </motion.div>

        <div className="h-8" />
      </div>

      {/* ── Healthy Dialog ── */}
      <AnimatePresence>
        {showHealthyDialog && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
            onClick={() => setShowHealthyDialog(false)}>
            <motion.div initial={{ scale: 0.85, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.85, y: 30 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl overflow-hidden text-center"
              style={{ background: 'rgba(5,46,22,0.95)', border: '1px solid rgba(74,222,128,0.5)', boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }}>
              <div className="h-0.5" style={{ background: 'linear-gradient(90deg, transparent, #4ade80, transparent)' }} />
              <div className="p-6">
                <motion.div animate={{ scale: [1,1.12,1] }} transition={{ duration: 2.5, repeat: Infinity }} className="inline-block mb-3">
                  <span style={{ fontSize: '3.5rem', filter: 'drop-shadow(0 0 12px #4ade80)' }}>💚</span>
                </motion.div>
                <h3 style={{ fontFamily: 'serif', fontWeight: 900, color: '#4ade80', fontSize: '1.3rem', marginBottom: 8 }}>HP Sudah Penuh!</h3>
                <div className="flex items-center justify-center gap-2 mb-3 p-2 rounded-lg" style={{ background: 'rgba(20,83,45,0.5)', border: '1px solid rgba(74,222,128,0.3)' }}>
                  <Heart className="w-4 h-4 text-red-400" />
                  <span style={{ color: '#4ade80', fontWeight: 700, fontSize: '0.9rem' }}>{curHp} HP</span>
                </div>
                <p style={{ color: '#9ca3af', fontSize: '0.82rem', lineHeight: 1.6, marginBottom: 20 }}>
                  HP kamu sudah penuh! Klinik hanya bisa diakses ketika HP kamu di bawah 100.
                </p>
                <motion.button onClick={() => setShowHealthyDialog(false)} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                  className="w-full py-3 rounded-xl"
                  style={{ background: 'linear-gradient(135deg, #166534, #15803d)', color: '#fff', fontFamily: 'serif', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                  Mengerti
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}