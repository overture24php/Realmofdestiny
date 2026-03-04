import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { getLocation } from '../data/worldMapData';

// ─── Floating particles ───────────────────────────────────────────────────────

function FloatingParticle({ index, accent }: { index: number; accent: string }) {
  const startX = 5 + (index * 17.3) % 90;
  const delay  = (index * 1.7) % 5;
  const dur    = 7 + (index * 1.1) % 5;
  const emojis: Record<string, string[]> = {
    '#4ade80': ['🍃','🌿','🍀','🌱','🌾','💚'],
    '#f87171': ['🔴','💥','🌋','🔥','💢','⚡'],
    '#60a5fa': ['⚖️','🔵','📜','🏛️','🔍','🔔'],
    '#fbbf24': ['⭐','✨','💫','👑','🔆','🌟'],
    '#c084fc': ['🟣','✨','🔮','🌀','💜','⚗️'],
    '#86efac': ['🌲','🦜','🍃','🌿','🌱','🦊'],
    '#22d3ee': ['🦀','🌊','🐚','🐠','💦','🐋'],
    '#f59e0b': ['🏰','⚔️','👑','💰','🦅','🔔'],
    '#94a3b8': ['⚔️','🛡️','🗡️','🏹','⚙️','🔩'],
    '#d97706': ['👑','🏯','⚔️','🔱','💎','🌟'],
    '#fde68a': ['✨','🌟','💫','⭐','','🕊️'],
    '#f0abfc': ['🕊️','✨','💒','🌸','🙏','⭐'],
  };
  const pool = emojis[accent] ?? emojis['#4ade80'];
  const emoji = pool[index % pool.length];

  return (
    <motion.div
      className="absolute pointer-events-none select-none text-base"
      style={{ left: `${startX}%`, top: -30 }}
      animate={{
        y: ['0px', '110vh'],
        x: [0, 25 * (index % 2 === 0 ? 1 : -1), -18 * (index % 2 === 0 ? 1 : -1), 0],
        opacity: [0, 0.7, 0.7, 0],
        rotate: [0, 180 * (index % 2 === 0 ? 1 : -1)],
      }}
      transition={{ duration: dur, delay, repeat: Infinity, ease: 'linear', times: [0, 0.1, 0.9, 1] }}
    >
      {emoji}
    </motion.div>
  );
}

