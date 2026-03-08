import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Shield, Swords, Scroll } from 'lucide-react';
import { MenuAccordion, AccordionItem } from '../components/MenuAccordion';

const BG_IMG = 'https://images.unsplash.com/photo-1701848055182-295e0f1e5256?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZWRpZXZhbCUyMGZhbnRhc3klMjBndWlsZCUyMGFkdmVudHVyZXIlMjBoYWxsJTIwdGF2ZXJufGVufDF8fHx8MTc3MjkwNzUyNXww&ixlib=rb-4.1.0&q=80&w=1080';

const IMG_PARTY   = 'https://images.unsplash.com/photo-1631947430066-48c30d57b943?w=800&q=80';
const IMG_GUARD   = 'https://images.unsplash.com/photo-1618519764620-7403abdbdfe9?w=800&q=80';
const IMG_MISSION = 'https://images.unsplash.com/photo-1589182337358-2cb63099350c?w=800&q=80';

function ComingSoonContent({ title, desc, color }: { title: string; desc: string; color: string }) {
  return (
    <div className="space-y-3">
      <p style={{ color: '#9ca3af', fontSize: '0.78rem', lineHeight: 1.65 }}>{desc}</p>
      <div className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border" style={{ background: color + '0e', borderColor: color + '30' }}>
        <motion.div className="w-2 h-2 rounded-full" style={{ background: color }}
          animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
        <span style={{ color, fontSize: '0.78rem', fontWeight: 700, fontFamily: 'serif' }}>
          {title} — Segera Hadir!
        </span>
      </div>
    </div>
  );
}

export default function GuildPage() {
  const navigate = useNavigate();

  const menuItems: AccordionItem[] = [
    {
      id: 'party',
      label: 'Rekrut Party',
      sublabel: 'Cari rekan petualang untuk misi berbahaya',
      emoji: '⚔️',
      image: IMG_PARTY,
      badge: 'Coming Soon',
      badgeColor: '#fbbf24',
      accentColor: '#f87171',
      glowColor: 'rgba(248,113,133,0.3)',
      fromColor: 'rgba(127,29,29,0.4)',
      content: <ComingSoonContent
        title="Rekrut Party"
        desc="Rekrut petualang lain untuk bergabung dalam party-mu. Dengan party yang solid, kamu bisa menaklukkan dungeon dan monster yang lebih kuat dari sebelumnya."
        color="#f87171"
      />,
    },
    {
      id: 'guard',
      label: 'Sewa Pengawal',
      sublabel: 'Sewa NPC pengawal untuk menemanimu',
      emoji: '🛡️',
      image: IMG_GUARD,
      badge: 'Coming Soon',
      badgeColor: '#fbbf24',
      accentColor: '#60a5fa',
      glowColor: 'rgba(96,165,250,0.3)',
      fromColor: 'rgba(12,30,59,0.4)',
      content: <ComingSoonContent
        title="Sewa Pengawal"
        desc="Sewa pengawal terlatih dari guild untuk menemanimu dalam perjalanan. Pengawal dapat membantu dalam pertempuran dan penjelajahan wilayah berbahaya."
        color="#60a5fa"
      />,
    },
    {
      id: 'mission',
      label: 'Ambil Misi Guild',
      sublabel: 'Terima misi resmi dari papan pengumuman guild',
      emoji: '📜',
      image: IMG_MISSION,
      badge: 'Coming Soon',
      badgeColor: '#fbbf24',
      accentColor: '#fbbf24',
      glowColor: 'rgba(251,191,36,0.3)',
      fromColor: 'rgba(59,31,0,0.4)',
      content: <ComingSoonContent
        title="Misi Guild"
        desc="Ambil berbagai misi dari guild mulai dari berburu monster, mengumpulkan bahan, hingga misi escort. Selesaikan untuk mendapat EXP dan Gold berlimpah!"
        color="#fbbf24"
      />,
    },
  ];

  return (
    <div className="relative max-w-2xl mx-auto min-h-screen">

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${BG_IMG})` }} />
        <div className="absolute inset-0" style={{ background: 'rgba(10,5,20,0.85)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(248,113,113,0.10) 0%, transparent 65%)' }} />
        {['⚔️','🛡️','📜','🗡️','🌟','💫'].map((e, i) => (
          <motion.div key={i} className="absolute pointer-events-none select-none text-2xl opacity-15"
            style={{ left: `${8 + i * 14}%`, top: -40 }}
            animate={{ y: ['0%', '110vh'], opacity: [0, 0.2, 0.2, 0] }}
            transition={{ duration: 10 + i, delay: i * 1.5, repeat: Infinity, ease: 'linear' }}
          >{e}</motion.div>
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
            <h1 style={{ fontFamily: 'serif', fontWeight: 900, color: '#f87171', fontSize: '1.4rem', letterSpacing: '0.04em' }}>
              ⚔️ Guild Petualang Desa
            </h1>
            <p style={{ color: '#6b7280', fontSize: '0.72rem' }}>Tempat para pahlawan berkumpul & mencari misi</p>
          </div>
        </div>

        {/* Coming soon banner */}
        <motion.div className="mb-5 py-2.5 px-4 rounded-xl border flex items-center justify-center gap-2"
          style={{ background: 'rgba(248,113,113,0.08)', borderColor: 'rgba(248,113,113,0.3)' }}
          animate={{ opacity: [0.7, 1, 0.7] }} transition={{ duration: 2.5, repeat: Infinity }}>
          <motion.div className="w-2 h-2 rounded-full bg-red-400" animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
          <span style={{ color: '#f87171', fontSize: '0.78rem', fontWeight: 700, fontFamily: 'serif' }}>Guild System — Segera Hadir!</span>
        </motion.div>

        {/* Accordion menu */}
        <MenuAccordion items={menuItems} title="Menu Guild" />

        {/* Guild rank */}
        <motion.div className="mt-6 p-5 rounded-2xl border" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          style={{ background: 'rgba(10,5,20,0.5)', borderColor: 'rgba(248,113,113,0.2)', backdropFilter: 'blur(12px)' }}>
          <h3 style={{ fontFamily: 'serif', fontWeight: 900, color: '#f87171', marginBottom: 12, fontSize: '0.9rem', textAlign: 'center' }}>
            ⚔ Tingkatan Guild ⚔
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {[
              { rank: 'F', color: '#6b7280', label: 'Tembaga' },
              { rank: 'E', color: '#86efac', label: 'Besi' },
              { rank: 'D', color: '#60a5fa', label: 'Baja' },
              { rank: 'C', color: '#c084fc', label: 'Mithril' },
            ].map(r => (
              <div key={r.rank} className="text-center p-2 rounded-xl border" style={{ borderColor: r.color + '35', background: r.color + '10' }}>
                <p style={{ fontFamily: 'serif', fontWeight: 900, color: r.color, fontSize: '1.1rem' }}>{r.rank}</p>
                <p style={{ color: '#6b7280', fontSize: '0.62rem' }}>{r.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}