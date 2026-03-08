import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Coins, Info } from 'lucide-react';
import { useGame } from '../contexts/GameContext';
import { MenuAccordion, AccordionItem } from '../components/MenuAccordion';

// ─── Types ────────────────────────────────────────────────────────────────────

type StandId = 'pertanian' | 'pemancing' | 'antik' | 'penambang';
type CategoryId =
  | 'beli-tools' | 'beli-bibit' | 'beli-pupuk' | 'jual-panen'
  | 'beli-alat-pancing' | 'beli-umpan' | 'jual-ikan'
  | 'beli-antik' | 'jual-antik'
  | 'beli-alat-tambang';

interface ShopItem {
  id: string;
  name: string;
  price: number;
  icon: string;
  desc: string;
  comingSoon?: boolean;
  sellOnly?: boolean;
}

// ─── Stand images ─────────────────────────────────────────────────────────────

const STAND_IMAGES: Record<StandId, string> = {
  pertanian: 'https://images.unsplash.com/photo-1564046105882-bee6cd1271d7?w=800&q=80',
  pemancing:  'https://images.unsplash.com/photo-1712493142073-f642a57cc5b1?w=800&q=80',
  penambang:  'https://images.unsplash.com/photo-1596441560548-2bc4b5e2c361?w=800&q=80',
  antik:      'https://images.unsplash.com/photo-1651037049239-31cacb33da6b?w=800&q=80',
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const STANDS: { id: StandId; name: string; icon: string; desc: string; color: string; glow: string; border: string }[] = [
  { id: 'pertanian', name: 'Stand Pertanian', icon: '🌾', desc: 'Alat, bibit, pupuk, dan hasil panen ladangmu', color: 'from-green-900/80 to-emerald-950/80', glow: 'rgba(74,222,128,0.25)', border: '#4ade80' },
  { id: 'pemancing', name: 'Stand Pemancing', icon: '🎣', desc: 'Alat pancing, umpan, dan jual ikan tangkapanmu', color: 'from-blue-900/80 to-cyan-950/80', glow: 'rgba(34,211,238,0.25)', border: '#22d3ee' },
  { id: 'penambang', name: 'Stand Penambang', icon: '⛏️', desc: 'Alat menambang untuk menggali bijih dan bebatuan', color: 'from-stone-900/80 to-zinc-950/80', glow: 'rgba(161,161,170,0.25)', border: '#a1a1aa' },
  { id: 'antik',    name: 'Stand Barang Antik', icon: '🏺', desc: 'Beli & jual barang antik misterius bernilai tinggi', color: 'from-purple-900/80 to-violet-950/80', glow: 'rgba(167,139,250,0.25)', border: '#a78bfa' },
];

const CATEGORIES: Record<StandId, { id: CategoryId; label: string; icon: string }[]> = {
  pertanian: [
    { id: 'beli-tools', label: 'Beli Alat', icon: '🪛' },
    { id: 'beli-bibit', label: 'Beli Bibit', icon: '🌱' },
    { id: 'beli-pupuk', label: 'Beli Pupuk', icon: '🌿' },
    { id: 'jual-panen', label: 'Jual Hasil Panen', icon: '💰' },
  ],
  pemancing: [
    { id: 'beli-alat-pancing', label: 'Beli Alat Pancing', icon: '🪝' },
    { id: 'beli-umpan',        label: 'Beli Umpan', icon: '🪱' },
    { id: 'jual-ikan',         label: 'Jual Ikan', icon: '💰' },
  ],
  penambang: [
    { id: 'beli-alat-tambang', label: 'Beli Alat Menambang', icon: '⛏️' },
  ],
  antik: [
    { id: 'beli-antik', label: 'Beli Barang Antik', icon: '🏺' },
    { id: 'jual-antik', label: 'Jual Barang Antik', icon: '💰' },
  ],
};

const ITEMS: Record<CategoryId, ShopItem[]> = {
  'beli-tools': [
    { id: 'cangkul-kayu',  name: 'Cangkul Kayu',   price: 1000, icon: '🪛', desc: 'Cangkul kayu dasar untuk menggarap lahan', comingSoon: true },
    { id: 'gembor-kayu',   name: 'Gembor Kayu',    price: 1000, icon: '🪣', desc: 'Gembor kayu untuk menyiram tanaman', comingSoon: true },
  ],
  'beli-bibit': [
    { id: 'bibit-tomat',   name: 'Bibit Tomat',   price: 100,  icon: '🍅', desc: 'Bibit tomat berkualitas, mudah tumbuh', comingSoon: true },
    { id: 'bibit-jagung',  name: 'Bibit Jagung',  price: 130,  icon: '🌽', desc: 'Bibit jagung pilihan, hasil melimpah', comingSoon: true },
    { id: 'bibit-kentang', name: 'Bibit Kentang',  price: 150,  icon: '🥔', desc: 'Bibit kentang dari pegunungan', comingSoon: true },
    { id: 'bibit-gandum',  name: 'Bibit Gandum',  price: 175,  icon: '🌾', desc: 'Bibit gandum tahan cuaca ekstrem', comingSoon: true },
    { id: 'bibit-padi',    name: 'Bibit Padi',    price: 200,  icon: '🌾', desc: 'Bibit padi unggulan lahan basah', comingSoon: true },
  ],
  'beli-pupuk': [
    { id: 'pupuk-sisa',    name: 'Pupuk Makanan Sisa', price: 50,  icon: '🍂', desc: 'Pupuk organik dari sisa makanan', comingSoon: true },
    { id: 'pupuk-kompos',  name: 'Pupuk Kompos',       price: 70,  icon: '🌿', desc: 'Pupuk kompos alami berkualitas medium', comingSoon: true },
    { id: 'pupuk-f',       name: 'Pupuk Kualitas F',   price: 100, icon: '⚗️', desc: 'Pupuk olahan dengan formula khusus', comingSoon: true },
  ],
  'jual-panen': [
    { id: 'jual-tomat',   name: 'Tomat',   price: 120, icon: '🍅', desc: 'Tomat segar dari ladangmu', comingSoon: true, sellOnly: true },
    { id: 'jual-jagung',  name: 'Jagung',  price: 156, icon: '🌽', desc: 'Jagung matang siap jual', comingSoon: true, sellOnly: true },
    { id: 'jual-kentang', name: 'Kentang', price: 180, icon: '🥔', desc: 'Kentang berkualitas baik', comingSoon: true, sellOnly: true },
    { id: 'jual-gandum',  name: 'Gandum',  price: 210, icon: '🌾', desc: 'Gandum hasil panen ladang', comingSoon: true, sellOnly: true },
    { id: 'jual-padi-item', name: 'Padi',  price: 240, icon: '🌾', desc: 'Padi premium desa daun hijau', comingSoon: true, sellOnly: true },
  ],
  'beli-alat-pancing': [
    { id: 'pancing-kayu',  name: 'Tongkat Pancing Kayu',         price: 1000, icon: '🎣', desc: 'Pancing kayu sederhana untuk pemula', comingSoon: true },
    { id: 'pancing-besi',  name: 'Pancing Besi Kayu Tertempa',   price: 2000, icon: '🎣', desc: 'Pancing besi-kayu tertempa, lebih kuat', comingSoon: true },
  ],
  'beli-umpan': [
    { id: 'umpan-cacing',  name: 'Umpan Cacing',       price: 50,  icon: '🪱', desc: 'Umpan cacing tanah alami', comingSoon: true },
    { id: 'umpan-f',       name: 'Umpan Kualitas F',   price: 100, icon: '⚗️', desc: 'Umpan buatan dengan aroma khusus ikan', comingSoon: true },
  ],
  'jual-ikan': [
    { id: 'jual-gabus',  name: 'Ikan Gabus',  price: 200, icon: '🐟', desc: 'Ikan gabus sungai', comingSoon: true, sellOnly: true },
    { id: 'jual-lele',   name: 'Ikan Lele',   price: 400, icon: '🐠', desc: 'Ikan lele berukuran besar', comingSoon: true, sellOnly: true },
    { id: 'jual-emas-ikan', name: 'Ikan Emas', price: 600, icon: '🐡', desc: 'Ikan emas langka bernilai tinggi', comingSoon: true, sellOnly: true },
  ],
  'beli-antik': [
    { id: 'antik-misterius', name: 'Barang Antik Misterius (Tier F–C)', price: 5000, icon: '🏺', desc: 'Artefak kuno dengan kandungan misterius', comingSoon: true },
  ],
  'jual-antik': [
    { id: 'antik-f',   name: 'Barang Antik Tier F',  price: 1000,    icon: '🏺', desc: 'Artefak dasar, nilai rendah', comingSoon: true, sellOnly: true },
    { id: 'antik-e',   name: 'Barang Antik Tier E',  price: 2500,    icon: '🏺', desc: 'Artefak kelas rendah', comingSoon: true, sellOnly: true },
    { id: 'antik-d',   name: 'Barang Antik Tier D',  price: 5000,    icon: '🏺', desc: 'Artefak menengah bawah', comingSoon: true, sellOnly: true },
    { id: 'antik-c',   name: 'Barang Antik Tier C',  price: 10000,   icon: '🏺', desc: 'Artefak menengah', comingSoon: true, sellOnly: true },
    { id: 'antik-b',   name: 'Barang Antik Tier B',  price: 25000,   icon: '💎', desc: 'Artefak langka', comingSoon: true, sellOnly: true },
    { id: 'antik-a',   name: 'Barang Antik Tier A',  price: 50000,   icon: '👑', desc: 'Jual di Ibukota!', comingSoon: true, sellOnly: true },
    { id: 'antik-s',   name: 'Barang Antik Tier S',  price: 100000,  icon: '⭐', desc: 'Jual di Ibukota!', comingSoon: true, sellOnly: true },
    { id: 'antik-ss',  name: 'Barang Antik Tier SS', price: 200000,  icon: '🌟', desc: 'Artefak legendaris — jual di Ibukota!', comingSoon: true, sellOnly: true },
    { id: 'antik-l',   name: 'Barang Antik Tier L',  price: 1000000, icon: '🔮', desc: 'Artefak dewa — jual di Ibukota!', comingSoon: true, sellOnly: true },
  ],
  'beli-alat-tambang': [
    { id: 'beliung-tambang', name: 'Beliung Penambang', price: 1000, icon: '⛏️', desc: 'Beliung kayu dasar untuk menambang bijih dan bebatuan', comingSoon: true },
  ],
};

const HIGH_TIER_ANTIK = new Set(['antik-a', 'antik-s', 'antik-ss', 'antik-l']);

// ─── Notification ─────────────────────────────────────────────────────────────

function Notif({ msg, type, onClose }: { msg: string; type: 'success' | 'error' | 'info'; onClose: () => void }) {
  const colors = {
    success: { bg: 'rgba(5,46,22,0.95)', border: '#4ade80', text: '#4ade80' },
    error:   { bg: 'rgba(69,10,10,0.95)', border: '#f87171', text: '#f87171' },
    info:    { bg: 'rgba(30,27,75,0.95)', border: '#a78bfa', text: '#a78bfa' },
  }[type];
  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.93 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      className="fixed top-6 left-1/2 z-[200] rounded-2xl px-5 py-3 border shadow-2xl text-sm"
      style={{ transform: 'translateX(-50%)', background: colors.bg, borderColor: colors.border, color: colors.text, backdropFilter: 'blur(16px)', maxWidth: 360, textAlign: 'center' }}
      onClick={onClose}
    >
      {msg}
    </motion.div>
  );
}

