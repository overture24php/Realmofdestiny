/**
 * ArenaPage.tsx — Server-Side Battle System (Opsi B)
 *
 * SEMUA logika battle (damage, resource, buff, DOT/HOT) dihitung di server.
 * Client hanya mengirim pilihan aksi; server mengembalikan hasil turn lengkap.
 *
 * Security layers:
 *  L1 — React DevTools neutralization (production only)
 *  L2 — Critical HP/stamina/mana disimpan di useRef (invisible to DevTools)
 *  L3 — FNV-1a rolling integrity checksum — deteksi console tampering
 *  L4 — Enemy definitions di-freeze — immune terhadap runtime property assignment
 *  L5 — Server-authoritative process_turn RPC: semua damage & reward dihitung DB
 *  L6 — Battle token UUID: setiap sesi punya token unik, tidak bisa di-replay
 */

// Lock this module from Vite HMR — prevents injecting modified component state
// via hot reload during an active battle session.
if (import.meta.hot) import.meta.hot.decline();

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router';
import { useGame } from '../contexts/GameContext';
import { ArrowLeft, Shield, Swords, Skull, Sword, Zap, Target } from 'lucide-react';
import LevelUpModal from '../components/game/LevelUpModal';
import { getSkillById, isSkillUnlocked } from '../data/skillsData';
import type { SkillEffectType } from '../data/skillsData';
import { calcDerived } from '../data/statsCalc';
import type { SkillSlots } from '../contexts/GameContext';
import {
  createSealedState, updateSealedState,
  freezeEnemies, SERVER_REWARD_CAPS,
} from '../security/battleSecurity';
import { getSupabaseClient } from '../../utils/supabase-client';
import {
  startBattleSession, claimBattleRewardRpc, processTurnRpc,
  type ProcessTurnResult, type ServerBuff,
} from '../../utils/supabase-db';

import dummyImg  from 'figma:asset/cd9c513007b72d47084accd15367a503756e3ee7.png';
import maleImg   from 'figma:asset/0d288298f55234e645afbd915a4e01469027b0fa.png';
import femaleImg from 'figma:asset/998d51489ca786ac6d73a705dcfca0031ec6408c.png';
import guardImg  from 'figma:asset/b078d521c445963cc1f073892adb83151acddc7a.png';

// ── Enemy Image Map ────────────────────────────────────────────────────────────
const ENEMY_IMAGE_MAP: Record<string, string> = {
  wooden_dummy  : 'https://res.cloudinary.com/dhkethrmc/image/upload/f_auto,q_auto/v1772969717/WhatsApp_Image_2026-03-05_at_11.01.30_ekudga.jpg',
  rookie_guard  : 'https://res.cloudinary.com/dhkethrmc/image/upload/f_auto,q_auto/v1772969716/Gemini_Generated_Image_5840jc5840jc5840_hzd2du.png',
  veteran_guard : 'https://res.cloudinary.com/dhkethrmc/image/upload/f_auto,q_auto/v1772969675/senior_tguhwh.png',
  shadow_lurker : 'https://res.cloudinary.com/dhkethrmc/image/upload/f_auto,q_auto/v1772969668/elit_yqosxe.png',
};

// ── Local Enemy Definitions ────────────────────────────────────────────────────

interface EnemySkill {
  id               : string;
  name             : string;
  icon             : string;
  damage_mult      : number;
  is_ultimate      : boolean;
  probability      : number;       // % chance per turn
  hit_count?       : number;       // multi-hit
  buff_description?: string;       // for buff/debuff skills
  def_penetration? : number;       // % of P DEF ignored
}

// ── Enemy Full Stats (per Guidelines — 0 for unspecified) ─────────────────────
interface EnemyFullStats {
  hp                 : number;
  p_atk              : number;
  m_atk              : number;
  p_def              : number;
  m_def              : number;
  accuracy           : number;
  crit_rate          : number;
  crit_damage        : number;
  dodge              : number;
  crit_dmg_reduction : number;
  poison_resist      : number;
  burn_resist        : number;
  bleed_resist       : number;
  element_affinity   : string;
  element_atk        : Record<string, number>;
  element_def        : Record<string, number>;
}

const _ZE = { air:0, api:0, angin:0, bumi:0, hutan:0, petir:0, non_element:0, dark:0, cahaya:0 };

export interface LocalEnemy {
  id              : string;
  name            : string;
  battle_name     : string;
  level           : number;
  hp              : number;
  atk             : number;
  pdef            : number;
  mdef            : number;
  reward_exp      : number;
  reward_gold     : number;
  is_living       : boolean;
  difficulty      : string;
  difficulty_color: string;
  description     : string;
  sort_order      : number;
  skills          : EnemySkill[];
  fullStats?      : EnemyFullStats;
}

const LOCAL_ENEMIES: LocalEnemy[] = [
  {
    id: 'wooden_dummy', name: 'Boneka Kayu', battle_name: 'Boneka Kayu',
    level: 1, hp: 80, atk: 0, pdef: 0, mdef: 0,
    reward_exp: 15, reward_gold: 5, is_living: false,
    difficulty: 'Sangat Mudah', difficulty_color: '#4ade80',
    description: 'Boneka latihan standar. Tidak menyerang balik. Cocok untuk pemula yang baru memulai.',
    sort_order: 1, skills: [],
  },
  {
    id: 'rookie_guard', name: 'Penjaga Desa Pemula', battle_name: 'Penjaga Desa Pemula',
    level: 3, hp: 100, atk: 10, pdef: 30, mdef: 30,
    reward_exp: 40, reward_gold: 15, is_living: true,
    difficulty: 'Mudah', difficulty_color: '#60a5fa',
    description: 'Penjaga desa yang masih hijau. Serangan ringan namun mampu bertahan dengan perisai pemula.',
    sort_order: 2,
    skills: [
      { id:'normal_attack',        name:'Serangan Normal',       icon:'⚔️',  damage_mult:1.0,  is_ultimate:false, probability:40 },
      { id:'tusukan_pemula',        name:'Tusukan Pemula',        icon:'🗡️',  damage_mult:1.1,  is_ultimate:false, probability:25 },
      { id:'angkat_perisai_pemula', name:'Angkat Perisai Pemula', icon:'🛡️',  damage_mult:0,    is_ultimate:false, probability:20, buff_description:'P DEF +20, M DEF +20 selama 2 turn' },
      { id:'ayunan_tombak_asal',    name:'Ayunan Tombak Asal',    icon:'🏹',  damage_mult:1.15, is_ultimate:false, probability:10 },
      { id:'tusukan_bertubi_tubi',  name:'Tusukan Bertubi-tubi',  icon:'💥',  damage_mult:0.3,  is_ultimate:true,  probability:5, hit_count:5, def_penetration:50 },
    ],
    fullStats: {
      hp:100, p_atk:10, m_atk:0, p_def:30, m_def:30,
      accuracy:0, crit_rate:0, crit_damage:0, dodge:0, crit_dmg_reduction:0,
      poison_resist:0, burn_resist:0, bleed_resist:0,
      element_affinity:'NON-ELEMENT', element_atk:{..._ZE}, element_def:{..._ZE},
    },
  },
  {
    id: 'veteran_guard', name: 'Penjaga Desa Veteran', battle_name: 'Penjaga Desa Veteran',
    level: 7, hp: 500, atk: 50, pdef: 90, mdef: 90,
    reward_exp: 120, reward_gold: 40, is_living: true,
    difficulty: 'Sedang', difficulty_color: '#fbbf24',
    description: 'Penjaga berpengalaman dengan tombak tangguh. Pertahanan kokoh dan serangan bertubi-tubi.',
    sort_order: 3,
    skills: [
      { id:'normal_attack',           name:'Serangan Normal',         icon:'⚔️',  damage_mult:1.0,  is_ultimate:false, probability:40 },
      { id:'tusukan_tombak',          name:'Tusukan Tombak',          icon:'🏹',  damage_mult:1.3,  is_ultimate:false, probability:25 },
      { id:'angkat_perisai_tangguh',  name:'Angkat Perisai Tangguh',  icon:'🛡️',  damage_mult:0,    is_ultimate:false, probability:20, buff_description:'P DEF +40, M DEF +40 selama 3 turn' },
      { id:'ayunan_tombak_terukur',   name:'Ayunan Tombak Terukur',   icon:'⚡',  damage_mult:1.4,  is_ultimate:false, probability:10 },
      { id:'tusukan_bertubi_tubi_v',  name:'Tusukan Bertubi-tubi',    icon:'💥',  damage_mult:0.3,  is_ultimate:true,  probability:5, hit_count:5, def_penetration:50 },
    ],
    fullStats: {
      hp:500, p_atk:50, m_atk:0, p_def:90, m_def:90,
      accuracy:0, crit_rate:0, crit_damage:0, dodge:0, crit_dmg_reduction:0,
      poison_resist:0, burn_resist:0, bleed_resist:0,
      element_affinity:'NON-ELEMENT', element_atk:{..._ZE}, element_def:{..._ZE},
    },
  },
  {
    id: 'shadow_lurker', name: 'Penjaga Desa Elit', battle_name: 'Penjaga Desa Elit',
    level: 17, hp: 1000, atk: 250, pdef: 300, mdef: 300,
    reward_exp: 280, reward_gold: 90, is_living: true,
    difficulty: 'Sulit', difficulty_color: '#f87171',
    description: 'Garda terpilih Desa Daun Hijau. Battle cry-nya mengguncang arena — pertahanan baja dan serangan mematikan.',
    sort_order: 4,
    skills: [
      { id:'normal_attack',          name:'Serangan Normal',           icon:'⚔️',  damage_mult:1.0,  is_ultimate:false, probability:40 },
      { id:'tusukan_maut_e',         name:'Tusukan Maut',              icon:'🗡️',  damage_mult:1.5,  is_ultimate:false, probability:25 },
      { id:'battle_cry',             name:'Battle Cry (Desa Daun)',    icon:'📯',  damage_mult:0,    is_ultimate:false, probability:20, buff_description:'ATK +100, P DEF +300, M DEF +300 selama 3 turn' },
      { id:'ayunan_kuat',            name:'Ayunan Kuat',               icon:'💀',  damage_mult:1.75, is_ultimate:false, probability:10, def_penetration:20 },
      { id:'tusukan_kuat_bertubi_v', name:'Tusukan Kuat Bertubi-tubi', icon:'💥',  damage_mult:0.4,  is_ultimate:true,  probability:5,  hit_count:5, def_penetration:50 },
    ],
    fullStats: {
      hp:1000, p_atk:250, m_atk:0, p_def:300, m_def:300,
      accuracy:0, crit_rate:0, crit_damage:0, dodge:0, crit_dmg_reduction:0,
      poison_resist:0, burn_resist:0, bleed_resist:0,
      element_affinity:'NON-ELEMENT', element_atk:{..._ZE}, element_def:{..._ZE},
    },
  },
];

// Deep-freeze enemy definitions so runtime console modification (e.g. enemy.reward_exp = 99999)
// throws in strict mode and silently fails otherwise.
const FROZEN_ENEMIES: readonly LocalEnemy[] = freezeEnemies(LOCAL_ENEMIES as LocalEnemy[]);

// ── Battle State ───────────────────────────────────────────────────────────────

export interface BattleState {
  enemy_hp          : number;
  enemy_max_hp      : number;
  player_hp         : number;
  player_max_hp     : number;
  player_stamina    : number;
  player_max_stamina: number;
  player_mana       : number;
  player_max_mana   : number;
  stam_regen?       : number;
  mana_regen?       : number;
}

// ── ActiveBuff: tracks display-only buff/debuff state ────────────────────────
// NOTE: Server computes all damage. These types are used only for UI rendering.
export interface ActiveBuff {
  uid       : number;
  type      : SkillEffectType;
  value     : number;
  value2?   : number;
  value3?   : number;
  turnsLeft : number;
  losesOnHit: boolean;
}

// ── Types ──────────────────────────────────────────────────────────────────────

type BattlePhase =
  | 'player_turn'
  | 'processing'
  | 'enemy_turn'
  | 'victory'
  | 'defeat';

interface LogEntry {
  id  : number;
  text: string;
  type: 'player' | 'enemy' | 'system' | 'miss' | 'crit' | 'skill' | 'guard' | 'error';
}

interface FloatNum {
  id    : number;
  value : number | string;
  color : string;
  target: 'player' | 'enemy';
}

// ── Visual Constants ───────────────────────────────────────────────────────────

const GENDER_THEME = {
  male   : { colors: ['#2563eb','#3b82f6','#60a5fa'] as string[], glow: '#3b82f6', symbol: '♂' },
  female : { colors: ['#be185d','#ec4899','#f9a8d4'] as string[], glow: '#ec4899', symbol: '♀' },
  default: { colors: ['#6d28d9','#a855f7','#c084fc'] as string[], glow: '#a855f7', symbol: '⚜' },
};
const DUMMY_COLORS : string[] = ['#92400e','#b45309','#d97706'];
const GUARD_COLORS : string[] = ['#374151','#6b7280','#9ca3af'];
const GUARD_GLOW = '#6b7280';



const DIFFICULTY_ICONS: Record<string, React.ElementType> = {
  'Sangat Mudah': Target,
  'Mudah'       : Shield,
  'Sedang'      : Swords,
  'Sulit'       : Skull,
};

// ── HP Bar ────────────────────────────────────────────────────────────────���───

function HpBar({ hp, maxHp, color }: { hp: number; maxHp: number; color: string }) {
  const pct = Math.max(0, (hp / Math.max(1, maxHp)) * 100);
  const barColor =
    pct > 50 ? color :
    pct > 25 ? 'from-yellow-500 to-orange-500' :
    'from-red-600 to-red-400';
  return (
    <div className="w-full h-3 bg-black/60 rounded-full border border-white/10 overflow-hidden">
      <motion.div
        className={`h-full rounded-full bg-gradient-to-r ${barColor}`}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
    </div>
  );
}

