/**
 * itemSvgArt.tsx
 * Hand-crafted SVG illustrations for each item — fills slot edge-to-edge.
 * These are used as artwork when a figma:asset photo is not available.
 */

import type { CSSProperties } from 'react';

interface SvgArtProps {
  style?: CSSProperties;
}

// ── Belati Kayu (Wooden Dagger) ───────────────────────────────────────────────
export function WoodenDaggerSvg({ style }: SvgArtProps) {
  return (
    <svg viewBox="0 0 120 200" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: '100%', display: 'block', ...style }}
      preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="dgBg" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#7f1d1d" stopOpacity="0.7"/>
          <stop offset="100%" stopColor="#1a0505" stopOpacity="1"/>
        </radialGradient>
        <linearGradient id="dgBlade" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#4b1c1c"/>
          <stop offset="35%"  stopColor="#d4a373"/>
          <stop offset="50%"  stopColor="#f5e6c8"/>
          <stop offset="65%"  stopColor="#d4a373"/>
          <stop offset="100%" stopColor="#4b1c1c"/>
        </linearGradient>
        <linearGradient id="dgHandle" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#2d1b0e"/>
          <stop offset="30%"  stopColor="#6b3a1f"/>
          <stop offset="55%"  stopColor="#92501e"/>
          <stop offset="80%"  stopColor="#6b3a1f"/>
          <stop offset="100%" stopColor="#2d1b0e"/>
        </linearGradient>
        <linearGradient id="dgGuard" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#1a0a05"/>
          <stop offset="50%"  stopColor="#78350f"/>
          <stop offset="100%" stopColor="#1a0a05"/>
        </linearGradient>
        <filter id="dgGlow">
          <feGaussianBlur stdDeviation="2.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {/* Background glow */}
      <rect width="120" height="200" fill="url(#dgBg)"/>
      <ellipse cx="60" cy="80" rx="28" ry="60" fill="#ef444422"/>

      {/* Blade — narrow pointed dagger */}
      <polygon points="60,12 67,110 60,120 53,110"
        fill="url(#dgBlade)" filter="url(#dgGlow)"/>
      {/* Blade edge shine */}
      <line x1="60" y1="12" x2="60" y2="110" stroke="#fff8f0" strokeWidth="0.8" strokeOpacity="0.55"/>

      {/* Cross-guard */}
      <rect x="38" y="115" width="44" height="9" rx="4.5"
        fill="url(#dgGuard)" stroke="#78350f" strokeWidth="1"/>
      <ellipse cx="38.5" cy="119.5" rx="4.5" ry="4.5" fill="#92400e"/>
      <ellipse cx="81.5" cy="119.5" rx="4.5" ry="4.5" fill="#92400e"/>

      {/* Handle — wood grain */}
      <rect x="51" y="124" width="18" height="52" rx="6"
        fill="url(#dgHandle)"/>
      {/* Wood grain lines */}
      {[131,138,145,152,159,166].map(y => (
        <line key={y} x1="52" y1={y} x2="68" y2={y}
          stroke="#2d1b0e" strokeWidth="1" strokeOpacity="0.5"/>
      ))}

      {/* Pommel */}
      <ellipse cx="60" cy="178" rx="10" ry="7" fill="#78350f" stroke="#92400e" strokeWidth="1.5"/>
      <ellipse cx="60" cy="177" rx="5"  ry="3.5" fill="#a05020"/>

      {/* Rarity sparkles */}
      {[[22,30],[98,45],[18,155],[100,140]].map(([x,y],i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="1.5" fill="#ef4444" opacity="0.7"/>
          <line x1={x-3} y1={y}   x2={x+3} y2={y}   stroke="#ef4444" strokeWidth="0.6" opacity="0.5"/>
          <line x1={x}   y1={y-3} x2={x}   y2={y+3} stroke="#ef4444" strokeWidth="0.6" opacity="0.5"/>
        </g>
      ))}
    </svg>
  );
}

