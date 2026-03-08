import { useEffect, useRef, useState } from 'react';
import { X, Heart, Sparkles, Sword, Shield, Target, Eye, Zap, Plus, Minus, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useGame } from '../../contexts/GameContext';
import type { CoreStats } from '../../contexts/GameContext';
import {
  getLevelProgress, getExpInLevel, getExpForNextLevel, formatExp, MAX_LEVEL,
} from '../../data/levelData';
import { calcDerived, getElement, ELEMENTS } from '../../data/statsCalc';
import maleImg   from 'figma:asset/0d288298f55234e645afbd915a4e01469027b0fa.png';
import femaleImg from 'figma:asset/998d51489ca786ac6d73a705dcfca0031ec6408c.png';

interface ProfileModalProps { onClose: () => void; }

// ── Gender colour palette ─────────────────────────────────────────────────────
const GENDER_THEME = {
  male   : { colors: ['#2563eb','#3b82f6','#60a5fa'] as string[], glow: '#3b82f6', symbol: '♂' },
  female : { colors: ['#be185d','#ec4899','#f9a8d4'] as string[], glow: '#ec4899', symbol: '♀' },
  none   : { colors: ['#6d28d9','#a855f7','#c084fc'] as string[], glow: '#a855f7', symbol: '?' },
} as const;

function getGenderTheme(gender?: string) {
  if (gender === 'male')   return GENDER_THEME.male;
  if (gender === 'female') return GENDER_THEME.female;
  return GENDER_THEME.none;
}

// ── Avatar Border ─────────────────────────────────────────────────────────────
function AvatarBorder({ colors, glow, symbol }: { colors: string[]; glow: string; symbol: string }) {
  const S = 180, R = 14, SW = 3, perim = 2 * (S - SW) * 2;
  return (
    <div style={{ position: 'relative', width: S, height: S }}>
      <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <linearGradient id="pb1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors[0]} /><stop offset="50%" stopColor={colors[1]} /><stop offset="100%" stopColor={colors[2]} />
          </linearGradient>
          <filter id="pbglow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        <rect x={SW/2} y={SW/2} width={S-SW} height={S-SW} rx={R} ry={R} fill="none" stroke={colors[0]} strokeWidth={SW} strokeOpacity={0.2} />
        <motion.rect x={SW/2} y={SW/2} width={S-SW} height={S-SW} rx={R} ry={R}
          fill="none" stroke="url(#pb1)" strokeWidth={SW+1} filter="url(#pbglow)"
          animate={{ strokeOpacity: [0.55, 1, 0.55] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.rect x={SW/2} y={SW/2} width={S-SW} height={S-SW} rx={R} ry={R}
          fill="none" stroke={colors[1]} strokeWidth={1.5}
          strokeDasharray={`${perim*0.18} ${perim*0.82}`} strokeOpacity={0.7}
          animate={{ strokeDashoffset: [0, -perim] }} transition={{ duration: 3.5, repeat: Infinity, ease: 'linear' }} />
        {([[SW+4,SW+4],[S-SW-4-14,SW+4],[SW+4,S-SW-4-14],[S-SW-4-14,S-SW-4-14]] as [number,number][]).map(([cx,cy],i) => (
          <motion.rect key={i} x={cx} y={cy} width={14} height={14} rx={2.5}
            fill="none" stroke={colors[i%2===0?0:2]} strokeWidth={1.5}
            animate={{ opacity: [0.35,1,0.35] }} transition={{ duration: 1.8, repeat: Infinity, delay: i*0.35 }} />
        ))}
        <motion.line x1={S/2-20} y1={SW/2} x2={S/2+20} y2={SW/2} stroke={colors[1]} strokeWidth={3} strokeLinecap="round" animate={{ opacity:[0.3,1,0.3] }} transition={{ duration:2, repeat:Infinity }} />
        <motion.line x1={S/2-20} y1={S-SW/2} x2={S/2+20} y2={S-SW/2} stroke={colors[1]} strokeWidth={3} strokeLinecap="round" animate={{ opacity:[0.3,1,0.3] }} transition={{ duration:2, repeat:Infinity, delay:1 }} />
      </svg>
      <motion.div style={{
        position:'absolute', top:-13, left:-13, width:26, height:26, borderRadius:'50%',
        background:`linear-gradient(135deg, ${colors[0]}, ${colors[1]})`, border:`2px solid ${glow}`,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:'0.72rem', fontWeight:900, color:'#fff', zIndex:10,
      }}
        animate={{ boxShadow:[`0 0 6px ${glow}66`,`0 0 16px ${glow}cc`,`0 0 6px ${glow}66`] }}
        transition={{ duration:2, repeat:Infinity }}>
        {symbol}
      </motion.div>
    </div>
  );
}

// ── Section separator ─────────────────────────────────────────────────────────
function Sep({ label, color }: { label: string; color?: string }) {
  const c = color ?? '#a855f7';
  return (
    <div className="flex items-center gap-3">
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${c}44)` }} />
      <span style={{ color: `${c}88`, fontSize: '0.62rem', letterSpacing: '0.22em' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${c}44, transparent)` }} />
    </div>
  );
}