function GlowOrb({ index, accent }: { index: number; accent: string }) {
  const x   = 10 + (index * 19.7) % 80;
  const y   = 20 + (index * 13.3) % 65;
  const dur = 3 + (index % 4);
  return (
    <motion.div
      className="absolute w-2 h-2 rounded-full pointer-events-none"
      style={{ left: `${x}%`, top: `${y}%`, background: accent, boxShadow: `0 0 10px 4px ${accent}60` }}
      animate={{
        x: [0, 18 * Math.sin(index), -12 * Math.cos(index), 0],
        y: [0, -18 * Math.cos(index), 14 * Math.sin(index), 0],
        opacity: [0, 0.8, 0.5, 0],
        scale: [0.4, 1.2, 0.7, 0.4],
      }}
      transition={{ duration: dur, delay: index * 0.7, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

// ─── Field Banner ─────────────────────────────────────────────────────────────

function VineSeparator({ accent }: { accent: string }) {
  return (
    <div className="flex items-center justify-center gap-3 my-1">
      <svg width="100" height="18" viewBox="0 0 100 18" className="opacity-70">
        <path d="M0,9 C16,3 34,15 50,9 C66,3 84,15 100,9" fill="none" stroke={accent} strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="18" cy="5" r="2.5" fill={accent} opacity="0.7"/>
        <circle cx="50" cy="13" r="2"   fill={accent} opacity="0.5"/>
        <circle cx="82" cy="5" r="2.5" fill={accent} opacity="0.7"/>
      </svg>
      <span className="text-lg">✦</span>
      <svg width="100" height="18" viewBox="0 0 100 18" className="opacity-70 scale-x-[-1]">
        <path d="M0,9 C16,3 34,15 50,9 C66,3 84,15 100,9" fill="none" stroke={accent} strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="18" cy="5" r="2.5" fill={accent} opacity="0.7"/>
        <circle cx="50" cy="13" r="2"   fill={accent} opacity="0.5"/>
        <circle cx="82" cy="5" r="2.5" fill={accent} opacity="0.7"/>
      </svg>
    </div>
  );
}

// Each corner is drawn with explicit SVG paths — no CSS transform tricks
function CornerBracket({ pos, accent }: { pos: 'tl' | 'tr' | 'bl' | 'br'; accent: string }) {
  // Outer L-path, inner L-path, main circle cx/cy, two accent dot positions
  const config = {
    tl: {
      outer: 'M3,49 L3,3 L49,3',
      inner: 'M10,45 L10,10 L45,10',
      cx: 6,  cy: 6,
      d1: [18, 3],  d2: [3, 18],
    },
    tr: {
      outer: 'M3,3 L49,3 L49,49',
      inner: 'M7,7 L42,7 L42,42',
      cx: 46, cy: 6,
      d1: [34, 3],  d2: [49, 18],
    },
    bl: {
      outer: 'M49,49 L3,49 L3,3',
      inner: 'M45,42 L10,42 L10,7',
      cx: 6,  cy: 46,
      d1: [18, 49], d2: [3, 34],
    },
    br: {
      outer: 'M3,49 L49,49 L49,3',
      inner: 'M7,42 L42,42 L42,7',
      cx: 46, cy: 46,
      d1: [34, 49], d2: [49, 34],
    },
  }[pos];

  return (
    <svg width="52" height="52" viewBox="0 0 52 52" className="opacity-55">
      <path d={config.outer} fill="none" stroke={accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d={config.inner} fill="none" stroke={accent} strokeWidth="0.8" strokeLinecap="round" opacity="0.5"/>
      <circle cx={config.cx} cy={config.cy} r="4" fill={accent + '30'} stroke={accent} strokeWidth="1.2"/>
      <circle cx={config.d1[0]} cy={config.d1[1]} r="1.8" fill={accent} opacity="0.6"/>
      <circle cx={config.d2[0]} cy={config.d2[1]} r="1.8" fill={accent} opacity="0.6"/>
    </svg>
  );
}

function FieldBanner({ name, accent, bgFrom, subtitle }: { name: string; accent: string; bgFrom: string; subtitle?: string }) {
  return (
    <div className="relative mb-10 overflow-hidden">
      {/* Aura */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          className="w-[550px] h-28 rounded-full blur-3xl"
          style={{ background: `radial-gradient(ellipse, ${accent}22 0%, transparent 70%)` }}
          animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.9, 0.4] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Top line */}
      <motion.div
        className="flex items-center justify-center gap-2 mb-3"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="h-px flex-1 max-w-40" style={{ background: `linear-gradient(to right, transparent, ${accent}60, ${accent})` }} />
        <span className="text-[10px] tracking-[0.4em] font-semibold uppercase opacity-70" style={{ color: accent }}>✦ Realm of Destiny ✦</span>
        <div className="h-px flex-1 max-w-40" style={{ background: `linear-gradient(to left, transparent, ${accent}60, ${accent})` }} />
      </motion.div>

      {/* Plate */}
      <motion.div
        className="relative mx-auto max-w-2xl"
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        {/* Shadow */}
        <div className="absolute inset-0 rounded-2xl blur-xl"
          style={{ background: bgFrom + '60', transform: 'translateY(6px) scaleX(0.92)' }} />

        {/* Plate */}
        <div
          className="relative rounded-2xl border-2 px-8 py-5 overflow-hidden"
          style={{
            background: `linear-gradient(155deg, ${bgFrom}f8 0%, rgba(5,5,15,0.97) 50%, ${bgFrom}f0 100%)`,
            borderColor: accent + '55',
            boxShadow: `0 0 40px ${accent}18, inset 0 1px 0 ${accent}20`,
          }}
        >
          {/* Shimmer */}
          <motion.div
            className="absolute inset-0 opacity-[0.08] pointer-events-none"
            style={{ background: `linear-gradient(105deg, transparent 40%, ${accent}60 50%, transparent 60%)` }}
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear', repeatDelay: 3 }}
          />

          {/* Corners */}
          <div className="absolute top-2 left-2">   <CornerBracket pos="tl" accent={accent} /></div>
          <div className="absolute top-2 right-2">  <CornerBracket pos="tr" accent={accent} /></div>
          <div className="absolute bottom-2 left-2"> <CornerBracket pos="bl" accent={accent} /></div>
          <div className="absolute bottom-2 right-2"><CornerBracket pos="br" accent={accent} /></div>

          {/* Content */}
          <div className="relative text-center">
            <motion.p
              className="text-xs tracking-[0.5em] uppercase mb-2 font-medium opacity-70"
              style={{ color: accent }}
              initial={{ opacity: 0 }} animate={{ opacity: 0.7 }} transition={{ delay: 0.3 }}
            >
              ⚔ &nbsp; Wilayah Petualangan &nbsp; ⚔
            </motion.p>

            <motion.h1
              className="text-4xl font-black tracking-wide"
              style={{
                display: 'inline-block',
                backgroundImage: `linear-gradient(180deg, #fff 0%, ${accent} 45%, ${accent}bb 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: `drop-shadow(0 0 18px ${accent}70)`,
                letterSpacing: '0.04em',
              }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              {name}
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, scaleX: 0.5 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 0.45, duration: 0.4 }}
            >
              <VineSeparator accent={accent} />
            </motion.div>

            <motion.p
              className="text-sm tracking-widest font-light italic opacity-60"
              style={{ color: accent }}
              initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} transition={{ delay: 0.55 }}
            >
              {subtitle ?? '⚔ \u201cJelajahi, lawan, dan bertahan di alam liar ini\u201d ⚔'}
            </motion.p>
          </div>
        </div>
      </motion.div>

      {/* Bottom line */}
      <motion.div
        className="flex items-center justify-center gap-2 mt-3"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="h-px flex-1 max-w-40" style={{ background: `linear-gradient(to right, transparent, ${accent}40)` }} />
        <span className="text-[10px] opacity-40 tracking-[0.6em] uppercase" style={{ color: accent }}>✦ ✦ ✦</span>
        <div className="h-px flex-1 max-w-40" style={{ background: `linear-gradient(to left, transparent, ${accent}40)` }} />
      </motion.div>
    </div>
  );
}

// ─── Zone-specific content ────────────────────────────────────────────────────

interface AreaContent {
  monsters: { emoji: string; name: string; level: string; note: string }[];
  resources: { emoji: string; name: string; rarity: string }[];
  atmosphere: string;
  danger: 'Aman' | 'Rendah' | 'Sedang' | 'Tinggi' | 'Berbahaya';
  dangerColor: string;
}

const AREA_CONTENT: Record<string, AreaContent> = {
  // ── Padang Rumput ──────────────────────────────────────────────────────────
  'padang-rumput-slime-utara': {
    atmosphere: 'Udara segar, embun pagi, bunyi krik-krik serangga',
    danger: 'Rendah',
    dangerColor: '#4ade80',
    monsters: [
      { emoji: '🟢', name: 'Slime Hijau',    level: 'Lv. 2',   note: 'Jinak, tapi jangan dipijak' },
      { emoji: '🔵', name: 'Slime Biru',     level: 'Lv. 4',   note: 'Muncul malam hari, lebih agresif' },
      { emoji: '🟡', name: 'Slime Kuning',   level: 'Lv. 5',   note: 'Meledak saat mati, hati-hati' },
    ],
    resources: [
      { emoji: '💧', name: 'Jeli Hijau',     rarity: 'Umum'   },
      { emoji: '🌿', name: 'Rumput Sihir',   rarity: 'Umum'   },
      { emoji: '💎', name: 'Inti Slime',     rarity: 'Langka' },
    ],
  },
  'padang-rumput-slime-selatan': {
    atmosphere: 'Tanah kemerahan, aroma asam, spora merah beterbangan',
    danger: 'Sedang',
    dangerColor: '#f97316',
    monsters: [
      { emoji: '🔴', name: 'Slime Merah',    level: 'Lv. 3',   note: 'Enzim asam, menyengat kulit' },
      { emoji: '🟣', name: 'Slime Ungu',     level: 'Lv. 5',   note: 'Menyerang dalam kelompok' },
      { emoji: '⚫', name: 'Slime Hitam',    level: 'Lv. 6',   note: 'Sangat keras, resisten fisik' },
    ],
    resources: [
      { emoji: '🔴', name: 'Jeli Merah',     rarity: 'Umum'   },
      { emoji: '🍄', name: 'Jamur Spora',    rarity: 'Umum'   },
      { emoji: '💊', name: 'Ekstrak Asam',   rarity: 'Jarang' },
    ],
  },
  'padang-rumput-slime-timur': {
    atmosphere: 'Spora ungu melayang, aroma mistik dan tanah lembab',
    danger: 'Sedang',
    dangerColor: '#c084fc',
    monsters: [
      { emoji: '🟣', name: 'Slime Ungu',     level: 'Lv. 3',   note: 'Bisa melempar bola sihir kecil' },
      { emoji: '🔮', name: 'Slime Mistik',   level: 'Lv. 5',   note: 'Memiliki shield magis tipis' },
      { emoji: '🌀', name: 'Slime Chaos',    level: 'Lv. 6',   note: 'Bergerak tidak terprediksi, bisa teleport pendek' },
    ],
    resources: [
      { emoji: '🟣', name: 'Jeli Ungu',      rarity: 'Umum'   },
      { emoji: '✨', name: 'Spora Mistik',    rarity: 'Jarang' },
      { emoji: '🔮', name: 'Kristal Sihir',  rarity: 'Langka' },
    ],
  },
  'padang-rumput-king-slime': {
    atmosphere: 'Aroma manis seperti madu, tanah mengkilap keemasan',
    danger: 'Tinggi',
    dangerColor: '#fbbf24',
    monsters: [
      { emoji: '👑', name: 'King Slime',      level: 'Lv. 8',   note: 'Boss area, jarang menyerang duluan' },
      { emoji: '🟡', name: 'Royal Slime',     level: 'Lv. 6',   note: 'Pengawal King Slime' },
      { emoji: '🔶', name: 'Slime Emas',      level: 'Lv. 5',   note: 'Melarikan diri saat bertarung' },
    ],
    resources: [
      { emoji: '👑', name: 'Mahkota Slime',   rarity: 'Sangat Langka' },
      { emoji: '💛', name: 'Jeli Emas',       rarity: 'Jarang' },
      { emoji: '🍯', name: 'Madu Sihir',      rarity: 'Jarang' },
    ],
  },

  // ── Alam Liar ──────────────────────────────────────────────────────────────
  'hutan-umum': {
    atmosphere: 'Cahaya matahari menembus daun, kicau burung, langkah kaki yang meredam',
    danger: 'Rendah',
    dangerColor: '#86efac',
    monsters: [
      { emoji: '🐗', name: 'Babi Hutan Liar',   level: 'Lv. 4', note: 'Menyerang bila diganggu, bertahan dalam kelompok' },
      { emoji: '🐒', name: 'Monyet Pencuri',     level: 'Lv. 3', note: 'Mencuri item dari kantong, sangat gesit' },
      { emoji: '🦊', name: 'Rubah Sihir',        level: 'Lv. 6', note: 'Mengeluarkan kabut aroma untuk membingungkan musuh' },
      { emoji: '🐻', name: 'Beruang Hutan',      level: 'Lv. 7', note: 'Sangat kuat, biasanya tidur siang' },
    ],
    resources: [
      { emoji: '🌰', name: 'Biji Hutan',         rarity: 'Umum'   },
      { emoji: '🍄', name: 'Jamur Hutan',         rarity: 'Umum'   },
      { emoji: '🦷', name: 'Taring Babi Hutan',   rarity: 'Jarang' },
      { emoji: '🪶', name: 'Bulu Rubah Sihir',    rarity: 'Langka' },
    ],
  },
  'pantai-kepiting': {
    atmosphere: 'Angin laut sejuk, suara ombak, pasir putih panas di bawah kaki',
    danger: 'Sedang',
    dangerColor: '#22d3ee',
    monsters: [
      { emoji: '🦀', name: 'Kepiting Monster',    level: 'Lv. 5', note: 'Capit besi bisa mematahkan tulang' },
      { emoji: '🦞', name: 'Lobster Laut Dalam',  level: 'Lv. 7', note: 'Lebih besar dan berbahaya dari kepiting biasa' },
      { emoji: '🐙', name: 'Gurita Pasir',        level: 'Lv. 8', note: 'Bersembunyi di pasir, menyergap dari bawah' },
    ],
    resources: [
      { emoji: '🦀', name: 'Cangkang Kepiting',   rarity: 'Umum'   },
      { emoji: '🐚', name: 'Kerang Mutiara',       rarity: 'Jarang' },
      { emoji: '💎', name: 'Permata Laut',         rarity: 'Langka' },
    ],
  },

  // ── Kekaisaran Senofia ─────────────────────────────────────────────────────
  'ibukota-kekaisaran-senofia': {
    atmosphere: 'Hiruk pikuk pasar, derap kaki kuda, terompet pengawal istana',
    danger: 'Aman',
    dangerColor: '#4ade80',
    monsters: [
      { emoji: '🧑‍💼', name: 'Pedagang Ibukota',   level: 'NPC', note: 'Menjual barang langka dari seluruh dunia' },
      { emoji: '💂',  name: 'Penjaga Gerbang',     level: 'NPC', note: 'Menjaga ketertiban, perhatikan karma-mu' },
      { emoji: '🧙',  name: 'Penyihir Pengembara', level: 'NPC', note: 'Menawarkan mantra dan ramuan misterius' },
    ],
    resources: [
      { emoji: '💰', name: 'Koin Emas Senofia',    rarity: 'Umum'   },
      { emoji: '📜', name: 'Izin Kekaisaran',      rarity: 'Jarang' },
      { emoji: '💎', name: 'Permata Imperial',     rarity: 'Sangat Langka' },
    ],
  },
  'pangkalan-militer-senofia': {
    atmosphere: 'Derap sepatu besi, gemerincing baju zirah, teriakan komandan latihan',
    danger: 'Tinggi',
    dangerColor: '#94a3b8',
    monsters: [
      { emoji: '⚔️', name: 'Ksatria Penjaga',     level: 'Lv. 10', note: 'Elite guard, sangat terlatih' },
      { emoji: '🏹', name: 'Pemanah Kekaisaran',   level: 'Lv. 11', note: 'Akurasi tinggi dari jarak jauh' },
      { emoji: '🛡️', name: 'Komandan Phalanx',     level: 'Lv. 14', note: 'Pemimpin unit, aura buff teman' },
    ],
    resources: [
      { emoji: '⚙️', name: 'Baja Kekaisaran',      rarity: 'Jarang' },
      { emoji: '🏅', name: 'Lencana Militer',       rarity: 'Jarang' },
      { emoji: '📖', name: 'Manual Siasat Perang',  rarity: 'Langka' },
    ],
  },
  'kastil-kaisar-senofia': {
    atmosphere: 'Sunyi mencekam, langkah pengawal teratur, aura kekuasaan yang terasa berat',
    danger: 'Berbahaya',
    dangerColor: '#d97706',
    monsters: [
      { emoji: '👑', name: 'Pengawal Takhta Elite', level: 'Lv. 16', note: 'Penjaga pribadi Kaisar, tak terkalahkan secara biasa' },
      { emoji: '🧙', name: 'Penyihir Istana',       level: 'Lv. 15', note: 'Spesialis counterspell dan barrier' },
      { emoji: '🐉', name: 'Naga Penjaga Kastil',   level: 'Lv. 20', note: 'Boss — Naga purba penjaga ruang bawah tanah' },
    ],
    resources: [
      { emoji: '👑', name: 'Mahkota Replika',       rarity: 'Sangat Langka' },
      { emoji: '📜', name: 'Dekrit Kaisar',         rarity: 'Langka' },
      { emoji: '💎', name: 'Berlian Kekaisaran',    rarity: 'Sangat Langka' },
    ],
  },
  'markas-polisi-senofia': {
    atmosphere: 'Suara palu hakim, langkah petugas, deringan rantai tahanan',
    danger: 'Sedang',
    dangerColor: '#60a5fa',
    monsters: [
      { emoji: '👮', name: 'Petugas Polisi',        level: 'Lv. 8',  note: 'Menyerang bila karma jahat terdeteksi' },
      { emoji: '⚖️', name: 'Hakim Kekaisaran',      level: 'NPC',    note: 'Memutuskan hukuman bagi pelanggar hukum' },
      { emoji: '🔍', name: 'Detektif Rahasia',      level: 'Lv. 10', note: 'Mengikuti pemain dengan karma mencurigakan' },
    ],
    resources: [
      { emoji: '📜', name: 'Surat Pembebasan',      rarity: 'Jarang' },
      { emoji: '🔑', name: 'Kunci Penjara',         rarity: 'Langka' },
      { emoji: '📁', name: 'Arsip Kriminal',        rarity: 'Jarang' },
    ],
  },

  // ── Ordo Suci Altea ────────────────────────────────────────────────────────
  'pangkalan-ksatria-suci-altea': {
    atmosphere: 'Lagu pujian suci, kemilauan cahaya dari zirah putih, doa para ksatria',
    danger: 'Tinggi',
    dangerColor: '#fde68a',
    monsters: [
      { emoji: '🛡️', name: 'Ksatria Suci Novice',  level: 'Lv. 9',  note: 'Baru dilantik, tapi sudah sangat kuat' },
      { emoji: '⚔️', name: 'Ksatria Suci Elite',   level: 'Lv. 12', note: 'Serangan diberkati cahaya ilahi' },
      { emoji: '😇', name: 'Pendeta Pejuang',       level: 'Lv. 11', note: 'Bisa menyembuhkan rekan dan melemahkan iblis' },
    ],
    resources: [
      { emoji: '✨', name: 'Logam Suci',            rarity: 'Jarang' },
      { emoji: '🕊️', name: 'Bulu Malaikat',        rarity: 'Sangat Langka' },
      { emoji: '💊', name: 'Ramuan Suci Altea',     rarity: 'Jarang' },
    ],
  },
  'katedral-suci-altea': {
    atmosphere: 'Cahaya ilahi dari kaca patri, lantunan doa, aroma dupa dan bunga putih',
    danger: 'Aman',
    dangerColor: '#4ade80',
    monsters: [
      { emoji: '🙏', name: 'Pendeta Senior',        level: 'NPC', note: 'Menerima pengakuan dosa, membersihkan karma' },
      { emoji: '😇', name: 'Biarawati Altea',       level: 'NPC', note: 'Menyediakan penyembuhan gratis bagi pengunjung' },
      { emoji: '👼', name: 'Malaikat Penjaga',      level: 'Lv. 18', note: 'Hanya muncul bila ada yang menodai katedral' },
    ],
    resources: [
      { emoji: '💊', name: 'Air Suci Altea',        rarity: 'Umum'   },
      { emoji: '📿', name: 'Rosario Ilahi',         rarity: 'Jarang' },
      { emoji: '✨', name: 'Berkah Dewi Altea',     rarity: 'Sangat Langka' },
    ],
  },
};

// ─── Zone label & subtitle mapping ───────────────────────────────────────────

const ZONE_LABELS: Record<string, { label: string; subtitle: string }> = {
  village:    { label: 'Desa',              subtitle: '⚔ "Tempat di mana petualanganmu bermula" ⚔' },
  field_slime:{ label: 'Padang Slime',      subtitle: '⚔ "Jelajahi, lawan, dan bertahan di alam liar ini" ⚔' },
  field_king: { label: 'Padang Boss',       subtitle: '⚔ "Tantang sang Raja, atau lari selamatkan diri" ⚔' },
  forest:     { label: 'Hutan',             subtitle: '🌿 "Alam liar menyimpan rahasia bagi yang berani masuk" 🌿' },
  beach:      { label: 'Pantai',            subtitle: '🌊 "Keindahan pantai ini menyembunyikan bahaya di balik ombak" 🌊' },
  capital:    { label: 'Ibukota',           subtitle: '👑 "Jantung Kekaisaran, tempat takdir ditentukan" 👑' },
  military:   { label: 'Pangkalan Militer', subtitle: '⚔ "Hanya yang kuat bertahan di balik tembok ini" ⚔' },
  castle:     { label: 'Kastil Kekaisaran', subtitle: '🏯 "Kekuasaan tertinggi bersemayam di balik pintu ini" 🏯' },
  police:     { label: 'Penegak Hukum',     subtitle: '⚖ "Hukum Kekaisaran berlaku tanpa pandang bulu" ⚖' },
  holy:       { label: 'Ordo Suci',         subtitle: '✨ "Cahaya Dewi Altea menerangi setiap sudut tempat ini" ✨' },
};

// ─── Main FieldPage ───────────────────────────────────────────────────────────

export default function FieldPage() {
  const { locationId } = useParams<{ locationId: string }>();
  const navigate        = useNavigate();
  const location        = locationId ? getLocation(locationId) : undefined;

  useEffect(() => {
    if (!location) navigate('/game/village');
  }, [location, navigate]);

  if (!location) return null;

  const { accentColor: accent, bgFrom, bgImage, name, description, lore, levelRange, zone } = location;
  const content   = AREA_CONTENT[location.id];
  const zoneMeta  = ZONE_LABELS[zone] ?? { label: zone, subtitle: undefined };

  const dangerLabels: Record<string, string> = {
    'Aman': 'bg-green-900/40 border-green-500/40 text-green-300',
    'Rendah': 'bg-green-900/40 border-green-500/40 text-green-300',
    'Sedang': 'bg-orange-900/40 border-orange-500/40 text-orange-300',
    'Tinggi': 'bg-red-900/40 border-red-500/40 text-red-300',
    'Berbahaya': 'bg-red-900/60 border-red-500/60 text-red-200',
  };

  return (
    <div className="relative max-w-5xl mx-auto">

      {/* ── Background ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center transition-all duration-700"
          style={{ backgroundImage: `url(${bgImage})` }} />
        <div className="absolute inset-0" style={{ background: `rgba(2,5,5,0.65)` }} />
        <div className="absolute inset-0" style={{
          background: `radial-gradient(ellipse at 50% 35%, ${accent}18 0%, transparent 65%)`,
        }} />
        <div className="absolute bottom-0 left-0 right-0 h-40"
          style={{ background: 'linear-gradient(to bottom, transparent, rgba(2,5,5,0.85))' }} />
        <div className="absolute top-0 left-0 right-0 h-24"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)' }} />
        <div className="absolute inset-y-0 left-0 w-20"
          style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.4), transparent)' }} />
        <div className="absolute inset-y-0 right-0 w-20"
          style={{ background: 'linear-gradient(to left, rgba(0,0,0,0.4), transparent)' }} />
      </div>

      {/* ── Ambient Particles ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {Array.from({ length: 10 }).map((_, i) => (
          <FloatingParticle key={i} index={i} accent={accent} />
        ))}
        {Array.from({ length: 8 }).map((_, i) => (
          <GlowOrb key={i} index={i} accent={accent} />
        ))}
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 pt-4">

        {/* ── Banner ── */}
        <FieldBanner name={name} accent={accent} bgFrom={bgFrom} subtitle={zoneMeta.subtitle} />

        {/* ── Area info bar ── */}
        <motion.div
          className="flex flex-wrap items-center justify-center gap-3 mb-8"
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        >
          {/* Level range */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl border backdrop-blur-sm"
            style={{ borderColor: accent + '50', background: accent + '15' }}>
            <span className="text-sm">⚔️</span>
            <div>
              <p className="text-[9px] uppercase tracking-wider opacity-60" style={{ color: accent }}>Level</p>
              <p className="text-xs font-bold" style={{ color: accent }}>{levelRange}</p>
            </div>
          </div>

          {/* Danger */}
          {content && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border backdrop-blur-sm ${dangerLabels[content.danger]}`}>
              <span className="text-sm">🛡️</span>
              <div>
                <p className="text-[9px] uppercase tracking-wider opacity-60">Bahaya</p>
                <p className="text-xs font-bold">{content.danger}</p>
              </div>
            </div>
          )}

          {/* Zone type */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl border backdrop-blur-sm"
            style={{ borderColor: accent + '40', background: 'rgba(0,0,0,0.4)' }}>
            <span className="text-sm">🗺️</span>
            <div>
              <p className="text-[9px] uppercase tracking-wider opacity-60" style={{ color: accent }}>Tipe Zona</p>
              <p className="text-xs font-bold text-white/80">
                {zoneMeta.label}
              </p>
            </div>
          </div>

          {/* Atmosphere */}
          {content && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl border backdrop-blur-sm max-w-xs"
              style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.4)' }}>
              <span className="text-sm">🌬️</span>
              <div>
                <p className="text-[9px] uppercase tracking-wider opacity-60 text-gray-400">Suasana</p>
                <p className="text-xs text-gray-300">{content.atmosphere}</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* ── Monsters & Resources grid ── */}
        {content && (
          <div className="grid md:grid-cols-2 gap-6 mb-6">

            {/* Monsters card */}
            <motion.div
              className="rounded-2xl border-2 overflow-hidden"
              style={{
                borderColor: accent + '45',
                background: `linear-gradient(145deg, ${bgFrom}ee, rgba(5,5,15,0.95))`,
                boxShadow: `0 4px 24px ${accent}15`,
              }}
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            >
              {/* Card header */}
              <div className="px-5 py-4 border-b flex items-center gap-3"
                style={{ borderColor: accent + '30', background: accent + '10' }}>
                <span className="text-2xl">⚔️</span>
                <div>
                  <h3 className="font-black text-white text-sm tracking-wide">Monster di Area Ini</h3>
                  <p className="text-xs opacity-50" style={{ color: accent }}>Musuh yang akan ditemui</p>
                </div>
              </div>

              {/* Monster list */}
              <div className="p-4 space-y-3">
                {content.monsters.map((m, i) => (
                  <motion.div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-xl border"
                    style={{ borderColor: accent + '25', background: 'rgba(0,0,0,0.3)' }}
                    initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.08 }}
                    whileHover={{ x: 4 }}
                  >
                    <span className="text-2xl flex-shrink-0">{m.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-bold text-white">{m.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full border font-bold"
                          style={{ borderColor: accent + '60', color: accent, background: accent + '15' }}>
                          {m.level}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 italic">{m.note}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Resources card */}
            <motion.div
              className="rounded-2xl border-2 overflow-hidden"
              style={{
                borderColor: accent + '45',
                background: `linear-gradient(145deg, ${bgFrom}ee, rgba(5,5,15,0.95))`,
                boxShadow: `0 4px 24px ${accent}15`,
              }}
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            >
              {/* Card header */}
              <div className="px-5 py-4 border-b flex items-center gap-3"
                style={{ borderColor: accent + '30', background: accent + '10' }}>
                <span className="text-2xl">🎒</span>
                <div>
                  <h3 className="font-black text-white text-sm tracking-wide">Sumber Daya</h3>
                  <p className="text-xs opacity-50" style={{ color: accent }}>Item yang bisa dikumpulkan</p>
                </div>
              </div>

              {/* Resource list */}
              <div className="p-4 space-y-3">
                {content.resources.map((r, i) => (
                  <motion.div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-xl border"
                    style={{ borderColor: accent + '25', background: 'rgba(0,0,0,0.3)' }}
                    initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.08 }}
                    whileHover={{ x: 4 }}
                  >
                    <span className="text-2xl flex-shrink-0">{r.emoji}</span>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-white">{r.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Kelangkaan:
                        <span className="ml-1 font-semibold" style={{ color: accent }}>{r.rarity}</span>
                      </p>
                    </div>
                  </motion.div>
                ))}

                {/* Explore stub */}
                <motion.button
                  className="w-full mt-2 py-3 rounded-xl border font-bold text-sm transition-all"
                  style={{ borderColor: accent + '50', color: accent, background: accent + '12' }}
                  whileHover={{ scale: 1.02, background: accent + '22' }}
                  whileTap={{ scale: 0.97 }}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
                >
                  🔍 Jelajahi Area (Coming Soon)
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}

        {/* ── Lore card ── */}
        <motion.div
          className="rounded-2xl p-6 border mb-12"
          style={{
            background: bgFrom + '55',
            borderColor: accent + '25',
            backdropFilter: 'blur(12px)',
          }}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
        >
          <div className="flex items-start gap-4">
            <div className="text-4xl flex-shrink-0">📜</div>
            <div>
              <h3 className="font-bold mb-1 flex items-center gap-2" style={{ color: accent }}>
                Catatan Petualang
                <span className="text-[10px] opacity-50">— Lore Daerah</span>
              </h3>
              <p className="text-gray-300/80 text-sm leading-relaxed mb-3">{description}</p>
              <p className="text-gray-400/70 text-sm leading-relaxed italic">"{lore}"</p>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}