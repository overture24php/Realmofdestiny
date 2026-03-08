/**
 * statsCalc.ts
 * All derived-stat calculations from base stats + core stats.
 * Always use these helpers for display and battle — never hardcode formulas.
 */

import type { PlayerData, CoreStats, PlayerStats } from '../contexts/GameContext';

// ── Defaults for missing fields (migration safety) ────────────────────────────
export const DEFAULT_CORE: CoreStats = { str: 1, int: 1, dex: 1, vit: 1, agi: 1 };

export const DEFAULT_ELEMENTAL = { fire: 0, water: 0, wind: 0, earth: 0, lightning: 0, forest: 0, light: 0, dark: 0 };
export const DEFAULT_RESIST    = { poison: 0, burn: 0, bleed: 0 };

// ── Derived Stats Result ──────────────────────────────────────────────────────

export interface DerivedStats {
  // Resources
  stamina        : number;
  mana           : number;
  maxHp          : number;

  // Offensive
  totalPhysAtk   : number;
  totalMagAtk    : number;
  accuracy       : number;
  critRate       : number;
  critDamage     : number;

  // Defensive
  totalPhysDef   : number;
  totalMagDef    : number;
  dodge          : number;
  critDmgReduce  : number;

  // Status Resist
  statusResist   : number;
  poisonResist   : number;
  burnResist     : number;
  bleedResist    : number;

  // Utility
  meditationGain : number;
  elemDefBonus   : number;

  // Elemental ATK totals
  elemAtk: {
    fire       : number;
    water      : number;
    wind       : number;
    earth      : number;
    lightning  : number;
    forest     : number;
    light      : number;
    dark       : number;
  };

  // Elemental DEF totals (base + elemDefBonus)
  elemDef: {
    fire       : number;
    water      : number;
    wind       : number;
    earth      : number;
    lightning  : number;
    forest     : number;
    light      : number;
    dark       : number;
  };
}

export function calcDerived(player: PlayerData): DerivedStats {
  const core    = player.coreStats ?? DEFAULT_CORE;
  const eqCore  = player.equipmentCoreBonus ?? { str:0, int:0, dex:0, vit:0, agi:0 };
  const stats   = player.stats;

  // Total core = permanent + equipment bonus
  const str = (core.str ?? 1) + (eqCore.str ?? 0);
  const int = (core.int ?? 1) + (eqCore.int ?? 0);
  const dex = (core.dex ?? 1) + (eqCore.dex ?? 0);
  const vit = (core.vit ?? 1) + (eqCore.vit ?? 0);
  const agi = (core.agi ?? 1) + (eqCore.agi ?? 0);

  const elemAtk  = stats.elementalAtk ?? DEFAULT_ELEMENTAL;
  const elemDef  = stats.elementalDef ?? DEFAULT_ELEMENTAL;
  const resist   = stats.statusResist ?? DEFAULT_RESIST;
  const defBonus = dex * 1;
  const resistBase = vit * 1;

  return {
    stamina       : str * 100,
    mana          : int * 100 + (stats.mp ?? 0),
    maxHp         : stats.hp ?? 100,

    totalPhysAtk  : (stats.physicalAtk ?? 10) + str * 10,
    totalMagAtk   : (stats.magicAtk   ?? 0 ) + int * 10,
    accuracy      : Math.min(200, (stats.accuracy   ?? 100) + dex * 0.1),
    critRate      : Math.min(100, (stats.critRate   ?? 0  ) + dex * 0.1),
    critDamage    : (stats.critDamage ?? 120) + (str + int) * 1,

    totalPhysDef  : (stats.physicalDef ?? 5 ) + vit * 10,
    totalMagDef   : (stats.magicDef   ?? 5 ) + vit * 10,
    dodge         : Math.min(40, (stats.dodge ?? 0) + agi * 0.1),
    critDmgReduce : agi * 1 + (stats.critDmgReduce ?? 0),

    statusResist  : resistBase,
    poisonResist  : (resist.poison ?? 0) + resistBase,
    burnResist    : (resist.burn   ?? 0) + resistBase,
    bleedResist   : (resist.bleed  ?? 0) + resistBase,

    meditationGain: vit,
    elemDefBonus  : defBonus,

    elemAtk: { ...DEFAULT_ELEMENTAL, ...elemAtk },
    elemDef: {
      fire      : ((elemDef as any).fire      ?? 0) + defBonus,
      water     : ((elemDef as any).water     ?? 0) + defBonus,
      wind      : ((elemDef as any).wind      ?? 0) + defBonus,
      earth     : ((elemDef as any).earth     ?? 0) + defBonus,
      lightning : ((elemDef as any).lightning ?? 0) + defBonus,
      forest    : ((elemDef as any).forest    ?? 0) + defBonus,
      light     : ((elemDef as any).light     ?? 0) + defBonus,
      dark      : ((elemDef as any).dark      ?? 0) + defBonus,
    },
  };
}

// ── Element metadata ──────────────────────────────────────────────────────────

export const ELEMENTS = [
  { key: 'fire',      icon: '🔥', label: 'Api',    color: '#ef4444', glow: '#dc2626' },
  { key: 'water',     icon: '💧', label: 'Air',    color: '#3b82f6', glow: '#1d4ed8' },
  { key: 'wind',      icon: '🌪️', label: 'Angin', color: '#a3e635', glow: '#65a30d' },
  { key: 'earth',     icon: '🌍', label: 'Bumi',   color: '#a8a29e', glow: '#78716c' },
  { key: 'lightning', icon: '⚡', label: 'Petir',  color: '#fbbf24', glow: '#d97706' },
  { key: 'forest',    icon: '🌿', label: 'Hutan',  color: '#4ade80', glow: '#16a34a' },
  { key: 'light',     icon: '✨', label: 'Cahaya', color: '#fef9c3', glow: '#fde047' },
  { key: 'dark',      icon: '🌑', label: 'Gelap',  color: '#a855f7', glow: '#7c3aed' },
] as const;

export type ElementKey = typeof ELEMENTS[number]['key'];

export function getElement(key: string) {
  if (!key || key === 'none') return null;
  return ELEMENTS.find(e => e.key === key) ?? null;
}