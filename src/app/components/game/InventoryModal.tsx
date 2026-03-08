/**
 * InventoryModal.tsx
 * Full equipment & bag system with interactive item popups.
 */
import { useState } from 'react';
import type { ReactNode } from 'react';
import { X, Backpack, ChevronRight, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useGame } from '../../contexts/GameContext';
import type { InventoryItem } from '../../data/itemData';
import {
  RARITY_COLOR, RARITY_LABEL, formatStatBonuses,
} from '../../data/itemData';
import { ITEM_IMAGES } from '../../data/itemImages';
import { ITEM_SVG_ART } from '../../data/itemSvgArt';
import anatomyImg from 'figma:asset/4770ca651dd0578f6de1ef6c86f54909197d45cb.png';

// ─── Types ─────────────────────────────────────────────────────────────────────

type PopupMode =
  | { type: 'bag_item';    item: InventoryItem }
  | { type: 'equip_item';  item: InventoryItem; slot: string }
  | { type: 'hand_choice'; item: InventoryItem };

// ─── Equipment slot layout ─────────────────────────────────────────────────────

const EQ_SLOTS = [
  { key: 'earringRight', label: 'ANTING\nKANAN',  top:  10, left:  58, w: 70,  h: 70  },
  { key: 'helm',         label: 'HELM',           top:   4, left: 140, w: 80,  h: 80  },
  { key: 'earringLeft',  label: 'ANTING\nKIRI',   top:  10, left: 232, w: 70,  h: 70  },
  { key: 'rightHand',    label: 'TANGAN\nKANAN',  top:  92, left:  60, w: 60,  h: 145 },
  { key: 'armor',        label: 'ARMOR',          top:  92, left: 128, w: 104, h: 118 },
  { key: 'leftHand',     label: 'TANGAN\nKIRI',   top:  92, left: 240, w: 60,  h: 145 },
  { key: 'pants',        label: 'CELANA',         top: 218, left: 128, w: 104, h: 108 },
  { key: 'ringRight',    label: 'CINCIN\nKANAN',  top: 338, left:  50, w: 80,  h: 70  },
  { key: 'boots',        label: 'SEPATU',         top: 338, left: 143, w: 74,  h: 70  },
  { key: 'ringLeft',     label: 'CINCIN\nKIRI',   top: 338, left: 236, w: 80,  h: 70  },
] as const;

// ─── Item Image / Placeholder Card ───────────────────────────────────────────

function ItemArt({ item, width, height, fontSize = '2rem' }: {
  item: InventoryItem; width: number | string; height: number | string; fontSize?: string;
}) {
  // Defensive: item might come from old Supabase data with missing fields
  const defId      = item?.defId ?? '';
  const iconBg     = item?.iconBg  ?? 'linear-gradient(135deg,#1e0b40,#3b0764)';
  const iconGlow   = item?.iconGlow ?? '#a855f7';
  const icon       = item?.icon     ?? '⚔️';
  const rarityColor = RARITY_COLOR[item?.rarity ?? 'common'] ?? '#9ca3af';
  const imgSrc      = defId ? (ITEM_IMAGES[defId] ?? null) : null;
  const SvgArt      = defId ? (ITEM_SVG_ART[defId] ?? null) : null;

  return (
    <div style={{
      width, height, position: 'relative', borderRadius: 6, overflow: 'hidden',
      background: iconBg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      {imgSrc ? (
        /* Real photo — cover fills slot edge-to-edge with no space */
        <img
          src={imgSrc}
          alt={item?.name ?? ''}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'center', padding: 0,
          }}
          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
      ) : SvgArt ? (
        /* SVG illustration — fills slot completely edge-to-edge */
        <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          <SvgArt />
        </div>
      ) : (
        <>
          {/* Rarity glow overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(ellipse at 50% 110%, ${rarityColor}44 0%, transparent 65%)`,
            pointerEvents: 'none',
          }} />
          {/* Shimmer line */}
          <motion.div
            style={{
              position: 'absolute', top: 0, left: '-60%', width: '40%', height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)',
              pointerEvents: 'none',
            }}
            animate={{ left: ['-60%', '160%'] }}
            transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 2, ease: 'easeInOut' }}
          />
          <span style={{ fontSize, lineHeight: 1, position: 'relative', zIndex: 1,
            filter: `drop-shadow(0 0 8px ${iconGlow}cc)` }}>
            {icon}
          </span>
        </>
      )}
    </div>
  );
}

