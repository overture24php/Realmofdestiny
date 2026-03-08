/**
 * itemData.ts
 * Item definitions, types, and helpers for the equipment & inventory system.
 * Images will be loaded via figma:asset once uploaded.
 */

// ── Item Slot Types ────────────────────────────────────────────────────────────

export type ItemSlotType   = 'hand' | 'helm' | 'armor' | 'boots' | 'ring' | 'earring' | 'pants';
export type EquipSlotKey   = 'rightHand' | 'leftHand' | 'helm' | 'armor' | 'boots' | 'ringRight' | 'ringLeft' | 'earringRight' | 'earringLeft' | 'pants';
export type ItemRarity     = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type WeaponType     = 'sword' | 'dagger' | 'staff' | 'shield' | 'bow' | 'none';

// ── Item Stat Bonus ────────────────────────────────────────────────────────────

export interface ItemStatBonus {
  // ── Flat stat bonuses (applied directly to PlayerStats fields) ──
  physicalAtk?   : number;
  magicAtk?      : number;
  physicalDef?   : number;
  magicDef?      : number;
  dodge?         : number;        // percentage points, e.g. 2 = +2%
  accuracy?      : number;        // percentage points
  critRate?      : number;        // percentage points
  critDamage?    : number;        // percentage points
  critDmgReduce? : number;        // percentage points
  mp?            : number;
  // ── Core stat bonuses (applied to equipmentCoreBonus) ──
  str?           : number;
  int?           : number;
  dex?           : number;
  vit?           : number;
  agi?           : number;
}

// ── Item Definition (master data) ─────────────────────────────────────────────

export interface ItemDef {
  id          : string;
  name        : string;
  slot        : ItemSlotType;
  weaponType? : WeaponType;    // only set for 'hand' slot weapons
  rarity      : ItemRarity;
  description : string;
  stats       : ItemStatBonus;
  icon        : string;         // emoji fallback
  iconBg      : string;         // gradient for placeholder card
  iconGlow    : string;         // glow color
  imageKey?   : string;         // figma:asset key once image is uploaded
  buyPrice    : number;
  sellPrice   : number;
  questClaim? : boolean;        // can be claimed for free via tutorial
}

// ── Inventory Item (instance in player bag/equipment) ─────────────────────────

export interface InventoryItem {
  instanceId  : string;
  defId       : string;
  name        : string;
  slot        : ItemSlotType;
  weaponType? : WeaponType;
  rarity      : ItemRarity;
  description : string;
  stats       : ItemStatBonus;
  icon        : string;
  iconBg      : string;
  iconGlow    : string;
  imageKey?   : string;
  buyPrice    : number;
  sellPrice   : number;
}

// ── Item Definitions ───────────────────────────────────────────────────────────

