import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useGame } from '../contexts/GameContext';
import { ArrowLeft, X, Hammer } from 'lucide-react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { motion, AnimatePresence } from 'motion/react';
import { ITEM_DEFS, RARITY_COLOR, RARITY_LABEL, formatStatBonuses } from '../data/itemData';
import type { InventoryItem } from '../data/itemData';
import { ITEM_IMAGES } from '../data/itemImages';
import { ITEM_SVG_ART } from '../data/itemSvgArt';
import { MenuAccordion, AccordionItem } from '../components/MenuAccordion';

const IMG_BUY   = 'https://images.unsplash.com/photo-1596441560548-2bc4b5e2c361?w=800&q=80';
const IMG_SELL  = 'https://images.unsplash.com/photo-1651037049239-31cacb33da6b?w=800&q=80';
const IMG_FORGE = 'https://images.unsplash.com/photo-1517697471339-4aa32003c11a?w=800&q=80';
const IMG_QUEST = 'https://images.unsplash.com/photo-1631947430066-48c30d57b943?w=800&q=80';

// ── Quest-claim items ─────────────────────────────────────────────────────────
const QUEST_ITEM_IDS = ['wooden_shield', 'wooden_sword', 'wooden_dagger', 'wooden_bow', 'wooden_staff'];

// ── Shop categories ─────────────────────────────────────────────────────────
interface ShopCategory {
  id          : string;
  label       : string;
  emoji       : string;
  color       : string;
  glowColor   : string;
  items       : string[];
  unavailable?: boolean;
  thorinMsg?  : string;
}

const SHOP_CATEGORIES: ShopCategory[] = [
  {
    id        : 'weapons',
    label     : 'Senjata & Prisai',
    emoji     : '⚔️',
    color     : 'from-yellow-800/50 to-orange-900/50',
    glowColor : '#f59e0b',
    items     : ['wooden_sword', 'wooden_dagger', 'wooden_bow', 'wooden_staff', 'wooden_shield'],
  },
  {
    id        : 'helm',
    label     : 'Helm',
    emoji     : '⛑️',
    color     : 'from-stone-700/50 to-stone-900/50',
    glowColor : '#c97c3a',
    items     : ['leather_helm'],
  },
  {
    id        : 'armor',
    label     : 'Zirah',
    emoji     : '🛡️',
    color     : 'from-amber-800/50 to-amber-950/50',
    glowColor : '#b87333',
    items     : ['leather_armor'],
  },
  {
    id        : 'pants',
    label     : 'Celana',
    emoji     : '👖',
    color     : 'from-orange-900/50 to-brown-950/50',
    glowColor : '#a06030',
    items     : ['leather_pants'],
  },
  {
    id        : 'boots',
    label     : 'Sepatu',
    emoji     : '👢',
    color     : 'from-brown-800/50 to-stone-900/50',
    glowColor : '#9a5b28',
    items     : ['leather_boots'],
  },
  {
    id          : 'earring',
    label       : 'Anting',
    emoji       : '💎',
    color       : 'from-pink-900/40 to-rose-950/40',
    glowColor   : '#ec4899',
    items       : [],
    unavailable : true,
    thorinMsg   : 'Ha! Anting-anting aksesoris mewah? Aku pandai besi desa, bukan pedagang perhiasan istana! Kau perlu ke kota besar atau bertemu ahli pengrajin logam mulia untuk barang semacam itu. Di sini aku cuma bisa tempa baja dan kulit, nak.',
  },
  {
    id          : 'ring',
    label       : 'Cincin',
    emoji       : '💍',
    color       : 'from-violet-900/40 to-purple-950/40',
    glowColor   : '#8b5cf6',
    items       : [],
    unavailable : true,
    thorinMsg   : 'Cincin sihir? *tertawa terbahak-bahak* Aku belum pernah lihat emas atau batu permata dalam setahun terakhir, apalagi bahan untuk cincin bermagis! Pandai besi desa terpencil seperti aku tak punya akses material seperti itu. Coba cari di kota atau di pasar pedagang asing.',
  },
];

// ── Ember particle ─────────────────────────────────────────────────────────────
function EmberParticle({ delay, x }: { delay: number; x: number }) {
  return (
    <motion.div
      style={{
        position: 'absolute', bottom: 0, left: `${x}%`,
        width: 3, height: 3, borderRadius: '50%',
        background: '#f97316', boxShadow: '0 0 6px #f97316, 0 0 12px #ea580c',
        pointerEvents: 'none',
      }}
      animate={{
        y: [0, -80, -160],
        x: [0, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 80],
        opacity: [0, 1, 0],
        scale: [0.5, 1, 0.2],
      }}
      transition={{ duration: 2.4, delay, repeat: Infinity, ease: 'easeOut' }}
    />
  );
}