// ─── StandContent ─────────────────────────────────────────────────────────────

function StandContent({ stand, gold, onBuy, onSell, ibukotaDialog }: {
  stand: typeof STANDS[0]; gold: number;
  onBuy: (item: ShopItem) => void; onSell: (item: ShopItem) => void;
  ibukotaDialog: () => void;
}) {
  const [activeCat, setActiveCat] = useState<CategoryId | null>(null);
  const cats = CATEGORIES[stand.id];
  const items = activeCat ? ITEMS[activeCat] : [];
  const isSell = activeCat?.startsWith('jual') ?? false;

  return (
    <div>
      {/* Category selector */}
      <AnimatePresence mode="wait">
        {!activeCat ? (
          <motion.div key="cats" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
            <div className="grid grid-cols-2 gap-2">
              {cats.map((cat, i) => (
                <motion.button key={cat.id} onClick={() => setActiveCat(cat.id)}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                  whileHover={{ scale: 1.04, y: -1 }} whileTap={{ scale: 0.96 }}
                  className="rounded-xl border p-3 text-left cursor-pointer"
                  style={{ background: 'rgba(0,0,0,0.4)', borderColor: stand.border + '35', backdropFilter: 'blur(8px)' }}>
                  <div className="text-2xl mb-1">{cat.icon}</div>
                  <p style={{ fontFamily: 'serif', fontWeight: 700, color: '#e5e7eb', fontSize: '0.82rem' }}>{cat.label}</p>
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div key={`items-${activeCat}`} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
            <button onClick={() => setActiveCat(null)}
              className="flex items-center gap-1.5 mb-3 text-xs"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: stand.border, fontFamily: 'serif', fontWeight: 700 }}>
              ← Kembali
            </button>
            <div className="mb-3 p-2.5 rounded-xl border flex items-center gap-2"
              style={{ background: isSell ? 'rgba(120,53,15,0.3)' : 'rgba(5,46,22,0.3)', borderColor: isSell ? 'rgba(249,115,22,0.35)' : stand.border + '35' }}>
              <Info className="w-3.5 h-3.5 flex-shrink-0" style={{ color: isSell ? '#f97316' : stand.border }} />
              <p style={{ color: '#9ca3af', fontSize: '0.68rem' }}>
                {isSell ? '🔨 Fungsi jual akan segera hadir.' : '🛒 Klik Beli untuk membeli item.'}
              </p>
            </div>
            <div className="space-y-2">
              {items.map(item => {
                const isHighTier = HIGH_TIER_ANTIK.has(item.id);
                const canAfford = gold >= item.price;
                const disabled = !isSell && !canAfford;
                return (
                  <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border p-3 flex items-center gap-3"
                    style={{ background: 'rgba(0,0,0,0.35)', borderColor: stand.border + '30' }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
                      style={{ background: stand.border + '18', border: `1px solid ${stand.border}40` }}>
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p style={{ color: '#e5e7eb', fontSize: '0.78rem', fontWeight: 700 }}>{item.name}</p>
                      <p style={{ color: '#6b7280', fontSize: '0.65rem', marginTop: 1 }}>{item.desc}</p>
                      <p style={{ color: '#fbbf24', fontSize: '0.72rem', fontWeight: 700, marginTop: 2 }}>
                        💰 {item.price.toLocaleString()} Gold
                      </p>
                    </div>
                    <motion.button
                      disabled={disabled}
                      onClick={() => isHighTier ? ibukotaDialog() : isSell ? onSell(item) : onBuy(item)}
                      whileHover={disabled ? {} : { scale: 1.06 }} whileTap={disabled ? {} : { scale: 0.94 }}
                      className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold"
                      style={{ background: disabled ? 'rgba(55,65,81,0.5)' : isSell ? 'linear-gradient(135deg, #7c2d12, #9a3412)' : 'linear-gradient(135deg, #14532d, #166534)', color: disabled ? '#4b5563' : '#fff', border: `1px solid ${disabled ? '#374151' : stand.border + 'aa'}`, cursor: disabled ? 'not-allowed' : 'pointer', minWidth: 52 }}>
                      {isSell ? '💰 Jual' : '🛒 Beli'}
                    </motion.button>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function MarketPage() {
  const navigate  = useNavigate();
  const { player, updatePlayer } = useGame();

  const [notif, setNotif] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [ibukotaDialog, setIbukotaDialog] = useState(false);
  const [processing, setProcessing] = useState(false);

  const gold = player?.gold ?? 0;

  const showNotif = useCallback((msg: string, type: 'success' | 'error' | 'info') => {
    setNotif({ msg, type });
    setTimeout(() => setNotif(null), 2800);
  }, []);

  const handleBuy = useCallback(async (item: ShopItem) => {
    if (!player || processing) return;
    if (gold < item.price) { showNotif(`💸 Gold tidak cukup! Butuh ${item.price.toLocaleString()} Gold.`, 'error'); return; }
    setProcessing(true);
    try {
      await updatePlayer({ gold: gold - item.price });
      showNotif(`✅ ${item.name} berhasil dibeli! (Efek item akan hadir segera)`, 'success');
    } finally { setProcessing(false); }
  }, [player, gold, processing, updatePlayer, showNotif]);

  const handleSell = useCallback((item: ShopItem) => {
    showNotif(`🔨 Fitur jual "${item.name}" akan segera hadir!`, 'info');
  }, [showNotif]);

  // Build accordion items from stands
  const standItems: AccordionItem[] = STANDS.map(stand => ({
    id: stand.id,
    label: stand.name,
    sublabel: stand.desc,
    emoji: stand.icon,
    image: STAND_IMAGES[stand.id],
    accentColor: stand.border,
    glowColor: stand.glow,
    fromColor: 'rgba(5,5,20,0.6)',
    content: (
      <StandContent
        stand={stand} gold={gold}
        onBuy={handleBuy} onSell={handleSell}
        ibukotaDialog={() => setIbukotaDialog(true)}
      />
    ),
  }));

  return (
    <div className="relative max-w-2xl mx-auto min-h-screen">

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, #1a0a2e 0%, #0d1a0d 50%, #1a1000 100%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 30% 20%, rgba(251,191,36,0.07) 0%, transparent 60%)' }} />
        {['💰','🌾','🎣','🏺','✨','🌿'].map((e, i) => (
          <motion.div key={i} className="absolute pointer-events-none select-none text-xl opacity-20"
            style={{ left: `${10 + i * 15}%`, top: -30 }}
            animate={{ y: ['0%', '105vh'], opacity: [0, 0.25, 0.25, 0], rotate: [0, 360] }}
            transition={{ duration: 8 + i * 1.5, delay: i * 1.2, repeat: Infinity, ease: 'linear' }}
          >{e}</motion.div>
        ))}
      </div>

      {/* Notifications */}
      <AnimatePresence>
        {notif && <Notif msg={notif.msg} type={notif.type} onClose={() => setNotif(null)} />}
      </AnimatePresence>

      {/* Ibukota Dialog */}
      <AnimatePresence>
        {ibukotaDialog && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
            onClick={() => setIbukotaDialog(false)}>
            <motion.div initial={{ scale: 0.8, y: 40 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, y: 40 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl overflow-hidden"
              style={{ background: 'rgba(30,10,50,0.97)', border: '1px solid rgba(167,139,250,0.5)', boxShadow: '0 20px 60px rgba(0,0,0,0.9)' }}>
              <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, #a78bfa, #ec4899, #a78bfa, transparent)' }} />
              <div className="p-6 text-center">
                <motion.div className="text-5xl mb-4" animate={{ rotate: [-5, 5, -5] }} transition={{ duration: 1.5, repeat: Infinity }}>🏰</motion.div>
                <h3 style={{ fontFamily: 'serif', fontWeight: 900, color: '#c084fc', fontSize: '1.2rem', marginBottom: 8 }}>Barang Terlalu Berharga!</h3>
                <p style={{ color: '#9ca3af', fontSize: '0.82rem', lineHeight: 1.7, marginBottom: 20 }}>
                  Pedagang stand desa kami tidak mampu membeli barang antik seharga itu. Pergi ke <span style={{ color: '#fbbf24', fontWeight: 700 }}>Ibukota Kekaisaran Senofia</span>!
                </p>
                <motion.button onClick={() => setIbukotaDialog(false)} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                  className="w-full py-3 rounded-xl"
                  style={{ background: 'linear-gradient(135deg, #4c1d95, #7c3aed)', color: '#fff', fontFamily: 'serif', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                  Mengerti, akan ke Ibukota
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
            <h1 style={{ fontFamily: 'serif', fontWeight: 900, color: '#fbbf24', fontSize: '1.4rem', letterSpacing: '0.04em' }}>
              🏪 Pasar Desa
            </h1>
            <p style={{ color: '#9ca3af', fontSize: '0.72rem' }}>Pilih stand yang ingin kamu kunjungi</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)' }}>
            <Coins className="w-4 h-4" style={{ color: '#fbbf24' }} />
            <span style={{ color: '#fbbf24', fontWeight: 700, fontSize: '0.85rem' }}>{gold.toLocaleString()}</span>
          </div>
        </div>

        {/* Market lore banner */}
        <div className="mb-4 p-3 rounded-2xl border" style={{ background: 'rgba(251,191,36,0.05)', borderColor: 'rgba(251,191,36,0.2)' }}>
          <p style={{ color: '#d97706', fontSize: '0.75rem', textAlign: 'center', fontFamily: 'serif' }}>
            ⚔ Pasar Desa Daun Hijau — Pusat perdagangan segala kebutuhan ⚔
          </p>
        </div>

        {/* Accordion stands */}
        <MenuAccordion items={standItems} title="Stand Pasar" />

        {/* Bottom notice */}
        <motion.div className="mt-6 p-4 rounded-2xl border text-center"
          style={{ background: 'rgba(30,27,75,0.4)', borderColor: 'rgba(129,140,248,0.2)' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          <p style={{ color: '#6b7280', fontSize: '0.72rem', lineHeight: 1.6 }}>
            Sistem perkebunan, pemancingan, dan perdagangan antik sedang dalam pengembangan aktif.<br />
            <span style={{ color: '#818cf8' }}>Pantau terus update terbaru!</span>
          </p>
        </motion.div>
      </div>
    </div>
  );
}