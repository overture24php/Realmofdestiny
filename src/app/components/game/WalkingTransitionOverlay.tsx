import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { WorldLocation } from '../../data/worldMapData';
import mapImg from 'figma:asset/76192ffe5cc08b1ad78be5c314ff2153fbc28d6d.png';

// ─── Constants ────────────────────────────────────────────────────────────────

const TOTAL_STEPS     = 20;
const STEP_INTERVAL   = 500;   // ms per step
const TOTAL_DURATION  = 10000; // 10 seconds

// Pre-compute the footstep trail path (left foot above, right foot below centerline)
const STEP_PATH = Array.from({ length: TOTAL_STEPS }, (_, i) => ({
  id:     i,
  isLeft: i % 2 === 0,
  xPct:   (i / (TOTAL_STEPS - 1)) * 84 + 8, // 8% → 92% of strip width
  yPct:   i % 2 === 0 ? 20 : 58,             // left=20%, right=58% of strip height
  delay:  i * (STEP_INTERVAL / 1000),         // seconds
}));

// Walking flavor texts keyed to progress (0–9)
const WALK_PHRASES = [
  'Meninggalkan tempat yang sudah dikenal...',
  'Debu jalanan mengepul di setiap langkah...',
  'Angin berhembus menemani perjalananmu...',
  'Sepatu petarung meninggalkan jejak di tanah...',
  'Pemandangan mulai berubah di sekitarmu...',
  'Semakin jauh dari asal, semakin dekat ke tujuan...',
  'Langkah demi langkah melintasi dunia...',
  'Gerbang tujuan mulai terlihat di kejauhan...',
  'Hampir tiba! Bersiapkan dirimu...',
  'Tiba di tujuan baru yang menantang!',
];

// ─── Footprint SVG ────────────────────────────────────────────────────────────

function Footprint({ isLeft, color }: { isLeft: boolean; color: string }) {
  return (
    <svg
      width="22" height="30" viewBox="0 0 22 30"
      style={{
        transform: isLeft ? 'none' : 'scaleX(-1)',
        filter: `drop-shadow(0 0 5px ${color}90)`,
        display: 'block',
      }}
    >
      <g fill={color}>
        {/* Toes */}
        <ellipse cx="4.5"  cy="5"   rx="3"   ry="3.8" opacity="0.95"/>
        <ellipse cx="9"    cy="3"   rx="3"   ry="3.8" opacity="0.95"/>
        <ellipse cx="13.5" cy="3.5" rx="2.7" ry="3.4" opacity="0.9"/>
        <ellipse cx="17.5" cy="5.8" rx="2.2" ry="2.9" opacity="0.85"/>
        <ellipse cx="20.5" cy="9"   rx="1.7" ry="2.3" opacity="0.8"/>
        {/* Main foot body */}
        <path
          d="M3,8.5 C1.2,10.5 1,18 2,22.5 C3,27 6.5,30 11,30 C15.5,30 19,27 20,22.5
             C21,18 20.8,10.5 19,8.5 C17,6.5 15,6.5 11,7.5 C7,6.5 5,6.5 3,8.5 Z"
          opacity="0.95"
        />
      </g>
    </svg>
  );
}

// ─── Corner bracket decoration ────────────────────────────────────────────────

function CornerBracket({ pos, accent }: { pos: 'tl' | 'tr' | 'bl' | 'br'; accent: string }) {
  const config = {
    tl: { path: 'M2,18 L2,2 L18,2',   cx: 3,  cy: 3  },
    tr: { path: 'M2,2 L18,2 L18,18',  cx: 17, cy: 3  },
    bl: { path: 'M18,18 L2,18 L2,2',  cx: 3,  cy: 17 },
    br: { path: 'M2,18 L18,18 L18,2', cx: 17, cy: 17 },
  }[pos];

  return (
    <svg width="20" height="20" viewBox="0 0 20 20" style={{ opacity: 0.6 }}>
      <path d={config.path} fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={config.cx} cy={config.cy} r="2" fill={accent} opacity="0.7"/>
    </svg>
  );
}

// ─── Main WalkingTransitionOverlay ────────────────────────────────────────────

interface Props {
  isActive:    boolean;
  destination: WorldLocation | null;
}