// ── Prisai Kayu (Wooden Shield) ───────────────────────────────────────────────
export function WoodenShieldSvg({ style }: SvgArtProps) {
  return (
    <svg viewBox="0 0 160 180" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: '100%', display: 'block', ...style }}
      preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="shBg" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="#92400e" stopOpacity="0.5"/>
          <stop offset="100%" stopColor="#1a0802" stopOpacity="1"/>
        </radialGradient>
        <linearGradient id="shWood" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#3b1a08"/>
          <stop offset="20%"  stopColor="#7c3a16"/>
          <stop offset="40%"  stopColor="#a0522d"/>
          <stop offset="60%"  stopColor="#8b4513"/>
          <stop offset="80%"  stopColor="#6b3010"/>
          <stop offset="100%" stopColor="#3b1a08"/>
        </linearGradient>
        <linearGradient id="shBoss" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#d97706"/>
          <stop offset="50%"  stopColor="#92400e"/>
          <stop offset="100%" stopColor="#451a03"/>
        </linearGradient>
        <filter id="shGlow">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect width="160" height="180" fill="url(#shBg)"/>
      {/* Outer glow */}
      <ellipse cx="80" cy="85" rx="55" ry="65" fill="#d9770622"/>

      {/* Shield silhouette — heater/kite shape */}
      <path d="M80,18 L145,50 L145,105 Q145,155 80,172 Q15,155 15,105 L15,50 Z"
        fill="url(#shWood)" stroke="#92400e" strokeWidth="2" filter="url(#shGlow)"/>

      {/* Wood plank lines horizontal */}
      {[52,72,92,112,130].map(y => (
        <line key={y} x1="22" y1={y} x2="138" y2={y}
          stroke="#2d1505" strokeWidth="1.8" strokeOpacity="0.45"/>
      ))}

      {/* Wood grain texture vertical subtle */}
      {[42,65,80,95,118].map(x => (
        <line key={x} x1={x} y1="20" x2={x} y2="165"
          stroke="#5a2a0e" strokeWidth="0.7" strokeOpacity="0.25"/>
      ))}

      {/* Iron border rim */}
      <path d="M80,18 L145,50 L145,105 Q145,155 80,172 Q15,155 15,105 L15,50 Z"
        fill="none" stroke="#78350f" strokeWidth="4" strokeOpacity="0.8"/>
      <path d="M80,18 L145,50 L145,105 Q145,155 80,172 Q15,155 15,105 L15,50 Z"
        fill="none" stroke="#d97706" strokeWidth="1.5" strokeOpacity="0.4"/>

      {/* Cross brace */}
      <line x1="80" y1="22" x2="80" y2="168"
        stroke="#78350f" strokeWidth="5" strokeOpacity="0.7"/>
      <line x1="18" y1="90" x2="142" y2="90"
        stroke="#78350f" strokeWidth="5" strokeOpacity="0.7"/>
      <line x1="80" y1="22" x2="80" y2="168"
        stroke="#d97706" strokeWidth="1.5" strokeOpacity="0.35"/>
      <line x1="18" y1="90" x2="142" y2="90"
        stroke="#d97706" strokeWidth="1.5" strokeOpacity="0.35"/>

      {/* Center boss (umbo) */}
      <circle cx="80" cy="90" r="18" fill="url(#shBoss)" stroke="#92400e" strokeWidth="2"/>
      <circle cx="80" cy="90" r="10" fill="#d97706" strokeWidth="1.5" stroke="#f59e0b"/>
      <circle cx="77" cy="87" r="4"  fill="#fde68a" opacity="0.8"/>

      {/* Corner rivets */}
      {[[38,56],[122,56],[28,120],[132,120]].map(([cx,cy],i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r="5" fill="#92400e" stroke="#d97706" strokeWidth="1.2"/>
          <circle cx={cx-1} cy={cy-1} r="2" fill="#fde68a" opacity="0.6"/>
        </g>
      ))}

      {/* Sparkle */}
      {[[22,25],[135,30],[18,155],[140,148]].map(([x,y],i) => (
        <g key={i} opacity="0.7">
          <circle cx={x} cy={y} r="1.8" fill="#d97706"/>
          <line x1={x-4} y1={y}   x2={x+4} y2={y}   stroke="#d97706" strokeWidth="0.7"/>
          <line x1={x}   y1={y-4} x2={x}   y2={y+4} stroke="#d97706" strokeWidth="0.7"/>
        </g>
      ))}
    </svg>
  );
}

