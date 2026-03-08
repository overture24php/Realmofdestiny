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

import { dummyImg, maleImg, femaleImg, guardImg } from '../data/imageAssets';

// ── Local Enemy Definitions ────────────────────────────────────────────────────

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
}

interface EnemySkill {
  id          : string;
  name        : string;
  icon        : string;
  damage_mult : number;
  is_ultimate : boolean;
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
    id: 'rookie_guard', name: 'Penjaga Pemula', battle_name: 'Penjaga Pemula',
    level: 3, hp: 160, atk: 12, pdef: 8, mdef: 5,
    reward_exp: 40, reward_gold: 15, is_living: true,
    difficulty: 'Mudah', difficulty_color: '#60a5fa',
    description: 'Penjaga kerajaan yang masih berlatih. Punya beberapa teknik dasar bertarung.',
    sort_order: 2,
    skills: [
      { id: 'guard_slash', name: 'Tebasan Penjaga', icon: '⚔️', damage_mult: 1.3, is_ultimate: false },
    ],
  },
  {
    id: 'veteran_guard', name: 'Penjaga Veteran', battle_name: 'Penjaga Veteran',
    level: 10, hp: 360, atk: 28, pdef: 22, mdef: 15,
    reward_exp: 120, reward_gold: 40, is_living: true,
    difficulty: 'Sedang', difficulty_color: '#fbbf24',
    description: 'Penjaga berpengalaman dengan pertahanan kuat. Mampu menggunakan Shield Guard.',
    sort_order: 3,
    skills: [
      { id: 'power_strike', name: 'Pukulan Keras', icon: '💥', damage_mult: 1.5, is_ultimate: false },
      { id: 'shield_guard', name: 'Tameng Besi',   icon: '🛡️', damage_mult: 0,   is_ultimate: false },
    ],
  },
  {
    id: 'shadow_lurker', name: 'Penghuni Bayangan', battle_name: 'Penghuni Bayangan',
    level: 20, hp: 620, atk: 55, pdef: 30, mdef: 35,
    reward_exp: 280, reward_gold: 90, is_living: true,
    difficulty: 'Sulit', difficulty_color: '#f87171',
    description: 'Makhluk gelap dari dimensi lain. Serangannya cepat dan mematikan.',
    sort_order: 4,
    skills: [
      { id: 'shadow_slash',  name: 'Tebas Bayangan', icon: '🌑', damage_mult: 1.4, is_ultimate: false },
      { id: 'dark_surge',    name: 'Gelombang Gelap', icon: '💀', damage_mult: 2.2, is_ultimate: true  },
    ],
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

// ── Avatar Box ────────────────────────────────────────────────────────────────

function AvatarBox({ src, colors, glow, symbol, isHit, isAttacking, isDefeated, isGuarding, flip }: {
  src: string; colors: string[]; glow: string; symbol?: string;
  isHit: boolean; isAttacking?: boolean; isDefeated?: boolean; isGuarding?: boolean; flip?: boolean;
}) {
  const S = 160;
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
      <motion.div style={{
        position: 'absolute', inset: -12, borderRadius: 20,
        background: `radial-gradient(ellipse at center, ${glow}22 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} animate={{ scale:[1,1.08,1], opacity:[0.5,1,0.5] }} transition={{ duration: 3, repeat: Infinity }} />
      <AvatarBorder colors={colors} glow={glow} symbol={symbol} />
      <div style={{ position: 'absolute', inset: 6, borderRadius: 9, overflow: 'hidden', background: `linear-gradient(180deg, ${glow}18 0%, #050010 100%)` }}>
        <img src={src} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'top center', userSelect:'none', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'30%', background:`linear-gradient(0deg, ${glow}44 0%, transparent 100%)`, pointerEvents:'none' }} />
        <AnimatePresence>
          {isHit && (
            <motion.div style={{
              position:'absolute', inset:0, borderRadius:9,
              background:'radial-gradient(ellipse at center, rgba(255,60,60,0.75) 0%, rgba(255,0,0,0.3) 100%)',
              mixBlendMode:'screen', pointerEvents:'none',
            }} initial={{ opacity:0 }} animate={{ opacity:[0,1,0.6,0] }} transition={{ duration:0.45 }} />
          )}
        </AnimatePresence>
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
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2,
        padding:'10px 4px', borderRadius:11, border:'none',
        cursor: active ? 'pointer' : 'not-allowed',
        background: active ? gradient : '#374151',
        color:'#fff', fontFamily:'serif', fontWeight:800, fontSize:'0.85rem',
        opacity: active ? 1 : 0.5,
        boxShadow: active ? `0 4px 18px ${glow}` : 'none',
        transition:'all 0.2s',
      }}>
      <div style={{ display:'flex', alignItems:'center', gap:5 }}>
        {icon} {label}
      </div>
      {subtitle && <span style={{ fontSize:'0.55rem', opacity:0.75, fontFamily:'sans-serif', fontWeight:400 }}>{subtitle}</span>}
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
                  <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginTop:6 }}>
                    <span style={{ fontSize:'0.62rem', color:'#fca5a5' }}>❤️ {enemy.hp} HP</span>
                    <span style={{ fontSize:'0.62rem', color:'#fb923c' }}>⚔️ {enemy.atk} ATK</span>
                    <span style={{ fontSize:'0.62rem', color:'#93c5fd' }}>🛡️ {enemy.pdef} DEF</span>
                  </div>
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
  const avatarSrc = playerGender === 'female' ? femaleImg : maleImg;
  const enemySrc  = enemy.is_living ? guardImg : dummyImg;
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

  const [playerAnim,  setPlayerAnim]  = useState(false);
  const [enemyAnim,   setEnemyAnim]   = useState(false);
  const [playerHit,   setPlayerHit]   = useState(false);
  const [enemyHit,    setEnemyHit]    = useState(false);
  const [enemyGuard,  setEnemyGuard]  = useState(false);
  const [endClaimed,  setEndClaimed]  = useState(false);

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

  // ── Server-Driven Turn Engine ─────────────────────────────────────────────
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
    setPlayerAnim(true);
    setTimeout(() => setPlayerAnim(false), 400);

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
    const newClientBuffs   = result.player_buffs.map(toActiveBuff);
    const newClientDebuffs = result.enemy_debuffs.map(toActiveBuff);

    // ── Log & animate DOT/HOT results ────────────────────────────────────────
    if (result.dot_enemy_dmg > 0) {
      addLog(`🩸 DOT! ${enemy.battle_name} -${result.dot_enemy_dmg} HP dari efek aktif`, 'enemy');
    }
    if (result.hot_player_heal > 0) {
      addLog(`💚 Regenerasi! ${playerName} +${result.hot_player_heal} HP`, 'skill');
    }

    // ── Log player action ─────────────────────────────────────────────────────
    if (result.player_dmg > 0) {
      const sk         = result.skill_id ? getSkillById(result.skill_id) : null;
      const isMagic    = (sk?.magMultiplier ?? 0) > 0;
      const hitColor   = result.is_crit ? '#FBBF24' : isMagic ? '#c084fc' : '#F87171';
      const hits       = result.hit_damages.length > 0 ? result.hit_damages : [result.player_dmg];
      const isMultiHit = hits.length > 1;
      const HIT_INTERVAL = 280; // ms between each hit animation

      if (isMultiHit) {
        // ── Multi-hit: spawn each hit with staggered timing ───────────────────
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
        }, hits.length * HIT_INTERVAL);

      } else {
        // ── Single hit (normal attack or single-hit skill) ────────────────────
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
      }
    } else if (action === 'skill' && skillId && result.player_dmg === 0) {
      const sk = getSkillById(skillId);
      if (sk) addLog(`${sk.icon} ${playerName} menggunakan ${sk.name}!`, 'skill');
    }

    // ── Update display states (gunakan resolved values, bukan raw result.*) ───
    setEnemyHp(resolvedEnemyHp);
    setPlayerBuffs(newClientBuffs);
    setEnemyDebuffs(newClientDebuffs);
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

    // ── Victory from player action or DOT ────────────────────────────────────
    if (result.victory && result.enemy_action.type === 'dummy') {
      // Wooden dummy doesn't have enemy turn, and DOT victory → immediate
      setEnemyHp(0);
      setTimeout(() => {
        setPhase('victory');
        addLog(`🏆 ${enemy.battle_name} dikalahkan! Kemenangan!`, 'system');
      }, 400);
      return;
    }
    if (result.victory && resolvedEnemyHp <= 0 && result.enemy_action.dmg === 0 && !result.enemy_action.is_guard) {
      // Victory before enemy acts (but after DOT tick might have done it)
      setEnemyHp(0);
      setTimeout(() => {
        setPhase('victory');
        addLog(`🏆 ${enemy.battle_name} dikalahkan! Kemenangan!`, 'system');
      }, 400);
      return;
    }

    // ── Enemy turn animations ─────────────────────────────────────────────────
    // For multi-hit skills, wait until all individual hit animations have played
    // before starting the enemy counter-attack. Single hit keeps the 700ms default.
    const _multiHits = result.hit_damages.length > 1 ? result.hit_damages.length : 0;
    const enemyTurnDelay = _multiHits > 0 ? (_multiHits * 280) + 450 : 700;

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

      // Guard action
      if (ea.is_guard) {
        setEnemyGuard(true);
        addLog(`🛡️ ${enemy.battle_name} menggunakan ${ea.name}!`, 'skill');
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
        addLog(`${ea.icon} ${enemy.battle_name} menggunakan ${ea.name}!`, ea.is_ultimate ? 'crit' : 'skill');

        if (ea.is_dodged) {
          setPlayerHit(true);
          setTimeout(() => setPlayerHit(false), 400);
          spawnFloat('DODGE', 'player', '#fbbf24');
          addLog(`💨 ${playerName} menghindar!`, 'miss');
        } else if (result.was_parried && ea.dmg === 0) {
          setPlayerHit(true);
          setTimeout(() => setPlayerHit(false), 400);
          spawnFloat('TANGKIS!', 'player', '#60a5fa');
          addLog(`🔰 TANGKIS SEMPURNA! Serangan ${enemy.battle_name} ditangkis total!`, 'skill');
        } else if (ea.dmg > 0) {
          setPlayerHit(true);
          setTimeout(() => setPlayerHit(false), 500);
          spawnFloat(ea.dmg, 'player', '#fb923c');
          const suffix   = ea.is_ultimate ? ' ⚡ ULTIMATE!' : '';
          const parryNote = result.parry_reduced > 0 ? ` (tangkis -${result.parry_reduced})` : '';
          addLog(`${playerName} terkena ${ea.name}!${suffix} -${ea.dmg} HP${parryNote}`, 'enemy');
          // Reflect
          if (result.reflect_dmg > 0) {
            spawnFloat(result.reflect_dmg, 'enemy', '#f0abfc');
            addLog(`↩️ Pantul! ${result.reflect_dmg} damage dikembalikan ke ${enemy.battle_name}!`, 'skill');
            setEnemyHp(resolvedEnemyHp); // reflect might kill enemy
          }
        }

        setPlayerHp(resolvedPlayerHp);
        // setPlayerStam / setPlayerMana sudah diupdate immediate di atas

        if (result.defeat) {
          setTimeout(() => {
            setPhase('defeat');
            addLog('💀 Kamu gugur dalam pertempuran...', 'system');
          }, 500);
          return;
        }

        if (result.victory) {
          setTimeout(() => {
            setPhase('victory');
            addLog(`🏆 ${enemy.battle_name} dikalahkan! (Serangan balik)`, 'system');
          }, 400);
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
      const t = setTimeout(() => onEnd('defeat', { hp: snap.playerHp, stamina: snap.stamina, mana: snap.mana }), 2200);
      return () => clearTimeout(t);
    }
  }, [phase, onEnd]);

  const isActive = phase === 'player_turn';

  return (
    <div style={{
      background:'linear-gradient(170deg, #0d0520 0%, #160835 50%, #08020f 100%)',
      border:'1.5px solid rgba(168,85,247,0.25)', borderRadius:20, overflow:'hidden',
      boxShadow:'0 0 60px rgba(168,85,247,0.08), 0 30px 80px rgba(0,0,0,0.95)',
    }}>

      {/* Header */}
      <div style={{
        background:'linear-gradient(90deg, rgba(127,29,29,0.5), rgba(88,28,135,0.5))',
        borderBottom:'1px solid rgba(168,85,247,0.2)',
        padding:'10px 20px', display:'flex', alignItems:'center', justifyContent:'space-between',
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
             : phase === 'processing'  ? '⏳ Memproses...'
             : phase === 'enemy_turn'  ? `${enemySymbol} Giliran ${enemy.battle_name}`
             : '⏳ Memproses...'}
          </span>
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end' }}>
          <span style={{ fontSize:'0.6rem', color:'#4b5563', letterSpacing:'0.15em' }}>ARENA LATIHAN</span>
          <span style={{ fontSize:'0.55rem', color:'#a855f7' }}>⚔️ Battle Engine Lokal</span>
        </div>
      </div>

      {/* ── Resource Panel: Stamina & Mana di atas battlefield ─────────────── */}
      <div style={{
        padding:'10px 20px 8px',
        background:'linear-gradient(90deg, rgba(0,0,0,0.6), rgba(15,5,30,0.7))',
        borderBottom:'1px solid rgba(168,85,247,0.15)',
        display:'flex', gap:16,
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
        position:'relative', display:'flex', alignItems:'center', justifyContent:'space-around',
        padding:'32px 24px 24px',
        background:'linear-gradient(180deg, #0f172a 0%, #1a0a2e 60%, #0f172a 100%)',
        borderBottom:'1px solid rgba(168,85,247,0.12)', minHeight:280, gap:12,
      }}>
        <div style={{ position:'absolute', bottom:20, left:'10%', right:'10%', height:1,
          background:'linear-gradient(90deg, transparent, rgba(168,85,247,0.3), transparent)' }} />
        <div style={{ position:'absolute', left:'50%', top:'50%', transform:'translate(-50%,-50%)',
          fontFamily:'serif', fontWeight:900, fontSize:'3.5rem', color:'rgba(255,255,255,0.05)',
          pointerEvents:'none', letterSpacing:'0.05em', userSelect:'none' }}>VS</div>

        {/* Player */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, flex:1 }}>
          <div style={{ width:160, textAlign:'center' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
              <span style={{ fontSize:'0.72rem', fontWeight:700, color:gt.colors[1], fontFamily:'serif' }}>{playerName}</span>
              <span style={{ fontSize:'0.65rem', color:'#6b7280', fontFamily:'monospace' }}>❤️ {playerHp}</span>
            </div>
            <HpBar hp={playerHp} maxHp={initState.player_max_hp} color="from-green-500 to-emerald-400" />
            {/* Active buff indicators */}
            {playerBuffs.length > 0 && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:3, justifyContent:'center', marginTop:4 }}>
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
          </div>
          <div style={{ position:'relative' }}>
            <AvatarBox src={avatarSrc} colors={gt.colors} glow={gt.glow}
              symbol={playerGender === 'female' ? '♀' : '♂'}
              isHit={playerHit} isAttacking={playerAnim} />
            <div style={{ position:'absolute', top:0, left:0, right:0, height:0, overflow:'visible', zIndex:30 }}>
              {floats.filter(f => f.target === 'player').map(f => (
                <DamageFloat key={f.id} float={f} onDone={() => removeFloat(f.id)} />
              ))}
            </div>
          </div>
        </div>

        {/* Enemy */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, flex:1 }}>
          <div style={{ width:160, textAlign:'center' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
              <span style={{ fontSize:'0.72rem', fontWeight:700, color:'#fca5a5', fontFamily:'serif' }}>{enemy.battle_name}</span>
              <span style={{ fontSize:'0.65rem', color:'#6b7280', fontFamily:'monospace' }}>{enemyHp}/{initState.enemy_max_hp}</span>
            </div>
            <HpBar hp={enemyHp} maxHp={initState.enemy_max_hp} color="from-red-500 to-orange-400" />
            {/* Enemy debuff indicators */}
            {enemyDebuffs.length > 0 && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:3, justifyContent:'center', marginTop:4 }}>
                {enemyDebuffs.map(d => {
                  const cfg: Record<string, { icon:string; color:string }> = {
                    bleed_dot      : { icon:'🩸', color:'#f87171' },
                    poison_dot     : { icon:'🐍', color:'#4ade80' },
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
              </div>
            )}
            {enemyGuard && (
              <motion.div initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }}
                style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:4, marginTop:4 }}>
                <Shield style={{ width:11, height:11, color:'#60a5fa' }} />
                <span style={{ fontSize:'0.6rem', color:'#60a5fa' }}>Shield Guard Aktif!</span>
              </motion.div>
            )}
          </div>
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

        {/* Turn indicator */}
        <AnimatePresence>
          {phase === 'player_turn' && (
            <motion.div style={{
              position:'absolute', bottom:10, left:'50%', transform:'translateX(-50%)',
              background:'rgba(120,53,15,0.85)', border:'1px solid rgba(251,191,36,0.5)',
              borderRadius:20, padding:'4px 16px', fontSize:'0.72rem', fontWeight:700, color:'#fff',
              backdropFilter:'blur(4px)', whiteSpace:'nowrap',
            }} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:10 }}>
              ⚔️ Giliranmu!
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Battle Log */}
      <div style={{ margin:'0 20px 16px', background:'rgba(0,0,0,0.5)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, overflow:'hidden' }}>
        <div style={{ padding:'6px 12px', borderBottom:'1px solid rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:'0.6rem', color:'#4b5563', letterSpacing:'0.18em', textTransform:'uppercase', fontWeight:700 }}>✦ Log Pertarungan ✦</span>
        </div>
        <div style={{ padding:12, maxHeight:130, overflowY:'auto', display:'flex', flexDirection:'column', gap:5 }}>
          <AnimatePresence initial={false}>
            {log.map(entry => (
              <motion.div key={entry.id}
                initial={{ opacity:0, x:-8, height:0 }} animate={{ opacity:1, x:0, height:'auto' }} transition={{ duration:0.22 }}
                style={{
                  fontSize:'0.72rem', lineHeight:1.5,
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
      </div>

      {/* Actions / Result */}
      <div style={{ padding:'0 20px 24px' }}>
        <AnimatePresence mode="wait">

          {/* Victory */}
          {phase === 'victory' && (
            <motion.div key="victory"
              initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }}
              style={{ textAlign:'center', background:'linear-gradient(135deg, rgba(120,53,15,0.3), rgba(20,83,45,0.3))',
                border:'1.5px solid rgba(251,191,36,0.4)', borderRadius:14, padding:24 }}>
              <div style={{ fontSize:'3rem', marginBottom:8 }}>🏆</div>
              <h3 style={{ fontFamily:'serif', fontWeight:900, color:'#fbbf24', fontSize:'1.5rem', marginBottom:4 }}>KEMENANGAN!</h3>
              <p style={{ color:'#9ca3af', fontSize:'0.82rem', marginBottom:16 }}>
                {enemy.battle_name} dikalahkan!
              </p>
              <div style={{ display:'flex', justifyContent:'center', gap:16, marginBottom:20 }}>
                <div style={{ background:'rgba(88,28,135,0.3)', border:'1px solid rgba(168,85,247,0.4)', borderRadius:10, padding:'10px 24px' }}>
                  <p style={{ fontSize:'0.62rem', color:'#6b7280', marginBottom:2 }}>EXP</p>
                  <p style={{ fontFamily:'serif', fontWeight:800, color:'#c4b5fd', fontSize:'1.3rem' }}>+{enemy.reward_exp}</p>
                </div>
                <div style={{ background:'rgba(120,53,15,0.3)', border:'1px solid rgba(251,191,36,0.4)', borderRadius:10, padding:'10px 24px' }}>
                  <p style={{ fontSize:'0.62rem', color:'#6b7280', marginBottom:2 }}>Gold</p>
                  <p style={{ fontFamily:'serif', fontWeight:800, color:'#fbbf24', fontSize:'1.3rem' }}>+{enemy.reward_gold} 🪙</p>
                </div>
              </div>
              <motion.button
                onClick={() => {
                  if (endClaimed) return;
                  setEndClaimed(true);
                  // SERVER-SIDE v2: Victory sudah divalidasi server.
                  // claim_battle_reward hanya butuh token — tidak ada data dari client.
                  const snap = { ...battleRef.current };
                  onEnd('victory',
                    { hp: snap.playerHp, stamina: snap.stamina, mana: snap.mana },
                    { exp: enemy.reward_exp, gold: enemy.reward_gold, turns: snap.turnCount }
                  );
                }}
                disabled={endClaimed}
                whileHover={endClaimed ? {} : { scale:1.03 }}
                whileTap={endClaimed ? {} : { scale:0.97 }}
                style={{ width:'100%', padding:'12px 0',
                  background: endClaimed ? '#374151' : 'linear-gradient(90deg, #b45309, #16a34a)',
                  borderRadius:10, border:'none',
                  cursor: endClaimed ? 'not-allowed' : 'pointer',
                  color:'#fff', fontWeight:800, fontSize:'1rem', fontFamily:'serif', opacity: endClaimed ? 0.65 : 1 }}>
                {endClaimed ? '✅ Menyimpan...' : 'Kembali ke Arena'}
              </motion.button>
            </motion.div>
          )}

          {/* Defeat */}
          {phase === 'defeat' && (
            <motion.div key="defeat"
              initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }}
              style={{ textAlign:'center', background:'rgba(127,29,29,0.3)',
                border:'1.5px solid rgba(239,68,68,0.4)', borderRadius:14, padding:24 }}>
              <div style={{ fontSize:'3rem', marginBottom:8 }}>💀</div>
              <h3 style={{ fontFamily:'serif', fontWeight:900, color:'#f87171', fontSize:'1.5rem', marginBottom:4 }}>GUGUR!</h3>
              {playerHp <= 0 ? (
                <>
                  <p style={{ color:'#fca5a5', fontSize:'0.85rem', marginBottom:8 }}>HP kamu habis sepenuhnya...</p>
                  <p style={{ color:'#9ca3af', fontSize:'0.78rem', marginBottom:16 }}>
                    🏥 Kamu akan dibawa ke Klinik Desa untuk pemulihan.
                  </p>
                  <motion.div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}
                    animate={{ opacity:[0.5,1,0.5] }} transition={{ duration:1, repeat:Infinity }}>
                    <p style={{ fontSize:'0.75rem', color:'#f87171' }}>⏳ Menuju Klinik Desa...</p>
                  </motion.div>
                </>
              ) : (
                <>
                  <p style={{ color:'#9ca3af', fontSize:'0.82rem', marginBottom:20 }}>
                    Kamu kalah tapi masih hidup dengan <span style={{ color:'#f87171', fontWeight:700 }}>{playerHp} HP</span> tersisa.
                  </p>
                  <motion.button
                    onClick={() => {
                      if (endClaimed) return;
                      setEndClaimed(true);
                      const snap = { ...battleRef.current };
                      onEnd('defeat', { hp: snap.playerHp, stamina: snap.stamina, mana: snap.mana });
                    }}
                    disabled={endClaimed}
                    whileHover={endClaimed ? {} : { scale:1.03 }} whileTap={endClaimed ? {} : { scale:0.97 }}
                    style={{ width:'100%', padding:'12px 0',
                      background: endClaimed ? '#374151' : 'linear-gradient(90deg, #7f1d1d, #991b1b)',
                      borderRadius:10, border:'none',
                      cursor: endClaimed ? 'not-allowed' : 'pointer', color:'#fff',
                      fontWeight:800, fontSize:'1rem', fontFamily:'serif' }}>
                    Kembali ke Arena
                  </motion.button>
                </>
              )}
            </motion.div>
          )}

          {/* Actions */}
          {(phase === 'player_turn' || phase === 'processing' || phase === 'enemy_turn') && (
            <motion.div key="actions" initial={{ opacity:0 }} animate={{ opacity:1 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
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
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
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
              <div style={{ marginBottom:8 }}>
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
