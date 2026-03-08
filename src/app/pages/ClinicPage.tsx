import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, HeartPulse, CheckCircle, Sparkles, ArrowLeft, Zap, Droplets } from 'lucide-react';
import { useGame } from '../contexts/GameContext';
import { calcDerived } from '../data/statsCalc';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { maleImg, femaleImg } from '../data/imageAssets';

import { MenuAccordion, AccordionItem } from '../components/MenuAccordion';

const HP_HEAL_DURATION    = 30; // seconds
const REFILL_DURATION     = 10; // seconds for stamina/mana refill
const CLINIC_TARGET_HP    = 100;

type ClinicTab = 'hp' | 'stamina' | 'mana';
type ClinicState = 'idle' | 'healing' | 'healed';

// ── Refill tier options ────────────────────────────────────────────────────────
const REFILL_TIERS = [
  { label: '30%', pct: 0.30, goldCost: 300 },
  { label: '50%', pct: 0.50, goldCost: 400 },
  { label: '100%', pct: 1.00, goldCost: 700 },
];

// ── Sub-components ────────────────────────────────────────────────────────────
function HealParticle({ index }: { index: number }) {
  const x     = 5 + (index * 17.3) % 90;
  const delay = (index * 0.6) % 4;
  const dur   = 4 + (index * 0.8) % 4;
  return (
    <motion.div
      className="absolute pointer-events-none select-none text-green-400"
      style={{ left: `${x}%`, bottom: -20, fontSize: 14 + (index % 3) * 4 }}
      initial={{ y: 0, opacity: 0 }}
      animate={{ y: -400, opacity: [0, 0.8, 0.8, 0], x: [0, 15 * Math.sin(index), -10, 0] }}
      transition={{ duration: dur, delay, repeat: Infinity, ease: 'easeOut' }}
    >
      {['✦','❤','✿','⬡','✧'][index % 5]}
    </motion.div>
  );
}

function CircularTimer({ elapsed, total, color }: { elapsed: number; total: number; color: string }) {
  const r    = 40;
  const circ = 2 * Math.PI * r;
  const pct  = Math.min(1, elapsed / total);
  const dash = pct * circ;
  return (
    <svg width={96} height={96} viewBox="0 0 96 96" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={48} cy={48} r={r} fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth={7} />
      <motion.circle cx={48} cy={48} r={r} fill="none"
        stroke={color} strokeWidth={7} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={circ - dash}
        style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
      />
    </svg>
  );
}

// ── ResourceBar ───────────────────────────────────────────────────────────────
function ResourceBar({ current, max, colorFrom, colorTo, glow }: {
  current: number; max: number; colorFrom: string; colorTo: string; glow: string;
}) {
  const pct = max > 0 ? Math.min(100, (current / max) * 100) : 0;
  return (
    <div style={{ height:8, background:'rgba(0,0,0,0.5)', borderRadius:99, overflow:'hidden', border:`1px solid ${glow}30` }}>
      <motion.div
        animate={{ width:`${pct}%` }} transition={{ duration:0.5, ease:'easeOut' }}
        style={{ height:'100%', borderRadius:99, background:`linear-gradient(90deg, ${colorFrom}, ${colorTo})`, boxShadow:`0 0 10px ${glow}60` }}
      />
    </div>
  );
}

// ── RefillPanel ───────────────────────────────────────────────────────────────
interface RefillPanelProps {
  type       : 'stamina' | 'mana';
  current    : number;
  max        : number;
  gold       : number;
  onRefill   : (amount: number, cost: number) => void;
  refilling  : boolean;
  refillSecs : number;
  refillTotal: number;
  refillDone : boolean;
}

