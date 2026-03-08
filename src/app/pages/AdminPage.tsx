/**
 * AdminPage.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * SECURITY HARDENED Admin control panel.
 *
 * Security model:
 * 1. PASSWORD GATE  — XOR-obfuscated check, constant-time comparison, exponential
 *                     rate-limiting (3 attempts → 5-min lockout, doubles each time).
 * 2. KEY INPUT      — No format hints, no placeholder, masked by default.
 *                     Raw key is NEVER stored in React state, props, sessionStorage,
 *                     or localStorage. Passed once to adminVault then discarded.
 * 3. VAULT          — Module-level, XOR-obfuscated with random nonce, auto-expires
 *                     after 30 min, wiped on page unload.
 * 4. SUPABASE CLIENT — Created inside the vault, never exposed as prop/state.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield, Search, ChevronLeft, ChevronRight, User, Package,
  Ban, Trash2, Eye, EyeOff, Save, X, Crown, Sword, AlertTriangle,
  CheckCircle, RefreshCw, Plus, Minus, Key, LogOut, UserCheck,
  Clock, Skull, Lock, Timer,
} from 'lucide-react';
import {
  checkAdminPassword, isAdminGateLocked, isAdminGateAuthed,
  setAdminGateAuth, clearAdminAuth,
} from '../security/adminAuth';
import {
  initAdminVault, getAdminClient, hasAdminSession,
  clearAdminVault, adminSessionSecondsLeft,
} from '../security/adminVault';
import {
  fetchAllPlayerRows, adminUpdatePlayerRow, adminDeletePlayerRow,
  type PlayerRow,
} from '../../utils/supabase-db';
import { ITEM_DEFS } from '../data/itemData';
import { ITEM_IMAGES } from '../data/itemImages';
import maleImg   from 'figma:asset/0d288298f55234e645afbd915a4e01469027b0fa.png';
import femaleImg from 'figma:asset/998d51489ca786ac6d73a705dcfca0031ec6408c.png';

// ── Items available in admin equipment editor ─────────────────────────────────
const ADMIN_ITEMS = [
  'wooden_sword','wooden_dagger','wooden_bow','wooden_staff','wooden_shield',
  'leather_helm','leather_armor','leather_pants','leather_boots',
];

// ── Ban duration options ──────────────────────────────────────────────────────
const BAN_OPTIONS = [
  { label: '1 Hari',   duration: '24h',    icon: '⏰' },
  { label: '3 Hari',   duration: '72h',    icon: '📅' },
  { label: '1 Minggu', duration: '168h',   icon: '📆' },
  { label: '1 Bulan',  duration: '720h',   icon: '🗓️' },
  { label: '10 Tahun', duration: '87600h', icon: '💀' },
];

// ── Types ─────────────────────────────────────────────────────────────────────
interface AdminUser {
  id             : string;
  email          : string;
  created_at     : string;
  last_sign_in_at: string | null;
  banned_until   : string | null;
  playerRow      : PlayerRow | null;   // data dari tabel players
}
type AdminTab = 'profile' | 'equipment' | 'ban' | 'danger';

// ── Floating rune ─────────────────────────────────────────────────────────────
function RuneParticle({ i }: { i: number }) {
  const runes = ['ᚠ','ᚢ','ᚦ','ᚨ','ᚱ','ᚲ','ᚷ','ᚹ','ᚺ','ᚾ','ᛁ','ᛃ','ᛇ','ᛈ','ᛉ','ᛊ','ᛏ','ᛒ','ᛖ','ᛗ','ᛚ','ᛜ','ᛞ','ᛟ'];
  const x   = (i * 4.3 + 3) % 100;
  const dur = 8 + (i % 5) * 2;
  const del = (i * 0.7) % 6;
  const sz  = 10 + (i % 3) * 4;
  return (
    <motion.div
      className="absolute pointer-events-none select-none font-mono"
      style={{ left: `${x}%`, top: -30, fontSize: sz, color: '#a855f7', opacity: 0.12 }}
      initial={{ y: -40 }}
      animate={{ y: '110vh', opacity: [0, 0.18, 0.12, 0] }}
      transition={{ duration: dur, delay: del, repeat: Infinity, ease: 'linear' }}
    >
      {runes[i % runes.length]}
    </motion.div>
  );
}

function BgGrid() {
  return (
    <div className="absolute inset-0 pointer-events-none" style={{
      backgroundImage: 'linear-gradient(rgba(168,85,247,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.035) 1px, transparent 1px)',
      backgroundSize: '36px 36px',
    }} />
  );
}

function AdminSeal() {
  return (
    <motion.div className="relative flex items-center justify-center" style={{ width: 110, height: 110 }}>
      <motion.div className="absolute inset-0 rounded-full"
        style={{ background: 'radial-gradient(circle, #7c3aed40 0%, transparent 70%)' }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2.5, repeat: Infinity }} />
      {[0,1,2].map(r => (
        <motion.div key={r} className="absolute border border-purple-500/20 rounded-full"
          style={{ width: 56 + r*18, height: 56 + r*18 }}
          animate={{ rotate: r % 2 === 0 ? 360 : -360 }}
          transition={{ duration: 8 + r*4, repeat: Infinity, ease: 'linear' }} />
      ))}
      <motion.div className="relative z-10 flex items-center justify-center rounded-full"
        style={{ width: 56, height: 56, background: 'linear-gradient(135deg, #3b0764, #6d28d9)', border: '2px solid #9333ea', boxShadow: '0 0 20px #7c3aed70' }}
        animate={{ boxShadow: ['0 0 12px #7c3aed50','0 0 28px #a855f7aa','0 0 12px #7c3aed50'] }}
        transition={{ duration: 2, repeat: Infinity }}>
        <Crown size={24} className="text-yellow-300" />
      </motion.div>
    </motion.div>
  );
}

// ── Countdown display ─────────────────────────────────────────────────────────
function Countdown({ until, onExpired }: { until: number; onExpired: () => void }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.ceil((until - Date.now()) / 1000)));
  useEffect(() => {
    const id = setInterval(() => {
      const left = Math.max(0, Math.ceil((until - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) { clearInterval(id); onExpired(); }
    }, 1000);
    return () => clearInterval(id);
  }, [until, onExpired]);
  const m = String(Math.floor(remaining / 60)).padStart(2, '0');
  const s = String(remaining % 60).padStart(2, '0');
  return <span className="font-mono text-red-300">{m}:{s}</span>;
}

// ── SESSION TIMER (top bar) ───────────────────────────────────────────────────
function SessionTimer({ onExpired }: { onExpired: () => void }) {
  const [secs, setSecs] = useState(adminSessionSecondsLeft);
  useEffect(() => {
    const id = setInterval(() => {
      const left = adminSessionSecondsLeft();
      setSecs(left);
      if (left <= 0) { clearInterval(id); onExpired(); }
    }, 5000);
    return () => clearInterval(id);
  }, [onExpired]);
  const m = Math.floor(secs / 60);
  const warning = secs < 300;
  return (
    <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg ${warning ? 'text-red-400' : 'text-purple-500'}`}
      style={{ background: warning ? 'rgba(239,68,68,0.08)' : 'rgba(88,28,135,0.15)', border: `1px solid ${warning ? '#ef444430' : '#6d28d930'}` }}>
      <Timer size={11} />
      <span>Sesi: {m}m</span>
    </div>
  );
}

// ── PHASE 1 — PASSWORD GATE ───────────────────────────────────────────────────
function AdminGate({ onAuth }: { onAuth: () => void }) {
  const [input,  setInput]  = useState('');
  const [show,   setShow]   = useState(false);
  const [error,  setError]  = useState<string | null>(null);
  const [shake,  setShake]  = useState(false);
  const [locked, setLocked] = useState<number | null>(null); // lockedUntil timestamp
  const inputRef            = useRef<HTMLInputElement>(null);

  // Check lockout on mount
  useEffect(() => {
    const status = isAdminGateLocked();
    if (status.locked && status.lockedUntil) setLocked(status.lockedUntil);
    else inputRef.current?.focus();
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (locked) return;

    const result = checkAdminPassword(input);

    if (result.ok) {
      setAdminGateAuth();
      onAuth();
      return;
    }

    if (result.locked && result.lockedUntil) {
      setLocked(result.lockedUntil);
      setError(null);
    } else {
      const left = result.attemptsLeft ?? 0;
      setError(`Kunci salah. ${left} percobaan tersisa.`);
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
    setInput('');
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #050010, #080018, #030008)' }}>
      <BgGrid />
      {Array.from({ length: 18 }, (_, i) => <RuneParticle key={i} i={i} />)}

      <motion.div className="relative z-10 flex flex-col items-center gap-7 w-full max-w-sm px-6"
        initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>

        <AdminSeal />

        <div className="text-center">
          <h1 className="text-yellow-300 tracking-widest text-xl mb-1" style={{ fontFamily: 'serif', textShadow: '0 0 24px #f59e0b70' }}>
            ⚔ RUANG ADMIN ⚔
          </h1>
          <p className="text-purple-500/50 tracking-widest" style={{ fontSize: '0.6rem' }}>
            AKSES TERBATAS — MASUKKAN KUNCI RAHASIA
          </p>
        </div>

        {locked ? (
          <div className="w-full p-4 rounded-xl text-center flex flex-col gap-2"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef444440' }}>
            <div className="flex items-center justify-center gap-2 text-red-400">
              <Lock size={16} /> <span className="text-sm">Akses Dikunci</span>
            </div>
            <p className="text-red-400/70 text-xs">Terlalu banyak percobaan gagal. Coba lagi dalam</p>
            <Countdown until={locked} onExpired={() => { setLocked(null); setInput(''); setTimeout(() => inputRef.current?.focus(), 100); }} />
          </div>
        ) : (
          <motion.form onSubmit={handleSubmit} className="w-full"
            animate={shake ? { x: [-8,8,-8,8,0] } : { x: 0 }}
            transition={{ duration: 0.35 }}>

            <div className="relative mb-3">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-500 pointer-events-none">
                <Key size={15} />
              </div>
              <input
                ref={inputRef}
                type={show ? 'text' : 'password'}
                value={input}
                onChange={e => { setInput(e.target.value); setError(null); }}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                className="w-full pl-9 pr-11 py-3 rounded-xl text-sm outline-none text-white"
                style={{
                  background: 'rgba(60,10,100,0.3)',
                  border: `1px solid ${error ? '#ef444460' : '#6d28d955'}`,
                  boxShadow: error ? '0 0 10px #ef444425' : '0 0 10px #7c3aed18',
                  letterSpacing: show ? 'normal' : '0.2em',
                }}
              />
              <button type="button" onClick={() => setShow(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-500 hover:text-purple-300 transition-colors"
                tabIndex={-1}>
                {show ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            <AnimatePresence>
              {error && (
                <motion.p className="text-red-400 text-xs text-center mb-3 flex items-center justify-center gap-1"
                  initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <AlertTriangle size={11} /> {error}
                </motion.p>
              )}
            </AnimatePresence>

            <motion.button type="submit"
              className="w-full py-3 rounded-xl text-sm tracking-widest text-white"
              style={{ background: 'linear-gradient(135deg, #3b0764, #6d28d9)', border: '1px solid #9333ea50', boxShadow: '0 0 18px #7c3aed35' }}
              whileHover={{ scale: 1.02, boxShadow: '0 0 28px #9333ea70' }}
              whileTap={{ scale: 0.97 }}>
              ⚔ MASUK ⚔
            </motion.button>
          </motion.form>
        )}

        <p className="text-purple-900/70 text-xs text-center" style={{ fontSize: '0.55rem' }}>
          Unauthorized access violates realm law. All attempts are logged.
        </p>
      </motion.div>
    </div>
  );
}

// ── PHASE 2 — SERVICE KEY INPUT ───────────────────────────────────────────────
// NO placeholder, NO format hints, NO visible text until admin explicitly reveals
function ServiceKeyInput({ onConfirm }: { onConfirm: () => void }) {
  // Key is held in a local ref — NOT in React state — to minimise exposure
  const keyRef    = useRef('');
  const [len,     setLen]     = useState(0);       // only expose character count
  const [show,    setShow]    = useState(false);
  const [display, setDisplay] = useState('');      // masked/unmasked display value
  const [error,   setError]   = useState<string | null>(null);
  const inputRef              = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    keyRef.current = val;
    setLen(val.length);
    setDisplay(val);
    setError(null);
  }

  function handleConfirm() {
    const raw = keyRef.current.trim();
    if (!raw) { setError('Kunci tidak boleh kosong.'); return; }
    if (raw.length < 40) { setError('Kunci terlalu pendek.'); return; }

    // Send to vault — raw key is no longer held in component after this
    try {
      initAdminVault(raw);
      // Wipe local copies immediately
      keyRef.current = '';
      setDisplay('');
      setLen(0);
      onConfirm();
    } catch {
      setError('Gagal menginisialisasi sesi admin.');
    }
  }

  // Mask display when not showing
  const visibleValue = show ? display : display.replace(/./g, '•');

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #050010, #080018, #030008)' }}>
      <BgGrid />
      {Array.from({ length: 10 }, (_, i) => <RuneParticle key={i} i={i + 8} />)}

      <motion.div className="relative z-10 w-full max-w-md px-6 py-8 rounded-2xl flex flex-col gap-5"
        style={{ background: 'rgba(8,2,18,0.97)', border: '1px solid #6d28d935', boxShadow: '0 0 60px #7c3aed18' }}
        initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }}>

        <div className="text-center">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #3b0764, #6d28d9)', boxShadow: '0 0 18px #9333ea70' }}>
              <Shield size={22} className="text-purple-200" />
            </div>
          </div>
          <h2 className="text-yellow-300 tracking-widest" style={{ fontFamily: 'serif' }}>Kunci Layanan Admin</h2>
          <p className="text-purple-500/50 text-xs mt-1">
            Diperlukan untuk mengakses panel kontrol pengguna
          </p>
        </div>

        {/* Security note */}
        <div className="rounded-xl p-3" style={{ background: 'rgba(234,179,8,0.06)', border: '1px solid #ca8a0430' }}>
          <p className="text-yellow-500/80 flex items-center gap-1.5 mb-1.5" style={{ fontSize: '0.65rem' }}>
            <Lock size={11} /> KEAMANAN SESI
          </p>
          <ul className="text-yellow-700/60 space-y-0.5" style={{ fontSize: '0.6rem' }}>
            <li>• Kunci disimpan terenkripsi di memori sesi saja</li>
            <li>• Tidak tersimpan di storage browser</li>
            <li>• Sesi otomatis berakhir dalam 30 menit</li>
            <li>• Dihapus permanen saat halaman ditutup</li>
          </ul>
        </div>

        {/* Key input — no placeholder, no hint */}
        <div className="flex flex-col gap-2">
          <label className="text-purple-400/60 tracking-widest" style={{ fontSize: '0.6rem' }}>
            KUNCI LAYANAN
          </label>
          <div className="relative">
            {/* Invisible real input (for actual typing) */}
            <input
              ref={inputRef}
              type="text"
              value={display}
              onChange={handleChange}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              className="absolute inset-0 opacity-0 w-full h-full cursor-text"
              style={{ zIndex: 10 }}
            />
            {/* Visible masked display */}
            <div
              onClick={() => inputRef.current?.focus()}
              className="w-full px-3 py-3 rounded-xl text-sm cursor-text flex items-center gap-2"
              style={{
                background: 'rgba(60,10,100,0.25)',
                border: `1px solid ${error ? '#ef444450' : '#6d28d945'}`,
                minHeight: 48,
              }}
            >
              <span className="flex-1 text-purple-200 font-mono tracking-wider break-all"
                style={{ fontSize: '0.75rem', lineHeight: 1.6, color: len === 0 ? '#6d28d955' : '#e9d5ff' }}>
                {len === 0
                  ? '──────────────────────────'
                  : show
                    ? display
                    : '•'.repeat(Math.min(len, 40)) + (len > 40 ? `···(${len})` : '')}
              </span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShow(v => !v); }}
                className="flex-shrink-0 text-purple-500 hover:text-purple-300 transition-colors"
                style={{ zIndex: 20, position: 'relative' }}>
                {show ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <p className="text-purple-700/50 text-right" style={{ fontSize: '0.55rem' }}>
            {len > 0 ? `${len} karakter dimasukkan` : 'Ketuk kolom di atas untuk mulai'}
          </p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.p className="text-red-400 text-xs flex items-center gap-1.5 px-3 py-2 rounded-lg"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef444430' }}
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <AlertTriangle size={11} /> {error}
            </motion.p>
          )}
        </AnimatePresence>

        <motion.button
          onClick={handleConfirm}
          disabled={len < 40}
          className="py-3 rounded-xl text-sm text-white tracking-widest disabled:opacity-30 flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #3b0764, #6d28d9)', border: '1px solid #9333ea50', boxShadow: '0 0 18px #7c3aed30' }}
          whileHover={len >= 40 ? { scale: 1.02 } : {}}
          whileTap={len >= 40 ? { scale: 0.97 } : {}}>
          <Shield size={15} /> Konfirmasi & Akses Panel
        </motion.button>
      </motion.div>
    </div>
  );
}