// ── Damage Float ──────────────────────────────────────────────────────────────

function DamageFloat({ float: f, onDone }: { float: FloatNum; onDone: () => void }) {
  return (
    <motion.div
      className="absolute pointer-events-none font-black text-2xl z-30 drop-shadow-lg select-none left-1/2 top-0"
      style={{ color: f.color, transform: 'translateX(-50%)' }}
      initial={{ y: 10, opacity: 1, scale: 0.7 }}
      animate={{ y: -70, opacity: 0, scale: 1.3 }}
      transition={{ duration: 1.4, ease: 'easeOut' }}
      onAnimationComplete={onDone}
    >
      {typeof f.value === 'number' ? (f.value === 0 ? 'MISS!' : `-${f.value}`) : f.value}
    </motion.div>
  );
}

// ── Avatar Border ─────────────────────────────────────────────────────────────

function AvatarBorder({ colors, glow, symbol }: { colors: string[]; glow: string; symbol?: string }) {
  const S = 160; const R = 12; const SW = 3;
  const perim = 2 * (S - SW) * 2;
  return (
    <div style={{ position: 'relative', width: S, height: S }}>
      <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <linearGradient id={`bg-${glow.replace('#','')}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor={colors[0]} />
            <stop offset="50%"  stopColor={colors[1]} />
            <stop offset="100%" stopColor={colors[2]} />
          </linearGradient>
          <filter id={`gf-${glow.replace('#','')}`}>
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <rect x={SW/2} y={SW/2} width={S-SW} height={S-SW} rx={R} ry={R}
          fill="none" stroke={colors[0]} strokeWidth={SW} strokeOpacity={0.2} />
        <motion.rect x={SW/2} y={SW/2} width={S-SW} height={S-SW} rx={R} ry={R}
          fill="none" stroke={`url(#bg-${glow.replace('#','')})`} strokeWidth={SW+1}
          filter={`url(#gf-${glow.replace('#','')})`}
          animate={{ strokeOpacity: [0.5, 1, 0.5] }} transition={{ duration: 2.4, repeat: Infinity }} />
        <motion.rect x={SW/2} y={SW/2} width={S-SW} height={S-SW} rx={R} ry={R}
          fill="none" stroke={colors[1]} strokeWidth={1.5}
          strokeDasharray={`${perim*0.15} ${perim*0.85}`} strokeOpacity={0.7}
          animate={{ strokeDashoffset: [0, -perim] }} transition={{ duration: 3.5, repeat: Infinity, ease: 'linear' }} />
        {([
          [SW+3,SW+3],[S-SW-15,SW+3],[SW+3,S-SW-15],[S-SW-15,S-SW-15],
        ] as [number,number][]).map(([cx,cy],i) => (
          <motion.rect key={i} x={cx} y={cy} width={12} height={12} rx={2}
            fill="none" stroke={colors[i%2===0?0:2]} strokeWidth={1.5}
            animate={{ opacity: [0.3,1,0.3] }} transition={{ duration: 1.8, repeat: Infinity, delay: i*0.3 }} />
        ))}
        <motion.line x1={S/2-18} y1={SW/2} x2={S/2+18} y2={SW/2}
          stroke={colors[1]} strokeWidth={3} strokeLinecap="round"
          animate={{ opacity: [0.3,1,0.3] }} transition={{ duration: 2, repeat: Infinity }} />
        <motion.line x1={S/2-18} y1={S-SW/2} x2={S/2+18} y2={S-SW/2}
          stroke={colors[1]} strokeWidth={3} strokeLinecap="round"
          animate={{ opacity: [0.3,1,0.3] }} transition={{ duration: 2, repeat: Infinity, delay: 1 }} />
      </svg>
      {symbol && (
        <motion.div style={{
          position: 'absolute', top: -11, left: -11, width: 24, height: 24, borderRadius: '50%',
          background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`,
          border: `2px solid ${glow}`, boxShadow: `0 0 10px ${glow}99`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.68rem', fontWeight: 900, color: '#fff', zIndex: 10,
        }}
          animate={{ boxShadow: [`0 0 5px ${glow}66`,`0 0 14px ${glow}cc`,`0 0 5px ${glow}66`] }}
          transition={{ duration: 2, repeat: Infinity }}
        >{symbol}</motion.div>
      )}
    </div>
  );
}

// ── Walking Animation Component ───────────────────────────────────────────────
// Toggle antara idle dan walk image untuk animasi berjalan
function WalkingAnimation({ idleSrc, walkSrc, isWalking, flipHorizontal }: {
  idleSrc: string;
  walkSrc: string;
  isWalking: boolean;
  flipHorizontal?: boolean;
}) {
  const [showWalk, setShowWalk] = useState(false);
  
  useEffect(() => {
    if (!isWalking) {
      setShowWalk(false);
      return;
    }
    
    // Toggle antara idle dan walk setiap 150ms untuk animasi berjalan
    const interval = setInterval(() => {
      setShowWalk(prev => !prev);
    }, 150);
    
    return () => clearInterval(interval);
  }, [isWalking]);
  
  return (
    <img 
      src={showWalk ? walkSrc : idleSrc} 
      alt="character"
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        objectPosition: 'center',
        userSelect: 'none',
        pointerEvents: 'none',
        filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))',
        transform: flipHorizontal ? 'scaleX(-1)' : undefined,
      }}
    />
  );
}

// ── Avatar Box ────────────────────────────────────────────────────────────────

function AvatarBox({ src, colors, glow, symbol, isHit, isAttacking, isDefeated, isGuarding, flip, isWalking, idleSrc, walkSrc, walkingBack }: {
  src: string; colors: string[]; glow: string; symbol?: string;
  isHit: boolean; isAttacking?: boolean; isDefeated?: boolean; isGuarding?: boolean; flip?: boolean;
  isWalking?: boolean;
  idleSrc?: string;
  walkSrc?: string;
  walkingBack?: boolean;
}) {
  const S = 200;
  return (
    <motion.div
      style={{ position: 'relative', width: S, height: S, transform: flip ? 'scaleX(-1)' : undefined }}
      animate={
        isHit       ? { x: [-6,8,-8,6,-4,4,0], y: [-2,2,-3,2,0] }
        : isAttacking ? { x: [0, flip ? -18 : 18, 0], scale: [1,1.06,1] }
        : isDefeated  ? { rotate: 90, y: 30, opacity: 0.35 }
        : {}
      }
      transition={{ duration: isHit ? 0.45 : isAttacking ? 0.4 : 0.6 }}
    >
      {isGuarding && (
        <motion.div style={{
          position: 'absolute', inset: -8, borderRadius: 18, border: `2px solid #60a5fa`,
          boxShadow: '0 0 20px #3b82f688', pointerEvents: 'none', zIndex: 20,
        }} animate={{ opacity: [0.6,1,0.6] }} transition={{ duration: 1.2, repeat: Infinity }} />
      )}
      {/* Glow effect di belakang sprite */}
      <motion.div style={{
        position: 'absolute', inset: -12,
        background: `radial-gradient(ellipse at center, ${glow}22 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} animate={{ scale:[1,1.08,1], opacity:[0.5,1,0.5] }} transition={{ duration: 3, repeat: Infinity }} />
      
      {/* Sprite dengan efek hit menggunakan drop-shadow sesuai Guidelines rule #10 */}
      <div style={{ 
        position: 'relative', 
        width: '100%', 
        height: '100%',
        filter: isHit ? 'drop-shadow(0 0 12px rgba(255,0,0,0.9)) drop-shadow(0 0 20px rgba(255,0,0,0.6)) brightness(1.3) saturate(1.5)' : 'none',
      }}>
        {isWalking && idleSrc && walkSrc ? (
          <WalkingAnimation idleSrc={idleSrc} walkSrc={walkSrc} isWalking={true} flipHorizontal={walkingBack} />
        ) : (
          <img src={src} alt="avatar" style={{ 
            width:'100%', 
            height:'100%', 
            objectFit:'contain',
            objectPosition:'center',
            userSelect:'none', 
            pointerEvents:'none',
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))'
          }} />
        )}
      </div>
    </motion.div>
  );
}

// ── Action Buttons ────────────────────────────────────────────────────────────

function ActionBtn({ label, icon, subtitle, active, onClick, gradient, glow }: {
  label: string; icon: React.ReactNode; subtitle?: string;
  active: boolean; onClick: () => void; gradient: string; glow: string;
}) {
  return (
    <motion.button onClick={onClick} disabled={!active}
      whileHover={active ? { scale:1.03 } : {}} whileTap={active ? { scale:0.97 } : {}}
      style={{
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:1,
        padding:'8px 4px', borderRadius:10, border:'none',
        cursor: active ? 'pointer' : 'not-allowed',
        background: active ? gradient : '#374151',
        color:'#fff', fontFamily:'serif', fontWeight:800, fontSize:'0.8rem',
        opacity: active ? 1 : 0.5,
        boxShadow: active ? `0 3px 12px ${glow}` : 'none',
        transition:'all 0.2s',
      }}>
      <div style={{ display:'flex', alignItems:'center', gap:5 }}>
        {icon} {label}
      </div>
      {subtitle && <span style={{ fontSize:'0.5rem', opacity:0.75, fontFamily:'sans-serif', fontWeight:400 }}>{subtitle}</span>}
    </motion.button>
  );
}

function SkillBtn({ slotKey, slotLabel, slotIcon, skillSlots, stamina, mana=0, skillCds={}, weaponType='', playerLevel=1, active, onClick, isUltimate }: {
  slotKey: keyof SkillSlots; slotLabel: string; slotIcon: string;
  skillSlots: SkillSlots; stamina: number; mana?: number;
  skillCds?: Record<string, number>; weaponType?: string; playerLevel?: number;
  active: boolean; onClick: () => void; isUltimate?: boolean;
}) {
  const skillId = skillSlots[slotKey];
  const skill   = skillId ? getSkillById(skillId) : null;
  const cdLeft  = skill ? (skillCds[skill.id] ?? 0) : 0;
  const onCd    = cdLeft > 0;
  const noStam  = skill ? stamina < skill.staminaCost : false;
  const noMana  = skill && (skill.manaCost ?? 0) > 0 ? mana < (skill.manaCost ?? 0) : false;
  const locked  = skill ? !isSkillUnlocked(skill, weaponType as any) : false;
  const levelLocked = skill && (skill.unlockLevel ?? 1) > playerLevel;
  const isEmpty = !skill;
  const disabled = !active || noStam || noMana || isEmpty || onCd || locked || levelLocked;

  return (
    <motion.button onClick={onClick} disabled={disabled}
      whileHover={!disabled ? { scale:1.03 } : {}} whileTap={!disabled ? { scale:0.96 } : {}}
      style={{
        position:'relative', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        padding: isUltimate ? '12px 0' : '9px 4px', borderRadius:11,
        border: isUltimate ? '1.5px solid rgba(251,191,36,0.5)' : '1px solid rgba(168,85,247,0.2)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: isEmpty ? 'rgba(31,41,55,0.5)'
          : noStam || noMana ? '#1f2937'
          : skill ? (isUltimate
            ? `linear-gradient(90deg, ${skill.colorFrom}, ${skill.colorTo}, rgba(120,53,15,0.8))`
            : `linear-gradient(90deg, ${skill.colorFrom}, ${skill.colorTo})`)
          : '#374151',
        color: isEmpty || noStam || noMana ? '#4b5563' : '#fff',
        opacity: disabled ? 0.5 : 1,
        boxShadow: (!disabled && skill) ? `0 4px 18px ${skill.colorFrom}55` : 'none',
        transition:'all 0.2s', width:'100%',
      }}
    >
      {skill ? (
        <>
          <div style={{ display:'flex', alignItems:'center', gap:5, fontFamily:'serif', fontWeight:800, fontSize: isUltimate ? '0.95rem' : '0.82rem' }}>
            <span>{skill.icon}</span>
            <span>{isUltimate ? `⭐ ${skill.name}` : skill.name}</span>
          </div>
          <div style={{ fontSize:'0.5rem', opacity:0.85, fontFamily:'sans-serif', marginTop:1, textAlign:'center', lineHeight:1.4 }}>
            <span>
              {skill.magMultiplier
                ? `${Math.round(skill.magMultiplier * 100)}%MAG${skill.hitCount && skill.hitCount>1 ? `×${skill.hitCount}` : ''}`
                : skill.atkMultiplier
                  ? `${Math.round(skill.atkMultiplier * 100)}%ATK${skill.hitCount && skill.hitCount>1 ? `×${skill.hitCount}` : ''}`
                  : '✨Buff'}
            </span>
            <span style={{ color:'#6b7280', marginLeft:3 }}>
              {skill.staminaCost > 0 && `⚡${skill.staminaCost}`}
              {(skill.manaCost ?? 0) > 0 && ` 💙${skill.manaCost}`}
            </span>
            {noStam && <span style={{ color:'#f87171', display:'block', fontWeight:700 }}>Stamina!</span>}
            {noMana && <span style={{ color:'#818cf8', display:'block', fontWeight:700 }}>Mana!</span>}
          </div>
        </>
      ) : (
        <div style={{ fontFamily:'serif', fontSize:'0.78rem' }}>
          {slotIcon} {slotLabel} <span style={{ fontSize:'0.6rem' }}>(Kosong)</span>
        </div>
      )}
      {onCd && (
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.74)', borderRadius:11, backdropFilter:'blur(2px)' }}>
          <span style={{ fontSize:'1rem' }}>⏳</span>
          <span style={{ fontFamily:'serif', fontWeight:900, color:'#fbbf24', fontSize:'0.75rem', marginTop:1 }}>CD {cdLeft} Turn</span>
        </div>
      )}
      {locked && !isEmpty && !onCd && (
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.8)', borderRadius:11, backdropFilter:'blur(2px)', padding:4 }}>
          <span style={{ fontSize:'0.85rem' }}>🔒</span>
          <span style={{ fontSize:'0.5rem', color:'#f87171', fontWeight:700, textAlign:'center', marginTop:1, lineHeight:1.3 }}>Perlu Senjata</span>
        </div>
      )}
      {levelLocked && !locked && !isEmpty && !onCd && (
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.8)', borderRadius:11, backdropFilter:'blur(2px)', padding:4 }}>
          <span style={{ fontSize:'0.85rem' }}>📈</span>
          <span style={{ fontSize:'0.5rem', color:'#a78bfa', fontWeight:700, textAlign:'center', marginTop:1, lineHeight:1.3 }}>Level {skill?.unlockLevel}</span>
        </div>
      )}
    </motion.button>
  );
}

function StaminaBar({ current, max }: { current: number; max: number }) {
  const pct   = max > 0 ? Math.min(100, (current / max) * 100) : 0;
  const color = pct > 60 ? '#fbbf24' : pct > 30 ? '#f97316' : '#ef4444';
  return (
    <div style={{ marginTop:4 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
        <span style={{ fontSize:'0.6rem', color:'#9ca3af' }}>
          <Zap style={{ width:10, height:10, display:'inline', marginRight:2 }} />Stamina
        </span>
        <span style={{ fontSize:'0.6rem', fontWeight:700, color }}>{current} / {max}</span>
      </div>
      <div style={{ height:5, background:'rgba(31,41,55,0.8)', borderRadius:99, overflow:'hidden', border:'1px solid rgba(55,65,81,0.6)' }}>
        <motion.div
          animate={{ width:`${pct}%` }} transition={{ duration:0.3 }}
          style={{ height:'100%', borderRadius:99, background: `linear-gradient(90deg, ${color}99, ${color})`, boxShadow:`0 0 8px ${color}60` }}
        />
      </div>
    </div>
  );
}

function ManaBar({ current, max }: { current: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (current / max) * 100) : 0;
  return (
    <div style={{ marginTop:3 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
        <span style={{ fontSize:'0.6rem', color:'#9ca3af' }}>💙 Mana</span>
        <span style={{ fontSize:'0.6rem', fontWeight:700, color:'#818cf8' }}>{current} / {max}</span>
      </div>
      <div style={{ height:4, background:'rgba(99,102,241,0.15)', borderRadius:4, overflow:'hidden' }}>
        <motion.div
          style={{ height:'100%', background:'linear-gradient(90deg, #4f46e5, #818cf8)', borderRadius:4 }}
          animate={{ width:`${pct}%` }} transition={{ duration:0.4 }}
        />
      </div>
    </div>
  );
}

// ── Enemy Select Screen ───────────────────────────────────────────────────────

function EnemySelectScreen({ enemies, onSelect, onBack }: {
  enemies: LocalEnemy[];
  onSelect: (e: LocalEnemy) => void | Promise<void>;
  onBack: () => void;
}) {
  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(170deg, #0d0520 0%, #160835 50%, #08020f 100%)', padding:16 }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
        <motion.button
          onClick={onBack}
          whileHover={{ scale:1.05 }} whileTap={{ scale:0.95 }}
          style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(88,28,135,0.3)', border:'1px solid rgba(168,85,247,0.3)', borderRadius:10, padding:'8px 14px', color:'#c4b5fd', cursor:'pointer' }}
        >
          <ArrowLeft size={16} /> Kembali
        </motion.button>
        <div>
          <h2 style={{ fontFamily:'serif', fontWeight:900, color:'#f9fafb', fontSize:'1.4rem', margin:0 }}>⚔️ Pilih Lawanmu</h2>
          <p style={{ fontSize:'0.72rem', color:'#6b7280', margin:0 }}>Latih kemampuan tempurmu di arena kerajaan</p>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:16 }}>
        {enemies.map((enemy, idx) => {
          const Icon = DIFFICULTY_ICONS[enemy.difficulty] ?? Swords;
          const col  = enemy.difficulty_color;
          return (
            <motion.div
              key={enemy.id}
              initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
              transition={{ delay: idx * 0.08 }}
              onClick={() => onSelect(enemy)}
              whileHover={{ scale:1.015, boxShadow:`0 0 30px ${col}22` }}
              whileTap={{ scale:0.985 }}
              style={{
                background:'linear-gradient(135deg, rgba(15,7,30,0.95), rgba(30,10,50,0.9))',
                border:`1.5px solid ${col}44`,
                borderRadius:16, padding:20, cursor:'pointer',
                boxShadow:`0 4px 20px rgba(0,0,0,0.5)`,
              }}
            >
              <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                <div style={{
                  width:56, height:56, borderRadius:14, flexShrink:0,
                  background:`linear-gradient(135deg, ${col}22, ${col}11)`,
                  border:`1.5px solid ${col}55`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  <Icon style={{ width:28, height:28, color:col }} />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                    <span style={{ fontFamily:'serif', fontWeight:900, color:'#f9fafb', fontSize:'1rem' }}>
                      {enemy.battle_name}
                    </span>
                    <span style={{ fontSize:'0.62rem', color:col, background:`${col}22`, border:`1px solid ${col}44`, borderRadius:20, padding:'2px 8px', fontWeight:700 }}>
                      {enemy.difficulty}
                    </span>
                    {enemy.level > 0 && (
                      <span style={{ fontSize:'0.62rem', color:'#6b7280' }}>Lv.{enemy.level}</span>
                    )}
                  </div>
                  <p style={{ fontSize:'0.72rem', color:'#9ca3af', margin:'4px 0', lineHeight:1.4 }}>
                    {enemy.description}
                  </p>
                  {/* Stats row */}
                  <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginTop:6 }}>
                    <span style={{ fontSize:'0.62rem', color:'#fca5a5' }}>❤️ {enemy.hp} HP</span>
                    <span style={{ fontSize:'0.62rem', color:'#fb923c' }}>⚔️ {enemy.atk} P.ATK</span>
                    <span style={{ fontSize:'0.62rem', color:'#93c5fd' }}>🛡️ {enemy.pdef} P.DEF</span>
                    <span style={{ fontSize:'0.62rem', color:'#818cf8' }}>✨ {enemy.mdef} M.DEF</span>
                  </div>
                  {/* Skills row */}
                  {enemy.skills.length > 0 && (
                    <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:3 }}>
                      {(enemy.skills as EnemySkill[]).map(sk => (
                        <div key={sk.id} style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(255,255,255,0.03)', borderRadius:6, padding:'3px 7px', border:`1px solid ${col}22` }}>
                          <span style={{ fontSize:'0.7rem' }}>{sk.icon}</span>
                          <span style={{ fontSize:'0.6rem', color:'#e5e7eb', flex:1 }}>{sk.name}</span>
                          {sk.buff_description
                            ? <span style={{ fontSize:'0.55rem', color:'#86efac' }}>{sk.buff_description}</span>
                            : sk.damage_mult > 0
                              ? <span style={{ fontSize:'0.6rem', color:'#fbbf24', fontWeight:700 }}>
                                  {Math.round(sk.damage_mult * 100)}%{sk.hit_count && sk.hit_count > 1 ? ` ×${sk.hit_count}` : ''}
                                  {sk.def_penetration ? ` (abaikan ${sk.def_penetration}% DEF)` : ''}
                                </span>
                              : null}
                          <span style={{ fontSize:'0.55rem', color:'#6b7280', marginLeft:4, flexShrink:0 }}>{sk.probability}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontSize:'0.6rem', color:'#6b7280', marginBottom:4 }}>Reward</div>
                  <div style={{ fontSize:'0.75rem', fontWeight:700, color:'#c4b5fd' }}>+{enemy.reward_exp} EXP</div>
                  <div style={{ fontSize:'0.75rem', fontWeight:700, color:'#fbbf24' }}>+{enemy.reward_gold}🪙</div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ── Battle Screen ─────────────────────────────────────────────────────────────

interface BattleScreenProps {
  enemy              : LocalEnemy;
  initState          : BattleState;
  playerName         : string;
  playerGender?      : string;
  playerLevel        : number;
  skillSlots         : SkillSlots;
  rightHandWeaponType: string;
  physAtk            : number;
  magAtk             : number;
  physDef            : number;
  dodge              : number;
  critRate           : number;
  critDamage         : number;
  stamRegen          : number;
  manaRegen          : number;
  /** Battle token dari server (server-side battle engine) */
  battleToken        : string;
  onEnd: (result: 'victory' | 'defeat', finalState: { hp: number; stamina: number; mana: number }, rewards?: { exp: number; gold: number; turns: number }) => void;
}

function BattleScreen({
  enemy, initState, playerName, playerGender, playerLevel,
  skillSlots, rightHandWeaponType, physAtk, magAtk, physDef,
  dodge, critRate, critDamage, stamRegen, manaRegen, battleToken, onEnd,
}: BattleScreenProps) {
  const gt        = playerGender === 'female' ? GENDER_THEME.female
                  : playerGender === 'male'   ? GENDER_THEME.male
                  : GENDER_THEME.default;
  
  // Player sprites - male menggunakan sprite baru dengan 4 state berbeda
  const playerIdleSprite = playerGender === 'male' 
    ? 'https://res.cloudinary.com/dhkethrmc/image/upload/f_auto,q_auto/v1773645310/9973a0e6-527c-4559-bdd3-df9a0f63737b.png'
    : femaleImg;
  const playerAttackSprite = playerGender === 'male'
    ? 'https://res.cloudinary.com/dhkethrmc/image/upload/f_auto,q_auto/v1773647104/fad7ddad-fbc3-4a4f-a92d-3f4d260cd7dc.png'
    : femaleImg;
  const playerHitSprite = playerGender === 'male'
    ? 'https://res.cloudinary.com/dhkethrmc/image/upload/f_auto,q_auto/v1773647597/f7a899fe-f683-4518-b4b3-6f4d1040ab3d.png'
    : femaleImg;
  const playerWalkSprite = playerGender === 'male'
    ? 'https://res.cloudinary.com/dhkethrmc/image/upload/f_auto,q_auto/v1773650634/b2f4e5c1-a0b7-4811-80f0-ad056b24a461.png'
    : femaleImg;
  // Sprite khusus untuk cast skill non-damage (berdiri diam/idle casting)
  const playerCastSprite = playerGender === 'male'
    ? 'https://res.cloudinary.com/dhkethrmc/image/upload/f_auto,q_auto/v1773659018/12e32d21-4a07-41e7-ab9f-5c3b9ab08c22.png'
    : femaleImg;
  
  const enemySrc  = ENEMY_IMAGE_MAP[enemy.id] ?? (enemy.is_living ? guardImg : dummyImg);
  const enemyColors = enemy.is_living ? GUARD_COLORS : DUMMY_COLORS;
  const enemyGlow   = enemy.is_living ? GUARD_GLOW : '#b45309';
  const enemySymbol = enemy.is_living ? '⚔' : '🪵';

  const [phase,       setPhase]       = useState<BattlePhase>('player_turn');
  const [enemyHp,     setEnemyHp]     = useState(initState.enemy_hp);
  const [playerHp,    setPlayerHp]    = useState(initState.player_hp);
  const [playerStam,  setPlayerStam]  = useState(initState.player_stamina);
  const [playerMana,  setPlayerMana]  = useState(initState.player_mana);
  const [skillCds,    setSkillCds]    = useState<Record<string, number>>({});

  /**
   * SECURITY — Sealed battle state (Layer 2 + 3)
   * All authoritative HP/stamina/mana/turnCount values live here, NOT in useState.
   * useRef values are invisible to React DevTools and cannot be modified through
   * the "Components" panel. The FNV-1a integrity checksum detects console tampering.
   * Every call to serverTurn reads from this ref; useState above is display-only.
   */
  const battleRef = useRef(
    createSealedState(initState.enemy_hp, initState.player_hp, initState.player_stamina, initState.player_mana)
  );

  // ── Buff/Debuff state ──────────────────────────────────────────────────────
  const [playerBuffs,  setPlayerBuffs]  = useState<ActiveBuff[]>([]);
  const [enemyDebuffs, setEnemyDebuffs] = useState<ActiveBuff[]>([]);
  const [enemyBuffs,   setEnemyBuffs]   = useState<ActiveBuff[]>([]); // buff aktif pada musuh

  const [playerAnim,  setPlayerAnim]  = useState(false);
  const [enemyAnim,   setEnemyAnim]   = useState(false);
  const [playerHit,   setPlayerHit]   = useState(false);
  const [enemyHit,    setEnemyHit]    = useState(false);
  const [enemyGuard,  setEnemyGuard]  = useState(false);
  const [endClaimed,  setEndClaimed]  = useState(false);
  const [logExpanded, setLogExpanded] = useState(false);
  const [playerWalking, setPlayerWalking] = useState(false); // State untuk animasi berjalan ke musuh
  const [playerWalkingBack, setPlayerWalkingBack] = useState(false); // State untuk animasi berjalan kembali
  const [playerCasting, setPlayerCasting] = useState(false); // State untuk cast skill non-damage (idle 2 detik)

  const logId   = useRef(2);
  const floatId = useRef(0);
  const [log,    setLog]    = useState<LogEntry[]>([
    { id: 0, text: `⚔️ Battle dimulai! ${playerName} vs ${enemy.battle_name}`, type: 'system' },
    { id: 1, text: '🔒 Server-side battle aktif — semua aksi divalidasi server!', type: 'system' },
  ]);
  const [floats, setFloats] = useState<FloatNum[]>([]);

  const addLog = useCallback((text: string, type: LogEntry['type'] = 'system') => {
    setLog(prev => [...prev.slice(-11), { id: logId.current++, text, type }]);
  }, []);

  const spawnFloat = useCallback((value: number | string, target: 'player' | 'enemy', color: string) => {
    setFloats(prev => [...prev, { id: floatId.current++, value, color, target }]);
  }, []);

  const removeFloat = useCallback((id: number) => {
    setFloats(prev => prev.filter(f => f.id !== id));
  }, []);

  // ── Server-Driven Turn Engine ─────────────────���───────────────────────────
  // Setiap aksi dikirim ke Supabase RPC process_turn.
  // Server menghitung damage dari stat yang di-snapshot saat start_battle.
  // Client hanya menerima hasil dan menampilkan animasi — tidak ada angka dari client.
  const serverTurn = useCallback(async (action: 'attack' | 'skill', skillId?: string) => {
    if (phase !== 'player_turn') return;

    if (!battleToken) {
      addLog('❌ Token battle tidak tersedia. Tidak dapat melanjutkan.', 'error');
      return;
    }
    const token = battleToken;

    setPhase('processing');
    
    // Sequence animasi: berjalan (2s) → [attack jika ada damage] → berjalan kembali (2s)
    setPlayerWalking(true);

    let result: ProcessTurnResult;
    try {
      const supabase = getSupabaseClient();
      result = await processTurnRpc(supabase, token, action, skillId ?? null);
    } catch (err: any) {
      const code = err?.message ?? 'UNKNOWN';
      // Handle user-friendly error messages
      if (code === 'INSUFFICIENT_STAMINA') {
        addLog('⚡ Stamina tidak cukup untuk aksi ini!', 'error');
      } else if (code === 'INSUFFICIENT_MANA') {
        addLog('💙 Mana tidak cukup untuk skill ini!', 'error');
      } else if (code === 'SKILL_ON_COOLDOWN') {
        addLog('⏳ Skill sedang cooldown!', 'error');
      } else if (code === 'SKILL_NOT_EQUIPPED') {
        addLog('⛔ Skill ini tidak terpasang di slot kamu!', 'error');
      } else if (code === 'TOO_FAST') {
        addLog('⏱️ Terlalu cepat — tunggu sebentar sebelum aksi berikutnya.', 'error');
      } else if (code === 'FUNCTION_NOT_DEPLOYED') {
        addLog('⚠️ Fungsi server battle belum aktif. Jalankan battle_server_engine.sql di Supabase SQL Editor terlebih dahulu.', 'error');
        console.error('[ServerBattle] process_turn RPC not found in schema cache. Run /battle_server_engine.sql in Supabase SQL Editor → New Query → Run All.');
      } else {
        addLog(`❌ Server error: ${code}`, 'error');
        console.error('[ServerBattle] process_turn failed:', code);
      }
      setPhase('player_turn');
      return;
    }

    // ── Resolve null values dari server ──────────────────────────────────────
    // Server bisa mengembalikan null untuk field HP/stamina/mana jika:
    // 1. process_turn SQL variable belum di-set (bug server)
    // 2. Battle engine tidak men-track nilai ini untuk aksi tertentu
    // Jika null → pertahankan nilai saat ini (JANGAN jadikan 0).
    const resolvedPlayerHp  = result.new_player_hp  !== null ? result.new_player_hp  : battleRef.current.playerHp;
    const resolvedEnemyHp   = result.new_enemy_hp   !== null ? result.new_enemy_hp   : battleRef.current.enemyHp;
    const resolvedStamina   = result.new_stamina    !== null ? result.new_stamina    : battleRef.current.stamina;
    const resolvedMana      = result.new_mana       !== null ? result.new_mana       : battleRef.current.mana;

    // ── Update sealed ref dari server (server adalah kebenaran) ──────────────
    updateSealedState(battleRef.current, {
      enemyHp  : resolvedEnemyHp,
      playerHp : resolvedPlayerHp,
      stamina  : resolvedStamina,
      mana     : resolvedMana,
      turnCount: result.turn_count,
    });

    // ── Convert server buff format → client ActiveBuff format ────────────────
    const toActiveBuff = (b: ServerBuff): ActiveBuff => ({
      uid        : b.uid,
      type       : b.type as ActiveBuff['type'],
      value      : b.value,
      value2     : b.value2,
      value3     : b.value3,
      turnsLeft  : b.turns_left,
      losesOnHit : b.loses_on_hit,
    });
    const newClientBuffs      = result.player_buffs.map(toActiveBuff);
    const newClientDebuffs    = result.enemy_debuffs.map(toActiveBuff);
    const newClientEnemyBuffs = result.enemy_buffs.map(toActiveBuff);

    // ── Update display states (gunakan resolved values, bukan raw result.*) ───
    setPlayerBuffs(newClientBuffs);
    setEnemyDebuffs(newClientDebuffs);
    setEnemyBuffs(newClientEnemyBuffs);
    setSkillCds(result.skill_cooldowns);

    // ── IMMEDIATE resource update ─────────────────────────────────────────────
    // Stamina & mana diupdate langsung (tidak di setTimeout) agar bar tidak "loncat".
    // Menggunakan resolvedStamina/resolvedMana — TIDAK 0 jika server tidak mengembalikan nilai.
    setPlayerStam(resolvedStamina);
    setPlayerMana(resolvedMana);

    // ── Resource change feedback log ──────────────────────────────────────────
    if (action === 'skill' && skillId) {
      const skDef = getSkillById(skillId);
      if (skDef) {
        const parts: string[] = [];
        if (skDef.staminaCost > 0)     parts.push(`-${skDef.staminaCost}⚡`);
        if ((skDef.manaCost ?? 0) > 0) parts.push(`-${skDef.manaCost}💙`);
        if (parts.length) {
          addLog(`📊 Resource: ${parts.join(' ')}  →  ⚡${resolvedStamina} 💙${resolvedMana}`, 'guard');
        }
      }
    } else if (action === 'attack') {
      addLog(`📊 ⚡${resolvedStamina} 💙${resolvedMana}`, 'guard');
    }

    // ── Animation sequence berdasarkan damage ──────────────────────────────────
    const hasDamage = result.player_dmg > 0;
    const sk        = result.skill_id ? getSkillById(result.skill_id) : null;
    const isMagic   = (sk?.magMultiplier ?? 0) > 0;
    const hitColor  = result.is_crit ? '#FBBF24' : isMagic ? '#c084fc' : '#F87171';
    const hits      = result.hit_damages.length > 0 ? result.hit_damages : [result.player_dmg];
    const isMultiHit = hits.length > 1;
    const HIT_INTERVAL = 280; // ms between each hit animation

    // Evaluasi kemenangan lebih awal — dipakai di closure bawah
    const willVictory = result.victory && resolvedEnemyHp <= 0;

    // Fase 1: Berjalan ke musuh (2 detik)
    setTimeout(() => {
      setPlayerWalking(false);

      if (hasDamage) {
        // Jika ada damage, lakukan animasi attack
        setPlayerAnim(true);

        // ── SPAWN DAMAGE saat attack animation (200ms setelah attack start) ────
        setTimeout(() => {
          // ── Log & animate DOT/HOT results ────────────────────────────────────
          if (result.dot_enemy_dmg > 0) {
            addLog(`🩸 DOT! ${enemy.battle_name} -${result.dot_enemy_dmg} HP dari efek aktif`, 'enemy');
          }
          if (result.hot_player_heal > 0) {
            addLog(`💚 Regenerasi! ${playerName} +${result.hot_player_heal} HP`, 'skill');
          }

          // ── Log player action & spawn damage ────────────────────────────────
          if (isMultiHit) {
            // ── Multi-hit: spawn each hit with staggered timing ─────────────
            const skIcon = sk?.icon ?? '⚔️';
            const skName = sk?.name ?? result.skill_id ?? 'Combo';
            addLog(`${skIcon} ${playerName}: ${skName}! [${hits.length}× COMBO]`, 'skill');

            hits.forEach((dmg, idx) => {
              setTimeout(() => {
                spawnFloat(dmg, 'enemy', result.is_crit ? '#FBBF24' : hitColor);
                setEnemyHit(true);
                setTimeout(() => setEnemyHit(false), 220);
                const isCritHit = result.is_crit && idx === hits.length - 1;
                if (isCritHit) {
                  addLog(`  💥 Hit ${idx + 1}: KRITIS! -${dmg} HP`, 'crit');
                } else {
                  addLog(`  ⚡ Hit ${idx + 1}: -${dmg} HP`, 'skill');
                }
              }, idx * HIT_INTERVAL);
            });

            // Final combo summary after all hits land
            setTimeout(() => {
              addLog(`✦ Total Combo: -${result.player_dmg} HP ke ${enemy.battle_name}!`, result.is_crit ? 'crit' : 'skill');
              setEnemyHp(resolvedEnemyHp);
            }, hits.length * HIT_INTERVAL);

          } else {
            // ── Single hit (normal attack or single-hit skill) ──────────────
            if (result.is_crit) {
              addLog(`💥 KRITIS! ${playerName} -${result.player_dmg} HP ke ${enemy.battle_name}!`, 'crit');
              spawnFloat(result.player_dmg, 'enemy', '#FBBF24');
            } else if (result.skill_id) {
              addLog(`${sk?.icon ?? '⚔️'} ${playerName}: ${sk?.name ?? result.skill_id}! -${result.player_dmg} HP`, 'skill');
              spawnFloat(result.player_dmg, 'enemy', hitColor);
            } else {
              addLog(`⚔️ ${playerName} menyerang ${enemy.battle_name}! -${result.player_dmg} HP`, 'player');
              spawnFloat(result.player_dmg, 'enemy', '#F87171');
            }
            setEnemyHit(true);
            setTimeout(() => setEnemyHit(false), 500);
            setEnemyHp(resolvedEnemyHp);
          }
        }, 200); // Damage spawn 200ms setelah attack animation start

        // Selesai attack animation (400ms)
        setTimeout(() => {
          setPlayerAnim(false);

          if (willVictory) {
            // ── LANGSUNG KEMENANGAN: musuh mati, tidak perlu berjalan kembali ──
            setEnemyHp(0);
            setPhase('victory');
            addLog(`🏆 ${enemy.battle_name} dikalahkan! Kemenangan!`, 'system');
          } else {
            // Normal: berjalan kembali ke posisi semula
            setPlayerWalkingBack(true);
            setTimeout(() => setPlayerWalkingBack(false), 2000);
          }
        }, 400); // Durasi attack animation

      } else {
        // ── SKILL NON-DAMAGE: Berjalan → Idle Cast 2 detik → Berjalan Kembali ──
        // Tampilkan sprite cast (standing casting pose) selama 2 detik

        // Log skill non-damage
        if (action === 'skill' && skillId) {
          const skDef = getSkillById(skillId);
          if (skDef) addLog(`${skDef.icon} ${playerName} menggunakan ${skDef.name}...`, 'skill');
        }

        // Aktifkan pose casting
        setPlayerCasting(true);

        // Saat tengah cast animation (1000ms = midpoint dari 2s), apply buff/heal effects
        setTimeout(() => {
          // Apply buff/heal logs disini
          if (result.hot_player_heal > 0) {
            addLog(`💚 Heal! ${playerName} +${result.hot_player_heal} HP`, 'skill');
            spawnFloat(`+${result.hot_player_heal}`, 'player', '#4ade80');
            setPlayerHp(resolvedPlayerHp);
          }

          // Log buff yang di-apply
          if (newClientBuffs.length > 0) {
            const buffDescs = newClientBuffs.map(b => {
              if (b.type === 'atk_buff') return `ATK +${b.value}`;
              if (b.type === 'def_buff') return `DEF +${b.value}`;
              if (b.type === 'dodge_crit_buff') return `Dodge/Crit +${b.value}%`;
              if (b.type === 'parry') return `Parry ${b.value}%`;
              if (b.type === 'reflect_pct') return `Reflect ${b.value}%`;
              return 'Buff';
            }).join(', ');
            addLog(`✨ ${buffDescs} aktif selama ${newClientBuffs[0]?.turnsLeft ?? 0} turn!`, 'skill');
          }
        }, 1000); // Effect apply di midpoint cast

        // Selesai cast (2000ms), lalu berjalan kembali atau victory
        setTimeout(() => {
          setPlayerCasting(false);

          if (willVictory) {
            // ── LANGSUNG KEMENANGAN: musuh mati dari DOT/efek, tidak perlu berjalan kembali ──
            setEnemyHp(0);
            setPhase('victory');
            addLog(`🏆 ${enemy.battle_name} dikalahkan! Kemenangan!`, 'system');
          } else {
            // Normal: berjalan kembali
            setPlayerWalkingBack(true);
            setTimeout(() => setPlayerWalkingBack(false), 2000);
          }
        }, 2000); // Durasi idle cast 2 detik
      }
    }, 2000); // Durasi walking forward 2 detik

    // ── Jika enemy mati dari aksi player: skip enemy turn ────────────────────
    if (willVictory) return;

    // ── Enemy turn animations ────────────��────────────────────────────────────
    // Enemy turn harus menunggu player selesai semua animasi:
    // Damage:     walk(2s) + attack(0.4s) + walkback(2s) + 0.1s = 4500ms
    // Non-damage: walk(2s) + cast(2s)    + walkback(2s) + 0.1s = 6100ms
    const enemyTurnDelay = hasDamage ? 4500 : 6100;

    setTimeout(() => {
      setPhase('enemy_turn');
      const ea = result.enemy_action;

      // Wooden dummy special
      if (!enemy.is_living) {
        const DUMMY_TEXTS = [
          'Boneka Kayu bergetar sedikit... tidak berbuat apa-apa.',
          'Boneka Kayu mencoba menghantam... kayunya terlalu kaku!',
          'Boneka Kayu diam membisu. Serangan: 0 damage.',
          'Boneka Kayu berayun... tapi lengannya tidak sampai.',
        ];
        setEnemyAnim(true);
        setTimeout(() => setEnemyAnim(false), 350);
        setTimeout(() => {
          spawnFloat('0', 'player', '#94A3B8');
          addLog(`🌀 ${DUMMY_TEXTS[Math.floor(Math.random() * DUMMY_TEXTS.length)]}`, 'miss');
          setPlayerHp(resolvedPlayerHp);
          // setPlayerStam / setPlayerMana sudah diupdate immediate di atas
          setTimeout(() => {
            if (result.victory) {
              setPhase('victory');
              addLog(`🏆 ${enemy.battle_name} dikalahkan! Kemenangan!`, 'system');
            } else {
              setPhase('player_turn');
              addLog('🎯 Giliranmu — pilih aksimu!', 'system');
            }
          }, 600);
        }, 400);
        return;
      }

      // Guard / Buff action
      if (ea.is_guard) {
        setEnemyGuard(true);
        // Tampilkan ringkasan buff aktif musuh sebagai keterangan skill
        const newEBufDesc = newClientEnemyBuffs
          .map(b => {
            if (b.type === 'enemy_atk_buff')  return `ATK +${b.value}`;
            if (b.type === 'enemy_pdef_buff') return `P.DEF +${b.value}`;
            if (b.type === 'enemy_mdef_buff') return `M.DEF +${b.value}`;
            return '';
          }).filter(Boolean).join(', ');
        addLog(`🛡️ ${enemy.battle_name} menggunakan ${ea.name}!${newEBufDesc ? ` (${newEBufDesc})` : ''}`, 'skill');
        setPlayerHp(resolvedPlayerHp);
        // setPlayerStam / setPlayerMana sudah diupdate immediate di atas
        setTimeout(() => {
          setEnemyGuard(false);
          setEnemyHp(resolvedEnemyHp);
          if (result.victory) {
            setPhase('victory');
            addLog(`🏆 ${enemy.battle_name} dikalahkan! Kemenangan!`, 'system');
          } else {
            setPhase('player_turn');
            addLog('🎯 Giliranmu — pilih aksimu!', 'system');
          }
        }, 700);
        return;
      }

      // Normal living enemy attack
      setEnemyGuard(false);
      setEnemyAnim(true);
      setTimeout(() => setEnemyAnim(false), 500);

      setTimeout(() => {
        if (ea.is_dodged) {
          addLog(`${ea.icon ?? '⚔️'} ${enemy.battle_name} menggunakan ${ea.name}!`, 'skill');
          setPlayerHit(true);
          setTimeout(() => setPlayerHit(false), 400);
          spawnFloat('DODGE', 'player', '#fbbf24');
          addLog(`💨 ${playerName} menghindar!`, 'miss');
        } else if (result.was_parried && ea.dmg === 0) {
          addLog(`${ea.icon ?? '⚔️'} ${enemy.battle_name} menggunakan ${ea.name}!`, 'skill');
          setPlayerHit(true);
          setTimeout(() => setPlayerHit(false), 400);
          spawnFloat('TANGKIS!', 'player', '#60a5fa');
          addLog(`🔰 TANGKIS SEMPURNA! Serangan ${enemy.battle_name} ditangkis total!`, 'skill');
        } else if (ea.dmg > 0) {
          const suffix   = ea.is_ultimate ? ' ⚡ ULTIMATE!' : '';
          const hitColor = ea.is_ultimate ? '#f87171' : '#fb923c';

          // ── Multi-hit: animasi setiap hit satu per satu ──────────────────────
          const eHits      = (ea.hit_damages && ea.hit_damages.length > 1) ? ea.hit_damages : null;
          const E_HIT_MS   = 280; // ms antar hit

          if (eHits) {
            // Announce skill dulu
            addLog(`${ea.icon ?? '⚔️'} ${enemy.battle_name}: ${ea.name}!${suffix} [${eHits.length}× HIT]`, 'enemy');

            eHits.forEach((hitDmg, idx) => {
              setTimeout(() => {
                setPlayerHit(true);
                setTimeout(() => setPlayerHit(false), 220);
                spawnFloat(hitDmg, 'player', hitColor);
                addLog(`  💢 Hit ${idx + 1}: -${hitDmg} HP`, 'enemy');
              }, idx * E_HIT_MS);
            });

            // Setelah semua hit selesai: update HP + reflect + log total
            setTimeout(() => {
              setPlayerHp(resolvedPlayerHp);
              addLog(`✦ Total serangan: -${ea.dmg} HP${result.parry_reduced > 0 ? ` (tangkis -${result.parry_reduced})` : ''}`, 'enemy');

              if (result.reflect_dmg > 0) {
                spawnFloat(result.reflect_dmg, 'enemy', '#f0abfc');
                addLog(`↩️ Pantul! ${result.reflect_dmg} damage dikembalikan ke ${enemy.battle_name}!`, 'skill');
                setEnemyHp(resolvedEnemyHp);
              }

              if (result.defeat) {
                // Player mati dari multi-hit - langsung tampilkan defeat
                setPhase('defeat');
                addLog('💀 Kamu gugur dalam pertempuran...', 'system');
                return;
              }
              if (result.victory) {
                // Enemy mati dari reflect damage - tunggu sebentar lalu victory
                setTimeout(() => {
                  setEnemyHp(0);
                  setPhase('victory');
                  addLog(`🏆 ${enemy.battle_name} dikalahkan! (Serangan balik)`, 'system');
                }, 700);
                return;
              }
              setTimeout(() => {
                setPhase('player_turn');
                addLog('🎯 Giliranmu — pilih aksimu!', 'system');
              }, 600);
            }, eHits.length * E_HIT_MS + 150);
            return; // early return — flow dilanjutkan di dalam setTimeout atas

          } else {
            // ── Single hit ────────────────────────────────────────────────────
            setPlayerHit(true);
            setTimeout(() => setPlayerHit(false), 500);
            spawnFloat(ea.dmg, 'player', hitColor);
            addLog(`${ea.icon ?? '⚔️'} ${enemy.battle_name} menggunakan ${ea.name}!${suffix} -${ea.dmg} HP${result.parry_reduced > 0 ? ` (tangkis -${result.parry_reduced})` : ''}`, 'enemy');
            if (result.reflect_dmg > 0) {
              spawnFloat(result.reflect_dmg, 'enemy', '#f0abfc');
              addLog(`↩️ Pantul! ${result.reflect_dmg} damage dikembalikan ke ${enemy.battle_name}!`, 'skill');
              setEnemyHp(resolvedEnemyHp);
            }
          }
        }

        setPlayerHp(resolvedPlayerHp);
        // setPlayerStam / setPlayerMana sudah diupdate immediate di atas

        if (result.defeat) {
          // Player mati - langsung tampilkan defeat tanpa delay
          setPhase('defeat');
          addLog('💀 Kamu gugur dalam pertempuran...', 'system');
          return;
        }

        if (result.victory) {
          // Enemy mati dari reflect damage - tunggu sebentar lalu victory
          setTimeout(() => {
            setEnemyHp(0);
            setPhase('victory');
            addLog(`🏆 ${enemy.battle_name} dikalahkan! (Serangan balik)`, 'system');
          }, 700);
          return;
        }

        setTimeout(() => {
          setPhase('player_turn');
          addLog('🎯 Giliranmu — pilih aksimu!', 'system');
        }, 600);
      }, 450);
    }, enemyTurnDelay);
  }, [phase, enemy, playerName, addLog, spawnFloat, battleRef, battleToken]);

  const handleAttack = useCallback(() => serverTurn('attack'), [serverTurn]);
  const handleSkill  = useCallback((slotKey: keyof SkillSlots) => {
    const sid = skillSlots[slotKey];
    if (!sid) { addLog('⚡ Slot ini kosong — pasang skill di Menu Skill!', 'system'); return; }
    serverTurn('skill', sid);
  }, [skillSlots, serverTurn, addLog]);

  // Auto redirect ke clinic kalau defeat
  // SECURITY: Use battleRef values (not display state) for final HP report
  useEffect(() => {
    if (phase === 'defeat' && battleRef.current.playerHp <= 0) {
      const snap = { ...battleRef.current };
      // Tunggu animasi defeat selesai (rotate & fade) + waktu untuk pemain melihat status
      const t = setTimeout(() => onEnd('defeat', { hp: snap.playerHp, stamina: snap.stamina, mana: snap.mana }), 2500);
      return () => clearTimeout(t);
    }
  }, [phase, onEnd]);

  const isActive = phase === 'player_turn';

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto',
      overflowX: 'hidden',
      background: 'linear-gradient(180deg, #0a0212 0%, #12012a 50%, #0d0a1a 100%)',
    }}>

      {/* Header */}
      <div style={{
        background:'linear-gradient(90deg, rgba(0,0,0,0.7), rgba(88,28,135,0.6), rgba(0,0,0,0.7))',
        backdropFilter: 'blur(8px)',
        padding:'10px 20px', 
        display:'flex', 
        alignItems:'center', 
        justifyContent:'space-between',
        flexShrink: 0,
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <motion.div style={{
            width:9, height:9, borderRadius:'50%',
            background: phase === 'victory' ? '#4ade80' : phase === 'defeat' ? '#f87171'
              : phase === 'player_turn' ? '#fbbf24' : '#9ca3af',
          }} animate={{ scale:[1,1.4,1], opacity:[0.7,1,0.7] }} transition={{ duration:1.2, repeat:Infinity }} />
          <span style={{ fontSize:'0.8rem', fontFamily:'serif', letterSpacing:'0.1em', color:'#e2e8f0', fontWeight:700 }}>
            {phase === 'victory'     ? '🏆 KEMENANGAN'
             : phase === 'defeat'   ? '💀 KEKALAHAN'
             : phase === 'player_turn' ? '⚔️ Giliran Pemain'
             : phase === 'processing'  ? '⚡ Melakukan Aksi...'
             : phase === 'enemy_turn'  ? `${enemySymbol} Giliran ${enemy.battle_name}`
             : '⚡ Melakukan Aksi...'}
          </span>
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end' }}>
          <span style={{ fontSize:'0.6rem', color:'#4b5563', letterSpacing:'0.15em' }}>ARENA LATIHAN</span>
          <span style={{ fontSize:'0.55rem', color:'#a855f7' }}>⚔️ Figma Engine</span>
        </div>
      </div>

      {/* ── Resource Panel: Stamina & Mana di atas battlefield ─────────────── */}
      <div style={{
        padding:'8px 20px 6px',
        background:'linear-gradient(90deg, rgba(0,0,0,0.8), rgba(15,5,30,0.85), rgba(0,0,0,0.8))',
        backdropFilter: 'blur(6px)',
        display:'flex', 
        gap:16,
        flexShrink: 0,
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Stamina */}
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
            <span style={{ fontSize:'0.65rem', color:'#fbbf24', fontFamily:'serif', fontWeight:700, letterSpacing:'0.05em', display:'flex', alignItems:'center', gap:4 }}>
              <Zap style={{ width:11, height:11 }} />⚡ STAMINA
            </span>
            <motion.span
              key={playerStam}
              initial={{ scale:1.2, color:'#fbbf24' }}
              animate={{ scale:1, color: playerStam / initState.player_max_stamina > 0.5 ? '#fbbf24' : playerStam / initState.player_max_stamina > 0.25 ? '#f97316' : '#ef4444' }}
              transition={{ duration:0.3 }}
              style={{ fontSize:'0.72rem', fontWeight:900, fontFamily:'monospace' }}
            >
              {playerStam} / {initState.player_max_stamina}
            </motion.span>
          </div>
          <div style={{ height:7, background:'rgba(31,41,55,0.9)', borderRadius:99, overflow:'hidden', border:'1px solid rgba(251,191,36,0.2)', boxShadow:'inset 0 1px 3px rgba(0,0,0,0.5)' }}>
            <motion.div
              animate={{ width:`${initState.player_max_stamina > 0 ? Math.min(100,(playerStam/initState.player_max_stamina)*100) : 0}%` }}
              transition={{ duration:0.4, ease:'easeOut' }}
              style={{ height:'100%', borderRadius:99,
                background: playerStam / initState.player_max_stamina > 0.5
                  ? 'linear-gradient(90deg, #d97706, #fbbf24, #fde68a)'
                  : playerStam / initState.player_max_stamina > 0.25
                  ? 'linear-gradient(90deg, #c2410c, #f97316)'
                  : 'linear-gradient(90deg, #991b1b, #ef4444)',
                boxShadow:'0 0 8px rgba(251,191,36,0.5)',
              }}
            />
          </div>
        </div>
        {/* Mana (hanya tampil jika ada) */}
        {initState.player_max_mana > 0 && (
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
              <span style={{ fontSize:'0.65rem', color:'#818cf8', fontFamily:'serif', fontWeight:700, letterSpacing:'0.05em' }}>💙 MANA</span>
              <motion.span
                key={playerMana}
                initial={{ scale:1.2, color:'#c4b5fd' }}
                animate={{ scale:1 }}
                transition={{ duration:0.3 }}
                style={{ fontSize:'0.72rem', fontWeight:900, fontFamily:'monospace', color:'#818cf8' }}
              >
                {playerMana} / {initState.player_max_mana}
              </motion.span>
            </div>
            <div style={{ height:7, background:'rgba(99,102,241,0.15)', borderRadius:99, overflow:'hidden', border:'1px solid rgba(129,140,248,0.2)', boxShadow:'inset 0 1px 3px rgba(0,0,0,0.5)' }}>
              <motion.div
                animate={{ width:`${initState.player_max_mana > 0 ? Math.min(100,(playerMana/initState.player_max_mana)*100) : 0}%` }}
                transition={{ duration:0.4, ease:'easeOut' }}
                style={{ height:'100%', background:'linear-gradient(90deg, #4f46e5, #818cf8, #c4b5fd)', borderRadius:99, boxShadow:'0 0 8px rgba(129,140,248,0.5)' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Battle Field */}
      <div style={{
        position: 'relative',
        flex: '1 0 auto',
        zIndex: 1,
        overflow: 'hidden',
        background: '#07001a',
      }}>
        {/* ── Arena background: width:100% natural flow — penuh lebar layar, tidak terpotong ── */}
        <img
          src="https://res.cloudinary.com/dhkethrmc/image/upload/f_auto,q_auto/v1773617282/Gemini_Generated_Image_m9hderm9hderm9hd_nye4ts.webp"
          alt=""
          aria-hidden="true"
          style={{
            display: 'block',
            width: '100%',
            height: 'auto',
            minHeight: 280,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        />
        {/* Vignette atas & bawah — transisi halus ke panel UI */}
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          pointerEvents: 'none',
          background: 'linear-gradient(to bottom, #07001a 0%, transparent 14%, transparent 88%, #07001a 100%)',
        }} />
        {/* ── Karakter overlay: absolute fill seluruh battlefield, karakter di bawah ── */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-around',
          padding: '0 40px 12px',
          gap: 40,
          zIndex: 2,
        }}>
        {/* Player */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, position:'relative', zIndex:2 }}>
          {/* Active buff indicators */}
          {playerBuffs.length > 0 && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:3, justifyContent:'center', marginBottom:4 }}>
                {playerBuffs.map(b => {
                  const cfg: Record<string, { icon:string; color:string; bg:string }> = {
                    atk_buff       : { icon:'⚔️', color:'#fbbf24', bg:'rgba(120,53,15,0.6)' },
                    def_buff       : { icon:'🛡', color:'#60a5fa', bg:'rgba(30,58,138,0.6)' },
                    dodge_crit_buff: { icon:'🌟', color:'#a78bfa', bg:'rgba(88,28,135,0.6)' },
                    parry          : { icon:'🔰', color:'#34d399', bg:'rgba(6,78,59,0.6)' },
                    reflect_pct    : { icon:'🌀', color:'#f9a8d4', bg:'rgba(157,23,77,0.5)' },
                    reflect_flat   : { icon:'↩️', color:'#f9a8d4', bg:'rgba(157,23,77,0.5)' },
                    enemy_dmg_reduce:{ icon:'🏯', color:'#94a3b8', bg:'rgba(51,65,85,0.7)' },
                    heal_hot       : { icon:'💚', color:'#4ade80', bg:'rgba(5,46,22,0.7)' },
                  };
                  const c = cfg[b.type] ?? { icon:'✨', color:'#e2e8f0', bg:'rgba(30,30,30,0.7)' };
                  return (
                    <motion.div key={b.uid}
                      initial={{ scale:0 }} animate={{ scale:1 }} exit={{ scale:0 }}
                      style={{ background:c.bg, border:`1px solid ${c.color}60`, borderRadius:6,
                        padding:'1px 5px', display:'flex', alignItems:'center', gap:2 }}>
                      <span style={{ fontSize:'0.6rem' }}>{c.icon}</span>
                      {b.turnsLeft !== -1 && (
                        <span style={{ fontSize:'0.55rem', color:c.color, fontWeight:700 }}>{b.turnsLeft}</span>
                      )}
                    </motion.div>
                  );
                })}
            </div>
          )}
          <motion.div 
            style={{ 
              position:'relative',
            }}
            animate={{
              // Tetap di posisi maju selama walking forward, attack, ATAU casting non-damage
              x: playerWalking ? 80 : playerAnim ? 80 : playerCasting ? 80 : 0,
            }}
            transition={{ 
              duration: playerWalking ? 2.0 : playerWalkingBack ? 2.0 : 0.3,
              ease: playerWalking ? 'easeOut' : playerWalkingBack ? 'easeIn' : 'easeIn'
            }}
          >
            <AvatarBox 
              src={
                playerHit ? playerHitSprite
                : playerCasting ? playerCastSprite    // Cast non-damage: pose casting diam
                : playerWalking ? playerIdleSprite    // Walking forward: WalkingAnimation handles toggle
                : playerWalkingBack ? playerIdleSprite
                : playerAnim ? playerAttackSprite 
                : playerIdleSprite
              } 
              colors={gt.colors} 
              glow={gt.glow}
              symbol={playerGender === 'female' ? '♀' : '♂'}
              isHit={playerHit} 
              isAttacking={playerAnim}
              isDefeated={phase === 'defeat'}
              isWalking={(playerWalking || playerWalkingBack) && !playerCasting}
              idleSrc={playerIdleSprite}
              walkSrc={playerWalkSprite}
              walkingBack={playerWalkingBack}
            />
            <div style={{ position:'absolute', top:0, left:0, right:0, height:0, overflow:'visible', zIndex:30 }}>
              {floats.filter(f => f.target === 'player').map(f => (
                <DamageFloat key={f.id} float={f} onDone={() => removeFloat(f.id)} />
              ))}
            </div>
          </motion.div>
        </div>

        {/* Enemy */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, position:'relative', zIndex:2 }}>
          {/* Enemy debuff and buff indicators */}
          {enemyDebuffs.length > 0 && (
            <div style={{ marginBottom:4 }}>
              <div style={{ display:'flex', flexWrap:'wrap', gap:3, justifyContent:'center', marginTop:4 }}>
                {enemyDebuffs.map(d => {
                  const cfg: Record<string, { icon:string; color:string }> = {
                    bleed_dot        : { icon:'🩸', color:'#f87171' },
                    poison_dot       : { icon:'🐍', color:'#4ade80' },
                    enemy_pdef_debuff: { icon:'🎯', color:'#fbbf24' },
                  };
                  const c = cfg[d.type] ?? { icon:'💀', color:'#e2e8f0' };
                  return (
                    <motion.div key={d.uid}
                      initial={{ scale:0 }} animate={{ scale:1 }}
                      style={{ background:'rgba(0,0,0,0.6)', border:`1px solid ${c.color}60`, borderRadius:6,
                        padding:'1px 5px', display:'flex', alignItems:'center', gap:2 }}>
                      <span style={{ fontSize:'0.6rem' }}>{c.icon}</span>
                      <span style={{ fontSize:'0.55rem', color:c.color, fontWeight:700 }}>{d.turnsLeft}</span>
                    </motion.div>
                  );
                })}
                {/* Enemy SELF-buff indicators (Tarik Perisai, Battle Cry, dll) */}
                {(enemyBuffs.length > 0 || enemyGuard) && (<>
                {enemyGuard && enemyBuffs.length === 0 && (
                  <motion.div initial={{ scale:0 }} animate={{ scale:1 }}
                    style={{ background:'rgba(30,58,138,0.55)', border:'1px solid #60a5fa60', borderRadius:6,
                      padding:'1px 6px', display:'flex', alignItems:'center', gap:2 }}>
                    <Shield style={{ width:9, height:9, color:'#60a5fa' }} />
                    <span style={{ fontSize:'0.55rem', color:'#60a5fa', fontWeight:700 }}>Bertahan</span>
                  </motion.div>
                )}
                {enemyBuffs.map(b => {
                  const cfg: Record<string, { icon:string; color:string; label:string }> = {
                    enemy_atk_buff : { icon:'⚔️', color:'#fbbf24', label:`ATK+${b.value}` },
                    enemy_pdef_buff: { icon:'🛡',  color:'#60a5fa', label:`DEF+${b.value}` },
                    enemy_mdef_buff: { icon:'✨',  color:'#a78bfa', label:`MDEF+${b.value}` },
                  };
                  const c = cfg[b.type] ?? { icon:'💫', color:'#e2e8f0', label:'Buff' };
                  return (
                    <motion.div key={b.uid}
                      initial={{ scale:0 }} animate={{ scale:1 }}
                      style={{ background:'rgba(0,0,0,0.65)', border:`1px solid ${c.color}60`, borderRadius:6,
                        padding:'1px 5px', display:'flex', alignItems:'center', gap:2 }}>
                      <span style={{ fontSize:'0.6rem' }}>{c.icon}</span>
                      <span style={{ fontSize:'0.55rem', color:c.color, fontWeight:700 }}>{c.label}</span>
                      <span style={{ fontSize:'0.5rem', color:'#6b7280' }}>{b.turnsLeft}T</span>
                    </motion.div>
                  );
                })}
                </>)}
              </div>
            </div>
          )}
          <div style={{ position:'relative' }}>
            <AvatarBox src={enemySrc} colors={enemyColors} glow={enemyGlow}
              symbol={enemySymbol}
              isHit={enemyHit} isAttacking={enemyAnim}
              isDefeated={phase === 'victory'}
              isGuarding={enemyGuard}
              flip />
            <div style={{ position:'absolute', top:0, left:0, right:0, height:0, overflow:'visible', zIndex:30 }}>
              {floats.filter(f => f.target === 'enemy').map(f => (
                <DamageFloat key={f.id} float={f} onDone={() => removeFloat(f.id)} />
              ))}
            </div>
          </div>
        </div>

        {/* Processing indicator */}
        <AnimatePresence>
          {phase === 'processing' && (
            <motion.div
              initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              style={{
                position:'absolute', top:14, left:'50%', transform:'translateX(-50%)',
                background:'rgba(30,10,50,0.92)', border:'1px solid rgba(168,85,247,0.5)',
                borderRadius:12, padding:'6px 18px', backdropFilter:'blur(8px)',
                display:'flex', alignItems:'center', gap:8, whiteSpace:'nowrap', zIndex:40,
              }}
            >
              <motion.div
                animate={{ rotate:360 }} transition={{ duration:0.8, repeat:Infinity, ease:'linear' }}
                style={{ width:12, height:12, border:'2px solid rgba(168,85,247,0.4)', borderTopColor:'#a855f7', borderRadius:'50%' }}
              />
              <span style={{ fontSize:'0.72rem', color:'#c4b5fd', fontFamily:'serif', fontWeight:700 }}>
                Menghitung...
              </span>
            </motion.div>
          )}
        </AnimatePresence>
        </div>{/* end character overlay */}
      </div>{/* end battlefield */}

      {/* HP Bars Panel */}
      <div style={{
        padding:'6px 20px 8px',
        background:'linear-gradient(90deg, rgba(0,0,0,0.8), rgba(15,5,30,0.85), rgba(0,0,0,0.8))',
        backdropFilter: 'blur(6px)',
        display:'flex', 
        gap:16,
        flexShrink: 0,
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
            <span style={{ fontSize:'0.65rem', color:gt.colors[1], fontFamily:'serif', fontWeight:700 }}>❤️ {playerName}</span>
            <motion.span key={playerHp} initial={{ scale:1.2 }} animate={{ scale:1 }} transition={{ duration:0.3 }} style={{ fontSize:'0.7rem', fontWeight:900, fontFamily:'monospace', color:'#4ade80' }}>
              {playerHp}/{initState.player_max_hp}
            </motion.span>
          </div>
          <div style={{ height:8, background:'rgba(31,41,55,0.9)', borderRadius:99, overflow:'hidden', border:'1px solid rgba(74,222,128,0.2)' }}>
            <HpBar hp={playerHp} maxHp={initState.player_max_hp} color="from-green-500 to-emerald-400" />
          </div>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
            <span style={{ fontSize:'0.65rem', color:'#fca5a5', fontFamily:'serif', fontWeight:700 }}>⚔️ {enemy.battle_name}</span>
            <motion.span key={enemyHp} initial={{ scale:1.2 }} animate={{ scale:1 }} transition={{ duration:0.3 }} style={{ fontSize:'0.7rem', fontWeight:900, fontFamily:'monospace', color:'#f87171' }}>
              {enemyHp}/{initState.enemy_max_hp}
            </motion.span>
          </div>
          <div style={{ height:8, background:'rgba(31,41,55,0.9)', borderRadius:99, overflow:'hidden', border:'1px solid rgba(248,113,113,0.2)' }}>
            <HpBar hp={enemyHp} maxHp={initState.enemy_max_hp} color="from-red-500 to-orange-400" />
          </div>
        </div>
      </div>

      {/* ── Bottom section wrapper — log overlay tumbuh ke ATAS dari sini ──────── */}
      <div style={{ position: 'relative', flexShrink: 0, zIndex: 1 }}>

        {/* Log Expanded Overlay: position absolute, bottom 100% = tumbuh ke atas menutupi battlefield */}
        <AnimatePresence>
          {logExpanded && (
            <motion.div
              key="log-overlay"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                bottom: '100%',
                left: 0,
                right: 0,
                zIndex: 60,
                overflow: 'hidden',
                background: 'linear-gradient(180deg, rgba(5,0,20,0.45) 0%, rgba(10,2,30,0.75) 100%)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderTop: '1px solid rgba(168,85,247,0.35)',
                borderBottom: '1px solid rgba(168,85,247,0.2)',
                boxShadow: '0 -8px 40px rgba(88,28,135,0.2)',
              }}
            >
              <div
                style={{
                  padding: '10px 12px',
                  maxHeight: 220,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
                className="battle-log-scroll"
              >
                <AnimatePresence initial={false}>
                  {log.map(entry => (
                    <motion.div key={entry.id}
                      initial={{ opacity: 0, x: -8, height: 0 }}
                      animate={{ opacity: 1, x: 0, height: 'auto' }}
                      transition={{ duration: 0.2 }}
                      style={{
                        fontSize: '0.68rem',
                        lineHeight: 1.5,
                        color: entry.type === 'player' ? '#c4b5fd'
                             : entry.type === 'enemy'  ? '#fca5a5'
                             : entry.type === 'crit'   ? '#fbbf24'
                             : entry.type === 'skill'  ? '#f9a8d4'
                             : entry.type === 'guard'  ? '#93c5fd'
                             : entry.type === 'miss'   ? '#6b7280'
                             : entry.type === 'error'  ? '#f87171'
                             : '#94a3b8',
                        fontStyle: entry.type === 'miss' ? 'italic' : 'normal',
                        fontWeight: entry.type === 'crit' || entry.type === 'skill' ? 800 : 400,
                      }}
                    >{entry.text}</motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Log Toggle Tab — selalu di layout, tidak bergerak */}
        <div style={{
          borderTop: '1px solid rgba(168,85,247,0.4)',
          background: logExpanded
            ? 'linear-gradient(90deg, rgba(88,28,135,0.45), rgba(0,0,0,0.65))'
            : 'linear-gradient(90deg, rgba(88,28,135,0.25), rgba(0,0,0,0.5))',
          backdropFilter: 'blur(8px)',
        }}>
          <motion.div
            onClick={() => setLogExpanded(!logExpanded)}
            whileHover={{ background: 'linear-gradient(90deg, rgba(88,28,135,0.5), rgba(0,0,0,0.35))' }}
            style={{
              padding: '7px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              userSelect: 'none',
              transition: 'background 0.2s ease',
            }}
          >
            <span style={{ fontSize: '0.6rem', color: '#a855f7', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              <motion.span
                animate={{ rotate: logExpanded ? [0, -10, 10, 0] : 0 }}
                transition={{ duration: 0.4 }}
                style={{ fontSize: '0.85rem', display: 'inline-block' }}
              >📜</motion.span>
              {logExpanded ? 'Tutup Log' : 'Buka Log Battle'}
            </span>
            <motion.span
              animate={{ rotate: logExpanded ? 0 : 180 }}
              transition={{ duration: 0.25 }}
              style={{ fontSize: '0.75rem', color: '#a855f7' }}
            >
              ▼
            </motion.span>
          </motion.div>
        </div>

        {/* Actions / Result */}
        <div style={{
          padding: '0 20px 16px',
          overflowY: 'auto',
        }}>
        <AnimatePresence mode="wait">

          {/* Victory */}
          {phase === 'victory' && (
            <motion.div key="victory"
              initial={{ opacity:0, y:10 }}
              animate={{ opacity:1, y:0 }}
              transition={{ duration:0.3 }}
              style={{
                background:'linear-gradient(160deg, rgba(88,28,135,0.25), rgba(5,5,25,0.6))',
                border:'1px solid rgba(168,85,247,0.3)',
                borderRadius:12,
                padding:'14px 16px',
                backdropFilter:'blur(16px)',
              }}>

              {/* Header dengan icon dan title compact */}
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12, paddingBottom:10, borderBottom:'1px solid rgba(168,85,247,0.15)' }}>
                <motion.div
                  animate={{ rotate:[0,10,-10,0], scale:[1,1.1,1] }}
                  transition={{ duration:2, repeat:Infinity, ease:'easeInOut' }}
                  style={{ fontSize:'1.6rem', filter:'drop-shadow(0 0 8px rgba(251,191,36,0.6))' }}
                >
                  🏆
                </motion.div>
                <div style={{ flex:1 }}>
                  <h3 style={{
                    fontFamily:'serif',
                    fontWeight:800,
                    fontSize:'1rem',
                    marginBottom:2,
                    background:'linear-gradient(90deg, #e9d5ff, #c084fc)',
                    WebkitBackgroundClip:'text',
                    WebkitTextFillColor:'transparent',
                    backgroundClip:'text',
                  }}>Kemenangan!</h3>
                  <p style={{ color:'#9ca3af', fontSize:'0.68rem', fontStyle:'italic' }}>
                    {enemy.battle_name} dikalahkan
                  </p>
                </div>
              </div>

              {/* Rewards - inline compact */}
              <div style={{ display:'flex', gap:8, marginBottom:12 }}>
                <div style={{
                  flex:1,
                  background:'rgba(168,85,247,0.08)',
                  border:'1px solid rgba(168,85,247,0.25)',
                  borderRadius:8,
                  padding:'8px 12px',
                  display:'flex',
                  alignItems:'center',
                  justifyContent:'space-between',
                }}>
                  <span style={{ fontSize:'0.62rem', color:'#a78bfa', letterSpacing:'0.05em' }}>EXP</span>
                  <span style={{ fontFamily:'serif', fontWeight:800, color:'#c4b5fd', fontSize:'0.95rem' }}>+{enemy.reward_exp}</span>
                </div>
                <div style={{
                  flex:1,
                  background:'rgba(251,191,36,0.08)',
                  border:'1px solid rgba(251,191,36,0.25)',
                  borderRadius:8,
                  padding:'8px 12px',
                  display:'flex',
                  alignItems:'center',
                  justifyContent:'space-between',
                }}>
                  <span style={{ fontSize:'0.62rem', color:'#fbbf24', letterSpacing:'0.05em' }}>GOLD</span>
                  <span style={{ fontFamily:'serif', fontWeight:800, color:'#fde68a', fontSize:'0.95rem' }}>+{enemy.reward_gold}</span>
                </div>
              </div>

              {/* Button compact */}
              <motion.button
                onClick={() => {
                  if (endClaimed) return;
                  setEndClaimed(true);
                  const snap = { ...battleRef.current };
                  onEnd('victory',
                    { hp: snap.playerHp, stamina: snap.stamina, mana: snap.mana },
                    { exp: enemy.reward_exp, gold: enemy.reward_gold, turns: snap.turnCount }
                  );
                }}
                disabled={endClaimed}
                whileHover={endClaimed ? {} : { scale:1.02, boxShadow:'0 0 20px rgba(168,85,247,0.4)' }}
                whileTap={endClaimed ? {} : { scale:0.98 }}
                style={{
                  width:'100%',
                  padding:'10px 0',
                  background: endClaimed
                    ? 'rgba(75,85,99,0.3)'
                    : 'linear-gradient(135deg, #7c3aed, #a855f7)',
                  borderRadius:8,
                  border:`1px solid ${endClaimed ? 'rgba(75,85,99,0.4)' : 'rgba(168,85,247,0.5)'}`,
                  cursor: endClaimed ? 'not-allowed' : 'pointer',
                  color: endClaimed ? '#6b7280' : '#fff',
                  fontWeight:700,
                  fontSize:'0.85rem',
                  fontFamily:'serif',
                  letterSpacing:'0.03em',
                  boxShadow: endClaimed ? 'none' : '0 0 12px rgba(168,85,247,0.3)',
                  transition:'all 0.2s ease',
                }}>
                {endClaimed ? '🧹 Membersihkan Arena...' : '← Kembali ke Arena'}
              </motion.button>
            </motion.div>
          )}

          {/* Defeat */}
          {phase === 'defeat' && (
            <motion.div key="defeat"
              initial={{ opacity:0, y:10 }}
              animate={{ opacity:1, y:0 }}
              transition={{ duration:0.3 }}
              style={{
                background:'linear-gradient(160deg, rgba(127,29,29,0.25), rgba(5,5,25,0.6))',
                border:'1px solid rgba(239,68,68,0.3)',
                borderRadius:12,
                padding:'14px 16px',
                backdropFilter:'blur(16px)',
              }}>

              {/* Header compact */}
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12, paddingBottom:10, borderBottom:'1px solid rgba(239,68,68,0.15)' }}>
                <motion.div
                  animate={{ opacity:[0.6,1,0.6] }}
                  transition={{ duration:1.5, repeat:Infinity }}
                  style={{ fontSize:'1.6rem', filter:'drop-shadow(0 0 8px rgba(239,68,68,0.6))' }}
                >
                  💀
                </motion.div>
                <div style={{ flex:1 }}>
                  <h3 style={{
                    fontFamily:'serif',
                    fontWeight:800,
                    fontSize:'1rem',
                    marginBottom:2,
                    background:'linear-gradient(90deg, #fca5a5, #f87171)',
                    WebkitBackgroundClip:'text',
                    WebkitTextFillColor:'transparent',
                    backgroundClip:'text',
                  }}>Gugur!</h3>
                  <p style={{ color:'#9ca3af', fontSize:'0.68rem', fontStyle:'italic' }}>
                    {playerHp <= 0 ? 'HP habis sepenuhnya' : `HP tersisa: ${playerHp}`}
                  </p>
                </div>
              </div>

              {/* Content */}
              {playerHp <= 0 ? (
                <>
                  <div style={{
                    background:'rgba(239,68,68,0.08)',
                    border:'1px solid rgba(239,68,68,0.25)',
                    borderRadius:8,
                    padding:'10px 12px',
                    marginBottom:12,
                  }}>
                    <p style={{ fontSize:'0.72rem', color:'#fca5a5', lineHeight:1.5 }}>
                      🏥 Kamu akan dibawa ke Klinik Desa untuk pemulihan darurat.
                    </p>
                  </div>
                  <motion.div
                    animate={{ opacity:[0.5,1,0.5] }}
                    transition={{ duration:1.2, repeat:Infinity }}
                    style={{ textAlign:'center', padding:'8px', fontSize:'0.72rem', color:'#f87171' }}
                  >
                    ⏳ Menuju Klinik Desa...
                  </motion.div>
                </>
              ) : (
                <>
                  <p style={{ color:'#9ca3af', fontSize:'0.72rem', lineHeight:1.5, marginBottom:12, textAlign:'center' }}>
                    Kamu kalah dalam pertempuran kali ini.
                  </p>
                  <motion.button
                    onClick={() => {
                      if (endClaimed) return;
                      setEndClaimed(true);
                      const snap = { ...battleRef.current };
                      onEnd('defeat', { hp: snap.playerHp, stamina: snap.stamina, mana: snap.mana });
                    }}
                    disabled={endClaimed}
                    whileHover={endClaimed ? {} : { scale:1.02, boxShadow:'0 0 20px rgba(239,68,68,0.4)' }}
                    whileTap={endClaimed ? {} : { scale:0.98 }}
                    style={{
                      width:'100%',
                      padding:'10px 0',
                      background: endClaimed
                        ? 'rgba(75,85,99,0.3)'
                        : 'linear-gradient(135deg, #991b1b, #dc2626)',
                      borderRadius:8,
                      border:`1px solid ${endClaimed ? 'rgba(75,85,99,0.4)' : 'rgba(239,68,68,0.5)'}`,
                      cursor: endClaimed ? 'not-allowed' : 'pointer',
                      color: endClaimed ? '#6b7280' : '#fff',
                      fontWeight:700,
                      fontSize:'0.85rem',
                      fontFamily:'serif',
                      letterSpacing:'0.03em',
                      boxShadow: endClaimed ? 'none' : '0 0 12px rgba(239,68,68,0.3)',
                      transition:'all 0.2s ease',
                    }}>
                    {endClaimed ? '🧹 Membersihkan Arena...' : '← Kembali ke Arena'}
                  </motion.button>
                </>
              )}
            </motion.div>
          )}

          {/* Actions */}
          {(phase === 'player_turn' || phase === 'processing' || phase === 'enemy_turn') && (
            <motion.div key="actions" initial={{ opacity:0 }} animate={{ opacity:1 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:6 }}>
                <ActionBtn
                  label="Serang" icon={<Sword style={{ width:16, height:16 }} />}
                  subtitle="Serangan fisik dasar"
                  active={isActive} onClick={handleAttack}
                  gradient="linear-gradient(90deg, #991b1b, #c2410c)"
                  glow="rgba(220,38,38,0.35)"
                />
                <SkillBtn
                  slotKey="skill1" slotLabel="Skill 1" slotIcon="①"
                  skillSlots={skillSlots} stamina={playerStam} mana={playerMana}
                  skillCds={skillCds} weaponType={rightHandWeaponType} playerLevel={playerLevel}
                  active={isActive} onClick={() => handleSkill('skill1')}
                />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:6 }}>
                <SkillBtn
                  slotKey="skill2" slotLabel="Skill 2" slotIcon="②"
                  skillSlots={skillSlots} stamina={playerStam} mana={playerMana}
                  skillCds={skillCds} weaponType={rightHandWeaponType} playerLevel={playerLevel}
                  active={isActive} onClick={() => handleSkill('skill2')}
                />
                <SkillBtn
                  slotKey="skill3" slotLabel="Skill 3" slotIcon="③"
                  skillSlots={skillSlots} stamina={playerStam} mana={playerMana}
                  skillCds={skillCds} weaponType={rightHandWeaponType} playerLevel={playerLevel}
                  active={isActive} onClick={() => handleSkill('skill3')}
                />
              </div>
              <div style={{ marginBottom:6 }}>
                <SkillBtn
                  slotKey="ultimate" slotLabel="Ultimate" slotIcon="⭐"
                  skillSlots={skillSlots} stamina={playerStam} mana={playerMana}
                  skillCds={skillCds} weaponType={rightHandWeaponType} playerLevel={playerLevel}
                  active={isActive} onClick={() => handleSkill('ultimate')}
                  isUltimate
                />
              </div>
              {/* Bertahan dihapus — tidak ada regen mekanisme */}
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ── Main ArenaPage ────────────────────────────────────────────────────────────

type PagePhase = 'select' | 'battle';

export default function ArenaPage() {
  const navigate = useNavigate();
  const { player, fetchPlayer, grantExp, updateHp, updateStamina, updateMana, updatePlayer, completeTutorialStep } = useGame();

  const [pagePhase,   setPagePhase]   = useState<PagePhase>('select');
  const [activeEnemy, setActiveEnemy] = useState<LocalEnemy | null>(null);
  const [initState,   setInitState]   = useState<BattleState | null>(null);
  const [levelUpData, setLevelUpData] = useState<any | null>(null);
  const [saving,      setSaving]      = useState(false);
  const [rewardError, setRewardError] = useState<string | null>(null);

  /**
   * SECURITY — Battle token ref (Layer 5)
   * The UUID token returned by start_battle RPC is stored here, NOT in useState.
   * useRef values are invisible to React DevTools. The token is required by the
   * claim_battle_reward RPC, which validates it server-side before awarding rewards.
   * A missing/invalid token → RPC rejects → no EXP or Gold awarded.
   */
  const battleTokenRef = useRef<string | null>(null);

  /**
   * BUG FIX: Simpan snapshot stamina & mana SEBELUM battle.
   * Server's process_turn bisa mengembalikan new_stamina=0 & new_mana=0
   * pada turn kematian (defeat). Jika disimpan ke DB, battle berikutnya
   * dimulai dengan stamina/mana=0 → sistem battle rusak total.
   * Snapshot ini dipakai untuk recovery jika server mengembalikan nilai 0 yang
   * tidak wajar (yakni, bukan karena player benar-benar menghabiskan resource).
   */
  const preBattleStaminaRef = useRef<number>(0);
  const preBattleManaRef    = useRef<number>(0);

  // Derived stats (computed from player at battle start, not during)
  const [battleDerived, setBattleDerived] = useState<ReturnType<typeof calcDerived> | null>(null);

  const skillSlots = player?.skillSlots ?? { skill1: 'power_hit', skill2: null, skill3: null, ultimate: null };
  // Gunakan .weaponType (bukan .type) — sesuai interface InventoryItem
  const rightHandWeaponType = (player?.equipment?.rightHand?.weaponType ?? '') as string;

  // Beritahu GamePage kapan battle aktif agar header bisa disembunyikan
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('game:battleActive', { detail: { active: pagePhase === 'battle' } }));
  }, [pagePhase]);

  const handleSelectEnemy = async (enemy: LocalEnemy) => {
    if (!player) return;
    setRewardError(null);

    // ── LANGKAH 1: Hitung stats & restore stamina/mana dulu ──────────────────
    // KRITIS: start_battle RPC HARUS dipanggil SETELAH restore karena server
    // membaca stats dari DB saat itu juga untuk membuat snapshot. Jika stamina/mana
    // di DB masih 0 ketika start_battle dipanggil, server snapshot 0 → setiap
    // turn process_turn mengembalikan new_stamina=0 → battle system rusak total.

    const derived = calcDerived(player);
    const maxStam = derived.stamina;
    const maxMana = Math.max(0, derived.mana);

    // Hitung current stamina/mana. Jika 0 → gunakan max (auto-restore).
    const rawStam = player.currentStamina !== undefined
      ? Math.min(player.currentStamina, maxStam)
      : maxStam;
    const rawMana = player.currentMana !== undefined
      ? Math.min(player.currentMana, maxMana)
      : maxMana;

    const curStam = rawStam > 0 ? rawStam : maxStam;
    const curMana = rawMana > 0 ? rawMana : maxMana;

    // Jika ada restore yang diperlukan, tulis ke DB SEKARANG sebelum start_battle
    const needsStamRestore = rawStam <= 0 && maxStam > 0;
    const needsManaRestore = rawMana <= 0 && maxMana > 0;
    if (needsStamRestore || needsManaRestore) {
      try {
        if (needsStamRestore) await updateStamina(curStam);
        if (needsManaRestore) await updateMana(curMana);
        console.info('[ArenaPage] Auto-restored stamina/mana → max BEFORE start_battle.');
      } catch (e) {
        console.warn('[ArenaPage] Could not auto-restore stamina/mana:', e);
      }
    }

    // ── LANGKAH 2: Baru panggil start_battle (setelah DB sudah benar) ─────────
    // Server sekarang membaca stats.currentStamina > 0 dari DB → snapshot benar.
    try {
      const supabase = getSupabaseClient();
      const token = await startBattleSession(supabase, enemy.id);
      battleTokenRef.current = token;
      if (!token) {
        setRewardError('❌ Gagal terhubung ke server battle. Coba lagi.');
        console.error('[ServerBattle] start_battle returned null — battle aborted.');
        return;
      }
    } catch (e) {
      battleTokenRef.current = null;
      setRewardError('❌ Tidak dapat terhubung ke server. Periksa koneksi internet.');
      console.error('[ServerBattle] Could not obtain battle token:', e);
      return;
    }

    // True max HP (formula hardcap, sama dengan GameContext.updateHp)
    const vit       = (player.coreStats?.vit ?? 1) + (player.equipmentCoreBonus?.vit ?? 0);
    const trueMaxHp = 100 + (player.level ?? 1) * 8 + vit * 15 + 500;

    // Simpan snapshot pre-battle untuk fallback di handleBattleEnd
    preBattleStaminaRef.current = curStam;
    preBattleManaRef.current    = curMana;

    const state: BattleState = {
      enemy_hp          : enemy.hp,
      enemy_max_hp      : enemy.hp,
      player_hp         : player.stats.hp,
      player_max_hp     : player.stats.hp,   // FIX: max bar = HP saat masuk battle, bukan hardcap
      player_stamina    : curStam,
      player_max_stamina: maxStam,
      player_mana       : curMana,
      player_max_mana   : maxMana,
    };

    setBattleDerived(derived);
    setInitState(state);
    setActiveEnemy(enemy);
    setPagePhase('battle');
  };

  const handleBattleEnd = async (
    result    : 'victory' | 'defeat',
    finalState: { hp: number; stamina: number; mana: number },
    rewards?  : { exp: number; gold: number; turns: number },
  ) => {
    if (!player || saving) return;
    setSaving(true);
    setRewardError(null);

    try {
      if (result === 'victory' && activeEnemy) {
        // ── SECURITY: Claim rewards via server RPC (v2 — server-side battle) ──
        // Server sudah memvalidasi kemenangan via process_turn (battle_status='victory').
        // claim_battle_reward hanya perlu token — tidak ada data dari client yang dipakai.
        const token = battleTokenRef.current;
        const cap   = SERVER_REWARD_CAPS[activeEnemy.id];
        // Fallback jika RPC gagal (sangat tidak mungkin karena victory sudah di server)
        let serverExp    = cap?.exp  ?? (rewards?.exp  ?? 0);
        let serverGold   = cap?.gold ?? (rewards?.gold ?? 0);
        let rpcNewGold   = (player.gold ?? 0) + serverGold;

        if (token) {
          try {
            const supabase  = getSupabaseClient();
            // v2: hanya kirim token — tidak ada enemy_id/turns dari client
            const rpcResult = await claimBattleRewardRpc(supabase, token);
            serverExp  = rpcResult.expGained;
            serverGold = rpcResult.goldGained;
            rpcNewGold = rpcResult.newGold;
          } catch (rpcErr: any) {
            const errCode = rpcErr?.message ?? 'UNKNOWN';
            console.error('[ServerBattle] claim_battle_reward failed:', errCode);
            setRewardError(`⚠ Gagal klaim reward: ${errCode}`);
          }
        } else {
          console.error('[ServerBattle] No token when claiming reward — this should not happen.');
          setRewardError('⚠ Token battle tidak tersedia.');
        }

        // ── FIX: Inject correct gold into playerRef BEFORE grantExp writes ──
        // grantExp calls updatePlayer() which writes the FULL player row to DB,
        // including gold. If playerRef.gold is still old, it would overwrite the
        // RPC's gold update. updatePlayer here sets playerRef.gold = rpcNewGold
        // so grantExp's subsequent full-row write preserves the correct amount.
        await updatePlayer({ gold: Math.max(0, rpcNewGold) });

        // Grant EXP + handle level-up state (also re-writes full row, now with correct gold)
        const expResult = await grantExp(serverExp);

        // BUG FIX: Simpan HP dari server (nilai valid setelah battle).
        // Stamina & mana: gunakan nilai battle jika > 0, fallback ke pre-battle
        // jika server mengembalikan 0 (server kadang zero-out resources saat kalah
        // atau pada kondisi edge-case tertentu).
        const safeFinalStam = finalState.stamina > 0
          ? finalState.stamina
          : preBattleStaminaRef.current;
        const safeFinalMana = finalState.mana > 0
          ? finalState.mana
          : preBattleManaRef.current;

        await updateHp(finalState.hp);
        await updateStamina(safeFinalStam);
        await updateMana(safeFinalMana);

        // Tutorial progress
        if (!activeEnemy.is_living) {
          await completeTutorialStep('dummy_kill');
        } else {
          await completeTutorialStep('guard_kill');
        }

        // Level up?
        if (expResult.levelsGained > 0) {
          setLevelUpData({
            oldLevel      : expResult.oldLevel,
            newLevel      : expResult.newLevel,
            levelsGained  : expResult.levelsGained,
            freePoints    : expResult.freePoints,
            statGains     : expResult.statGains,
          });
          setSaving(false);
          return;
        }
      } else {
        // Defeat: simpan HP dari server (kemungkinan 0 karena mati).
        // BUG FIX: Jangan simpan stamina/mana = 0 dari server.
        // Server's process_turn mengembalikan new_stamina=0 & new_mana=0 pada
        // turn kematian (kemungkinan karena player dianggap "exhausted" saat mati).
        // Menyimpan nilai 0 ini ke DB menyebabkan battle berikutnya dimulai dengan
        // 0 stamina/mana → player tidak bisa serang → sistem battle rusak.
        // Solusi: gunakan pre-battle snapshot jika server kembalikan 0.
        const safeDefeatStam = finalState.stamina > 0
          ? finalState.stamina
          : preBattleStaminaRef.current;
        const safeDefeatMana = finalState.mana > 0
          ? finalState.mana
          : preBattleManaRef.current;

        await updateHp(finalState.hp);
        await updateStamina(safeDefeatStam);
        await updateMana(safeDefeatMana);
        await fetchPlayer();

        if (finalState.hp <= 0) {
          navigate('/game/village/clinic');
          return;
        }
      }
    } catch (err) {
      console.error('[ArenaPage] Error saving battle result:', err);
    }

    setSaving(false);
    setPagePhase('select');
    setActiveEnemy(null);
    setInitState(null);
    setBattleDerived(null);
  };

  const handleLevelUpClose = () => {
    setLevelUpData(null);
    setSaving(false);
    setPagePhase('select');
    setActiveEnemy(null);
    setInitState(null);
    setBattleDerived(null);
  };

  if (!player) return null;

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(170deg, #0d0520 0%, #160835 50%, #08020f 100%)' }}>

      {levelUpData && (
        <LevelUpModal result={levelUpData} onClose={handleLevelUpClose} />
      )}

      {/* Saving overlay */}
      <AnimatePresence>
        {saving && (
          <motion.div
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            style={{
              position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(4px)',
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
              zIndex:999,
            }}
          >
            <motion.div animate={{ rotate:360 }} transition={{ duration:1, repeat:Infinity, ease:'linear' }}
              style={{ width:48, height:48, border:'3px solid rgba(168,85,247,0.3)', borderTopColor:'#a855f7', borderRadius:'50%', marginBottom:16 }}
            />
            <p style={{ color:'#c4b5fd', fontFamily:'serif', fontSize:'1rem' }}>Menyimpan hasil battle...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {pagePhase === 'select' && (
        <EnemySelectScreen
          enemies={FROZEN_ENEMIES as LocalEnemy[]}
          onSelect={handleSelectEnemy}
          onBack={() => navigate(-1)}
        />
      )}

      {/* Reward validation error toast */}
      <AnimatePresence>
        {rewardError && (
          <motion.div
            initial={{ opacity:0, y:-20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-20 }}
            style={{
              position:'fixed', top:20, left:'50%', transform:'translateX(-50%)',
              background:'rgba(127,29,29,0.95)', border:'1px solid rgba(239,68,68,0.5)',
              borderRadius:12, padding:'10px 20px', zIndex:1000, maxWidth:380,
              color:'#fca5a5', fontSize:'0.78rem', fontFamily:'serif', textAlign:'center',
              backdropFilter:'blur(8px)',
            }}
          >
            {rewardError}
          </motion.div>
        )}
      </AnimatePresence>

      {pagePhase === 'battle' && activeEnemy && initState && battleDerived && (
        <div style={{ maxWidth:520, margin:'0 auto', padding:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16, paddingTop:12 }}>
            <motion.button
              onClick={() => { setPagePhase('select'); setActiveEnemy(null); setInitState(null); setBattleDerived(null); }}
              whileHover={{ scale:1.05 }} whileTap={{ scale:0.95 }}
              style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(88,28,135,0.3)', border:'1px solid rgba(168,85,247,0.3)', borderRadius:10, padding:'7px 12px', color:'#c4b5fd', cursor:'pointer', fontSize:'0.82rem' }}
            >
              <ArrowLeft size={14} /> Pilih Lawan Lain
            </motion.button>
            <div>
              <p style={{ fontSize:'0.7rem', color:'#a855f7', fontWeight:700, margin:0 }}>
                ⚔️ Arena · {activeEnemy.battle_name}
              </p>
              <p style={{ fontSize:'0.6rem', color:'#6b7280', margin:0 }}>
                ⚔️ Damage dihitung secara lokal
              </p>
            </div>
          </div>

          <BattleScreen
            enemy={activeEnemy}
            initState={initState}
            playerName={player.name}
            playerGender={player.gender}
            playerLevel={player.level}
            skillSlots={skillSlots}
            rightHandWeaponType={rightHandWeaponType}
            physAtk={battleDerived.totalPhysAtk}
            magAtk={battleDerived.totalMagAtk}
            physDef={battleDerived.totalPhysDef}
            dodge={battleDerived.dodge}
            critRate={battleDerived.critRate}
            critDamage={battleDerived.critDamage}
            stamRegen={20}
            manaRegen={battleDerived.meditationGain}
            battleToken={battleTokenRef.current ?? ''}
            onEnd={handleBattleEnd}
          />
        </div>
      )}
    </div>
  );
}