// ── Stat row pill ─────────────────────────────────────────────────────────────
function StatPill({ icon, label, value, color, bg, sub }: {
  icon: React.ReactNode; label: string; value: string | number; color: string; bg: string; sub?: string;
}) {
  return (
    <motion.div className="rounded-lg p-3 flex items-start gap-2.5"
      style={{ background: `${bg}33`, border: `1px solid ${color}33` }}
      whileHover={{ scale: 1.02, borderColor: `${color}66` }} transition={{ duration: 0.15 }}>
      <span style={{ color, marginTop: 1 }}>{icon}</span>
      <div>
        <p style={{ fontSize: '0.58rem', color: '#6b7280', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</p>
        <p style={{ fontSize: '1rem', fontWeight: 800, color, fontFamily: 'serif', lineHeight: 1.2 }}>{value}</p>
        {sub && <p style={{ fontSize: '0.55rem', color: '#4b5563', marginTop: 1 }}>{sub}</p>}
      </div>
    </motion.div>
  );
}

// ── Core stat descriptions ────────────────────────────────────────────────────
const CORE_META: Record<keyof CoreStats, { icon: string; color: string; label: string; desc: string }> = {
  str: { icon: '⚔️', color: '#f97316', label: 'STR', desc: '+100 Stamina · +10 P.ATK · +1% Crit DMG' },
  int: { icon: '🔮', color: '#a855f7', label: 'INT', desc: '+100 Mana · +10 M.ATK · +1% Crit DMG' },
  dex: { icon: '🏹', color: '#22c55e', label: 'DEX', desc: '+0.1% Accuracy · +0.1% Crit Rate · +1 All Elem DEF' },
  vit: { icon: '🛡️', color: '#06b6d4', label: 'VIT', desc: '+10 PDEF · +10 MDEF · +1 Resist · +1 Meditasi/10s' },
  agi: { icon: '💨', color: '#fbbf24', label: 'AGI', desc: '+0.1% Dodge · +1% Crit DMG Reduction' },
};

// ── Main component ────────────────────────────────────────────────────────────
export default function ProfileModal({ onClose }: ProfileModalProps) {
  const { player, allocateStat } = useGame();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<keyof CoreStats | null>(null);
  const [allocating, setAllocating] = useState<keyof CoreStats | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!player) return null;

  const stats  = player.stats;
  const core   = player.coreStats ?? { str: 1, int: 1, dex: 1, vit: 1, agi: 1 };
  // Equipment core bonus — digunakan untuk tampilkan total (base + eq) dan badge +X
  const eqCore = player.equipmentCoreBonus ?? { str:0, int:0, dex:0, vit:0, agi:0 };
  const derived = calcDerived(player);
  const gt     = getGenderTheme(player.gender);
  const avatar = player.gender === 'female' ? femaleImg : maleImg;
  const freePoints = player.freePoints ?? 0;
  const elemAff = (player.elementAffinity && player.elementAffinity !== 'none')
    ? getElement(player.elementAffinity)
    : null;
  const isNonElement = player.elementAffinity === 'none';
  const isNonElementBonus = isNonElement; // gets +3 pts/lvl

  // EXP bar
  const totalExp = player.experience ?? 0;
  const expPct   = getLevelProgress(totalExp);
  const expIn    = getExpInLevel(totalExp);
  const expNeed  = getExpForNextLevel(player.level);
  const isMax    = player.level >= MAX_LEVEL;

  const handleAllocate = async (stat: keyof CoreStats) => {
    if (freePoints <= 0 || allocating) return;
    setAllocating(stat);
    await allocateStat(stat);
    setAllocating(null);
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="relative w-full max-w-lg max-h-[92vh] flex flex-col rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(170deg, #0d0520 0%, #160835 40%, #08020f 100%)',
            border: `1.5px solid ${gt.glow}55`,
            boxShadow: `0 0 60px ${gt.glow}22, 0 30px 80px rgba(0,0,0,0.95)`,
          }}
          initial={{ scale: 0.88, y: 30, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 20, opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          onClick={e => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
            style={{ background: `linear-gradient(90deg, ${gt.glow}22, transparent)`, borderBottom: `1px solid ${gt.glow}33` }}>
            <h2 style={{ fontFamily:'serif', fontWeight:900, letterSpacing:'0.14em', textTransform:'uppercase', fontSize:'1rem', background:`linear-gradient(90deg, ${gt.colors[0]}, ${gt.colors[1]})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
              ⚜️ Profil Pahlawan
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors rounded-lg p-1 hover:bg-white/10">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ── Scrollable body ── */}
          <div ref={scrollRef} className="overflow-y-auto flex-1 px-5 py-5 space-y-4">

            {/* ── AVATAR SLOT ── */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative" style={{ padding: 4 }}>
                <motion.div style={{ position:'absolute', inset:-14, borderRadius:24, background:`radial-gradient(ellipse at center, ${gt.glow}1a 0%, transparent 70%)`, pointerEvents:'none' }}
                  animate={{ scale:[1,1.07,1], opacity:[0.5,1,0.5] }} transition={{ duration:3.5, repeat:Infinity }} />
                <AvatarBorder colors={gt.colors} glow={gt.glow} symbol={gt.symbol} />
                <div style={{ position:'absolute', inset:6, borderRadius:10, overflow:'hidden', background:`linear-gradient(180deg, ${gt.glow}1a 0%, #050010 100%)` }}>
                  {player.gender ? (
                    <img src={avatar} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'top center', userSelect:'none', pointerEvents:'none' }} />
                  ) : <div className="w-full h-full flex items-center justify-center text-4xl">⚜️</div>}
                  <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'30%', background:`linear-gradient(0deg, ${gt.glow}44 0%, transparent 100%)`, pointerEvents:'none' }} />
                </div>
              </div>

              <div className="text-center w-full px-2">
                <h3 style={{ fontFamily:'serif', fontSize:'1.2rem', fontWeight:900, letterSpacing:'0.1em', background:`linear-gradient(90deg, ${gt.colors[0]}, ${gt.colors[1]}, ${gt.colors[0]})`, backgroundSize:'200% 100%', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
                  {player.name}
                </h3>
                <div className="flex items-center justify-center gap-2 mt-1 flex-wrap">
                  <motion.span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-widest"
                    style={{ background:`${gt.glow}1a`, border:`1px solid ${gt.glow}55`, color:gt.colors[1], fontFamily:'serif' }}
                    animate={{ boxShadow:[`0 0 5px ${gt.glow}33`,`0 0 14px ${gt.glow}66`,`0 0 5px ${gt.glow}33`] }}
                    transition={{ duration:2.2, repeat:Infinity }}>
                    {player.role}
                  </motion.span>
                  <span style={{ color:'#4b5563', fontSize:'0.7rem' }}>·</span>
                  <span style={{ fontSize:'0.72rem', color:'#6b7280', letterSpacing:'0.08em' }}>Level {player.level}</span>
                  {/* Elemental affinity badge */}
                  {elemAff && (
                    <>
                      <span style={{ color:'#4b5563', fontSize:'0.7rem' }}>·</span>
                      <motion.span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                        style={{ background:`${elemAff.glow}22`, border:`1px solid ${elemAff.color}55`, color:elemAff.color }}
                        animate={{ boxShadow:[`0 0 4px ${elemAff.glow}44`,`0 0 12px ${elemAff.glow}88`,`0 0 4px ${elemAff.glow}44`] }}
                        transition={{ duration:2.5, repeat:Infinity }}>
                        {elemAff.icon} {elemAff.label}
                      </motion.span>
                    </>
                  )}
                  {isNonElement && (
                    <>
                      <span style={{ color:'#4b5563', fontSize:'0.7rem' }}>·</span>
                      <motion.span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                        style={{ background:'rgba(156,163,175,0.15)', border:'1px solid rgba(209,213,219,0.4)', color:'#d1d5db' }}
                        animate={{ boxShadow:['0 0 4px rgba(156,163,175,0.2)','0 0 10px rgba(156,163,175,0.45)','0 0 4px rgba(156,163,175,0.2)'] }}
                        transition={{ duration:2.5, repeat:Infinity }}>
                        ⚪ Non-Element
                      </motion.span>
                    </>
                  )}
                </div>

                {/* EXP Bar */}
                <div style={{ marginTop:10, width:'100%' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                    <span style={{ fontSize:'0.58rem', color:'#4b5563', letterSpacing:'0.12em', textTransform:'uppercase' }}>{isMax?'👑 MAX LEVEL':'EXP'}</span>
                    <span style={{ fontSize:'0.6rem', color:'#6b7280', fontFamily:'monospace' }}>
                      {isMax ? `${formatExp(totalExp)} Total` : `${formatExp(expIn)} / ${formatExp(expNeed)}`}
                    </span>
                  </div>
                  <div style={{ width:'100%', height:7, background:'rgba(0,0,0,0.5)', borderRadius:99, border:`1px solid ${gt.glow}22`, overflow:'hidden' }}>
                    <motion.div style={{ height:'100%', borderRadius:99, background: isMax ? 'linear-gradient(90deg, #f59e0b, #fde68a)' : `linear-gradient(90deg, ${gt.colors[0]}, ${gt.colors[1]})`, boxShadow:`0 0 8px ${gt.glow}88` }}
                      initial={{ width:0 }} animate={{ width:`${expPct}%` }} transition={{ duration:0.8, ease:'easeOut', delay:0.3 }} />
                  </div>
                  {!isMax && <p style={{ fontSize:'0.55rem', color:'#374151', marginTop:2, textAlign:'right' }}>{formatExp(expNeed-expIn)} lagi ke Lv.{player.level+1}</p>}
                </div>
              </div>
            </div>

            {/* ── INFO ── */}
            <Sep label="✦ INFO ✦" color={gt.glow} />
            <div className="rounded-xl p-4" style={{ background:'rgba(0,0,0,0.4)', border:`1px solid ${gt.glow}1a` }}>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label:'Nama',  value:player.name,          color:'#ddd6fe' },
                  { label:'Level', value:String(player.level), color:'#ddd6fe' },
                  { label:'Role',  value:player.role,          color:gt.colors[1] },
                  { label:'Faksi', value:player.faction,       color:'#ddd6fe' },
                  { label:'Karma', value:String(player.karma), color:player.karma<0?'#f87171':'#4ade80' },
                  { label:'Gold',  value:`${player.gold} 🪙`,  color:'#fbbf24' },
                  {
                    label:'Kecocokan Elemen',
                    value: elemAff
                      ? `${elemAff.icon} ${elemAff.label}`
                      : isNonElement
                        ? '⚪ Non-Element'
                        : '— Belum dipilih',
                    color: elemAff?.color ?? (isNonElement ? '#d1d5db' : '#6b7280'),
                  },
                  {
                    label: isNonElementBonus ? 'Pts/Level (Non-Elem)' : 'Pts/Level',
                    value: isNonElementBonus ? '+3 🔮' : '+2 🔮',
                    color: isNonElementBonus ? '#c084fc' : '#6b7280',
                  },
                  { label:'Free Points',      value:`${freePoints} 🔮`,  color: freePoints > 0 ? '#c084fc' : '#4b5563' },
                ].map(item => (
                  <div key={item.label} className="flex flex-col gap-0.5">
                    <span style={{ fontSize:'0.6rem', color:'#4b5563', letterSpacing:'0.1em', textTransform:'uppercase' }}>{item.label}</span>
                    <span style={{ fontSize:'0.9rem', fontWeight:700, color:item.color, fontFamily:'serif', textTransform:'capitalize' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── CORE STATS ── */}
            <Sep label="✦ CORE STATS ✦" color="#c084fc" />
            {freePoints > 0 && (
              <motion.div className="rounded-lg px-4 py-2 flex items-center gap-2"
                style={{ background:'#4c1d9522', border:'1px solid #a855f744' }}
                animate={{ boxShadow:['0 0 6px #a855f722','0 0 16px #a855f744','0 0 6px #a855f722'] }}
                transition={{ duration:2, repeat:Infinity }}>
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span style={{ fontSize:'0.72rem', color:'#c084fc', fontFamily:'serif' }}>
                  Kamu memiliki <strong style={{ color:'#f0abfc' }}>{freePoints}</strong> point alokasi bebas! Klik <Plus style={{ display:'inline', width:10, height:10 }} /> untuk mendistribusikan.
                </span>
              </motion.div>
            )}
            <div className="grid grid-cols-5 gap-2">
              {(Object.keys(CORE_META) as (keyof CoreStats)[]).map(stat => {
                const m = CORE_META[stat];
                const baseVal = core[stat] ?? 1;
                const eqBonus = eqCore[stat] ?? 0;
                const val     = baseVal + eqBonus;   // total = base + equipment
                const isAlloc = allocating === stat;
                return (
                  <div key={stat} className="relative">
                    <motion.div
                      className="rounded-xl p-2.5 flex flex-col items-center gap-1"
                      style={{ background:`${m.color}14`, border:`1px solid ${m.color}33` }}
                      whileHover={{ borderColor:`${m.color}77` }}
                    >
                      <span style={{ fontSize:'1.1rem' }}>{m.icon}</span>
                      <span style={{ fontSize:'0.6rem', color:m.color, fontWeight:700, letterSpacing:'0.1em' }}>{m.label}</span>
                      <motion.span style={{ fontSize:'1.2rem', fontWeight:900, color:m.color, fontFamily:'serif' }}
                        key={val}
                        initial={{ scale:1.4, color:'#fff' }}
                        animate={{ scale:1, color:m.color }}
                        transition={{ duration:0.3 }}>
                        {val}
                      </motion.span>

                      {/* Equipment bonus badge — tampil jika ada bonus dari equipment */}
                      {eqBonus > 0 && (
                        <motion.span
                          initial={{ scale:0, opacity:0 }} animate={{ scale:1, opacity:1 }}
                          style={{
                            fontSize:'0.48rem', fontWeight:800, color:'#fbbf24',
                            background:'rgba(251,191,36,0.15)', border:'1px solid rgba(251,191,36,0.4)',
                            borderRadius:99, padding:'1px 4px', lineHeight:1.4,
                          }}>
                          {baseVal}+{eqBonus}⚙️
                        </motion.span>
                      )}

                      {/* Info button */}
                      <button onClick={() => setTooltip(tooltip === stat ? null : stat)}
                        style={{ position:'absolute', top:4, right:4, color:`${m.color}77`, background:'none', border:'none', cursor:'pointer', padding:0 }}>
                        <Info style={{ width:10, height:10 }} />
                      </button>

                      {/* Allocate button */}
                      {freePoints > 0 && (
                        <motion.button
                          onClick={() => handleAllocate(stat)}
                          disabled={!!allocating}
                          whileHover={{ scale:1.1 }} whileTap={{ scale:0.9 }}
                          style={{
                            width:20, height:20, borderRadius:'50%', border:`1px solid ${m.color}`,
                            background: isAlloc ? m.color : `${m.color}22`,
                            color:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
                            cursor:'pointer', marginTop:2,
                          }}>
                          {isAlloc
                            ? <motion.div style={{ width:8, height:8, border:'1.5px solid #fff', borderTopColor:'transparent', borderRadius:'50%' }} animate={{ rotate:360 }} transition={{ duration:0.6, repeat:Infinity, ease:'linear' }} />
                            : <Plus style={{ width:10, height:10 }} />
                          }
                        </motion.button>
                      )}
                    </motion.div>

                    {/* Tooltip */}
                    <AnimatePresence>
                      {tooltip === stat && (
                        <motion.div
                          initial={{ opacity:0, y:4, scale:0.9 }} animate={{ opacity:1, y:0, scale:1 }} exit={{ opacity:0, scale:0.9 }}
                          style={{
                            position:'absolute', bottom:'calc(100% + 6px)', left:'50%', transform:'translateX(-50%)',
                            background:'#0d0520', border:`1px solid ${m.color}55`, borderRadius:8,
                            padding:'6px 10px', zIndex:50, whiteSpace:'nowrap',
                            fontSize:'0.6rem', color:m.color, boxShadow:`0 0 16px ${m.color}33`,
                          }}>
                          {m.desc}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            {/* ── COMBAT RESOURCES ── */}
            <Sep label="✦ SUMBER DAYA ✦" color="#f87171" />
            <div className="grid grid-cols-3 gap-2">
              <StatPill icon={<Heart className="w-4 h-4"/>}    label="HP"     value={derived.maxHp}    color="#f87171" bg="#7f1d1d" sub="saat ini" />
              <StatPill icon={<Zap   className="w-4 h-4"/>}    label="Stamina" value={derived.stamina}   color="#f97316" bg="#7c2d12" sub="STR×100" />
              <StatPill icon={<Sparkles className="w-4 h-4"/>} label="Mana"    value={derived.mana}      color="#60a5fa" bg="#1e3a8a" sub="INT×100" />
            </div>

            {/* ── OFFENSIVE ── */}
            <Sep label="✦ SERANGAN ✦" color="#fb923c" />
            <div className="grid grid-cols-2 gap-2">
              <StatPill icon={<Sword   className="w-4 h-4"/>}  label="P. ATK"     value={derived.totalPhysAtk}            color="#f97316" bg="#7c2d12" sub={`Base ${stats.physicalAtk} + STR×10`} />
              <StatPill icon={<Sparkles className="w-4 h-4"/>} label="M. ATK"     value={derived.totalMagAtk}             color="#a855f7" bg="#4c1d95" sub={`Base ${stats.magicAtk} + INT×10`} />
              <StatPill icon={<Target  className="w-4 h-4"/>}  label="Accuracy"   value={`${derived.accuracy.toFixed(1)}%`} color="#fbbf24" bg="#713f12" sub="Base 100% (max 200%)" />
              <StatPill icon={<Eye     className="w-4 h-4"/>}  label="Crit Rate"  value={`${derived.critRate.toFixed(1)}%`}  color="#22c55e" bg="#14532d" sub="DEX×0.1%" />
              <div className="col-span-2">
                <StatPill icon={<Zap  className="w-4 h-4"/>}   label="Crit Damage" value={`${derived.critDamage.toFixed(0)}%`} color="#fde68a" bg="#713f12" sub="Base 120% + (STR+INT)×1%" />
              </div>
            </div>

            {/* ── DEFENSIVE ── */}
            <Sep label="✦ PERTAHANAN ✦" color="#22d3ee" />
            <div className="grid grid-cols-2 gap-2">
              <StatPill icon={<Shield className="w-4 h-4"/>}   label="P. DEF"      value={derived.totalPhysDef}            color="#06b6d4" bg="#0c4a6e" sub={`Base ${stats.physicalDef} + VIT×10`} />
              <StatPill icon={<Shield className="w-4 h-4"/>}   label="M. DEF"      value={derived.totalMagDef}             color="#6366f1" bg="#1e1b4b" sub={`Base ${stats.magicDef} + VIT×10`} />
              <StatPill icon={<Eye    className="w-4 h-4"/>}   label="Dodge"       value={`${derived.dodge.toFixed(1)}%`}   color="#4ade80" bg="#14532d" sub="AGI×0.1% (max 40%)" />
              <StatPill icon={<Minus  className="w-4 h-4"/>}   label="Crit DMG Red" value={`${derived.critDmgReduce}%`}    color="#94a3b8" bg="#1e293b" sub="AGI×1%" />
            </div>

            {/* ── STATUS RESIST ── */}
            <Sep label="✦ RESISTENSI ✦" color="#a3e635" />
            <div className="grid grid-cols-3 gap-2">
              {[
                { label:'Racun Resist',   value:derived.poisonResist, color:'#4ade80', icon:'☠️' },
                { label:'Bakar Resist',   value:derived.burnResist,   color:'#f97316', icon:'🔥' },
                { label:'Darah Resist',   value:derived.bleedResist,  color:'#f87171', icon:'💉' },
              ].map(r => (
                <div key={r.label} className="rounded-lg p-2.5 text-center"
                  style={{ background:`${r.color}11`, border:`1px solid ${r.color}33` }}>
                  <p style={{ fontSize:'1rem' }}>{r.icon}</p>
                  <p style={{ fontSize:'0.9rem', fontWeight:800, color:r.color, fontFamily:'serif' }}>{r.value}</p>
                  <p style={{ fontSize:'0.55rem', color:'#6b7280', letterSpacing:'0.06em' }}>{r.label}</p>
                </div>
              ))}
            </div>

            {/* ── ELEMENTAL ✦ ── */}
            <Sep label="✦ ELEMENTAL ✦" color="#fbbf24" />

            {/* Elemental ATK */}
            <div>
              <p style={{ fontSize:'0.6rem', color:'#4b5563', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:6 }}>
                Elemental Attack
              </p>
              <div className="grid grid-cols-4 gap-1.5">
                {/* Non-elemental */}
                <div className="rounded-lg p-2 text-center" style={{ background:'rgba(255,255,255,0.04)', border:'1px solid #ffffff18' }}>
                  <p style={{ fontSize:'0.8rem' }}>⚪</p>
                  <p style={{ fontSize:'0.85rem', fontWeight:800, color:'#9ca3af', fontFamily:'serif' }}>{stats.physicalAtk}</p>
                  <p style={{ fontSize:'0.5rem', color:'#4b5563' }}>Non-Elem</p>
                </div>
                {ELEMENTS.map(el => {
                  const val = (stats.elementalAtk as any)[el.key] ?? 0;
                  return (
                    <div key={el.key} className="rounded-lg p-2 text-center"
                      style={{ background:`${el.glow}18`, border:`1px solid ${el.color}${val>0?'55':'22'}` }}>
                      <p style={{ fontSize:'0.8rem' }}>{el.icon}</p>
                      <p style={{ fontSize:'0.85rem', fontWeight:800, color: val>0?el.color:'#374151', fontFamily:'serif' }}>{val}</p>
                      <p style={{ fontSize:'0.5rem', color:'#4b5563' }}>{el.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Elemental DEF */}
            <div>
              <p style={{ fontSize:'0.6rem', color:'#4b5563', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:6 }}>
                Elemental Defense <span style={{ color:'#374151' }}>(+{derived.elemDefBonus} DEX bonus)</span>
              </p>
              <div className="grid grid-cols-4 gap-1.5">
                {ELEMENTS.map(el => {
                  const val = (derived.elemDef as any)[el.key] ?? 0;
                  return (
                    <div key={el.key} className="rounded-lg p-2 text-center"
                      style={{ background:`${el.glow}11`, border:`1px solid ${el.color}22` }}>
                      <p style={{ fontSize:'0.8rem' }}>{el.icon}</p>
                      <p style={{ fontSize:'0.85rem', fontWeight:800, color: val>0?el.color:'#374151', fontFamily:'serif' }}>{val}</p>
                      <p style={{ fontSize:'0.5rem', color:'#4b5563' }}>{el.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── TUTORIAL PROGRESS ── */}
            {!player.tutorialProgress.completed && (
              <>
                <Sep label="✦ MISI AWAL ✦" color="#854d0e" />
                <div className="rounded-xl p-4" style={{ background:'rgba(0,0,0,0.4)', border:'1px solid #854d0e44' }}>
                  <div className="space-y-2.5">
                    {[
                      { done: player.tutorialProgress.gotWeapon,          label: 'Ambil senjata dari pandai besi' },
                      { done: player.tutorialProgress.trainedAtArena,     label: 'Berlatih di arena' },
                      { done: player.tutorialProgress.defeatedBoars >= 4, label: `Kalahkan 4 babi hutan (${player.tutorialProgress.defeatedBoars}/4)` },
                      { done: player.tutorialProgress.meditated,          label: 'Bermeditasi di kuil (+10 HP)' },
                    ].map((t, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <motion.div className="flex-shrink-0 flex items-center justify-center rounded-full"
                          style={{ width:20, height:20, background:t.done?'#15803d':'transparent', border:`2px solid ${t.done?'#22c55e':'#374151'}` }}
                          animate={t.done ? { boxShadow:['0 0 0px #22c55e','0 0 8px #22c55e','0 0 0px #22c55e'] } : {}}
                          transition={{ duration:2, repeat:Infinity }}>
                          {t.done && <span style={{ fontSize:'0.6rem', color:'#fff' }}>✓</span>}
                        </motion.div>
                        <span style={{ fontSize:'0.78rem', color:t.done?'#4ade80':'#6b7280' }}>{t.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
            <div style={{ height:4 }} />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}