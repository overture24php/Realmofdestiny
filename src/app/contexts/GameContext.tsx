/**
 * GameContext — Player data stored SERVER-SIDE in Supabase `players` table.
 * Reads and writes to public.players (RLS enabled — pemain hanya bisa akses data sendiri).
 * Tidak ada lagi data di user_metadata.
 */

if (import.meta.hot) import.meta.hot.decline();

import {
  createContext, useContext, useState, useEffect, useRef, ReactNode,
} from 'react';
import { getSupabaseClient } from '../../utils/supabase-client';
import {
  fetchPlayerRow, insertPlayerRow, updatePlayerRow,
  rowToPlayerData,
} from '../../utils/supabase-db';
import {
  getLevelFromExp, MAX_LEVEL, MAX_TOTAL_EXP,
  MILESTONE_LEVELS,
} from '../data/levelData';
import type { InventoryItem, ItemStatBonus } from '../data/itemData';
import type { SkillSlots } from '../data/skillsData';
import { getSkillById, isSkillUnlocked } from '../data/skillsData';
import { neutralizeDevTools } from '../security/battleSecurity';
export type { SkillSlots };

// Activate DevTools neutralization once at module load (production only)
neutralizeDevTools();

// ── Core Stats ────────────────────────────────────────────────────────────────

export interface CoreStats {
  str : number;
  int : number;
  dex : number;
  vit : number;
  agi : number;
}

// ── Elemental & Status ────────────────────────────────────────────────────────

export interface ElementalValues {
  fire      : number;
  water     : number;
  wind      : number;
  earth     : number;
  lightning : number;
  forest    : number;
  light     : number;
  dark      : number;
}

export interface StatusResist {
  poison : number;
  burn   : number;
  bleed  : number;
}

// ── Player Stats ──────────────────────────────────────────────────────────────

export interface PlayerStats {
  hp            : number;
  mp            : number;
  stamina       : number;        // current stamina — persisted
  physicalAtk   : number;
  magicAtk      : number;
  accuracy      : number;
  critRate      : number;
  critDamage    : number;
  physicalDef   : number;
  magicDef      : number;
  dodge         : number;
  critDmgReduce : number;
  statusResist  : StatusResist;
  elementalAtk  : ElementalValues;
  elementalDef  : ElementalValues;
}

export interface Equipment {
  helm         : InventoryItem | null;
  rightHand    : InventoryItem | null;
  leftHand     : InventoryItem | null;
  armor        : InventoryItem | null;
  boots        : InventoryItem | null;
  pants        : InventoryItem | null;
  ringRight    : InventoryItem | null;
  ringLeft     : InventoryItem | null;
  earringRight : InventoryItem | null;
  earringLeft  : InventoryItem | null;
}

export interface TutorialProgress {
  gotWeapon      : boolean;
  defeatedDummies: number;   // mission 2: kalahkan 3 boneka kayu
  defeatedGuards : number;   // mission 3: kalahkan 5 penjaga pemula
  meditated      : boolean;  // mission 4: meditasi di kuil
  reachedLevel5  : boolean;  // mission 5: capai level 5
  completed      : boolean;
  // Legacy fields — kept for migration
  trainedAtArena?: boolean;
  defeatedBoars? : number;
}

export type ElementType = 'none' | 'fire' | 'water' | 'wind' | 'earth' | 'lightning' | 'forest' | 'light' | 'dark';

export interface PlayerData {
  id               : string;
  name             : string;
  email            : string;
  gender?          : 'male' | 'female';
  elementAffinity? : ElementType;
  role             : string;
  karma            : number;
  faction          : string;
  level            : number;
  experience       : number;
  gold             : number;
  coreStats        : CoreStats;
  freePoints       : number;
  equipmentCoreBonus : CoreStats;
  stats            : PlayerStats;
  equipment        : Equipment;
  inventory        : InventoryItem[];
  tutorialProgress : TutorialProgress;
  skillSlots       : SkillSlots;         // which skills are assigned to each slot
  /** Mana saat ini — undefined berarti "mulai dari max" (pemain baru atau belum tersimpan) */
  currentMana?     : number;
  /** Stamina saat ini — undefined berarti "mulai dari max" (pemain baru atau belum tersimpan) */
  currentStamina?  : number;
  location         : string;
  createdAt        : string;
}