// ── Busur Kayu (Wooden Bow) ───────────────────────────────────────────────────
export function WoodenBowSvg({ style }: SvgArtProps) {
  return (
    <svg viewBox="0 0 120 200" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: '100%', display: 'block', ...style }}
      preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="bwBg" cx="50%" cy="50%" r="65%">
          <stop offset="0%" stopColor="#365314" stopOpacity="0.6"/>
          <stop offset="100%" stopColor="#0d1a04" stopOpacity="1"/>
        </radialGradient>
        <linearGradient id="bwLimb" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#1a3a08"/>
          <stop offset="30%"  stopColor="#4d7c0f"/>
          <stop offset="55%"  stopColor="#6b9e15"/>
          <stop offset="80%"  stopColor="#4d7c0f"/>
          <stop offset="100%" stopColor="#1a3a08"/>
        </linearGradient>
        <filter id="bwGlow">
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect width="120" height="200" fill="url(#bwBg)"/>
      <ellipse cx="60" cy="100" rx="35" ry="80" fill="#84cc1614"/>

      {/* Bow limbs — curved path */}
      {/* Left limb upper */}
      <path d="M60,15 Q30,60 32,100 Q30,140 60,185"
        fill="none" stroke="url(#bwLimb)" strokeWidth="9" strokeLinecap="round"
        filter="url(#bwGlow)"/>
      {/* Limb highlight */}
      <path d="M60,15 Q30,60 32,100 Q30,140 60,185"
        fill="none" stroke="#84cc16" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.4"/>

      {/* Bowstring */}
      <line x1="60" y1="15" x2="60" y2="185"
        stroke="#e5e7eb" strokeWidth="1.5" strokeOpacity="0.85"/>

      {/* String wrap at tips */}
      <ellipse cx="60" cy="15"  rx="4" ry="5" fill="#d97706" stroke="#92400e" strokeWidth="1"/>
      <ellipse cx="60" cy="185" rx="4" ry="5" fill="#d97706" stroke="#92400e" strokeWidth="1"/>

      {/* Grip wrap */}
      {[90,95,100,105,110].map(y => (
        <line key={y} x1="29" y1={y} x2="37" y2={y}
          stroke="#92400e" strokeWidth="2.5" strokeOpacity="0.8"/>
      ))}
      <rect x="29" y="88" width="8" height="25" rx="3"
        fill="#78350f" opacity="0.7"/>

      {/* Arrow on bow */}
      <line x1="60" y1="35" x2="60" y2="170"
        stroke="#a16207" strokeWidth="1.8" strokeOpacity="0.55"/>
      {/* Arrowhead */}
      <polygon points="60,28 56,40 64,40"
        fill="#d97706" opacity="0.7"/>
      {/* Fletching */}
      <polygon points="60,168 56,180 60,175" fill="#ef4444" opacity="0.5"/>
      <polygon points="60,168 64,180 60,175" fill="#f97316" opacity="0.5"/>

      {/* Leaf decorations */}
      {[[45,50],[42,145],[72,55],[73,148]].map(([x,y],i) => (
        <ellipse key={i} cx={x} cy={y} rx="4" ry="7"
          fill="#84cc16" opacity="0.35"
          transform={`rotate(${i%2===0?'-25':'25'},${x},${y})`}/>
      ))}

      {/* Sparkles */}
      {[[18,20],[100,22],[15,175],[102,172]].map(([x,y],i) => (
        <g key={i} opacity="0.65">
          <circle cx={x} cy={y} r="1.8" fill="#84cc16"/>
          <line x1={x-4} y1={y}   x2={x+4} y2={y}   stroke="#84cc16" strokeWidth="0.7"/>
          <line x1={x}   y1={y-4} x2={x}   y2={y+4} stroke="#84cc16" strokeWidth="0.7"/>
        </g>
      ))}
    </svg>
  );
}

