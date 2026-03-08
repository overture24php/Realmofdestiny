import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import maleImg   from 'figma:asset/0d288298f55234e645afbd915a4e01469027b0fa.png';
import femaleImg from 'figma:asset/998d51489ca786ac6d73a705dcfca0031ec6408c.png';
import bodyImg   from 'figma:asset/4770ca651dd0578f6de1ef6c86f54909197d45cb.png';
import type { ElementType } from '../../contexts/GameContext';

// ── Element + Non-Element definitions ─────────────────────────────────────────

// locked  = true  → hanya bisa didapat lewat pencapaian khusus (tidak bisa dipilih di sini)
// elemAtkKey       → key elementalAtk yang mendapat +100 saat dipilih (null untuk none/special)

const ALL_ELEMENTS = [
  {
    key        : 'none',
    label      : 'Non-Elemen',
    color      : '#e2e8f0',
    glow       : '#94a3b8',
    glowDark   : '#334155',
    desc       : 'Jiwa bebas tanpa ikatan elemen. Kekuatan murni dari tekad dan latihan tak kenal batas. Setiap naik level mendapat 1 poin stat ekstra.',
    bonus      : '✦ +3 Poin Stat per Level (Ekstra +1)',
    bonusClr   : '#fbbf24',
    particles  : ['◯', '◇', '△', '□', '◯'],
    locked     : false,
    elemAtkKey : null as string | null,
  },
  {
    key        : 'fire',
    label      : 'Api',
    color      : '#ef4444',
    glow       : '#dc2626',
    glowDark   : '#7f1d1d',
    desc       : 'Destruksi & Kehancuran — Seranganmu membara dengan api abadi yang tak terpadamkan. Jiwa pejuang berapi-api.',
    bonus      : '✦ 2 Poin Stat/Level  ·  +100 Attack Api',
    bonusClr   : '#fca5a5',
    particles  : ['🔥', '✦', '🔥', '✦', '🔥'],
    locked     : false,
    elemAtkKey : 'fire',
  },
  {
    key        : 'water',
    label      : 'Air',
    color      : '#3b82f6',
    glow       : '#1d4ed8',
    glowDark   : '#1e3a8a',
    desc       : 'Fluiditas & Penyembuhan — Mengalir menghanyutkan lawan dengan gemuruh ombak samudera tak bertepi.',
    bonus      : '✦ 2 Poin Stat/Level  ·  +100 Attack Air',
    bonusClr   : '#93c5fd',
    particles  : ['💧', '🌊', '💧', '🌊', '💧'],
    locked     : false,
    elemAtkKey : 'water',
  },
  {
    key        : 'wind',
    label      : 'Angin',
    color      : '#a3e635',
    glow       : '#65a30d',
    glowDark   : '#365314',
    desc       : 'Kecepatan & Pengelakan — Tak tersentuh seperti angin, tak terlihat seperti bayangan yang berkejaran.',
    bonus      : '✦ 2 Poin Stat/Level  ·  +100 Attack Angin',
    bonusClr   : '#bef264',
    particles  : ['🌪️', '✦', '🌿', '✦', '🌪️'],
    locked     : false,
    elemAtkKey : 'wind',
  },
  {
    key        : 'earth',
    label      : 'Bumi',
    color      : '#d6a76a',
    glow       : '#92400e',
    glowDark   : '#431407',
    desc       : 'Pertahanan & Ketahanan — Kokoh seperti batu karang tak tergoyahkan, kekuatan bumi mengalir dalam dirimu.',
    bonus      : '✦ 2 Poin Stat/Level  ·  +100 Attack Bumi',
    bonusClr   : '#d6a76a',
    particles  : ['🌍', '⬡', '🪨', '⬡', '🌍'],
    locked     : false,
    elemAtkKey : 'earth',
  },
  {
    key        : 'lightning',
    label      : 'Petir',
    color      : '#fbbf24',
    glow       : '#d97706',
    glowDark   : '#78350f',
    desc       : 'Kejutan & Kecepatan — Kilat yang tak tertangkap, petir yang menghancurkan segala dalam sekejap.',
    bonus      : '✦ 2 Poin Stat/Level  ·  +100 Attack Petir',
    bonusClr   : '#fde68a',
    particles  : ['⚡', '✦', '⚡', '✦', '⚡'],
    locked     : false,
    elemAtkKey : 'lightning',
  },
  {
    key        : 'forest',
    label      : 'Hutan',
    color      : '#4ade80',
    glow       : '#16a34a',
    glowDark   : '#14532d',
    desc       : 'Alam & Kehidupan — Kekuatan alam liar yang tak terbatas mengalir bersama setiap nafasmu.',
    bonus      : '✦ 2 Poin Stat/Level  ·  +100 Attack Hutan',
    bonusClr   : '#86efac',
    particles  : ['🌿', '🍃', '🌿', '🍃', '🌿'],
    locked     : false,
    elemAtkKey : 'forest',
  },
  {
    key        : 'light',
    label      : 'Cahaya',
    color      : '#fde047',
    glow       : '#ca8a04',
    glowDark   : '#78350f',
    desc       : 'Suci & Penyembuhan — Cahaya pengusir kegelapan, penjaga kebenaran dan para suci. Kekuatan ini hanya beresonansi dengan mereka yang telah membuktikan keberanian luar biasa.',
    bonus      : '🔒 Elemen Khusus — Tidak Tersedia',
    bonusClr   : '#6b7280',
    particles  : ['✨', '⭐', '✨', '⭐', '✨'],
    locked     : true,
    elemAtkKey : null,
  },
  {
    key        : 'dark',
    label      : 'Gelap',
    color      : '#a855f7',
    glow       : '#7c3aed',
    glowDark   : '#4c1d95',
    desc       : 'Kutukan & Kegelapan — Kuasa tersembunyi yang tertidur dalam kedalaman jiwa. Hanya mereka yang telah melalui ujian kegelapan sesungguhnya yang mampu mengendalikannya.',
    bonus      : '🔒 Elemen Khusus — Tidak Tersedia',
    bonusClr   : '#6b7280',
    particles  : ['🌑', '💀', '🌑', '💀', '🌑'],
    locked     : true,
    elemAtkKey : null,
  },
] as const;