function RefillPanel({ type, current, max, gold, onRefill, refilling, refillSecs, refillTotal, refillDone }: RefillPanelProps) {
  const isStamina  = type === 'stamina';
  const label      = isStamina ? 'Stamina' : 'Mana';
  const icon       = isStamina ? '⚡' : '💙';
  const color      = isStamina ? '#fbbf24' : '#818cf8';
  const colorFrom  = isStamina ? '#d97706' : '#4f46e5';
  const colorTo    = isStamina ? '#fbbf24' : '#818cf8';
  const glow       = isStamina ? '#fbbf24' : '#818cf8';
  const bgStyle    = isStamina
    ? { background:'rgba(120,53,15,0.3)', border:'1px solid rgba(251,191,36,0.3)' }
    : { background:'rgba(30,27,75,0.4)', border:'1px solid rgba(129,140,248,0.3)' };
  const timerColor = isStamina ? '#fbbf24' : '#818cf8';
  const needed     = max - current;
  const full       = current >= max;

  return (
    <div className="space-y-4">
      {/* Current status */}
      <div className="flex items-center gap-4 p-4 rounded-xl" style={bgStyle}>
        <div style={{ fontSize:'2rem' }}>{icon}</div>
        <div className="flex-1">
          <div className="flex justify-between items-center mb-2">
            <span style={{ color, fontFamily:'serif', fontWeight:700, fontSize:'0.9rem' }}>{label}</span>
            <motion.span
              key={current}
              initial={{ scale:1.2 }} animate={{ scale:1 }} transition={{ duration:0.3 }}
              style={{ color, fontWeight:900, fontFamily:'monospace', fontSize:'1rem' }}
            >
              {current} / {max}
            </motion.span>
          </div>
          <ResourceBar current={current} max={max} colorFrom={colorFrom} colorTo={colorTo} glow={glow} />
          <div className="flex justify-between mt-1">
            <span style={{ fontSize:'0.62rem', color:'#6b7280' }}>Kosong</span>
            <span style={{ fontSize:'0.62rem', color }}>
              {full ? '✓ Penuh' : `Kurang ${needed} ${label}`}
            </span>
            <span style={{ fontSize:'0.62rem', color:'#6b7280' }}>Max {max}</span>
          </div>
        </div>
      </div>

      {/* Refill in progress */}
      <AnimatePresence>
        {refilling && (
          <motion.div
            initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-10 }}
            className="flex items-center justify-center gap-4 p-4 rounded-xl"
            style={{ background:'rgba(0,0,0,0.5)', border:`1px solid ${glow}40` }}
          >
            <div className="relative">
              <CircularTimer elapsed={refillTotal - refillSecs} total={refillTotal} color={timerColor} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span style={{ fontFamily:'serif', fontWeight:900, fontSize:'1.3rem', color:timerColor, lineHeight:1 }}>{refillSecs}</span>
                <span style={{ fontSize:'0.55rem', color:'#6b7280' }}>dtk</span>
              </div>
            </div>
            <div>
              <p style={{ color:timerColor, fontFamily:'serif', fontWeight:700, fontSize:'0.85rem' }}>
                Memulihkan {label}...
              </p>
              <p style={{ color:'#9ca3af', fontSize:'0.72rem', marginTop:2 }}>
                Proses pemulihan berlangsung {refillTotal} detik
              </p>
              <motion.div animate={{ opacity:[0.5,1,0.5] }} transition={{ duration:1.2, repeat:Infinity }}
                style={{ display:'flex', alignItems:'center', gap:4, marginTop:4 }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:timerColor }} />
                <span style={{ fontSize:'0.62rem', color:timerColor }}>Klinik sedang bekerja...</span>
              </motion.div>
            </div>
          </motion.div>
        )}
        {refillDone && !refilling && (
          <motion.div
            initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }}
            className="flex items-center justify-center gap-3 p-3 rounded-xl"
            style={{ background:`${glow}15`, border:`1px solid ${glow}50` }}
          >
            <CheckCircle style={{ color:glow, width:20, height:20 }} />
            <span style={{ color:glow, fontFamily:'serif', fontWeight:700, fontSize:'0.85rem' }}>
              {label} berhasil dipulihkan!
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tier buttons */}
      {!refilling && (
        <div className="space-y-2">
          <p style={{ fontSize:'0.65rem', color:'#6b7280', letterSpacing:'0.15em' }}>
            ✦ PILIH JUMLAH PEMULIHAN ✦
          </p>
          {REFILL_TIERS.map(tier => {
            const restoreAmt  = Math.floor(max * tier.pct);
            const afterRefill = Math.min(max, current + restoreAmt);
            const canAfford   = gold >= tier.goldCost;
            const alreadyFull = full;
            const disabled    = !canAfford || alreadyFull;
            return (
              <motion.button
                key={tier.label}
                onClick={() => !disabled && onRefill(restoreAmt, tier.goldCost)}
                whileHover={!disabled ? { scale:1.02, x:2 } : {}}
                whileTap={!disabled ? { scale:0.97 } : {}}
                disabled={disabled}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all"
                style={{
                  background: disabled
                    ? 'rgba(30,30,30,0.4)'
                    : `linear-gradient(90deg, ${colorFrom}20, ${colorTo}10)`,
                  border: `1px solid ${disabled ? 'rgba(75,85,99,0.3)' : `${glow}50`}`,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.5 : 1,
                }}
              >
                <div className="flex items-center gap-3">
                  <span style={{ fontSize:'1.1rem' }}>{icon}</span>
                  <div className="text-left">
                    <p style={{ color: disabled ? '#6b7280' : color, fontFamily:'serif', fontWeight:700, fontSize:'0.85rem' }}>
                      Pulihkan {tier.label}
                    </p>
                    <p style={{ color:'#9ca3af', fontSize:'0.65rem' }}>
                      +{restoreAmt} {label} → {afterRefill}/{max}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p style={{ color: canAfford ? '#fbbf24' : '#ef4444', fontWeight:700, fontSize:'0.85rem' }}>
                    {tier.goldCost} 🪙
                  </p>
                  {!canAfford && (
                    <p style={{ color:'#ef4444', fontSize:'0.6rem' }}>Gold kurang</p>
                  )}
                  {alreadyFull && canAfford && (
                    <p style={{ color:'#6b7280', fontSize:'0.6rem' }}>Sudah penuh</p>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main ClinicPage ────────────────────────────────────────────────────────────
export default function ClinicPage() {
  const { player, updateHp, updateStamina, updateMana, updatePlayer } = useGame();
  const navigate = useNavigate();

  const curHp    = player?.stats.hp ?? 0;
  const isDead   = curHp < 1;
  const needsHp  = curHp < CLINIC_TARGET_HP;
  const derived  = player ? calcDerived(player) : null;

  const maxStam  = derived?.stamina ?? 100;
  const maxMana  = derived?.mana ?? 0;
  const curStam  = player?.currentStamina !== undefined ? Math.min(player.currentStamina, maxStam) : maxStam;
  const curMana  = player?.currentMana !== undefined ? Math.min(player.currentMana, maxMana) : maxMana;

  // ── Active tab ──────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<ClinicTab>(() => needsHp ? 'hp' : 'stamina');

  // ── HP healing state ────────────────────────────────────────────────────────
  const [hpState, setHpState]      = useState<ClinicState>(() => needsHp ? 'healing' : 'healed');
  const [hpElapsed, setHpElapsed]  = useState(0);
  const [displayHp, setDisplayHp]  = useState(curHp);
  const hpTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hpHealedRef = useRef(false);
  const startHpRef  = useRef(curHp);

  // ── Stamina refill state ────────────────────────────────────────────────────
  const [stamRefilling,  setStamRefilling]  = useState(false);
  const [stamSecs,       setStamSecs]       = useState(REFILL_DURATION);
  const [stamDone,       setStamDone]       = useState(false);
  const stamTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Mana refill state ───────────────────────────────────────────────────────
  const [manaRefilling,  setManaRefilling]  = useState(false);
  const [manaSecs,       setManaSecs]       = useState(REFILL_DURATION);
  const [manaDone,       setManaDone]       = useState(false);
  const manaTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Track live values for UI during refill ───────────────────────────────────
  const [liveStam, setLiveStam] = useState(curStam);
  const [liveMana, setLiveMana] = useState(curMana);
  const stamTargetRef = useRef(curStam);
  const manaTargetRef = useRef(curMana);

  // FIX: Inisialisasi sekali saat player pertama kali load — jangan sync terus-menerus.
  // Sync effect sebelumnya menyebabkan liveStam/liveMana ditimpa oleh nilai lama DB
  // tepat setelah refill selesai (karena player state di-update dari DB asinkron,
  // memicu effect dengan curStam/curMana lama sebelum DB commit).
  const liveInitRef = useRef(false);
  useEffect(() => {
    if (!player || liveInitRef.current) return;
    liveInitRef.current = true;
    setLiveStam(curStam);
    setLiveMana(curMana);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player]);

  // Block Back for dead players
  useEffect(() => {
    if (hpState !== 'healing' || !isDead) return;
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [hpState, isDead]);

  // HP healing countdown
  useEffect(() => {
    if (hpState !== 'healing') return;
    startHpRef.current = curHp;
    hpTimerRef.current = setInterval(() => {
      setHpElapsed(prev => {
        const next = prev + 1;
        const prog = next / HP_HEAL_DURATION;
        const gain = (CLINIC_TARGET_HP - startHpRef.current) * prog;
        setDisplayHp(Math.min(CLINIC_TARGET_HP, Math.floor(startHpRef.current + gain)));
        return next;
      });
    }, 1000);
    return () => { if (hpTimerRef.current) clearInterval(hpTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hpState]);

  // HP healing complete
  useEffect(() => {
    if (hpState !== 'healing' || hpElapsed < HP_HEAL_DURATION || hpHealedRef.current) return;
    hpHealedRef.current = true;
    if (hpTimerRef.current) clearInterval(hpTimerRef.current);
    updateHp(CLINIC_TARGET_HP).then(() => setHpState('healed'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hpElapsed, hpState]);

  // Auto-redirect after HP healed — ONLY for dead players who are now healed
  useEffect(() => {
    if (hpState === 'healed' && isDead) {
      const t = setTimeout(() => {
        navigate('/game/village');
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [hpState, isDead, navigate]);

  // ── Stamina refill handler ──────────────────────────────────────────────────
  const handleStamRefill = (amount: number, cost: number) => {
    if (!player || stamRefilling) return;
    const newGold = player.gold - cost;
    if (newGold < 0) return;

    const newStam = Math.min(maxStam, liveStam + amount);
    stamTargetRef.current = newStam;
    setStamDone(false);
    setStamRefilling(true);
    setStamSecs(REFILL_DURATION);
    updatePlayer({ gold: newGold });

    // FIX: Timer HANYA decrement stamSecs — jangan panggil setState/async lain
    // di dalam setState callback (menyebabkan "Cannot update during rendering" error).
    // Completion logic ada di useEffect yang watch stamSecs === 0.
    stamTimerRef.current = setInterval(() => {
      setStamSecs(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
  };

  // Stamina completion effect — dipicu ketika stamSecs menjadi 0
  useEffect(() => {
    if (!stamRefilling || stamSecs > 0) return;
    if (stamTimerRef.current) { clearInterval(stamTimerRef.current); stamTimerRef.current = null; }
    const target = stamTargetRef.current;
    setStamRefilling(false);
    setLiveStam(target);
    setStamDone(true);
    updateStamina(target);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stamSecs, stamRefilling]);

  // ── Mana refill handler ─────────────────────────────────────────────────────
  const handleManaRefill = (amount: number, cost: number) => {
    if (!player || manaRefilling || maxMana <= 0) return;
    const newGold = player.gold - cost;
    if (newGold < 0) return;

    const newMana = Math.min(maxMana, liveMana + amount);
    manaTargetRef.current = newMana;
    setManaDone(false);
    setManaRefilling(true);
    setManaSecs(REFILL_DURATION);
    updatePlayer({ gold: newGold });

    // FIX: sama seperti stamina — hanya countdown, completion di useEffect.
    manaTimerRef.current = setInterval(() => {
      setManaSecs(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
  };

  // Mana completion effect — dipicu ketika manaSecs menjadi 0
  useEffect(() => {
    if (!manaRefilling || manaSecs > 0) return;
    if (manaTimerRef.current) { clearInterval(manaTimerRef.current); manaTimerRef.current = null; }
    const target = manaTargetRef.current;
    setManaRefilling(false);
    setLiveMana(target);
    setManaDone(true);
    updateMana(target);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manaSecs, manaRefilling]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (stamTimerRef.current) clearInterval(stamTimerRef.current);
      if (manaTimerRef.current) clearInterval(manaTimerRef.current);
    };
  }, []);

  if (!player) return null;

  const avatarSrc      = player.gender === 'female' ? femaleImg : maleImg;
  const remainingSecs  = Math.max(0, HP_HEAL_DURATION - hpElapsed);
  const hpRange        = CLINIC_TARGET_HP - startHpRef.current;
  const hpPct          = hpRange > 0 ? ((displayHp - startHpRef.current) / hpRange) * 100 : 100;

  const CLINIC_IMG_HP    = 'https://images.unsplash.com/photo-1576020363294-ab5dca00b6f8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZWRpZXZhbCUyMGFwb3RoZWNhcnklMjBoZWFsZXIlMjBoZXJiYWxpc3QlMjBzaG9wJTIwZmFudGFzeXxlbnwxfHx8fDE3NzI2OTc2NzN8MA&ixlib=rb-4.1.0&q=80&w=1080';
  const CLINIC_IMG_STAM  = 'https://images.unsplash.com/photo-1517697471339-4aa32003c11a?w=800&q=80';
  const CLINIC_IMG_MANA  = 'https://images.unsplash.com/photo-1644413239414-33a8bf405db9?w=800&q=80';

  const TABS: { id: ClinicTab; label: string; icon: JSX.Element; color: string; available: boolean }[] = [
    {
      id: 'hp', label: 'HP', icon: <Heart className="w-4 h-4" />, color: '#4ade80',
      available: needsHp,
    },
    {
      id: 'stamina', label: 'Stamina', icon: <Zap className="w-4 h-4" />, color: '#fbbf24',
      available: liveStam < maxStam,
    },
    {
      id: 'mana', label: 'Mana', icon: <Droplets className="w-4 h-4" />, color: '#818cf8',
      available: maxMana > 0 && liveMana < maxMana,
    },
  ];

  const clinicItems: AccordionItem[] = [
    {
      id: 'hp',
      label: 'Sembuhkan HP',
      sublabel: `HP saat ini: ${curHp} / 100`,
      emoji: '❤️',
      image: CLINIC_IMG_HP,
      badge: isDead ? '💀 Kritis!' : needsHp ? '⚠️ Perlu Sembuh' : '✓ Penuh',
      badgeColor: isDead ? '#f87171' : needsHp ? '#fbbf24' : '#4ade80',
      accentColor: '#4ade80',
      glowColor: 'rgba(74,222,128,0.3)',
      fromColor: 'rgba(5,46,22,0.4)',
      disabled: !needsHp,
      content: (
        <motion.div key="hp" initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}>
          <motion.div animate={{ opacity:[0.7,1,0.7] }} transition={{ duration:2, repeat:Infinity }}
            className="flex items-center gap-3 p-3 rounded-xl mb-4"
            style={{ background: isDead ? 'rgba(127,29,29,0.3)' : 'rgba(20,83,45,0.3)', border:`1px solid ${isDead ? 'rgba(239,68,68,0.4)' : 'rgba(74,222,128,0.4)'}` }}>
            <span className="text-2xl">{isDead ? '💀' : needsHp ? '🌿' : '💚'}</span>
            <div>
              <p style={{ color: isDead ? '#f87171' : needsHp ? '#4ade80' : '#86efac', fontWeight:700, fontSize:'0.85rem', fontFamily:'serif' }}>
                {isDead ? 'HP Habis — Wajib Istirahat' : needsHp ? `Memulihkan HP (${curHp} → ${CLINIC_TARGET_HP})` : 'HP Sudah Penuh!'}
              </p>
              <p style={{ color:'#9ca3af', fontSize:'0.72rem' }}>
                {isDead ? 'Kamu tidak bisa meninggalkan klinik.' : needsHp ? 'Pemulihan HP berlangsung 30 detik.' : 'HP kamu sudah penuh (100).'}
              </p>
            </div>
          </motion.div>
          {hpState === 'healthy' || (!needsHp && hpState !== 'healing') ? (
            <div className="text-center py-4">
              <motion.div animate={{ scale:[1,1.15,1] }} transition={{ duration:2.5, repeat:Infinity }}>
                <CheckCircle className="w-14 h-14 text-green-400 mx-auto mb-3" />
              </motion.div>
              <p style={{ color:'#86efac', fontFamily:'serif', fontWeight:700, fontSize:'1rem' }}>HP Penuh!</p>
              <p style={{ color:'#6b7280', fontSize:'0.75rem', marginTop:6 }}>HP kamu sudah {CLINIC_TARGET_HP}/{CLINIC_TARGET_HP}</p>
            </div>
          ) : hpState === 'healed' ? (
            <div className="text-center py-4">
              <motion.span initial={{ scale:0 }} animate={{ scale:1 }} style={{ fontSize:'4rem', display:'block', marginBottom:8 }}>💚</motion.span>
              <p style={{ color:'#4ade80', fontFamily:'serif', fontWeight:900, fontSize:'1.2rem' }}>Sembuh Sepenuhnya!</p>
              {isDead && (
                <p style={{ color:'#86efac', fontSize:'0.8rem', marginTop:4 }}>Kembali ke desa dalam 3 detik...</p>
              )}
            </div>
          ) : (
            <>
              <div className="mb-4">
                <div className="flex justify-between items-baseline mb-2">
                  <span style={{ fontFamily:'serif', fontWeight:700, color:'#86efac', fontSize:'0.85rem' }}>HP Pemulihan</span>
                  <span style={{ color:'#4ade80', fontWeight:700, fontSize:'0.85rem' }}>{displayHp} / {CLINIC_TARGET_HP}</span>
                </div>
                <div className="w-full h-4 rounded-full overflow-hidden" style={{ background:'rgba(0,0,0,0.5)', border:'1px solid rgba(74,222,128,0.2)' }}>
                  <motion.div className="h-full rounded-full"
                    style={{ width:`${hpPct}%`, background:'linear-gradient(90deg, #166534, #4ade80, #86efac)', boxShadow:'0 0 12px rgba(74,222,128,0.6)' }}
                    transition={{ duration:0.8, ease:'easeOut' }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background:'rgba(5,46,22,0.4)', border:'1px solid rgba(74,222,128,0.2)' }}>
                <div className="relative">
                  <CircularTimer elapsed={hpElapsed} total={HP_HEAL_DURATION} color="#4ade80" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span style={{ fontFamily:'serif', fontWeight:900, fontSize:'1.3rem', color:'#4ade80', lineHeight:1 }}>{remainingSecs}</span>
                    <span style={{ fontSize:'0.55rem', color:'#6b7280' }}>dtk</span>
                  </div>
                </div>
                <div>
                  <p style={{ color:'#86efac', fontSize:'0.8rem', fontFamily:'serif', fontWeight:700 }}>Pemulihan HP Aktif</p>
                  <p style={{ color:'#6b7280', fontSize:'0.7rem', lineHeight:1.5, marginTop:2 }}>Para penyembuh klinik merawat luka dengan ramuan kuno.</p>
                </div>
              </div>
              <p style={{ textAlign:'center', fontSize:'0.65rem', color:'#374151', marginTop:10 }}>
                {isDead ? '🔒 Tidak bisa keluar sampai HP pulih' : '💊 HP dipulihkan otomatis'}
              </p>
            </>
          )}
        </motion.div>
      ),
    },
    {
      id: 'stamina',
      label: 'Pulihkan Stamina',
      sublabel: `${liveStam} / ${maxStam} Stamina`,
      emoji: '⚡',
      image: CLINIC_IMG_STAM,
      badge: liveStam < maxStam ? '⚠️ Kurang' : '✓ Penuh',
      badgeColor: liveStam < maxStam ? '#fbbf24' : '#4ade80',
      accentColor: '#fbbf24',
      glowColor: 'rgba(251,191,36,0.3)',
      fromColor: 'rgba(120,53,15,0.4)',
      content: (
        <div>
          <RefillPanel
            type="stamina" current={liveStam} max={maxStam} gold={player.gold}
            onRefill={handleStamRefill} refilling={stamRefilling}
            refillSecs={stamSecs} refillTotal={REFILL_DURATION} refillDone={stamDone}
          />
          <p style={{ fontSize:'0.62rem', color:'#4b5563', marginTop:12, textAlign:'center' }}>
            ⚡ Stamina digunakan untuk serangan fisik dan skill. Tidak reset otomatis.
          </p>
        </div>
      ),
    },
    {
      id: 'mana',
      label: 'Pulihkan Mana',
      sublabel: maxMana > 0 ? `${liveMana} / ${maxMana} Mana` : 'Memerlukan INT ≥ 1',
      emoji: '💙',
      image: CLINIC_IMG_MANA,
      badge: maxMana <= 0 ? '🔒 Terkunci' : liveMana < maxMana ? '⚠️ Kurang' : '✓ Penuh',
      badgeColor: maxMana <= 0 ? '#6b7280' : liveMana < maxMana ? '#818cf8' : '#4ade80',
      accentColor: '#818cf8',
      glowColor: 'rgba(129,140,248,0.3)',
      fromColor: 'rgba(30,27,75,0.4)',
      disabled: maxMana <= 0,
      content: (
        <div>
          {maxMana <= 0 ? (
            <div className="text-center py-6">
              <span style={{ fontSize:'3rem', display:'block', marginBottom:8 }}>🔮</span>
              <p style={{ color:'#818cf8', fontFamily:'serif', fontWeight:700, fontSize:'0.95rem' }}>Tidak Ada Mana</p>
              <p style={{ color:'#6b7280', fontSize:'0.75rem', marginTop:6, lineHeight:1.6 }}>
                Mana tersedia jika kamu memiliki stat INT ≥ 1 dan menggunakan senjata sihir.
              </p>
            </div>
          ) : (
            <>
              <RefillPanel
                type="mana" current={liveMana} max={maxMana} gold={player.gold}
                onRefill={handleManaRefill} refilling={manaRefilling}
                refillSecs={manaSecs} refillTotal={REFILL_DURATION} refillDone={manaDone}
              />
              <p style={{ fontSize:'0.62rem', color:'#4b5563', marginTop:12, textAlign:'center' }}>
                💙 Mana digunakan untuk skill sihir. Tidak reset otomatis.
              </p>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-lg mx-auto py-4 relative">
      {/* Particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {Array.from({ length: 12 }).map((_, i) => <HealParticle key={i} index={i} />)}
      </div>

      <motion.div initial={{ opacity:0, y:30 }} animate={{ opacity:1, y:0 }}
        className="relative z-10 rounded-2xl overflow-hidden"
        style={{ background:'rgba(3,20,8,0.95)', backdropFilter:'blur(24px)', border:'1px solid rgba(74,222,128,0.4)', boxShadow:'0 25px 80px rgba(0,0,0,0.85), 0 0 40px rgba(74,222,128,0.1)' }}>
        <div className="h-[2px]" style={{ background:'linear-gradient(90deg, transparent, #4ade80, #86efac, #4ade80, transparent)' }} />

        {/* Header image */}
        <div className="relative h-36 overflow-hidden">
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1576020363294-ab5dca00b6f8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZWRpZXZhbCUyMGFwb3RoZWNhcnklMjBoZWFsZXIlMjBoZXJiYWxpc3QlMjBzaG9wJTIwZmFudGFzeXxlbnwxfHx8fDE3NzI2OTc2NzN8MA&ixlib=rb-4.1.0&q=80&w=1080"
            alt="Clinic" className="w-full h-full object-cover"
            style={{ filter:'brightness(0.25) saturate(0.4) hue-rotate(80deg)' }}
          />
          <div className="absolute inset-0" style={{ background:'linear-gradient(to bottom, transparent 20%, rgba(3,20,8,0.95) 100%)' }} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.div animate={{ scale:[1,1.12,1], filter:['drop-shadow(0 0 10px #4ade80)','drop-shadow(0 0 28px #4ade80)','drop-shadow(0 0 10px #4ade80)'] }} transition={{ duration:2, repeat:Infinity }}>
              <HeartPulse className="w-12 h-12 text-green-400" />
            </motion.div>
            <p style={{ fontFamily:'serif', fontWeight:900, fontSize:'1.2rem', color:'#4ade80', marginTop:6, letterSpacing:'0.1em' }}>KLINIK PENYEMBUHAN</p>
            <p style={{ color:'#86efac', fontSize:'0.65rem', letterSpacing:'0.2em' }}>Desa Daun Hijau</p>
          </div>
        </div>

        <div className="p-5">
          {/* Player quick stats */}
          <div className="flex items-center gap-4 mb-5 p-3 rounded-xl" style={{ background:'rgba(5,46,22,0.35)', border:'1px solid rgba(74,222,128,0.2)' }}>
            <div style={{ width:48, height:48, borderRadius:10, overflow:'hidden', border:'2px solid rgba(74,222,128,0.4)', flexShrink:0 }}>
              <img src={avatarSrc} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'top' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p style={{ color:'#86efac', fontWeight:700, fontSize:'0.85rem', fontFamily:'serif' }}>{player.name}</p>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span style={{ fontSize:'0.65rem', color:'#f87171', fontWeight:700 }}>❤️ {curHp} HP</span>
                <span style={{ fontSize:'0.65rem', color:'#fbbf24', fontWeight:700 }}>⚡ {liveStam}/{maxStam}</span>
                {maxMana > 0 && <span style={{ fontSize:'0.65rem', color:'#818cf8', fontWeight:700 }}>💙 {liveMana}/{maxMana}</span>}
                <span style={{ fontSize:'0.65rem', color:'#fbbf24', fontWeight:700 }}>🪙 {player.gold}</span>
              </div>
            </div>
            {!isDead && (
              <motion.button onClick={() => navigate('/game/village')}
                whileHover={{ scale:1.05 }} whileTap={{ scale:0.95 }}
                className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs"
                style={{ background:'rgba(74,222,128,0.15)', border:'1px solid rgba(74,222,128,0.4)', color:'#4ade80', cursor:'pointer' }}>
                <ArrowLeft className="w-3 h-3" /> Desa
              </motion.button>
            )}
          </div>

          {/* Tabs — replaced with accordion */}
          <MenuAccordion
            items={clinicItems}
            title="Layanan Klinik"
            defaultOpen={isDead || needsHp ? 'hp' : 'stamina'}
          />
        </div>
      </motion.div>
    </div>
  );
}