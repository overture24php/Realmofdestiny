/**
 * skillsData.ts — Definisi lengkap semua skill player.
 * Patch v2: Revamped damage values, cooldown, unlock levels, weapon locking,
 * buff/debuff/DOT/HOT effects, multi-hit, magic attacks, mana costs.
 */
import type { WeaponType } from './itemData';

export type SkillCategory = 'universal' | 'sword' | 'dagger' | 'staff' | 'shield' | 'bow';
export type SkillTier     = 'normal' | 'ultimate';

// ── Skill Effect Types ────────────────────────────────────────────────────────

export type SkillEffectType =
  | 'atk_buff'           // player ATK += value for duration turns
  | 'def_buff'           // player PDEF+MDEF += value for duration turns (losesOnHit: true = removed when hit)
  | 'dodge_crit_buff'    // dodge += value%, critRate += value2%, critDmg += value3% for duration turns
  | 'parry'              // on next enemy hit: value% chance full block; else reduce dmg by value2%
  | 'bleed_dot'          // apply bleed: value dmg/turn for duration turns (reduced by bleedResist)
  | 'poison_dot'         // apply poison: value% of playerPhysATK/turn for duration turns (reduced by poisonResist)
  | 'heal_hot'           // heal value HP/turn for duration turns (capped at battleStartHp)
  | 'mana_regen'         // immediately restore value mana
  | 'reflect_pct'        // on next enemy hit: reflect value% incoming dmg back (reducible by enemy DEF)
  | 'reflect_flat'       // on next enemy hit: deal value flat unblockable dmg to enemy
  | 'enemy_pdef_debuff'  // reduce enemy effective PDEF by value for duration turns
  | 'enemy_dmg_reduce'   // reduce all enemy outgoing damage by value% for duration turns
  ;

export interface SkillEffect {
  type      : SkillEffectType;
  value     : number;
  value2?   : number;       // secondary value
  value3?   : number;       // tertiary value
  duration? : number;       // turns (undefined = instant/until-hit)
  losesOnHit?: boolean;     // remove buff the moment player takes damage
}

// ── Skill Definition ──────────────────────────────────────────────────────────

export interface SkillDef {
  id             : string;
  name           : string;
  description    : string;
  category       : SkillCategory;
  tier           : SkillTier;

  // Damage (undefined = skill deals no direct damage)
  atkMultiplier? : number;    // physical ATK multiplier per hit (e.g. 1.1 = 110%)
  magMultiplier? : number;    // magic ATK multiplier per hit
  hitCount?      : number;    // multi-hit: total damage = multiplier * hitCount (default 1)
  ignoreAllDef?  : boolean;   // bypass enemy DEF entirely
  bypassDefFlat? : number;    // reduce effective enemy DEF by this flat amount
  guaranteedCrit?: boolean;   // always critical

  // Effects applied on/after skill use
  effects?       : SkillEffect[];

  // Costs
  staminaCost    : number;
  manaCost?      : number;    // mana cost (staff skills)

  // Restrictions
  cooldown       : number;    // CD in turns (0 = no cooldown)
  unlockLevel?   : number;    // min player level required (undefined = available from Lv 1)

  // Visual
  icon           : string;
  colorFrom      : string;
  colorTo        : string;
}

export interface SkillSlots {
  skill1   : string | null;
  skill2   : string | null;
  skill3   : string | null;
  ultimate : string | null;
}

export const DEFAULT_SKILL_SLOTS: SkillSlots = {
  skill1: 'power_hit', skill2: null, skill3: null, ultimate: null,
};

// ── Skill Definitions ─────────────────────────────────────────────────────────