export function WalkingTransitionOverlay({ isActive, destination }: Props) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [elapsedMs,    setElapsedMs]    = useState(0);
  const startRef = useRef<number>(0);

  // ── Reset & run timer/step-spawner when active ──
  useEffect(() => {
    if (!isActive) {
      setVisibleCount(0);
      setElapsedMs(0);
      return;
    }

    startRef.current = Date.now();
    setVisibleCount(0);
    setElapsedMs(0);

    // Elapsed timer (every 60ms)
    const timerInterval = setInterval(() => {
      const e = Date.now() - startRef.current;
      setElapsedMs(Math.min(e, TOTAL_DURATION));
    }, 60);

    // Step spawner (every STEP_INTERVAL ms)
    let count = 0;
    const spawnFirst = () => {
      setVisibleCount(1);
      count = 1;
    };
    spawnFirst();

    const stepInterval = setInterval(() => {
      if (count >= TOTAL_STEPS) { clearInterval(stepInterval); return; }
      count++;
      setVisibleCount(count);
    }, STEP_INTERVAL);

    return () => {
      clearInterval(timerInterval);
      clearInterval(stepInterval);
    };
  }, [isActive]);

  if (!destination) return null;

  const accent         = destination.accentColor ?? '#a78bfa';
  const progressPct    = (elapsedMs / TOTAL_DURATION) * 100;
  const remainingMs    = TOTAL_DURATION - elapsedMs;
  const remainingSecs  = Math.max(0, Math.ceil(remainingMs / 1000));
  const phraseIdx      = Math.min(
    Math.floor((elapsedMs / TOTAL_DURATION) * WALK_PHRASES.length),
    WALK_PHRASES.length - 1
  );

  // Walker position (leads the latest visible footstep)
  const walkerStepIdx  = Math.min(visibleCount, TOTAL_STEPS - 1);
  const walkerXPct     = visibleCount === 0
    ? 5
    : STEP_PATH[walkerStepIdx].xPct + 3;

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          key="walk-overlay"
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 9999 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          {/* World Map as full background */}
          <div className="absolute inset-0">
            <img src={mapImg} alt="World Map" style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center' }} />
            <div className="absolute inset-0" style={{ background:'rgba(2,2,12,0.72)', backdropFilter:'blur(2px)' }} />
            {/* Vignette */}
            <div className="absolute inset-0" style={{ background:'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.65) 100%)' }} />
          </div>

          {/* Ambient glow behind card */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{ background: `radial-gradient(ellipse at 50% 50%, ${accent}0c 0%, transparent 65%)` }}
            animate={{ scale: [1, 1.06, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Animated star particles */}
          {Array.from({ length: 8 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute pointer-events-none text-sm select-none"
              style={{ left:`${10 + (i * 11.5) % 80}%`, top:`${15 + (i * 13.7) % 70}%`, color: accent + '70', fontSize: 8 + (i % 3) * 4 }}
              animate={{ y:[0,-18,0], opacity:[0.2,0.7,0.2], scale:[0.8,1.2,0.8] }}
              transition={{ duration:2+(i%3), delay:i*0.4, repeat:Infinity, ease:'easeInOut' }}
            >✦</motion.div>
          ))}

          {/* ── Main Card ── */}
          <motion.div
            key="walk-card"
            className="relative w-full mx-4 rounded-2xl border-2 overflow-hidden"
            style={{
              maxWidth: 680,
              background: 'linear-gradient(160deg, rgba(4,4,18,0.92) 0%, rgba(8,6,22,0.94) 100%)',
              backdropFilter: 'blur(12px)',
              borderColor: accent + '55',
              boxShadow: `0 0 60px ${accent}18, 0 24px 80px rgba(0,0,0,0.85), inset 0 1px 0 ${accent}20`,
            }}
            initial={{ scale: 0.9, opacity: 0, y: 28 }}
            animate={{ scale: 1,   opacity: 1, y: 0  }}
            exit={{    scale: 0.9, opacity: 0, y: 28 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            {/* Moving shimmer */}
            <motion.div className="absolute inset-0 pointer-events-none"
              style={{ background:`linear-gradient(105deg, transparent 38%, ${accent}12 50%, transparent 62%)`, opacity:0.8 }}
              animate={{ x:['-110%','210%'] }} transition={{ duration:2.8, repeat:Infinity, ease:'linear', repeatDelay:2.5 }}
            />

            {/* Corner brackets */}
            <div className="absolute top-3 left-3">   <CornerBracket pos="tl" accent={accent} /></div>
            <div className="absolute top-3 right-3">  <CornerBracket pos="tr" accent={accent} /></div>
            <div className="absolute bottom-3 left-3"> <CornerBracket pos="bl" accent={accent} /></div>
            <div className="absolute bottom-3 right-3"><CornerBracket pos="br" accent={accent} /></div>

            <div className="relative p-7 pb-6">
              {/* ── Header ── */}
              <div className="text-center mb-5">
                <motion.div className="flex items-center justify-center gap-3 mb-3"
                  animate={{ opacity:[0.7,1,0.7] }} transition={{ duration:1.8, repeat:Infinity }}>
                  <div className="h-px flex-1 max-w-24" style={{ background:`linear-gradient(to right, transparent, ${accent}60)` }} />
                  <span className="text-[11px] tracking-[0.5em] uppercase font-bold" style={{ color:accent }}>⚔ Sedang Berjalan ⚔</span>
                  <div className="h-px flex-1 max-w-24" style={{ background:`linear-gradient(to left, transparent, ${accent}60)` }} />
                </motion.div>

                <h2 className="text-3xl font-black mb-2" style={{
                  backgroundImage:`linear-gradient(180deg, #fff 0%, ${accent} 60%)`,
                  WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
                  display:'inline-block', filter:`drop-shadow(0 0 16px ${accent}60)`,
                }}>
                  Menuju {destination.name}
                </h2>

                <div className="flex items-center justify-center gap-2 mt-1">
                  <span className="text-[11px] px-3 py-1 rounded-full border font-semibold"
                    style={{ borderColor:accent+'40', color:accent, background:accent+'12' }}>
                    {destination.zone.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-500">{destination.levelRange}</span>
                </div>
              </div>

              {/* ── Footstep Trail Strip — map themed ── */}
              <div className="relative rounded-xl mb-4 overflow-hidden" style={{ height:110 }}>
                {/* Mini world map thumbnail inside the strip */}
                <img src={mapImg} alt="map" style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', objectPosition:'center', opacity:0.18 }} />
                <div className="absolute inset-0" style={{ background:`linear-gradient(180deg, rgba(0,0,0,0.5) 0%, ${accent}06 50%, rgba(0,0,0,0.5) 100%)`, border:`1px solid ${accent}22` }} />

                {/* Ground path line */}
                <div className="absolute left-0 right-0" style={{ top:'50%', height:2, background:`linear-gradient(to right, transparent 2%, ${accent}25 20%, ${accent}25 80%, transparent 98%)` }} />

                {/* Path texture dots */}
                {Array.from({ length: 24 }).map((_, i) => (
                  <div key={i} className="absolute rounded-full"
                    style={{ left:`${4+i*4}%`, top:'50%', transform:'translateY(-50%)', width:2, height:2, background:accent+'18' }} />
                ))}

                {/* Empty footprint slot guides */}
                {STEP_PATH.map(step => (
                  <div key={`slot-${step.id}`} className="absolute rounded"
                    style={{ left:`${step.xPct}%`, top:`${step.yPct}%`, width:22, height:30, transform:'translateX(-50%)', border:`1px dashed ${accent}0e` }} />
                ))}

                {/* ── Footprints ── */}
                {STEP_PATH.slice(0, visibleCount).map(step => (
                  <motion.div key={`foot-${step.id}`} className="absolute"
                    style={{ left:`${step.xPct}%`, top:`${step.yPct}%`, transform:'translateX(-50%)' }}
                    initial={{ opacity:0, scale:0, rotate: step.isLeft ? -20 : 20 }}
                    animate={{ opacity:1, scale:1, rotate:0 }}
                    transition={{ duration:0.28, ease:[0.34,1.56,0.64,1] }}>
                    <motion.div className="absolute inset-0 rounded-sm"
                      style={{ left:'-30%', top:'-20%', width:'160%', height:'140%', border:`1.5px solid ${accent}` }}
                      initial={{ opacity:0.9, scale:0.5 }} animate={{ opacity:0, scale:2 }}
                      transition={{ duration:0.45, ease:'easeOut' }} />
                    <Footprint isLeft={step.isLeft} color={accent} />
                  </motion.div>
                ))}
                {/* No walking person icon — removed per design */}
              </div>

              {/* ── Step counter + flavor text ── */}
              <div className="flex items-center justify-between mb-4 min-h-[20px]">
                <AnimatePresence mode="wait">
                  <motion.p key={phraseIdx} className="text-xs text-gray-400 italic"
                    initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:8 }}
                    transition={{ duration:0.3 }}>
                    {WALK_PHRASES[phraseIdx]}
                  </motion.p>
                </AnimatePresence>
                <span className="text-xs font-semibold flex-shrink-0 ml-3" style={{ color:accent }}>
                  {visibleCount} langkah
                </span>
              </div>

              {/* ── Progress bar ── */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-gray-600">Jarak Perjalanan</span>
                  <motion.span className="text-xs font-bold" style={{ color:accent }}
                    animate={{ opacity: remainingSecs <= 3 ? [1,0.5,1] : 1 }}
                    transition={{ duration:0.6, repeat: remainingSecs <= 3 ? Infinity : 0 }}>
                    {remainingSecs === 0 ? '✦ Tiba!' : `Tiba dalam ${remainingSecs} detik`}
                  </motion.span>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.05)', border:`1px solid ${accent}20` }}>
                  <motion.div className="h-full rounded-full"
                    style={{ background:`linear-gradient(90deg, ${accent}70, ${accent})`, boxShadow:`0 0 10px ${accent}70`, width:`${progressPct}%` }} />
                </div>
                <div className="relative h-3 mt-0.5">
                  <motion.span className="absolute text-xs -top-1" style={{ left:`calc(${progressPct}% - 8px)` }}>🦶</motion.span>
                </div>
              </div>

              {/* ── Bottom tagline ── */}
              <motion.p className="text-center text-[10px] tracking-[0.4em] uppercase mt-2" style={{ color:accent+'55' }}
                animate={{ opacity:[0.4,0.8,0.4] }} transition={{ duration:2.5, repeat:Infinity }}>
                ✦ Realm of Destiny — Dunia yang Luas Menantimu ✦
              </motion.p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}