type ElemKey = typeof ALL_ELEMENTS[number]['key'];

// ── Gender data ───────────────────────────────────────────────────────────────

const GENDERS = [
  {
    key     : 'male' as const,
    label   : 'Pria',
    sublabel: 'Berjiwa bebas dan berani ambil resiko',
    img     : maleImg,
    color   : '#3b82f6',
    glow    : '#1d4ed8',
    accent  : '#93c5fd',
    rune    : '♂',
    traits  : [''],
  },
  {
    key     : 'female' as const,
    label   : 'Ksatria Wanita',
    sublabel: 'Wanita juga boleh berpetualang',
    img     : femaleImg,
    color   : '#ec4899',
    glow    : '#be185d',
    accent  : '#f9a8d4',
    rune    : '♀',
    traits  : [''],
  },
];

// ── Background runes ──────────────────────────────────────────────────────────

function BgRunes() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 18 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-purple-500/20 select-none"
          style={{
            fontSize : `${10 + (i % 4) * 6}px`,
            left     : `${(i * 5.5) % 100}%`,
            top      : `${(i * 7.3) % 100}%`,
            fontFamily: 'serif',
          }}
          animate={{ y: [0, -30, 0], opacity: [0.1, 0.35, 0.1], rotate: [0, 180, 360] }}
          transition={{ duration: 4 + (i % 5), repeat: Infinity, delay: i * 0.3, ease: 'easeInOut' }}
        >
          {['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', '✦', '⬡'][i % 8]}
        </motion.div>
      ))}
    </div>
  );
}

// ── Step 1: Gender ────────────────────────────────────────────────────────────

