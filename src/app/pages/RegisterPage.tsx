import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Eye, EyeOff, Crown, AlertCircle, CheckCircle, Sword, Shield, User } from 'lucide-react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { getSupabaseClient } from '../../utils/supabase-client';

const STARTING_ROLES = [
  {
    id: 'citizen',
    name: 'Rakyat Biasa',
    icon: User,
    description: 'Mulai dari bawah dan bentuk takdirmu sendiri',
    color: 'text-gray-400',
    bgColor: 'from-gray-600 to-gray-800',
  },
  {
    id: 'adventurer',
    name: 'Petualang',
    icon: Sword,
    description: 'Jelajahi dunia dan cari kekayaan',
    color: 'text-green-400',
    bgColor: 'from-green-600 to-emerald-800',
  },
  {
    id: 'soldier',
    name: 'Prajurit',
    icon: Shield,
    description: 'Lindungi kerajaan dari ancaman',
    color: 'text-blue-400',
    bgColor: 'from-blue-600 to-cyan-800',
  },
];

function createDefaultPlayer(userId: string, email: string, name: string, role = 'citizen') {
  return {
    id: userId,
    name,
    email,
    role,
    karma: 0,
    faction: 'neutral',
    level: 1,
    experience: 0,
    gold: 100,
    stats: {
      hp: 100, mp: 50,
      physicalAtk: 10, magicAtk: 10,
      physicalDef: 10, magicDef: 10,
      dodge: 5, accuracy: 10,
    },
    equipment: { helm: null, rightHand: null, leftHand: null, armor: null, boots: null },
    inventory: [],
    tutorialProgress: {
      gotWeapon: false, trainedAtArena: false,
      defeatedBoars: 0, meditated: false, completed: false,
    },
    location: 'greenleaf_village',
    createdAt: new Date().toISOString(),
  };
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', confirmPassword: '', startingRole: 'citizen',
  });
  const [showPassword, setShowPassword]               = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError]                             = useState('');
  const [success, setSuccess]                         = useState('');
  const [loading, setLoading]                         = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleRoleSelect = (roleId: string) =>
    setFormData({ ...formData, startingRole: roleId });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setError('Password dan konfirmasi password tidak cocok');
      setLoading(false);
      return;
    }
    if (formData.password.length < 6) {
      setError('Password minimal 6 karakter');
      setLoading(false);
      return;
    }

    const email = formData.email.trim().toLowerCase();
    const name  = formData.name.trim();
    const supabase = getSupabaseClient();

    try {
      // ── Daftar via Supabase Auth (simpan data awal di metadata) ─────────────
      console.log('[REGISTER] Mendaftar:', email);

      // Placeholder playerData — id akan diisi setelah user dibuat
      const placeholderData = {
        name,
        role: formData.startingRole,
        karma: 0,
        faction: 'neutral',
        level: 1,
        experience: 0,
        gold: 100,
        stats: { hp: 100, mp: 50, physicalAtk: 10, magicAtk: 10, physicalDef: 10, magicDef: 10, dodge: 5, accuracy: 10 },
        equipment: { helm: null, rightHand: null, leftHand: null, armor: null, boots: null },
        inventory: [],
        tutorialProgress: { gotWeapon: false, trainedAtArena: false, defeatedBoars: 0, meditated: false, completed: false },
        location: 'greenleaf_village',
        createdAt: new Date().toISOString(),
      };

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password: formData.password,
        options: {
          data: {
            name,
            // playerData akan dilengkapi id-nya oleh GameContext saat login pertama
            playerData: placeholderData,
          },
        },
      });

      if (signUpError) {
        const msg = signUpError.message.toLowerCase();
        if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
          setError('Email sudah terdaftar. Silakan gunakan email lain atau login.');
        } else {
          setError(signUpError.message);
        }
        setLoading(false);
        return;
      }

      console.log('[REGISTER] Berhasil! User ID:', signUpData.user?.id);
      setSuccess('Pendaftaran berhasil! Masuk otomatis...');

      // ── Auto-login ───────────────────────────────────────────────────────────
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password: formData.password,
      });

      if (loginError) {
        console.error('[REGISTER] Auto-login gagal:', loginError.message);
        setError('Pendaftaran berhasil, tapi login otomatis gagal. Silakan login manual.');
        setTimeout(() => navigate('/login'), 2500);
        return;
      }

      console.log('[REGISTER] Auto-login berhasil, redirect...');
      setTimeout(() => navigate('/game/village'), 300);
    } catch (err: any) {
      console.error('[REGISTER] Error:', err);
      setError('Terjadi kesalahan. Silakan coba lagi.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1683660107861-c555be9775b9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYW50YXN5JTIwbWVkaWV2YWwlMjBjYXN0bGUlMjBraW5nZG9tfGVufDF8fHx8MTc3MjUyNTYyN3ww&ixlib=rb-4.1.0&q=80&w=1080"
          alt="Fantasy Background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-purple-900/60 to-black/80" />
        <div className="absolute inset-0 bg-black/50" />
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4 group">
            <Crown className="w-10 h-10 text-yellow-400 group-hover:text-yellow-300 transition-colors" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-purple-400 bg-clip-text text-transparent">
              Realm of Destiny
            </h1>
          </Link>
          <p className="text-gray-400 mt-2">Mulai petualanganmu yang legendaris</p>
        </div>

        {/* Card */}
        <div className="bg-gradient-to-br from-purple-900/40 to-black/60 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-8 shadow-2xl shadow-purple-500/20">
          <h2 className="text-2xl font-bold text-center mb-6 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Buat Akun Baru
          </h2>

          {error && (
            <div className="mb-4 p-4 bg-red-900/30 border border-red-500/50 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}
          {success && (
            <div className="mb-4 p-4 bg-green-900/30 border border-green-500/50 rounded-lg flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <p className="text-green-300 text-sm">{success}</p>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-purple-300 mb-2">Nama Karakter</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} required autoComplete="username"
                className="w-full px-4 py-3 bg-black/50 border border-purple-500/30 rounded-lg focus:outline-none focus:border-purple-400 text-white placeholder-gray-500 transition-colors"
                placeholder="Masukkan nama karaktermu" />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-purple-300 mb-2">Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} required autoComplete="email"
                className="w-full px-4 py-3 bg-black/50 border border-purple-500/30 rounded-lg focus:outline-none focus:border-purple-400 text-white placeholder-gray-500 transition-colors"
                placeholder="nama@contoh.com" />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-purple-300 mb-2">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} required autoComplete="new-password"
                  className="w-full px-4 py-3 bg-black/50 border border-purple-500/30 rounded-lg focus:outline-none focus:border-purple-400 text-white placeholder-gray-500 transition-colors pr-12"
                  placeholder="Minimal 6 karakter" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 hover:text-purple-300 transition-colors">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-purple-300 mb-2">Konfirmasi Password</label>
              <div className="relative">
                <input type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required autoComplete="new-password"
                  className="w-full px-4 py-3 bg-black/50 border border-purple-500/30 rounded-lg focus:outline-none focus:border-purple-400 text-white placeholder-gray-500 transition-colors pr-12"
                  placeholder="Ulangi password" />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 hover:text-purple-300 transition-colors">
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-purple-300 mb-3">Pilih Peran Awal</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {STARTING_ROLES.map((role) => {
                  const Icon = role.icon;
                  const isSelected = formData.startingRole === role.id;
                  return (
                    <button key={role.id} type="button" onClick={() => handleRoleSelect(role.id)}
                      className={`p-4 rounded-lg border-2 transition-all duration-300 text-left ${
                        isSelected ? 'border-purple-400 bg-purple-500/20' : 'border-purple-500/30 bg-black/30 hover:border-purple-400/50 hover:bg-purple-500/10'
                      }`}>
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${role.bgColor} flex items-center justify-center mb-2`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <h4 className={`font-bold mb-1 ${role.color}`}>{role.name}</h4>
                      <p className="text-xs text-gray-400">{role.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <button type="submit" disabled={loading || !!success}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg font-bold text-lg shadow-lg shadow-purple-500/50 hover:shadow-purple-400/70 transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none">
              {loading
                ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Mendaftarkan...</span>
                : success ? 'Berhasil!' : 'Daftar Sekarang'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-purple-500/30" /></div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-transparent text-gray-400">atau</span>
            </div>
          </div>

          <div className="text-center">
            <p className="text-gray-400">
              Sudah punya akun?{' '}
              <Link to="/login" className="text-purple-400 hover:text-purple-300 font-semibold transition-colors">Masuk</Link>
            </p>
          </div>
        </div>

        <div className="text-center mt-6">
          <Link to="/" className="text-gray-400 hover:text-gray-300 transition-colors text-sm">← Kembali ke Beranda</Link>
        </div>
      </div>
    </div>
  );
}
