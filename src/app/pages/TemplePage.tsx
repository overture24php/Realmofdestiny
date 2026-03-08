import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router';
import { useGame } from '../contexts/GameContext';
import { ArrowLeft, Heart } from 'lucide-react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import meditationFigureImg from 'figma:asset/ae028ba374b625e5980bb19e67f15716582dc9ed.png';

// ── Constants ─────────────────────────────────────────────────────────────────

const MEDITATION_SECONDS = 10; // duration of one cycle

const MANTRAS = [
  'Hirup energi alam... hembuskan kekhawatiran...',
  'Pikiran yang tenang adalah kekuatan sejati',
  'Setiap napas membawa kedamaian abadi',
  'Kamu adalah cahaya di tengah kegelapan',
  'Energi langit mengalir melalui tubuhmu',
  'Keheningan adalah suara terkuat di alam semesta',
  'Biarkan jiwa dan ragamu menyatu dengan semesta',
  'Kekuatan sejati lahir dari ketenangan dalam',
];

// ── Sub-components ─────────────────────────────────────────────────────────────

function Particle({ x, delay, color, size }: { x: number; delay: number; color: string; size: number }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{ left: `${x}%`, bottom: '30%', width: size, height: size, background: color }}
      initial={{ y: 0, opacity: 0, scale: 0 }}
      animate={{ y: -320, opacity: [0, 0.9, 0.7, 0], scale: [0, 1.2, 1, 0.4] }}
      transition={{ duration: 4 + Math.random() * 3, delay, repeat: Infinity, ease: 'easeOut' }}
    />
  );
}

function AuraRing({ delay, color }: { delay: number; color: string }) {
  return (
    <motion.div
      className="absolute rounded-full border pointer-events-none"
      style={{ borderColor: color }}
      initial={{ width: 120, height: 120, opacity: 0.8, x: '-50%', y: '-50%', left: '50%', top: '50%' }}
      animate={{ width: 380, height: 380, opacity: 0 }}
      transition={{ duration: 3.5, delay, repeat: Infinity, ease: 'easeOut' }}
    />
  );
}

