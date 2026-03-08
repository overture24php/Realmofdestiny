/**
 * SkillMenuModal — Manage which skills are equipped in each battle slot.
 * Redesigned v2: accurate skill info, weapon locking, level gating, clear UI.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Zap, Star, Lock, Shield, Sword, ChevronDown, ChevronUp } from 'lucide-react';
import { useGame } from '../../contexts/GameContext';
import type { SkillSlots } from '../../contexts/GameContext';
import {
  SKILL_DEFS, SKILL_CATEGORIES, getSkillById, isSkillUnlocked,
  type SkillDef, type SkillCategory, type SkillTier, type SkillEffect,
} from '../../data/skillsData';

interface Props { onClose: () => void; }

const SLOT_LABELS: { key: keyof SkillSlots; label: string; icon: string; tier: SkillTier }[] = [
  { key: 'skill1',   label: 'Skill 1',  icon: '①', tier: 'normal'   },
  { key: 'skill2',   label: 'Skill 2',  icon: '②', tier: 'normal'   },
  { key: 'skill3',   label: 'Skill 3',  icon: '③', tier: 'normal'   },
  { key: 'ultimate', label: 'Ultimate', icon: '⭐', tier: 'ultimate' },
];

const WEAPON_LABELS: Record<string, string> = {
  sword: 'Pedang', dagger: 'Belati', staff: 'Tongkat',
  shield: 'Perisai', bow: 'Busur', none: '(Tidak Ada)',
};

// ── Helpers to build accurate skill info ──────────────────────────────────────

function getDamageText(skill: SkillDef): string | null {
  if ((skill.atkMultiplier ?? 0) > 0) {
    const base = `${Math.round((skill.atkMultiplier ?? 0) * 100)}% ATK Fisik`;
    const hits = (skill.hitCount ?? 1) > 1 ? ` × ${skill.hitCount} serangan` : '';
    return base + hits;
  }
  if ((skill.magMultiplier ?? 0) > 0) {
    const base = `${Math.round((skill.magMultiplier ?? 0) * 100)}% Magic ATK`;
    const hits = (skill.hitCount ?? 1) > 1 ? ` × ${skill.hitCount} serangan` : '';
    return base + hits;
  }
  return null;
}

function getDefModText(skill: SkillDef): string | null {
  if (skill.ignoreAllDef) return '⚠️ Abaikan seluruh DEF musuh';
  if (skill.bypassDefFlat) return `⚠️ Abaikan ${skill.bypassDefFlat} PDEF musuh`;
  if (skill.guaranteedCrit) return '💥 Selalu Critical Hit!';
  return null;
}

function getEffectLines(effects: SkillEffect[], playerPhysAtk = 0): string[] {
  return effects.map(e => {
    switch (e.type) {
      case 'atk_buff':
        return `⚡ Buff ATK +${e.value} selama ${e.duration} turn`;
      case 'def_buff':
        return `🛡️ Buff PDEF & MDEF +${e.value}${e.losesOnHit ? ' (hilang saat kena hit)' : e.duration === 99 ? ' (sampai kena hit)' : ` selama ${e.duration} turn`}`;
      case 'dodge_crit_buff':
        return `🌟 Buff: Dodge +${e.value}%, Crit Rate +${e.value2}%, Crit Dmg +${e.value3}% selama ${e.duration} turn`;
      case 'parry':
        return `🔰 Parry: ${e.value}% tangkis penuh; jika gagal kurangi ${e.value2}% dmg masuk`;
      case 'bleed_dot':
        return `🩸 Efek Perdarahan: ${e.value} dmg/turn × ${e.duration} turn (dikurangi Bleed Resist)`;
      case 'poison_dot':
        return `☠️ Efek Racun: ${e.value}% ATK/turn × ${e.duration} turn (tidak bisa dikurangi DEF)`;
      case 'heal_hot':
        return `💚 Regen HP: +${e.value} HP/turn × ${e.duration} turn (maks = HP saat masuk battle)`;
      case 'mana_regen':
        return `💙 Regen Mana: +${e.value} Mana langsung`;
      case 'reflect_pct':
        return `↩️ Pantul ${e.value}% dmg musuh berikutnya (bisa dikurangi DEF musuh)`;
      case 'reflect_flat':
        return `↩️ Pantul ${e.value} dmg pasti ke musuh (tidak bisa dikurangi)`;
      case 'enemy_pdef_debuff':
        return `⬇️ Kurangi PDEF musuh ${e.value} selama ${e.duration} turn`;
      case 'enemy_dmg_reduce':
        return `🏯 Kurangi seluruh damage musuh ${e.value}% selama ${e.duration} turn`;
      default: return '';
    }
  }).filter(Boolean);
}

function getCostBadges(skill: SkillDef): { label: string; color: string; bg: string; border: string }[] {
  const badges: { label: string; color: string; bg: string; border: string }[] = [];
  if (skill.staminaCost > 0)
    badges.push({ label: `⚡ ${skill.staminaCost} Stamina`, color: '#fbbf24', bg: 'rgba(120,53,15,0.4)', border: 'rgba(251,191,36,0.4)' });
  if ((skill.manaCost ?? 0) > 0)
    badges.push({ label: `💙 ${skill.manaCost} Mana`, color: '#818cf8', bg: 'rgba(49,46,129,0.4)', border: 'rgba(129,140,248,0.5)' });
  if (skill.staminaCost === 0 && (skill.manaCost ?? 0) === 0)
    badges.push({ label: '✨ Gratis', color: '#4ade80', bg: 'rgba(20,83,45,0.3)', border: 'rgba(74,222,128,0.3)' });
  if (skill.cooldown > 0)
    badges.push({ label: `⏳ CD ${skill.cooldown} Turn`, color: '#94a3b8', bg: 'rgba(30,41,59,0.6)', border: 'rgba(148,163,184,0.3)' });
  if ((skill.unlockLevel ?? 1) > 1)
    badges.push({ label: `🔓 Lv.${skill.unlockLevel}`, color: '#c084fc', bg: 'rgba(88,28,135,0.3)', border: 'rgba(192,132,252,0.4)' });
  return badges;
}

// ── Compact skill summary for the equipped slots ───────────────────────────────
function SkillSummaryLine({ skill }: { skill: SkillDef }) {
  const dmg = getDamageText(skill);
  const costStam = skill.staminaCost > 0 ? `⚡${skill.staminaCost}` : null;
  const costMana = (skill.manaCost ?? 0) > 0 ? `💙${skill.manaCost}` : null;
  const costs = [costStam, costMana].filter(Boolean).join(' · ');
  const cdText = skill.cooldown > 0 ? `CD ${skill.cooldown}t` : '';

  return (
    <p style={{ fontSize: '0.6rem', color: '#6b7280', marginTop: 2 }}>
      {dmg ? `${dmg}` : skill.effects?.length ? 'Efek buff/debuff' : 'Skill khusus'}
      {costs ? ` · ${costs}` : ''}
      {cdText ? ` · ${cdText}` : ''}
    </p>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function SkillMenuModal({ onClose }: Props) {
  const { player, updateSkillSlots } = useGame();
  const [activeCategory, setActiveCategory] = useState<SkillCategory>('universal');
  const [activeTier, setActiveTier]         = useState<SkillTier>('normal');
  const [selectedSkill, setSelectedSkill]   = useState<SkillDef | null>(null);
  const [expandedSkill, setExpandedSkill]   = useState<string | null>(null);
  const [saving, setSaving]                 = useState(false);
  const [lockMsg, setLockMsg]               = useState<string | null>(null);

  if (!player) return null;

  const slots: SkillSlots = player.skillSlots ?? { skill1: 'power_hit', skill2: null, skill3: null, ultimate: null };
  const playerLevel        = player.level ?? 1;
  const rightHandWeapon    = player.equipment?.rightHand;
  const weaponType         = rightHandWeapon?.weaponType ?? 'none';
  const weaponLabel        = WEAPON_LABELS[weaponType] ?? weaponType;

  const filteredSkills = SKILL_DEFS.filter(s => s.category === activeCategory && s.tier === activeTier);

  // Lock check
  const getLockReason = (skill: SkillDef): string | null => {
    if (!isSkillUnlocked(skill, weaponType as any)) {
      const req = WEAPON_LABELS[skill.category] ?? skill.category;
      return `Skill ini memerlukan senjata "${req}" di tangan kanan. Senjata kamu saat ini: "${weaponLabel}". Ganti senjata terlebih dahulu!`;
    }
    if ((skill.unlockLevel ?? 1) > playerLevel)
      return `Skill ini terkunci. Butuh Level ${skill.unlockLevel}, kamu saat ini Level ${playerLevel}. Tingkatkan level terlebih dahulu!`;
    return null;
  };

  const assignSkill = async (slotKey: keyof SkillSlots) => {
    if (!selectedSkill) return;
    if (selectedSkill.tier === 'ultimate' && slotKey !== 'ultimate') return;
    if (selectedSkill.tier === 'normal'   && slotKey === 'ultimate') return;
    const reason = getLockReason(selectedSkill);
    if (reason) { setLockMsg(reason); return; }
    setSaving(true);
    await updateSkillSlots({ ...slots, [slotKey]: selectedSkill.id });
    setSaving(false);
    setSelectedSkill(null);
  };

  const clearSlot = async (slotKey: keyof SkillSlots) => {
    setSaving(true);
    await updateSkillSlots({ ...slots, [slotKey]: null });
    setSaving(false);
  };

  const skillInSlot = (key: keyof SkillSlots) => slots[key] ? getSkillById(slots[key]!) : null;
  const isEquipped  = (id: string) => Object.values(slots).includes(id);

  const handleSkillClick = (skill: SkillDef) => {
    const reason = getLockReason(skill);
    if (reason) {
      setLockMsg(reason);
      setSelectedSkill(null);
      return;
    }
    setLockMsg(null);
    setSelectedSkill(prev => prev?.id === skill.id ? null : skill);
  };

  const isCatLocked = (catId: string): boolean => {
    if (catId === 'universal') return false;
    return weaponType !== catId;
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 60 }}
        className="w-full max-w-2xl max-h-[95vh] flex flex-col"
        style={{
          background: 'linear-gradient(160deg, #0d0418 0%, #160730 60%, #06010c 100%)',
          border: '1.5px solid rgba(168,85,247,0.4)',
          borderRadius: '20px 20px 0 0',
          boxShadow: '0 0 100px rgba(168,85,247,0.15), 0 -20px 60px rgba(0,0,0,0.8)',
        }}
      >
        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(90deg, rgba(88,28,135,0.7), rgba(127,29,29,0.5))',
          borderBottom: '1px solid rgba(168,85,247,0.3)',
          padding: '14px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderRadius: '20px 20px 0 0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Zap style={{ width: 20, height: 20, color: '#fbbf24' }} />
            <div>
              <span style={{ fontFamily: 'serif', fontWeight: 900, fontSize: '1.1rem', color: '#fbbf24', letterSpacing: '0.08em' }}>
                MENU SKILL
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <span style={{ fontSize: '0.6rem', color: '#9ca3af' }}>Senjata kanan:</span>
                <span style={{
                  fontSize: '0.62rem', fontWeight: 700,
                  color: weaponType === 'none' ? '#6b7280' : '#e2e8f0',
                  background: weaponType === 'none' ? 'rgba(75,85,99,0.4)' : 'rgba(88,28,135,0.5)',
                  border: `1px solid ${weaponType === 'none' ? 'rgba(75,85,99,0.4)' : 'rgba(168,85,247,0.5)'}`,
                  borderRadius: 6, padding: '1px 7px',
                }}>
                  {rightHandWeapon ? `${rightHandWeapon.icon} ${rightHandWeapon.name}` : '— Tidak Ada —'}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose}
            style={{ background: 'rgba(127,29,29,0.4)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#f87171', display: 'flex', alignItems: 'center' }}>
            <X style={{ width: 15, height: 15 }} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1" style={{ padding: '14px 14px 28px' }}>

          {/* ── Lock Message Banner ──────────────────────────────────────────── */}
          <AnimatePresence>
            {lockMsg && (
              <motion.div
                key="lockbanner"
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                style={{
                  background: 'linear-gradient(90deg, rgba(127,29,29,0.6), rgba(88,28,135,0.4))',
                  border: '1.5px solid rgba(239,68,68,0.5)',
                  borderRadius: 10, padding: '10px 14px', marginBottom: 12,
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                }}
              >
                <Lock style={{ width: 18, height: 18, color: '#f87171', flexShrink: 0, marginTop: 1 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.72rem', fontWeight: 800, color: '#f87171', marginBottom: 3, fontFamily: 'serif' }}>
                    🔒 SKILL TERKUNCI
                  </p>
                  <p style={{ fontSize: '0.66rem', color: '#fca5a5', lineHeight: 1.5 }}>{lockMsg}</p>
                </div>
                <button onClick={() => setLockMsg(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 2, flexShrink: 0 }}>
                  <X style={{ width: 12, height: 12 }} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Active Slots ─────────────────────────────────────────────────── */}
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: '0.62rem', color: '#6b7280', letterSpacing: '0.18em', marginBottom: 8, fontFamily: 'serif', textTransform: 'uppercase' }}>
              ✦ Slot Battle Aktif
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
              {SLOT_LABELS.map(slot => {
                const skill = skillInSlot(slot.key);
                const isUlt = slot.tier === 'ultimate';
                return (
                  <div key={slot.key}
                    style={{
                      background: isUlt
                        ? 'linear-gradient(135deg, rgba(120,53,15,0.35), rgba(88,28,135,0.35))'
                        : 'rgba(88,28,135,0.18)',
                      border: `1.5px solid ${isUlt ? 'rgba(251,191,36,0.45)' : 'rgba(168,85,247,0.28)'}`,
                      borderRadius: 11, padding: '9px 11px',
                      gridColumn: isUlt ? '1 / -1' : undefined,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                          background: skill
                            ? `linear-gradient(135deg, ${skill.colorFrom}, ${skill.colorTo})`
                            : 'rgba(31,41,55,0.8)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '1rem', border: '1px solid rgba(255,255,255,0.1)',
                        }}>
                          {skill ? skill.icon : slot.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '0.58rem', color: isUlt ? '#fbbf24' : '#a78bfa', letterSpacing: '0.08em', fontFamily: 'serif', textTransform: 'uppercase' }}>
                            {slot.label}
                          </p>
                          {skill ? (
                            <>
                              <p style={{ fontSize: '0.8rem', color: '#e2e8f0', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {skill.name}
                              </p>
                              <SkillSummaryLine skill={skill} />
                            </>
                          ) : (
                            <p style={{ fontSize: '0.75rem', color: '#374151', fontStyle: 'italic' }}>— Kosong —</p>
                          )}
                        </div>
                      </div>
                      {skill && (
                        <button onClick={() => clearSlot(slot.key)} disabled={saving}
                          style={{ background: 'rgba(127,29,29,0.4)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontSize: '0.6rem', color: '#f87171', flexShrink: 0, marginLeft: 6 }}>
                          Lepas
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Assign Panel ─────────────────────────────────────────────────── */}
          <AnimatePresence>
            {selectedSkill && !getLockReason(selectedSkill) && (
              <motion.div
                key="assign"
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                style={{
                  background: `linear-gradient(135deg, ${selectedSkill.colorFrom}25, ${selectedSkill.colorTo}15)`,
                  border: `1.5px solid ${selectedSkill.colorFrom}80`,
                  borderRadius: 12, padding: '12px 14px', marginBottom: 14, overflow: 'hidden',
                }}
              >
                <p style={{ fontSize: '0.65rem', color: '#c4b5fd', letterSpacing: '0.1em', marginBottom: 8, fontFamily: 'serif' }}>
                  📌 PASANG "{selectedSkill.name}" KE SLOT:
                </p>
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
                  {SLOT_LABELS.filter(s => s.tier === selectedSkill.tier).map(slot => (
                    <motion.button key={slot.key}
                      whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
                      onClick={() => assignSkill(slot.key)} disabled={saving}
                      style={{
                        background: `linear-gradient(90deg, ${selectedSkill.colorFrom}, ${selectedSkill.colorTo})`,
                        border: 'none', borderRadius: 8, padding: '8px 18px',
                        color: '#fff', cursor: 'pointer', fontWeight: 800, fontSize: '0.82rem', fontFamily: 'serif',
                        boxShadow: `0 4px 18px ${selectedSkill.colorFrom}70`,
                        opacity: saving ? 0.6 : 1,
                      }}>
                      {slot.icon} {slot.label}
                    </motion.button>
                  ))}
                  <button onClick={() => setSelectedSkill(null)}
                    style={{ background: 'rgba(55,65,81,0.5)', border: '1px solid rgba(107,114,128,0.4)', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', color: '#9ca3af', fontSize: '0.76rem' }}>
                    Batal
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Category + Tier Tabs ──────────────────────────────────────────── */}
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: '0.62rem', color: '#6b7280', letterSpacing: '0.18em', marginBottom: 8, fontFamily: 'serif', textTransform: 'uppercase' }}>
              ✦ Kategori Skill
            </p>
            {/* Weapon requirement info */}
            {weaponType === 'none' && (
              <div style={{ background: 'rgba(127,29,29,0.25)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '7px 12px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Lock style={{ width: 13, height: 13, color: '#f87171', flexShrink: 0 }} />
                <p style={{ fontSize: '0.63rem', color: '#fca5a5' }}>
                  Kamu belum memiliki senjata di tangan kanan. Skill Universal saja yang tersedia. Equip senjata untuk membuka skill senjata!
                </p>
              </div>
            )}
            {weaponType !== 'none' && (
              <div style={{ background: 'rgba(20,83,45,0.2)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: 8, padding: '7px 12px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sword style={{ width: 13, height: 13, color: '#4ade80', flexShrink: 0 }} />
                <p style={{ fontSize: '0.63rem', color: '#86efac' }}>
                  Senjata aktif: <strong>{rightHandWeapon?.name}</strong> — Skill <strong>{WEAPON_LABELS[weaponType]}</strong> & Universal terbuka. Skill lain terkunci.
                </p>
              </div>
            )}

            {/* Category tabs */}
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
              {SKILL_CATEGORIES.map(cat => {
                const locked = isCatLocked(cat.id);
                const active = activeCategory === cat.id;
                return (
                  <button key={cat.id} onClick={() => { setActiveCategory(cat.id); setSelectedSkill(null); setLockMsg(null); }}
                    style={{
                      background: active
                        ? 'linear-gradient(90deg, rgba(88,28,135,0.85), rgba(127,29,29,0.65))'
                        : locked ? 'rgba(20,20,30,0.6)' : 'rgba(31,41,55,0.6)',
                      border: `1px solid ${active ? 'rgba(168,85,247,0.7)' : locked ? 'rgba(75,85,99,0.3)' : 'rgba(75,85,99,0.4)'}`,
                      borderRadius: 8, padding: '6px 11px', cursor: 'pointer',
                      color: active ? '#e2e8f0' : locked ? '#374151' : '#6b7280',
                      fontSize: '0.75rem', fontWeight: 700, fontFamily: 'serif',
                      display: 'flex', alignItems: 'center', gap: 4,
                      transition: 'all 0.2s',
                      opacity: locked ? 0.6 : 1,
                    }}>
                    {locked && <Lock style={{ width: 10, height: 10 }} />}
                    {cat.icon} {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Tier tabs */}
            <div style={{ display: 'flex', gap: 6 }}>
              {(['normal', 'ultimate'] as SkillTier[]).map(tier => (
                <button key={tier} onClick={() => { setActiveTier(tier); setSelectedSkill(null); setLockMsg(null); }}
                  style={{
                    background: activeTier === tier
                      ? (tier === 'ultimate'
                        ? 'linear-gradient(90deg, rgba(120,53,15,0.85), rgba(88,28,135,0.65))'
                        : 'rgba(30,58,138,0.65)')
                      : 'rgba(17,24,39,0.7)',
                    border: `1px solid ${activeTier === tier
                      ? (tier === 'ultimate' ? 'rgba(251,191,36,0.55)' : 'rgba(59,130,246,0.55)')
                      : 'rgba(55,65,81,0.5)'}`,
                    borderRadius: 8, padding: '6px 18px', cursor: 'pointer',
                    color: activeTier === tier ? (tier === 'ultimate' ? '#fbbf24' : '#93c5fd') : '#6b7280',
                    fontSize: '0.76rem', fontWeight: 700, fontFamily: 'serif',
                    display: 'flex', alignItems: 'center', gap: 5,
                    transition: 'all 0.2s',
                  }}>
                  {tier === 'normal' ? <Zap style={{ width: 13, height: 13 }} /> : <Star style={{ width: 13, height: 13 }} />}
                  {tier === 'normal' ? 'Skill Biasa' : '⭐ Ultimate'}
                </button>
              ))}
            </div>
          </div>

          {/* ── Skill List ─────────────────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {filteredSkills.length === 0 && (
              <div style={{ textAlign: 'center', padding: '28px 0', color: '#374151' }}>
                <p style={{ fontSize: '1.5rem', marginBottom: 6 }}>📭</p>
                <p style={{ fontSize: '0.8rem' }}>Tidak ada skill untuk kategori ini</p>
              </div>
            )}

            {filteredSkills.map(skill => {
              const equipped    = isEquipped(skill.id);
              const isSelected  = selectedSkill?.id === skill.id;
              const expanded    = expandedSkill === skill.id;
              const lockReason  = getLockReason(skill);
              const isLocked    = !!lockReason;
              const dmgText     = getDamageText(skill);
              const defModText  = getDefModText(skill);
              const effectLines = getEffectLines(skill.effects ?? []);
              const costBadges  = getCostBadges(skill);

              return (
                <motion.div key={skill.id}
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  whileHover={!isLocked ? { scale: 1.005 } : {}}
                  style={{
                    background: isSelected
                      ? `linear-gradient(135deg, ${skill.colorFrom}35, ${skill.colorTo}22)`
                      : isLocked
                        ? 'rgba(15,15,25,0.6)'
                        : equipped
                          ? 'rgba(20,83,45,0.15)'
                          : 'rgba(17,24,39,0.65)',
                    border: `1.5px solid ${
                      isSelected ? `${skill.colorFrom}90` :
                      isLocked   ? 'rgba(55,65,81,0.4)' :
                      equipped   ? 'rgba(74,222,128,0.4)' :
                                   'rgba(55,65,81,0.5)'}`,
                    borderRadius: 13,
                    cursor: isLocked ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    overflow: 'hidden',
                    opacity: isLocked ? 0.75 : 1,
                  }}
                >
                  {/* ── Locked overlay bar ── */}
                  {isLocked && (
                    <div style={{
                      background: 'linear-gradient(90deg, rgba(127,29,29,0.5), rgba(75,0,75,0.4))',
                      borderBottom: '1px solid rgba(239,68,68,0.3)',
                      padding: '5px 12px',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      <Lock style={{ width: 11, height: 11, color: '#f87171', flexShrink: 0 }} />
                      <p style={{ fontSize: '0.62rem', color: '#fca5a5', fontWeight: 700, fontFamily: 'serif' }}>
                        {!isSkillUnlocked(skill, weaponType as any)
                          ? `🗡️ Butuh Senjata ${WEAPON_LABELS[skill.category]} — kamu pakai ${weaponLabel}`
                          : `📈 Butuh Level ${skill.unlockLevel} — kamu Level ${playerLevel}`}
                      </p>
                    </div>
                  )}

                  {/* ── Skill main row ── */}
                  <div
                    onClick={() => isLocked ? (setLockMsg(lockReason!), setSelectedSkill(null)) : handleSkillClick(skill)}
                    style={{ padding: '11px 13px' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
                      {/* Icon */}
                      <div style={{
                        width: 46, height: 46, borderRadius: 11, flexShrink: 0,
                        background: isLocked
                          ? 'rgba(31,41,55,0.6)'
                          : `linear-gradient(135deg, ${skill.colorFrom}, ${skill.colorTo})`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.4rem',
                        boxShadow: isLocked ? 'none' : `0 4px 18px ${skill.colorFrom}55`,
                        filter: isLocked ? 'grayscale(0.8)' : 'none',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}>
                        {skill.icon}
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Name + badges row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginBottom: 4 }}>
                          <span style={{ fontFamily: 'serif', fontWeight: 900, color: isLocked ? '#4b5563' : '#f1f5f9', fontSize: '0.88rem' }}>
                            {skill.name}
                          </span>
                          {equipped && !isLocked && (
                            <span style={{ fontSize: '0.55rem', background: 'rgba(20,83,45,0.55)', border: '1px solid rgba(74,222,128,0.45)', borderRadius: 4, padding: '1px 6px', color: '#4ade80', fontWeight: 700 }}>
                              ✓ Terpasang
                            </span>
                          )}
                          {skill.tier === 'ultimate' && (
                            <span style={{ fontSize: '0.55rem', background: 'rgba(120,53,15,0.55)', border: '1px solid rgba(251,191,36,0.4)', borderRadius: 4, padding: '1px 6px', color: '#fbbf24', fontWeight: 700 }}>
                              ⭐ Ultimate
                            </span>
                          )}
                          {isSelected && (
                            <span style={{ fontSize: '0.55rem', background: 'rgba(88,28,135,0.6)', border: '1px solid rgba(168,85,247,0.5)', borderRadius: 4, padding: '1px 6px', color: '#c4b5fd', fontWeight: 700 }}>
                              ✦ Dipilih
                            </span>
                          )}
                        </div>

                        {/* Damage + effect summary */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
                          {dmgText && (
                            <span style={{ fontSize: '0.64rem', color: skill.magMultiplier ? '#c084fc' : '#fb923c', fontWeight: 800, background: skill.magMultiplier ? 'rgba(88,28,135,0.3)' : 'rgba(120,53,15,0.3)', border: `1px solid ${skill.magMultiplier ? 'rgba(192,132,252,0.35)' : 'rgba(251,146,60,0.35)'}`, borderRadius: 5, padding: '1px 7px' }}>
                              ⚔️ {dmgText}
                            </span>
                          )}
                          {!dmgText && skill.effects && skill.effects.length > 0 && (
                            <span style={{ fontSize: '0.64rem', color: '#4ade80', fontWeight: 700, background: 'rgba(20,83,45,0.3)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 5, padding: '1px 7px' }}>
                              ✨ Skill Efek
                            </span>
                          )}
                          {defModText && (
                            <span style={{ fontSize: '0.64rem', color: '#fbbf24', fontWeight: 700, background: 'rgba(120,53,15,0.3)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 5, padding: '1px 7px' }}>
                              {defModText}
                            </span>
                          )}
                          {/* Cost badges */}
                          {costBadges.map((b, i) => (
                            <span key={i} style={{ fontSize: '0.62rem', color: b.color, fontWeight: 700, background: b.bg, border: `1px solid ${b.border}`, borderRadius: 5, padding: '1px 7px' }}>
                              {b.label}
                            </span>
                          ))}
                        </div>

                        {/* Effect lines — shown when expanded or selected */}
                        <AnimatePresence>
                          {(expanded || isSelected) && effectLines.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                              style={{ overflow: 'hidden', marginBottom: 4 }}
                            >
                              {effectLines.map((line, i) => (
                                <p key={i} style={{ fontSize: '0.64rem', color: '#94a3b8', lineHeight: 1.6, display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                                  <span style={{ opacity: 0.5 }}>›</span> {line}
                                </p>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Expand / Select indicator */}
                      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                        {!isLocked && (
                          <button
                            onClick={e => { e.stopPropagation(); setExpandedSkill(expanded ? null : skill.id); }}
                            style={{ background: 'rgba(31,41,55,0.6)', border: '1px solid rgba(75,85,99,0.4)', borderRadius: 6, padding: '3px 6px', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center' }}>
                            {expanded
                              ? <ChevronUp style={{ width: 12, height: 12 }} />
                              : <ChevronDown style={{ width: 12, height: 12 }} />}
                          </button>
                        )}
                        {isLocked && (
                          <Lock style={{ width: 14, height: 14, color: '#4b5563' }} />
                        )}
                      </div>
                    </div>

                    {/* Full description — shown when expanded */}
                    <AnimatePresence>
                      {(expanded || isSelected) && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                          style={{ overflow: 'hidden', marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}
                        >
                          <p style={{ fontSize: '0.66rem', color: '#9ca3af', lineHeight: 1.6 }}>
                            {skill.description}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* ── Bottom hint ─────────────────────────────────────────────────── */}
          <div style={{ textAlign: 'center', marginTop: 18, padding: '10px 12px', background: 'rgba(0,0,0,0.3)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
            <p style={{ fontSize: '0.62rem', color: '#374151', lineHeight: 1.6 }}>
              💡 Klik skill untuk memilih → lalu pilih slot yang ingin diisi.<br />
              Skill senjata hanya aktif jika senjata yang sesuai dipakai di tangan kanan.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
