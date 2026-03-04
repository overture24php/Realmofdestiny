import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useAnimation } from 'motion/react';
import { useNavigate } from 'react-router';
import { useGame } from '../contexts/GameContext';
import { ArrowLeft, Heart } from 'lucide-react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';

// ── Constants ─────────────────────────────────────────────────────────────────

const HP_INTERVAL = 10; // seconds per +1 HP

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

const BREATH_LABELS = ['Hirup...', 'Tahan...', 'Hembuskan...', 'Hening...'];

// ── Floating Particle ─────────────────────────────────────────────────────────

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

// ── Expanding Aura Ring ───────────────────────────────────────────────────────

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

// ── Chakra Point ──────────────────────────────────────────────────────────────

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

// ── Meditating Figure SVG ─────────────────────────────────────────────────────

function MeditatingFigure({ phase }: { phase: number }) {
  const glowIntensity = phase === 0 ? 0.5 : phase === 1 ? 0.75 : 1;

  return (
    <svg viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <filter id="glow-soft">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="glow-strong">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <radialGradient id="aura-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(139,92,246,0.3)" />
          <stop offset="100%" stopColor="rgba(139,92,246,0)" />
        </radialGradient>
      </defs>

      {/* Aura background glow */}
      <motion.ellipse
        cx="100" cy="160" rx="70" ry="40"
        fill="url(#aura-grad)"
        animate={{ rx: [65, 75, 65], ry: [38, 44, 38] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        style={{ opacity: glowIntensity }}
      />

      {/* Lotus platform */}
      <ellipse cx="100" cy="210" rx="55" ry="12" fill="rgba(139,92,246,0.15)" />
      <path
        d="M55 208 Q75 190 100 195 Q125 190 145 208"
        fill="rgba(167,139,250,0.2)"
        stroke="rgba(167,139,250,0.4)"
        strokeWidth="1"
      />
      {/* Petals */}
      {[45,65,85,115,135,155].map((x, i) => (
        <ellipse key={i} cx={x} cy={208} rx="12" ry="6"
          fill="rgba(196,181,253,0.15)"
          stroke="rgba(196,181,253,0.3)"
          strokeWidth="0.5"
          transform={`rotate(${i * 30 - 75} ${x} 208)`}
        />
      ))}

      {/* Body (robe) */}
      <path
        d="M80 170 Q70 180 68 210 Q100 215 132 210 Q130 180 120 170 Z"
        fill="rgba(109,40,217,0.35)"
        stroke="rgba(139,92,246,0.5)"
        strokeWidth="1"
        filter="url(#glow-soft)"
      />

      {/* Crossed legs */}
      <path
        d="M68 200 Q80 185 100 188 Q120 185 132 200"
        fill="rgba(109,40,217,0.4)"
        stroke="rgba(139,92,246,0.5)"
        strokeWidth="1.5"
      />
      {/* Feet */}
      <ellipse cx="72" cy="205" rx="10" ry="5" fill="rgba(139,92,246,0.3)" stroke="rgba(167,139,250,0.5)" strokeWidth="1" />
      <ellipse cx="128" cy="205" rx="10" ry="5" fill="rgba(139,92,246,0.3)" stroke="rgba(167,139,250,0.5)" strokeWidth="1" />

      {/* Torso */}
      <path
        d="M88 140 Q85 155 82 170 Q100 172 118 170 Q115 155 112 140 Z"
        fill="rgba(109,40,217,0.4)"
        stroke="rgba(139,92,246,0.5)"
        strokeWidth="1"
      />

      {/* Arms */}
      <path d="M88 150 Q78 160 72 170" stroke="rgba(139,92,246,0.6)" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M112 150 Q122 160 128 170" stroke="rgba(139,92,246,0.6)" strokeWidth="4" strokeLinecap="round" fill="none" />

      {/* Hands in mudra (resting on knees, palms up) */}
      <ellipse cx="72" cy="173" rx="7" ry="4" fill="rgba(167,139,250,0.5)" stroke="rgba(196,181,253,0.6)" strokeWidth="0.5" />
      <ellipse cx="128" cy="173" rx="7" ry="4" fill="rgba(167,139,250,0.5)" stroke="rgba(196,181,253,0.6)" strokeWidth="0.5" />

      {/* Neck */}
      <rect x="95" y="128" width="10" height="14" rx="4"
        fill="rgba(139,92,246,0.5)" stroke="rgba(167,139,250,0.4)" strokeWidth="0.5" />

      {/* Head */}
      <motion.circle
        cx="100" cy="118" r="22"
        fill="rgba(109,40,217,0.5)"
        stroke="rgba(167,139,250,0.7)"
        strokeWidth="1.5"
        filter="url(#glow-soft)"
        animate={{ r: [21, 23, 21] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Face detail */}
      <path d="M92 118 Q100 124 108 118" stroke="rgba(196,181,253,0.5)" strokeWidth="1" fill="none" />
      <circle cx="95" cy="114" r="1.5" fill="rgba(196,181,253,0.6)" />
      <circle cx="105" cy="114" r="1.5" fill="rgba(196,181,253,0.6)" />

      {/* Hair / Top knot */}
      <ellipse cx="100" cy="97" rx="10" ry="5" fill="rgba(109,40,217,0.6)" stroke="rgba(167,139,250,0.5)" strokeWidth="1" />
      <circle cx="100" cy="92" r="4" fill="rgba(139,92,246,0.6)" stroke="rgba(196,181,253,0.5)" strokeWidth="0.5" />

      {/* ─── Chakra Points ─── */}
      {/* Crown - Mahkota (violet/white) */}
      <ChakraPoint cx={100} cy={88} color={phase >= 2 ? 'rgba(255,255,255,0.95)' : 'rgba(216,180,254,0.7)'} delay={0} size={phase >= 2 ? 7 : 5} />

      {/* Ajna - Third Eye (indigo) */}
      <ChakraPoint cx={100} cy={109} color={phase >= 1 ? 'rgba(129,140,248,0.95)' : 'rgba(129,140,248,0.5)'} delay={0.3} size={5} />

      {/* Vishuddha - Throat (cyan) */}
      <ChakraPoint cx={100} cy={131} color="rgba(34,211,238,0.8)" delay={0.6} size={4} />

      {/* Anahata - Heart (green/pink) */}
      <ChakraPoint cx={100} cy={148} color={phase >= 1 ? 'rgba(251,113,133,0.95)' : 'rgba(251,113,133,0.5)'} delay={0.9} size={phase >= 1 ? 6 : 4} />

      {/* Manipura - Solar Plexus (yellow) */}
      <ChakraPoint cx={100} cy={158} color="rgba(253,186,116,0.8)" delay={1.2} size={4} />

      {/* Svadhisthana - Sacral (orange) */}
      <ChakraPoint cx={100} cy={166} color="rgba(251,146,60,0.7)" delay={1.5} size={3} />

      {/* Muladhara - Root (red) */}
      <ChakraPoint cx={100} cy={180} color="rgba(239,68,68,0.7)" delay={1.8} size={4} />

      {/* ─── Chakra connecting line ─── */}
      <motion.line
        x1="100" y1="88" x2="100" y2="180"
        stroke="rgba(167,139,250,0.3)"
        strokeWidth="1"
        strokeDasharray="4 4"
        animate={{ strokeOpacity: [0.2, 0.6, 0.2] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Energy rays from hands when phase >= 1 */}
      {phase >= 1 && (
        <>
          <motion.path
            d="M65 173 L40 160"
            stroke="rgba(167,139,250,0.4)" strokeWidth="1.5" strokeLinecap="round"
            animate={{ opacity: [0.2, 0.8, 0.2] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.path
            d="M135 173 L160 160"
            stroke="rgba(167,139,250,0.4)" strokeWidth="1.5" strokeLinecap="round"
            animate={{ opacity: [0.2, 0.8, 0.2] }}
            transition={{ duration: 2, delay: 0.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        </>
      )}
    </svg>
  );
}

// ── HP Gain Float ─────────────────────────────────────────────────────────────

function HpGainFloat({ key: _k }: { key: number }) {
  return (
    <motion.div
      className="absolute left-1/2 pointer-events-none z-20 text-green-300 font-bold text-3xl"
      style={{ top: '35%' }}
      initial={{ y: 0, opacity: 1, x: '-50%' }}
      animate={{ y: -100, opacity: 0 }}
      transition={{ duration: 2, ease: 'easeOut' }}
    >
      ❤️ +1 HP
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function TemplePage() {
  const { player, updatePlayer, completeTutorialStep } = useGame();
  const navigate = useNavigate();

  // Core state
  const [isMeditating, setIsMeditating]   = useState(false);
  const [meditationTime, setMeditationTime] = useState(0);
  const [hpGained, setHpGained]           = useState(0);
  const [currentHp, setCurrentHp]         = useState(player?.stats.hp ?? 100);

  // Animation state
  const [mantraIndex, setMantraIndex]     = useState(0);
  const [mantraVisible, setMantraVisible] = useState(true);
  const [breathPhase, setBreathPhase]     = useState(0); // 0=inhale 1=hold 2=exhale 3=pause
  const [showHpFloat, setShowHpFloat]     = useState<number[]>([]);
  const [hpBarKey, setHpBarKey]           = useState(0); // forces progress bar re-animation

  // Interval refs
  const timerRef  = useRef<number | null>(null);
  const hpRef     = useRef<number | null>(null);
  const mantraRef = useRef<number | null>(null);
  const breathRef = useRef<number | null>(null);
  const floatId   = useRef(0);

  // Meditation depth phase (0/1/2)
  const phase = meditationTime < 30 ? 0 : meditationTime < 90 ? 1 : 2;

  const subCycleProgress = (meditationTime % HP_INTERVAL) / HP_INTERVAL; // 0–1

  // Particle config (stable across renders)
  const particles = useRef(
    Array.from({ length: 14 }, (_, i) => ({
      x: 30 + (i % 7) * 7 + Math.random() * 5,
      delay: (i * 0.4) % 3,
      color: [
        'rgba(167,139,250,0.7)',
        'rgba(196,181,253,0.6)',
        'rgba(129,140,248,0.6)',
        'rgba(52,211,153,0.5)',
        'rgba(251,113,133,0.5)',
      ][i % 5],
      size: 4 + (i % 3) * 2,
    }))
  );

  const BREATH_PHASES   = [4000, 2000, 4000, 2000]; // ms per phase
  const BREATH_TOTAL_MS = BREATH_PHASES.reduce((a, b) => a + b, 0); // 12000

  // ── Start Meditation ────────────────────────────────────────────────────────
  const startMeditation = useCallback(() => {
    setIsMeditating(true);
    setMeditationTime(0);
    setHpGained(0);
    setCurrentHp(player?.stats.hp ?? 100);
    setBreathPhase(0);
    setMantraIndex(0);
    setMantraVisible(true);
    setHpBarKey(k => k + 1);

    // Main timer
    timerRef.current = window.setInterval(() => {
      setMeditationTime(t => t + 1);
    }, 1000);

    // HP gain every HP_INTERVAL seconds
    hpRef.current = window.setInterval(() => {
      setHpGained(prev => {
        const next = prev + 1;
        setCurrentHp(hp => hp + 1);
        // Trigger float animation
        floatId.current += 1;
        setShowHpFloat(ids => [...ids, floatId.current]);
        setTimeout(() => setShowHpFloat(ids => ids.filter(id => id !== floatId.current)), 2200);
        setHpBarKey(k => k + 1);
        return next;
      });
    }, HP_INTERVAL * 1000);

    // Breathing cycle
    let phase = 0;
    const advanceBreath = () => {
      phase = (phase + 1) % 4;
      setBreathPhase(phase);
      breathRef.current = window.setTimeout(advanceBreath, BREATH_PHASES[phase]);
    };
    breathRef.current = window.setTimeout(advanceBreath, BREATH_PHASES[0]);

    // Mantra rotation every 9 seconds
    mantraRef.current = window.setInterval(() => {
      setMantraVisible(false);
      setTimeout(() => {
        setMantraIndex(i => (i + 1) % MANTRAS.length);
        setMantraVisible(true);
      }, 700);
    }, 9000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player?.stats.hp]);

  // ── Stop Meditation ─────────────────────────────────────────────────────────
  const stopMeditation = useCallback(async () => {
    setIsMeditating(false);
    clearAll();

    // Save final HP to player
    const finalHp = (player?.stats.hp ?? 100) + hpGained;
    await updatePlayer({ stats: { ...player!.stats, hp: finalHp } });

    if (hpGained >= 10 && player?.tutorialProgress && !player.tutorialProgress.meditated) {
      await completeTutorialStep('meditate');
      navigate('/game/village/chief-house');
    } else {
      navigate('/game/village');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hpGained, player]);

  const clearAll = () => {
    if (timerRef.current)  { clearInterval(timerRef.current);  timerRef.current  = null; }
    if (hpRef.current)     { clearInterval(hpRef.current);     hpRef.current     = null; }
    if (mantraRef.current) { clearInterval(mantraRef.current); mantraRef.current = null; }
    if (breathRef.current) { clearTimeout(breathRef.current);  breathRef.current = null; }
  };

  useEffect(() => () => clearAll(), []);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const breathConfig = [
    { label: 'Hirup...', color: 'text-blue-300', scale: 1.25, ringColor: 'rgba(147,197,253,0.6)' },
    { label: 'Tahan...', color: 'text-purple-300', scale: 1.25, ringColor: 'rgba(167,139,250,0.4)' },
    { label: 'Hembuskan...', color: 'text-indigo-300', scale: 1.0, ringColor: 'rgba(129,140,248,0.5)' },
    { label: 'Hening...', color: 'text-gray-400', scale: 1.0, ringColor: 'rgba(100,116,139,0.3)' },
  ];

  const breath = breathConfig[breathPhase];

  const phaseLabel = ['Meditasi Dasar', 'Konsentrasi Dalam', '✦ Pencerahan Jiwa ✦'];
  const phaseColor = ['text-purple-400', 'text-indigo-300', 'text-yellow-300'];

  if (!player) return null;

  // ── PRE-MEDITATION VIEW ─────────────────────────────────────────────────────
  if (!isMeditating) {
    return (
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigate('/game/village')}
          className="mb-6 flex items-center gap-2 text-purple-300 hover:text-purple-200 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span>Kembali ke Desa</span>
        </button>

        <div className="bg-gradient-to-br from-indigo-900/40 to-black/60 backdrop-blur-sm border-2 border-indigo-500/30 rounded-xl overflow-hidden">
          {/* Header image */}
          <div className="relative h-64">
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1644413239414-33a8bf405db9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxqYXBhbmVzZSUyMHRlbXBsZSUyMHNocmluZXxlbnwxfHx8fDE3NzI1Mjc4NTJ8MA&ixlib=rb-4.1.0&q=80&w=1080"
              alt="Temple"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
            <div className="absolute bottom-4 left-6">
              <h1 className="text-3xl font-bold text-white mb-1">Kuil Desa</h1>
              <p className="text-indigo-200">Tempat Suci untuk Meditasi</p>
            </div>
          </div>

          <div className="p-8">
            {/* Description */}
            <div className="bg-black/40 border border-indigo-500/30 rounded-lg p-6 mb-6">
              <p className="text-gray-300 leading-relaxed mb-3">
                Tempat yang tenang dan penuh energi spiritual. Di sini kamu bisa bermeditasi untuk meningkatkan HP-mu secara permanen.
              </p>
              <p className="text-indigo-300 leading-relaxed">
                Setiap <span className="text-white font-semibold">10 detik</span> meditasi akan meningkatkan HP-mu sebanyak <span className="text-white font-semibold">1 point</span>.
              </p>
            </div>

            {/* Tutorial quest */}
            {!player.tutorialProgress?.meditated && (
              <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-4 mb-6 flex items-start gap-3">
                <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 animate-pulse flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-yellow-300 mb-1">Quest Tutorial Aktif</h3>
                  <p className="text-sm text-yellow-200/80">Bermeditasi hingga mendapatkan +10 HP</p>
                </div>
              </div>
            )}

            {/* Current HP */}
            <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-6 mb-8">
              <div className="flex items-center justify-center gap-3">
                <Heart className="w-8 h-8 text-red-400" />
                <div>
                  <p className="text-sm text-gray-400">HP Saat Ini</p>
                  <p className="text-3xl font-bold text-red-300">{player.stats.hp}</p>
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
              <p className="text-gray-500 text-sm mt-3">Duduk, tenangkan pikiran, dan biarkan energi mengalir</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── MEDITATION VIEW ─────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto select-none">
      {/* Main meditation card */}
      <div className="relative bg-gradient-to-b from-indigo-950 via-purple-950 to-black rounded-2xl overflow-hidden border-2 border-indigo-500/40 shadow-2xl shadow-purple-900/50"
        style={{ minHeight: '85vh' }}>

        {/* ── Background starfield ── */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 40 }, (_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                width:  1 + (i % 3),
                height: 1 + (i % 3),
                left:   `${(i * 37 + 5) % 98}%`,
                top:    `${(i * 53 + 8) % 70}%`,
              }}
              animate={{ opacity: [0.1, 0.7, 0.1] }}
              transition={{ duration: 2 + (i % 4), delay: (i * 0.3) % 3, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}
        </div>

        {/* ── Phase label ── */}
        <div className="relative z-10 pt-8 text-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={phase}
              className={`text-sm font-bold tracking-widest uppercase ${phaseColor[phase]}`}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.5 }}
            >
              {phaseLabel[phase]}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* ── Mantra ── */}
        <div className="relative z-10 px-6 mt-2 text-center h-8">
          <AnimatePresence mode="wait">
            {mantraVisible && (
              <motion.p
                key={mantraIndex}
                className="text-indigo-300/80 text-sm italic"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.6 }}
              >
                "{MANTRAS[mantraIndex]}"
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* ── Central animation area ── */}
        <div className="relative flex items-center justify-center" style={{ height: 380 }}>

          {/* Aura rings expanding outward */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <AuraRing delay={0}   color={phase >= 2 ? 'rgba(250,204,21,0.5)' : 'rgba(139,92,246,0.5)'} />
            <AuraRing delay={1.2} color={phase >= 1 ? 'rgba(129,140,248,0.4)' : 'rgba(99,102,241,0.3)'} />
            <AuraRing delay={2.4} color="rgba(167,139,250,0.25)" />
            {phase >= 2 && <AuraRing delay={3.6} color="rgba(250,204,21,0.2)" />}
          </div>

          {/* Breathing orb (behind figure) */}
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 200, height: 200,
              background: phase >= 2
                ? 'radial-gradient(circle, rgba(250,204,21,0.15) 0%, rgba(139,92,246,0.1) 50%, transparent 70%)'
                : phase >= 1
                ? 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, rgba(139,92,246,0.1) 50%, transparent 70%)'
                : 'radial-gradient(circle, rgba(79,70,229,0.2) 0%, rgba(109,40,217,0.1) 50%, transparent 70%)',
            }}
            animate={{ scale: breath.scale }}
            transition={{
              duration: breathPhase === 0 ? 4 : breathPhase === 2 ? 4 : 0.3,
              ease: breathPhase === 0 ? 'easeIn' : breathPhase === 2 ? 'easeOut' : 'linear',
            }}
          />

          {/* Floating particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {particles.current.map((p, i) => (
              <Particle key={i} x={p.x} delay={p.delay} color={p.color} size={p.size} />
            ))}
          </div>

          {/* Figure SVG */}
          <div className="relative z-10" style={{ width: 200, height: 240 }}>
            <MeditatingFigure phase={phase} />
          </div>

          {/* HP Gain float-ups */}
          {showHpFloat.map(id => <HpGainFloat key={id} />)}
        </div>

        {/* ── Breathing guide ── */}
        <div className="relative z-10 flex justify-center mb-4">
          <motion.div
            className={`px-6 py-2 rounded-full border font-semibold text-sm ${breath.color} border-current bg-black/30`}
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {breath.label}
          </motion.div>
        </div>

        {/* ── HP Progress Bar ── */}
        <div className="relative z-10 px-8 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-gray-400">+1 HP dalam...</span>
            <span className="text-xs text-green-400 font-semibold">{HP_INTERVAL - (meditationTime % HP_INTERVAL)} detik</span>
          </div>
          <div className="h-3 bg-black/40 rounded-full border border-indigo-500/30 overflow-hidden">
            <motion.div
              key={hpBarKey}
              className="h-full rounded-full"
              style={{
                background: 'linear-gradient(90deg, #4f46e5, #7c3aed, #a855f7, #ec4899)',
                boxShadow: '0 0 10px rgba(139,92,246,0.6)',
              }}
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: HP_INTERVAL, ease: 'linear' }}
            />
          </div>
        </div>

        {/* ── Stats row ── */}
        <div className="relative z-10 grid grid-cols-3 gap-4 px-8 mb-6">
          {/* Timer */}
          <div className="bg-black/40 border border-indigo-500/30 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">⏱ Waktu</p>
            <p className="text-2xl font-bold text-indigo-300 font-mono">{formatTime(meditationTime)}</p>
          </div>

          {/* HP Gained */}
          <div className="bg-black/40 border border-red-500/30 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">❤️ HP Didapat</p>
            <AnimatePresence mode="popLayout">
              <motion.p
                key={hpGained}
                className="text-2xl font-bold text-red-300"
                initial={{ scale: 1.5, color: '#4ade80' }}
                animate={{ scale: 1, color: '#fca5a5' }}
                transition={{ duration: 0.4 }}
              >
                +{hpGained}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Current HP */}
          <div className="bg-black/40 border border-purple-500/30 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">💜 HP Total</p>
            <AnimatePresence mode="popLayout">
              <motion.p
                key={currentHp}
                className="text-2xl font-bold text-purple-300"
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                {currentHp}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        {/* ── Tutorial progress ── */}
        {!player.tutorialProgress?.meditated && (
          <div className="relative z-10 px-8 mb-4">
            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-yellow-300 font-semibold">Quest: Raih +10 HP</span>
                <span className="text-xs text-yellow-400">{hpGained}/10</span>
              </div>
              <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 rounded-full"
                  animate={{ width: `${Math.min((hpGained / 10) * 100, 100)}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
              {hpGained >= 10 && (
                <motion.p
                  className="text-green-300 text-xs font-bold mt-2 text-center"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                >
                  ✓ Quest selesai! Kamu bisa berhenti kapan saja.
                </motion.p>
              )}
            </div>
          </div>
        )}

        {/* ── Stop button ── */}
        <div className="relative z-10 px-8 pb-8 text-center">
          <motion.button
            onClick={stopMeditation}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="px-10 py-3 bg-gradient-to-r from-red-700 to-orange-700 hover:from-red-600 hover:to-orange-600 rounded-xl font-semibold shadow-lg shadow-red-900/50 transition-colors"
          >
            ⏹ Akhiri Meditasi
          </motion.button>
          <p className="text-xs text-gray-600 mt-2">HP yang didapat akan tersimpan otomatis</p>
        </div>
      </div>
    </div>
  );
}