// ── Item Art ──────────────────────────────────────────────────────────────────
function ItemArtCard({ defId, height = 110 }: { defId: string; height?: number }) {
  const def = ITEM_DEFS[defId];
  if (!def) return null;
  const imgSrc = ITEM_IMAGES[defId] ?? null;
  const SvgArt = ITEM_SVG_ART[defId] ?? null;

  return (
    <div style={{
      height, background: def.iconBg, position: 'relative',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {imgSrc ? (
        <img src={imgSrc} alt={def.name}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'center' }} />
      ) : SvgArt ? (
        <div style={{ position: 'absolute', inset: 0 }}><SvgArt /></div>
      ) : (
        <span style={{ fontSize: '2.8rem', filter: `drop-shadow(0 0 12px ${def.iconGlow}dd)` }}>
          {def.icon}
        </span>
      )}
      {/* Rarity badge */}
      <div style={{
        position: 'absolute', top: 7, right: 8,
        fontSize: '0.5rem', color: RARITY_COLOR[def.rarity],
        background: `${RARITY_COLOR[def.rarity]}22`,
        border: `1px solid ${RARITY_COLOR[def.rarity]}44`,
        borderRadius: 20, padding: '2px 8px',
        letterSpacing: '0.08em', fontWeight: 800,
      }}>
        {RARITY_LABEL[def.rarity]}
      </div>
      {/* Bottom gradient */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%',
        background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
        pointerEvents: 'none',
      }} />
    </div>
  );
}

// ── Item Card ─────────────────────────────────────────────────────────────────
function ItemCard({
  defId, isQuest, playerGold, bagFull, buying, alreadyHas, questDone,
  onBuy, onQuestClaim,
}: {
  defId: string; isQuest: boolean; playerGold: number; bagFull: boolean;
  buying: string | null; alreadyHas: boolean; questDone?: boolean;
  onBuy: (id: string) => void; onQuestClaim: (id: string) => void;
}) {
  const def = ITEM_DEFS[defId];
  if (!def) return null;
  const rarityColor  = RARITY_COLOR[def.rarity];
  const canAfford    = playerGold >= def.buyPrice;
  const statLines    = formatStatBonuses(def.stats);
  const isLoading    = buying === defId;
  // Quest items: lock ALL of them as soon as any one has been claimed/is being claimed
  const disabled     = isQuest
    ? (bagFull || alreadyHas || !!questDone)
    : (!canAfford || bagFull || isLoading);

  return (
    <motion.div
      style={{
        background: 'linear-gradient(160deg, rgba(12,5,25,0.95), rgba(6,2,14,0.98))',
        border: `1.5px solid ${rarityColor}44`,
        borderRadius: 14, overflow: 'hidden',
        boxShadow: `0 0 10px ${rarityColor}18`,
      }}
      whileHover={{ scale: 1.025, boxShadow: `0 0 28px ${rarityColor}35` }}
      transition={{ duration: 0.18 }}
    >
      <ItemArtCard defId={defId} />
      <div style={{ padding: '12px 14px 14px' }}>
        <p style={{ fontFamily: 'serif', fontWeight: 800, color: rarityColor, fontSize: '0.92rem', marginBottom: 3 }}>
          {def.name}
        </p>
        <p style={{ fontSize: '0.62rem', color: '#6b7280', marginBottom: 10, lineHeight: 1.45 }}>
          {def.description}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 12 }}>
          {statLines.map(({ label, value }) => (
            <div key={label} style={{
              display: 'flex', justifyContent: 'space-between',
              background: `${rarityColor}0e`, borderRadius: 6, padding: '3px 8px',
            }}>
              <span style={{ fontSize: '0.62rem', color: '#9ca3af' }}>{label}</span>
              <span style={{ fontSize: '0.66rem', fontWeight: 800, color: rarityColor, fontFamily: 'serif' }}>{value}</span>
            </div>
          ))}
        </div>

        {isQuest ? (
          <motion.button
            onClick={() => onQuestClaim(defId)}
            disabled={disabled}
            whileHover={disabled ? {} : { scale: 1.04 }}
            whileTap={disabled ? {} : { scale: 0.96 }}
            style={{
              width: '100%', padding: '9px 0', borderRadius: 9,
              background: disabled ? 'rgba(75,85,99,0.18)' : 'linear-gradient(135deg, #16a34a, #15803d)',
              border: disabled ? '1px solid #374151' : 'none',
              color: disabled ? '#6b7280' : '#fff',
              cursor: disabled ? 'not-allowed' : 'pointer',
              fontFamily: 'serif', fontWeight: 800, fontSize: '0.82rem',
            }}>
            {alreadyHas ? '✓ Sudah dimiliki' : bagFull ? '🎒 Tas Penuh' : '✦ Ambil Gratis'}
          </motion.button>
        ) : (
          <motion.button
            onClick={() => onBuy(defId)}
            disabled={disabled}
            whileHover={disabled ? {} : { scale: 1.04 }}
            whileTap={disabled ? {} : { scale: 0.96 }}
            style={{
              width: '100%', padding: '9px 0', borderRadius: 9,
              background: disabled
                ? 'rgba(75,85,99,0.18)'
                : `linear-gradient(135deg, ${rarityColor}44, ${rarityColor}66)`,
              border: `1.5px solid ${disabled ? '#374151' : rarityColor + '88'}`,
              color: disabled ? '#6b7280' : rarityColor,
              cursor: disabled ? 'not-allowed' : 'pointer',
              fontFamily: 'serif', fontWeight: 800, fontSize: '0.82rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
            {isLoading ? (
              <motion.div style={{ width: 14, height: 14, border: '2px solid currentColor',
                borderTopColor: 'transparent', borderRadius: '50%' }}
                animate={{ rotate: 360 }} transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }} />
            ) : !canAfford ? (
              <span>🪙 Kurang Gold</span>
            ) : bagFull ? (
              <span>🎒 Tas Penuh</span>
            ) : (
              <span>🪙 {def.buyPrice} Gold</span>
            )}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

// ── Thorin Dialog popup ───────────────────────────────────────────────────────
function ThorinDialog({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.85, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.85, y: 30 }}
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 420, width: '100%',
          background: 'linear-gradient(160deg, #1a0b00, #0d0500)',
          border: '2px solid #92400e88',
          borderRadius: 18,
          boxShadow: '0 0 60px #d9770630, 0 20px 60px rgba(0,0,0,0.8)',
          overflow: 'hidden',
        }}
      >
        {/* Header strip */}
        <div style={{
          background: 'linear-gradient(90deg, #7c2d12, #92400e, #7c2d12)',
          padding: '12px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.6rem' }}>🔨</span>
            <span style={{ fontFamily: 'serif', fontWeight: 800, color: '#fde68a', fontSize: '0.95rem' }}>
              Thorin Ironhammer
            </span>
          </div>
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f97316', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 22px 24px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          {/* Avatar */}
          <div style={{
            width: 56, height: 56, flexShrink: 0, borderRadius: '50%',
            background: 'linear-gradient(135deg, #78350f, #451a03)',
            border: '2px solid #d9770660',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.8rem',
          }}>
            🧔
          </div>
          {/* Speech bubble */}
          <div style={{
            background: 'rgba(92,40,8,0.25)',
            border: '1px solid #92400e55',
            borderRadius: 12, padding: '12px 14px',
            flex: 1,
          }}>
            <p style={{
              fontSize: '0.8rem', color: '#fcd9a0', lineHeight: 1.65,
              fontStyle: 'italic', fontFamily: 'serif',
            }}>
              "{message}"
            </p>
          </div>
        </div>

        <div style={{ padding: '0 22px 20px', textAlign: 'right' }}>
          <motion.button
            onClick={onClose}
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            style={{
              padding: '8px 24px', borderRadius: 10,
              background: 'linear-gradient(135deg, #92400e, #78350f)',
              border: '1px solid #d97706aa',
              color: '#fde68a', cursor: 'pointer',
              fontFamily: 'serif', fontWeight: 800, fontSize: '0.8rem',
            }}>
            Mengerti
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Sell Item Popup ───────────────────────────────────────────────────────────
const STAT_ICONS: Record<string, string> = {
  'P.ATK':'⚔️','M.ATK':'🔮','P.DEF':'🛡️','M.DEF':'💙','Mana':'🌀',
  'Dodge':'💨','Accuracy':'🎯','Crit Rate':'👁️','Crit DMG':'💥',
  'Crit DMG Reduction':'🔰','STR':'💪','INT':'🧠','DEX':'🏹','VIT':'❤️','AGI':'⚡',
};