function StepGender({ onConfirm }: { onConfirm: (g: 'male' | 'female') => void }) {
  const [hovered,  setHovered]  = useState<'male' | 'female' | null>(null);
  const [selected, setSelected] = useState<'male' | 'female' | null>(null);
  const [busy,     setBusy]     = useState(false);

  const confirm = async () => {
    if (!selected || busy) return;
    setBusy(true);
    await new Promise(r => setTimeout(r, 400));
    onConfirm(selected);
  };

  return (
    <motion.div
      className="relative flex flex-col items-center px-6 py-8 mx-4 rounded-3xl"
      style={{
        maxWidth: 760, width: '100%',
        background: 'linear-gradient(170deg, #0e0525 0%, #1a0840 40%, #080215 100%)',
        border: '2px solid #7c3aed55',
        boxShadow: '0 0 80px #7c3aed22, 0 40px 100px rgba(0,0,0,0.95)',
      }}
      initial={{ scale: 0.88, y: 40, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      exit={{ scale: 0.88, opacity: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      {/* Header */}
      <motion.div className="text-center mb-8" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <motion.div className="text-4xl mb-3" animate={{ scale: [1, 1.12, 1], rotate: [0, 5, -5, 0] }} transition={{ duration: 4, repeat: Infinity }}>⚜️</motion.div>
        <h1 style={{ fontFamily: 'serif', fontSize: '1.7rem', fontWeight: 900, letterSpacing: '0.18em', background: 'linear-gradient(90deg, #c084fc, #f0abfc, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textTransform: 'uppercase' }}>
          Pilih Avataranmu
        </h1>
        <p style={{ color: '#a78bfa', fontSize: '0.8rem', letterSpacing: '0.12em', marginTop: 4 }}>Siapakah pahlawan yang akan menjelajahi dunia ini?</p>
        <div className="flex items-center gap-3 mt-4">
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, #7c3aed55)' }} />
          <span style={{ color: '#7c3aed', fontSize: '0.7rem', letterSpacing: '0.2em' }}>✦ Langkah 1 / 2 ✦</span>
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, #7c3aed55, transparent)' }} />
        </div>
      </motion.div>

      {/* Character cards */}
      <div className="flex gap-5 justify-center w-full mb-8">
        {GENDERS.map((g, idx) => {
          const isSelected = selected === g.key;
          const isOther    = selected !== null && !isSelected;
          return (
            <motion.button key={g.key}
              onClick={() => setSelected(g.key)}
              onMouseEnter={() => setHovered(g.key)}
              onMouseLeave={() => setHovered(null)}
              className="relative flex flex-col items-center rounded-2xl overflow-hidden cursor-pointer"
              style={{
                flex: 1, maxWidth: 280, minHeight: 360,
                background: isSelected ? `linear-gradient(170deg, ${g.glow}33 0%, rgba(8,3,18,0.9) 100%)` : 'rgba(12,5,28,0.7)',
                border: isSelected ? `2px solid ${g.color}` : hovered === g.key ? `2px solid ${g.color}88` : '2px solid #7c3aed33',
                boxShadow: isSelected ? `0 0 40px ${g.glow}66, 0 0 80px ${g.glow}22` : hovered === g.key ? `0 0 20px ${g.glow}44` : 'none',
                opacity: isOther ? 0.5 : 1, transition: 'all 0.3s ease',
              }}
              initial={{ opacity: 0, x: idx === 0 ? -40 : 40 }}
              animate={{ opacity: isOther ? 0.5 : 1, x: 0 }}
              transition={{ delay: 0.3 + idx * 0.1 }}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.97 }}
            >
              <AnimatePresence>
                {isSelected && (
                  <motion.div className="absolute top-3 right-3 z-20 rounded-full flex items-center justify-center"
                    style={{ width: 28, height: 28, background: g.color, boxShadow: `0 0 14px ${g.color}` }}
                    initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 350 }}>
                    <span style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 900 }}>✓</span>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="absolute top-3 left-3 z-10 font-bold" style={{ color: `${g.color}88`, fontSize: '1.1rem', fontFamily: 'serif' }}>{g.rune}</div>
              <div className="absolute top-0 left-0 right-0 h-24 pointer-events-none" style={{ background: `linear-gradient(180deg, ${g.glow}22 0%, transparent 100%)` }} />
              <div className="relative w-full" style={{ height: 240, overflow: 'hidden' }}>
                <motion.img src={g.img} alt={g.label} draggable={false}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', userSelect: 'none' }}
                  animate={isSelected ? { scale: [1, 1.02, 1] } : { scale: 1 }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
                {(hovered === g.key || isSelected) && (
                  <motion.div className="absolute inset-0 pointer-events-none"
                    style={{ background: `linear-gradient(135deg, transparent 30%, ${g.color}18 50%, transparent 70%)`, backgroundSize: '200% 200%' }}
                    animate={{ backgroundPosition: ['0% 0%', '100% 100%'] }}
                    transition={{ duration: 1.5, repeat: Infinity, repeatType: 'reverse' }} />
                )}
                <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
                  style={{ background: `linear-gradient(0deg, ${isSelected ? `${g.glow}55` : 'rgba(12,5,28,0.9)'} 0%, transparent 100%)` }} />
              </div>
              <div className="flex flex-col items-center px-4 pt-3 pb-4 gap-2 w-full">
                <h3 style={{ color: isSelected ? g.accent : '#ddd6fe', fontWeight: 800, fontSize: '1rem', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'serif' }}>{g.label}</h3>
                <p style={{ color: '#6b7280', fontSize: '0.7rem' }}>{g.sublabel}</p>
                <div className="flex flex-col gap-1 w-full mt-1">
                  {g.traits.map((t, ti) => (
                    <motion.div key={t} className="flex items-center gap-2 px-2 py-1 rounded-md"
                      style={{ background: isSelected ? `${g.color}18` : 'rgba(255,255,255,0.03)', border: `1px solid ${isSelected ? `${g.color}44` : '#ffffff10'}` }}
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + ti * 0.08 }}>
                      <div className="rounded-full flex-shrink-0" style={{ width: 5, height: 5, background: isSelected ? g.color : '#4b5563' }} />
                      <span style={{ fontSize: '0.64rem', color: isSelected ? g.accent : '#6b7280' }}>{t}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
              <motion.div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                style={{ background: `linear-gradient(90deg, transparent, ${g.color}, transparent)` }}
                animate={isSelected ? { opacity: [0.5, 1, 0.5] } : { opacity: 0 }}
                transition={{ duration: 1.8, repeat: Infinity }} />
            </motion.button>
          );
        })}
      </div>

      {/* Confirm */}
      <AnimatePresence>
        {selected && (
          <motion.div className="w-full max-w-xs"
            initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280 }}>
            <motion.button onClick={confirm} disabled={busy}
              className="w-full py-3.5 rounded-xl font-bold text-white relative overflow-hidden"
              style={{
                background: selected === 'male' ? 'linear-gradient(135deg, #1d4ed8, #3b82f6)' : 'linear-gradient(135deg, #be185d, #ec4899)',
                fontSize: '0.95rem', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'serif',
                boxShadow: selected === 'male' ? '0 0 30px #3b82f644' : '0 0 30px #ec489944',
                border: 'none', cursor: 'pointer',
              }}
              whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}>
              <motion.div className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)', backgroundSize: '200% 100%' }}
                animate={{ backgroundPosition: ['-200% 0%', '200% 0%'] }}
                transition={{ duration: 2.2, repeat: Infinity }} />
              {busy ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }} />
                  Memilih...
                </span>
              ) : `Pilih ${GENDERS.find(g => g.key === selected)?.label} →`}
            </motion.button>
            <p style={{ color: '#6b7280', fontSize: '0.6rem', textAlign: 'center', marginTop: 8, letterSpacing: '0.08em' }}>* Pilihan avatar tidak dapat diubah</p>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="mt-4 flex items-center gap-2" style={{ color: '#7c3aed44', fontSize: '0.75rem', letterSpacing: '0.3em' }}>ᚠ ᚢ ᚦ ᚨ ᚱ ᚲ ᚷ ᚹ</div>
    </motion.div>
  );
}

