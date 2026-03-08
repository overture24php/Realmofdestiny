/**
 * GuestRoute — Hanya bisa diakses oleh tamu (belum login).
 * Pemain yang sudah login akan dipaksa redirect ke /game/village.
 */
import { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router';
import { motion } from 'motion/react';
import { getSupabaseClient } from '../../utils/supabase-client';

export default function GuestRoute() {
  const [status, setStatus] = useState<'checking' | 'guest' | 'authenticated'>('checking');

  useEffect(() => {
    let cancelled = false;
    const supabase = getSupabaseClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      setStatus(session ? 'authenticated' : 'guest');
    });

    // juga dengarkan perubahan auth secara realtime
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      setStatus(session ? 'authenticated' : 'guest');
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  // ── Loading splash ──────────────────────────────────────────────────────────
  if (status === 'checking') {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #0a0015 0%, #0d0025 50%, #050010 100%)' }}
      >
        {/* Ambient glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(124,58,237,0.15) 0%, transparent 70%)',
          }}
        />

        <motion.div
          className="flex flex-col items-center gap-5"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Spinning rune ring */}
          <div className="relative w-16 h-16">
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                border: '2px solid transparent',
                borderTopColor: '#a855f7',
                borderRightColor: '#ec4899',
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div
              className="absolute inset-2 rounded-full"
              style={{
                border: '1px solid transparent',
                borderBottomColor: '#7c3aed',
                borderLeftColor: '#db2777',
              }}
              animate={{ rotate: -360 }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
            />
            <div
              className="absolute inset-4 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(124,58,237,0.2)' }}
            >
              <span style={{ fontSize: '1.2rem' }}>⚔️</span>
            </div>
          </div>

          <motion.p
            style={{
              color: '#a855f7',
              fontFamily: 'serif',
              letterSpacing: '0.2em',
              fontSize: '0.75rem',
            }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            MEMANGGIL TAKDIR...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  // ── Sudah login → paksa masuk ke game ──────────────────────────────────────
  if (status === 'authenticated') {
    return <Navigate to="/game/village" replace />;
  }

  // ── Tamu → tampilkan halaman yang diminta ───────────────────────────────────
  return <Outlet />;
}