// ── Tongkat Kayu (Wooden Staff) ───────────────────────────────────────────────
export function WoodenStaffSvg({ style }: SvgArtProps) {
  return (
    <svg viewBox="0 0 120 200" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: '100%', display: 'block', ...style }}
      preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="stBg" cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor="#4c1d95" stopOpacity="0.7"/>
          <stop offset="100%" stopColor="#0d0520" stopOpacity="1"/>
        </radialGradient>
        <radialGradient id="stOrb" cx="38%" cy="35%" r="70%">
          <stop offset="0%"   stopColor="#e9d5ff"/>
          <stop offset="25%"  stopColor="#c084fc"/>
          <stop offset="60%"  stopColor="#7c3aed"/>
          <stop offset="100%" stopColor="#2e1065"/>
        </radialGradient>
        <linearGradient id="stShaft" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#1e0b40"/>
          <stop offset="30%"  stopColor="#5b2fa0"/>
          <stop offset="55%"  stopColor="#7c3aed"/>
          <stop offset="80%"  stopColor="#5b2fa0"/>
          <stop offset="100%" stopColor="#1e0b40"/>
        </linearGradient>
        <filter id="stGlow">
          <feGaussianBlur stdDeviation="4" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="orbGlow">
          <feGaussianBlur stdDeviation="5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect width="120" height="200" fill="url(#stBg)"/>

      {/* Aura glow behind orb */}
      <ellipse cx="60" cy="48" rx="30" ry="30" fill="#a855f744" filter="url(#stGlow)"/>

      {/* Staff shaft */}
      <rect x="55" y="62" width="10" height="132" rx="5"
        fill="url(#stShaft)" filter="url(#stGlow)"/>
      {/* Shaft rune marks */}
      {[85,110,135,160].map((y,i) => (
        <g key={y}>
          <line x1="56" y1={y} x2="64" y2={y}
            stroke="#c084fc" strokeWidth="1.2" strokeOpacity={i%2===0?0.6:0.3}/>
        </g>
      ))}
      {/* Shaft highlight */}
      <rect x="58" y="62" width="2.5" height="132" rx="1.25"
        fill="#c084fc" opacity="0.25"/>

      {/* Shaft tip */}
      <polygon points="60,190 55,194 60,200 65,194"
        fill="#7c3aed" stroke="#c084fc" strokeWidth="1"/>

      {/* Collar ring */}
      <rect x="50" y="60" width="20" height="8" rx="4"
        fill="#4c1d95" stroke="#a855f7" strokeWidth="1.2"/>

      {/* Orb socket */}
      <circle cx="60" cy="46" r="24" fill="#1e0b40" stroke="#7c3aed" strokeWidth="2"/>

      {/* Magic orb */}
      <circle cx="60" cy="46" r="20" fill="url(#stOrb)" filter="url(#orbGlow)"/>

      {/* Orb inner glow highlights */}
      <ellipse cx="53" cy="40" rx="7" ry="6" fill="#f3e8ff" opacity="0.45"/>
      <circle  cx="50" cy="38" r="3" fill="#fff" opacity="0.3"/>

      {/* Swirling rune in orb */}
      <path d="M52,46 Q60,38 68,46 Q60,54 52,46"
        fill="none" stroke="#e9d5ff" strokeWidth="1.2" strokeOpacity="0.5"/>
      <path d="M60,38 Q68,46 60,54 Q52,46 60,38"
        fill="none" stroke="#e9d5ff" strokeWidth="1.2" strokeOpacity="0.5"/>

      {/* Orbiting sparkles */}
      {[
        [60,22,0], [82,38,60], [78,62,120],
        [60,72,180], [38,62,240], [38,32,300],
      ].map(([x,y,r], i) => (
        <g key={i} opacity="0.8">
          <circle cx={x} cy={y} r="2.2" fill="#e9d5ff"/>
          <circle cx={x} cy={y} r="4" fill="#c084fc" opacity="0.3"/>
        </g>
      ))}

      {/* Corner sparkles */}
      {[[15,15],[105,18],[12,185],[108,182]].map(([x,y],i) => (
        <g key={i} opacity="0.6">
          <circle cx={x} cy={y} r="1.8" fill="#a855f7"/>
          <line x1={x-4} y1={y}   x2={x+4} y2={y}   stroke="#a855f7" strokeWidth="0.8"/>
          <line x1={x}   y1={y-4} x2={x}   y2={y+4} stroke="#a855f7" strokeWidth="0.8"/>
        </g>
      ))}
    </svg>
  );
}

// ── Map: defId → SVG component ────────────────────────────────────────────────
export type SvgArtComponent = (props: SvgArtProps) => JSX.Element;

export const ITEM_SVG_ART: Record<string, SvgArtComponent> = {
  wooden_dagger : WoodenDaggerSvg,
  wooden_shield : WoodenShieldSvg,
  wooden_bow    : WoodenBowSvg,
  wooden_staff  : WoodenStaffSvg,
};
