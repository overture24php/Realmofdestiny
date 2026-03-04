import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Eye, EyeOff, Swords, Shield, Crown, AlertCircle, Info } from 'lucide-react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { getSupabaseClient } from '../../utils/supabase-client';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail]                 = useState('');
  const [password, setPassword]           = useState('');
  const [showPassword, setShowPassword]   = useState(false);
  const [error, setError]                 = useState('');
  const [loading, setLoading]             = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = getSupabaseClient();
      console.log('[LOGIN] Attempting login for:', email);

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        console.error('[LOGIN] Error:', signInError.message);

        // Friendly Indonesian error messages
        if (
          signInError.message.toLowerCase().includes('invalid login credentials') ||
          signInError.message.toLowerCase().includes('invalid credentials')
        ) {
          setError('Email atau password salah. Periksa kembali dan coba lagi.');
        } else if (signInError.message.toLowerCase().includes('email not confirmed')) {
          setError('Email belum dikonfirmasi. Periksa kotak masuk emailmu.');
        } else if (signInError.message.toLowerCase().includes('too many requests')) {
          setError('Terlalu banyak percobaan login. Coba lagi beberapa menit.');
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

      console.log('[LOGIN] Success! User:', data.user?.email);
      // Small delay to let auth state propagate before navigating
      setTimeout(() => navigate('/game/village'), 200);
    } catch (err: any) {
      console.error('[LOGIN] Unexpected error:', err);
      setError('Terjadi kesalahan. Silakan coba lagi.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1627732922021-e73df99d192e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYW50YXN5JTIwd2FycmlvciUyMHN3b3JkJTIwZmlnaHR8ZW58MXx8fHwxNzcyNTI1NjI4fDA&ixlib=rb-4.1.0&q=80&w=1080"
          alt="Fantasy Background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-purple-900/60 to-black/80" />
        <div className="absolute inset-0 bg-black/50" />
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4 group">
            <Crown className="w-10 h-10 text-yellow-400 group-hover:text-yellow-300 transition-colors" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-purple-400 bg-clip-text text-transparent">
              Realm of Destiny
            </h1>
          </Link>
          <p className="text-gray-400 mt-2">Masuki kerajaan sihir dan takdir</p>
        </div>

        {/* Card */}
        <div className="bg-gradient-to-br from-purple-900/40 to-black/60 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-8 shadow-2xl shadow-purple-500/20">
          <h2 className="text-2xl font-bold text-center mb-6 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Masuk ke Akun
          </h2>

          {/* Error */}
          {error && (
            <div className="mb-4 p-4 bg-red-900/30 border border-red-500/50 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-red-300 text-sm">{error}</p>
                {error.includes('salah') && (
                  <p className="text-red-400/70 text-xs mt-1">
                    Belum punya akun?{' '}
                    <Link to="/register" className="underline hover:text-red-300">
                      Daftar di sini
                    </Link>
                  </p>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-purple-300 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3 bg-black/50 border border-purple-500/30 rounded-lg focus:outline-none focus:border-purple-400 text-white placeholder-gray-500 transition-colors"
                placeholder="nama@contoh.com"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-purple-300 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-3 bg-black/50 border border-purple-500/30 rounded-lg focus:outline-none focus:border-purple-400 text-white placeholder-gray-500 transition-colors pr-12"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 hover:text-purple-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg font-bold text-lg shadow-lg shadow-purple-500/50 hover:shadow-purple-400/70 transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Masuk...
                </span>
              ) : 'Masuk'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-purple-500/30" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-transparent text-gray-400">atau</span>
            </div>
          </div>

          <div className="text-center">
            <p className="text-gray-400">
              Belum punya akun?{' '}
              <Link to="/register" className="text-purple-400 hover:text-purple-300 font-semibold transition-colors">
                Daftar Sekarang
              </Link>
            </p>
          </div>

          {/* Hint */}
          <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/20 rounded-lg flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-blue-300/70 text-xs">
              Gunakan email dan password yang sama dengan saat mendaftar.
            </p>
          </div>
        </div>

        <div className="text-center mt-6">
          <Link to="/" className="text-gray-400 hover:text-gray-300 transition-colors text-sm">
            ← Kembali ke Beranda
          </Link>
        </div>
      </div>

      {/* Decorative */}
      <div className="fixed top-10 left-10 z-0 opacity-20">
        <Swords className="w-32 h-32 text-purple-500 animate-pulse" />
      </div>
      <div className="fixed bottom-10 right-10 z-0 opacity-20">
        <Shield className="w-32 h-32 text-blue-500 animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
    </div>
  );
}
