import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useGame } from '../../contexts/GameContext';
import anatomyImg from 'figma:asset/4770ca651dd0578f6de1ef6c86f54909197d45cb.png';

interface InventoryModalProps { onClose: () => void; }

// ─── Slot icon per type ────────────────────────────────────────────────────────
const SLOT_ICONS: Record<string, string> = {
  helm: '⛑️', armor: '🛡️', rightHand: '⚔️', leftHand: '🗡️', boots: '👢',
  pants: '👖', earringRight: '💎', earringLeft: '💎', ringRight: '💍', ringLeft: '💍',
  sword: '⚔️', shield: '🛡️', ring: '💍', necklace: '📿',
};

const RARITY_COLOR: Record<string, string> = {
  legendary: '#f59e0b', epic: '#c084fc', rare: '#3b82f6',
  uncommon: '#22c55e', common: '#9ca3af',
};

// ─── Equipment slot layout (matches reference image) ─────────────────────────
// Container: 360 × 420 px  — 10 slots total
//
// Row 1 (head):   ANTING KANAN | HELM (80px) | ANTING KIRI
// Row 2 (chest):  TANGAN KANAN | ARMOR (104px) | TANGAN KIRI
// Row 3 (waist):               | CELANA (104px) |
// Row 4 (feet):   CINCIN KANAN | SEPATU (74px)  | CINCIN KIRI
const EQ_SLOTS = [
  // ── Row 1: head ──
  { key: 'earringRight', label: 'ANTING\nKANAN',  top:  10, left:  58, w:  70, h: 70 },
  { key: 'helm',         label: 'HELM',           top:   4, left: 140, w:  80, h: 80 },
  { key: 'earringLeft',  label: 'ANTING\nKIRI',   top:  10, left: 232, w:  70, h: 70 },
  // ── Row 2: chest / arms ──
  { key: 'rightHand',    label: 'TANGAN\nKANAN',  top:  92, left:   0, w: 120, h: 145 },
  { key: 'armor',        label: 'ARMOR',          top:  92, left: 128, w: 104, h: 118 },
  { key: 'leftHand',     label: 'TANGAN\nKIRI',   top:  92, left: 240, w: 120, h: 145 },
  // ── Row 3: waist ──
  { key: 'pants',        label: 'CELANA',         top: 218, left: 128, w: 104, h: 108 },
  // ── Row 4: feet ──
  { key: 'ringRight',    label: 'CINCIN\nKANAN',  top: 338, left:  50, w:  80, h: 70 },
  { key: 'boots',        label: 'SEPATU',         top: 338, left: 143, w:  74, h: 70 },
  { key: 'ringLeft',     label: 'CINCIN\nKIRI',   top: 338, left: 236, w:  80, h: 70 },
] as const;

// ─── Main Modal ───────────────────────────────────────────────────────────────
export default function InventoryModal({ onClose }: InventoryModalProps) {
  const { player } = useGame();
  if (!player) return null;

  const equipment = player.equipment ?? {};
  const inventory = player.inventory ?? [];

  return (
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
            width: 420,
            maxHeight: '94vh',
            background: 'linear-gradient(170deg,#0d0618 0%,#130828 55%,#080312 100%)',
            border: '2px solid #7c3aed55',
            boxShadow: '0 0 80px #7c3aed18, 0 40px 100px rgba(0,0,0,0.95)',
          }}
          initial={{ scale: 0.88, y: 30, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.88, y: 30, opacity: 0 }}
          transition={{ duration: 0.32, ease: 'easeOut' }}
        >
          {/* ── Global Header ── */}
          <div
            className="sticky top-0 z-20 flex items-center justify-between px-5 py-3 border-b"
            style={{ background: 'linear-gradient(90deg,#1e0b40ee,#3b0764ee)', borderColor: '#7c3aed44' }}
          >
            <div className="flex items-center gap-2">
              <span style={{ fontSize: '1.3rem' }}>🎒</span>
              <span style={{ color: '#e9d5ff', fontWeight: 800, fontSize: '1.05rem', letterSpacing: '0.08em' }}>
                Tas &amp; Equipment
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors rounded-lg p-1 hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-5 pb-6 pt-4 flex flex-col gap-5">

            {/* ══════════════ EQUIPMENT SECTION ══════════════ */}
            <section>
              <PanelBox title="Equipment">
                {/* Anatomy + Slots area — exactly 360×420 */}
                <div className="relative mx-auto" style={{ width: 360, height: 420 }}>

                  {/* ── Anatomy model — fills the full equipment box ── */}
                  <img
                    src={anatomyImg}
                    alt="anatomy model"
                    draggable={false}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      objectPosition: 'center',
                      // Invert black figure → white/purple glowing silhouette on dark bg
                      filter: 'invert(1) sepia(1) saturate(2) hue-rotate(225deg) brightness(0.5)',
                      mixBlendMode: 'screen',
                      pointerEvents: 'none',
                      userSelect: 'none',
                      zIndex: 1,
                    }}
                  />

                  {/* ── Equipment slot boxes (z:10 so they sit above model) ── */}
                  {EQ_SLOTS.map(s => (
                    <div
                      key={s.key}
                      style={{
                        position: 'absolute',
                        top: s.top,
                        left: s.left,
                        width: s.w,
                        height: s.h,
                        zIndex: 10,
                      }}
                    >
                      <EqSlot
                        slotKey={s.key}
                        label={s.label}
                        item={(equipment as any)[s.key] ?? null}
                      />
                    </div>
                  ))}
                </div>
              </PanelBox>
            </section>

            {/* ══════════════ TAS SECTION ══════════════ */}
            <section>
              <PanelBox title="Tas">
                <BagGrid inventory={inventory} />
              </PanelBox>
            </section>

            {/* Gold */}
            <GoldBar gold={player.gold ?? 0} />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Panel Box (Equipment / Tas wrapper) ─────────────────────────────────────
function PanelBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        border: '1.5px solid #7c3aed44',
        background: 'rgba(20,8,45,0.6)',
        boxShadow: '0 2px 24px rgba(124,58,237,0.12)',
      }}
    >
      {/* Panel title bar */}
      <div
        className="flex items-center justify-center py-2 border-b"
        style={{
          background: 'linear-gradient(90deg,transparent,#7c3aed33,transparent)',
          borderColor: '#7c3aed33',
        }}
      >
        <span
          style={{
            color: '#ddd6fe',
            fontWeight: 800,
            fontSize: '0.85rem',
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
          }}
        >
          {title}
        </span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ─── Equipment Slot ───────────────────────────────────────────────────────────
function EqSlot({ slotKey, label, item }: { slotKey: string; label: string; item: any }) {
  const icon = SLOT_ICONS[slotKey] ?? '📦';
  const filled = !!item;
  const lines = label.split('\n');

  return (
    <motion.div
      className="relative w-full h-full rounded-lg cursor-pointer group flex flex-col items-center justify-center gap-1"
      style={{
        background: filled
          ? 'linear-gradient(135deg,rgba(76,29,149,0.55),rgba(30,12,60,0.65))'
          : 'rgba(10,4,24,0.50)',
        border: `1.5px solid ${filled ? '#a78bfaaa' : '#4c1d9555'}`,
        backdropFilter: 'blur(6px)',
        boxShadow: filled ? '0 0 16px #7c3aed55, inset 0 0 10px #7c3aed18' : 'none',
        padding: '6px 4px',
        transition: 'all 0.2s',
        overflow: 'hidden',
      }}
      whileHover={{ scale: 1.05 }}
      transition={{ type: 'spring', stiffness: 280 }}
    >
      {/* Corner decoration dots */}
      {(['tl','tr','bl','br'] as const).map(pos => (
        <div
          key={pos}
          className="absolute rounded-full"
          style={{
            width: 4, height: 4,
            top: pos.startsWith('t') ? 5 : 'auto',
            bottom: pos.startsWith('b') ? 5 : 'auto',
            left: pos.endsWith('l') ? 5 : 'auto',
            right: pos.endsWith('r') ? 5 : 'auto',
            background: filled ? '#c084fc' : '#4c1d9566',
          }}
        />
      ))}

      {/* Animated border shimmer when filled */}
      {filled && (
        <motion.div
          className="absolute inset-0 rounded-lg pointer-events-none"
          style={{ border: '1px solid #c084fc55' }}
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 2.2, repeat: Infinity }}
        />
      )}

      {/* Icon */}
      <span style={{ fontSize: filled ? '1.6rem' : '1.1rem', opacity: filled ? 1 : 0.22, lineHeight: 1 }}>
        {icon}
      </span>

      {/* Label */}
      <div style={{ textAlign: 'center', lineHeight: 1.25 }}>
        {lines.map((l, i) => (
          <div
            key={i}
            style={{
              fontSize: '0.52rem',
              fontWeight: 800,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: filled ? '#ddd6fe' : '#6b7280',
            }}
          >
            {l}
          </div>
        ))}
        {filled && item?.name && (
          <div style={{
            fontSize: '0.48rem', color: '#f0abfc', marginTop: 2,
            maxWidth: '90%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            margin: '2px auto 0',
          }}>
            {item.name}
          </div>
        )}
      </div>

      {/* Hover tooltip */}
      <div
        className="absolute opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"
        style={{
          bottom: 'calc(100% + 5px)',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(6,2,18,0.97)',
          border: '1px solid #7c3aed66',
          borderRadius: 8,
          padding: '6px 10px',
          whiteSpace: 'nowrap',
          fontSize: '0.62rem',
          zIndex: 50,
          boxShadow: '0 4px 20px #7c3aed55',
        }}
      >
        {filled ? (
          <>
            <p style={{ fontWeight: 700, color: '#f0abfc', marginBottom: 2 }}>{item.name}</p>
            {item.description && <p style={{ color: '#a78bfa' }}>{item.description}</p>}
          </>
        ) : (
          <p style={{ color: '#6b7280' }}>{lines.join(' ')} — kosong</p>
        )}
      </div>
    </motion.div>
  );
}

