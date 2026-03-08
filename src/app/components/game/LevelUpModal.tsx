import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from 'lucide-react';
import { MILESTONE_LEVELS } from '../../data/levelData';

// ── Interfaces ────────────────────────────────────────────────────────────────

interface LevelUpResult {
  oldLevel      : number;
  newLevel      : number;
  levelsGained  : number;
  freePoints    : number;   // free points GAINED this level-up (levelsGained * 2)
  statGains     : {
    hp?          : number;
    physicalDef? : number;
    magicDef?    : number;
  };
}

interface LevelUpModalProps {
  result        : LevelUpResult;
  onClose       : () => void;
  onOpenProfile?: () => void;
}

// ── Tier theme ────────────────────────────────────────────────────────────────

function getTierTheme(level: number) {
  if (level >= 90) return { primary: '#f59e0b', secondary: '#fde68a', glow: '#f59e0b', label: 'LEGENDARIS', bg: 'rgba(120,53,15,0.25)' };
  if (level >= 70) return { primary: '#a855f7', secondary: '#e879f9', glow: '#a855f7', label: 'EPIK',        bg: 'rgba(88,28,135,0.25)' };
  if (level >= 50) return { primary: '#06b6d4', secondary: '#67e8f9', glow: '#06b6d4', label: 'LANGKA',      bg: 'rgba(8,100,130,0.25)' };
  if (level >= 30) return { primary: '#22c55e', secondary: '#86efac', glow: '#22c55e', label: 'TAK BIASA',   bg: 'rgba(20,83,45,0.25)' };
  return               { primary: '#60a5fa', secondary: '#bfdbfe', glow: '#3b82f6', label: 'UMUM',           bg: 'rgba(30,58,138,0.25)' };
}

// ── Particle burst ─────────────────────────────────────────────────────────────

function Particles({ color }: { color: string }) {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {Array.from({ length: 24 }).map((_, i) => {
        const angle = (i / 24) * 360;
        const dist  = 90 + (i % 3) * 50;
        const dx    = Math.cos((angle * Math.PI) / 180) * dist;
        const dy    = Math.sin((angle * Math.PI) / 180) * dist;
        const size  = 5 + (i % 4) * 3;
        const shapes = ['✦', '★', '◆', '⚜', '✸'];
        return (
          <motion.span
            key={i}
            style={{ position: 'absolute', left: '50%', top: '28%', fontSize: size, color, textShadow: `0 0 10px ${color}` }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 0.5 }}
            animate={{ x: dx, y: dy, opacity: 0, scale: 0 }}
            transition={{ duration: 1.4 + (i % 3) * 0.4, delay: (i % 5) * 0.07, ease: 'easeOut' }}
          >
            {shapes[i % shapes.length]}
          </motion.span>
        );
      })}
    </div>
  );
}

// ── Stat Pill ─────────────────────────────────────────────────────────────────

