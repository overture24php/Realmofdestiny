/**
 * HardcoreWarningModal
 * – Auto-shows on LandingPage to warn players about the hardcore RPG mechanics
 * – sessionStorage flag prevents double-show in same session
 *   (but shows again on next visit/refresh so it's never missed)
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router';
import { X } from 'lucide-react';

interface Mechanic {
  icon  : string;
  title : string;
  desc  : string;
  color : string;
}

const MECHANICS: Mechanic[] = [
  {
    icon : '❤️',
    title: 'HP Adalah Nyawa Permanen',
    desc : 'Tidak ada regenerasi HP otomatis. Tidak ada potion. HP yang hilang di pertempuran TETAP hilang setelah battle selesai — bahkan pemain level 100 bisa memiliki sisa 1 HP.',
    color: '#f87171',
  },
  {
    icon : '☠️',
    title: 'Efek Abnormal Mematikan',
    desc : 'Racun (Poison), Bakar (Burn), dan Berdarah (Bleed) menggerus HP permanen setiap detiknya. Tanpa penangkal, efek ini bisa menguras HP mu hingga ke titik kematian.',
    color: '#a3e635',
  },
  {
    icon : '🔮',
    title: 'Affinitas Elemen Krusial',
    desc : 'Pilihan elemen affinitas menentukan damage bonus dan resistansi. Musuh dengan elemen counter dapat melipatgandakan damage mereka terhadapmu. Kombinasi skill dan elemen WAJIB dipertimbangkan.',
    color: '#818cf8',
  },
  {
    icon : '🏥',
    title: 'Klinik Adalah Satu-satunya Harapan',
    desc : 'Satu-satunya cara memulihkan HP adalah meditasi di Kuil atau perawatan paksa di Klinik Desa selama 30 detik. Jika HP < 1, kamu dipaksa masuk Klinik dan tidak bisa pergi ke mana pun.',
    color: '#34d399',
  },
  {
    icon : '💀',
    title: 'Risiko Reset HP ke 100',
    desc : 'Tidak ada batas bawah selain 1 HP — tapi jika terus kalah tanpa sembuh, bahkan hero level 80 pun bisa berakhir dengan hanya 100 HP tersisa. Bermain ceroboh = konsekuensi permanen.',
    color: '#fb923c',
  },
  {
    icon : '⚔️',
    title: 'Tidak Ada "Coba Lagi" Gratis',
    desc : 'Kekalahan dalam pertempuran memotong HP permanenmu. Sistem battle ini tidak memberikan pengampunan — setiap pertempuran adalah taruhan nyawa karaktermu.',
    color: '#fbbf24',
  },
];

interface Props {
  onClose: () => void;
}

// Animated skull decoration
function SkullOrb({ delay, x, y }: { delay: number; x: string; y: string }) {
  return (
    <motion.div
      style={{
        position: 'absolute', left: x, top: y,
        fontSize: '1.2rem', pointerEvents: 'none',
        filter: 'drop-shadow(0 0 8px rgba(239,68,68,0.6))',
      }}
      animate={{ y: [0, -14, 0], opacity: [0.3, 0.8, 0.3], rotate: [0, 10, -10, 0] }}
      transition={{ duration: 3 + delay, repeat: Infinity, delay }}
    >
      💀
    </motion.div>
  );
}

export function HardcoreWarningModal({ onClose }: Props) {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    // Slight delay so the landing page animates in first
    const t = setTimeout(() => setVisible(true), 900);
    return () => clearTimeout(t);
  }, []);

  const handleAccept = () => {
    setAccepted(true);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[500] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.93)', backdropFilter: 'blur(16px)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Skull decorations */}
          <SkullOrb delay={0}   x="5%"  y="10%" />
          <SkullOrb delay={0.7} x="92%" y="8%"  />
          <SkullOrb delay={1.3} x="3%"  y="80%" />
          <SkullOrb delay={0.4} x="94%" y="75%" />

          <motion.div
            className="relative w-full max-w-2xl max-h-[92vh] overflow-hidden rounded-3xl"
            style={{
              background: 'linear-gradient(165deg, #0d0208 0%, #1a0408 40%, #0a0010 100%)',
              border: '1.5px solid rgba(239,68,68,0.4)',
              boxShadow: '0 0 100px rgba(239,68,68,0.15), 0 0 200px rgba(88,28,135,0.1), 0 40px 120px rgba(0,0,0,0.9)',
            }}
            initial={{ scale: 0.8, y: 60, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 0.1 }}
          >
            {/* Top glow bar */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 3,
              background: 'linear-gradient(90deg, transparent, #ef4444, #dc2626, #ef4444, transparent)',
              boxShadow: '0 0 24px rgba(239,68,68,0.8)',
            }} />

            {/* X close button — top right */}
            <motion.button
              onClick={handleClose}
              style={{
                position: 'absolute', top: 14, right: 14, zIndex: 20,
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(239,68,68,0.15)',
                border: '1px solid rgba(239,68,68,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#f87171',
              }}
              whileHover={{ scale: 1.15, background: 'rgba(239,68,68,0.3)' }}
              whileTap={{ scale: 0.9 }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
              title="Tutup peringatan"
            >
              <X style={{ width: 15, height: 15 }} />
            </motion.button>

            {/* Scrollable content */}
            <div className="overflow-y-auto max-h-[92vh]" style={{ scrollbarWidth: 'thin', scrollbarColor: '#7c3aed40 transparent' }}>
              <div style={{ padding: '36px 32px 28px' }}>

                {/* ── Header ── */}
                <div className="text-center mb-6">
                  {/* Warning icon */}
                  <motion.div
                    style={{ fontSize: '3.5rem', marginBottom: 10, display: 'block' }}
                    animate={{
                      filter: [
                        'drop-shadow(0 0 10px #ef444488)',
                        'drop-shadow(0 0 30px #ef4444dd)',
                        'drop-shadow(0 0 10px #ef444488)',
                      ],
                      rotate: [-3, 3, -3],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    ⚠️
                  </motion.div>

                  {/* PERINGATAN label */}
                  <motion.p
                    style={{ fontSize: '0.65rem', letterSpacing: '0.4em', color: '#ef4444', fontFamily: 'serif', textTransform: 'uppercase', marginBottom: 8 }}
                    animate={{ opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    ✦ BACA SEBELUM BERMAIN ✦
                  </motion.p>

                  <h1 style={{
                    fontFamily: 'serif', fontWeight: 900,
                    fontSize: 'clamp(1.4rem, 4vw, 2.2rem)',
                    background: 'linear-gradient(135deg, #ef4444, #fbbf24, #ef4444)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    marginBottom: 10, lineHeight: 1.2,
                  }}>
                    Ini Adalah Hardcore RPG!
                  </h1>

                  <p style={{ color: '#9ca3af', fontSize: '0.88rem', lineHeight: 1.7, maxWidth: 520, margin: '0 auto' }}>
                    Realm of Destiny bukan RPG biasa. Setiap keputusan membawa konsekuensi
                    <span style={{ color: '#f87171', fontWeight: 700 }}> permanen dan tidak dapat dibatalkan.</span>
                    {' '}Bersiaplah untuk tantangan sesungguhnya.
                  </p>
                </div>

                {/* ── Divider ── */}
                <div style={{ height: 1, margin: '0 0 20px', background: 'linear-gradient(90deg, transparent, #ef444455, transparent)' }} />

                {/* ── Mechanics grid ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginBottom: 20 }}>
                  {MECHANICS.map((m, i) => (
                    <motion.div
                      key={m.title}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + i * 0.08, duration: 0.35 }}
                      style={{
                        padding: '12px 14px',
                        background: `${m.color}0c`,
                        border: `1px solid ${m.color}30`,
                        borderRadius: 12,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <span style={{ fontSize: '1.3rem', flexShrink: 0, marginTop: 2 }}>{m.icon}</span>
                        <div>
                          <p style={{ fontFamily: 'serif', fontWeight: 800, color: m.color, fontSize: '0.82rem', marginBottom: 4 }}>
                            {m.title}
                          </p>
                          <p style={{ color: '#6b7280', fontSize: '0.72rem', lineHeight: 1.6 }}>
                            {m.desc}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* ── Final warning banner ── */}
                <motion.div
                  style={{
                    padding: '14px 18px', borderRadius: 14, marginBottom: 24,
                    background: 'linear-gradient(135deg, rgba(127,29,29,0.35), rgba(88,28,135,0.2))',
                    border: '1px solid rgba(239,68,68,0.4)',
                  }}
                  animate={{ boxShadow: ['0 0 8px rgba(239,68,68,0.1)', '0 0 20px rgba(239,68,68,0.25)', '0 0 8px rgba(239,68,68,0.1)'] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                >
                  <p style={{ fontFamily: 'serif', fontWeight: 900, color: '#fca5a5', fontSize: '0.88rem', marginBottom: 6 }}>
                    💡 Tips untuk Bertahan Hidup:
                  </p>
                  <ul style={{ color: '#9ca3af', fontSize: '0.74rem', lineHeight: 2, paddingLeft: 0, listStyle: 'none' }}>
                    <li>⚔️ Jangan bertarung melawan musuh jauh di atas levelmu sebelum siap</li>
                    <li>🛡️ Selalu sisakan HP yang cukup — jangan terlalu serakah farm EXP</li>
                    <li>🔮 Pilih affinitas elemen yang cocok sejak awal, itu permanen!</li>
                    <li>🏥 Kunjungi Klinik atau Kuil secara rutin sebelum HP terlalu kritis</li>
                    <li>☠️ Jika terkena efek abnormal, tanggani segera — jangan diabaikan</li>
                  </ul>
                </motion.div>

                {/* ── Buttons ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                  {/* Accept — goes to register */}
                  <motion.button
                    onClick={() => { handleAccept(); navigate('/register'); }}
                    style={{
                      width: '100%', padding: '14px 0', borderRadius: 14,
                      background: accepted
                        ? 'linear-gradient(90deg, #15803d, #166534)'
                        : 'linear-gradient(90deg, #7c3aed, #ec4899)',
                      border: 'none', color: '#fff',
                      fontFamily: 'serif', fontWeight: 900, fontSize: '1rem',
                      letterSpacing: '0.06em', cursor: 'pointer',
                      boxShadow: '0 6px 28px rgba(124,58,237,0.5)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                    whileHover={{ scale: 1.02, boxShadow: '0 8px 36px rgba(168,85,247,0.7)' }}
                    whileTap={{ scale: 0.97 }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                  >
                    {accepted ? '✅ Selamat Datang, Pemberani!' : '⚔️ Saya Siap — Masuk ke Kerajaan!'}
                  </motion.button>

                  {/* Login — for returning players */}
                  <motion.button
                    onClick={() => { handleAccept(); navigate('/login'); }}
                    style={{
                      width: '100%', padding: '11px 0', borderRadius: 12,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: '#9ca3af', fontFamily: 'serif', fontWeight: 700,
                      fontSize: '0.88rem', cursor: 'pointer',
                    }}
                    whileHover={{ scale: 1.01, color: '#e5e7eb', borderColor: 'rgba(255,255,255,0.25)' }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.9 }}
                  >
                    🔑 Sudah Terdaftar? Masuk ke Kerajaan
                  </motion.button>

                  {/* Dismiss — just close */}
                  <motion.button
                    onClick={handleClose}
                    style={{
                      background: 'none', border: 'none', color: '#4b5563',
                      fontSize: '0.72rem', cursor: 'pointer', padding: '6px',
                      fontFamily: 'serif',
                    }}
                    whileHover={{ color: '#6b7280' }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.0 }}
                  >
                    Tutup peringatan ini (baca sendiri risikonya)
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}