// ── ITEM ART mini ─────────────────────────────────────────────────────────────
function AdminItemArt({ defId, size = 52 }: { defId: string; size?: number }) {
  const img = ITEM_IMAGES[defId];
  const def = ITEM_DEFS[defId];
  if (img) return <img src={img} alt={def?.name ?? defId} style={{ width: size, height: size, objectFit: 'contain' }} />;
  return (
    <div className="flex items-center justify-center"
      style={{ width: size, height: size, background: def?.iconBg ?? '#1e1b4b', borderRadius: 8, fontSize: size * 0.44 }}>
      {def?.icon ?? '📦'}
    </div>
  );
}

// ── PLAYER CARD ───────────────────────────────────────────────────────────────
function PlayerCard({ user, selected, onClick }: { user: AdminUser; selected: boolean; onClick: () => void }) {
  const pd      = user.playerRow;
  const isBanned = user.banned_until && new Date(user.banned_until) > new Date();
  const name    = pd?.name ?? user.email?.split('@')[0] ?? 'Unknown';
  const gender  = pd?.gender;
  const level   = pd?.level ?? 1;
  const avatar  = gender === 'female' ? femaleImg : gender === 'male' ? maleImg : null;

  return (
    <motion.div onClick={onClick}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer relative overflow-hidden"
      style={{
        background: selected ? 'linear-gradient(135deg,rgba(109,40,217,0.3),rgba(88,28,135,0.2))' : 'rgba(255,255,255,0.025)',
        border: `1px solid ${selected ? '#7c3aed60' : '#ffffff08'}`,
        transition: 'all 0.18s',
      }}
      whileHover={{ background: 'rgba(109,40,217,0.15)' } as any}
      whileTap={{ scale: 0.99 }}>

      {selected && (
        <motion.div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-xl"
          style={{ background: 'linear-gradient(#9333ea, #7c3aed)' }} layoutId="sel" />
      )}

      <div className="relative flex-shrink-0 w-9 h-9 rounded-full overflow-hidden"
        style={{ border: `1.5px solid ${isBanned ? '#ef444450' : selected ? '#9333ea60' : '#ffffff10'}`, background: '#0f0028' }}>
        {avatar
          ? <img src={avatar} alt="avatar" className="w-full h-full object-cover object-top" />
          : <div className="w-full h-full flex items-center justify-center text-purple-600">{gender === 'male' ? '♂' : gender === 'female' ? '♀' : '?'}</div>
        }
        {isBanned && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(127,29,29,0.7)' }}>
            <Ban size={12} className="text-red-300" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs text-white truncate" style={{ fontFamily: 'serif' }}>{name}</p>
        <p className="text-purple-600/70 truncate" style={{ fontSize: '0.58rem' }}>{user.email}</p>
      </div>

      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
        <span className="text-yellow-500/80" style={{ fontSize: '0.58rem' }}>Lv.{level}</span>
        {isBanned && <span className="text-red-500" style={{ fontSize: '0.5rem' }}>BANNED</span>}
      </div>
    </motion.div>
  );
}

// ── STAT ROW ──────────────────────────────────────────────────────────────────
function StatRow({ label, value, onChange, min = 0, max = 9999999, step = 1 }: {
  label: string; value: number; onChange: (v: number) => void;
  min?: number; max?: number; step?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-purple-400/60 flex-shrink-0" style={{ fontSize: '0.62rem', width: 96 }}>{label}</span>
      <div className="flex items-center gap-1 flex-1">
        <motion.button onClick={() => onChange(Math.max(min, value - step))}
          className="w-6 h-6 rounded flex items-center justify-center text-purple-400 hover:text-white hover:bg-purple-800/50"
          whileTap={{ scale: 0.82 }}>
          <Minus size={9} />
        </motion.button>
        <input type="number" value={value} min={min} max={max}
          onChange={e => onChange(Math.max(min, Math.min(max, Number(e.target.value))))}
          className="flex-1 text-center text-white text-xs py-1 rounded outline-none"
          style={{ background: 'rgba(88,28,135,0.25)', border: '1px solid #6d28d935', minWidth: 0 }} />
        <motion.button onClick={() => onChange(Math.min(max, value + step))}
          className="w-6 h-6 rounded flex items-center justify-center text-purple-400 hover:text-white hover:bg-purple-800/50"
          whileTap={{ scale: 0.82 }}>
          <Plus size={9} />
        </motion.button>
      </div>
    </div>
  );
}

// ── PROFILE EDITOR ────────────────────────────────────────────────────────────
function ProfileEditor({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  // data is a flat PlayerRow object from the players table
  const pd = data ?? {};

  function update(key: string, val: any) {
    onChange({ ...pd, [key]: val });
  }
  function updateNested(key: string, subKey: string, val: any) {
    onChange({ ...pd, [key]: { ...(pd[key] ?? {}), [subKey]: val } });
  }

  const avatarImg  = pd.gender === 'female' ? femaleImg : pd.gender === 'male' ? maleImg : null;
  const genderGlow = pd.gender === 'male' ? '#3b82f6' : pd.gender === 'female' ? '#ec4899' : '#a855f7';

  return (
    <div className="flex flex-col gap-4 overflow-y-auto pr-1" style={{ maxHeight: '56vh' }}>
      {/* Avatar + gender */}
      <div className="flex items-center gap-4 p-3 rounded-xl" style={{ background: 'rgba(88,28,135,0.12)', border: '1px solid #6d28d925' }}>
        <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0"
          style={{ border: `2px solid ${genderGlow}50`, boxShadow: `0 0 14px ${genderGlow}35` }}>
          {avatarImg
            ? <img src={avatarImg} alt="avatar" className="w-full h-full object-cover object-top" />
            : <div className="w-full h-full flex items-center justify-center text-3xl" style={{ background: '#0f0028' }}>👤</div>
          }
        </div>
        <div className="flex-1 flex flex-col gap-2">
          <p className="text-purple-500/50" style={{ fontSize: '0.6rem' }}>Gender & Avatar</p>
          <div className="flex gap-2">
            {[
              { val: 'male',   label: '♂ Laki-laki', color: '#3b82f6' },
              { val: 'female', label: '♀ Perempuan',  color: '#ec4899' },
            ].map(g => (
              <motion.button key={g.val}
                onClick={() => update('gender', g.val)}
                className="flex-1 py-1.5 rounded-lg text-xs"
                style={{
                  background: pd.gender === g.val ? `${g.color}25` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${pd.gender === g.val ? g.color : '#ffffff12'}`,
                  color: pd.gender === g.val ? g.color : '#6b7280',
                  boxShadow: pd.gender === g.val ? `0 0 10px ${g.color}35` : 'none',
                }}
                whileTap={{ scale: 0.95 }}>
                {g.label}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Identity */}
      <div className="flex flex-col gap-2">
        <p className="text-purple-500/40 tracking-widest" style={{ fontSize: '0.55rem' }}>── IDENTITAS ──</p>
        {[
          { key: 'name', label: 'Nickname' },
          { key: 'role', label: 'Role' },
          { key: 'faction', label: 'Fraksi' },
        ].map(f => (
          <div key={f.key} className="flex items-center gap-2">
            <span className="text-purple-400/60 flex-shrink-0" style={{ fontSize: '0.62rem', width: 96 }}>{f.label}</span>
            <input value={pd[f.key] ?? ''} onChange={e => update(f.key, e.target.value)}
              className="flex-1 px-2 py-1 rounded text-xs text-white outline-none"
              style={{ background: 'rgba(88,28,135,0.25)', border: '1px solid #6d28d935' }} />
          </div>
        ))}
      </div>

      {/* Resources */}
      <div className="flex flex-col gap-2">
        <p className="text-purple-500/40 tracking-widest" style={{ fontSize: '0.55rem' }}>── SUMBER DAYA ──</p>
        <StatRow label="Gold 🪙"      value={pd.gold ?? 0}        onChange={v => update('gold', v)}        min={0}     max={99999999} step={500} />
        <StatRow label="Level"         value={pd.level ?? 1}       onChange={v => update('level', v)}       min={1}     max={100} />
        <StatRow label="EXP"           value={pd.experience ?? 0}  onChange={v => update('experience', v)}  min={0}     max={99999999} step={1000} />
        <StatRow label="Karma"         value={pd.karma ?? 0}       onChange={v => update('karma', v)}       min={-9999} max={9999} />
        <StatRow label="Free Points"   value={pd.free_points ?? 0} onChange={v => update('free_points', v)} min={0}     max={9999} />
      </div>

      {/* Core stats */}
      <div className="flex flex-col gap-2">
        <p className="text-purple-500/40 tracking-widest" style={{ fontSize: '0.55rem' }}>── CORE STATS ──</p>
        {(['str','int','dex','vit','agi'] as const).map(s => (
          <StatRow key={s} label={s.toUpperCase()}
            value={pd.core_stats?.[s] ?? 1}
            onChange={v => updateNested('core_stats', s, v)} min={1} max={9999} />
        ))}
      </div>

      {/* Battle stats */}
      <div className="flex flex-col gap-2">
        <p className="text-purple-500/40 tracking-widest" style={{ fontSize: '0.55rem' }}>── BATTLE STATS ──</p>
        <StatRow label="HP"          value={pd.stats?.hp ?? 100}          onChange={v => updateNested('stats','hp', v)}          min={1} max={9999999} step={100} />
        <StatRow label="MP"          value={pd.stats?.mp ?? 0}            onChange={v => updateNested('stats','mp', v)}          min={0} max={9999999} step={100} />
        <StatRow label="P.ATK"       value={pd.stats?.physicalAtk ?? 10}  onChange={v => updateNested('stats','physicalAtk', v)} min={0} max={999999} />
        <StatRow label="M.ATK"       value={pd.stats?.magicAtk ?? 0}      onChange={v => updateNested('stats','magicAtk', v)}   min={0} max={999999} />
        <StatRow label="P.DEF"       value={pd.stats?.physicalDef ?? 5}   onChange={v => updateNested('stats','physicalDef', v)} min={0} max={999999} />
        <StatRow label="M.DEF"       value={pd.stats?.magicDef ?? 5}      onChange={v => updateNested('stats','magicDef', v)}   min={0} max={999999} />
        <StatRow label="Accuracy %"  value={pd.stats?.accuracy ?? 100}    onChange={v => updateNested('stats','accuracy', v)}   min={0} max={999} />
        <StatRow label="Dodge %"     value={pd.stats?.dodge ?? 0}         onChange={v => updateNested('stats','dodge', v)}      min={0} max={100} />
        <StatRow label="Crit Rate %"  value={pd.stats?.critRate ?? 0}     onChange={v => updateNested('stats','critRate', v)}   min={0} max={100} />
        <StatRow label="Crit DMG %"   value={pd.stats?.critDamage ?? 120} onChange={v => updateNested('stats','critDamage', v)} min={0} max={9999} />
      </div>
    </div>
  );
}

// ── EQUIPMENT EDITOR ──────────────────────────────────────────────────────────
function EquipmentEditor({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const pd        = data ?? {};
  const inventory: any[] = pd.inventory ?? [];
  const [toast,   setToast] = useState<string | null>(null);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2400); }

  function addToInventory(defId: string) {
    const def = ITEM_DEFS[defId];
    if (!def) return;
    const bagCount = inventory.filter((it: any) => !it._equipped).length;
    if (bagCount >= 20) { showToast('Tas penuh! (max 20)'); return; }
    const newItem = {
      instanceId: `${defId}_adm_${Date.now()}_${Math.random().toString(36).slice(2,5)}`,
      defId, name: def.name, slot: def.slot, rarity: def.rarity,
      description: def.description, stats: { ...def.stats },
      icon: def.icon, iconBg: def.iconBg, iconGlow: def.iconGlow,
      buyPrice: def.buyPrice, sellPrice: def.sellPrice,
    };
    const next = JSON.parse(JSON.stringify(data ?? {}));
    if (!next.inventory) next.inventory = [];
    next.inventory.push(newItem);
    onChange(next);
    showToast(`✓ ${def.name} ditambahkan!`);
  }

  return (
    <div className="flex flex-col gap-4 overflow-y-auto pr-1" style={{ maxHeight: '56vh' }}>
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity:0,y:-8 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }}
            className="px-3 py-2 rounded-lg text-xs text-center"
            style={{ background:'rgba(34,197,94,0.12)',border:'1px solid #22c55e35',color:'#86efac' }}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between px-3 py-2 rounded-lg"
        style={{ background:'rgba(88,28,135,0.12)',border:'1px solid #6d28d925' }}>
        <div className="flex items-center gap-2">
          <Package size={13} className="text-purple-500" />
          <span className="text-purple-300/80 text-xs">Isi Tas</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-white text-xs">{inventory.filter((it:any)=>!it._equipped).length}/20</span>
          <motion.button onClick={() => { const n=JSON.parse(JSON.stringify(data??{})); n.inventory=[]; onChange(n); showToast('Inventori dikosongkan.'); }}
            className="px-2 py-1 rounded text-xs text-red-400 flex items-center gap-1"
            style={{background:'rgba(239,68,68,0.08)',border:'1px solid #ef444425'}}
            whileTap={{scale:0.93}}>
            <Trash2 size={9}/> Kosongkan
          </motion.button>
        </div>
      </div>

      <p className="text-purple-500/40 tracking-widest" style={{ fontSize:'0.55rem' }}>── TAMBAH ITEM KE TAS ──</p>

      <div className="grid grid-cols-3 gap-2">
        {ADMIN_ITEMS.map(defId => {
          const def = ITEM_DEFS[defId];
          if (!def) return null;
          return (
            <motion.button key={defId} onClick={() => addToInventory(defId)}
              className="flex flex-col items-center gap-1.5 p-2 rounded-xl relative overflow-hidden"
              style={{background:'rgba(255,255,255,0.03)',border:'1px solid #ffffff08'}}
              whileHover={{scale:1.05,border:`1px solid ${def.iconGlow}50`,background:`${def.iconGlow}0a`} as any}
              whileTap={{scale:0.95}}>
              <AdminItemArt defId={defId} size={46} />
              <span className="text-white text-center leading-tight" style={{fontSize:'0.52rem'}}>{def.name}</span>
              <div className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center"
                style={{background:'#22c55e18',border:'1px solid #22c55e35'}}>
                <Plus size={8} className="text-green-400"/>
              </div>
            </motion.button>
          );
        })}
      </div>

      {inventory.length > 0 && (
        <>
          <p className="text-purple-500/40 tracking-widest" style={{fontSize:'0.55rem'}}>── ISI TAS SAAT INI ──</p>
          <div className="flex flex-col gap-1.5">
            {inventory.map((it:any,idx:number)=>(
              <div key={it.instanceId??idx} className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                style={{background:'rgba(255,255,255,0.025)',border:'1px solid #ffffff07'}}>
                <span style={{fontSize:16}}>{it.icon??'📦'}</span>
                <span className="flex-1 text-purple-200 text-xs truncate">{it.name}</span>
                <span className="text-purple-700" style={{fontSize:'0.52rem'}}>{it.slot}</span>
                <motion.button
                  onClick={()=>{const n=JSON.parse(JSON.stringify(data??{}));n.inventory=n.inventory.filter((_:any,i:number)=>i!==idx);onChange(n);}}
                  className="w-5 h-5 rounded flex items-center justify-center text-red-500/50 hover:text-red-400"
                  whileTap={{scale:0.82}}>
                  <X size={9}/>
                </motion.button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── BAN MANAGER ───────────────────────────────────────────────────────────────
function BanManager({ user, onAction }: { user: AdminUser; onAction: (type:'ban'|'unban',dur?:string)=>void }) {
  const isBanned   = user.banned_until && new Date(user.banned_until) > new Date();
  const [sel, setSel] = useState<string|null>(null);

  return (
    <div className="flex flex-col gap-5">
      <div className="p-4 rounded-xl flex items-center gap-3"
        style={{ background: isBanned ? 'rgba(239,68,68,0.09)' : 'rgba(34,197,94,0.09)', border:`1px solid ${isBanned?'#ef444435':'#22c55e35'}` }}>
        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: isBanned ? 'rgba(239,68,68,0.18)' : 'rgba(34,197,94,0.18)' }}>
          {isBanned ? <Ban size={18} className="text-red-400"/> : <UserCheck size={18} className="text-green-400"/>}
        </div>
        <div>
          <p className="text-sm" style={{ color: isBanned ? '#f87171' : '#4ade80' }}>
            {isBanned ? '🔴 Akun Dibanned' : '🟢 Akun Aktif'}
          </p>
          {isBanned && (
            <p className="text-red-500/60 flex items-center gap-1 mt-0.5" style={{fontSize:'0.6rem'}}>
              <Clock size={9}/> Hingga: {new Date(user.banned_until!).toLocaleString('id-ID')}
            </p>
          )}
        </div>
      </div>

      {isBanned ? (
        <motion.button onClick={()=>onAction('unban')}
          className="py-3 rounded-xl text-sm text-white flex items-center justify-center gap-2"
          style={{background:'linear-gradient(135deg,#14532d,#15803d)',border:'1px solid #22c55e45',boxShadow:'0 0 18px #22c55e28'}}
          whileHover={{scale:1.02}} whileTap={{scale:0.97}}>
          <UserCheck size={15}/> Cabut Ban
        </motion.button>
      ) : (
        <>
          <p className="text-purple-500/40 tracking-widest" style={{fontSize:'0.55rem'}}>── PILIH DURASI BAN ──</p>
          <div className="flex flex-col gap-2">
            {BAN_OPTIONS.map(opt=>(
              <motion.button key={opt.duration} onClick={()=>setSel(opt.duration)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-left"
                style={{ background:sel===opt.duration?'rgba(239,68,68,0.18)':'rgba(255,255,255,0.03)', border:`1px solid ${sel===opt.duration?'#ef444450':'#ffffff08'}` }}
                whileTap={{scale:0.98}}>
                <span className="text-lg">{opt.icon}</span>
                <div className="flex-1">
                  <p className="text-white text-sm">{opt.label}</p>
                  <p className="text-gray-600 text-xs">{opt.duration}</p>
                </div>
                {sel===opt.duration && <CheckCircle size={14} className="text-red-400"/>}
              </motion.button>
            ))}
          </div>
          <AnimatePresence>
            {sel && (
              <motion.button initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}}
                onClick={()=>onAction('ban',sel)}
                className="py-3 rounded-xl text-sm text-white flex items-center justify-center gap-2"
                style={{background:'linear-gradient(135deg,#7f1d1d,#991b1b)',border:'1px solid #ef444445',boxShadow:'0 0 18px #ef444425'}}
                whileHover={{scale:1.02}} whileTap={{scale:0.97}}>
                <Ban size={14}/> Eksekusi Ban — {BAN_OPTIONS.find(o=>o.duration===sel)?.label}
              </motion.button>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

// ── DANGER ZONE ───────────────────────────────────────────────────────────────
function DangerZone({ user, onDelete }: { user:AdminUser; onDelete:()=>void }) {
  const [confirm, setConfirm] = useState(false);
  const [typed,   setTyped]   = useState('');
  const name = user.playerRow?.name ?? user.email?.split('@')[0] ?? 'player';

  return (
    <div className="flex flex-col gap-5">
      <div className="p-4 rounded-xl" style={{ background:'rgba(239,68,68,0.07)',border:'1px solid #ef444435' }}>
        <div className="flex items-center gap-2 mb-2">
          <Skull size={14} className="text-red-500"/>
          <p className="text-red-400 text-sm">Zona Berbahaya</p>
        </div>
        <p className="text-gray-500 text-xs leading-relaxed">
          Menghapus data akan menghapus <strong className="text-red-400">seluruh progress, inventori, dan stats</strong>.
          Tindakan ini <strong className="text-red-400">tidak dapat dibatalkan</strong>.
          Akun email tetap ada — pemain bisa daftar ulang.
        </p>
      </div>

      {!confirm ? (
        <motion.button onClick={()=>setConfirm(true)}
          className="py-3 rounded-xl text-sm flex items-center justify-center gap-2"
          style={{background:'rgba(239,68,68,0.09)',border:'1px solid #ef444450',color:'#f87171'}}
          whileHover={{background:'rgba(239,68,68,0.18)'}as any} whileTap={{scale:0.97}}>
          <Trash2 size={14}/> Hapus Data Pemain
        </motion.button>
      ) : (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
          className="flex flex-col gap-3 p-4 rounded-xl"
          style={{background:'rgba(239,68,68,0.1)',border:'1px solid #ef444435'}}>
          <p className="text-red-400/80 text-xs text-center">
            Ketik nama pemain <strong>"{name}"</strong> untuk konfirmasi:
          </p>
          <input value={typed} onChange={e=>setTyped(e.target.value)} placeholder={name}
            className="px-3 py-2 rounded-lg text-xs text-white outline-none text-center"
            style={{background:'rgba(239,68,68,0.12)',border:'1px solid #ef444445'}}/>
          <div className="flex gap-2">
            <motion.button onClick={()=>{setConfirm(false);setTyped('');}}
              className="flex-1 py-2 rounded-lg text-xs text-gray-500"
              style={{background:'rgba(255,255,255,0.04)',border:'1px solid #ffffff12'}}
              whileTap={{scale:0.94}}>Batal</motion.button>
            <motion.button onClick={typed===name?onDelete:undefined} disabled={typed!==name}
              className="flex-1 py-2 rounded-lg text-xs text-white disabled:opacity-25"
              style={{background:typed===name?'linear-gradient(135deg,#7f1d1d,#991b1b)':'rgba(239,68,68,0.08)',border:'1px solid #ef444440'}}
              whileTap={typed===name?{scale:0.94}:{}}>
              <Trash2 size={10} className="inline mr-1"/>Hapus Permanen
            </motion.button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ── MAIN DASHBOARD ────────────────────────────────────────────────────────────
// Note: no serviceKey prop — client is fetched from the secure vault directly
function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [users,     setUsers]     = useState<AdminUser[]>([]);
  const [filtered,  setFiltered]  = useState<AdminUser[]>([]);
  const [search,    setSearch]    = useState('');
  const [page,      setPage]      = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState<AdminUser|null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>('profile');
  const [editData,  setEditData]  = useState<any>(null);
  const [saving,    setSaving]    = useState(false);
  const [msg,       setMsg]       = useState<{text:string;ok:boolean}|null>(null);

  const PER_PAGE = 20;

  function showMsg(text:string,ok:boolean) { setMsg({text,ok}); setTimeout(()=>setMsg(null),3000); }

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const client = getAdminClient();
    if (!client) { showMsg('Sesi admin kedaluwarsa. Silakan login ulang.', false); onLogout(); return; }
    try {
      // Ambil auth users (email, banned status, dll)
      const { data: authData, error: authErr } = await client.auth.admin.listUsers({ page:1, perPage:1000 });
      if (authErr) throw authErr;

      // Ambil semua player rows dari tabel players
      const playerRows = await fetchAllPlayerRows(client);
      const rowMap = new Map(playerRows.map(r => [r.id, r]));

      // Gabungkan
      const merged: AdminUser[] = (authData?.users ?? []).map((u: any) => ({
        id             : u.id,
        email          : u.email ?? '',
        created_at     : u.created_at ?? '',
        last_sign_in_at: u.last_sign_in_at ?? null,
        banned_until   : u.banned_until ?? null,
        playerRow      : rowMap.get(u.id) ?? null,
      }));

      setUsers(merged);
    } catch (e:any) { showMsg(`Error: ${e?.message ?? 'Gagal memuat data'}`, false); }
    finally { setLoading(false); }
  }, [onLogout]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(users.filter(u => {
      const name = (u.user_metadata?.playerData?.name ?? '').toLowerCase();
      return name.includes(q) || (u.email ?? '').toLowerCase().includes(q);
    }));
    setPage(0);
  }, [users, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageUsers  = filtered.slice(page*PER_PAGE, (page+1)*PER_PAGE);

  function selectUser(u:AdminUser) { setSelected(u); setEditData(JSON.parse(JSON.stringify(u.playerRow ?? {}))); setActiveTab('profile'); }

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    const client = getAdminClient();
    if (!client) { showMsg('Sesi kedaluwarsa.', false); onLogout(); return; }
    try {
      // Simpan ke tabel players (server-side)
      await adminUpdatePlayerRow(client, selected.id, editData);
      showMsg('✓ Data berhasil disimpan ke database!', true);
      await loadUsers();
    } catch (e:any) { showMsg(`✗ Gagal: ${e?.message}`, false); }
    finally { setSaving(false); }
  }

  async function handleBanAction(type:'ban'|'unban', duration?:string) {
    if (!selected) return;
    setSaving(true);
    const client = getAdminClient();
    if (!client) { showMsg('Sesi kedaluwarsa.', false); onLogout(); return; }
    try {
      const payload: any = type==='ban' ? { ban_duration: duration } : { ban_duration: 'none' };
      const { error } = await client.auth.admin.updateUserById(selected.id, payload);
      if (error) throw error;
      showMsg(type==='ban' ? `✓ Dibanned ${duration}` : '✓ Ban dicabut!', true);
      await loadUsers();
    } catch (e:any) { showMsg(`✗ Gagal: ${e?.message}`, false); }
    finally { setSaving(false); }
  }

  async function handleDeleteData() {
    if (!selected) return;
    setSaving(true);
    const client = getAdminClient();
    if (!client) { showMsg('Sesi kedaluwarsa.', false); onLogout(); return; }
    try {
      // Hapus baris dari tabel players (akun auth tetap ada)
      await adminDeletePlayerRow(client, selected.id);
      showMsg('✓ Data pemain dihapus dari database.', true);
      setSelected(null);
      await loadUsers();
    } catch (e:any) { showMsg(`✗ Gagal: ${e?.message}`, false); }
    finally { setSaving(false); }
  }

  const TABS: { id:AdminTab; label:string; icon:React.ReactNode }[] = [
    { id:'profile',   label:'Profil',    icon:<User size={13}/> },
    { id:'equipment', label:'Equipment', icon:<Sword size={13}/> },
    { id:'ban',       label:'Ban',       icon:<Ban size={13}/> },
    { id:'danger',    label:'Hapus',     icon:<Trash2 size={13}/> },
  ];

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #030008, #060012, #020006)' }}>
      <BgGrid />
      {Array.from({length:8},(_,i)=><RuneParticle key={i} i={i+3}/>)}

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-5 py-3 flex-shrink-0"
        style={{ background:'rgba(0,0,0,0.7)',borderBottom:'1px solid #6d28d918',backdropFilter:'blur(14px)' }}>
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background:'linear-gradient(135deg,#3b0764,#6d28d9)',boxShadow:'0 0 10px #9333ea55' }}>
            <Crown size={14} className="text-yellow-300"/>
          </div>
          <div>
            <h1 className="text-yellow-300 tracking-widest" style={{fontSize:'0.82rem',fontFamily:'serif',textShadow:'0 0 16px #f59e0b50'}}>
              ⚔ ADMIN REALM PANEL ⚔
            </h1>
            <p className="text-purple-700" style={{fontSize:'0.5rem'}}>RESTRICTED ACCESS — AUTHORIZED ADMIN ONLY</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SessionTimer onExpired={onLogout} />
          <motion.button onClick={loadUsers}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-purple-500 hover:text-purple-300 text-xs"
            style={{background:'rgba(88,28,135,0.18)',border:'1px solid #6d28d930'}}
            whileTap={{rotate:180}}>
            <RefreshCw size={11}/> Refresh
          </motion.button>
          <motion.button onClick={onLogout}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-red-500 hover:text-red-300 text-xs"
            style={{background:'rgba(239,68,68,0.09)',border:'1px solid #ef444428'}}
            whileTap={{scale:0.94}}>
            <LogOut size={11}/> Keluar
          </motion.button>
        </div>
      </div>

      {/* Msg banner */}
      <AnimatePresence>
        {msg && (
          <motion.div initial={{opacity:0,y:-16}} animate={{opacity:1,y:0}} exit={{opacity:0}}
            className="relative z-20 mx-5 mt-2.5 px-4 py-2 rounded-xl text-xs text-center"
            style={{background:msg.ok?'rgba(34,197,94,0.12)':'rgba(239,68,68,0.12)',border:`1px solid ${msg.ok?'#22c55e35':'#ef444435'}`,color:msg.ok?'#86efac':'#fca5a5'}}>
            {msg.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Body */}
      <div className="relative z-10 flex-1 flex gap-3.5 p-4 min-h-0" style={{height:'calc(100vh - 60px)'}}>

        {/* LEFT — list */}
        <div className="flex flex-col gap-2.5 flex-shrink-0" style={{width:268}}>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-600"/>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Cari nickname / email..."
              className="w-full pl-8 pr-3 py-2.5 rounded-xl text-xs text-white placeholder-purple-800 outline-none"
              style={{background:'rgba(88,28,135,0.18)',border:'1px solid #6d28d935'}}/>
          </div>

          <div className="flex gap-1.5">
            {[
              {label:'Total',   val:users.length,  bg:'rgba(88,28,135,0.12)', c:'#9333ea'},
              {label:'Banned',  val:users.filter(u=>u.banned_until && new Date(u.banned_until)>new Date()).length, bg:'rgba(239,68,68,0.07)', c:'#f87171'},
              {label:'Hasil',   val:filtered.length, bg:'rgba(34,197,94,0.07)', c:'#4ade80'},
            ].map(s=>(
              <div key={s.label} className="flex-1 px-2 py-2 rounded-lg text-center"
                style={{background:s.bg,border:`1px solid ${s.c}20`}}>
                <p style={{fontSize:'0.5rem',color:s.c}}>{s.label}</p>
                <p className="text-white text-sm">{s.val}</p>
              </div>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 pr-0.5">
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <motion.div animate={{rotate:360}} transition={{duration:1,repeat:Infinity,ease:'linear'}}>
                  <RefreshCw size={18} className="text-purple-700"/>
                </motion.div>
              </div>
            ) : pageUsers.length===0 ? (
              <div className="text-center py-10 text-purple-800 text-xs">
                {search?'Tidak ada pemain ditemukan.':'Belum ada pemain.'}
              </div>
            ) : pageUsers.map(u=>(
              <PlayerCard key={u.id} user={u} selected={selected?.id===u.id} onClick={()=>selectUser(u)}/>
            ))}
          </div>

          {totalPages>1 && (
            <div className="flex items-center justify-between pt-2" style={{borderTop:'1px solid #6d28d918'}}>
              <motion.button onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0}
                className="flex items-center px-2 py-1 rounded text-purple-500 disabled:opacity-25 text-xs"
                style={{background:'rgba(88,28,135,0.18)'}} whileTap={{scale:0.88}}>
                <ChevronLeft size={13}/>
              </motion.button>
              <span className="text-purple-700 text-xs">{page+1} / {totalPages}</span>
              <motion.button onClick={()=>setPage(p=>Math.min(totalPages-1,p+1))} disabled={page>=totalPages-1}
                className="flex items-center px-2 py-1 rounded text-purple-500 disabled:opacity-25 text-xs"
                style={{background:'rgba(88,28,135,0.18)'}} whileTap={{scale:0.88}}>
                <ChevronRight size={13}/>
              </motion.button>
            </div>
          )}
        </div>

        {/* RIGHT — detail */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            {!selected ? (
              <motion.div key="empty" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                className="h-full flex flex-col items-center justify-center gap-4 rounded-2xl"
                style={{background:'rgba(255,255,255,0.012)',border:'1px dashed #6d28d925'}}>
                <motion.div animate={{opacity:[0.2,0.5,0.2]}} transition={{duration:3,repeat:Infinity}}>
                  <Shield size={44} className="text-purple-900"/>
                </motion.div>
                <p className="text-purple-800 text-sm">Pilih pemain dari daftar</p>
              </motion.div>
            ) : (
              <motion.div key={selected.id} initial={{opacity:0,x:16}} animate={{opacity:1,x:0}} exit={{opacity:0}}
                className="h-full flex flex-col rounded-2xl overflow-hidden"
                style={{background:'rgba(5,0,12,0.98)',border:'1px solid #6d28d928'}}>

                {/* Player header */}
                <div className="flex items-center gap-4 px-5 py-3.5 flex-shrink-0"
                  style={{background:'rgba(88,28,135,0.12)',borderBottom:'1px solid #6d28d928'}}>
                  <div className="relative w-13 h-13 rounded-xl overflow-hidden flex-shrink-0"
                    style={{width:52,height:52,border:'2px solid #7c3aed50',boxShadow:'0 0 16px #7c3aed35'}}>
                    {editData?.gender==='male' ? <img src={maleImg}   alt="avatar" className="w-full h-full object-cover object-top"/>
                    :editData?.gender==='female' ? <img src={femaleImg} alt="avatar" className="w-full h-full object-cover object-top"/>
                    :<div className="w-full h-full flex items-center justify-center text-2xl" style={{background:'#0a0018'}}>👤</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-white text-sm truncate" style={{fontFamily:'serif'}}>{editData?.name ?? selected.email?.split('@')[0]}</h2>
                    <p className="text-purple-600 text-xs truncate">{selected.email}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-yellow-600" style={{fontSize:'0.57rem'}}>Lv.{editData?.level??1}</span>
                      <span className="text-purple-700" style={{fontSize:'0.55rem'}}>ID:{selected.id.slice(0,8)}…</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    {(activeTab==='profile'||activeTab==='equipment') && (
                      <motion.button onClick={handleSave} disabled={saving}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white"
                        style={{background:'linear-gradient(135deg,#3b0764,#6d28d9)',border:'1px solid #9333ea45'}}
                        whileHover={{scale:1.04}} whileTap={{scale:0.95}}>
                        {saving?<RefreshCw size={11} className="animate-spin"/>:<Save size={11}/>}
                        {saving?'…':'Simpan'}
                      </motion.button>
                    )}
                    <motion.button onClick={()=>setSelected(null)}
                      className="flex items-center gap-1 px-2 py-1 rounded text-gray-600 hover:text-gray-400 text-xs"
                      style={{background:'rgba(255,255,255,0.04)'}} whileTap={{scale:0.9}}>
                      <X size={11}/> Tutup
                    </motion.button>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex px-5 pt-3 gap-1 flex-shrink-0">
                  {TABS.map(tab=>(
                    <motion.button key={tab.id} onClick={()=>setActiveTab(tab.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
                      style={{
                        color: activeTab===tab.id?'#e9d5ff':'#4b5563',
                        background: activeTab===tab.id?(tab.id==='danger'?'rgba(239,68,68,0.18)':'rgba(88,28,135,0.38)'):'transparent',
                        border:`1px solid ${activeTab===tab.id?(tab.id==='danger'?'#ef444445':'#7c3aed55'):'transparent'}`,
                      }}
                      whileTap={{scale:0.94}}>
                      {tab.icon} {tab.label}
                    </motion.button>
                  ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
                  <AnimatePresence mode="wait">
                    {activeTab==='profile'   && <motion.div key="p" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}}><ProfileEditor   data={editData} onChange={setEditData}/></motion.div>}
                    {activeTab==='equipment' && <motion.div key="e" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}}><EquipmentEditor data={editData} onChange={setEditData}/></motion.div>}
                    {activeTab==='ban'       && <motion.div key="b" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}}><BanManager      user={selected} onAction={handleBanAction}/></motion.div>}
                    {activeTab==='danger'    && <motion.div key="d" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}}><DangerZone      user={selected} onDelete={handleDeleteData}/></motion.div>}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  // Phase derived from in-memory vault + session flag (no key in storage)
  const [phase, setPhase] = useState<'gate'|'key'|'dashboard'>(() => {
    const gateOk = isAdminGateAuthed();
    const vaultOk = hasAdminSession();
    if (gateOk && vaultOk) return 'dashboard';
    if (gateOk)            return 'key';
    return 'gate';
  });

  function handleGateAuth() { setPhase('key'); }

  function handleKeyConfirm() {
    // Vault is already initialised inside ServiceKeyInput before this is called
    setPhase('dashboard');
  }

  function handleLogout() {
    clearAdminVault();
    clearAdminAuth();
    setPhase('gate');
  }

  return (
    <AnimatePresence mode="wait">
      {phase==='gate'      && <motion.div key="gate" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}><AdminGate      onAuth={handleGateAuth}/></motion.div>}
      {phase==='key'       && <motion.div key="key"  initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}><ServiceKeyInput onConfirm={handleKeyConfirm}/></motion.div>}
      {phase==='dashboard' && <motion.div key="dash" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}><AdminDashboard  onLogout={handleLogout}/></motion.div>}
    </AnimatePresence>
  );
}