// ─── Equipment Slot cell ─────────────────────────────────────────────────────

function EqSlot({ slotKey, label, item, onClick }: {
  slotKey: string; label: string; item: InventoryItem | null; onClick: () => void;
}) {
  const filled      = !!item;
  const rarityColor = filled ? (RARITY_COLOR[item!.rarity] ?? '#9ca3af') : null;
  const lines       = label.split('\n');
  const s           = EQ_SLOTS.find(sl => sl.key === slotKey);
  const w           = s?.w ?? 60;
  const h           = s?.h ?? 60;

  return (
    <motion.div
      onClick={filled ? onClick : undefined}
      className="relative w-full h-full rounded-lg flex flex-col items-center justify-center gap-1"
      style={{
        background: filled
          ? 'linear-gradient(135deg, rgba(76,29,149,0.5), rgba(30,12,60,0.65))'
          : 'rgba(10,4,24,0.52)',
        border: filled
          ? `1.5px solid ${rarityColor}88`
          : '1.5px solid #4c1d9555',
        backdropFilter: 'blur(6px)',
        boxShadow: filled ? `0 0 18px ${rarityColor}44, inset 0 0 10px ${rarityColor}11` : 'none',
        cursor: filled ? 'pointer' : 'default',
        overflow: 'hidden',
        padding: 2,
      }}
      whileHover={filled ? { scale: 1.06, zIndex: 20 } : {}}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {/* Corner dots */}
      {(['tl','tr','bl','br'] as const).map(pos => (
        <div key={pos} style={{
          position: 'absolute', width: 4, height: 4, borderRadius: '50%',
          top:    pos.startsWith('t') ? 5 : 'auto',
          bottom: pos.startsWith('b') ? 5 : 'auto',
          left:   pos.endsWith('l')   ? 5 : 'auto',
          right:  pos.endsWith('r')   ? 5 : 'auto',
          background: filled ? rarityColor! : '#4c1d9566',
          boxShadow:  filled ? `0 0 5px ${rarityColor}` : 'none',
        }} />
      ))}

      {/* Animated border shimmer when filled */}
      {filled && (
        <motion.div
          className="absolute inset-0 rounded-lg pointer-events-none"
          style={{ border: `1px solid ${rarityColor}44` }}
          animate={{ opacity: [0.3, 0.9, 0.3] }}
          transition={{ duration: 2.2, repeat: Infinity }}
        />
      )}

      {filled ? (
        <ItemArt item={item!} width={w - 8} height={h - 22} fontSize="1.5rem" />
      ) : (
        <svg width="20" height="20" viewBox="0 0 20 20" style={{ opacity: 0.22 }}>
          <line x1="10" y1="2"  x2="10" y2="18" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round"/>
          <line x1="2"  y1="10" x2="18" y2="10" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      )}

      {/* Slot label */}
      <div style={{ textAlign: 'center', lineHeight: 1.2, marginTop: 1 }}>
        {lines.map((l, i) => (
          <div key={i} style={{
            fontSize: '0.5rem', fontWeight: 800, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: filled ? '#ddd6fe' : '#4b5563',
          }}>{l}</div>
        ))}
        {filled && (
          <div style={{
            fontSize: '0.42rem', color: rarityColor!, marginTop: 1,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            maxWidth: '90%', margin: '1px auto 0',
          }}>
            {item!.name}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Bag Grid ─────────────────────────────────────────────────────────────────

function BagGrid({ inventory, onClickItem }: {
  inventory: InventoryItem[]; onClickItem: (item: InventoryItem) => void;
}) {
  const TOTAL = 20;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 7 }}>
      {Array.from({ length: TOTAL }).map((_, i) => {
        const item = inventory[i] ?? null;
        if (!item) return <EmptyBagSlot key={i} />;
        const color = RARITY_COLOR[item.rarity ?? 'common'] ?? '#9ca3af';
        return (
          <motion.div
            key={item.instanceId ?? i}
            onClick={() => onClickItem(item)}
            style={{
              aspectRatio: '1', cursor: 'pointer', borderRadius: 8, overflow: 'hidden',
              background: 'rgba(10,4,24,0.75)',
              border: `1.5px solid ${color}66`,
              position: 'relative',
              boxShadow: `0 0 8px ${color}22`,
            }}
            whileHover={{ scale: 1.1, y: -3, boxShadow: `0 0 18px ${color}66` }}
            transition={{ type: 'spring', stiffness: 320 }}
          >
            {/* Rarity dot */}
            <div style={{
              position: 'absolute', top: 4, right: 4, zIndex: 5,
              width: 5, height: 5, borderRadius: '50%',
              background: color, boxShadow: `0 0 5px ${color}`,
            }} />
            <ItemArt item={item} width="100%" height="100%" fontSize="1.3rem" />
          </motion.div>
        );
      })}
    </div>
  );
}

function EmptyBagSlot() {
  return (
    <div style={{
      aspectRatio: '1', borderRadius: 8,
      background: 'rgba(10,4,24,0.45)', border: '1.5px solid #3730a344',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <svg width="14" height="14" viewBox="0 0 16 16" style={{ opacity: 0.15 }}>
        <path d="M8 1 L11 8 L8 15 L5 8 Z" fill="none" stroke="#a78bfa" strokeWidth="1.2" strokeLinejoin="round"/>
        <line x1="1" y1="8" x2="15" y2="8" stroke="#a78bfa" strokeWidth="1.2"/>
        <circle cx="8" cy="8" r="1.5" fill="#a78bfa"/>
      </svg>
    </div>
  );
}

// ─── Item Stat List ───────────────────────────────────────────────────────────

function StatList({ item }: { item: InventoryItem }) {
  // Defensive guard: old Supabase data might not have stats field
  const lines = (item?.stats) ? formatStatBonuses(item.stats) : [];
  const rarityColor = RARITY_COLOR[item?.rarity ?? 'common'] ?? '#9ca3af';
  const STAT_ICONS: Record<string, string> = {
    'P.ATK':'⚔️', 'M.ATK':'🔮', 'P.DEF':'🛡️', 'M.DEF':'💙', 'Mana':'🌀',
    'Dodge':'💨', 'Accuracy':'🎯', 'Crit Rate':'👁️', 'Crit DMG':'💥',
    'Crit DMG Reduction':'🔰', 'STR':'💪', 'INT':'🧠', 'DEX':'🏹', 'VIT':'❤️', 'AGI':'⚡',
  };
  if (lines.length === 0) return (
    <div style={{ textAlign: 'center', fontSize: '0.65rem', color: '#4b5563', padding: '8px 0' }}>
      Tidak ada bonus stat
    </div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {lines.map(({ label, value }) => (
        <div key={label} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: '5px 10px',
          border: `1px solid ${rarityColor}22`,
        }}>
          <span style={{ fontSize: '0.7rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: '0.8rem' }}>{STAT_ICONS[label] ?? '✦'}</span>
            {label}
          </span>
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: rarityColor, fontFamily: 'serif' }}>
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Shared popup frame ───────────────────────────────────────────────────────

function PopupFrame({ onClose, rarityColor, children }: {
  onClose: () => void; rarityColor: string; children: ReactNode;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 320, borderRadius: 18, overflow: 'hidden',
          background: 'linear-gradient(170deg, #0d0520 0%, #180938 55%, #080210 100%)',
          border: `1.5px solid ${rarityColor}55`,
          boxShadow: `0 0 60px ${rarityColor}22, 0 30px 80px rgba(0,0,0,0.95)`,
          position: 'relative',
        }}
        initial={{ scale: 0.88, y: 24, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        {/* Rarity top bar */}
        <div style={{
          height: 3,
          background: `linear-gradient(90deg, transparent, ${rarityColor}, transparent)`,
          boxShadow: `0 0 12px ${rarityColor}`,
        }} />
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 10, right: 10, zIndex: 10,
            width: 26, height: 26, borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#9ca3af',
          }}
        >
          <X style={{ width: 13, height: 13 }} />
        </button>
        {children}
      </motion.div>
    </motion.div>
  );
}

// ─── Item Header (used in popups) ────────────────────────────────────────────

function ItemHeader({ item, rarityColor, isEquipped }: {
  item: InventoryItem; rarityColor: string; isEquipped?: boolean;
}) {
  return (
    <div style={{ padding: '14px 16px 10px', display: 'flex', gap: 12, alignItems: 'center' }}>
      <ItemArt item={item} width={64} height={64} fontSize="2rem" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <p style={{ fontFamily: 'serif', fontWeight: 900, color: rarityColor, fontSize: '1rem' }}>
            {item.name}
          </p>
          {isEquipped && (
            <span style={{
              fontSize: '0.52rem', background: 'rgba(74,222,128,0.15)',
              border: '1px solid rgba(74,222,128,0.4)', color: '#4ade80',
              borderRadius: 20, padding: '2px 7px', letterSpacing: '0.1em',
            }}>
              ✓ EQUIPPED
            </span>
          )}
        </div>
        <p style={{ fontSize: '0.62rem', color: rarityColor, marginTop: 2, letterSpacing: '0.08em' }}>
          {RARITY_LABEL[item.rarity ?? 'common']}
        </p>
        <p style={{ fontSize: '0.6rem', color: '#6b7280', marginTop: 1, textTransform: 'capitalize' }}>
          Tipe: {item.slot === 'hand' ? 'Senjata / Tangan' : (item.slot ?? '-')}
        </p>
      </div>
    </div>
  );
}

// ─── Item Popup (Bag Item — can equip) ───────────────────────────────────────

function BagItemPopup({ item, onEquip, onClose }: {
  item: InventoryItem;
  onEquip: () => void;
  onClose: () => void;
}) {
  const rarityColor = RARITY_COLOR[item?.rarity ?? 'common'] ?? '#9ca3af';
  return (
    <PopupFrame onClose={onClose} rarityColor={rarityColor}>
      <ItemHeader item={item} rarityColor={rarityColor} />
      <div style={{ padding: '0 16px 16px' }}>
        <p style={{ fontSize: '0.68rem', color: '#9ca3af', marginBottom: 12, lineHeight: 1.5 }}>
          {item.description ?? ''}
        </p>
        <StatList item={item} />
        <motion.button
          onClick={onEquip}
          whileHover={{ scale: 1.03, boxShadow: `0 0 24px ${rarityColor}88` }}
          whileTap={{ scale: 0.97 }}
          style={{
            width: '100%', marginTop: 14, padding: '10px 0',
            background: `linear-gradient(135deg, ${rarityColor}33, ${rarityColor}55)`,
            border: `1.5px solid ${rarityColor}88`,
            borderRadius: 10, color: rarityColor, cursor: 'pointer',
            fontFamily: 'serif', fontWeight: 800, fontSize: '0.88rem',
            letterSpacing: '0.08em', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 6,
          }}
        >
          <span>⚔️</span> Pakai Equipment
          <ChevronRight style={{ width: 14, height: 14 }} />
        </motion.button>
      </div>
    </PopupFrame>
  );
}

// ─── Equipped Item Popup (can unequip) ───────────────────────────────────────

function EquippedItemPopup({ item, bagFull, onUnequip, onClose }: {
  item: InventoryItem; bagFull: boolean;
  onUnequip: () => void; onClose: () => void;
}) {
  const rarityColor = RARITY_COLOR[item?.rarity ?? 'common'] ?? '#9ca3af';
  return (
    <PopupFrame onClose={onClose} rarityColor={rarityColor}>
      <ItemHeader item={item} rarityColor={rarityColor} isEquipped />
      <div style={{ padding: '0 16px 16px' }}>
        <p style={{ fontSize: '0.68rem', color: '#9ca3af', marginBottom: 12, lineHeight: 1.5 }}>
          {item.description ?? ''}
        </p>
        <StatList item={item} />
        {bagFull && (
          <div style={{
            marginTop: 10, padding: '8px 12px', borderRadius: 8,
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <AlertTriangle style={{ width: 13, height: 13, color: '#f87171', flexShrink: 0 }} />
            <span style={{ fontSize: '0.65rem', color: '#f87171' }}>
              Tas penuh! Kosongkan slot tas terlebih dahulu.
            </span>
          </div>
        )}
        <motion.button
          onClick={bagFull ? undefined : onUnequip}
          whileHover={bagFull ? {} : { scale: 1.03 }}
          whileTap={bagFull ? {} : { scale: 0.97 }}
          style={{
            width: '100%', marginTop: 14, padding: '10px 0',
            background: bagFull ? 'rgba(75,85,99,0.2)' : 'rgba(239,68,68,0.15)',
            border: `1.5px solid ${bagFull ? '#374151' : 'rgba(239,68,68,0.5)'}`,
            borderRadius: 10,
            color: bagFull ? '#6b7280' : '#f87171',
            cursor: bagFull ? 'not-allowed' : 'pointer',
            fontFamily: 'serif', fontWeight: 800, fontSize: '0.88rem',
            letterSpacing: '0.08em',
          }}
        >
          🗑️ Lepas Equipment
        </motion.button>
      </div>
    </PopupFrame>
  );
}

// ─── Hand Slot Choice Popup ───────────────────────────────────────────────────

function HandChoicePopup({ item, rightOccupied, leftOccupied, onChoose, onClose }: {
  item: InventoryItem; rightOccupied: boolean; leftOccupied: boolean;
  onChoose: (slot: 'rightHand' | 'leftHand') => void; onClose: () => void;
}) {
  const rarityColor = RARITY_COLOR[item?.rarity ?? 'common'] ?? '#9ca3af';
  return (
    <PopupFrame onClose={onClose} rarityColor={rarityColor}>
      <div style={{ padding: '14px 16px' }}>
        <div style={{ textAlign: 'center', marginBottom: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <ItemArt item={item} width={56} height={56} fontSize="1.8rem" />
          <p style={{ fontFamily: 'serif', fontWeight: 800, color: rarityColor, fontSize: '0.95rem' }}>
            Pilih Slot Tangan
          </p>
          <p style={{ fontSize: '0.65rem', color: '#6b7280' }}>
            {item.name} bisa dipegang di tangan kanan atau kiri
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {([
            { slot: 'rightHand' as const, label: 'Tangan Kanan', icon: '🤜', occupied: rightOccupied },
            { slot: 'leftHand'  as const, label: 'Tangan Kiri',  icon: '🤛', occupied: leftOccupied  },
          ]).map(({ slot, label, icon, occupied }) => (
            <motion.button
              key={slot}
              onClick={() => onChoose(slot)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              style={{
                padding: '12px 8px',
                background: `${rarityColor}18`,
                border: `1.5px solid ${rarityColor}55`,
                borderRadius: 10, cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
              }}
            >
              <span style={{ fontSize: '1.6rem' }}>{icon}</span>
              <span style={{ fontFamily: 'serif', fontWeight: 700, color: rarityColor, fontSize: '0.75rem' }}>
                {label}
              </span>
              {occupied && (
                <span style={{ fontSize: '0.55rem', color: '#f97316', letterSpacing: '0.06em' }}>
                  ⚠️ Slot berisi item
                </span>
              )}
            </motion.button>
          ))}
        </div>
      </div>
    </PopupFrame>
  );
}

// ─── Gold & Bag Bar ──────────────────────────────────────────────────────────

function GoldBar({ gold, bagCount }: { gold: number; bagCount: number }) {
  const pct      = (bagCount / 20) * 100;
  const bagColor = bagCount >= 20 ? '#ef4444' : bagCount >= 16 ? '#f97316' : '#a855f7';
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <motion.div
        className="flex-1 rounded-xl px-4 py-3 flex items-center gap-2.5"
        style={{ background: 'linear-gradient(135deg,rgba(69,26,3,0.3),rgba(120,53,15,0.25))', border: '1px solid #92400e66' }}
        animate={{ boxShadow: ['0 0 0px #d97706', '0 0 14px #d9770640', '0 0 0px #d97706'] }}
        transition={{ duration: 2.8, repeat: Infinity }}
      >
        <motion.span style={{ fontSize: '1.2rem' }} animate={{ rotate: [0,12,-12,0] }} transition={{ duration: 5, repeat: Infinity }}>🪙</motion.span>
        <div>
          <p style={{ fontSize: '0.55rem', color: '#d97706', letterSpacing: '0.16em', textTransform: 'uppercase' }}>Koin Emas</p>
          <p style={{ fontSize: '0.95rem', color: '#fbbf24', fontWeight: 800 }}>{gold.toLocaleString('id-ID')}</p>
        </div>
      </motion.div>
      <div style={{ minWidth: 90, background: 'rgba(10,4,24,0.6)', border: `1px solid ${bagColor}44`, borderRadius: 12, padding: '8px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: '0.55rem', color: '#6b7280', letterSpacing: '0.1em' }}>TAS</span>
          <span style={{ fontSize: '0.6rem', color: bagColor, fontWeight: 700 }}>{bagCount}/20</span>
        </div>
        <div style={{ width: '100%', height: 5, background: 'rgba(0,0,0,0.5)', borderRadius: 99, overflow: 'hidden' }}>
          <motion.div
            style={{ height: '100%', borderRadius: 99, background: bagColor }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Panel Box ────────────────────────────────────────────────────────────────

function PanelBox({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: '1.5px solid #7c3aed44', background: 'rgba(20,8,45,0.6)', boxShadow: '0 2px 24px rgba(124,58,237,0.12)' }}
    >
      <div
        className="flex items-center justify-center py-2 border-b"
        style={{ background: 'linear-gradient(90deg,transparent,#7c3aed33,transparent)', borderColor: '#7c3aed33' }}
      >
        <span style={{ color: '#ddd6fe', fontWeight: 800, fontSize: '0.82rem', letterSpacing: '0.25em', textTransform: 'uppercase' }}>
          {title}
        </span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

interface InventoryModalProps { onClose: () => void; }

export default function InventoryModal({ onClose }: InventoryModalProps) {
  const { player, equipItem, unequipItem } = useGame();
  const [popup,    setPopup]    = useState<PopupMode | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!player) return null;

  const equipment = player.equipment  ?? {};
  const inventory = (player.inventory ?? []) as InventoryItem[];
  const bagFull   = inventory.length >= 20;

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2200);
  };

  const handleBagClick = (item: InventoryItem) => {
    setPopup({ type: 'bag_item', item });
  };

  const handleSlotClick = (slotKey: string) => {
    const item = (equipment as any)[slotKey] as InventoryItem | undefined | null;
    if (!item) return;
    setPopup({ type: 'equip_item', item, slot: slotKey });
  };

  const handleEquipRequest = (item: InventoryItem) => {
    setPopup(null);
    if (item.slot === 'hand') {
      setPopup({ type: 'hand_choice', item });
    } else {
      handleEquipToSlot(item, item.slot);
    }
  };

  const handleEquipToSlot = async (item: InventoryItem, slotKey: string) => {
    setPopup(null);
    setLoading(true);
    try {
      await equipItem(item, slotKey);
      showFeedback(`${item.name} dipasang!`);
    } catch (err) {
      showFeedback('Gagal memasang equipment.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnequip = async (slot: string) => {
    setPopup(null);
    setLoading(true);
    try {
      await unequipItem(slot);
      showFeedback('Equipment dilepas ke tas.');
    } catch (err) {
      showFeedback('Gagal melepas equipment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(2,1,12,0.88)', backdropFilter: 'blur(18px)' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            onClick={e => e.stopPropagation()}
            className="relative rounded-2xl overflow-hidden overflow-y-auto"
            style={{
              width: 420, maxHeight: '94vh',
              background: 'linear-gradient(170deg,#0d0618 0%,#130828 55%,#080312 100%)',
              border: '2px solid #7c3aed55',
              boxShadow: '0 0 80px #7c3aed18, 0 40px 100px rgba(0,0,0,0.95)',
            }}
            initial={{ scale: 0.88, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.88, y: 30, opacity: 0 }}
            transition={{ duration: 0.32, ease: 'easeOut' }}
          >
            {/* ── Header ── */}
            <div
              className="sticky top-0 z-20 flex items-center justify-between px-5 py-3 border-b"
              style={{ background: 'linear-gradient(90deg,#1e0b40ee,#3b0764ee)', borderColor: '#7c3aed44' }}
            >
              <div className="flex items-center gap-2">
                <Backpack style={{ width: 18, height: 18, color: '#c084fc' }} />
                <span style={{ color: '#e9d5ff', fontWeight: 800, fontSize: '1rem', letterSpacing: '0.08em' }}>
                  Tas &amp; Equipment
                </span>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors rounded-lg p-1 hover:bg-white/10">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ── Feedback toast ── */}
            <AnimatePresence>
              {feedback && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  style={{
                    position: 'sticky', top: 48, zIndex: 30, margin: '8px 16px 0',
                    padding: '8px 16px', borderRadius: 10,
                    background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.4)',
                    color: '#4ade80', fontSize: '0.78rem', fontFamily: 'serif', fontWeight: 700,
                    textAlign: 'center',
                  }}
                >
                  ✦ {feedback}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="px-5 pb-6 pt-4 flex flex-col gap-5">

              {/* ══ Equipment Section ══ */}
              <PanelBox title="Equipment">
                <p style={{ fontSize: '0.6rem', color: '#4b5563', textAlign: 'center', marginBottom: 8, letterSpacing: '0.08em' }}>
                  Klik item yang sedang dipakai untuk melihat info &amp; melepasnya
                </p>
                <div className="relative mx-auto" style={{ width: 360, height: 420 }}>
                  {/* Anatomy model */}
                  <img
                    src={anatomyImg}
                    alt="anatomy"
                    draggable={false}
                    style={{
                      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                      objectFit: 'contain', objectPosition: 'center',
                      filter: 'invert(1) sepia(1) saturate(2) hue-rotate(225deg) brightness(0.5)',
                      mixBlendMode: 'screen', pointerEvents: 'none', userSelect: 'none', zIndex: 1,
                    }}
                  />
                  {EQ_SLOTS.map(s => (
                    <div
                      key={s.key}
                      style={{ position: 'absolute', top: s.top, left: s.left, width: s.w, height: s.h, zIndex: 10 }}
                    >
                      <EqSlot
                        slotKey={s.key}
                        label={s.label}
                        item={(equipment as any)[s.key] ?? null}
                        onClick={() => handleSlotClick(s.key)}
                      />
                    </div>
                  ))}
                </div>
              </PanelBox>

              {/* ══ Bag Section ══ */}
              <PanelBox title="Tas">
                <p style={{ fontSize: '0.6rem', color: '#4b5563', textAlign: 'center', marginBottom: 8, letterSpacing: '0.08em' }}>
                  Klik item di tas untuk melihat info &amp; memakainya
                </p>
                <BagGrid inventory={inventory} onClickItem={handleBagClick} />
              </PanelBox>

              <GoldBar gold={player.gold ?? 0} bagCount={inventory.length} />
            </div>

            {/* Loading overlay */}
            {loading && (
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 40,
              }}>
                <motion.div
                  style={{ width: 36, height: 36, border: '3px solid #7c3aed44', borderTopColor: '#a855f7', borderRadius: '50%' }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                />
              </div>
            )}
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* ── Item Popups (rendered outside main modal for proper z-index) ── */}
      <AnimatePresence>
        {popup?.type === 'bag_item' && (
          <BagItemPopup
            key="bag_popup"
            item={popup.item}
            onEquip={() => handleEquipRequest(popup.item)}
            onClose={() => setPopup(null)}
          />
        )}
        {popup?.type === 'equip_item' && (
          <EquippedItemPopup
            key="equip_popup"
            item={popup.item}
            bagFull={bagFull}
            onUnequip={() => handleUnequip(popup.slot)}
            onClose={() => setPopup(null)}
          />
        )}
        {popup?.type === 'hand_choice' && (
          <HandChoicePopup
            key="hand_choice"
            item={popup.item}
            rightOccupied={!!(equipment as any).rightHand}
            leftOccupied={!!(equipment as any).leftHand}
            onChoose={slot => handleEquipToSlot(popup.item, slot)}
            onClose={() => setPopup(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}