// ── Context type ──────────────────────────────────────────────────────────────

interface GameContextType {
  player              : PlayerData | null;
  loading             : boolean;
  error               : string | null;
  fetchPlayer         : () => Promise<void>;
  updatePlayer        : (updates: Partial<PlayerData>) => Promise<void>;
  updateHp            : (hp: number) => Promise<void>;
  getPlayer           : () => PlayerData | null;
  completeTutorialStep: (step: string) => Promise<void>;
  grantExp            : (amount: number) => Promise<{
    levelsGained : number;
    oldLevel     : number;
    newLevel     : number;
    freePoints   : number;
    statGains    : Partial<PlayerStats>;
  }>;
  allocateStat        : (stat: keyof CoreStats) => Promise<void>;
  addItemToInventory  : (defId: string) => Promise<boolean>;
  equipItem           : (item: InventoryItem, targetSlot: string) => Promise<void>;
  unequipItem         : (slot: string) => Promise<void>;
  updateSkillSlots    : (slots: SkillSlots) => Promise<void>;
  updateStamina       : (stamina: number) => Promise<void>;
  updateMana          : (mana: number) => Promise<void>;
}

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_ELEMENTAL: ElementalValues = { fire:0, water:0, wind:0, earth:0, lightning:0, forest:0, light:0, dark:0 };
const DEFAULT_RESIST:    StatusResist    = { poison:0, burn:0, bleed:0 };
const DEFAULT_CORE:      CoreStats       = { str:1, int:1, dex:1, vit:1, agi:1 };

function createDefaultStats(): PlayerStats {
  return {
    hp:0, mp:0,
    stamina: 100,
    physicalAtk:10, magicAtk:0,
    accuracy:100, critRate:0, critDamage:120,
    physicalDef:5, magicDef:5,
    dodge:0, critDmgReduce:0,
    statusResist: { ...DEFAULT_RESIST },
    elementalAtk: { ...DEFAULT_ELEMENTAL },
    elementalDef: { ...DEFAULT_ELEMENTAL },
  };
}

function createDefaultPlayer(userId: string, email: string, name: string): PlayerData {
  return {
    id              : userId,
    name,
    email,
    role            : 'unknown',
    karma           : 0,
    faction         : 'neutral',
    level           : 1,
    experience      : 0,
    gold            : 100,
    coreStats       : { ...DEFAULT_CORE },
    freePoints      : 2,
    equipmentCoreBonus: { str:0, int:0, dex:0, vit:0, agi:0 },
    stats           : { ...createDefaultStats(), hp: 100 },
    equipment       : { helm:null, rightHand:null, leftHand:null, armor:null, boots:null, pants:null, ringRight:null, ringLeft:null, earringRight:null, earringLeft:null },
    inventory       : [],
    tutorialProgress: { gotWeapon:false, defeatedDummies:0, defeatedGuards:0, meditated:false, reachedLevel5:false, completed:false },
    skillSlots      : { skill1: 'power_hit', skill2: null, skill3: null, ultimate: null },
    location        : 'greenleaf_village',
    createdAt       : new Date().toISOString(),
  };
}