function StatPill({ icon, label, value, color, delay }: {
  icon: string; label: string; value: string; color: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.35, ease: 'easeOut' }}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: `${color}14`, border: `1px solid ${color}40`,
        borderRadius: 10, padding: '7px 12px',
      }}
    >
      <span style={{ fontSize: '1rem' }}>{icon}</span>
      <span style={{ color: '#9ca3af', fontSize: '0.7rem', flex: 1 }}>{label}</span>
      <motion.span
        style={{ color, fontFamily: 'serif', fontWeight: 900, fontSize: '0.95rem' }}
        initial={{ scale: 1.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: delay + 0.15, duration: 0.3 }}
      >
        {value}
      </motion.span>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function LevelUpModal({ result, onClose, onOpenProfile }: LevelUpModalProps) {
  const { oldLevel, newLevel, levelsGained, freePoints, statGains } = result;
  const isMilestone = MILESTONE_LEVELS.has(newLevel);
  const isMaxLevel  = newLevel >= 100;
  const theme       = getTierTheme(newLevel);

  // Auto-close after 15s (longer since player needs to read)
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    timerRef.current = setTimeout(onClose, 15_000);
    return () => clearTimeout(timerRef.current);
  }, [onClose]);

  // Escape key
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const handleOpenProfile = () => {
    onClose();
    onOpenProfile?.();
  };

  // Core stats gained per level
  const coreStatsPerLevel = levelsGained; // each stat +1 per level
  const totalFreePoints   = freePoints;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(14px)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="relative w-full max-w-md overflow-hidden"
          style={{
            borderRadius: 24,
            background : 'linear-gradient(160deg, #0d0520 0%, #1a0835 45%, #0a0318 100%)',
            border     : `1.5px solid ${theme.glow}55`,
            boxShadow  : `0 0 80px ${theme.glow}25, 0 0 160px ${theme.glow}10, inset 0 1px 0 ${theme.glow}20`,
          }}
          initial={{ scale: 0.75, y: 50, opacity: 0 }}
          animate={{ scale: 1,    y: 0,  opacity: 1 }}
          exit   ={{ scale: 0.88, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Particles */}
          <Particles color={theme.primary} />

          {/* Top shimmer bar */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 3,
            background: `linear-gradient(90deg, transparent, ${theme.primary}, ${theme.secondary}, ${theme.primary}, transparent)`,
            boxShadow: `0 0 20px ${theme.glow}88`,
          }} />

          {/* ── Header (icon + level display) ── */}
          <div style={{ padding: '28px 28px 0', textAlign: 'center' }}>

            {/* Icon */}
            <motion.div
              style={{ fontSize: '3.5rem', marginBottom: 6 }}
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: [0, 1.35, 1], rotate: [0, 12, 0] }}
              transition={{ type: 'tween', duration: 0.7, delay: 0.05, ease: 'easeOut' }}
            >
              {isMaxLevel ? '👑' : isMilestone ? '🌟' : '⚔️'}
            </motion.div>

            {/* LEVEL UP label */}
            <motion.p
              style={{
                fontSize: '0.65rem', letterSpacing: '0.35em', color: theme.primary,
                fontFamily: 'serif', textTransform: 'uppercase', marginBottom: 6,
              }}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
            >
              {isMaxLevel ? '✦ LEVEL TERTINGGI DICAPAI ✦' : '✦ LEVEL UP! ✦'}
            </motion.p>

            {/* Selamat headline */}
            <motion.h2
              style={{
                fontFamily: 'serif', fontWeight: 900, fontSize: '1.45rem',
                background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                marginBottom: 10, lineHeight: 1.2,
              }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 }}
            >
              Selamat! Anda Telah Naik Level!
            </motion.h2>

            {/* Level display: old → new */}
            <motion.div
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 6 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <span style={{ fontFamily: 'serif', fontWeight: 900, fontSize: '2rem', color: '#374151', textDecoration: 'line-through' }}>
                {oldLevel}
              </span>
              <motion.span
                style={{ fontSize: '1.4rem', color: theme.primary }}
                animate={{ x: [-4, 4, -4] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              >→</motion.span>
              <motion.span
                style={{
                  fontFamily: 'serif', fontWeight: 900, fontSize: '3.5rem',
                  background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  filter: `drop-shadow(0 0 16px ${theme.glow}88)`,
                }}
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.3, 1] }}
                transition={{ type: 'tween', duration: 0.7, ease: 'easeOut', delay: 0.38 }}
              >
                {newLevel}
              </motion.span>
            </motion.div>

            {/* Tier badge */}
            {(isMilestone || isMaxLevel) && (
              <motion.div
                style={{
                  display: 'inline-block', marginBottom: 12,
                  padding: '3px 18px', borderRadius: 20,
                  background: `${theme.glow}18`, border: `1px solid ${theme.glow}55`,
                }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
              >
                <span style={{ fontSize: '0.62rem', letterSpacing: '0.22em', color: theme.primary, fontFamily: 'serif', textTransform: 'uppercase' }}>
                  {isMaxLevel ? '👑 LEVEL MAKSIMUM' : `🌟 MILESTONE — ${theme.label}`}
                </span>
              </motion.div>
            )}

            {/* Multi-level note */}
            {levelsGained > 1 && (
              <motion.p
                style={{ fontSize: '0.72rem', color: '#6b7280', marginBottom: 6 }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
              >
                +{levelsGained} level sekaligus!
              </motion.p>
            )}
          </div>

          {/* Divider */}
          <motion.div
            style={{ height: 1, margin: '16px 28px 14px', background: `linear-gradient(90deg, transparent, ${theme.glow}55, transparent)` }}
            initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.55, duration: 0.5 }}
          />

          {/* ── Stats section ── */}
          <div style={{ padding: '0 28px' }}>

            {/* Core Stats header */}
            <motion.p
              style={{ fontSize: '0.58rem', letterSpacing: '0.22em', color: '#4b5563', textTransform: 'uppercase', marginBottom: 8, textAlign: 'center' }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.58 }}
            >
              ✦ Semua Core Stats Meningkat ✦
            </motion.p>

            {/* Core stats 5x in a row */}
            <motion.div
              style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 10 }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.62 }}
            >
              {[
                { label: 'STR', icon: '⚔️', color: '#f87171' },
                { label: 'INT', icon: '🔮', color: '#818cf8' },
                { label: 'DEX', icon: '🎯', color: '#34d399' },
                { label: 'VIT', icon: '🛡️', color: '#fbbf24' },
                { label: 'AGI', icon: '⚡', color: '#60a5fa' },
              ].map((s, i) => (
                <motion.div
                  key={s.label}
                  style={{
                    flex: 1, textAlign: 'center', padding: '8px 4px',
                    background: `${s.color}12`, border: `1px solid ${s.color}35`,
                    borderRadius: 10,
                  }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.65 + i * 0.07 }}
                >
                  <div style={{ fontSize: '1rem', marginBottom: 2 }}>{s.icon}</div>
                  <div style={{ fontSize: '0.6rem', color: '#6b7280', marginBottom: 3 }}>{s.label}</div>
                  <motion.div
                    style={{ color: s.color, fontFamily: 'serif', fontWeight: 900, fontSize: '1rem' }}
                    initial={{ scale: 1.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.75 + i * 0.07 }}
                  >
                    +{coreStatsPerLevel}
                  </motion.div>
                </motion.div>
              ))}
            </motion.div>

            {/* Bonus stats (HP, DEF) */}
            {((statGains.hp ?? 0) > 0 || (statGains.physicalDef ?? 0) > 0) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginBottom: 10 }}>
                {(statGains.hp ?? 0) > 0 && (
                  <StatPill icon="❤️" label="Max HP" value={`+${statGains.hp}`} color="#f87171" delay={0.78} />
                )}
                {(statGains.physicalDef ?? 0) > 0 && (
                  <StatPill icon="🛡️" label="P.DEF" value={`+${statGains.physicalDef}`} color="#60a5fa" delay={0.84} />
                )}
                {(statGains.physicalDef ?? 0) > 0 && (
                  <StatPill icon="🧿" label="M.DEF" value={`+${statGains.magicDef ?? statGains.physicalDef}`} color="#818cf8" delay={0.90} />
                )}
              </div>
            )}

            {/* ── Free Points info ── */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.92 }}
              style={{
                padding: '12px 14px',
                background: `linear-gradient(135deg, ${theme.glow}14, ${theme.bg})`,
                border: `1px solid ${theme.glow}45`,
                borderRadius: 12,
                marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <motion.span
                  style={{ fontSize: '1.3rem' }}
                  animate={{ rotate: [0, 15, -15, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                >✨</motion.span>
                <p style={{ fontFamily: 'serif', fontWeight: 900, color: theme.primary, fontSize: '0.88rem' }}>
                  +{totalFreePoints} Point Alokasi Bebas!
                </p>
              </div>
              <p style={{ fontSize: '0.72rem', color: '#9ca3af', lineHeight: 1.6, marginBottom: 6 }}>
                Anda mendapat <span style={{ color: theme.primary, fontWeight: 700 }}>{totalFreePoints} point</span>{' '}
                alokasi bebas. Buka profil Anda untuk mengalokasikan point ke stat yang Anda inginkan.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <motion.div
                  className="w-2 h-2 rounded-full"
                  style={{ background: theme.primary, flexShrink: 0 }}
                  animate={{ scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                />
                <span style={{ fontSize: '0.65rem', color: '#6b7280' }}>
                  Cek profil &amp; alokasikan point untuk memperkuat karakter
                </span>
              </div>
            </motion.div>
          </div>

          {/* ── Buttons ── */}
          <div style={{ padding: '0 28px 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Cek Profil button — primary */}
            <motion.button
              onClick={handleOpenProfile}
              style={{
                width: '100%', padding: '13px 0', borderRadius: 12,
                background: `linear-gradient(90deg, ${theme.primary}cc, ${theme.secondary}99)`,
                border: `1px solid ${theme.glow}77`,
                color: '#fff', fontFamily: 'serif', fontWeight: 800,
                fontSize: '0.95rem', letterSpacing: '0.07em',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: `0 4px 24px ${theme.glow}44`,
              }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
              whileHover={{ scale: 1.03, boxShadow: `0 6px 32px ${theme.glow}66` }}
              whileTap={{ scale: 0.97 }}
            >
              <User style={{ width: 18, height: 18 }} />
              Cek Profil &amp; Alokasi Point
            </motion.button>

            {/* Lanjutkan button — secondary */}
            <motion.button
              onClick={onClose}
              style={{
                width: '100%', padding: '11px 0', borderRadius: 12,
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid rgba(255,255,255,0.12)`,
                color: '#9ca3af', fontFamily: 'serif', fontWeight: 700,
                fontSize: '0.85rem', letterSpacing: '0.06em',
                cursor: 'pointer',
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.08 }}
              whileHover={{ scale: 1.02, color: '#e5e7eb', borderColor: 'rgba(255,255,255,0.25)' }}
              whileTap={{ scale: 0.98 }}
            >
              ⚔️ Lanjutkan Petualangan
            </motion.button>

            {/* Auto-close hint */}
            <p style={{ textAlign: 'center', fontSize: '0.55rem', color: '#374151', marginTop: 2 }}>
              Tekan ESC atau klik di luar untuk menutup
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}