import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router';
import { useGame } from '../contexts/GameContext';
import { ArrowLeft, Target, Shield, Swords, Skull, Sword, ShieldCheck, Heart, Zap } from 'lucide-react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';

// ─── Opponent Data ────────────────────────────────────────────────────────────

const TRAINING_OPPONENTS = [
  {
    id: 'wooden-dummy',
    name: 'Boneka Kayu',
    icon: Target,
    difficulty: 'Sangat Mudah',
    difficultyColor: 'text-green-400',
    bgColor: 'from-green-900/30 to-black/50',
    borderColor: 'border-green-500/30',
    image: 'https://images.unsplash.com/photo-1603723197165-5692de8defba?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b29kZW4lMjBkdW1teSUyMHRyYWluaW5nfGVufDF8fHx8MTc3MjUyNzg1M3ww&ixlib=rb-4.1.0&q=80&w=1080',
    description: 'Boneka kayu untuk latihan dasar. Tidak akan melawan balik.',
    stats: { hp: 50, maxHp: 50, atk: 0, def: 5 },
    reward: { exp: 10, gold: 5 },
    hasBattle: true,
  },
  {
    id: 'novice-guard',
    name: 'Pasukan Penjaga Pemula',
    icon: Shield,
    difficulty: 'Mudah',
    difficultyColor: 'text-blue-400',
    bgColor: 'from-blue-900/30 to-black/50',
    borderColor: 'border-blue-500/30',
    image: 'https://images.unsplash.com/photo-1727986760616-0d8f65a6ab92?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cmFpbmluZyUyMGFyZW5hJTIwbWVkaWV2YWx8ZW58MXx8fHwxNzcyNTI3ODUzfDA&ixlib=rb-4.1.0&q=80&w=1080',
    description: 'Pasukan penjaga yang baru direkrut. Sistem battle segera hadir.',
    stats: { hp: 80, maxHp: 80, atk: 8, def: 10 },
    reward: { exp: 25, gold: 15 },
    hasBattle: false,
  },
  {
    id: 'senior-guard',
    name: 'Pasukan Penjaga Senior',
    icon: Swords,
    difficulty: 'Sedang',
    difficultyColor: 'text-yellow-400',
    bgColor: 'from-yellow-900/20 to-black/50',
    borderColor: 'border-yellow-500/30',
    image: 'https://images.unsplash.com/photo-1727986760616-0d8f65a6ab92?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cmFpbmluZyUyMGFyZW5hJTIwbWVkaWV2YWx8ZW58MXx8fHwxNzcyNTI3ODUzfDA&ixlib=rb-4.1.0&q=80&w=1080',
    description: 'Pasukan penjaga berpengalaman. Sistem battle segera hadir.',
    stats: { hp: 120, maxHp: 120, atk: 15, def: 15 },
    reward: { exp: 50, gold: 30 },
    hasBattle: false,
  },
  {
    id: 'elite-guard',
    name: 'Pasukan Penjaga Elit',
    icon: Skull,
    difficulty: 'Sulit',
    difficultyColor: 'text-red-400',
    bgColor: 'from-red-900/30 to-black/50',
    borderColor: 'border-red-500/30',
    image: 'https://images.unsplash.com/photo-1734122373993-36745ac6b688?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYW50YXN5JTIwd2FycmlvciUyMGVxdWlwbWVudCUyMGFybW9yfGVufDF8fHx8MTc3MjUyNzg1M3ww&ixlib=rb-4.1.0&q=80&w=1080',
    description: 'Pasukan elit terkuat di desa. Sistem battle segera hadir.',
    stats: { hp: 180, maxHp: 180, atk: 25, def: 25 },
    reward: { exp: 100, gold: 60 },
    hasBattle: false,
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type BattlePhase = 'player_turn' | 'animating' | 'enemy_turn' | 'victory' | 'defeat';

interface LogEntry {
  id: number;
  text: string;
  type: 'player' | 'enemy' | 'system' | 'miss' | 'crit';
}

interface FloatNum {
  id: number;
  value: number | string;
  x: number;
  color: string;
  target: 'player' | 'enemy';
}

// ─── Dummy attack flavour texts ───────────────────────────────────────────────

const DUMMY_ATTACK_TEXTS = [
  'Boneka Kayu bergetar sedikit... tidak berbuat apa-apa.',
  'Boneka Kayu mencoba menghantam... kayunya terlalu kaku!',
  'Boneka Kayu diam membisu. Serangan: 0 damage.',
  'Boneka Kayu berayun... tapi lengannya tidak sampai.',
  'Boneka Kayu "menyerang"! Kamu tidak merasakan apa-apa.',
  'Boneka Kayu melotot dengan mata bulatnya. Tidak ada efek.',
];

// ─── HP Bar ───────────────────────────────────────────────────────────────────

function HpBar({ hp, maxHp, color }: { hp: number; maxHp: number; color: string }) {
  const pct = Math.max(0, (hp / maxHp) * 100);
  const barColor =
    pct > 50 ? color :
    pct > 25 ? 'from-yellow-500 to-orange-500' :
    'from-red-600 to-red-400';

  return (
    <div className="w-full h-4 bg-black/50 rounded-full border border-white/10 overflow-hidden">
      <motion.div
        className={`h-full rounded-full bg-gradient-to-r ${barColor}`}
        style={{ boxShadow: pct > 50 ? `0 0 8px rgba(74,222,128,0.4)` : `0 0 8px rgba(239,68,68,0.5)` }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
    </div>
  );
}

// ─── Damage Float ─────────────────────────────────────────────────────────────

function DamageFloat({ float: f, onDone }: { float: FloatNum; onDone: () => void }) {
  return (
    <motion.div
      className={`absolute pointer-events-none font-bold text-2xl z-30 drop-shadow-lg select-none`}
      style={{ color: f.color, left: `${f.x}%`, top: '40%', transform: 'translateX(-50%)' }}
      initial={{ y: 0, opacity: 1, scale: 0.6 }}
      animate={{ y: -90, opacity: 0, scale: 1.2 }}
      transition={{ duration: 1.5, ease: 'easeOut' }}
      onAnimationComplete={onDone}
    >
      {typeof f.value === 'number' ? (f.value === 0 ? 'MISS!' : `-${f.value}`) : f.value}
    </motion.div>
  );
}

// ─── Wooden Dummy SVG sprite ──────────────────────────────────────────────────

function DummySvg({ shake }: { shake: boolean }) {
  return (
    <motion.div
      animate={shake ? { x: [-4, 6, -6, 4, 0], rotate: [-3, 3, -3, 2, 0] } : {}}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
      className="w-full h-full flex items-center justify-center"
    >
      <svg viewBox="0 0 100 160" xmlns="http://www.w3.org/2000/svg" className="w-28 h-36 drop-shadow-lg">
        {/* Post */}
        <rect x="46" y="100" width="8" height="55" rx="3" fill="#8B4513" />
        {/* Base */}
        <rect x="30" y="148" width="40" height="8" rx="4" fill="#5C2E00" />
        {/* Body */}
        <rect x="33" y="55" width="34" height="50" rx="6" fill="#CD853F" stroke="#8B4513" strokeWidth="2" />
        {/* Head */}
        <circle cx="50" cy="35" r="22" fill="#DEB887" stroke="#8B4513" strokeWidth="2" />
        {/* Face */}
        <circle cx="43" cy="32" r="3" fill="#5C2E00" />
        <circle cx="57" cy="32" r="3" fill="#5C2E00" />
        <path d="M43 44 Q50 48 57 44" stroke="#5C2E00" strokeWidth="2" fill="none" strokeLinecap="round" />
        {/* Arms */}
        <rect x="10" y="60" width="24" height="8" rx="4" fill="#CD853F" stroke="#8B4513" strokeWidth="1.5" />
        <rect x="66" y="60" width="24" height="8" rx="4" fill="#CD853F" stroke="#8B4513" strokeWidth="1.5" />
        {/* Nails */}
        <circle cx="14" cy="64" r="3" fill="#5C2E00" />
        <circle cx="86" cy="64" r="3" fill="#5C2E00" />
        {/* Chest cross detail */}
        <line x1="33" y1="70" x2="67" y2="100" stroke="#8B4513" strokeWidth="1" opacity="0.4" />
        <line x1="67" y1="70" x2="33" y2="100" stroke="#8B4513" strokeWidth="1" opacity="0.4" />
      </svg>
    </motion.div>
  );
}

// ─── Player Sprite ────────────────────────────────────────────────────────────

function PlayerSvg({ attack, guard }: { attack: boolean; guard: boolean }) {
  return (
    <motion.div
      animate={
        attack
          ? { x: [0, 40, 0], scaleX: [1, 1.1, 1] }
          : guard
          ? { y: [0, -6, 0] }
          : {}
      }
      transition={{ duration: 0.45, ease: 'easeInOut' }}
      className="w-full h-full flex items-center justify-center"
    >
      <svg viewBox="0 0 100 160" xmlns="http://www.w3.org/2000/svg" className="w-28 h-36 drop-shadow-lg">
        {/* Legs */}
        <rect x="36" y="118" width="12" height="36" rx="5" fill="#4B3F72" />
        <rect x="52" y="118" width="12" height="36" rx="5" fill="#4B3F72" />
        {/* Boots */}
        <rect x="33" y="144" width="18" height="10" rx="4" fill="#2D1B69" />
        <rect x="49" y="144" width="18" height="10" rx="4" fill="#2D1B69" />
        {/* Body/Armor */}
        <rect x="28" y="68" width="44" height="55" rx="8" fill="#5B21B6" stroke="#7C3AED" strokeWidth="2" />
        {/* Armor detail */}
        <path d="M28 80 Q50 74 72 80" stroke="#7C3AED" strokeWidth="1.5" fill="none" />
        <path d="M36 90 L50 96 L64 90" stroke="#A78BFA" strokeWidth="1" fill="none" />
        {/* Head */}
        <circle cx="50" cy="38" r="22" fill="#FBBF24" stroke="#D97706" strokeWidth="1.5" />
        {/* Helm */}
        <path d="M28 34 Q50 10 72 34" fill="#4B3F72" stroke="#7C3AED" strokeWidth="2" />
        <rect x="26" y="30" width="48" height="12" rx="4" fill="#5B21B6" stroke="#7C3AED" strokeWidth="1.5" />
        {/* Face */}
        <circle cx="43" cy="38" r="3" fill="#1E1B4B" />
        <circle cx="57" cy="38" r="3" fill="#1E1B4B" />
        <path d="M44 50 Q50 53 56 50" stroke="#D97706" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        {/* Left arm (shield arm) */}
        <rect x="6" y="72" width="22" height="10" rx="5" fill="#5B21B6" stroke="#7C3AED" strokeWidth="1.5" />
        {/* Shield */}
        {guard && (
          <path d="M2 65 L18 60 L18 90 Q10 95 2 90 Z" fill="#7C3AED" stroke="#A78BFA" strokeWidth="1.5" opacity="0.9" />
        )}
        {/* Right arm (sword arm) */}
        <motion.g
          animate={attack ? { rotate: [-30, 30, -10, 0] } : {}}
          transition={{ duration: 0.4 }}
          style={{ transformOrigin: '72px 77px' }}
        >
          <rect x="72" y="72" width="22" height="10" rx="5" fill="#5B21B6" stroke="#7C3AED" strokeWidth="1.5" />
          {/* Sword */}
          <rect x="88" y="54" width="5" height="32" rx="2" fill="#D1D5DB" stroke="#9CA3AF" strokeWidth="1" />
          <rect x="83" y="75" width="15" height="4" rx="2" fill="#D97706" />
          <rect x="89" y="51" width="3" height="8" rx="1.5" fill="#F59E0B" />
        </motion.g>
      </svg>
    </motion.div>
  );
}

// ─── Battle Screen ────────────────────────────────────────────────────────────

interface BattleScreenProps {
  opponent: typeof TRAINING_OPPONENTS[0];
  playerName: string;
  playerAtk: number;
  playerMaxHp: number;
  onEnd: (result: 'victory' | 'defeat', rewards?: { exp: number; gold: number }) => void;
}

function BattleScreen({ opponent, playerName, playerAtk, playerMaxHp, onEnd }: BattleScreenProps) {
  const [playerHp, setPlayerHp]   = useState(playerMaxHp);
  const [enemyHp, setEnemyHp]     = useState(opponent.stats.maxHp);
  const [phase, setPhase]         = useState<BattlePhase>('player_turn');
  const [log, setLog]             = useState<LogEntry[]>([
    { id: 0, text: `⚔️ Pertarungan dimulai! ${playerName} vs ${opponent.name}`, type: 'system' },
    { id: 1, text: '🎯 Giliranmu — pilih aksimu!', type: 'system' },
  ]);
  const [floats, setFloats]       = useState<FloatNum[]>([]);
  const [playerAnim, setPlayerAnim] = useState<'idle' | 'attack' | 'guard'>('idle');
  const [dummyShake, setDummyShake] = useState(false);
  const [isGuarding, setIsGuarding] = useState(false);

  const logId    = useRef(2);
  const floatId  = useRef(0);
  const phaseRef = useRef<BattlePhase>('player_turn');

  phaseRef.current = phase;

  const addLog = useCallback((text: string, type: LogEntry['type'] = 'system') => {
    const id = logId.current++;
    setLog(prev => [...prev.slice(-8), { id, text, type }]);
  }, []);

  const spawnFloat = useCallback((value: number | string, target: 'player' | 'enemy', color: string) => {
    const id = floatId.current++;
    const x  = target === 'enemy' ? 65 + (Math.random() * 10 - 5) : 32 + (Math.random() * 10 - 5);
    setFloats(prev => [...prev, { id, value, x, color, target }]);
  }, []);

  const removeFloat = useCallback((id: number) => {
    setFloats(prev => prev.filter(f => f.id !== id));
  }, []);

  // ── Player Actions ──────────────────────────────────────────────────────────

  const handleAttack = useCallback(() => {
    if (phaseRef.current !== 'player_turn') return;
    setPhase('animating');
    setIsGuarding(false);

    // Calculate damage
    const rawDmg = Math.max(1, playerAtk - opponent.stats.def);
    const isCrit = Math.random() < 0.15;
    const dmg    = isCrit ? Math.floor(rawDmg * 1.8) : rawDmg;

    // Player attack animation
    setPlayerAnim('attack');
    setTimeout(() => setPlayerAnim('idle'), 500);

    setTimeout(() => {
      setDummyShake(true);
      setTimeout(() => setDummyShake(false), 450);

      spawnFloat(dmg, 'enemy', isCrit ? '#FBBF24' : '#F87171');
      setEnemyHp(prev => {
        const next = Math.max(0, prev - dmg);
        if (isCrit) {
          addLog(`💥 SERANGAN KRITIS! ${playerName} menghantam Boneka Kayu! -${dmg} HP`, 'crit');
        } else {
          addLog(`⚔️ ${playerName} menyerang Boneka Kayu! -${dmg} HP`, 'player');
        }

        if (next <= 0) {
          setTimeout(() => {
            setPhase('victory');
            addLog('🏆 Boneka Kayu hancur berkeping-keping! Kemenangan!', 'system');
          }, 600);
        } else {
          setTimeout(() => startEnemyTurn(), 700);
        }
        return next;
      });
    }, 300);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerAtk, opponent.stats.def, playerName]);

  const handleGuard = useCallback(() => {
    if (phaseRef.current !== 'player_turn') return;
    setPhase('animating');
    setIsGuarding(true);
    setPlayerAnim('guard');
    setTimeout(() => setPlayerAnim('idle'), 400);

    addLog(`🛡️ ${playerName} bersiap bertahan! DEF meningkat sementara.`, 'player');
    setTimeout(() => startEnemyTurn(), 700);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerName]);

  // ── Enemy Turn ──────────────────────────────────────────────────────────────

  const startEnemyTurn = useCallback(() => {
    setPhase('enemy_turn');
    addLog('🪵 Giliran Boneka Kayu...', 'system');

    setTimeout(() => {
      const flavour = DUMMY_ATTACK_TEXTS[Math.floor(Math.random() * DUMMY_ATTACK_TEXTS.length)];

      // Dummy "lunges" forward
      setDummyShake(true);
      setTimeout(() => setDummyShake(false), 400);

      setTimeout(() => {
        // Always 0 damage
        spawnFloat('0', 'player', '#94A3B8');
        addLog(`🌀 ${flavour}`, 'miss');
        addLog(`💨 ${playerName} tidak menerima damage! (0 damage)`, 'enemy');

        setIsGuarding(false);
        setTimeout(() => {
          setPhase('player_turn');
          addLog('🎯 Giliranmu — pilih aksimu!', 'system');
        }, 600);
      }, 500);
    }, 900);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerName]);

  // ── Render ──────────────────────────────────────────────────────────────────

  const enemyHpPct = (enemyHp / opponent.stats.maxHp) * 100;
  const playerHpPct = (playerHp / playerMaxHp) * 100;

  return (
    <div className="bg-gradient-to-b from-gray-900 via-red-950/40 to-black rounded-2xl border-2 border-red-500/40 overflow-hidden shadow-2xl shadow-red-900/40">

      {/* ── Arena Header ── */}
      <div className="bg-gradient-to-r from-red-900/60 to-purple-900/60 px-6 py-3 border-b border-red-500/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${
            phase === 'victory' ? 'bg-green-400' :
            phase === 'defeat'  ? 'bg-red-400'  :
            phase === 'player_turn' ? 'bg-yellow-400' : 'bg-gray-400'
          }`} />
          <span className="text-sm font-semibold text-gray-300">
            {phase === 'victory' ? '🏆 KEMENANGAN' :
             phase === 'defeat'  ? '💀 KEKALAHAN' :
             phase === 'player_turn' ? 'Giliran Pemain' :
             phase === 'enemy_turn'  ? 'Giliran Musuh' :
             'Memproses...'}
          </span>
        </div>
        <span className="text-xs text-gray-500 font-mono">ARENA LATIHAN</span>
      </div>

      {/* ── HP Bars ── */}
      <div className="grid grid-cols-2 gap-4 px-6 pt-5 pb-3">
        {/* Player */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-sm font-bold text-purple-300">{playerName}</span>
            <span className="text-xs text-gray-400 font-mono">{playerHp}/{playerMaxHp}</span>
          </div>
          <HpBar hp={playerHp} maxHp={playerMaxHp} color="from-green-500 to-emerald-400" />
          {isGuarding && (
            <motion.div
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              className="text-xs text-blue-400 mt-1 flex items-center gap-1"
            >
              <ShieldCheck className="w-3 h-3" /> Bertahan aktif
            </motion.div>
          )}
        </div>

        {/* Enemy */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-sm font-bold text-red-300">{opponent.name}</span>
            <span className="text-xs text-gray-400 font-mono">{enemyHp}/{opponent.stats.maxHp}</span>
          </div>
          <HpBar hp={enemyHp} maxHp={opponent.stats.maxHp} color="from-red-500 to-orange-400" />
        </div>
      </div>

      {/* ── Battle Field ── */}
      <div className="relative mx-6 my-2 rounded-xl overflow-hidden border border-white/5"
        style={{ height: 220, background: 'linear-gradient(180deg, #0f172a 0%, #1a0a2e 60%, #0f172a 100%)' }}>

        {/* Ground line */}
        <div className="absolute bottom-10 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />

        {/* Floating damage numbers */}
        {floats.map(f => (
          <DamageFloat key={f.id} float={f} onDone={() => removeFloat(f.id)} />
        ))}

        {/* VS */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-white/10 font-black" style={{ fontSize: '5rem' }}>VS</span>
        </div>

        {/* Player (left) */}
        <div className="absolute bottom-8 left-6" style={{ width: 120, height: 160 }}>
          <PlayerSvg attack={playerAnim === 'attack'} guard={playerAnim === 'guard' || isGuarding} />
        </div>

        {/* Enemy (right) — mirrored */}
        <div className="absolute bottom-8 right-6" style={{ width: 120, height: 160, transform: 'scaleX(-1)' }}>
          {phase === 'victory' ? (
            <motion.div
              className="w-full h-full flex items-end justify-center pb-4"
              animate={{ rotate: 90, y: 20, opacity: 0.4 }}
              transition={{ duration: 0.6 }}
            >
              <DummySvg shake={false} />
            </motion.div>
          ) : (
            <DummySvg shake={dummyShake} />
          )}
        </div>

        {/* Turn indicator banner */}
        <AnimatePresence>
          {phase === 'enemy_turn' && (
            <motion.div
              className="absolute top-3 left-1/2 -translate-x-1/2 bg-red-600/80 border border-red-400/50 rounded-full px-4 py-1 text-xs font-bold text-white backdrop-blur-sm"
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            >
              🪵 Boneka Kayu bergerak...
            </motion.div>
          )}
          {phase === 'player_turn' && (
            <motion.div
              className="absolute top-3 left-1/2 -translate-x-1/2 bg-yellow-600/80 border border-yellow-400/50 rounded-full px-4 py-1 text-xs font-bold text-white backdrop-blur-sm"
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            >
              ⚔️ Giliranmu!
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Battle Log ── */}
      <div className="mx-6 mb-4 bg-black/50 border border-white/10 rounded-xl overflow-hidden">
        <div className="px-3 py-1.5 border-b border-white/5">
          <span className="text-xs text-gray-500 font-semibold tracking-wider uppercase">Log Pertarungan</span>
        </div>
        <div className="p-3 space-y-1.5 max-h-32 overflow-y-auto" id="battle-log">
          <AnimatePresence initial={false}>
            {log.map(entry => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -10, height: 0 }}
                animate={{ opacity: 1, x: 0, height: 'auto' }}
                transition={{ duration: 0.25 }}
                className={`text-xs leading-relaxed ${
                  entry.type === 'player' ? 'text-purple-300' :
                  entry.type === 'enemy'  ? 'text-red-300'    :
                  entry.type === 'crit'   ? 'text-yellow-300 font-bold' :
                  entry.type === 'miss'   ? 'text-gray-500 italic' :
                  'text-gray-400'
                }`}
              >
                {entry.text}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Action Buttons / Result ── */}
      <div className="px-6 pb-6">
        <AnimatePresence mode="wait">

          {/* Victory */}
          {phase === 'victory' && (
            <motion.div
              key="victory"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="text-center bg-gradient-to-br from-yellow-900/40 to-green-900/30 border-2 border-yellow-500/50 rounded-xl p-6"
            >
              <div className="text-5xl mb-3">🏆</div>
              <h3 className="text-2xl font-black text-yellow-300 mb-1">KEMENANGAN!</h3>
              <p className="text-gray-300 text-sm mb-4">
                Boneka Kayu telah dihancurkan. Kamu mendapat:
              </p>
              <div className="flex justify-center gap-6 mb-5">
                <div className="bg-purple-900/40 border border-purple-500/40 rounded-lg px-5 py-3">
                  <p className="text-xs text-gray-400 mb-1">EXP</p>
                  <p className="text-xl font-bold text-purple-300">+{opponent.reward.exp}</p>
                </div>
                <div className="bg-yellow-900/40 border border-yellow-500/40 rounded-lg px-5 py-3">
                  <p className="text-xs text-gray-400 mb-1">Gold</p>
                  <p className="text-xl font-bold text-yellow-300">+{opponent.reward.gold} 🪙</p>
                </div>
              </div>
              <button
                onClick={() => onEnd('victory', opponent.reward)}
                className="w-full py-3 bg-gradient-to-r from-yellow-600 to-green-600 hover:from-yellow-500 hover:to-green-500 rounded-lg font-bold text-lg transition-all shadow-lg shadow-yellow-500/30 hover:scale-[1.02]"
              >
                Selesai & Ambil Reward
              </button>
            </motion.div>
          )}

          {/* Player action buttons */}
          {(phase === 'player_turn' || phase === 'animating') && (
            <motion.div key="actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {/* Stats row */}
              <div className="flex justify-center gap-4 mb-4 text-xs text-gray-500">
                <span>⚔️ ATK: <span className="text-orange-400 font-semibold">{playerAtk}</span></span>
                <span>🛡️ DEF musuh: <span className="text-blue-400 font-semibold">{opponent.stats.def}</span></span>
                <span>💥 Est. DMG: <span className="text-red-400 font-semibold">{Math.max(1, playerAtk - opponent.stats.def)}</span></span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <motion.button
                  onClick={handleAttack}
                  disabled={phase !== 'player_turn'}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  className="flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-red-700 to-orange-700 hover:from-red-600 hover:to-orange-600 disabled:from-gray-700 disabled:to-gray-800 disabled:opacity-50 rounded-xl font-bold text-lg transition-colors shadow-lg shadow-red-900/40"
                >
                  <Sword className="w-5 h-5" /> Serang
                </motion.button>
                <motion.button
                  onClick={handleGuard}
                  disabled={phase !== 'player_turn'}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  className="flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 disabled:from-gray-700 disabled:to-gray-800 disabled:opacity-50 rounded-xl font-bold text-lg transition-colors shadow-lg shadow-blue-900/40"
                >
                  <ShieldCheck className="w-5 h-5" /> Bertahan
                </motion.button>
              </div>
              <p className="text-center text-xs text-gray-600 mt-2">
                💡 Boneka Kayu tidak memiliki attack — setiap gilirannya selalu 0 damage
              </p>
            </motion.div>
          )}

          {/* Enemy turn — disabled actions */}
          {phase === 'enemy_turn' && (
            <motion.div key="enemy-turn" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="grid grid-cols-2 gap-3 opacity-40 pointer-events-none">
                <div className="flex items-center justify-center gap-2 py-4 bg-gray-800 rounded-xl font-bold text-lg text-gray-500">
                  <Sword className="w-5 h-5" /> Serang
                </div>
                <div className="flex items-center justify-center gap-2 py-4 bg-gray-800 rounded-xl font-bold text-lg text-gray-500">
                  <ShieldCheck className="w-5 h-5" /> Bertahan
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 mt-3">
                <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-orange-400">Boneka Kayu sedang "berpikir"...</p>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Main ArenaPage ───────────────────────────────────────────────────────────

export default function ArenaPage() {
  const { player, updatePlayer, completeTutorialStep } = useGame();
  const navigate = useNavigate();
  const [battleOpponent, setBattleOpponent] = useState<typeof TRAINING_OPPONENTS[0] | null>(null);
  const [battleResult, setBattleResult]     = useState<{ result: 'victory' | 'defeat'; rewards?: { exp: number; gold: number } } | null>(null);

  if (!player) return null;

  const isQuestActive = player.tutorialProgress && !player.tutorialProgress.trainedAtArena;

  const handleStartBattle = (opp: typeof TRAINING_OPPONENTS[0]) => {
    setBattleResult(null);
    setBattleOpponent(opp);
  };

  const handleBattleEnd = async (result: 'victory' | 'defeat', rewards?: { exp: number; gold: number }) => {
    setBattleResult({ result, rewards });

    if (result === 'victory' && rewards) {
      const newGold = (player.gold || 0) + rewards.gold;
      const newExp  = (player.experience || 0) + rewards.exp;
      await updatePlayer({ gold: newGold, experience: newExp });

      if (isQuestActive) {
        await completeTutorialStep('arena');
      }
    }

    setBattleOpponent(null);
  };

  // ── POST-BATTLE RESULT ──────────────────────────────────────────────────────
  if (battleResult) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="bg-gradient-to-br from-gray-900 to-black border-2 border-purple-500/40 rounded-2xl p-8 text-center shadow-2xl">
          <div className="text-6xl mb-4">{battleResult.result === 'victory' ? '🏆' : '💀'}</div>
          <h2 className="text-3xl font-black text-transparent bg-gradient-to-r from-yellow-400 to-green-400 bg-clip-text mb-2">
            {battleResult.result === 'victory' ? 'Kemenangan!' : 'Kekalahan!'}
          </h2>
          {battleResult.rewards && (
            <div className="mt-4 mb-6 flex justify-center gap-4">
              <div className="bg-purple-900/40 border border-purple-500/40 rounded-lg px-6 py-3">
                <p className="text-xs text-gray-400">EXP Didapat</p>
                <p className="text-2xl font-bold text-purple-300">+{battleResult.rewards.exp}</p>
              </div>
              <div className="bg-yellow-900/40 border border-yellow-500/40 rounded-lg px-6 py-3">
                <p className="text-xs text-gray-400">Gold Didapat</p>
                <p className="text-2xl font-bold text-yellow-300">+{battleResult.rewards.gold} 🪙</p>
              </div>
            </div>
          )}
          <div className="space-y-3">
            {isQuestActive && battleResult.result === 'victory' && (
              <button
                onClick={() => { setBattleResult(null); navigate('/game/village/chief-house'); }}
                className="w-full py-3 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 rounded-xl font-bold transition-all shadow-lg hover:scale-[1.02]"
              >
                ✅ Lanjut ke Kepala Desa
              </button>
            )}
            <button
              onClick={() => setBattleResult(null)}
              className="w-full py-3 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 rounded-xl font-bold transition-all shadow-lg hover:scale-[1.02]"
            >
              ⚔️ Latihan Lagi
            </button>
            <button
              onClick={() => { setBattleResult(null); navigate('/game/village'); }}
              className="w-full py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-xl font-medium transition-colors"
            >
              ← Kembali ke Desa
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── ACTIVE BATTLE ───────────────────────────────────────────────────────────
  if (battleOpponent) {
    return (
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => setBattleOpponent(null)}
          className="mb-4 flex items-center gap-2 text-purple-300 hover:text-purple-200 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke pilihan lawan
        </button>
        <BattleScreen
          opponent={battleOpponent}
          playerName={player.name}
          playerAtk={player.stats.physicalAtk}
          playerMaxHp={player.stats.hp}
          onEnd={handleBattleEnd}
        />
      </div>
    );
  }

  // ── OPPONENT SELECTION ──────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto">
      <button onClick={() => navigate('/game/village')}
        className="mb-6 flex items-center gap-2 text-purple-300 hover:text-purple-200 transition-colors">
        <ArrowLeft className="w-5 h-5" />
        <span>Kembali ke Desa</span>
      </button>

      <div className="bg-gradient-to-br from-red-900/40 to-black/60 backdrop-blur-sm border-2 border-red-500/30 rounded-xl overflow-hidden">
        {/* Arena image */}
        <div className="relative h-56">
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1727986760616-0d8f65a6ab92?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cmFpbmluZyUyMGFyZW5hJTIwbWVkaWV2YWx8ZW58MXx8fHwxNzcyNTI3ODUzfDA&ixlib=rb-4.1.0&q=80&w=1080"
            alt="Arena" className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
          <div className="absolute bottom-4 left-6">
            <h1 className="text-3xl font-bold text-white mb-1">Arena Latihan</h1>
            <p className="text-red-200">Asah kemampuan bertarungmu</p>
          </div>
        </div>

        <div className="p-6">
          {/* Tutorial quest banner */}
          {isQuestActive && (
            <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-4 mb-6 flex items-start gap-3">
              <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 animate-pulse flex-shrink-0" />
              <div>
                <h3 className="font-bold text-yellow-300 mb-1">Quest Tutorial Aktif</h3>
                <p className="text-sm text-yellow-200/80">
                  Kalahkan Boneka Kayu untuk menyelesaikan latihan pertamamu!
                </p>
              </div>
            </div>
          )}

          <h2 className="text-xl font-bold text-red-300 mb-4">Pilih Lawan Latihan</h2>

          <div className="grid md:grid-cols-2 gap-5">
            {TRAINING_OPPONENTS.map((opp) => {
              const Icon = opp.icon;
              return (
                <motion.div
                  key={opp.id}
                  whileHover={opp.hasBattle ? { scale: 1.02 } : {}}
                  className={`bg-gradient-to-br ${opp.bgColor} border-2 ${opp.borderColor} rounded-xl overflow-hidden ${opp.hasBattle ? 'cursor-pointer' : 'opacity-70'}`}
                >
                  <div className="relative h-36">
                    <ImageWithFallback src={opp.image} alt={opp.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                    <div className="absolute top-3 right-3 w-10 h-10 bg-red-600/80 backdrop-blur-sm rounded-full flex items-center justify-center border border-red-400/50">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    {!opp.hasBattle && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="bg-black/70 text-gray-300 text-xs px-3 py-1 rounded-full border border-gray-600">🔒 Segera Hadir</span>
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-white">{opp.name}</h3>
                      <span className={`text-xs font-semibold ${opp.difficultyColor}`}>{opp.difficulty}</span>
                    </div>
                    <p className="text-xs text-gray-400 mb-3">{opp.description}</p>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 text-center mb-3 bg-black/30 rounded-lg p-2">
                      <div>
                        <p className="text-xs text-gray-500">HP</p>
                        <p className="text-sm font-bold text-red-300">{opp.stats.hp}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">ATK</p>
                        <p className="text-sm font-bold text-orange-300">{opp.stats.atk}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">DEF</p>
                        <p className="text-sm font-bold text-blue-300">{opp.stats.def}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                      <span>EXP: <span className="text-purple-400 font-semibold">+{opp.reward.exp}</span></span>
                      <span>Gold: <span className="text-yellow-400 font-semibold">+{opp.reward.gold} 🪙</span></span>
                    </div>

                    <button
                      onClick={() => opp.hasBattle && handleStartBattle(opp)}
                      disabled={!opp.hasBattle}
                      className={`w-full py-2.5 rounded-lg font-bold text-sm transition-all shadow-md ${
                        opp.hasBattle
                          ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 hover:shadow-red-500/30 hover:scale-[1.02]'
                          : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                      }`}
                    >
                      {opp.hasBattle ? '⚔️ Mulai Battle' : '🔒 Belum Tersedia'}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