function SellItemPopup({ item, selling, onSell, onClose }: {
  item: InventoryItem;
  selling: boolean;
  onSell: (item: InventoryItem) => void;
  onClose: () => void;
}) {
  const rarityColor = RARITY_COLOR[item?.rarity ?? 'common'] ?? '#9ca3af';
  const imgSrc      = ITEM_IMAGES[item.defId] ?? null;
  const SvgArt      = ITEM_SVG_ART[item.defId] ?? null;
  const statLines   = formatStatBonuses(item.stats ?? {});

  return (
    <motion.div
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(0,0,0,0.8)',
        backdropFilter:'blur(8px)', display:'flex', alignItems:'center',
        justifyContent:'center', padding:24 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale:0.85, y:30, opacity:0 }}
        animate={{ scale:1, y:0, opacity:1 }}
        exit={{ scale:0.88, y:20, opacity:0 }}
        transition={{ duration:0.26, ease:'easeOut' }}
        onClick={e => e.stopPropagation()}
        style={{
          width:'100%', maxWidth:330, borderRadius:20, overflow:'hidden', position:'relative',
          background:'linear-gradient(170deg, #0d0520 0%, #180938 55%, #080210 100%)',
          border:`1.5px solid ${rarityColor}55`,
          boxShadow:`0 0 70px ${rarityColor}25, 0 30px 80px rgba(0,0,0,0.97)`,
        }}
      >
        {/* Rarity glow bar */}
        <div style={{ height:3, background:`linear-gradient(90deg, transparent, ${rarityColor}, transparent)`, boxShadow:`0 0 14px ${rarityColor}` }} />

        {/* Close button */}
        <button onClick={onClose} style={{
          position:'absolute', top:11, right:11, zIndex:10,
          width:26, height:26, borderRadius:'50%',
          background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)',
          display:'flex', alignItems:'center', justifyContent:'center',
          cursor:'pointer', color:'#9ca3af',
        }}>
          <X size={13} />
        </button>

        {/* Item header */}
        <div style={{ padding:'14px 16px 10px', display:'flex', gap:12, alignItems:'center' }}>
          {/* Art */}
          <div style={{
            width:68, height:68, borderRadius:10, overflow:'hidden', flexShrink:0,
            background:item.iconBg, display:'flex', alignItems:'center', justifyContent:'center',
            position:'relative', border:`1.5px solid ${rarityColor}44`,
            boxShadow:`0 0 14px ${rarityColor}33`,
          }}>
            {imgSrc ? (
              <img src={imgSrc} alt={item.name} style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} />
            ) : SvgArt ? (
              <div style={{ position:'absolute', inset:0 }}><SvgArt /></div>
            ) : (
              <span style={{ fontSize:'2.2rem', filter:`drop-shadow(0 0 10px ${item.iconGlow}cc)` }}>{item.icon}</span>
            )}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ fontFamily:'serif', fontWeight:900, color:rarityColor, fontSize:'1rem', marginBottom:2 }}>{item.name}</p>
            <p style={{ fontSize:'0.6rem', color:rarityColor, letterSpacing:'0.08em', marginBottom:2 }}>{RARITY_LABEL[item.rarity ?? 'common']}</p>
            <p style={{ fontSize:'0.58rem', color:'#6b7280', textTransform:'capitalize' }}>
              {item.slot === 'hand' ? '⚔️ Senjata / Tangan' : `🎒 ${item.slot}`}
            </p>
          </div>
        </div>

        <div style={{ padding:'0 16px 18px' }}>
          {/* Description */}
          <p style={{ fontSize:'0.67rem', color:'#9ca3af', marginBottom:12, lineHeight:1.55, fontStyle:'italic' }}>
            "{item.description}"
          </p>

          {/* Stats */}
          {statLines.length > 0 && (
            <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:14 }}>
              {statLines.map(({ label, value }) => (
                <div key={label} style={{
                  display:'flex', justifyContent:'space-between', alignItems:'center',
                  background:'rgba(0,0,0,0.35)', borderRadius:8, padding:'5px 10px',
                  border:`1px solid ${rarityColor}1e`,
                }}>
                  <span style={{ fontSize:'0.68rem', color:'#9ca3af', display:'flex', alignItems:'center', gap:5 }}>
                    <span style={{ fontSize:'0.78rem' }}>{STAT_ICONS[label] ?? '✦'}</span>{label}
                  </span>
                  <span style={{ fontSize:'0.76rem', fontWeight:800, color:rarityColor, fontFamily:'serif' }}>{value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Sell price highlight */}
          <motion.div
            animate={{ boxShadow:['0 0 0px #d9770600','0 0 18px #d9770640','0 0 0px #d9770600'] }}
            transition={{ duration:2.4, repeat:Infinity }}
            style={{
              background:'linear-gradient(135deg, rgba(120,53,15,0.3), rgba(92,40,8,0.2))',
              border:'1.5px solid rgba(217,119,6,0.45)',
              borderRadius:12, padding:'11px 16px', marginBottom:14,
              display:'flex', justifyContent:'space-between', alignItems:'center',
            }}
          >
            <div>
              <p style={{ fontSize:'0.55rem', color:'#d97706', letterSpacing:'0.14em', textTransform:'uppercase', marginBottom:2 }}>⚖️ Harga Jual Thorin</p>
              <p style={{ fontSize:'0.65rem', color:'#92400e', fontStyle:'italic', fontFamily:'serif' }}>Dibayar tunai sekarang</p>
            </div>
            <p style={{ fontSize:'1.1rem', fontWeight:900, color:'#fbbf24', fontFamily:'serif' }}>
              🪙 {(item.sellPrice ?? 0).toLocaleString()}
            </p>
          </motion.div>

          {/* Sell button */}
          <motion.button
            onClick={() => !selling && onSell(item)}
            disabled={selling}
            whileHover={selling ? {} : { scale:1.03, boxShadow:'0 0 28px rgba(74,222,128,0.45)' }}
            whileTap={selling ? {} : { scale:0.97 }}
            style={{
              width:'100%', padding:'11px 0',
              background: selling ? 'rgba(75,85,99,0.2)' : 'linear-gradient(135deg, rgba(22,101,52,0.8), rgba(20,83,45,0.9))',
              border:`1.5px solid ${selling ? '#374151' : 'rgba(74,222,128,0.5)'}`,
              borderRadius:11, color: selling ? '#6b7280' : '#4ade80',
              cursor: selling ? 'not-allowed' : 'pointer',
              fontFamily:'serif', fontWeight:800, fontSize:'0.9rem', letterSpacing:'0.06em',
              display:'flex', alignItems:'center', justifyContent:'center', gap:7,
              boxShadow: selling ? 'none' : '0 0 12px rgba(74,222,128,0.2)',
            }}
          >
            {selling ? (
              <motion.div style={{ width:14, height:14, border:'2px solid #4ade80', borderTopColor:'transparent', borderRadius:'50%' }}
                animate={{ rotate:360 }} transition={{ duration:0.55, repeat:Infinity, ease:'linear' }} />
            ) : (
              <><span>🪙</span> Jual Sekarang</>
            )}
          </motion.button>

          {/* Cancel */}
          <button
            onClick={onClose}
            style={{
              width:'100%', marginTop:8, padding:'8px 0',
              background:'transparent', border:'1px solid rgba(255,255,255,0.08)',
              borderRadius:10, color:'#6b7280', cursor:'pointer',
              fontFamily:'serif', fontSize:'0.78rem',
            }}
          >
            Batal
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function BlacksmithPage() {
  const { player, updatePlayer, completeTutorialStep, addItemToInventory } = useGame();
  const navigate = useNavigate();

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [buying,         setBuying]         = useState<string | null>(null);
  const [feedback,       setFeedback]       = useState<string | null>(null);
  const [thorinMsg,      setThorinMsg]      = useState<string | null>(null);
  const [claimingWeapon, setClaimingWeapon] = useState(false);
  // ── State untuk fitur jual ──
  const [sellPopupItem,  setSellPopupItem]  = useState<InventoryItem | null>(null);
  const [selling,        setSelling]        = useState(false);

  if (!player) return null;

  const isQuestActive = player.tutorialProgress && !player.tutorialProgress.gotWeapon;
  const bagCount      = (player.inventory ?? []).length;
  const bagFull       = bagCount >= 20;

  const showFeedback = (msg: string, ok = true) => {
    setFeedback(ok ? `✦ ${msg}` : `⚠ ${msg}`);
    setTimeout(() => setFeedback(null), 2600);
  };

  // ── Sell handler ─────────────────────────────────────────────────────────────
  const handleSellItem = async (item: InventoryItem) => {
    setSelling(true);
    setSellPopupItem(null);
    const newInventory = (player.inventory ?? []).filter(i => i.instanceId !== item.instanceId);
    await updatePlayer({ inventory: newInventory, gold: player.gold + (item.sellPrice ?? 0) });
    showFeedback(`${item.name} dijual seharga ${(item.sellPrice ?? 0).toLocaleString()} Gold!`);
    setSelling(false);
  };

  const handleGetQuestWeapon = async (defId: string) => {
    if (bagFull) { showFeedback('Tas penuh! Kosongkan slot tas terlebih dahulu.', false); return; }
    setClaimingWeapon(true);
    const ok = await addItemToInventory(defId);
    if (!ok) { showFeedback('Gagal menambahkan item.', false); return; }
    await completeTutorialStep('weapon');
    showFeedback(`${ITEM_DEFS[defId].name} ditambahkan ke tas!`);
    setTimeout(() => navigate('/game/village/chief-house'), 1600);
  };

  const handleBuyItem = async (defId: string) => {
    const def = ITEM_DEFS[defId];
    if (!def) return;
    if (player.gold < def.buyPrice) { showFeedback('Gold tidak cukup!', false); return; }
    if (bagFull) { showFeedback('Tas penuh! Kosongkan slot tas terlebih dahulu.', false); return; }
    setBuying(defId);
    const ok = await addItemToInventory(defId);
    if (ok) {
      await updatePlayer({ gold: player.gold - def.buyPrice });
      showFeedback(`${def.name} dibeli seharga ${def.buyPrice} Gold!`);
    } else {
      showFeedback('Gagal membeli item.', false);
    }
    setBuying(null);
  };

  const handleCategoryClick = (cat: ShopCategory) => {
    if (cat.unavailable) {
      setThorinMsg(cat.thorinMsg ?? '');
    } else {
      setActiveCategory(cat.id);
    }
  };

  const activeCat = SHOP_CATEGORIES.find(c => c.id === activeCategory);

  // ── Build accordion items ────────────────────────────────────────────────────
  const menuItems: AccordionItem[] = [];

  if (isQuestActive) {
    menuItems.push({
      id: 'quest',
      label: 'Misi: Ambil Senjata',
      sublabel: 'Dapatkan senjata gratis dari Thorin',
      emoji: '⚔️',
      image: IMG_QUEST,
      badge: '✦ Gratis!',
      badgeColor: '#fbbf24',
      accentColor: '#f59e0b',
      glowColor: 'rgba(245,158,11,0.35)',
      fromColor: 'rgba(101,77,0,0.4)',
      content: (
        <div>
          <div style={{ background:'rgba(92,40,8,0.15)', border:'1px solid rgba(146,64,14,0.3)', borderRadius:10, padding:'10px 14px', marginBottom:16, fontSize:'0.75rem', color:'#fcd9a0', fontStyle:'italic', fontFamily:'serif' }}>
            "Pilih satu senjata sesuai gaya bertarungmu. Ini hadiah dari desa untuk petualang baru!"
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:12 }}>
            {QUEST_ITEM_IDS.map(defId => (
              <ItemCard key={defId} defId={defId} isQuest playerGold={player.gold} bagFull={bagFull} buying={buying}
                alreadyHas={(player.inventory ?? []).some((i: any) => i.defId === defId)}
                questDone={claimingWeapon} onBuy={handleBuyItem} onQuestClaim={handleGetQuestWeapon} />
            ))}
          </div>
        </div>
      ),
    });
  }

  menuItems.push({
    id: 'buy',
    label: 'Beli Perlengkapan',
    sublabel: 'Senjata, armor, & aksesoris',
    emoji: '🛒',
    image: IMG_BUY,
    accentColor: '#f97316',
    glowColor: 'rgba(249,115,22,0.35)',
    fromColor: 'rgba(80,30,0,0.4)',
    content: (
      <AnimatePresence mode="wait">
        {!activeCategory ? (
          <motion.div key="cats" initial={{ opacity:0, x:10 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-10 }} transition={{ duration:0.2 }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(130px, 1fr))', gap:10 }}>
              {SHOP_CATEGORIES.map(cat => (
                <motion.button key={cat.id} onClick={() => handleCategoryClick(cat)}
                  whileHover={{ scale:1.05, y:-2 }} whileTap={{ scale:0.96 }}
                  style={{ background: cat.unavailable ? 'rgba(20,10,30,0.6)' : 'rgba(20,8,0,0.7)', border:`1.5px solid ${cat.glowColor}${cat.unavailable?'33':'55'}`, borderRadius:12, padding:'14px 10px', cursor:'pointer', textAlign:'center', opacity: cat.unavailable?0.55:1, position:'relative', overflow:'hidden' }}>
                  {cat.unavailable && (
                    <div style={{ position:'absolute', top:4, right:4, background:'rgba(239,68,68,0.2)', border:'1px solid rgba(239,68,68,0.4)', borderRadius:5, padding:'1px 5px', fontSize:'0.42rem', color:'#f87171', fontWeight:800 }}>✕</div>
                  )}
                  <div style={{ fontSize:'1.6rem', marginBottom:6 }}>{cat.emoji}</div>
                  <p style={{ fontFamily:'serif', fontWeight:800, color: cat.unavailable?'#6b7280':'#fde68a', fontSize:'0.72rem', marginBottom:2 }}>{cat.label}</p>
                  <p style={{ fontSize:'0.55rem', color: cat.unavailable?'#4b5563':`${cat.glowColor}cc` }}>{cat.unavailable?'—':`${cat.items.length} item`}</p>
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : activeCat ? (
          <motion.div key={`items-${activeCategory}`} initial={{ opacity:0, x:10 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-10 }} transition={{ duration:0.2 }}>
            <button onClick={() => setActiveCategory(null)} style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer', color:'#f97316', fontFamily:'serif', fontWeight:700, fontSize:'0.78rem', marginBottom:12 }}>
              <ArrowLeft size={13} /> Kembali ke Kategori
            </button>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(170px, 1fr))', gap:12 }}>
              {activeCat.items.map(defId => (
                <ItemCard key={defId} defId={defId} isQuest={false} playerGold={player.gold} bagFull={bagFull} buying={buying}
                  alreadyHas={(player.inventory ?? []).some((i: any) => i.defId === defId)}
                  onBuy={handleBuyItem} onQuestClaim={handleGetQuestWeapon} />
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    ),
  });

  menuItems.push({
    id: 'sell',
    label: 'Jual Equipment',
    sublabel: 'Senjata, armor & material bekas',
    emoji: '💰',
    image: IMG_SELL,
    accentColor: '#4ade80',
    glowColor: 'rgba(74,222,128,0.3)',
    fromColor: 'rgba(5,46,22,0.35)',
    content: (() => {
      const inventory = (player.inventory ?? []) as InventoryItem[];
      return (
        <div>
          {/* Info bar */}
          <div style={{
            background:'rgba(5,46,22,0.25)', border:'1px solid rgba(74,222,128,0.2)',
            borderRadius:10, padding:'10px 14px', marginBottom:14,
            display:'flex', gap:10, alignItems:'center',
          }}>
            <span style={{ fontSize:'1.2rem' }}>🧔</span>
            <p style={{ fontSize:'0.72rem', color:'#86efac', fontStyle:'italic', fontFamily:'serif', lineHeight:1.5 }}>
              "Bawa kemari barang yang tidak kamu butuhkan — aku akan bayar dengan harga adil, petualang!"
            </p>
          </div>

          {/* Bag count pill */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <p style={{ fontSize:'0.68rem', color:'#6b7280' }}>
              Klik item untuk melihat info & harga jual
            </p>
            <span style={{
              fontSize:'0.6rem', color: bagFull ? '#f87171' : '#4ade80',
              background: bagFull ? 'rgba(239,68,68,0.1)' : 'rgba(74,222,128,0.1)',
              border:`1px solid ${bagFull ? 'rgba(239,68,68,0.3)' : 'rgba(74,222,128,0.25)'}`,
              borderRadius:99, padding:'2px 10px', fontWeight:700,
            }}>
              🎒 {bagCount}/20
            </span>
          </div>

          {inventory.length === 0 ? (
            <div style={{
              textAlign:'center', padding:'32px 0',
              color:'#6b7280', fontSize:'0.78rem', fontStyle:'italic', fontFamily:'serif',
            }}>
              <p style={{ fontSize:'2rem', marginBottom:8 }}>🎒</p>
              Tasmu kosong. Tidak ada item untuk dijual.
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:7 }}>
              {Array.from({ length: 20 }).map((_, i) => {
                const item = inventory[i] ?? null;
                if (!item) {
                  return (
                    <div key={`empty-${i}`} style={{
                      aspectRatio:'1', borderRadius:8,
                      background:'rgba(10,4,24,0.45)', border:'1.5px solid rgba(55,48,163,0.25)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                    }}>
                      <svg width="12" height="12" viewBox="0 0 16 16" style={{ opacity:0.13 }}>
                        <path d="M8 1 L11 8 L8 15 L5 8 Z" fill="none" stroke="#a78bfa" strokeWidth="1.2" strokeLinejoin="round"/>
                        <line x1="1" y1="8" x2="15" y2="8" stroke="#a78bfa" strokeWidth="1.2"/>
                      </svg>
                    </div>
                  );
                }
                const color = RARITY_COLOR[item.rarity ?? 'common'] ?? '#9ca3af';
                const imgSrc = ITEM_IMAGES[item.defId] ?? null;
                const SvgArt = ITEM_SVG_ART[item.defId] ?? null;
                return (
                  <motion.div
                    key={item.instanceId ?? i}
                    onClick={() => setSellPopupItem(item)}
                    style={{
                      aspectRatio:'1', cursor:'pointer', borderRadius:8, overflow:'hidden',
                      background:'rgba(10,4,24,0.75)',
                      border:`1.5px solid ${color}66`,
                      position:'relative',
                      boxShadow:`0 0 8px ${color}22`,
                    }}
                    whileHover={{ scale:1.12, y:-3, boxShadow:`0 0 20px ${color}66` }}
                    transition={{ type:'spring', stiffness:320 }}
                  >
                    {/* Rarity dot */}
                    <div style={{
                      position:'absolute', top:3, right:3, zIndex:5,
                      width:5, height:5, borderRadius:'50%',
                      background:color, boxShadow:`0 0 5px ${color}`,
                    }} />
                    {/* Sell price tag */}
                    <div style={{
                      position:'absolute', bottom:0, left:0, right:0, zIndex:5,
                      background:'rgba(0,0,0,0.72)', padding:'2px 3px', textAlign:'center',
                    }}>
                      <span style={{ fontSize:'0.42rem', color:'#fbbf24', fontWeight:800 }}>
                        🪙{(item.sellPrice ?? 0).toLocaleString()}
                      </span>
                    </div>
                    {/* Art */}
                    <div style={{ width:'100%', height:'100%', position:'relative', background:item.iconBg, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      {imgSrc ? (
                        <img src={imgSrc} alt={item.name} style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} />
                      ) : SvgArt ? (
                        <div style={{ position:'absolute', inset:0 }}><SvgArt /></div>
                      ) : (
                        <span style={{ fontSize:'1.3rem', filter:`drop-shadow(0 0 8px ${item.iconGlow ?? color}cc)` }}>{item.icon}</span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      );
    })(),
  });

  menuItems.push({
    id: 'forge',
    label: 'Tempa Senjata',
    sublabel: 'Buat senjata custom dari bahan langka',
    emoji: '🔨',
    image: IMG_FORGE,
    badge: 'Coming Soon',
    badgeColor: '#a78bfa',
    accentColor: '#8b5cf6',
    glowColor: 'rgba(139,92,246,0.3)',
    fromColor: 'rgba(60,20,80,0.4)',
    content: (
      <div className="space-y-3 text-center">
        <motion.div animate={{ rotate:[-5,5,-5] }} transition={{ duration:3, repeat:Infinity, ease:'easeInOut' }} className="inline-block text-5xl">⚒️</motion.div>
        <p style={{ color:'#9ca3af', fontSize:'0.78rem', lineHeight:1.65 }}>Fitur tempa senjata custom akan segera hadir!</p>
        <p style={{ fontFamily:'serif', fontStyle:'italic', color:'#7c5c40', fontSize:'0.72rem' }}>\"Aku sedang merancang sistem baru — diperlukan bahan langka yang belum tersedia di desa...\"</p>
      </div>
    ),
  });

  // ── Tombol kembali ke desa sebagai item terakhir di accordion ────────────────
  menuItems.push({
    id: 'back_to_village',
    label: 'Kembali ke Desa',
    sublabel: 'Keluar dari pandai besi',
    emoji: '🏘️',
    accentColor: '#6b7280',
    glowColor: 'rgba(107,114,128,0.3)',
    fromColor: 'rgba(30,30,40,0.4)',
    content: null,
    onClick: () => navigate('/game/village'),
  });

  return (
    <div className="max-w-5xl mx-auto">
      {/* Main card */}
      <div style={{
        background: 'linear-gradient(160deg, rgba(20,8,0,0.97), rgba(10,3,0,0.99))',
        border: '2px solid rgba(180,80,10,0.35)',
        borderRadius: 20, overflow: 'hidden',
        boxShadow: '0 0 60px rgba(180,80,10,0.15), 0 20px 80px rgba(0,0,0,0.7)',
      }}>

        {/* ── Banner ─────────────────────────────────────────────────── */}
        <div style={{ position: 'relative', height: 220 }}>
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1517697471339-4aa32003c11a?w=1200&q=80"
            alt="Forge"
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 40%' }}
          />
          {/* Dark overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(20,8,0,0.6) 50%, rgba(10,3,0,0.95) 100%)',
          }} />
          {/* Ember particles */}
          {[8, 18, 30, 42, 55, 68, 80, 92].map((x, i) => (
            <EmberParticle key={i} x={x} delay={i * 0.35} />
          ))}

          {/* Title area */}
          <div style={{ position: 'absolute', bottom: 20, left: 28, right: 28,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #92400e, #451a03)',
                  border: '2px solid #d9770688',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.3rem',
                }}>🔥</div>
                <div>
                  <h1 style={{
                    fontFamily: 'serif', fontWeight: 800,
                    color: '#fde68a', fontSize: '1.6rem',
                    textShadow: '0 0 20px #d97706aa, 0 2px 8px #000',
                  }}>Pandai Besi Desa</h1>
                  <p style={{ color: '#f97316', fontSize: '0.72rem', fontStyle: 'italic' }}>
                    Thorin Ironhammer — Sejak 40 Tahun
                  </p>
                </div>
              </div>
            </div>
            {/* Gold & bag */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
              <div style={{
                background: 'rgba(0,0,0,0.65)', border: '1px solid #f59e0b55',
                borderRadius: 8, padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{ fontSize: '0.95rem' }}>🪙</span>
                <span style={{ fontFamily: 'serif', fontWeight: 800, color: '#fbbf24', fontSize: '0.85rem' }}>
                  {player.gold.toLocaleString()} Gold
                </span>
              </div>
              <div style={{
                background: 'rgba(0,0,0,0.65)',
                border: `1px solid ${bagFull ? '#ef444455' : '#ffffff22'}`,
                borderRadius: 8, padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <span style={{ fontSize: '0.85rem' }}>🎒</span>
                <span style={{ fontSize: '0.75rem', color: bagFull ? '#f87171' : '#9ca3af', fontWeight: 700 }}>
                  {bagCount}/20
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Content ────────────────────────────────────────────────── */}
        <div style={{ padding: '24px 28px 32px' }}>

          {/* Feedback toast */}
          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
                style={{
                  marginBottom: 18, padding: '10px 16px', borderRadius: 12, textAlign: 'center',
                  background: feedback.startsWith('⚠') ? 'rgba(239,68,68,0.12)' : 'rgba(74,222,128,0.12)',
                  border: feedback.startsWith('⚠') ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(74,222,128,0.4)',
                  color: feedback.startsWith('⚠') ? '#f87171' : '#4ade80',
                  fontFamily: 'serif', fontWeight: 800, fontSize: '0.85rem',
                }}>
                {feedback}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Thorin greeting */}
          <div style={{
            background: 'rgba(92,40,8,0.2)',
            border: '1px solid rgba(146,64,14,0.4)',
            borderRadius: 12, padding: '14px 18px', marginBottom: 20,
            display: 'flex', gap: 14, alignItems: 'flex-start',
          }}>
            <div style={{
              width: 48, height: 48, flexShrink: 0, borderRadius: '50%',
              background: 'linear-gradient(135deg, #78350f, #451a03)',
              border: '2px solid #d9770655',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem',
            }}>🧔</div>
            <div>
              <p style={{ fontFamily: 'serif', color: '#fcd9a0', fontSize: '0.82rem',
                fontStyle: 'italic', lineHeight: 1.6, marginBottom: isQuestActive ? 8 : 0 }}>
                "Selamat datang di bengkelku! Aku Thorin, pandai besi terbaik di desa ini.
                Tempaku sudah melayani tiga generasi keluarga petualang Arendal."
              </p>
              {isQuestActive && (
                <p style={{ fontFamily: 'serif', color: '#fde68a', fontSize: '0.8rem',
                  fontStyle: 'italic', lineHeight: 1.6 }}>
                  "Kepala Desa sudah bilang soal kamu. Aku sudah siapkan beberapa senjata kayu —
                  pilih satu yang paling cocok dengan gaya bertarungmu!"
                </p>
              )}
            </div>
          </div>

          {/* Accordion menu */}
          <MenuAccordion items={menuItems} title="Menu Pandai Besi" />
        </div>
      </div>

      {/* Thorin dialog for unavailable categories */}
      <AnimatePresence>
        {thorinMsg && (
          <ThorinDialog message={thorinMsg} onClose={() => setThorinMsg(null)} />
        )}
      </AnimatePresence>

      {/* Sell item popup overlay */}
      <AnimatePresence>
        {sellPopupItem && (
          <SellItemPopup
            item={sellPopupItem}
            selling={selling}
            onSell={handleSellItem}
            onClose={() => setSellPopupItem(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}