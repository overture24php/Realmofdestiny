import { useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface AccordionItem {
  id: string;
  label: string;
  sublabel?: string;
  emoji?: string;
  iconNode?: ReactNode;
  image?: string;
  badge?: string;
  badgeColor?: string;
  accentColor: string;
  glowColor: string;
  fromColor?: string;
  content: ReactNode;
  disabled?: boolean;
  /** Jika diisi, item bertindak sebagai tombol langsung (tidak expand) */
  onClick?: () => void;
}

interface MenuAccordionProps {
  items: AccordionItem[];
  title?: string;
  defaultOpen?: string | null;
}

// ─── Single row ───────────────────────────────────────────────────────────────
function AccordionRow({
  item, index, isOpen, onToggle,
}: {
  item: AccordionItem;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const ac = item.accentColor;
  const gl = item.glowColor;
  // Item dengan onClick langsung → tidak expand, berlaku sebagai tombol navigasi
  const isDirect = typeof item.onClick === 'function';
  const handleClick = isDirect ? item.onClick! : (item.disabled ? undefined : onToggle);

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* ── Row bar ── */}
      <motion.div
        onClick={handleClick}
        whileHover={item.disabled ? {} : { backgroundColor: ac + '18' }}
        whileTap={item.disabled ? {} : { scale: 0.995 }}
        className="flex items-center gap-3 px-4 py-3 relative select-none"
        style={{
          cursor: item.disabled ? 'not-allowed' : 'pointer',
          background: isOpen && !isDirect
            ? `linear-gradient(90deg, ${item.fromColor ?? ac + '22'}, rgba(5,5,15,0.8))`
            : 'transparent',
          opacity: item.disabled ? 0.45 : 1,
          transition: 'background 0.3s',
        }}
      >
        {/* Left accent bar */}
        <motion.div
          className="absolute left-0 top-0 bottom-0 w-0.5 rounded-r"
          style={{ background: ac }}
          animate={{ opacity: (isOpen && !isDirect) ? 1 : 0, scaleY: (isOpen && !isDirect) ? 1 : 0 }}
          transition={{ duration: 0.25 }}
        />

        {/* Index */}
        <span style={{
          fontFamily: 'serif', fontWeight: 900, fontSize: '0.6rem',
          color: (isOpen && !isDirect) ? ac : 'rgba(255,255,255,0.18)',
          minWidth: 18, textAlign: 'right', flexShrink: 0,
          transition: 'color 0.25s',
        }}>
          {String(index + 1).padStart(2, '0')}
        </span>

        {/* Bullet dot */}
        <motion.div
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: ac }}
          animate={{
            boxShadow: (isOpen && !isDirect) ? `0 0 8px 3px ${gl}` : '0 0 0 0 transparent',
            scale: (isOpen && !isDirect) ? 1.35 : 1,
          }}
          transition={{ duration: 0.3 }}
        />

        {/* Icon / Emoji */}
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-sm"
          style={{
            background: (isOpen && !isDirect) ? ac + '20' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${(isOpen && !isDirect) ? ac + '50' : 'rgba(255,255,255,0.08)'}`,
            color: ac,
            transition: 'all 0.3s',
          }}
        >
          {item.iconNode ?? item.emoji ?? '▸'}
        </div>

        {/* Labels */}
        <div className="flex-1 min-w-0">
          <span style={{
            fontFamily: 'serif', fontWeight: 800,
            color: (isOpen && !isDirect) ? '#f3f4f6' : '#9ca3af',
            fontSize: '0.88rem', letterSpacing: '0.02em',
            transition: 'color 0.25s',
            display: 'block',
          }}>
            {item.label}
          </span>
          {item.sublabel && (
            <span style={{ fontSize: '0.62rem', color: '#4b5563', display: 'block', marginTop: 1 }}>
              {item.sublabel}
            </span>
          )}
        </div>

        {/* Badge */}
        {item.badge && (
          <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 hidden sm:inline-block" style={{
            background: (item.badgeColor ?? ac) + '18',
            border: `1px solid ${(item.badgeColor ?? ac)}40`,
            color: item.badgeColor ?? ac,
          }}>
            {item.badge}
          </span>
        )}

        {/* Arrow — hanya tampil untuk item yang bisa di-expand (bukan direct-action) */}
        {!isDirect && (
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="flex-shrink-0"
          >
            <ChevronDown style={{ width: 14, height: 14, color: isOpen ? ac : '#4b5563' }} />
          </motion.div>
        )}
        {/* Untuk direct-action: tampilkan arrow kanan sebagai ganti */}
        {isDirect && (
          <motion.div
            className="flex-shrink-0"
            animate={{ x: [0, 3, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ChevronDown style={{ width: 14, height: 14, color: ac, transform: 'rotate(-90deg)' }} />
          </motion.div>
        )}
      </motion.div>

      {/* ── Expanded panel — tidak tampil untuk direct-action item ── */}
      {!isDirect && (
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              key="panel"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.38, ease: [0.25, 0.46, 0.45, 0.94] }}
              style={{ overflow: 'hidden' }}
            >
              <div className="px-4 pb-5 pt-1">
                {/* Illustration */}
                {item.image && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.04 }}
                    className="relative rounded-2xl overflow-hidden mb-4"
                    style={{
                      border: `1.5px solid ${ac}40`,
                      boxShadow: `0 4px 20px ${gl}`,
                    }}
                  >
                    <img
                      src={item.image}
                      alt={item.label}
                      className="w-full object-cover"
                      style={{ height: 160 }}
                    />
                    <div className="absolute inset-0" style={{
                      background: `linear-gradient(to top, rgba(5,5,15,0.88) 0%, rgba(5,5,15,0.4) 45%, transparent 100%)`,
                    }} />
                    {/* Shimmer */}
                    <motion.div
                      className="absolute inset-0 pointer-events-none"
                      style={{ background: `linear-gradient(105deg, transparent 35%, ${ac}12 50%, transparent 65%)` }}
                      animate={{ x: ['-100%', '200%'] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'linear', repeatDelay: 3 }}
                    />
                    <div className="absolute bottom-0 left-0 right-0 px-3 py-2">
                      <p style={{
                        fontFamily: 'serif', fontWeight: 900, fontSize: '0.9rem',
                        backgroundImage: `linear-gradient(90deg, #fff, ${ac})`,
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                        filter: `drop-shadow(0 0 8px ${gl})`,
                      }}>
                        {item.label}
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Content */}
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, delay: 0.08 }}
                >
                  {item.content}
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  );
}