// ─── Bag Grid (5 × 4 = 20 slots) ─────────────────────────────────────────────
function BagGrid({ inventory }: { inventory: any[] }) {
  const TOTAL = 20; // 5 cols × 4 rows

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 8,
      }}
    >
      {Array.from({ length: TOTAL }).map((_, i) => {
        const item = inventory[i] ?? null;
        return item ? (
          <FilledBagSlot key={i} item={item} />
        ) : (
          <EmptyBagSlot key={i} />
        );
      })}
    </div>
  );
}

function EmptyBagSlot() {
  return (
    <div
      style={{
        aspectRatio: '1',
        background: 'rgba(10,4,24,0.5)',
        border: '1.5px solid #3730a355',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Diamond/cross icon like the reference */}
      <svg width="16" height="16" viewBox="0 0 16 16" style={{ opacity: 0.18 }}>
        <path d="M8 1 L11 8 L8 15 L5 8 Z" fill="none" stroke="#a78bfa" strokeWidth="1.2" strokeLinejoin="round"/>
        <line x1="1" y1="8" x2="15" y2="8" stroke="#a78bfa" strokeWidth="1.2"/>
        <circle cx="8" cy="8" r="1.5" fill="#a78bfa"/>
      </svg>
    </div>
  );
}

function FilledBagSlot({ item }: { item: any }) {
  const color = RARITY_COLOR[item.rarity] ?? '#9ca3af';
  const icon = SLOT_ICONS[item.type] ?? '📦';

  return (
    <motion.div
      className="relative group cursor-pointer"
      style={{
        aspectRatio: '1',
        background: `linear-gradient(135deg,rgba(20,8,45,0.85),rgba(8,3,18,0.9))`,
        border: `1.5px solid ${color}66`,
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        padding: 4,
        boxShadow: `0 0 8px ${color}22`,
        overflow: 'visible',
      }}
      whileHover={{ scale: 1.1, y: -2 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      {/* Rarity pip */}
      <div
        className="absolute top-1 right-1 rounded-full"
        style={{ width: 4, height: 4, background: color, boxShadow: `0 0 4px ${color}` }}
      />

      <span style={{ fontSize: '1.15rem', lineHeight: 1 }}>{icon}</span>
      <span style={{
        fontSize: '0.44rem', color, textAlign: 'center', width: '100%',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        letterSpacing: '0.04em', fontWeight: 600,
      }}>
        {item.name}
      </span>

      {/* Tooltip */}
      <div
        className="absolute z-30 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"
        style={{
          bottom: 'calc(100% + 5px)',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(6,2,18,0.97)',
          border: `1px solid ${color}66`,
          borderRadius: 8,
          padding: '6px 10px',
          whiteSpace: 'nowrap',
          fontSize: '0.62rem',
          boxShadow: `0 4px 18px ${color}44`,
          minWidth: 110,
        }}
      >
        <p style={{ color, fontWeight: 700, marginBottom: 2 }}>{item.name}</p>
        {item.rarity && (
          <p style={{ color: '#9ca3af', fontSize: '0.54rem', textTransform: 'capitalize' }}>{item.rarity}</p>
        )}
        {item.description && (
          <p style={{ color: '#d1d5db', marginTop: 3, fontSize: '0.58rem' }}>{item.description}</p>
        )}
      </div>
    </motion.div>
  );
}

// ─── Gold Bar ─────────────────────────────────────────────────────────────────
function GoldBar({ gold }: { gold: number }) {
  return (
    <motion.div
      className="rounded-xl px-4 py-3 flex items-center justify-between"
      style={{
        background: 'linear-gradient(135deg,rgba(69,26,3,0.3),rgba(120,53,15,0.25))',
        border: '1px solid #92400e66',
      }}
      animate={{ boxShadow: ['0 0 0 #d97706', '0 0 14px #d9770640', '0 0 0 #d97706'] }}
      transition={{ duration: 2.8, repeat: Infinity }}
    >
      <div className="flex items-center gap-2.5">
        <motion.span
          style={{ fontSize: '1.4rem' }}
          animate={{ rotate: [0, 12, -12, 0] }}
          transition={{ duration: 5, repeat: Infinity }}
        >🪙</motion.span>
        <div>
          <p style={{ fontSize: '0.57rem', color: '#d97706', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
            Koin Emas
          </p>
          <p style={{ fontSize: '1rem', color: '#fbbf24', fontWeight: 800 }}>
            {gold.toLocaleString('id-ID')}
          </p>
        </div>
      </div>
      <span style={{ fontSize: '0.58rem', color: '#92400e', letterSpacing: '0.04em', textAlign: 'right' }}>
        Mata Uang<br />Kerajaan
      </span>
    </motion.div>
  );
}