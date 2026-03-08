import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Swords, Shield, Skull, Crown, Sparkles, Star, ChevronRight } from 'lucide-react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { MagicParticles } from '../components/ui/MagicParticles';
import { HardcoreWarningModal } from '../components/ui/HardcoreWarningModal';
import { getSupabaseClient } from '../../utils/supabase-client';

// ─── Ornamental Divider ───────────────────────────────────────────────────────
function RuneDivider({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-4 my-2">
      <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, #7c3aed55, #a855f780)' }} />
      {label ? (
        <span style={{ color: '#a855f7', fontSize: '0.7rem', letterSpacing: '0.25em', fontFamily: 'serif' }}>{label}</span>
      ) : (
        <span style={{ color: '#7c3aed', fontSize: '1rem' }}>⬡</span>
      )}
      <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, transparent, #7c3aed55, #a855f780)' }} />
    </div>
  );
}

// ─── Feature Card ─────────────────────────────────────────────────────────────
function FeatureCard({
  icon: Icon,
  title,
  desc,
  color,
  glow,
  delay,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  color: string;
  glow: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
      whileHover={{ y: -6, scale: 1.02 }}
      className="relative rounded-2xl overflow-hidden p-6"
      style={{
        background: 'rgba(5, 5, 20, 0.75)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${color}40`,
        boxShadow: `0 4px 30px rgba(0,0,0,0.5), inset 0 1px 0 ${color}20`,
      }}
    >
      {/* top accent */}
      <div className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />

      <motion.div
        className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
        style={{ background: `${glow}20`, border: `1px solid ${color}50`, boxShadow: `0 0 20px ${glow}30` }}
        animate={{ boxShadow: [`0 0 12px ${glow}20`, `0 0 24px ${glow}50`, `0 0 12px ${glow}20`] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        <Icon className="w-7 h-7" style={{ color }} />
      </motion.div>

      <h4 style={{ fontFamily: 'serif', fontWeight: 900, color, fontSize: '1.05rem', marginBottom: 8 }}>{title}</h4>
      <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session) navigate('/game/village');
      else setShowWarning(true); // show warning only for non-logged-in visitors
    };
    checkSession();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Hardcore RPG warning modal */}
      {showWarning && (
        <HardcoreWarningModal onClose={() => setShowWarning(false)} />
      )}

      {/* ── Fixed Background ── */}
      <div className="fixed inset-0 z-0">
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1766258863162-2fa31f7a1ee3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYXJrJTIwZmFudGFzeSUyMG1lZGlldmFsJTIwY2FzdGxlJTIwbmlnaHQlMjBmb2clMjBhdG1vc3BoZXJpY3xlbnwxfHx8fDE3NzI2OTM1MTd8MA&ixlib=rb-4.1.0&q=80&w=1080"
          alt="Kingdom Background"
          className="w-full h-full object-cover"
          style={{ filter: 'brightness(0.3) saturate(0.6)' }}
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(5,0,20,0.6) 0%, rgba(10,0,35,0.85) 40%, rgba(2,0,12,0.97) 100%)' }} />
        {/* Purple fog */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(88,28,135,0.25) 0%, transparent 70%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 40% at 20% 80%, rgba(126,34,206,0.12) 0%, transparent 70%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 40% at 80% 80%, rgba(219,39,119,0.08) 0%, transparent 70%)' }} />
      </div>

      {/* ── Magic Particles ── */}
      <MagicParticles />

      {/* ── Content ── */}
      <div className="relative z-10">

        {/* ── Navigation ── */}
        <header className="sticky top-0 z-50 border-b" style={{ background: 'rgba(3,0,15,0.8)', backdropFilter: 'blur(20px)', borderColor: '#7c3aed25' }}>
          <div className="container mx-auto px-6 py-4 flex justify-between items-center">
            {/* Logo */}
            <motion.div
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <motion.div
                animate={{ rotate: [0, 5, -5, 0], filter: ['drop-shadow(0 0 6px #fbbf24)', 'drop-shadow(0 0 16px #fbbf24)', 'drop-shadow(0 0 6px #fbbf24)'] }}
                transition={{ duration: 4, repeat: Infinity }}
              >
                <Crown className="w-8 h-8 text-yellow-400" />
              </motion.div>
              <div>
                <p style={{ fontFamily: 'serif', fontWeight: 900, fontSize: '1.15rem', background: 'linear-gradient(90deg, #fbbf24, #a855f7, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Realm of Destiny
                </p>
                <p style={{ fontSize: '0.6rem', color: '#7c3aed', letterSpacing: '0.2em' }}>KINGDOM OF ETERNAL FATE</p>
              </div>
            </motion.div>

            {/* Nav Buttons */}
            <motion.div
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Link to="/login"
                className="px-5 py-2 rounded-xl transition-all"
                style={{ border: '1px solid #7c3aed50', color: '#c084fc', background: 'rgba(124,58,237,0.1)', fontSize: '0.85rem', fontWeight: 700 }}
              >
                Masuk
              </Link>
              <Link to="/register"
                className="px-5 py-2 rounded-xl transition-all"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)', color: '#fff', fontSize: '0.85rem', fontWeight: 700, boxShadow: '0 4px 20px rgba(124,58,237,0.4)' }}
              >
                Mulai Bermain
              </Link>
            </motion.div>
          </div>
        </header>

        {/* ── Hero Section ── */}
        <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 py-20">
          {/* Crown glow */}
          <motion.div
            className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)' }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 5, repeat: Infinity }}
          />

          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="max-w-4xl mx-auto"
          >
            {/* Badge */}
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8"
              style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid #7c3aed50' }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Star className="w-3 h-3 text-yellow-400" />
              <span style={{ fontSize: '0.7rem', color: '#a855f7', letterSpacing: '0.2em' }}>DUNIA PLAYER-DRIVEN RPG</span>
              <Star className="w-3 h-3 text-yellow-400" />
            </motion.div>

            {/* Main title */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              style={{
                fontFamily: 'serif',
                fontWeight: 900,
                fontSize: 'clamp(2.8rem, 8vw, 5.5rem)',
                lineHeight: 1.05,
                marginBottom: '1.5rem',
              }}
            >
              <span style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 30%, #a855f7 60%, #ec4899 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 30px rgba(168,85,247,0.4))' }}>
                Tentukan
              </span>
              <br />
              <span style={{ background: 'linear-gradient(135deg, #c084fc 0%, #a855f7 50%, #ec4899 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Takdirmu
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              style={{ fontSize: 'clamp(1rem, 2.5vw, 1.25rem)', color: '#d1d5db', marginBottom: '0.75rem' }}
            >
              ⚔️ Kerajaan Sihir &nbsp;·&nbsp; 🗡️ Pedang Legenda &nbsp;·&nbsp; 💀 Perang Melawan Iblis
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="max-w-2xl mx-auto"
              style={{ fontSize: '0.95rem', color: '#6b7280', lineHeight: 1.7, marginBottom: '3rem' }}
            >
              Dunia yang digerakkan oleh setiap pilihanmu. Jadilah pahlawan suci, raja yang bijaksana,
              penyihir kuno, atau serahkan jiwamu pada kegelapan. Setiap tindakan membentuk nasibmu
              dan nasib seluruh kerajaan.
            </motion.p>

            {/* CTA buttons */}
            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 }}
            >
              <motion.button
                onClick={() => navigate('/register')}
                whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(168,85,247,0.7)' }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center justify-center gap-2 px-10 py-4 rounded-2xl"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)', fontFamily: 'serif', fontWeight: 900, fontSize: '1.05rem', boxShadow: '0 8px 32px rgba(124,58,237,0.5)' }}
              >
                <Swords className="w-5 h-5" />
                Mulai Petualangan
                <ChevronRight className="w-4 h-4" />
              </motion.button>
              <motion.button
                onClick={() => navigate('/login')}
                whileHover={{ scale: 1.03, borderColor: '#a855f7' }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center justify-center gap-2 px-10 py-4 rounded-2xl"
                style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid #7c3aed50', color: '#c084fc', fontFamily: 'serif', fontWeight: 700, fontSize: '1rem' }}
              >
                Masuk ke Kerajaan
              </motion.button>
            </motion.div>
          </motion.div>

          {/* Scroll hint */}
          <motion.div
            className="absolute bottom-10 left-1/2 -translate-x-1/2"
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="w-px h-10 mx-auto" style={{ background: 'linear-gradient(to bottom, #7c3aed, transparent)' }} />
            <div className="w-2 h-2 rounded-full mx-auto mt-1" style={{ background: '#7c3aed' }} />
          </motion.div>
        </section>

        {/* ── Features Section ── */}
        <section className="container mx-auto px-6 py-24">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p style={{ fontSize: '0.7rem', color: '#7c3aed', letterSpacing: '0.25em', marginBottom: 12 }}>✦ PILIH JALANMU ✦</p>
            <h2 style={{ fontFamily: 'serif', fontWeight: 900, fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', background: 'linear-gradient(135deg, #fbbf24, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Sistem Karma Dinamis
            </h2>
            <RuneDivider />
            <p style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: 12 }}>
              Setiap tindakanmu mengubah dunia. Tidak ada jalur yang benar atau salah — hanya konsekuensi.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
            <FeatureCard icon={Shield}   title="Prajurit Suci"   color="#60a5fa" glow="#3b82f6" delay={0}    desc="Lindungi kerajaan dan rakyat. Karma baik membuka jalur menjadi pahlawan legendaris yang dipuja seluruh negeri." />
            <FeatureCard icon={Crown}    title="Raja & Bangsawan" color="#fbbf24" glow="#f59e0b" delay={0.1}  desc="Kuasai politik dan ekonomi kerajaan. Keputusanmu menentukan nasib seluruh rakyat dan batas negeri." />
            <FeatureCard icon={Sparkles} title="Penyihir Kuno"   color="#a855f7" glow="#7c3aed" delay={0.2}  desc="Kuasai sihir arkana yang terlarang. Gunakan untuk menyembuhkan sekutu atau menghancurkan musuh menjadi abu." />
            <FeatureCard icon={Skull}    title="Iblis & Kegelapan" color="#f87171" glow="#ef4444" delay={0.3} desc="Karma buruk membuka jalan gelap. Bergabunglah dengan iblis, serang kota, jadilah momok yang ditakuti semua." />
          </div>
        </section>

        {/* ── Gameplay Features Section ── */}
        <section className="container mx-auto px-6 py-16">
          <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto items-center">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="space-y-8"
            >
              <div>
                <p style={{ fontSize: '0.7rem', color: '#7c3aed', letterSpacing: '0.25em', marginBottom: 8 }}>✦ FITUR UTAMA ✦</p>
                <h2 style={{ fontFamily: 'serif', fontWeight: 900, fontSize: '2.2rem', background: 'linear-gradient(135deg, #fbbf24, #f87171)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Dunia Yang Hidup
                </h2>
              </div>
              <RuneDivider />
              {[
                { icon: '⚔️', color: '#a855f7', title: 'Sistem Karma Dinamis', desc: 'Setiap tindakan memiliki konsekuensi permanen. Serang warga sipil dan dapatkan karma buruk, atau lindungi mereka untuk menjadi pahlawan.' },
                { icon: '🏰', color: '#60a5fa', title: 'Faksi & Reputasi',     desc: 'Karma tinggi (buruk) = Buronan! Tidak bisa masuk kota. Pemain lain bisa memburu pemain karma buruk untuk hadiah besar.' },
                { icon: '💀', color: '#f87171', title: 'Bergabung dengan Iblis', desc: 'Capai karma buruk tertentu untuk membuka faksi iblis. Dapatkan kekuatan gelap yang tidak terkira — tapi tidak bisa kembali ke sisi terang.' },
                { icon: '🗺️', color: '#fbbf24', title: '13 Lokasi Dunia',      desc: 'Jelajahi desa, arena pertempuran, gua iblis, kuil kuno, istana raja, dan banyak lagi dalam peta dunia yang luas.' },
              ].map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-4"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                    style={{ background: `${f.color}15`, border: `1px solid ${f.color}40` }}>
                    {f.icon}
                  </div>
                  <div>
                    <p style={{ fontFamily: 'serif', fontWeight: 700, color: f.color, marginBottom: 4 }}>{f.title}</p>
                    <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="relative"
            >
              <motion.div
                className="absolute -inset-4 rounded-3xl"
                style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(219,39,119,0.2))', filter: 'blur(20px)' }}
                animate={{ opacity: [0.5, 0.9, 0.5] }}
                transition={{ duration: 4, repeat: Infinity }}
              />
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(124,58,237,0.4)', boxShadow: '0 20px 60px rgba(0,0,0,0.7)' }}>
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1663090630390-2ff4160156cf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYXJrJTIwZGVtb24lMjBtb25zdGVyJTIwZmFudGFzeSUyMGVwaWMlMjBiYXR0bGUlMjBtYWdpY3xlbnwxfHx8fDE3NzI2OTM1MjB8MA&ixlib=rb-4.1.0&q=80&w=1080"
                  alt="Epic Battle"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(5,0,20,0.7) 0%, transparent 60%)' }} />
                <div className="absolute bottom-4 left-4 right-4">
                  <p style={{ fontFamily: 'serif', color: '#fbbf24', fontWeight: 700, fontSize: '0.85rem' }}>⚔️ Perang Melawan Kegelapan</p>
                  <p style={{ color: '#9ca3af', fontSize: '0.7rem' }}>Bergabunglah atau lawan — pilihanmu menentukan segalanya</p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Stats Banner ── */}
        <section className="py-16">
          <div className="container mx-auto px-6">
            <div className="rounded-2xl p-8" style={{ background: 'rgba(5,5,20,0.8)', backdropFilter: 'blur(20px)', border: '1px solid rgba(124,58,237,0.3)' }}>
              <div className="absolute inset-0 rounded-2xl" style={{ background: 'radial-gradient(ellipse at center, rgba(124,58,237,0.08), transparent 70%)' }} />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center relative">
                {[
                  { val: '13', label: 'Lokasi Dunia', color: '#a855f7' },
                  { val: '5',  label: 'Core Stats',   color: '#60a5fa' },
                  { val: '100', label: 'Level Cap',    color: '#fbbf24' },
                  { val: '∞',  label: 'Pilihan Nasib', color: '#f87171' },
                ].map((s, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <p style={{ fontFamily: 'serif', fontWeight: 900, fontSize: '3rem', color: s.color, lineHeight: 1, textShadow: `0 0 20px ${s.color}60` }}>
                      {s.val}
                    </p>
                    <p style={{ color: '#6b7280', fontSize: '0.75rem', letterSpacing: '0.1em', marginTop: 8 }}>{s.label}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="container mx-auto px-6 py-24">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto text-center rounded-3xl p-12 relative overflow-hidden"
            style={{
              background: 'rgba(5,5,20,0.9)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(124,58,237,0.4)',
              boxShadow: '0 20px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(124,58,237,0.2)',
            }}
          >
            {/* Glow top bar */}
            <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, #7c3aed, #ec4899, #7c3aed, transparent)' }} />
            <div className="absolute inset-0 rounded-3xl" style={{ background: 'radial-gradient(ellipse at top, rgba(124,58,237,0.12), transparent 70%)' }} />

            <motion.div
              className="text-5xl mb-4"
              animate={{ rotate: [-5, 5, -5], filter: ['drop-shadow(0 0 10px #fbbf24)', 'drop-shadow(0 0 24px #fbbf24)', 'drop-shadow(0 0 10px #fbbf24)'] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              👑
            </motion.div>
            <h2 style={{ fontFamily: 'serif', fontWeight: 900, fontSize: 'clamp(1.6rem, 4vw, 2.5rem)', background: 'linear-gradient(135deg, #fbbf24, #a855f7, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 16 }}>
              Takdirmu Menanti
            </h2>
            <p style={{ color: '#9ca3af', fontSize: '1rem', lineHeight: 1.7, marginBottom: 32 }}>
              Apakah kamu akan menjadi pahlawan yang dipuja seluruh kerajaan, atau penjahat yang mengguncang
              dunia dengan kekuatan kegelapan? Setiap keputusan adalah milikmu.
            </p>
            <motion.button
              onClick={() => navigate('/register')}
              whileHover={{ scale: 1.05, boxShadow: '0 0 50px rgba(168,85,247,0.8)' }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-3 px-12 py-4 rounded-2xl"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)', fontFamily: 'serif', fontWeight: 900, fontSize: '1.1rem', boxShadow: '0 8px 32px rgba(124,58,237,0.5)' }}
            >
              <Crown className="w-5 h-5 text-yellow-400" />
              Bergabung Sekarang
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          </motion.div>
        </section>

        {/* ── Footer ── */}
        <footer className="border-t py-10" style={{ borderColor: 'rgba(124,58,237,0.2)', background: 'rgba(3,0,12,0.8)' }}>
          <div className="container mx-auto px-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Crown className="w-5 h-5 text-yellow-400" />
              <span style={{ fontFamily: 'serif', fontWeight: 700, color: '#9ca3af' }}>Realm of Destiny</span>
            </div>
            <p style={{ color: '#4b5563', fontSize: '0.75rem', letterSpacing: '0.1em' }}>
              ✦ &copy; 2026 Kingdom of Eternal Fate · Semua hak dilindungi ✦
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}