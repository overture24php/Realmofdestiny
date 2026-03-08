import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff, Crown, AlertCircle, Swords, Info, Shield } from 'lucide-react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { MagicParticles } from '../components/ui/MagicParticles';
import { getSupabaseClient } from '../../utils/supabase-client';

function RuneDivider({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, #7c3aed55)' }} />
      <span style={{ color: '#6b21a8', fontSize: '0.65rem', letterSpacing: '0.2em' }}>{label ?? '✦'}</span>
      <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, transparent, #7c3aed55)' }} />
    </div>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = getSupabaseClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        const msg = signInError.message.toLowerCase();
        if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
          setError('Email atau password salah — atau email belum dikonfirmasi. Periksa kotak masuk emailmu.');
        } else if (msg.includes('email not confirmed')) {
          setError('Email belum dikonfirmasi. Periksa kotak masuk dan klik link konfirmasi terlebih dahulu.');
        } else if (msg.includes('too many requests')) {
          setError('Terlalu banyak percobaan. Coba lagi beberapa menit.');
        } else {
          setError(signInError.message);
        }
        setLoading(false);
        return;
      }

      if (!data.session) {
        setError('Login gagal — sesi tidak tersedia. Silakan coba lagi.');
        setLoading(false);
        return;
      }

      setTimeout(() => navigate('/game/village'), 200);
    } catch {
      setError('Terjadi kesalahan. Silakan coba lagi.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 overflow-hidden">

      {/* ── Background ── */}
      <div className="fixed inset-0 z-0">
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1734122373993-36745ac6b688?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYW50YXN5JTIwa25pZ2h0JTIwd2FycmlvciUyMGFybW9yJTIwc3dvcmQlMjBnbG93aW5nfGVufDF8fHx8MTc3MjY5MzUxOHww&ixlib=rb-4.1.0&q=80&w=1080"
          alt="Knight Warrior"
          className="w-full h-full object-cover"
          style={{ filter: 'brightness(0.25) saturate(0.5)' }}
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(5,0,20,0.9) 0%, rgba(30,0,60,0.85) 50%, rgba(5,0,20,0.95) 100%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 70% at 50% 50%, rgba(88,28,135,0.18) 0%, transparent 70%)' }} />
      </div>

      {/* ── Particles ── */}
      <MagicParticles />

      {/* ── Side Decorations ── */}
      <div className="fixed left-8 top-1/2 -translate-y-1/2 hidden xl:flex flex-col items-center gap-4 z-10 opacity-40">
        <div className="w-px h-32" style={{ background: 'linear-gradient(to bottom, transparent, #7c3aed)' }} />
        {['✦','⬡','✧','◈'].map((r, i) => (
          <motion.span key={i} style={{ color: '#7c3aed', fontSize: 14 }}
            animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, delay: i * 0.5, repeat: Infinity }}>
            {r}
          </motion.span>
        ))}
        <div className="w-px h-32" style={{ background: 'linear-gradient(to top, transparent, #7c3aed)' }} />
      </div>
      <div className="fixed right-8 top-1/2 -translate-y-1/2 hidden xl:flex flex-col items-center gap-4 z-10 opacity-40">
        <div className="w-px h-32" style={{ background: 'linear-gradient(to bottom, transparent, #ec4899)' }} />
        {['✶','⊕','❋','✺'].map((r, i) => (
          <motion.span key={i} style={{ color: '#ec4899', fontSize: 14 }}
            animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, delay: i * 0.5 + 0.25, repeat: Infinity }}>
            {r}
          </motion.span>
        ))}
        <div className="w-px h-32" style={{ background: 'linear-gradient(to top, transparent, #ec4899)' }} />
      </div>

      {/* ── Login Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Outer glow */}
        <div className="absolute -inset-px rounded-3xl" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.5), rgba(219,39,119,0.3), rgba(124,58,237,0.5))', filter: 'blur(1px)' }} />

        <div className="relative rounded-3xl overflow-hidden"
          style={{
            background: 'rgba(5, 3, 18, 0.92)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(124,58,237,0.35)',
            boxShadow: '0 25px 80px rgba(0,0,0,0.8), inset 0 1px 0 rgba(124,58,237,0.2)',
          }}
        >
          {/* Top glow bar */}
          <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, #7c3aed, #ec4899, #7c3aed, transparent)' }} />

          <div className="p-8">
            {/* Header */}
            <div className="text-center mb-6">
              <motion.div
                animate={{
                  filter: ['drop-shadow(0 0 8px #fbbf2480)', 'drop-shadow(0 0 20px #fbbf24cc)', 'drop-shadow(0 0 8px #fbbf2480)'],
                  rotate: [-3, 3, -3],
                }}
                transition={{ duration: 4, repeat: Infinity }}
                className="inline-block mb-3"
              >
                <Crown className="w-12 h-12 text-yellow-400 mx-auto" />
              </motion.div>
              <h1 style={{ fontFamily: 'serif', fontWeight: 900, fontSize: '1.7rem', background: 'linear-gradient(135deg, #fbbf24, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Realm of Destiny
              </h1>
              <p style={{ color: '#6b7280', fontSize: '0.7rem', letterSpacing: '0.2em', marginTop: 4 }}>KERAJAAN SIHIR ABADI</p>

              <RuneDivider label="MASUK KE KERAJAAN" />

              <p style={{ color: '#6b7280', fontSize: '0.8rem' }}>Selamat datang kembali, Pahlawan</p>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  className="mb-5 p-4 rounded-xl flex items-start gap-3"
                  style={{ background: 'rgba(127,29,29,0.3)', border: '1px solid rgba(239,68,68,0.4)' }}
                >
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-red-300 text-sm">{error}</p>
                    {error.includes('salah') && (
                      <p className="text-red-400/60 text-xs mt-1">
                        Belum punya akun?{' '}
                        <Link to="/register" className="underline hover:text-red-300">Daftar di sini</Link>
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email */}
              <div>
                <label style={{ fontSize: '0.75rem', color: '#a855f7', letterSpacing: '0.12em', display: 'block', marginBottom: 6 }}>
                  ✦ EMAIL
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="pahlawan@kerajaan.com"
                  className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-600 transition-all outline-none"
                  style={{
                    background: 'rgba(15, 8, 40, 0.8)',
                    border: '1px solid rgba(124,58,237,0.35)',
                    fontSize: '0.9rem',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(168,85,247,0.7)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(124,58,237,0.35)')}
                />
              </div>

              {/* Password */}
              <div>
                <label style={{ fontSize: '0.75rem', color: '#a855f7', letterSpacing: '0.12em', display: 'block', marginBottom: 6 }}>
                  ✦ PASSWORD
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full px-4 py-3 pr-12 rounded-xl text-white placeholder-gray-600 transition-all outline-none"
                    style={{
                      background: 'rgba(15, 8, 40, 0.8)',
                      border: '1px solid rgba(124,58,237,0.35)',
                      fontSize: '0.9rem',
                    }}
                    onFocus={e => (e.target.style.borderColor = 'rgba(168,85,247,0.7)')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(124,58,237,0.35)')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-500 hover:text-purple-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={loading ? {} : { scale: 1.02, boxShadow: '0 0 30px rgba(168,85,247,0.6)' }}
                whileTap={loading ? {} : { scale: 0.98 }}
                className="w-full py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all"
                style={{
                  background: loading ? 'rgba(124,58,237,0.3)' : 'linear-gradient(135deg, #7c3aed, #ec4899)',
                  fontFamily: 'serif',
                  fontWeight: 900,
                  fontSize: '1rem',
                  boxShadow: loading ? 'none' : '0 6px 24px rgba(124,58,237,0.4)',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Memasuki Kerajaan...
                  </>
                ) : (
                  <>
                    <Swords className="w-4 h-4" />
                    Masuk ke Kerajaan
                  </>
                )}
              </motion.button>
            </form>

            <RuneDivider />

            {/* Register link */}
            <p className="text-center" style={{ color: '#6b7280', fontSize: '0.85rem' }}>
              Belum memiliki akun?{' '}
              <Link to="/register" style={{ color: '#a855f7', fontWeight: 700 }}
                className="hover:text-purple-300 transition-colors">
                Daftarkan dirimu
              </Link>
            </p>

            {/* Info note */}
            <motion.div
              className="mt-4 p-3 rounded-xl flex items-start gap-2"
              style={{ background: 'rgba(30, 58, 138, 0.15)', border: '1px solid rgba(59,130,246,0.25)' }}
              animate={{ borderColor: ['rgba(59,130,246,0.25)', 'rgba(99,102,241,0.4)', 'rgba(59,130,246,0.25)'] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <Info className="w-3.5 h-3.5 text-blue-400 mt-0.5 flex-shrink-0" />
              <p style={{ color: '#6b7280', fontSize: '0.7rem', lineHeight: 1.5 }}>
                Jika baru mendaftar, pastikan kamu telah mengkonfirmasi email terlebih dahulu sebelum masuk.
              </p>
            </motion.div>
          </div>

          {/* Bottom glow bar */}
          <div className="h-[1px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.4), transparent)' }} />
        </div>

        {/* Back link */}
        <motion.div
          className="text-center mt-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Link to="/" style={{ color: '#4b5563', fontSize: '0.8rem' }}
            className="hover:text-purple-400 transition-colors flex items-center justify-center gap-1">
            <Shield className="w-3 h-3" />
            Kembali ke Beranda
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
