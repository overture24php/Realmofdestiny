import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Star } from 'lucide-react';
import { useGame } from '../contexts/GameContext';
import { MenuAccordion, AccordionItem } from '../components/MenuAccordion';

const BG_IMG = 'https://images.unsplash.com/photo-1772465971257-01b79cae5030?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZWRpZXZhbCUyMHZpbGxhZ2UlMjBoYWxsJTIwY291bmNpbCUyMG1lZXRpbmclMjBoYWxsJTIwc3RvbmV8ZW58MXx8fHwxNzcyOTA3NTI2fDA&ixlib=rb-4.1.0&q=80&w=1080';

const IMG_PEDAGANG  = 'https://images.unsplash.com/photo-1651037049239-31cacb33da6b?w=800&q=80';
const IMG_PETUALANG = 'https://images.unsplash.com/photo-1727986760616-0d8f65a6ab92?w=800&q=80';
const IMG_PENJAGA   = 'https://images.unsplash.com/photo-1618519764620-7403abdbdfe9?w=800&q=80';

type CareerRole = 'pedagang' | 'petualang' | 'penjaga';

interface Career {
  id: CareerRole; icon: string; name: string; title: string;
  desc: string; perks: string[];
  color: string; glow: string; border: string; bgFrom: string; bgTo: string;
  image: string;
}

const CAREERS: Career[] = [
  {
    id: 'pedagang', icon: '💰', name: 'Pedagang', title: 'Pedagang Ulung',
    desc: 'Jalur karir bagi mereka yang menguasai seni tawar-menawar dan perdagangan. Setiap transaksi menguntungkan adalah kemenanganmu.',
    perks: ['+50% harga jual semua item','Akses diskon khusus di pasar','Bisa membuka toko pribadi','Bonus gold dari setiap misi dagang'],
    color: '#fbbf24', glow: 'rgba(251,191,36,0.25)', border: '#fbbf24', bgFrom: '#3b1f00', bgTo: '#1a0d00', image: IMG_PEDAGANG,
  },
  {
    id: 'petualang', icon: '⚔️', name: 'Petualang', title: 'Petualang Pemberani',
    desc: 'Hidup untuk menjelajahi dunia dan menaklukkan tantangan. Misi guild dan dungeon adalah makananmu sehari-hari.',
    perks: ['Akses misi guild petualang','+20% EXP dari semua pertempuran','Bisa masuk dungeon eksklusif','Reputasi meningkat lebih cepat'],
    color: '#f87171', glow: 'rgba(248,113,113,0.25)', border: '#f87171', bgFrom: '#3b0707', bgTo: '#1a0303', image: IMG_PETUALANG,
  },
  {
    id: 'penjaga', icon: '🛡️', name: 'Penjaga Desa', title: 'Penjaga Desa Daun Hijau',
    desc: 'Mengabdi untuk melindungi desa dari ancaman monster dan penjahat. Tugas mulia dengan imbalan yang setimpal.',
    perks: ['Misi khusus penjaga desa','Gaji besar setiap misi selesai','+30% DEF saat di wilayah desa','Dihormati oleh penduduk desa'],
    color: '#60a5fa', glow: 'rgba(96,165,250,0.25)', border: '#60a5fa', bgFrom: '#0c1e3b', bgTo: '#050d1a', image: IMG_PENJAGA,
  },
];