export const SKILL_DEFS: SkillDef[] = [

  // ╔══════════════════════════════════════════════════════╗
  // ║                  UNIVERSAL · NORMAL                  ║
  // ╚══════════════════════════════════════════════════════╝
  {
    id: 'power_hit', name: 'Power Hit', icon: '💥',
    description: 'Memukulkan senjata dengan keras ke musuh. Memberikan 110% damage fisik. Cost 100 stamina. (CD 1 turn)',
    category: 'universal', tier: 'normal',
    atkMultiplier: 1.1, staminaCost: 100, cooldown: 1,
    colorFrom: '#dc2626', colorTo: '#ea580c',
  },
  {
    id: 'battle_cry', name: 'Battle Cry', icon: '📣',
    description: 'Teriakan perang yang membangkitkan semangat. Meningkatkan ATK sebesar 200 poin selama 3 turn. Cost 100 stamina. (Unlock Lv 5, CD 4 turn)',
    category: 'universal', tier: 'normal',
    staminaCost: 100, cooldown: 4, unlockLevel: 5,
    effects: [{ type: 'atk_buff', value: 200, duration: 3 }],
    colorFrom: '#d97706', colorTo: '#b45309',
  },
  {
    id: 'weapon_parry', name: 'Weapon Parry', icon: '🔰',
    description: 'Bersiap menangkis serangan. 5% kesempatan menangkis total (musuh miss); jika gagal, kurangi damage masuk 5%. Cost 20 stamina. Tanpa cooldown. (Unlock Lv 7)',
    category: 'universal', tier: 'normal',
    staminaCost: 20, cooldown: 0, unlockLevel: 7,
    effects: [{ type: 'parry', value: 5, value2: 5 }],
    colorFrom: '#0e7490', colorTo: '#0c4a6e',
  },

  // ╔══════════════════════════════════════════════════════╗
  // ║                 UNIVERSAL · ULTIMATE                 ║
  // ╚══════════════════════════════════════════════════════╝
  {
    id: 'power_hit_chain', name: 'Power Hit Beruntun', icon: '🔥',
    description: 'Menghantamkan senjata berkali-kali dengan sekuat tenaga. 3× 110% = total 330% damage fisik. Cost 500 stamina. (Unlock Lv 10, CD 10 turn)',
    category: 'universal', tier: 'ultimate',
    atkMultiplier: 1.1, hitCount: 3, staminaCost: 500, cooldown: 10, unlockLevel: 10,
    colorFrom: '#7c3aed', colorTo: '#6d28d9',
  },

  // ╔══════════════════════════════════════════════════════╗
  // ║                   SWORD · NORMAL                     ║
  // ╚══════════════════════════════════════════════════════╝
  {
    id: 'sword_slash', name: 'Tebasan Pedang', icon: '⚔️',
    description: 'Tebasan pedang lurus ke musuh. Memberikan 120% damage fisik. Cost 150 stamina. (CD 1 turn)',
    category: 'sword', tier: 'normal',
    atkMultiplier: 1.2, staminaCost: 150, cooldown: 1,
    colorFrom: '#1d4ed8', colorTo: '#1e40af',
  },
  {
    id: 'cross_slash', name: 'Tebasan Silang', icon: '🗡️',
    description: 'Dua tebasan menyilang yang menembus pertahanan. 130% damage fisik dan mengabaikan 50 PDEF musuh. Cost 180 stamina. (Unlock Lv 5, CD 2 turn)',
    category: 'sword', tier: 'normal',
    atkMultiplier: 1.3, bypassDefFlat: 50, staminaCost: 180, cooldown: 2, unlockLevel: 5,
    colorFrom: '#2563eb', colorTo: '#3b82f6',
  },
  {
    id: 'rotating_slash', name: 'Tebasan Berputar', icon: '🌀',
    description: 'Berputar cepat sambil menebaskan pedang. 180% damage fisik + memantulkan 2% damage musuh kembali ke mereka. Cost 250 stamina. (Unlock Lv 7, CD 3 turn)',
    category: 'sword', tier: 'normal',
    atkMultiplier: 1.8, staminaCost: 250, cooldown: 3, unlockLevel: 7,
    effects: [{ type: 'reflect_pct', value: 2 }],
    colorFrom: '#0284c7', colorTo: '#0369a1',
  },

  // ╔══════════════════════════════════════════════════════╗
  // ║                   SWORD · ULTIMATE                   ║
  // ╚══════════════════════════════════════════════════════╝
  {
    id: 'sword_chain_slash', name: 'Tebasan Pedang Beruntun', icon: '🐉',
    description: 'Serangkaian tebasan pedang dahsyat yang menyebabkan luka menganga. 3× 125% = total 375% damage fisik + efek Berdarah 50 poin/turn selama 2 turn. Cost 700 stamina. (Unlock Lv 10, CD 10 turn)',
    category: 'sword', tier: 'ultimate',
    atkMultiplier: 1.25, hitCount: 3, staminaCost: 700, cooldown: 10, unlockLevel: 10,
    effects: [{ type: 'bleed_dot', value: 50, duration: 2 }],
    colorFrom: '#dc2626', colorTo: '#991b1b',
  },

  // ╔══════════════════════════════════════════════════════╗
  // ║                  DAGGER · NORMAL                     ║
  // ╚══════════════════════════════════════════════════════╝
  {
    id: 'quick_stab', name: 'Tusukan Cepat', icon: '🔪',
    description: 'Tusukan cepat ke titik lemah musuh. 110% damage fisik + efek Berdarah 20 poin/turn selama 2 turn. Cost 100 stamina. (CD 1 turn)',
    category: 'dagger', tier: 'normal',
    atkMultiplier: 1.1, staminaCost: 100, cooldown: 1,
    effects: [{ type: 'bleed_dot', value: 20, duration: 2 }],
    colorFrom: '#16a34a', colorTo: '#15803d',
  },
  {
    id: 'shadow_strike', name: 'Tusukan Bayangan', icon: '👤',
    description: 'Bergerak secepat bayangan menembus celah baju besi. 80% damage fisik dan sepenuhnya mengabaikan pertahanan musuh. Cost 300 stamina. (Unlock Lv 5, CD 5 turn)',
    category: 'dagger', tier: 'normal',
    atkMultiplier: 0.8, ignoreAllDef: true, staminaCost: 300, cooldown: 5, unlockLevel: 5,
    colorFrom: '#166534', colorTo: '#14532d',
  },
  {
    id: 'poison_stab', name: 'Tusukan Racun', icon: '🐍',
    description: 'Tusukan dengan belati beracun. 50% damage fisik (bisa dikurangi DEF) + racun 5% ATK/turn selama 2 turn (tidak bisa dikurangi DEF, hanya poison resist). Cost 500 stamina. (Unlock Lv 7, CD 3 turn)',
    category: 'dagger', tier: 'normal',
    atkMultiplier: 0.5, staminaCost: 500, cooldown: 3, unlockLevel: 7,
    effects: [{ type: 'poison_dot', value: 5, duration: 2 }],
    colorFrom: '#4d7c0f', colorTo: '#3f6212',
  },

  // ╔══════════════════════════════════════════════════════╗
  // ║                 DAGGER · ULTIMATE                    ║
  // ╚══════════════════════════════════════════════════════╝
  {
    id: 'dagger_poison_chain', name: 'Tusukan Belati Racun Beruntun', icon: '🌑',
    description: '3x Tusukan beracun (3 × 50% damage fisik) + racun dahsyat 5% ATK/turn selama 6 turn. Cost 1000 stamina. (Unlock Lv 10, CD 6 turn)',
    category: 'dagger', tier: 'ultimate',
    atkMultiplier: 0.5, hitCount: 3, staminaCost: 1000, cooldown: 6, unlockLevel: 10,
    effects: [{ type: 'poison_dot', value: 5, duration: 6 }],
    colorFrom: '#1e1b4b', colorTo: '#312e81',
  },

  // ╔══════════════════════════════════════════════════════╗
  // ║                   STAFF · NORMAL                     ║
  // ╚══════════════════════════════════════════════════════╝
  {
    id: 'magic_bullet', name: 'Magic Bullet', icon: '🔮',
    description: 'Melepaskan tembakan energi sihir yang terkumpul. Memberikan 200% damage magic. Cost 500 mana. (CD 2 turn)',
    category: 'staff', tier: 'normal',
    magMultiplier: 2.0, staminaCost: 0, manaCost: 500, cooldown: 2,
    colorFrom: '#9333ea', colorTo: '#7e22ce',
  },
  {
    id: 'magic_meditation', name: 'Magic Meditation', icon: '🧘',
    description: 'Bermeditasi sejenak. Meningkatkan PDEF dan MDEF sebesar 100 (hilang saat terkena damage) + meregenerasi 200 mana seketika. Cost 0 mana. (Unlock Lv 5, CD 5 turn)',
    category: 'staff', tier: 'normal',
    staminaCost: 0, manaCost: 0, cooldown: 5, unlockLevel: 5,
    effects: [
      { type: 'def_buff', value: 100, duration: 99, losesOnHit: true },
      { type: 'mana_regen', value: 200 },
    ],
    colorFrom: '#0e7490', colorTo: '#155e75',
  },
  {
    id: 'small_heal', name: 'Small Heal', icon: '💚',
    description: 'Mantra penyembuhan kecil. Meregenerasi 40 HP/turn selama 4 turn (tidak bisa melebihi HP awal masuk battle). Cost 800 mana. (Unlock Lv 7, CD 7 turn)',
    category: 'staff', tier: 'normal',
    staminaCost: 0, manaCost: 800, cooldown: 7, unlockLevel: 7,
    effects: [{ type: 'heal_hot', value: 40, duration: 4 }],
    colorFrom: '#16a34a', colorTo: '#15803d',
  },

  // ╔══════════════════════════════════════════════════════╗
  // ║                  STAFF · ULTIMATE                    ║
  // ╚══════════════════════════════════════════════════════╝
  {
    id: 'magic_arrow_rain', name: 'Magic Arrow Rain', icon: '☄️',
    description: '10 anak panah sihir yang menghujani musuh. 10 × 100% magic damage (setiap serangan bisa dikurangi MDEF). Cost 1500 mana. (Unlock Lv 10, CD 10 turn)',
    category: 'staff', tier: 'ultimate',
    magMultiplier: 1.0, hitCount: 10, staminaCost: 0, manaCost: 1500, cooldown: 10, unlockLevel: 10,
    colorFrom: '#c2410c', colorTo: '#9a3412',
  },

  // ╔══════════════════════════════════════════════════════╗
  // ║                  SHIELD · NORMAL                     ║
  // ╚══════════════════════════════════════════════════════╝
  {
    id: 'shield_bash', name: 'Hantaman Perisai', icon: '🛡️',
    description: 'Menghantam musuh dengan perisai yang kuat. Memberikan 140% damage fisik. Cost 100 stamina.',
    category: 'shield', tier: 'normal',
    atkMultiplier: 1.4, staminaCost: 100, cooldown: 0,
    colorFrom: '#374151', colorTo: '#1f2937',
  },
  {
    id: 'counter_strike', name: 'Serangan Balik', icon: '↩️',
    description: 'Memasang jebakan balik. Pada serangan musuh berikutnya: memantulkan 200 poin damage tidak bisa dikurangi kembali ke musuh. Cost 100 stamina. (Unlock Lv 5)',
    category: 'shield', tier: 'normal',
    staminaCost: 100, cooldown: 0, unlockLevel: 5,
    effects: [{ type: 'reflect_flat', value: 200 }],
    colorFrom: '#475569', colorTo: '#334155',
  },
  {
    id: 'compact_defense', name: 'Compact Defense', icon: '🏰',
    description: 'Mengambil posisi bertahan penuh. Meningkatkan PDEF dan MDEF sebesar 200 selama 4 turn. Cost 200 stamina. (Unlock Lv 7, CD 6 turn)',
    category: 'shield', tier: 'normal',
    staminaCost: 200, cooldown: 6, unlockLevel: 7,
    effects: [{ type: 'def_buff', value: 200, duration: 4, losesOnHit: false }],
    colorFrom: '#4b5563', colorTo: '#374151',
  },

  // ╔══════════════════════════════════════════════════════╗
  // ║                 SHIELD · ULTIMATE                    ║
  // ╚══════════════════════════════════════════════════════╝
  {
    id: 'iron_solid', name: 'Iron Solid', icon: '🏯',
    description: 'Menjadi seperti benteng besi. Mengurangi semua damage dari musuh sebesar 30% selama 10 turn. Cost 500 stamina. (Unlock Lv 10, CD 10 turn)',
    category: 'shield', tier: 'ultimate',
    staminaCost: 500, cooldown: 10, unlockLevel: 10,
    effects: [{ type: 'enemy_dmg_reduce', value: 30, duration: 10 }],
    colorFrom: '#78350f', colorTo: '#451a03',
  },

  // ╔══════════════════════════════════════════════════════╗
  // ║                    BOW · NORMAL                      ║
  // ╚══════════════════════════════════════════════════════╝
  {
    id: 'quick_shot', name: 'Bidikan Cepat', icon: '🏹',
    description: '3 serangan panah beruntun cepat. 3 × 50% = total 150% damage fisik. Cost 100 stamina.',
    category: 'bow', tier: 'normal',
    atkMultiplier: 0.5, hitCount: 3, staminaCost: 100, cooldown: 0,
    colorFrom: '#065f46', colorTo: '#064e3b',
  },
  {
    id: 'power_shot', name: 'Power Shot', icon: '🎯',
    description: 'Bidikan kuat yang merusak pertahanan. 140% damage fisik + mengurangi PDEF musuh 200 selama 2 turn. Cost 200 stamina. (Unlock Lv 5, CD 3 turn)',
    category: 'bow', tier: 'normal',
    atkMultiplier: 1.4, staminaCost: 200, cooldown: 3, unlockLevel: 5,
    effects: [{ type: 'enemy_pdef_debuff', value: 200, duration: 2 }],
    colorFrom: '#047857', colorTo: '#065f46',
  },
  {
    id: 'positioning', name: 'Positioning', icon: '🌟',
    description: 'Berpindah ke posisi optimal. Meningkatkan Dodge +10%, Crit Rate +20%, Crit Damage +100% selama 4 turn. Cost 400 stamina. (Unlock Lv 7, CD 6 turn)',
    category: 'bow', tier: 'normal',
    staminaCost: 400, cooldown: 6, unlockLevel: 7,
    effects: [{ type: 'dodge_crit_buff', value: 10, value2: 20, value3: 100, duration: 4 }],
    colorFrom: '#b45309', colorTo: '#92400e',
  },

  // ╔══════════════════════════════════════════════════════╗
  // ║                   BOW · ULTIMATE                     ║
  // ╚══════════════════════════════════════════════════════╝
  {
    id: 'double_power_shot', name: 'Double Power Shot', icon: '⚡',
    description: '2 bidikan dahsyat yang selalu mengenai titik kritis. 2 × 140% damage fisik, semua serangan pasti critical. Cost 1000 stamina. (Unlock Lv 10, CD 10 turn)',
    category: 'bow', tier: 'ultimate',
    atkMultiplier: 1.4, hitCount: 2, guaranteedCrit: true, staminaCost: 1000, cooldown: 10, unlockLevel: 10,
    colorFrom: '#15803d', colorTo: '#166534',
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getSkillById(id: string): SkillDef | undefined {
  return SKILL_DEFS.find(s => s.id === id);
}

/** Which weapon category is required for a skill (undefined = no weapon req / universal) */
export function getWeaponReqForCategory(cat: SkillCategory): WeaponType | null {
  if (cat === 'universal') return null;
  return cat as WeaponType;
}

/** Is the skill usable with the equipped right-hand weapon? */
export function isSkillUnlocked(skill: SkillDef, rightHandWeaponType: WeaponType | null | undefined): boolean {
  if (skill.category === 'universal') return true;
  return rightHandWeaponType === skill.category;
}

export const SKILL_CATEGORIES: { id: SkillCategory; label: string; icon: string }[] = [
  { id: 'universal', label: 'Universal', icon: '⚜️' },
  { id: 'sword',     label: 'Pedang',    icon: '⚔️' },
  { id: 'dagger',    label: 'Belati',    icon: '🔪' },
  { id: 'staff',     label: 'Tongkat',   icon: '🔮' },
  { id: 'shield',    label: 'Prisai',    icon: '🛡️' },
  { id: 'bow',       label: 'Busur',     icon: '🏹' },
];