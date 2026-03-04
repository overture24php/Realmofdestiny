import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { Swords, Shield, Skull, Crown, Sparkles } from 'lucide-react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { getSupabaseClient } from '../../utils/supabase-client';

export default function LandingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user already logged in
    const checkSession = async () => {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        console.log('[LandingPage] Active session found, redirecting to game...');
        navigate('/game/village');
      }
    };

    checkSession();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="fixed inset-0 z-0">
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1683660107861-c555be9775b9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYW50YXN5JTIwbWVkaWV2YWwlMjBjYXN0bGUlMjBraW5nZG9tfGVufDF8fHx8MTc3MjUyNTYyN3ww&ixlib=rb-4.1.0&q=80&w=1080"
          alt="Kingdom Background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-purple-900/50 to-black/90" />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="container mx-auto px-4 py-6 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Crown className="w-8 h-8 text-yellow-400" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-purple-400 bg-clip-text text-transparent">
              Realm of Destiny
            </h1>
          </div>
          <div className="flex gap-4">
            <Link
              to="/login"
              className="px-6 py-2 border border-purple-500 text-purple-300 hover:bg-purple-500/20 rounded-lg transition-all duration-300"
            >
              Masuk
            </Link>
            <Link
              to="/register"
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg transition-all duration-300 font-semibold"
            >
              Daftar
            </Link>
          </div>
        </header>

        {/* Hero Section */}
        <section className="container mx-auto px-4 py-20 text-center">
          <div className="max-w-4xl mx-auto space-y-6">
            <h2 className="text-6xl font-bold bg-gradient-to-r from-yellow-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-fade-in">
              Tentukan Takdirmu
            </h2>
            <p className="text-2xl text-gray-300 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              Kerajaan Sihir • Pedang Legenda • Perang Melawan Iblis
            </p>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.4s' }}>
              Dunia yang digerakkan oleh pilihanmu. Jadilah pahlawan suci, raja yang bijaksana, 
              atau bergabung dengan kekuatan kegelapan. Setiap tindakan membentuk nasibmu.
            </p>
            <div className="flex gap-4 justify-center pt-6 animate-fade-in" style={{ animationDelay: '0.6s' }}>
              <button
                onClick={() => navigate('/register')}
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg transition-all duration-300 font-bold text-lg shadow-lg shadow-purple-500/50 hover:shadow-purple-400/70 transform hover:scale-105"
              >
                Mulai Petualangan
              </button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 py-20">
          <h3 className="text-4xl font-bold text-center mb-16 bg-gradient-to-r from-yellow-400 to-purple-400 bg-clip-text text-transparent">
            Sistem Karma Dinamis
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {/* Feature 1 */}
            <div className="bg-gradient-to-br from-purple-900/40 to-black/40 backdrop-blur-sm border border-purple-500/30 rounded-xl p-6 hover:border-purple-400/50 transition-all duration-300 transform hover:scale-105">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mb-4 mx-auto">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-xl font-bold text-center mb-3 text-purple-300">Prajurit Suci</h4>
              <p className="text-gray-400 text-center text-sm">
                Lindungi kerajaan dan rakyat. Karma baik membuka jalur menjadi pahlawan legendaris.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-gradient-to-br from-purple-900/40 to-black/40 backdrop-blur-sm border border-purple-500/30 rounded-xl p-6 hover:border-purple-400/50 transition-all duration-300 transform hover:scale-105">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mb-4 mx-auto">
                <Crown className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-xl font-bold text-center mb-3 text-purple-300">Raja & Bangsawan</h4>
              <p className="text-gray-400 text-center text-sm">
                Kuasai politik dan ekonomi. Keputusanmu menentukan nasib seluruh kerajaan.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-gradient-to-br from-purple-900/40 to-black/40 backdrop-blur-sm border border-purple-500/30 rounded-xl p-6 hover:border-purple-400/50 transition-all duration-300 transform hover:scale-105">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-4 mx-auto">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-xl font-bold text-center mb-3 text-purple-300">Penyihir Kuat</h4>
              <p className="text-gray-400 text-center text-sm">
                Kuasai sihir kuno. Gunakan untuk kebaikan atau kehancuran.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-gradient-to-br from-purple-900/40 to-black/40 backdrop-blur-sm border border-red-500/30 rounded-xl p-6 hover:border-red-400/50 transition-all duration-300 transform hover:scale-105">
              <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-red-800 rounded-full flex items-center justify-center mb-4 mx-auto">
                <Skull className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-xl font-bold text-center mb-3 text-red-300">Faksi Iblis</h4>
              <p className="text-gray-400 text-center text-sm">
                Karma buruk membuka jalan gelap. Serang kota, jadilah buronan, bergabung dengan iblis.
              </p>
            </div>
          </div>
        </section>

        {/* Gameplay Features */}
        <section className="container mx-auto px-4 py-20">
          <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto items-center">
            <div className="space-y-6">
              <h3 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-red-400 bg-clip-text text-transparent">
                Dunia Yang Hidup
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <Swords className="w-6 h-6 text-purple-400 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-purple-300 mb-1">Sistem Karma Dinamis</h4>
                    <p className="text-gray-400 text-sm">
                      Setiap tindakan memiliki konsekuensi. Serang warga sipil dan desa untuk mendapat karma buruk, 
                      atau lindungi mereka untuk menjadi pahlawan.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Shield className="w-6 h-6 text-purple-400 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-purple-300 mb-1">Faksi & Reputasi</h4>
                    <p className="text-gray-400 text-sm">
                      Karma tinggi (buruk) = Buronan! Tidak bisa masuk kota kecuali menyerang. 
                      Pemain lain bisa berburu pemain dengan karma buruk untuk hadiah.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Skull className="w-6 h-6 text-red-400 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-red-300 mb-1">Bergabung dengan Iblis</h4>
                    <p className="text-gray-400 text-sm">
                      Capai karma buruk tertentu untuk membuka faksi iblis. Dapatkan kekuatan gelap 
                      tapi tidak bisa kembali ke sisi terang.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-[4/3] rounded-xl overflow-hidden border-4 border-purple-500/30 shadow-2xl shadow-purple-500/50">
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1678572474919-7b2121a95bae?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYXJrJTIwbWFnaWMlMjBkZW1vbiUyMGJhdHRsZXxlbnwxfHx8fDE3NzI1MjU2Mjd8MA&ixlib=rb-4.1.0&q=80&w=1080"
                  alt="Dark Magic Battle"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto text-center bg-gradient-to-br from-purple-900/60 to-black/60 backdrop-blur-sm border border-purple-500/30 rounded-2xl p-12">
            <h3 className="text-4xl font-bold mb-6 bg-gradient-to-r from-yellow-400 to-pink-400 bg-clip-text text-transparent">
              Takdirmu Menanti
            </h3>
            <p className="text-xl text-gray-300 mb-8">
              Apakah kamu akan menjadi pahlawan yang disenangi atau penjahat yang ditakuti? 
              Keputusan ada di tanganmu.
            </p>
            <button
              onClick={() => navigate('/register')}
              className="px-12 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg transition-all duration-300 font-bold text-xl shadow-lg shadow-purple-500/50 hover:shadow-purple-400/70 transform hover:scale-105"
            >
              Bergabung Sekarang
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer className="container mx-auto px-4 py-8 text-center text-gray-500 border-t border-purple-900/30">
          <p>&copy; 2026 Realm of Destiny. Semua hak dilindungi.</p>
        </footer>
      </div>
    </div>
  );
}