function ChakraPoint({ cx, cy, color, delay, size = 6 }: {
  cx: number; cy: number; color: string; delay: number; size?: number;
}) {
  return (
    <motion.circle
      cx={cx} cy={cy} r={size}
      fill={color}
      animate={{ opacity: [0.4, 1, 0.4], r: [size * 0.8, size * 1.2, size * 0.8] }}
      transition={{ duration: 2, delay, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

// ── Meditation Aura Figure (image-based) ─────────────────────────────────────

const CHAKRAS = [
  { id: 'crown',   top: '11%',  color: '#e879f9', glow: 'rgba(232,121,249,0.9)', size: 10, delay: 0   },
  { id: 'eye',     top: '17%',  color: '#a78bfa', glow: 'rgba(167,139,250,0.9)', size: 7,  delay: 0.3 },
  { id: 'throat',  top: '25%',  color: '#22d3ee', glow: 'rgba(34,211,238,0.9)',  size: 7,  delay: 0.6 },
  { id: 'heart',   top: '37%',  color: '#4ade80', glow: 'rgba(74,222,128,0.9)',  size: 10, delay: 0.9 },
  { id: 'solar',   top: '47%',  color: '#fbbf24', glow: 'rgba(251,191,36,0.9)',  size: 7,  delay: 1.2 },
  { id: 'sacral',  top: '56%',  color: '#fb923c', glow: 'rgba(251,146,60,0.9)',  size: 7,  delay: 1.5 },
  { id: 'root',    top: '66%',  color: '#f87171', glow: 'rgba(248,113,113,0.9)', size: 9,  delay: 1.8 },
];

function MeditatingFigure({ medState, breathPhase }: { medState: MedState; breathPhase: number }) {
  const isActive = medState === 'meditating';
  const isDone   = medState === 'done';
  const isAnyOn  = isActive || isDone;

  const figureFilter = isDone
    ? 'drop-shadow(0 0 18px rgba(74,222,128,1)) drop-shadow(0 0 40px rgba(74,222,128,0.6)) brightness(1.5)'
    : isActive
      ? `drop-shadow(0 0 14px rgba(167,139,250,0.9)) drop-shadow(0 0 30px rgba(99,102,241,0.6)) brightness(${breathPhase === 0 ? 1.3 : breathPhase === 2 ? 0.85 : 1.1})`
      : 'drop-shadow(0 0 6px rgba(139,92,246,0.4)) brightness(0.75)';

  return (
    <div className="relative flex items-center justify-center" style={{ width: 200, height: 340 }}>

      {/* ── Background radial body glow ── */}
      <motion.div className="absolute pointer-events-none" style={{
        inset: 0,
        background: isDone
          ? 'radial-gradient(ellipse 55% 70% at 50% 38%, rgba(74,222,128,0.22) 0%, rgba(139,92,246,0.12) 60%, transparent 85%)'
          : 'radial-gradient(ellipse 55% 70% at 50% 38%, rgba(139,92,246,0.22) 0%, rgba(99,102,241,0.1) 60%, transparent 85%)',
        borderRadius: '50%',
      }}
        animate={{ opacity: isAnyOn ? [0.55, 1, 0.55] : 0.35 }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* ── Energy pillar through body ── */}
      {isAnyOn && (
        <motion.div className="absolute pointer-events-none" style={{
          left: '50%', top: '10%', width: 3, height: '60%',
          transform: 'translateX(-50%)',
          background: isDone
            ? 'linear-gradient(to bottom, rgba(232,121,249,1), rgba(74,222,128,0.9), rgba(248,113,113,0.7))'
            : 'linear-gradient(to bottom, rgba(232,121,249,0.7), rgba(167,139,250,0.8), rgba(248,113,113,0.5))',
          filter: 'blur(3px)',
          borderRadius: 4,
        }}
          animate={{ opacity: [0.5, 1, 0.5], scaleX: [1, 1.8, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* ── Rotating energy halos ── */}
      {isAnyOn && [0, 1, 2].map(i => (
        <motion.div key={i} className="absolute pointer-events-none rounded-full" style={{
          width: 60 + i * 30, height: 60 + i * 30,
          top: '33%', left: '50%',
          transform: 'translate(-50%, -50%)',
          border: `1px solid ${isDone ? 'rgba(74,222,128,0.5)' : 'rgba(167,139,250,0.5)'}`,
          boxShadow: `0 0 12px ${isDone ? 'rgba(74,222,128,0.2)' : 'rgba(139,92,246,0.2)'}`,
        }}
          animate={{ rotate: i % 2 === 0 ? [0, 360] : [360, 0], scaleX: [1, 1.15, 1], scaleY: [1, 0.9, 1], opacity: [0.4, 0.9, 0.4] }}
          transition={{ rotate: { duration: 8 + i * 3, repeat: Infinity, ease: 'linear' }, scaleX: { duration: 3 + i, repeat: Infinity, ease: 'easeInOut' }, scaleY: { duration: 3 + i, repeat: Infinity, ease: 'easeInOut' }, opacity: { duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 } }}
        />
      ))}

      {/* ── Figure image ── */}
      <div className="absolute inset-0">
        <motion.img
          src={meditationFigureImg}
          alt="Meditation figure"
          className="w-full h-full object-contain"
          style={{ mixBlendMode: 'screen', filter: figureFilter }}
          animate={isActive ? { filter: [
            'drop-shadow(0 0 10px rgba(167,139,250,0.7)) brightness(1.0)',
            'drop-shadow(0 0 22px rgba(167,139,250,1)) brightness(1.3)',
            'drop-shadow(0 0 10px rgba(167,139,250,0.7)) brightness(1.0)',
          ] } : {}}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* ── Chakra points ── */}
        {isAnyOn && CHAKRAS.map(ch => (
          <motion.div key={ch.id} className="absolute rounded-full pointer-events-none" style={{
            left: '50%', top: ch.top,
            width: ch.size, height: ch.size,
            transform: 'translate(-50%, -50%)',
            background: ch.color,
            boxShadow: `0 0 ${ch.size * 2}px ${ch.size}px ${ch.glow}, 0 0 ${ch.size * 4}px ${ch.size * 0.5}px ${ch.glow.replace('0.9', '0.4')}`,
          }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0.6, 1, 0.6], scale: [0.85, 1.35, 0.85] }}
            transition={{ duration: 2, delay: ch.delay, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}

        {/* ── Hand orbs ── */}
        {isAnyOn && (
          <>
            {[{ side: 'left', css: { left: '2%', top: '51%' } }, { side: 'right', css: { right: '2%', top: '51%' } }].map(({ side, css }, idx) => (
              <motion.div key={side} className="absolute rounded-full pointer-events-none" style={{
                ...css, width: 14, height: 14,
                background: isDone ? 'rgba(74,222,128,0.9)' : 'rgba(129,140,248,0.9)',
                boxShadow: isDone
                  ? '0 0 24px 12px rgba(74,222,128,0.6)'
                  : '0 0 24px 12px rgba(129,140,248,0.6)',
              }}
                animate={{ opacity: [0.4, 1, 0.4], scale: [0.7, 1.5, 0.7] }}
                transition={{ duration: 2.5, delay: idx * 0.6, repeat: Infinity, ease: 'easeInOut' }}
              />
            ))}
          </>
        )}
      </div>

      {/* ── Crown burst (done state) ── */}
      {isDone && (
        <motion.div className="absolute pointer-events-none" style={{ top: '4%', left: '50%', transform: 'translateX(-50%)' }}>
          {[0,1,2,3,4,5,6,7].map(i => (
            <motion.div key={i} className="absolute rounded-full" style={{
              width: 3, height: 3, background: '#f0abfc',
              originX: '50%', originY: '50%',
              boxShadow: '0 0 8px 4px rgba(240,171,252,0.8)',
            }}
              animate={{
                x: Math.cos((i / 8) * Math.PI * 2) * 30,
                y: Math.sin((i / 8) * Math.PI * 2) * 20 - 10,
                opacity: [0, 1, 0],
                scale: [0, 1.5, 0],
              }}
              transition={{ duration: 1.5, delay: i * 0.1, repeat: Infinity, ease: 'easeOut' }}
            />
          ))}
        </motion.div>
      )}

      {/* ── Ground aura pool ── */}
      <motion.div className="absolute pointer-events-none rounded-full" style={{
        bottom: '4%', left: '50%',
        width: 110, height: 18,
        transform: 'translateX(-50%)',
        background: isDone ? 'rgba(74,222,128,0.4)' : 'rgba(139,92,246,0.3)',
        filter: 'blur(10px)',
      }}
        animate={{ opacity: isAnyOn ? [0.4, 0.9, 0.4] : 0.2, scaleX: [0.8, 1.3, 0.8] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}

function HpGainFloat({ amount }: { amount: number }) {
  return (
    <motion.div
      className="absolute left-1/2 pointer-events-none z-20 font-bold text-3xl"
      style={{ top: '35%', color: '#4ade80' }}
      initial={{ y: 0, opacity: 1, x: '-50%' }}
      animate={{ y: -110, opacity: 0 }}
      transition={{ duration: 2, ease: 'easeOut' }}
    >
      ❤️ +{amount} HP
    </motion.div>
  );
}

// ── Circular countdown ring ───────────────────────────────────────────────────

function CountdownRing({ progress, countdown, total }: { progress: number; countdown: number; total: number }) {
  const R = 54;
  const circumference = 2 * Math.PI * R;
  const offset = circumference * (1 - progress);

  return (
    <div style={{ position: 'relative', width: 140, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={140} height={140} viewBox="0 0 140 140" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle cx={70} cy={70} r={R} fill="none" stroke="rgba(79,70,229,0.2)" strokeWidth={8}/>
        {/* Progress arc */}
        <motion.circle
          cx={70} cy={70} r={R}
          fill="none"
          stroke="url(#ring-grad)"
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ strokeDashoffset: offset }}
        />
        <defs>
          <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818cf8"/>
            <stop offset="50%" stopColor="#a855f7"/>
            <stop offset="100%" stopColor="#ec4899"/>
          </linearGradient>
        </defs>
      </svg>
      {/* Center text */}
      <div style={{ textAlign: 'center', zIndex: 1 }}>
        <motion.p
          key={countdown}
          style={{ fontFamily: 'serif', fontSize: '2rem', fontWeight: 900, color: '#c4b5fd', lineHeight: 1 }}
          initial={{ scale: 1.3, color: '#f0abfc' }}
          animate={{ scale: 1, color: '#c4b5fd' }}
          transition={{ duration: 0.3, type: 'tween', ease: 'easeOut' }}
        >
          {countdown}
        </motion.p>
        <p style={{ fontSize: '0.6rem', color: '#4b5563', letterSpacing: '0.12em' }}>DETIK</p>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

type MedState = 'idle' | 'meditating' | 'done';

const BREATH_PHASES   = [4000, 2000, 4000, 2000];
const BREATH_CONFIGS  = [
  { label: 'Hirup...', color: '#93c5fd', scale: 1.25 },
  { label: 'Tahan...', color: '#a78bfa', scale: 1.25 },
  { label: 'Hembuskan...', color: '#818cf8', scale: 1.0 },
  { label: 'Hening...', color: '#6b7280', scale: 1.0 },
];

export default function TemplePage() {
  const { player, updateHp, updatePlayer, grantExp, addItemToInventory, completeTutorialStep } = useGame();
  const navigate = useNavigate();

  // Meditation state machine
  const [medState,     setMedState]     = useState<MedState>('idle');
  const [countdown,    setCountdown]    = useState(MEDITATION_SECONDS);
  const [sessionGained,setSessionGained]= useState(0); // HP gained this page visit
  const [lastGain,     setLastGain]     = useState(0); // HP from last cycle (for float)
  const [saving,       setSaving]       = useState(false);

  // Animation state
  const [mantraIndex,  setMantraIndex]  = useState(0);
  const [mantraVisible,setMantraVisible]= useState(true);
  const [breathPhase,  setBreathPhase]  = useState(0);
  const [showFloat,    setShowFloat]    = useState<number[]>([]);
  const floatId  = useRef(0);

  // Timer refs
  const timerRef  = useRef<number | null>(null);
  const breathRef = useRef<number | null>(null);
  const mantraRef = useRef<number | null>(null);

  // Anti-abuse: record precise start timestamp
  const startedAtRef = useRef<number>(0);
  // ANTI-CHEAT: strong concurrent-save lock (ref-based, not state-based, so it
  // can't be bypassed by rapid re-render or setState batching).
  const savingRef = useRef(false);

  // Always up-to-date player ref for callbacks
  const playerRef = useRef(player);
  playerRef.current = player;

  // Session HP gain ref (for stable callbacks)
  const sessionGainedRef = useRef(0);
  sessionGainedRef.current = sessionGained;

  // Stable particle array
  const particles = useRef(
    Array.from({ length: 14 }, (_, i) => ({
      x: 30 + (i % 7) * 7 + Math.random() * 5,
      delay: (i * 0.4) % 3,
      color: ['rgba(167,139,250,0.7)','rgba(196,181,253,0.6)','rgba(129,140,248,0.6)','rgba(52,211,153,0.5)','rgba(251,113,133,0.5)'][i%5],
      size: 4 + (i % 3) * 2,
    }))
  );

  const clearTimers = useCallback(() => {
    if (timerRef.current)  { clearInterval(timerRef.current);  timerRef.current  = null; }
    if (breathRef.current) { clearTimeout(breathRef.current);  breathRef.current = null; }
    if (mantraRef.current) { clearInterval(mantraRef.current); mantraRef.current = null; }
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  // ── finishMeditation — called when countdown reaches 0 ──────────────────────
  const finishMeditationRef = useRef<() => Promise<void>>(async () => {});
  finishMeditationRef.current = async () => {
    // ── ANTI-CHEAT GATE 1: Concurrent-save lock ───────────────────────────────
    // Prevents rapid timer-fires or JS console calls from stacking HP grants.
    if (savingRef.current) {
      console.warn('[Temple] finishMeditation already in progress — ignoring duplicate call.');
      return;
    }
    savingRef.current = true;

    clearTimers();

    // ── ANTI-CHEAT GATE 2: Real elapsed time must be ≥ 9.5s ─────────────────
    const elapsed = Date.now() - startedAtRef.current;
    if (elapsed < 9500) {
      console.warn(`[Temple] Meditation ended too fast (${elapsed}ms). Ignoring.`);
      savingRef.current = false;
      setMedState('idle');
      setCountdown(MEDITATION_SECONDS);
      return;
    }

    const current = playerRef.current;
    if (!current) {
      savingRef.current = false;
      setMedState('idle');
      return;
    }

    // HP gain scales with VIT — cap to a reasonable per-cycle maximum
    const vitGain = Math.min(current.coreStats?.vit ?? 1, 999); // max 999 per cycle (anti-overflow)
    setSaving(true);
    setMedState('done');
    setLastGain(vitGain);
    setSessionGained(prev => prev + vitGain);

    // Spawn HP float
    floatId.current += 1;
    const fid = floatId.current;
    setShowFloat(ids => [...ids, fid]);
    setTimeout(() => setShowFloat(ids => ids.filter(id => id !== fid)), 2400);

    // Save HP gain — use updateHp which reads from GameContext's playerRef (always fresh)
    const newHp = current.stats.hp + vitGain;
    await updateHp(newHp);

    // Tutorial check: total session gain >= 10 triggers completion
    const newTotal = sessionGainedRef.current;
    if (!current.tutorialProgress?.meditated && newTotal >= 10) {
      await completeTutorialStep('meditate');
      // Mission 4 rewards: 100 EXP, 200 Gold, leather_pants
      await updatePlayer({ gold: (current?.gold ?? 0) + 200 });
      await grantExp(100);
      await addItemToInventory('leather_pants');
    }

    setSaving(false);
    savingRef.current = false;  // release lock

    // Return to idle after 2.5s so player sees the result
    setTimeout(() => {
      setMedState('idle');
      setCountdown(MEDITATION_SECONDS);
      setBreathPhase(0);
      setMantraVisible(true);
    }, 2500);
  };

  // ── startMeditation ─────────────────────────────────────────────────────────
  const startMeditation = useCallback(() => {
    if (medState !== 'idle') return;
    if (savingRef.current) return;  // ANTI-CHEAT: block start while save is in progress

    startedAtRef.current = Date.now();
    setMedState('meditating');
    setCountdown(MEDITATION_SECONDS);
    setBreathPhase(0);
    setMantraIndex(0);
    setMantraVisible(true);

    // Countdown — fires every second, on 0 triggers finish
    timerRef.current = window.setInterval(() => {
      setCountdown(c => {
        const next = c - 1;
        if (next <= 0) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          // Defer to avoid calling async in setState callback
          setTimeout(() => finishMeditationRef.current(), 50);
          return 0;
        }
        return next;
      });
    }, 1000);

    // Breathing cycle
    let bp = 0;
    const advanceBreath = () => {
      bp = (bp + 1) % 4;
      setBreathPhase(bp);
      breathRef.current = window.setTimeout(advanceBreath, BREATH_PHASES[bp]);
    };
    breathRef.current = window.setTimeout(advanceBreath, BREATH_PHASES[0]);

    // Mantra rotation every 9s
    mantraRef.current = window.setInterval(() => {
      setMantraVisible(false);
      setTimeout(() => { setMantraIndex(i => (i + 1) % MANTRAS.length); setMantraVisible(true); }, 700);
    }, 9000);
  }, [medState]);

  if (!player) return null;

  const vit         = player.coreStats?.vit ?? 1;
  const currentHp   = player.stats.hp;
  const progress    = (MEDITATION_SECONDS - countdown) / MEDITATION_SECONDS;
  const phase       = 0; // always phase 0 in 10s (no phase transition needed)
  const breath      = BREATH_CONFIGS[breathPhase];
  const tutDone     = player.tutorialProgress?.meditated;

  // ── Pre-meditation view ──────────────────────────────────────────────────────
  if (medState === 'idle') {
    return (
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigate('/game/village')}
          className="mb-6 flex items-center gap-2 text-purple-300 hover:text-purple-200 transition-colors">
          <ArrowLeft className="w-5 h-5" /><span>Kembali ke Desa</span>
        </button>

        <div className="bg-gradient-to-br from-indigo-900/40 to-black/60 backdrop-blur-sm border-2 border-indigo-500/30 rounded-xl overflow-hidden">
          <div className="relative h-64">
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1644413239414-33a8bf405db9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxqYXBhbmVzZSUyMHRlbXBsZSUyMHNocmluZXxlbnwxfHx8fDE3NzI1Mjc4NTJ8MA&ixlib=rb-4.1.0&q=80&w=1080"
              alt="Temple" className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"/>
            <div className="absolute bottom-4 left-6">
              <h1 className="text-3xl font-bold text-white mb-1">Kuil Desa</h1>
              <p className="text-indigo-200">Tempat Suci untuk Meditasi</p>
            </div>
          </div>

          <div className="p-8">
            <div className="bg-black/40 border border-indigo-500/30 rounded-lg p-6 mb-6">
              <p className="text-gray-300 leading-relaxed mb-3">
                Tempat yang tenang dan penuh energi spiritual. Setiap siklus meditasi berlangsung tepat <span className="text-white font-semibold">10 detik</span> dan otomatis berhenti.
              </p>
              <p className="text-indigo-300 leading-relaxed">
                Setiap siklus 10 detik memberikan <span className="text-white font-semibold">+{vit} HP</span> (= VIT × 1). Kamu bisa meditasi berulang kali.
              </p>
            </div>

            {/* VIT info */}
            <div className="bg-cyan-900/20 border border-cyan-500/30 rounded-lg p-4 mb-5 flex items-center gap-3">
              <span className="text-2xl">🛡️</span>
              <div>
                <p className="text-sm font-bold text-cyan-300">VIT Kamu: {vit}</p>
                <p className="text-xs text-cyan-200/70">+{vit} HP per siklus 10 detik meditasi</p>
              </div>
            </div>

            {/* Tutorial quest banner */}
            {!tutDone && (
              <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-4 mb-5 flex items-start gap-3">
                <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 animate-pulse flex-shrink-0"/>
                <div>
                  <h3 className="font-bold text-yellow-300 mb-1">Quest Tutorial Aktif</h3>
                  <p className="text-sm text-yellow-200/80">
                    Bermeditasi hingga mendapatkan total +10 HP
                    {sessionGained > 0 && <span className="ml-2 text-yellow-300">({sessionGained}/10 HP didapat sesi ini)</span>}
                  </p>
                </div>
              </div>
            )}

            {/* Session summary */}
            {sessionGained > 0 && (
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 mb-5 flex items-center gap-3">
                <span className="text-xl">✅</span>
                <div>
                  <p className="text-sm font-bold text-green-300">Sesi ini: +{sessionGained} HP didapat</p>
                  <p className="text-xs text-green-400/70">HP saat ini: {currentHp}</p>
                </div>
              </div>
            )}

            {/* Current HP */}
            <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-6 mb-8">
              <div className="flex items-center justify-center gap-3">
                <Heart className="w-8 h-8 text-red-400"/>
                <div>
                  <p className="text-sm text-gray-400">HP Saat Ini</p>
                  <p className="text-3xl font-bold text-red-300">{currentHp}</p>
                </div>
              </div>
            </div>

            {/* Start button */}
            <div className="text-center">
              <motion.button
                onClick={startMeditation}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl font-bold text-lg shadow-lg shadow-indigo-500/40 transition-colors"
              >
                <span className="text-2xl">🧘</span> Mulai Meditasi
              </motion.button>
              <p className="text-gray-500 text-sm mt-3">Siklus 10 detik — otomatis selesai & tersimpan</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Active meditation / result view ──────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto select-none">
      <div
        className="relative bg-gradient-to-b from-indigo-950 via-purple-950 to-black rounded-2xl overflow-hidden border-2 border-indigo-500/40 shadow-2xl shadow-purple-900/50"
        style={{ minHeight: '85vh' }}
      >
        {/* ── Starfield background ── */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 40 }, (_, i) => (
            <motion.div key={i} className="absolute rounded-full bg-white"
              style={{ width: 1+(i%3), height: 1+(i%3), left: `${(i*37+5)%98}%`, top: `${(i*53+8)%70}%` }}
              animate={{ opacity: [0.1,0.7,0.1] }} transition={{ duration: 2+(i%4), delay: (i*0.3)%3, repeat: Infinity, ease: 'easeInOut' }}/>
          ))}
        </div>

        {/* ── Phase / Status label ── */}
        <div className="relative z-10 pt-8 text-center">
          <AnimatePresence mode="wait">
            {medState === 'meditating' && (
              <motion.p key="med" className="text-sm font-bold tracking-widest uppercase text-purple-400"
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
                ✦ Meditasi Berjalan ✦
              </motion.p>
            )}
            {medState === 'done' && (
              <motion.p key="done" className="text-sm font-bold tracking-widest uppercase text-green-400"
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
                ✦ Meditasi Selesai ✦
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* ── Mantra ── */}
        <div className="relative z-10 px-6 mt-2 text-center h-8">
          <AnimatePresence mode="wait">
            {mantraVisible && (
              <motion.p key={mantraIndex} className="text-indigo-300/80 text-sm italic"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.6 }}>
                "{MANTRAS[mantraIndex]}"
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* ── Central animation area ── */}
        <div className="relative flex items-center justify-center" style={{ height: 380 }}>
          {/* Aura rings */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <AuraRing delay={0}   color="rgba(139,92,246,0.5)"/>
            <AuraRing delay={1.2} color="rgba(99,102,241,0.3)"/>
            <AuraRing delay={2.4} color="rgba(167,139,250,0.25)"/>
            {medState === 'done' && <AuraRing delay={0} color="rgba(74,222,128,0.5)"/>}
          </div>

          {/* Breathing orb */}
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 200, height: 200,
              background: medState === 'done'
                ? 'radial-gradient(circle, rgba(74,222,128,0.2) 0%, rgba(139,92,246,0.1) 50%, transparent 70%)'
                : 'radial-gradient(circle, rgba(79,70,229,0.2) 0%, rgba(109,40,217,0.1) 50%, transparent 70%)',
            }}
            animate={{ scale: breath.scale }}
            transition={{ duration: breathPhase===0||breathPhase===2?4:0.3, ease: breathPhase===0?'easeIn':breathPhase===2?'easeOut':'linear' }}
          />

          {/* Particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {particles.current.map((p, i) => <Particle key={i} x={p.x} delay={p.delay} color={p.color} size={p.size}/>)}
          </div>

          {/* Meditating figure */}
          <div className="relative z-10">
            <MeditatingFigure medState={medState} breathPhase={breathPhase}/>
          </div>

          {/* HP Float */}
          {showFloat.map(id => <HpGainFloat key={id} amount={lastGain}/>)}
        </div>

        {/* ── Breathing guide ── */}
        {medState === 'meditating' && (
          <div className="relative z-10 flex justify-center mb-4">
            <motion.div
              className="px-6 py-2 rounded-full border font-semibold text-sm border-current bg-black/30"
              style={{ color: breath.color }}
              animate={{ opacity: [0.7,1,0.7] }} transition={{ duration: 1.5, repeat: Infinity }}>
              {breath.label}
            </motion.div>
          </div>
        )}

        {/* ── Countdown ring ── */}
        <div className="relative z-10 flex flex-col items-center mb-6 gap-4">
          {medState === 'meditating' && (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260 }}>
              <CountdownRing progress={progress} countdown={countdown} total={MEDITATION_SECONDS}/>
            </motion.div>
          )}

          {/* Done result card */}
          {medState === 'done' && (
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              style={{
                background: 'linear-gradient(135deg, rgba(20,83,45,0.5), rgba(30,27,75,0.5))',
                border: '1.5px solid rgba(74,222,128,0.5)', borderRadius: 16, padding: '20px 40px', textAlign: 'center',
              }}>
              <motion.p style={{ fontSize: '3rem', marginBottom: 4 }}
                animate={{ scale: [1,1.2,1] }} transition={{ duration: 0.5, repeat: 2 }}>❤️</motion.p>
              <p style={{ fontFamily: 'serif', fontWeight: 900, fontSize: '2rem', color: '#4ade80' }}>+{lastGain} HP</p>
              <p style={{ fontSize: '0.8rem', color: '#86efac', marginTop: 4 }}>
                {saving ? 'Menyimpan...' : 'Tersimpan! HP: ' + playerRef.current?.stats.hp}
              </p>
              <p style={{ fontSize: '0.65rem', color: '#4b5563', marginTop: 8 }}>
                Sesi ini total: +{sessionGained} HP · Kembali ke layar utama sebentar lagi...
              </p>
            </motion.div>
          )}
        </div>

        {/* ── Stats row ── */}
        <div className="relative z-10 grid grid-cols-3 gap-4 px-8 mb-6">
          <div className="bg-black/40 border border-indigo-500/30 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">🛡️ VIT</p>
            <p className="text-2xl font-bold text-cyan-300 font-mono">{vit}</p>
          </div>
          <div className="bg-black/40 border border-red-500/30 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">❤️ HP Sesi</p>
            <AnimatePresence mode="popLayout">
              <motion.p key={sessionGained} className="text-2xl font-bold text-red-300"
                initial={{ scale: 1.5, color: '#4ade80' }} animate={{ scale: 1, color: '#fca5a5' }} transition={{ duration: 0.4, type: 'tween', ease: 'easeOut' }}>
                +{sessionGained}
              </motion.p>
            </AnimatePresence>
          </div>
          <div className="bg-black/40 border border-purple-500/30 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">💜 HP Total</p>
            <p className="text-2xl font-bold text-purple-300">{currentHp}</p>
          </div>
        </div>

        {/* ── Tutorial progress bar ── */}
        {!tutDone && (
          <div className="relative z-10 px-8 mb-4">
            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-yellow-300 font-semibold">Quest: Raih +10 HP dari meditasi</span>
                <span className="text-xs text-yellow-400">{Math.min(sessionGained,10)}/10</span>
              </div>
              <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                <motion.div className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 rounded-full"
                  animate={{ width: `${Math.min((sessionGained/10)*100,100)}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}/>
              </div>
              {sessionGained >= 10 && (
                <motion.p className="text-green-300 text-xs font-bold mt-2 text-center"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  ✓ Quest selesai! Tersimpan otomatis.
                </motion.p>
              )}
            </div>
          </div>
        )}

        {/* ── Dynamic action button ── */}
        <div className="relative z-10 px-8 pb-8 text-center">
          <AnimatePresence mode="wait">

            {/* Meditating — show locked state */}
            {medState === 'meditating' && (
              <motion.div key="meditating"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="inline-flex items-center gap-3 px-10 py-4 rounded-xl font-bold text-lg cursor-not-allowed select-none"
                  style={{
                    background: 'linear-gradient(90deg, rgba(55,48,163,0.6), rgba(91,33,182,0.6))',
                    border: '1px solid rgba(167,139,250,0.4)',
                    color: '#a78bfa',
                  }}>
                  {/* Spinner */}
                  <motion.div className="w-5 h-5 border-2 border-purple-400/40 border-t-purple-300 rounded-full"
                    animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}/>
                  <span>🧘 Sedang Bermeditasi... ({countdown}s)</span>
                </div>
                <p className="text-gray-600 text-xs mt-3">Meditasi otomatis selesai dalam {countdown} detik</p>
              </motion.div>
            )}

            {/* Done — transitioning back */}
            {medState === 'done' && (
              <motion.div key="done"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="inline-flex items-center gap-3 px-10 py-4 rounded-xl font-bold text-lg cursor-not-allowed"
                  style={{
                    background: 'linear-gradient(90deg, rgba(20,83,45,0.6), rgba(22,101,52,0.6))',
                    border: '1px solid rgba(74,222,128,0.4)', color: '#4ade80',
                  }}>
                  {saving ? (
                    <motion.div className="w-5 h-5 border-2 border-green-400/40 border-t-green-300 rounded-full"
                      animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}/>
                  ) : '✅'}
                  {saving ? 'Menyimpan HP...' : `HP +${lastGain} Tersimpan!`}
                </div>
                <p className="text-gray-600 text-xs mt-3">Bisa meditasi lagi sebentar lagi...</p>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}