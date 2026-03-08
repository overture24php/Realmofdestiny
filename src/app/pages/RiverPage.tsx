import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { MenuAccordion, AccordionItem } from '../components/MenuAccordion';

const BG_IMG = 'https://images.unsplash.com/photo-1712493142073-f642a57cc5b1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwZWFjZWZ1bCUyMHJpdmVyJTIwc3RyZWFtJTIwZm9yZXN0JTIwbWVkaWV2YWwlMjBmYW50YXN5fGVufDF8fHx8MTc3MjkwNzUyNXww&ixlib=rb-4.1.0&q=80&w=1080';

function ComingSoon({ desc, color = '#22d3ee' }: { desc: string; color?: string }) {
  return (
    <div className="space-y-3">
      <p style={{ color: '#9ca3af', fontSize: '0.78rem', lineHeight: 1.65 }}>{desc}</p>
      <div className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border"
        style={{ background: color + '0e', borderColor: color + '30' }}>
        <motion.div className="w-2 h-2 rounded-full" style={{ background: color }}
          animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
        <span style={{ color, fontSize: '0.75rem', fontWeight: 700, fontFamily: 'serif' }}>Fitur Segera Hadir!</span>
      </div>
    </div>
  );
}

export default function RiverPage() {
  const navigate = useNavigate();

  const menuItems: AccordionItem[] = [
    {
      id: 'mancing',
      label: 'Memancing',
      sublabel: 'Butuh tongkat pancing dari Stand Pemancing',
      emoji: '🎣',
      image: BG_IMG,
      badge: 'Coming Soon',
      badgeColor: '#fbbf24',
      accentColor: '#22d3ee',
      glowColor: 'rgba(34,211,238,0.3)',
      fromColor: 'rgba(12,30,59,0.4)',
      content: <ComingSoon desc="Duduk santai dan mancing ikan di tepi sungai yang jernih. Butuh tongkat pancing dari Stand Pemancing di Pasar Desa." />,
    },
    {
      id: 'air',
      label: 'Mengambil Air',
      sublabel: 'Untuk memasak, minum, dan irigasi lahan',
      emoji: '💧',
      image: BG_IMG,
      badge: 'Coming Soon',
      badgeColor: '#fbbf24',
      accentColor: '#60a5fa',
      glowColor: 'rgba(96,165,250,0.3)',
      fromColor: 'rgba(12,30,59,0.4)',
      content: <ComingSoon desc="Ambil air bersih sungai untuk kebutuhan memasak, minum, dan pengairan lahan perkebunan." color="#60a5fa" />,
    },
    {
      id: 'batu',
      label: 'Mencari Batu Sungai',
      sublabel: 'Bahan bangunan dan material pandai besi',
      emoji: '🪨',
      image: BG_IMG,
      badge: 'Coming Soon',
      badgeColor: '#fbbf24',
      accentColor: '#a1a1aa',
      glowColor: 'rgba(161,161,170,0.3)',
      fromColor: 'rgba(30,30,40,0.4)',
      content: <ComingSoon desc="Batu sungai bisa digunakan sebagai bahan bangunan atau dijual ke pandai besi dengan harga lumayan." color="#a1a1aa" />,
    },
    {
      id: 'meditasi',
      label: 'Meditasi Dekat Air',
      sublabel: 'Pemulihan mana alami diperkuat suara air',
      emoji: '🧘',
      image: BG_IMG,
      badge: 'Coming Soon',
      badgeColor: '#fbbf24',
      accentColor: '#818cf8',
      glowColor: 'rgba(129,140,248,0.3)',
      fromColor: 'rgba(30,27,75,0.4)',
      content: <ComingSoon desc="Suara gemericik air membantu meningkatkan pemulihan mana secara alami dalam waktu singkat." color="#818cf8" />,
    },
    {
      id: 'herbal',
      label: 'Mencari Tanaman Herbal',
      sublabel: 'Herbal langka di tepian sungai',
      emoji: '🌿',
      image: BG_IMG,
      badge: 'Coming Soon',
      badgeColor: '#fbbf24',
      accentColor: '#4ade80',
      glowColor: 'rgba(74,222,128,0.3)',
      fromColor: 'rgba(5,30,15,0.4)',
      content: <ComingSoon desc="Di tepi sungai tumbuh berbagai tanaman herbal langka yang berguna untuk ramuan penyembuhan dan potion." color="#4ade80" />,
    },
    {
      id: 'hewan',
      label: 'Berburu Hewan Sungai',
      sublabel: 'Bekicot, katak, dan hewan kecil lainnya',
      emoji: '🦆',
      image: BG_IMG,
      badge: 'Coming Soon',
      badgeColor: '#fbbf24',
      accentColor: '#fb923c',
      glowColor: 'rgba(251,146,60,0.3)',
      fromColor: 'rgba(67,20,7,0.4)',
      content: <ComingSoon desc="Kadang-kadang hewan kecil seperti bekicot sungai dan katak bisa dijual atau digunakan sebagai umpan memancing." color="#fb923c" />,
    },
  ];

  return (
    <div className="relative max-w-2xl mx-auto min-h-screen">

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${BG_IMG})` }} />
        <div className="absolute inset-0" style={{ background: 'rgba(2,10,20,0.80)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(34,211,238,0.10) 0%, transparent 65%)' }} />
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div key={i} className="absolute rounded-full pointer-events-none"
            style={{ left: `${10 + i * 11}%`, bottom: `${5 + (i % 3) * 15}%`, width: 40 + i * 8, height: 12, border: '1.5px solid rgba(34,211,238,0.3)' }}
            animate={{ scaleX: [1, 1.6, 1], opacity: [0.5, 0.1, 0.5] }}
            transition={{ duration: 2.5 + i * 0.4, delay: i * 0.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </div>

      <div className="relative z-10 p-4 pb-24">

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <motion.button onClick={() => navigate('/game/village')} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <ArrowLeft className="w-5 h-5 text-gray-300" />
          </motion.button>
          <div className="flex-1">
            <h1 style={{ fontFamily: 'serif', fontWeight: 900, color: '#22d3ee', fontSize: '1.4rem', letterSpacing: '0.04em' }}>
              🌊 Sungai Dekat Desa
            </h1>
            <p style={{ color: '#6b7280', fontSize: '0.72rem' }}>Sungai jernih mengalir tenang di bawah pepohonan</p>
          </div>
        </div>

        {/* Coming soon banner */}
        <motion.div className="mb-5 py-2.5 px-4 rounded-xl border-2 flex items-center justify-center gap-3"
          style={{ background: 'rgba(2,10,25,0.6)', borderColor: 'rgba(34,211,238,0.4)', backdropFilter: 'blur(12px)' }}
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }}>
          <motion.div className="text-2xl" animate={{ y: [0, -8, 0], rotate: [-5, 5, -5] }} transition={{ duration: 3, repeat: Infinity }}>🎣</motion.div>
          <div>
            <p style={{ fontFamily: 'serif', fontWeight: 700, color: '#22d3ee', fontSize: '0.82rem' }}>Area Sungai — Segera Hadir!</p>
            <p style={{ color: '#6b7280', fontSize: '0.68rem' }}>Berbagai aktivitas seru menantimu di sini</p>
          </div>
        </motion.div>

        {/* Accordion menu */}
        <MenuAccordion items={menuItems} title="Aktivitas Sungai" />

        {/* Lore */}
        <motion.div className="mt-6 p-5 rounded-2xl border" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
          style={{ background: 'rgba(2,10,25,0.5)', borderColor: 'rgba(34,211,238,0.2)', backdropFilter: 'blur(12px)' }}>
          <div className="flex items-start gap-3">
            <span className="text-3xl">📜</span>
            <div>
              <h3 style={{ fontFamily: 'serif', fontWeight: 700, color: '#22d3ee', marginBottom: 4, fontSize: '0.9rem' }}>Legenda Sungai Daun Hijau</h3>
              <p style={{ color: '#6b7280', fontSize: '0.73rem', lineHeight: 1.7 }}>
                Konon sungai ini mengalir dari mata air sakral di puncak Pegunungan Hijau Abadi. Air yang mengandung sihir purba ini dipercaya memiliki khasiat pemulihan ringan bagi siapapun yang meminumnya langsung dari sumber.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}