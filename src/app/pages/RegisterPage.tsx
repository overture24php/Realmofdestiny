import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff, Crown, AlertCircle, CheckCircle, Shield, Swords } from 'lucide-react';
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

export default function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', confirmPassword: '',
  });
  const [showPassword, setShowPassword]               = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError]                             = useState('');
  const [success, setSuccess]                         = useState('');
  const [loading, setLoading]                         = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setError('Password dan konfirmasi password tidak cocok.');
      setLoading(false);
      return;
    }
    if (formData.password.length < 6) {
      setError('Password minimal 6 karakter.');
      setLoading(false);
      return;
    }

    const email = formData.email.trim().toLowerCase();
    const name  = formData.name.trim();
    const supabase = getSupabaseClient();

    try {
      // Daftarkan akun — player data akan dibuat otomatis oleh GameContext saat login pertama
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password: formData.password,
        options: { data: { name } },
      });

      if (signUpError) {
        const msg = signUpError.message.toLowerCase();
        if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
          setError('Email sudah terdaftar. Gunakan email lain atau login.');
        } else {
          setError(signUpError.message);
        }
        setLoading(false);
        return;
      }

      if (signUpData.session) {
        setSuccess('Pendaftaran berhasil! Memasuki kerajaan...');
        setTimeout(() => navigate('/game/village'), 300);
        return;
      }

      setSuccess('Pendaftaran berhasil! ✉️ Periksa emailmu dan klik link konfirmasi, lalu login.');
      setLoading(false);
      setTimeout(() => navigate('/login'), 4000);
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
          src="https://images.unsplash.com/photo-1766258863162-2fa31f7a1ee3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYXJrJTIwZmFudGFzeSUyMG1lZGlldmFsJTIwY2FzdGxlJTIwbmlnaHQlMjBmb2clMjBhdG1vc3BoZXJpY3xlbnwxfHx8fDE3NzI2OTM1MTd8MA&ixlib=rb-4.1.0&q=80&w=1080"
          alt="Castle Background"
          className="w-full h-full object-cover"
          style={{ filter: 'brightness(0.2) saturate(0.5)' }}
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(5,0,20,0.92) 0%, rgba(25,0,50,0.88) 50%, rgba(5,0,20,0.95) 100%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 70% at 50% 30%, rgba(88,28,135,0.2) 0%, transparent 70%)' }} />
      </div>

      <MagicParticles />

      {/* ── Register Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-lg my-6"
      >
        <div className="absolute -inset-px rounded-3xl" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.45), rgba(219,39,119,0.25), rgba(124,58,237,0.45))', filter: 'blur(1px)' }} />

        <div className="relative rounded-3xl overflow-hidden"
          style={{
            background: 'rgba(5, 3, 18, 0.93)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(124,58,237,0.3)',
            boxShadow: '0 30px 100px rgba(0,0,0,0.85), inset 0 1px 0 rgba(124,58,237,0.18)',
          }}
        >
          <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, #7c3aed, #ec4899, #fbbf24, #ec4899, #7c3aed, transparent)' }} />

          <div className="p-8">
            {/* Header */}
            <div className="text-center mb-6">
              <motion.div
                animate={{ filter: ['drop-shadow(0 0 10px #fbbf2460)', 'drop-shadow(0 0 24px #fbbf24aa)', 'drop-shadow(0 0 10px #fbbf2460)'] }}
                transition={{ duration: 3.5, repeat: Infinity }}
                className="inline-block mb-3"
              >
                <Crown className="w-12 h-12 text-yellow-400 mx-auto" />
              </motion.div>
              <h1 style={{ fontFamily: 'serif', fontWeight: 900, fontSize: '1.7rem', background: 'linear-gradient(135deg, #fbbf24, #a855f7, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Bergabung dengan Kerajaan
              </h1>
              <p style={{ color: '#6b7280', fontSize: '0.7rem', letterSpacing: '0.2em', marginTop: 4 }}>TULISKAN LEGENDA PERTAMAMU</p>
              <RuneDivider label="DAFTAR AKUN" />

              {/* Info panel */}
              <div className="flex items-start gap-3 p-3 rounded-xl mb-2" style={{ background: 'rgba(88,28,135,0.15)', border: '1px solid rgba(124,58,237,0.25)' }}>
                <span className="text-lg flex-shrink-0">⚔️</span>
                <p style={{ fontSize: '0.7rem', color: '#a78bfa', lineHeight: 1.6, textAlign: 'left' }}>
                  Avatar, gender, dan affinitas elemen akan dipilih setelah kamu masuk ke dunia untuk pertama kalinya.
                </p>
              </div>
            </div>

            {/* Alerts */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className="mb-5 p-4 rounded-xl flex items-start gap-3"
                  style={{ background: 'rgba(127,29,29,0.3)', border: '1px solid rgba(239,68,68,0.4)' }}
                >
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-red-300 text-sm">{error}</p>
                </motion.div>
              )}
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className="mb-5 p-4 rounded-xl flex items-start gap-3"
                  style={{ background: 'rgba(20,83,45,0.35)', border: '1px solid rgba(34,197,94,0.4)' }}
                >
                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <p className="text-green-300 text-sm">{success}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleRegister} className="space-y-5">

              {/* Name */}
              <div>
                <label style={{ fontSize: '0.72rem', color: '#a855f7', letterSpacing: '0.12em', display: 'block', marginBottom: 6 }}>✦ NAMA PAHLAWAN</label>
                <input
                  name="name" type="text" value={formData.name} onChange={handleChange}
                  required placeholder="Masukkan namamu..."
                  className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-600 outline-none transition-all"
                  style={{ background: 'rgba(15,8,40,0.8)', border: '1px solid rgba(124,58,237,0.35)', fontSize: '0.9rem' }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(168,85,247,0.7)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(124,58,237,0.35)')}
                />
              </div>

              {/* Email */}
              <div>
                <label style={{ fontSize: '0.72rem', color: '#a855f7', letterSpacing: '0.12em', display: 'block', marginBottom: 6 }}>✦ EMAIL</label>
                <input
                  name="email" type="email" value={formData.email} onChange={handleChange}
                  required placeholder="pahlawan@kerajaan.com"
                  className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-600 outline-none transition-all"
                  style={{ background: 'rgba(15,8,40,0.8)', border: '1px solid rgba(124,58,237,0.35)', fontSize: '0.9rem' }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(168,85,247,0.7)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(124,58,237,0.35)')}
                />
              </div>

              {/* Password row */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#a855f7', letterSpacing: '0.12em', display: 'block', marginBottom: 6 }}>✦ PASSWORD</label>
                  <div className="relative">
                    <input
                      name="password" type={showPassword ? 'text' : 'password'} value={formData.password} onChange={handleChange}
                      required placeholder="Min. 6 karakter"
                      className="w-full px-4 py-3 pr-12 rounded-xl text-white placeholder-gray-600 outline-none transition-all"
                      style={{ background: 'rgba(15,8,40,0.8)', border: '1px solid rgba(124,58,237,0.35)', fontSize: '0.9rem' }}
                      onFocus={e => (e.target.style.borderColor = 'rgba(168,85,247,0.7)')}
                      onBlur={e => (e.target.style.borderColor = 'rgba(124,58,237,0.35)')}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-500 hover:text-purple-300 transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#a855f7', letterSpacing: '0.12em', display: 'block', marginBottom: 6 }}>✦ KONFIRMASI PASSWORD</label>
                  <div className="relative">
                    <input
                      name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} value={formData.confirmPassword} onChange={handleChange}
                      required placeholder="Ulangi password"
                      className="w-full px-4 py-3 pr-12 rounded-xl text-white placeholder-gray-600 outline-none transition-all"
                      style={{ background: 'rgba(15,8,40,0.8)', border: '1px solid rgba(124,58,237,0.35)', fontSize: '0.9rem' }}
                      onFocus={e => (e.target.style.borderColor = 'rgba(168,85,247,0.7)')}
                      onBlur={e => (e.target.style.borderColor = 'rgba(124,58,237,0.35)')}
                    />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-500 hover:text-purple-300 transition-colors">
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={loading ? {} : { scale: 1.02, boxShadow: '0 0 40px rgba(168,85,247,0.65)' }}
                whileTap={loading ? {} : { scale: 0.98 }}
                className="w-full py-4 rounded-xl flex items-center justify-center gap-2 transition-all"
                style={{
                  background: loading ? 'rgba(124,58,237,0.3)' : 'linear-gradient(135deg, #7c3aed, #ec4899)',
                  fontFamily: 'serif', fontWeight: 900, fontSize: '1rem',
                  boxShadow: loading ? 'none' : '0 8px 30px rgba(124,58,237,0.45)',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? (
                  <>
                    <motion.div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
                    Membuat Legenda...
                  </>
                ) : (
                  <>
                    <Crown className="w-5 h-5" />
                    Bergabung ke Kerajaan
                  </>
                )}
              </motion.button>
            </form>

            {/* Login link */}
            <p className="text-center mt-6" style={{ color: '#4b5563', fontSize: '0.8rem' }}>
              Sudah punya akun?{' '}
              <Link to="/login" className="text-purple-400 hover:text-purple-300 transition-colors" style={{ fontWeight: 700 }}>
                Masuk ke Kerajaan
              </Link>
            </p>

            {/* Bottom rune row */}
            <div className="flex items-center justify-center gap-4 mt-6" style={{ color: '#7c3aed33', fontSize: '0.65rem', letterSpacing: '0.35em' }}>
              <Shield className="w-3 h-3 text-purple-900/50" />
              <span>ᚠ ᚢ ᚦ ᚨ ᚱ ᚲ ᚷ ᚹ</span>
              <Swords className="w-3 h-3 text-purple-900/50" />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