export const ITEM_DEFS: Record<string, ItemDef> = {

  wooden_shield: {
    id          : 'wooden_shield',
    name        : 'Prisai Kayu',
    slot        : 'hand',
    weaponType  : 'shield',
    rarity      : 'common',
    description : 'Perisai sederhana dari kayu keras terpilih. Memberikan perlindungan kokoh di pertempuran awal.',
    icon        : '🛡️',
    iconBg      : 'linear-gradient(135deg, #92400e 0%, #78350f 50%, #451a03 100%)',
    iconGlow    : '#d97706',
    buyPrice    : 1000,
    sellPrice   : 500,
    questClaim  : true,
    stats       : {
      physicalDef   : 20,
      magicDef      : 20,
      critDmgReduce : 2,
      vit           : 1,
    },
  },

  wooden_sword: {
    id          : 'wooden_sword',
    name        : 'Pedang Kayu',
    slot        : 'hand',
    weaponType  : 'sword',
    rarity      : 'common',
    description : 'Pedang latihan dari kayu keras. Senjata andalan petualang pemula yang ingin kekuatan fisik.',
    icon        : '⚔️',
    iconBg      : 'linear-gradient(135deg, #78350f 0%, #92400e 50%, #7c3aed 100%)',
    iconGlow    : '#f59e0b',
    buyPrice    : 1000,
    sellPrice   : 500,
    questClaim  : true,
    stats       : {
      physicalAtk : 10,
      physicalDef : 5,
      magicDef    : 5,
      str         : 1,
    },
  },

  wooden_dagger: {
    id          : 'wooden_dagger',
    name        : 'Belati Kayu',
    slot        : 'hand',
    weaponType  : 'dagger',
    rarity      : 'common',
    description : 'Belati ringan dan gesit dari kayu. Cocok untuk penyerang cepat yang mengandalkan kelincahan.',
    icon        : '🗡️',
    iconBg      : 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #450a0a 100%)',
    iconGlow    : '#ef4444',
    buyPrice    : 1000,
    sellPrice   : 500,
    questClaim  : true,
    stats       : {
      physicalAtk : 5,
      dodge       : 2,
      accuracy    : 2,
    },
  },

  wooden_bow: {
    id          : 'wooden_bow',
    name        : 'Busur Kayu',
    slot        : 'hand',
    weaponType  : 'bow',
    rarity      : 'common',
    description : 'Busur sederhana yang memberikan presisi luar biasa. Andalan para pemanah pemula.',
    icon        : '🏹',
    iconBg      : 'linear-gradient(135deg, #365314 0%, #4d7c0f 50%, #1a2e05 100%)',
    iconGlow    : '#84cc16',
    buyPrice    : 1000,
    sellPrice   : 500,
    questClaim  : true,
    stats       : {
      physicalAtk : 5,
      critRate    : 2,
      critDamage  : 2,
    },
  },

  wooden_staff: {
    id          : 'wooden_staff',
    name        : 'Tongkat Kayu',
    slot        : 'hand',
    weaponType  : 'staff',
    rarity      : 'common',
    description : 'Tongkat sihir dari kayu pilihan. Memperkuat aliran mana dan serangan sihir sang penyihir.',
    icon        : '🪄',
    iconBg      : 'linear-gradient(135deg, #4c1d95 0%, #6d28d9 50%, #2e1065 100%)',
    iconGlow    : '#a855f7',
    buyPrice    : 1000,
    sellPrice   : 500,
    questClaim  : true,
    stats       : {
      magicAtk : 20,
      mp       : 100,
    },
  },

  // ── Leather Armor Series ───────────────────────────────────────────────────

  leather_helm: {
    id          : 'leather_helm',
    name        : 'Helm Kulit',
    slot        : 'helm',
    rarity      : 'common',
    description : 'Helm dari kulit kuda tua yang dipadatkan. Ringan namun cukup melindungi kepala petualang desa.',
    icon        : '⛑️',
    iconBg      : 'linear-gradient(135deg, #5b3a1a 0%, #7c4f28 50%, #3a2010 100%)',
    iconGlow    : '#c97c3a',
    buyPrice    : 1000,
    sellPrice   : 500,
    stats       : {
      physicalDef : 15,
      magicDef    : 8,
      vit         : 1,
    },
  },

  leather_armor: {
    id          : 'leather_armor',
    name        : 'Zirah Kulit',
    slot        : 'armor',
    rarity      : 'common',
    description : 'Zirah kulit tebal dengan lapisan logam tipis di dada. Perlindungan terbaik yang bisa dibuat Thorin.',
    icon        : '🥋',
    iconBg      : 'linear-gradient(135deg, #4a2e14 0%, #6b4520 50%, #2e1a08 100%)',
    iconGlow    : '#b87333',
    buyPrice    : 1000,
    sellPrice   : 500,
    stats       : {
      physicalDef : 28,
      magicDef    : 14,
      vit         : 2,
      str         : 1,
    },
  },

  leather_pants: {
    id          : 'leather_pants',
    name        : 'Celana Kulit',
    slot        : 'pants',
    rarity      : 'common',
    description : 'Celana kulit tebal yang nyaman untuk bergerak lincah. Melindungi kaki bagian atas dari sabetan pedang.',
    icon        : '👖',
    iconBg      : 'linear-gradient(135deg, #3b2010 0%, #5a3520 50%, #261508 100%)',
    iconGlow    : '#a06030',
    buyPrice    : 1000,
    sellPrice   : 500,
    stats       : {
      physicalDef : 18,
      magicDef    : 10,
      agi         : 1,
      dodge       : 1,
    },
  },

  leather_boots: {
    id          : 'leather_boots',
    name        : 'Sepatu Kulit',
    slot        : 'boots',
    rarity      : 'common',
    description : 'Sepatu kulit sol keras yang kokoh. Memberikan pijakan stabil di medan perang yang tidak rata.',
    icon        : '👢',
    iconBg      : 'linear-gradient(135deg, #3d2412 0%, #5c3820 50%, #271508 100%)',
    iconGlow    : '#9a5b28',
    buyPrice    : 1000,
    sellPrice   : 500,
    stats       : {
      physicalDef : 12,
      magicDef    : 6,
      agi         : 1,
      dodge       : 2,
    },
  },

};

