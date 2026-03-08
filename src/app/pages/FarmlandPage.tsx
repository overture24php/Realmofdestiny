import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Coins } from 'lucide-react';
import { useGame } from '../contexts/GameContext';
import { MenuAccordion, AccordionItem } from '../components/MenuAccordion';

const BG_IMG = 'https://images.unsplash.com/photo-1564046105882-bee6cd1271d7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZWRpZXZhbCUyMGZhcm1sYW5kJTIwYWdyaWN1bHR1cmUlMjBmaWVsZCUyMGNyb3BzJTIwdmlsbGFnZXxlbnwxfHx8fDE3NzI5MDc1MjR8MA&ixlib=rb-4.1.0&q=80&w=1080';
const IMG_SELL = 'https://images.unsplash.com/photo-1651037049239-31cacb33da6b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZWRpZXZhbCUyMGZhbnRhc3klMjBtYXJrZXQlMjBzdGFsbHMlMjB2aWxsYWdlfGVufDF8fHx8MTc3MjkwNzUyMnww&ixlib=rb-4.1.0&q=80&w=1080';

export default function FarmlandPage() {
  const navigate = useNavigate();
  const { player } = useGame();
  const [showDialog, setShowDialog] = useState(false);
  const [dialogMsg, setDialogMsg] = useState('');

  const gold = player?.gold ?? 0;

  const openDialog = (msg: string) => { setDialogMsg(msg); setShowDialog(true); };

  const menuItems: AccordionItem[] = [
    {
      id: 'sewa',
      label: 'Sewa Lahan',
      sublabel: '1.000 Gold / petak lahan',
      emoji: '🪙',
      image: BG_IMG,
      badge: 'Coming Soon',
      badgeColor: '#fbbf24',
      accentColor: '#4ade80',
      glowColor: 'rgba(74,222,128,0.3)',
      fromColor: 'rgba(5,46,22,0.4)',
      content: (
        <div className="space-y-3">
          <p style={{ color: '#9ca3af', fontSize: '0.78rem', lineHeight: 1.65 }}>
            Sewa petak lahan untuk bercocok tanam. Setiap petak bisa menanam 1 bibit. Maksimal 1.000 petak.
          </p>
          <div className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)' }}>
            <span style={{ color: '#4ade80', fontFamily: 'serif', fontWeight: 700, fontSize: '0.82rem' }}>💰 Harga Sewa</span>
            <span style={{ color: '#fbbf24', fontWeight: 700 }}>1.000 Gold / petak</span>
          </div>
          <motion.button onClick={() => openDialog('Fitur sewa lahan perkebunan sedang dalam pengembangan.\nSegera hadir bersama sistem pertanian!')}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            className="w-full py-3 rounded-xl"
            style={{ background: 'linear-gradient(135deg, rgba(22,101,52,0.6), rgba(20,83,45,0.4))', border: '1.5px solid rgba(74,222,128,0.4)', color: '#4ade80', cursor: 'pointer', fontFamily: 'serif', fontWeight: 700, fontSize: '0.85rem' }}>
            🌱 Sewa Lahan
          </motion.button>
        </div>
      ),
    },
    {
      id: 'jual',
      label: 'Jual Lahan',
      sublabel: '500 Gold / petak lahan kembali',
      emoji: '💸',
      image: IMG_SELL,
      badge: 'Coming Soon',
      badgeColor: '#fbbf24',
      accentColor: '#f59e0b',
      glowColor: 'rgba(245,158,11,0.3)',
      fromColor: 'rgba(59,31,0,0.4)',
      content: (
        <div className="space-y-3">
          <p style={{ color: '#9ca3af', fontSize: '0.78rem', lineHeight: 1.65 }}>
            Jual kembali lahan yang kamu miliki. Harga jual 500 Gold per petak (50% dari harga beli).
          </p>
          <div className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
            <span style={{ color: '#f59e0b', fontFamily: 'serif', fontWeight: 700, fontSize: '0.82rem' }}>💰 Harga Jual</span>
            <span style={{ color: '#fbbf24', fontWeight: 700 }}>500 Gold / petak</span>
          </div>
          <motion.button onClick={() => openDialog('Fitur jual lahan perkebunan sedang dalam pengembangan.\nSegera hadir bersama sistem pertanian!')}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            className="w-full py-3 rounded-xl"
            style={{ background: 'linear-gradient(135deg, rgba(120,53,15,0.6), rgba(92,40,8,0.4))', border: '1.5px solid rgba(245,158,11,0.4)', color: '#f59e0b', cursor: 'pointer', fontFamily: 'serif', fontWeight: 700, fontSize: '0.85rem' }}>
            💸 Jual Lahan
          </motion.button>
        </div>
      ),
    },
  ];

  return (
    <div className="relative max-w-2xl mx-auto min-h-screen">

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${BG_IMG})` }} />
        <div className="absolute inset-0" style={{ background: 'rgba(2,20,5,0.82)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(74,222,128,0.15) 0%, transparent 65%)' }} />
        {['🌾', '🌱', '🍃', '🌿', '☀️', '💧'].map((e, i) => (
          <motion.div key={i} className="absolute pointer-events-none select-none text-2xl opacity-20"
            style={{ left: `${8 + i * 15}%`, top: -40 }}
            animate={{ y: ['0%', '110vh'], opacity: [0, 0.3, 0.3, 0], rotate: [0, i % 2 === 0 ? 360 : -360] }}
            transition={{ duration: 9 + i * 1.3, delay: i * 1.4, repeat: Infinity, ease: 'linear' }}
          >{e}</motion.div>
        ))}
      </div>

      {/* Dialog */}
      <AnimatePresence>
        {showDialog && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
            onClick={() => setShowDialog(false)}>
            <motion.div initial={{ scale: 0.8, y: 40 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, y: 40 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl overflow-hidden"
              style={{ background: 'rgba(5,46,22,0.97)', border: '1px solid rgba(74,222,128,0.5)', boxShadow: '0 20px 60px rgba(0,0,0,0.9)' }}>
              <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, #4ade80, transparent)' }} />
              <div className="p-6 text-center">
                <motion.div className="text-5xl mb-4" animate={{ y: [0, -8, 0] }} transition={{ duration: 2, repeat: Infinity }}>🌱</motion.div>
                <h3 style={{ fontFamily: 'serif', fontWeight: 900, color: '#4ade80', fontSize: '1.2rem', marginBottom: 8 }}>Segera Hadir!</h3>
                <p style={{ color: '#9ca3af', fontSize: '0.82rem', lineHeight: 1.7, marginBottom: 20, whiteSpace: 'pre-line' }}>{dialogMsg}</p>
                <motion.button onClick={() => setShowDialog(false)} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                  className="w-full py-3 rounded-xl"
                  style={{ background: 'linear-gradient(135deg, #166534, #15803d)', color: '#fff', fontFamily: 'serif', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                  Oke, Ditunggu!
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 p-4 pb-24">

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <motion.button onClick={() => navigate('/game/village')} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <ArrowLeft className="w-5 h-5 text-gray-300" />
          </motion.button>
          <div className="flex-1">
            <h1 style={{ fontFamily: 'serif', fontWeight: 900, color: '#4ade80', fontSize: '1.4rem', letterSpacing: '0.04em' }}>
              🌾 Lahan Perkebunan Desa
            </h1>
            <p style={{ color: '#6b7280', fontSize: '0.72rem' }}>Sewa dan kelola lahan pertanianmu</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)' }}>
            <Coins className="w-4 h-4" style={{ color: '#fbbf24' }} />
            <span style={{ color: '#fbbf24', fontWeight: 700, fontSize: '0.85rem' }}>{gold.toLocaleString()}</span>
          </div>
        </div>

        {/* Coming soon badge */}
        <motion.div className="mb-5 py-2.5 px-4 rounded-xl border flex items-center justify-center gap-2"
          style={{ background: 'rgba(251,191,36,0.08)', borderColor: 'rgba(251,191,36,0.3)' }}
          animate={{ opacity: [0.7, 1, 0.7] }} transition={{ duration: 2.5, repeat: Infinity }}>
          <motion.div className="w-2 h-2 rounded-full bg-yellow-400" animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
          <span style={{ color: '#fbbf24', fontSize: '0.78rem', fontWeight: 700, fontFamily: 'serif' }}>Sistem Perkebunan — Segera Hadir!</span>
        </motion.div>

        {/* Accordion menu */}
        <MenuAccordion items={menuItems} title="Kelola Lahan" />

        {/* Lore */}
        <motion.div className="mt-6 p-5 rounded-2xl border" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          style={{ background: 'rgba(5,46,22,0.4)', borderColor: 'rgba(74,222,128,0.2)', backdropFilter: 'blur(12px)' }}>
          <div className="flex items-start gap-3">
            <span className="text-3xl">📜</span>
            <div>
              <h3 style={{ fontFamily: 'serif', fontWeight: 700, color: '#4ade80', marginBottom: 4, fontSize: '0.9rem' }}>Tanah Subur Daun Hijau</h3>
              <p style={{ color: '#6b7280', fontSize: '0.73rem', lineHeight: 1.7 }}>
                Lahan perkebunan desa ini terkenal dengan kesuburannya. Tanah di kaki Pegunungan Hijau Abadi kaya akan mineral dan energi sihir alami yang mempercepat pertumbuhan tanaman.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}