// ── Cube animation variants ───────────────────────────────────────────────────

const cubeVariants = {
  enter: (dir: number) => ({
    x       : dir > 0 ? '110%' : '-110%',
    rotateY : dir > 0 ? 55 : -55,
    opacity : 0,
    scale   : 0.75,
  }),
  center: {
    x       : 0,
    rotateY : 0,
    opacity : 1,
    scale   : 1,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
  exit: (dir: number) => ({
    x       : dir > 0 ? '-110%' : '110%',
    rotateY : dir > 0 ? -55 : 55,
    opacity : 0,
    scale   : 0.75,
    transition: { duration: 0.38, ease: 'easeIn' },
  }),
};

// ── Floating particle ─────────────────────────────────────────────────────────

function FloatingParticle({ symbol, color, index }: { symbol: string; color: string; index: number }) {
  const angle   = (index / 5) * Math.PI * 2;
  const radius  = 90 + (index % 2) * 30;
  const x       = Math.cos(angle) * radius;
  const y       = Math.sin(angle) * radius;
  return (
    <motion.div
      style={{
        position  : 'absolute',
        left      : '50%',
        top       : '50%',
        x, y,
        fontSize  : '1rem',
        color,
        filter    : `drop-shadow(0 0 6px ${color})`,
        userSelect: 'none',
        pointerEvents: 'none',
      }}
      animate={{
        y     : [y - 8, y + 8, y - 8],
        opacity: [0.5, 1, 0.5],
        scale : [0.85, 1.1, 0.85],
      }}
      transition={{ duration: 2.5 + index * 0.4, repeat: Infinity, ease: 'easeInOut', delay: index * 0.3 }}
    >
      {symbol}
    </motion.div>
  );
}

// ── Step 2: Element — Cube Carousel ───────────────────────────────────────────

function StepElement({
  gender,
  onConfirm,
}: {
  gender    : 'male' | 'female';
  onConfirm : (e: ElemKey) => void;
}) {
  const [[currentIdx, direction], setState] = useState<[number, number]>([0, 0]);
  const [busy, setBusy] = useState(false);
  const dragStart = useRef<number | null>(null);

  const elem = ALL_ELEMENTS[currentIdx];

  const goTo = (newIdx: number, dir: number) => {
    setState([newIdx, dir]);
  };

  const prev = () => {
    const newIdx = (currentIdx - 1 + ALL_ELEMENTS.length) % ALL_ELEMENTS.length;
    goTo(newIdx, -1);
  };

  const next = () => {
    const newIdx = (currentIdx + 1) % ALL_ELEMENTS.length;
    goTo(newIdx, 1);
  };

  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    await new Promise(r => setTimeout(r, 400));
    onConfirm(elem.key as ElemKey);
  };

  // Swipe / drag support
  const onDragStart = (clientX: number) => { dragStart.current = clientX; };
  const onDragEnd   = (clientX: number) => {
    if (dragStart.current === null) return;
    const delta = clientX - dragStart.current;
    if (Math.abs(delta) > 40) { delta < 0 ? next() : prev(); }
    dragStart.current = null;
  };

  return (
    <motion.div
      className="relative flex flex-col items-center px-4 py-8 mx-4 rounded-3xl"
      style={{
        maxWidth: 560, width: '100%',
        background: 'linear-gradient(170deg, #0e0525 0%, #1a0840 40%, #080215 100%)',
        border   : '2px solid #7c3aed55',
        boxShadow: '0 0 80px #7c3aed22, 0 40px 100px rgba(0,0,0,0.95)',
      }}
      initial={{ scale: 0.88, y: 40, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      exit={{ scale: 0.88, opacity: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <motion.div className="text-center mb-5 w-full" initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <motion.div className="text-3xl mb-1" animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }} transition={{ duration: 3, repeat: Infinity }}>🌟</motion.div>
        <h1 style={{ fontFamily: 'serif', fontSize: '1.45rem', fontWeight: 900, letterSpacing: '0.15em', background: 'linear-gradient(90deg, #fbbf24, #f0abfc, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textTransform: 'uppercase' }}>
          Kecocokan Elemen
        </h1>
        <p style={{ color: '#a78bfa', fontSize: '0.72rem', letterSpacing: '0.1em', marginTop: 3 }}>Geser atau tekan panah — pilih resonansi jiwamu</p>
        <div className="flex items-center gap-3 mt-3">
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, #7c3aed55)' }} />
          <span style={{ color: '#7c3aed', fontSize: '0.68rem', letterSpacing: '0.2em' }}>✦ Langkah 2 / 2 ✦</span>
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, #7c3aed55, transparent)' }} />
        </div>
        <p style={{ fontSize: '0.62rem', color: '#4b5563', marginTop: 6, letterSpacing: '0.08em' }}>
          ⚠️ Kecocokan elemen bersifat permanen dan tidak dapat diubah
        </p>
      </motion.div>

      {/* ── Cube Carousel ─────────────────────────────────────────────────── */}
      <div className="relative w-full flex items-center justify-center mb-5" style={{ height: 320 }}>
        {/* Left arrow */}
        <motion.button
          onClick={prev}
          whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
          style={{
            position : 'absolute', left: 4, zIndex: 20,
            width: 40, height: 40, borderRadius: '50%',
            background: `${elem.glow}33`,
            border   : `1.5px solid ${elem.color}55`,
            color    : elem.color, fontSize: '1.2rem', fontWeight: 900,
            display  : 'flex', alignItems: 'center', justifyContent: 'center',
            cursor   : 'pointer', boxShadow: `0 0 12px ${elem.glow}44`,
            transition: 'all 0.3s ease',
          }}
        >‹</motion.button>

        {/* Carousel stage */}
        <div
          style={{ flex: 1, overflow: 'hidden', perspective: 1400, position: 'relative', height: '100%', margin: '0 52px' }}
          onMouseDown={e => onDragStart(e.clientX)}
          onMouseUp={e => onDragEnd(e.clientX)}
          onTouchStart={e => onDragStart(e.touches[0].clientX)}
          onTouchEnd={e => onDragEnd(e.changedTouches[0].clientX)}
        >
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={currentIdx}
              custom={direction}
              variants={cubeVariants}
              initial="enter"
              animate="center"
              exit="exit"
              style={{
                position : 'absolute', inset: 0,
                display  : 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                borderRadius: 20,
                background: `radial-gradient(ellipse at 50% 30%, ${elem.glow}28 0%, ${elem.glowDark}18 50%, rgba(6,2,18,0.96) 100%)`,
                border   : `1.5px solid ${elem.color}50`,
                boxShadow: `0 0 40px ${elem.glow}35, inset 0 0 30px ${elem.glowDark}20`,
                cursor   : 'grab',
                userSelect: 'none',
              }}
            >
              {/* Aura ring behind silhouette */}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                {/* Floating particles */}
                {elem.particles.map((sym, pi) => (
                  <FloatingParticle key={pi} symbol={sym} color={elem.locked ? '#4b5563' : elem.color} index={pi} />
                ))}

                {/* Glow ring */}
                <motion.div
                  style={{
                    position    : 'absolute',
                    width       : 180, height: 180,
                    borderRadius: '50%',
                    background  : `radial-gradient(ellipse at center, ${elem.locked ? '#37415155' : `${elem.glow}55`} 0%, ${elem.locked ? '#1f293722' : `${elem.color}22`} 40%, transparent 75%)`,
                    filter      : `blur(18px)`,
                  }}
                  animate={{ scale: [0.9, 1.08, 0.9], opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                />

                {/* Silhouette */}
                <motion.div
                  style={{
                    width   : 140, height: 180,
                    position: 'relative', zIndex: 2,
                    filter  : elem.locked
                      ? 'grayscale(1) brightness(0.35) drop-shadow(0 0 8px #374151)'
                      : `drop-shadow(0 0 24px ${elem.color}) drop-shadow(0 0 8px ${elem.glow})`,
                  }}
                  animate={{ y: [-4, 4, -4] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <img
                    src={bodyImg}
                    alt="silhouette"
                    draggable={false}
                    style={{ width: '100%', height: '100%', objectFit: 'contain', userSelect: 'none' }}
                  />
                  {/* Color overlay on silhouette */}
                  {!elem.locked && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: `${elem.color}30`,
                      mixBlendMode: 'screen',
                      borderRadius: 4,
                    }} />
                  )}
                </motion.div>

                {/* Orbit ring */}
                <motion.div
                  style={{
                    position    : 'absolute',
                    width       : 200, height: 200,
                    borderRadius: '50%',
                    border      : `1px solid ${elem.locked ? '#37415130' : `${elem.color}30`}`,
                    top: '50%', left: '50%',
                    transform   : 'translate(-50%, -50%)',
                  }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
                />

                {/* Lock overlay badge — sits on top when locked */}
                {elem.locked && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
                    style={{
                      position    : 'absolute',
                      zIndex      : 10,
                      display     : 'flex',
                      flexDirection: 'column',
                      alignItems  : 'center',
                      gap         : 6,
                      top: '50%',
                      left: '50%',
                      transform   : 'translate(-50%, -50%)',
                    }}
                  >
                    <div style={{
                      width       : 52, height: 52,
                      borderRadius: '50%',
                      background  : 'rgba(0,0,0,0.85)',
                      border      : '2px solid #4b5563',
                      display     : 'flex',
                      alignItems  : 'center',
                      justifyContent: 'center',
                      fontSize    : '1.5rem',
                      boxShadow   : '0 0 20px rgba(0,0,0,0.8)',
                    }}>🔒</div>
                    <div style={{
                      background  : 'rgba(0,0,0,0.9)',
                      border      : '1px solid #4b556380',
                      borderRadius: 8,
                      padding     : '4px 10px',
                      fontSize    : '0.6rem',
                      color       : '#9ca3af',
                      textAlign   : 'center',
                      letterSpacing: '0.06em',
                      whiteSpace  : 'nowrap',
                    }}>
                      Butuh Pencapaian Khusus
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Element label */}
              <motion.h2
                key={`label-${currentIdx}`}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                style={{
                  fontFamily : 'serif', fontSize: '1.5rem', fontWeight: 900,
                  letterSpacing: '0.15em', textTransform: 'uppercase',
                  color: elem.color, textShadow: `0 0 20px ${elem.glow}`,
                  marginBottom: 6,
                }}
              >
                {elem.label}
              </motion.h2>

              {/* Bonus badge */}
              <motion.div
                key={`bonus-${currentIdx}`}
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                style={{
                  background  : `${elem.glowDark}80`,
                  border      : `1px solid ${elem.bonusClr}55`,
                  borderRadius: 20,
                  padding     : '3px 14px',
                  fontSize    : '0.65rem',
                  color       : elem.bonusClr,
                  fontWeight  : 700,
                  letterSpacing: '0.06em',
                  marginBottom: 10,
                }}
              >
                {elem.bonus}
              </motion.div>

              {/* Description */}
              <motion.p
                key={`desc-${currentIdx}`}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
                style={{
                  fontSize    : '0.7rem', color: '#94a3b8', textAlign: 'center',
                  lineHeight  : 1.6, paddingLeft: 16, paddingRight: 16,
                  letterSpacing: '0.03em',
                }}
              >
                {elem.desc}
              </motion.p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right arrow */}
        <motion.button
          onClick={next}
          whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
          style={{
            position : 'absolute', right: 4, zIndex: 20,
            width: 40, height: 40, borderRadius: '50%',
            background: `${elem.glow}33`,
            border   : `1.5px solid ${elem.color}55`,
            color    : elem.color, fontSize: '1.2rem', fontWeight: 900,
            display  : 'flex', alignItems: 'center', justifyContent: 'center',
            cursor   : 'pointer', boxShadow: `0 0 12px ${elem.glow}44`,
            transition: 'all 0.3s ease',
          }}
        >›</motion.button>
      </div>

      {/* ── Dot indicator ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-6">
        {ALL_ELEMENTS.map((el, i) => (
          <motion.button
            key={el.key}
            onClick={() => goTo(i, i > currentIdx ? 1 : -1)}
            whileHover={{ scale: 1.3 }}
            style={{
              width      : i === currentIdx ? 20 : 7,
              height     : 7,
              borderRadius: 4,
              background : i === currentIdx ? elem.color : '#374151',
              border     : `1px solid ${i === currentIdx ? elem.color : '#4b5563'}`,
              cursor     : 'pointer',
              transition : 'all 0.3s ease',
              boxShadow  : i === currentIdx ? `0 0 8px ${elem.glow}88` : 'none',
            }}
          />
        ))}
      </div>

      {/* ── Confirm button ────────────────────────────────────────────────── */}
      <div className="w-full max-w-sm">
        {elem.locked ? (
          /* ── Locked state ── */
          <motion.div
            key={`locked-${currentIdx}`}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="w-full py-4 rounded-xl text-center relative overflow-hidden"
            style={{
              background   : 'linear-gradient(135deg, #1f2937, #111827)',
              border       : '1.5px solid #374151',
              fontSize     : '0.85rem', letterSpacing: '0.1em',
              fontFamily   : 'serif', color: '#6b7280',
              cursor       : 'not-allowed',
            }}
          >
            🔒 Elemen Terkunci — Geser Untuk Pilihan Lain
            {/* Diagonal cross pattern */}
            <div style={{
              position     : 'absolute', inset: 0,
              backgroundImage: 'repeating-linear-gradient(45deg, #ffffff06 0px, #ffffff06 1px, transparent 1px, transparent 8px)',
              pointerEvents: 'none', borderRadius: 12,
            }} />
          </motion.div>
        ) : (
          /* ── Normal/selectable state ── */
          <motion.button
            onClick={confirm}
            disabled={busy}
            className="w-full py-4 rounded-xl font-bold text-white relative overflow-hidden"
            style={{
              background  : `linear-gradient(135deg, ${elem.glowDark}, ${elem.glow}, ${elem.color})`,
              fontSize    : '0.9rem', letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: 'serif',
              border      : 'none', cursor: busy ? 'not-allowed' : 'pointer',
              boxShadow   : `0 0 30px ${elem.glow}66`,
              transition  : 'all 0.3s ease',
            }}
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
          >
            <motion.div className="absolute inset-0 pointer-events-none"
              style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.2) 50%, transparent 60%)', backgroundSize: '200% 100%' }}
              animate={{ backgroundPosition: ['-200% 0%', '200% 0%'] }}
              transition={{ duration: 2.2, repeat: Infinity }} />
            {busy ? (
              <span className="flex items-center justify-center gap-2">
                <motion.div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }} />
                Menyegel Perjanjian...
              </span>
            ) : `⚔️ Segel ${elem.label} sebagai Elemenku`}
          </motion.button>
        )}

        {/* Non-element highlight */}
        {elem.key === 'none' && (
          <motion.div
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="mt-3 text-center rounded-lg px-4 py-2"
            style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 10 }}
          >
            <p style={{ fontSize: '0.65rem', color: '#fbbf24', letterSpacing: '0.06em' }}>
              ⭐ Pilihan Non-Elemen memberi +1 poin stat ekstra setiap naik level (total 3/level vs 2/level untuk elemen)
            </p>
          </motion.div>
        )}

        {/* Elemental attack bonus info for regular elements */}
        {!elem.locked && elem.elemAtkKey && (
          <motion.div
            key={`atkbonus-${currentIdx}`}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="mt-3 text-center rounded-lg px-4 py-2"
            style={{
              background: `${elem.glowDark}50`,
              border    : `1px solid ${elem.color}35`,
              borderRadius: 10,
            }}
          >
            <p style={{ fontSize: '0.65rem', color: elem.bonusClr, letterSpacing: '0.06em' }}>
              ⚔️ Memilih elemen ini memberikan +100 Attack {elem.label} di awal permainan
            </p>
          </motion.div>
        )}

        {/* Locked element extra info */}
        {elem.locked && (
          <motion.div
            key={`lockinfo-${currentIdx}`}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="mt-3 text-center rounded-lg px-4 py-2"
            style={{ background: 'rgba(75,85,99,0.12)', border: '1px solid rgba(75,85,99,0.3)', borderRadius: 10 }}
          >
            <p style={{ fontSize: '0.63rem', color: '#6b7280', letterSpacing: '0.05em', lineHeight: 1.6 }}>
              🏆 Elemen <span style={{ color: elem.color }}>{elem.label}</span> hanya bisa didapat melalui pencapaian khusus dalam perjalananmu. Selesaikan misi legendaris untuk membuka kekuatan ini.
            </p>
          </motion.div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2" style={{ color: '#7c3aed44', fontSize: '0.75rem', letterSpacing: '0.3em' }}>ᚠ ᚢ ᚦ ᚨ ᚱ ᚲ ᚷ ᚹ</div>
    </motion.div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

interface GenderSelectModalProps {
  onSelect       : (gender: 'male' | 'female', element: ElementType) => void;
  existingGender?: 'male' | 'female';
}

export default function GenderSelectModal({ onSelect, existingGender }: GenderSelectModalProps) {
  const [step,   setStep]   = useState<1 | 2>(existingGender ? 2 : 1);
  const [gender, setGender] = useState<'male' | 'female' | null>(existingGender ?? null);

  const handleGender = (g: 'male' | 'female') => {
    setGender(g);
    setStep(2);
  };

  const handleElement = (el: ElemKey) => {
    if (!gender) return;
    onSelect(gender, el as ElementType);
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center"
        style={{ background: 'radial-gradient(ellipse at center, #0d0520 0%, #020108 70%)', backdropFilter: 'blur(24px)' }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      >
        <BgRunes />

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" className="w-full flex justify-center px-4"
              initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.35 }}>
              <StepGender onConfirm={handleGender} />
            </motion.div>
          )}
          {step === 2 && gender && (
            <motion.div key="step2" className="w-full flex justify-center px-4"
              initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.35 }}>
              <StepElement gender={gender} onConfirm={handleElement} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}