// ── Migration dari user_metadata (untuk pemain lama) ─────────────────────────
function migrateFromMetadata(meta: any, userId: string, email: string): PlayerData {
  const pd = meta?.playerData ?? null;
  if (!pd) return createDefaultPlayer(userId, email, email.split('@')[0]);

  const DEFAULT_EL = { fire:0,water:0,wind:0,earth:0,lightning:0,forest:0,light:0,dark:0 };
  const DEFAULT_RE = { poison:0,burn:0,bleed:0 };

  const s = pd.stats ?? {};
  const stats: PlayerStats = {
    hp: s.hp ?? 100,
    mp: s.mp ?? 0,
    stamina: s.stamina ?? 100,
    physicalAtk: s.physicalAtk ?? 10,
    magicAtk: s.magicAtk ?? 0,
    accuracy: (s.accuracy ?? 0) < 50 ? 100 : (s.accuracy ?? 100),
    critRate: s.critRate ?? 0,
    critDamage: s.critDamage ?? 120,
    physicalDef: s.physicalDef ?? 5,
    magicDef: s.magicDef ?? 5,
    dodge: s.dodge ?? 0,
    critDmgReduce: s.critDmgReduce ?? 0,
    statusResist: s.statusResist ?? { ...DEFAULT_RE },
    elementalAtk: { ...DEFAULT_EL, ...(s.elementalAtk ?? {}) },
    elementalDef: { ...DEFAULT_EL, ...(s.elementalDef ?? {}) },
  };

  return {
    id              : userId,
    name            : pd.name ?? email.split('@')[0],
    email,
    gender          : pd.gender,
    elementAffinity : pd.elementAffinity ?? 'none',
    role            : pd.role ?? 'unknown',
    karma           : pd.karma ?? 0,
    faction         : pd.faction ?? 'neutral',
    level           : pd.level ?? 1,
    experience      : pd.experience ?? 0,
    gold            : pd.gold ?? 100,
    coreStats       : pd.coreStats ?? { str:1,int:1,dex:1,vit:1,agi:1 },
    freePoints      : pd.freePoints ?? 0,
    equipmentCoreBonus: pd.equipmentCoreBonus ?? { str:0,int:0,dex:0,vit:0,agi:0 },
    stats,
    equipment       : pd.equipment ?? { helm:null,rightHand:null,leftHand:null,armor:null,boots:null,pants:null,ringRight:null,ringLeft:null,earringRight:null,earringLeft:null },
    inventory       : pd.inventory ?? [],
    tutorialProgress: {
      gotWeapon      : pd.tutorialProgress?.gotWeapon ?? false,
      defeatedDummies: pd.tutorialProgress?.defeatedDummies ?? ((pd.tutorialProgress?.defeatedBoars ?? 0) >= 4 ? 3 : 0),
      defeatedGuards : pd.tutorialProgress?.defeatedGuards ?? (pd.tutorialProgress?.trainedAtArena ? 5 : 0),
      meditated      : pd.tutorialProgress?.meditated ?? false,
      reachedLevel5  : pd.tutorialProgress?.reachedLevel5 ?? ((pd.level ?? 1) >= 5 && (pd.tutorialProgress?.completed ?? false)),
      completed      : pd.tutorialProgress?.completed ?? false,
    },
    skillSlots      : pd.skillSlots ?? { skill1: 'power_hit', skill2: null, skill3: null, ultimate: null },
    location        : pd.location ?? 'greenleaf_village',
    createdAt       : pd.createdAt ?? new Date().toISOString(),
  };
}