// ── Helpers ────────────────────────────────────────────────────────────────────

export function getItemDef(defId: string): ItemDef | null {
  return ITEM_DEFS[defId] ?? null;
}

export function createInventoryItem(defId: string): InventoryItem {
  const def = ITEM_DEFS[defId];
  if (!def) throw new Error(`Unknown item defId: ${defId}`);
  return {
    instanceId  : `${defId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    defId,
    name        : def.name,
    slot        : def.slot,
    weaponType  : def.weaponType,
    rarity      : def.rarity,
    description : def.description,
    stats       : { ...def.stats },
    icon        : def.icon,
    iconBg      : def.iconBg,
    iconGlow    : def.iconGlow,
    imageKey    : def.imageKey,
    buyPrice    : def.buyPrice,
    sellPrice   : def.sellPrice,
  };
}

// ── Display helpers ────────────────────────────────────────────────────────────

export const RARITY_COLOR: Record<ItemRarity, string> = {
  legendary : '#f59e0b',
  epic      : '#c084fc',
  rare      : '#3b82f6',
  uncommon  : '#22c55e',
  common    : '#9ca3af',
};

export const RARITY_LABEL: Record<ItemRarity, string> = {
  legendary : '✦ Legendaris',
  epic      : '✦ Epik',
  rare      : '✦ Langka',
  uncommon  : '✦ Tak Umum',
  common    : 'Umum',
};

/** Format a stat bonus entry for display: e.g. { physicalAtk: 10 } → "+10 P.ATK" */
export const STAT_DISPLAY: { key: keyof ItemStatBonus; label: string; fmt?: (v: number) => string }[] = [
  { key: 'physicalAtk',   label: 'P.ATK',               fmt: v => `+${v}` },
  { key: 'magicAtk',      label: 'M.ATK',               fmt: v => `+${v}` },
  { key: 'physicalDef',   label: 'P.DEF',               fmt: v => `+${v}` },
  { key: 'magicDef',      label: 'M.DEF',               fmt: v => `+${v}` },
  { key: 'mp',            label: 'Mana',                 fmt: v => `+${v}` },
  { key: 'dodge',         label: 'Dodge',                fmt: v => `+${v}%` },
  { key: 'accuracy',      label: 'Accuracy',             fmt: v => `+${v}%` },
  { key: 'critRate',      label: 'Crit Rate',            fmt: v => `+${v}%` },
  { key: 'critDamage',    label: 'Crit DMG',             fmt: v => `+${v}%` },
  { key: 'critDmgReduce', label: 'Crit DMG Reduction',   fmt: v => `+${v}%` },
  { key: 'str',           label: 'STR',                  fmt: v => `+${v}` },
  { key: 'int',           label: 'INT',                  fmt: v => `+${v}` },
  { key: 'dex',           label: 'DEX',                  fmt: v => `+${v}` },
  { key: 'vit',           label: 'VIT',                  fmt: v => `+${v}` },
  { key: 'agi',           label: 'AGI',                  fmt: v => `+${v}` },
];

export function formatStatBonuses(stats: ItemStatBonus): { label: string; value: string }[] {
  return STAT_DISPLAY
    .filter(s => (stats as any)[s.key] !== undefined && (stats as any)[s.key] !== 0)
    .map(s => ({
      label : s.label,
      value : s.fmt ? s.fmt((stats as any)[s.key]) : `+${(stats as any)[s.key]}`,
    }));
}

// ── Slot key → slot type mapping ──────────────────────────────────────────────

export const SLOT_KEY_TO_TYPE: Record<EquipSlotKey, ItemSlotType> = {
  rightHand    : 'hand',
  leftHand     : 'hand',
  helm         : 'helm',
  armor        : 'armor',
  boots        : 'boots',
  ringRight    : 'ring',
  ringLeft     : 'ring',
  earringRight : 'earring',
  earringLeft  : 'earring',
  pants        : 'pants',
};