// ─── Main accordion container ─────────────────────────────────────────────────
export function MenuAccordion({ items, title, defaultOpen = null }: MenuAccordionProps) {
  const [openId, setOpenId] = useState<string | null>(defaultOpen);

  const toggle = (id: string) => setOpenId(prev => prev === id ? null : id);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(5,5,20,0.82)',
        border: '1.5px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
      }}
    >
      {/* Header tab */}
      {title && (
        <div
          className="flex items-center gap-3 px-4 py-3 border-b"
          style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.35)' }}
        >
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-white/40"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 2.2, repeat: Infinity }}
          />
          <span style={{
            fontFamily: 'serif', fontWeight: 900, color: 'rgba(255,255,255,0.6)',
            fontSize: '0.72rem', letterSpacing: '0.22em', textTransform: 'uppercase',
          }}>
            {title}
          </span>
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, rgba(255,255,255,0.12), transparent)' }} />
          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.6rem', fontFamily: 'serif' }}>
            {items.length} pilihan
          </span>
        </div>
      )}

      {/* Rows */}
      {items.map((item, i) => (
        <AccordionRow
          key={item.id}
          item={item}
          index={i}
          isOpen={openId === item.id}
          onToggle={() => toggle(item.id)}
        />
      ))}
    </div>
  );
}