// ── Context ───────────────────────────────────────────────────────────────────

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [player,  setPlayer]  = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const fetchingRef    = useRef(false);
  const playerRef      = useRef<PlayerData | null>(null);
  const grantingExpRef = useRef(false);

  // ── fetchPlayer ─────────────────────────────────────────────────────────────
  const fetchPlayer = async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        setError('Tidak ada sesi aktif. Silakan login kembali.');
        setLoading(false);
        fetchingRef.current = false;
        return;
      }

      // 1. Coba ambil dari tabel players
      let playerData: PlayerData | null = null;
      const row = await fetchPlayerRow(supabase, user.id);

      if (row) {
        // Data ada di database ✅
        playerData = rowToPlayerData(row);
      } else {
        // 2. Cek apakah ada data lama di user_metadata (migration path)
        const legacyMeta = user.user_metadata;
        if (legacyMeta?.playerData) {
          console.info('[GameContext] Migrating player data from user_metadata to database...');
          playerData = migrateFromMetadata(legacyMeta, user.id, user.email ?? '');
        } else {
          // 3. Pemain benar-benar baru
          const name = user.user_metadata?.name ?? user.email?.split('@')[0] ?? 'Player';
          playerData = createDefaultPlayer(user.id, user.email ?? '', name);
        }

        // Simpan ke database
        try {
          await insertPlayerRow(supabase, playerData);
          console.info('[GameContext] Player data saved to database.');
        } catch (saveErr: any) {
          console.warn('[GameContext] Could not save player to database:', saveErr.message);
        }
      }

      if (playerData.id !== user.id) playerData = { ...playerData, id: user.id };

      setPlayer(playerData);
      playerRef.current = playerData;
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data pemain');
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  // ── updatePlayer ────────────────────────────────────────────────────────────
  const updatePlayer = async (updates: Partial<PlayerData>) => {
    const current = playerRef.current;
    if (!current) return;

    const updated = { ...current, ...updates };
    setPlayer(updated);
    playerRef.current = updated;

    try {
      const supabase = getSupabaseClient();
      await updatePlayerRow(supabase, updated);
    } catch (err: any) {
      console.warn('[GameContext] updatePlayer error:', err.message);
    }
  };

  // ── updateHp ────────────────────────────────────────────────────────────────
  const updateHp = async (hp: number) => {
    const current = playerRef.current;
    if (!current) return;
    const level  = current.level ?? 1;
    const vit    = current.coreStats?.vit ?? 1;
    const hardCap = 100 + level * 8 + vit * 15 + 500;
    const safeHp  = Math.max(0, Math.min(hp, hardCap));
    await updatePlayer({ stats: { ...current.stats, hp: safeHp } });
  };

  // ── getPlayer ─────────────────────────────────────────────────────────────────
  const getPlayer = (): PlayerData | null => playerRef.current;

  // ── grantExp ─────────────────────────────────────────────────────────────────
  const grantExp = async (amount: number) => {
    if (grantingExpRef.current) {
      console.warn('[GameContext] grantExp called concurrently — ignored.');
      return { levelsGained:0, oldLevel:1, newLevel:1, freePoints:0, statGains:{} };
    }
    grantingExpRef.current = true;

    const current = playerRef.current;
    if (!current) { grantingExpRef.current = false; return { levelsGained:0, oldLevel:1, newLevel:1, freePoints:0, statGains:{} }; }

    const MAX_SINGLE_GRANT = 50_000;
    const safeAmount = Math.max(0, Math.min(amount, MAX_SINGLE_GRANT));

    try {
      const oldLevel     = current.level ?? 1;
      const oldExp       = current.experience ?? 0;
      const newTotalExp  = Math.min(oldExp + safeAmount, MAX_TOTAL_EXP);
      const newLevel     = Math.min(getLevelFromExp(newTotalExp), MAX_LEVEL);
      const levelsGained = newLevel - oldLevel;

      const isNonElement   = !current.elementAffinity || current.elementAffinity === 'none';
      const pointsPerLevel = isNonElement ? 3 : 2;
      const statGains: Partial<PlayerStats> = {};
      let gainedFreePoints = 0;

      if (levelsGained > 0) {
        let hp=0, pDef=0, mDef=0;
        const safeCore = { str: current.coreStats?.str??1, int: current.coreStats?.int??1, dex: current.coreStats?.dex??1, vit: current.coreStats?.vit??1, agi: current.coreStats?.agi??1 };
        let newCore = { ...safeCore };

        for (let lvl = oldLevel+1; lvl <= newLevel; lvl++) {
          hp += 5;
          if (lvl % 2 === 0) { pDef += 1; mDef += 1; }
          if (MILESTONE_LEVELS.has(lvl)) { hp += 10; pDef += 2; mDef += 2; }
          newCore = { str:newCore.str+1, int:newCore.int+1, dex:newCore.dex+1, vit:newCore.vit+1, agi:newCore.agi+1 };
        }

        statGains.hp = hp; statGains.physicalDef = pDef; statGains.magicDef = mDef;
        const baseStats = playerRef.current?.stats ?? current.stats ?? {} as PlayerStats;
        const newStats: PlayerStats = {
          ...baseStats,
          hp          : ((baseStats.hp          ?? 100) + hp),
          physicalDef : ((baseStats.physicalDef  ?? 5  ) + pDef),
          magicDef    : ((baseStats.magicDef     ?? 5  ) + mDef),
        };

        gainedFreePoints = levelsGained * pointsPerLevel;
        const newFreePoints = ((playerRef.current?.freePoints ?? current.freePoints) ?? 0) + gainedFreePoints;

        await updatePlayer({ experience:newTotalExp, level:newLevel, stats:newStats, coreStats:newCore, freePoints:newFreePoints });
      } else {
        await updatePlayer({ experience: newTotalExp });
      }

      return { levelsGained, oldLevel, newLevel, freePoints: gainedFreePoints, statGains };
    } finally {
      grantingExpRef.current = false;
    }
  };

  // ── allocateStat ──────────────────────────────────────────────────────────────
  const allocateStat = async (stat: keyof CoreStats) => {
    const current = playerRef.current;
    if (!current || (current.freePoints ?? 0) <= 0) return;
    const newCoreStats: CoreStats = { ...current.coreStats, [stat]: (current.coreStats?.[stat] ?? 1) + 1 };
    await updatePlayer({ coreStats: newCoreStats, freePoints: (current.freePoints ?? 0) - 1 });
  };

  // ── completeTutorialStep ──────────────────────────────────────────────
  const completeTutorialStep = async (step: string) => {
    const current = playerRef.current;
    if (!current) return;
    const tp = current.tutorialProgress;
    const prog: TutorialProgress = {
      gotWeapon      : tp?.gotWeapon       ?? false,
      defeatedDummies: tp?.defeatedDummies ?? 0,
      defeatedGuards : tp?.defeatedGuards  ?? 0,
      meditated      : tp?.meditated       ?? false,
      reachedLevel5  : tp?.reachedLevel5   ?? false,
      completed      : tp?.completed       ?? false,
    };
    switch (step) {
      case 'weapon':         prog.gotWeapon       = true; break;
      case 'dummy_kill':     prog.defeatedDummies = Math.min(prog.defeatedDummies + 1, 3); break;
      case 'guard_kill':     prog.defeatedGuards  = Math.min(prog.defeatedGuards  + 1, 5); break;
      case 'meditate':       prog.meditated       = true; break;
      case 'reached_level5': prog.reachedLevel5   = true; break;
      // Legacy (kept for old migration paths)
      case 'arena':          prog.defeatedGuards  = Math.max(prog.defeatedGuards, 5); break;
      case 'boars':          prog.defeatedDummies = Math.max(prog.defeatedDummies, 3); break;
    }
    if (prog.gotWeapon && prog.defeatedDummies >= 3 && prog.defeatedGuards >= 5 && prog.meditated && prog.reachedLevel5) {
      prog.completed = true;
    }
    await updatePlayer({ tutorialProgress: prog });
  };

  // ── Item stat helpers ─────────────────────────────────────────────────────────
  function applyItemStats(stats: PlayerStats, bonus: ItemStatBonus, sign: 1|-1): PlayerStats {
    const s = { ...stats };
    if (bonus.physicalAtk)   s.physicalAtk   = (s.physicalAtk   ?? 10 ) + sign * bonus.physicalAtk;
    if (bonus.magicAtk)      s.magicAtk      = (s.magicAtk      ?? 0  ) + sign * bonus.magicAtk;
    if (bonus.physicalDef)   s.physicalDef   = (s.physicalDef   ?? 5  ) + sign * bonus.physicalDef;
    if (bonus.magicDef)      s.magicDef      = (s.magicDef      ?? 5  ) + sign * bonus.magicDef;
    if (bonus.dodge)         s.dodge         = (s.dodge         ?? 0  ) + sign * bonus.dodge;
    if (bonus.accuracy)      s.accuracy      = (s.accuracy      ?? 100) + sign * bonus.accuracy;
    if (bonus.critRate)      s.critRate      = (s.critRate      ?? 0  ) + sign * bonus.critRate;
    if (bonus.critDamage)    s.critDamage    = (s.critDamage    ?? 120) + sign * bonus.critDamage;
    if (bonus.critDmgReduce) s.critDmgReduce = (s.critDmgReduce ?? 0  ) + sign * bonus.critDmgReduce;
    if (bonus.mp)            s.mp            = (s.mp            ?? 0  ) + sign * bonus.mp;
    return s;
  }

  function applyItemCoreBonus(core: CoreStats, bonus: ItemStatBonus, sign: 1|-1): CoreStats {
    return {
      str: (core.str??0) + sign*(bonus.str??0),
      int: (core.int??0) + sign*(bonus.int??0),
      dex: (core.dex??0) + sign*(bonus.dex??0),
      vit: (core.vit??0) + sign*(bonus.vit??0),
      agi: (core.agi??0) + sign*(bonus.agi??0),
    };
  }

  // ── addItemToInventory ────────────────────────────────────────────────────────
  const addItemToInventory = async (defId: string): Promise<boolean> => {
    const current = playerRef.current;
    if (!current) return false;
    if ((current.inventory ?? []).length >= 20) return false;
    const { createInventoryItem } = await import('../data/itemData');
    const newItem = createInventoryItem(defId);
    await updatePlayer({ inventory: [...(current.inventory ?? []), newItem] });
    return true;
  };

  // ── equipItem ─────────────────────────────────────────────────────────────────
  const equipItem = async (item: InventoryItem, targetSlot: string) => {
    const current = playerRef.current;
    if (!current) return;
    const existingItem: InventoryItem | null = (current.equipment as any)[targetSlot] ?? null;
    let newStats     = { ...current.stats };
    let newEqCore    = { ...(current.equipmentCoreBonus ?? { str:0,int:0,dex:0,vit:0,agi:0 }) };
    let newInventory = [...(current.inventory ?? [])].filter(i => i.instanceId !== item.instanceId);
    if (existingItem) {
      newStats  = applyItemStats(newStats, existingItem.stats, -1);
      newEqCore = applyItemCoreBonus(newEqCore, existingItem.stats, -1);
      newInventory = [...newInventory, existingItem];
    }
    newStats  = applyItemStats(newStats, item.stats, +1);
    newEqCore = applyItemCoreBonus(newEqCore, item.stats, +1);

    // ── Auto-clear weapon-specific skill slots on right-hand change ───────────
    let newSkillSlots = { ...(current.skillSlots ?? { skill1: 'power_hit', skill2: null, skill3: null, ultimate: null }) };
    if (targetSlot === 'rightHand') {
      const newWeaponType = item.weaponType ?? 'none';
      const slots: (keyof SkillSlots)[] = ['skill1', 'skill2', 'skill3', 'ultimate'];
      for (const slotKey of slots) {
        const skillId = newSkillSlots[slotKey];
        if (skillId) {
          const skillDef = getSkillById(skillId);
          if (skillDef && !isSkillUnlocked(skillDef, newWeaponType)) {
            newSkillSlots = { ...newSkillSlots, [slotKey]: null };
          }
        }
      }
    }

    await updatePlayer({ stats:newStats, equipmentCoreBonus:newEqCore, inventory:newInventory, equipment:{ ...current.equipment, [targetSlot]:item }, skillSlots:newSkillSlots });
  };

  // ── unequipItem ───────────────────────────────────────────────────────────────
  const unequipItem = async (slot: string) => {
    const current = playerRef.current;
    if (!current) return;
    const item: InventoryItem | null = (current.equipment as any)[slot] ?? null;
    if (!item) return;
    if ((current.inventory ?? []).length >= 20) return;
    let newStats  = { ...current.stats };
    let newEqCore = { ...(current.equipmentCoreBonus ?? { str:0,int:0,dex:0,vit:0,agi:0 }) };
    newStats  = applyItemStats(newStats, item.stats, -1);
    newEqCore = applyItemCoreBonus(newEqCore, item.stats, -1);
    await updatePlayer({ stats:newStats, equipmentCoreBonus:newEqCore, inventory:[...(current.inventory??[]),item], equipment:{ ...current.equipment, [slot]:null } });
  };

  // ── updateStamina ─────────────────────────────────────────────────────────────
  const updateStamina = async (stamina: number) => {
    const current = playerRef.current;
    if (!current) return;
    const safeStamina = Math.max(0, stamina);
    // BUGFIX: update top-level currentStamina (bukan di dalam stats) agar UI
    // yang membaca player.currentStamina mendapat nilai yang benar.
    // playerDataToRow akan otomatis embed ke stats JSONB untuk persistensi DB.
    await updatePlayer({ currentStamina: safeStamina });
  };

  // ── updateSkillSlots ──────────────────────────────────────────────────────────
  const updateSkillSlots = async (slots: SkillSlots) => {
    await updatePlayer({ skillSlots: slots });
  };

  // ── updateMana ────────────────────────────────────────────────────────────────
  const updateMana = async (mana: number) => {
    const current = playerRef.current;
    if (!current) return;
    const safeMana = Math.max(0, mana);
    await updatePlayer({ currentMana: safeMana });
  };

  // ── Auth state listener ───────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) fetchPlayer();
      else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) fetchPlayer();
      else if (event === 'SIGNED_OUT') { setPlayer(null); setError(null); setLoading(false); }
    });
    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <GameContext.Provider value={{
      player, loading, error,
      fetchPlayer, updatePlayer, updateHp, getPlayer,
      completeTutorialStep, grantExp, allocateStat,
      addItemToInventory, equipItem, unequipItem,
      updateSkillSlots, updateStamina, updateMana,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within a GameProvider');
  return ctx;
}