export default function TownHallPage() {
  const navigate = useNavigate();
  const { player } = useGame();
  const [selectedCareer, setSelectedCareer] = useState<Career | null>(null);
  const [confirmOpen, setConfirmOpen]       = useState(false);
  const [successOpen, setSuccessOpen]       = useState(false);
  const [chosenCareer, setChosenCareer]     = useState<Career | null>(null);

  const currentRole = player?.career ?? null;

  const handleSelect = (career: Career) => { setSelectedCareer(career); setConfirmOpen(true); };
  const handleConfirm = () => { setConfirmOpen(false); setChosenCareer(selectedCareer); setSuccessOpen(true); };

  const menuItems: AccordionItem[] = CAREERS.map(career => ({
    id: career.id,
    label: career.name,
    sublabel: career.title,
    emoji: career.icon,
    image: career.image,
    badge: currentRole === career.id ? '✓ Aktif' : 'Coming Soon',
    badgeColor: currentRole === career.id ? career.color : '#fbbf24',
    accentColor: career.color,
    glowColor: career.glow,
    fromColor: career.bgFrom + 'ee',
    content: (
      <div className="space-y-4">
        <p style={{ color: '#9ca3af', fontSize: '0.78rem', lineHeight: 1.65 }}>{career.desc}</p>
        <div>
          <p style={{ color: career.color, fontSize: '0.68rem', fontWeight: 700, marginBottom: 8, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            ✦ Keuntungan Karir
          </p>
          <div className="grid grid-cols-2 gap-2">
            {career.perks.map((perk, j) => (
              <div key={j} className="flex items-start gap-1.5 p-2 rounded-lg"
                style={{ background: career.border + '0c', border: `1px solid ${career.border}20` }}>
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1" style={{ background: career.color }} />
                <p style={{ color: '#9ca3af', fontSize: '0.68rem', lineHeight: 1.4 }}>{perk}</p>
              </div>
            ))}
          </div>
        </div>
        <motion.button
          onClick={() => handleSelect(career)}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          className="w-full py-3 rounded-xl"
          style={{
            background: `linear-gradient(135deg, ${career.bgFrom}, ${career.border}55)`,
            border: `1.5px solid ${career.border}70`,
            color: career.color, cursor: 'pointer',
            fontFamily: 'serif', fontWeight: 800, fontSize: '0.85rem',
          }}>
          {career.icon} Pilih Karir {career.name}
        </motion.button>
      </div>
    ),
  }));

  return (
    <div className="relative max-w-2xl mx-auto min-h-screen">

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${BG_IMG})` }} />
        <div className="absolute inset-0" style={{ background: 'rgba(5,5,15,0.87)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 25%, rgba(167,139,250,0.10) 0%, transparent 65%)' }} />
        {['👑', '⚖️', '📜', '🏛️', '✨', '💫'].map((e, i) => (
          <motion.div key={i} className="absolute pointer-events-none select-none text-xl opacity-15"
            style={{ left: `${8 + i * 15}%`, top: -40 }}
            animate={{ y: ['0%', '110vh'], opacity: [0, 0.2, 0.2, 0] }}
            transition={{ duration: 9 + i * 1.2, delay: i * 1.5, repeat: Infinity, ease: 'linear' }}
          >{e}</motion.div>
        ))}
      </div>

      {/* Confirm dialog */}
      <AnimatePresence>
        {confirmOpen && selectedCareer && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}
            onClick={() => setConfirmOpen(false)}>
            <motion.div initial={{ scale: 0.8, y: 40 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, y: 40 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl overflow-hidden"
              style={{ background: `linear-gradient(160deg, ${selectedCareer.bgFrom} 0%, #050510 100%)`, border: `1.5px solid ${selectedCareer.border}60`, boxShadow: `0 20px 60px rgba(0,0,0,0.9), 0 0 40px ${selectedCareer.glow}` }}>
              <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${selectedCareer.border}, transparent)` }} />
              <div className="p-6 text-center">
                <motion.div className="text-5xl mb-3" animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                  {selectedCareer.icon}
                </motion.div>
                <h3 style={{ fontFamily: 'serif', fontWeight: 900, color: selectedCareer.color, fontSize: '1.2rem', marginBottom: 6 }}>
                  Ambil Karir: {selectedCareer.name}?
                </h3>
                <div className="mb-5 p-3 rounded-xl" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)' }}>
                  <p style={{ color: '#fbbf24', fontSize: '0.72rem' }}>⚠️ Fitur ini masih dalam pengembangan. Efek karir belum aktif.</p>
                </div>
                <div className="flex gap-3">
                  <motion.button onClick={() => setConfirmOpen(false)} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                    className="flex-1 py-3 rounded-xl"
                    style={{ background: 'rgba(75,85,99,0.4)', color: '#9ca3af', border: '1px solid rgba(75,85,99,0.4)', cursor: 'pointer', fontFamily: 'serif', fontWeight: 700 }}>
                    Batal
                  </motion.button>
                  <motion.button onClick={handleConfirm} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                    className="flex-1 py-3 rounded-xl"
                    style={{ background: `linear-gradient(135deg, ${selectedCareer.bgFrom}, ${selectedCareer.border}aa)`, color: '#fff', border: `1px solid ${selectedCareer.border}80`, cursor: 'pointer', fontFamily: 'serif', fontWeight: 700 }}>
                    ✅ Konfirmasi
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success dialog */}
      <AnimatePresence>
        {successOpen && chosenCareer && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}
            onClick={() => setSuccessOpen(false)}>
            <motion.div initial={{ scale: 0.8, y: 40 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, y: 40 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl overflow-hidden"
              style={{ background: 'rgba(5,20,5,0.97)', border: '1px solid rgba(74,222,128,0.5)', boxShadow: '0 20px 60px rgba(0,0,0,0.9)' }}>
              <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, #4ade80, transparent)' }} />
              <div className="p-6 text-center">
                <motion.div className="text-6xl mb-3" animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>🎉</motion.div>
                <h3 style={{ fontFamily: 'serif', fontWeight: 900, color: '#4ade80', fontSize: '1.2rem', marginBottom: 6 }}>Selamat, {chosenCareer.title}!</h3>
                <p style={{ color: '#9ca3af', fontSize: '0.8rem', lineHeight: 1.6, marginBottom: 16 }}>
                  Kamu telah memilih jalur karir <span style={{ color: chosenCareer.color, fontWeight: 700 }}>{chosenCareer.name}</span>. Efek bonus akan aktif setelah sistem karir selesai!
                </p>
                <motion.button onClick={() => setSuccessOpen(false)} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                  className="w-full py-3 rounded-xl"
                  style={{ background: 'linear-gradient(135deg, #166534, #15803d)', color: '#fff', fontFamily: 'serif', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                  Keren! Lanjutkan Petualangan
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
            <h1 style={{ fontFamily: 'serif', fontWeight: 900, color: '#c084fc', fontSize: '1.4rem', letterSpacing: '0.04em' }}>
              🏛️ Balai Desa
            </h1>
            <p style={{ color: '#6b7280', fontSize: '0.72rem' }}>Pilih jalur karir & role hidupmu</p>
          </div>
        </div>

        {/* Current role badge */}
        {currentRole && (
          <motion.div className="mb-4 p-3 rounded-xl border flex items-center gap-2"
            style={{ background: 'rgba(192,132,252,0.08)', borderColor: 'rgba(192,132,252,0.3)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <span className="text-xl">{CAREERS.find(c => c.id === currentRole)?.icon ?? '❓'}</span>
            <p style={{ color: '#c084fc', fontSize: '0.78rem' }}>
              Karir aktif: <span style={{ fontWeight: 700 }}>{CAREERS.find(c => c.id === currentRole)?.name ?? currentRole}</span>
            </p>
          </motion.div>
        )}

        {/* Section header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, rgba(192,132,252,0.4))' }} />
          <Star className="w-4 h-4" style={{ color: '#c084fc' }} />
          <p style={{ fontFamily: 'serif', fontWeight: 900, color: '#c084fc', fontSize: '0.82rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Pilih Jalur Karir
          </p>
          <Star className="w-4 h-4" style={{ color: '#c084fc' }} />
          <div className="h-px flex-1" style={{ background: 'linear-gradient(to left, transparent, rgba(192,132,252,0.4))' }} />
        </div>

        {/* Accordion menu */}
        <MenuAccordion items={menuItems} title="Jalur Karir" />

        {/* Lore */}
        <motion.div className="mt-6 p-5 rounded-2xl border" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          style={{ background: 'rgba(5,5,15,0.5)', borderColor: 'rgba(192,132,252,0.2)', backdropFilter: 'blur(12px)' }}>
          <div className="flex items-start gap-3">
            <span className="text-3xl">📜</span>
            <div>
              <h3 style={{ fontFamily: 'serif', fontWeight: 700, color: '#c084fc', marginBottom: 4, fontSize: '0.9rem' }}>Tentang Balai Desa</h3>
              <p style={{ color: '#6b7280', fontSize: '0.73rem', lineHeight: 1.7 }}>
                Balai Desa Daun Hijau adalah pusat pemerintahan dan kehidupan sosial desa. Di sinilah para pemimpin mengambil keputusan dan para pendatang baru memilih jalur hidup mereka.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}