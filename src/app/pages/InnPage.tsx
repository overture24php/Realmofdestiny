// ═══════════════════════════════════════════════════════════════════════════════
// InnPage — Tile-based RPG  ·  Auth-protected  ·  Sprite walk animation
//
// Architecture:
//   • requestAnimationFrame game-loop; DOM mutated directly via refs (60 fps)
//   • React state only for: mapId, reactFacing, fadeAlpha, player auth
//   • Male: real sprite walk frames (6-frame cycle, c_trim auto-crop)
//   • Female: CSS placeholder
//
// Walk animation rules:
//   • Tap (quick press/release)    → always shows frame 1
//   • Hold                         → frames advance 1→2→3→4→5→6→1… per tile
//   • Left movement                → flip sprite (scaleX -1)
//   • Right movement               → normal (scaleX 1)
//   • Up / Down                    → use LAST horizontal direction for flip
//   • Idle                         → return to frame 1, breathing CSS animation
// ════════════════════════════════���══════════════════════════════════════════════

import {
  useState, useEffect, useRef, useCallback,
  useLayoutEffect,
} from "react";
import { useNavigate } from "react-router";
import { useGame }     from "../contexts/GameContext";
import {
  TILE_SIZE, CHAR_W, CHAR_H, MOVE_MS,
  T, WALKABLE, MAPS as INN_MAPS, MapTransition, MapProp, DialogEvent, TileMap,
} from "../data/innMapData";
import { VILLAGE_MAP } from "../data/villageMapData";
import { getLevelProgress, getExpInLevel, getExpForNextLevel } from "../data/levelData";
import InventoryModal from "../components/game/InventoryModal";
import { useMapData } from "../hooks/useMapData";
import { MapLoadingScreen } from "../components/game/MapLoadingScreen";

// ── Static fallback map registry ──────────────────────────────────────────────
const MAPS: Record<string, TileMap> = { ...INN_MAPS, village: VILLAGE_MAP };

// ── Types ─────────────────────────────────────────────────────────────────────
type Direction = "up" | "down" | "left" | "right";
type MapId     = "inn_room" | "inn_floor2" | "inn_lobby" | "village";
type HorizDir  = "left" | "right";

// ── Game constants ─────────────────────────────────────────────────────────────
const MOVE_SPEED = TILE_SIZE / MOVE_MS;   // px per ms ≈ 0.32
const BODY_BOB   = 2;
const LEG_SWING  = 8;

const DIR_DELTA: Record<Direction, [number, number]> = {
  up:[0,-1], down:[0,1], left:[-1,0], right:[1,0],
};
const KEY_TO_DIR: Record<string, Direction> = {
  ArrowUp:"up",    w:"up",    W:"up",
  ArrowDown:"down", s:"down",  S:"down",
  ArrowLeft:"left", a:"left",  A:"left",
  ArrowRight:"right",d:"right", D:"right",
};

// ── Male sprite walk frames
// IMPORTANT: No c_trim  that transformation causes Cloudinary to return
// an error response on this account, making the <img> invisible.
// Width is corrected purely via CSS (see SPRITE_SCALE below).
const CDN = "https://res.cloudinary.com/dhkethrmc/image/upload/f_auto,q_auto";
const SPRITES_MALE: string[] = [
  `${CDN}/v1775537301/boy_walkinganim_001_ddpwpl.png`,
  `${CDN}/v1775537303/boy_walkinganim_002_ncne1e.png`,
  `${CDN}/v1775537300/boy_walkinganim_003_tu9ayx.png`,
  `${CDN}/v1775537305/boy_walkinganim_004_fembry.png`,
  `${CDN}/v1775537301/boy_walkinganim_005_auucvv.png`,
  `${CDN}/v1775537302/boy_walkinganim_006_f8brem.png`,
];

// Male idle animation frames (2-frame breathing cycle)
const SPRITES_MALE_IDLE: string[] = [
  `${CDN}/v1775542104/boy_idleanim_001_if3cuq.png`,
  `${CDN}/v1775542102/boy_idleanim_002_kde9nr.png`,
];

// How long each idle frame is shown (ms). Two frames × 600ms = 1.2s full cycle.
const IDLE_FRAME_MS = 600;

// How many times to zoom-in horizontally on the sprite.
// The sprite canvas has large transparent padding on left/right; scaleX zooms
// into the character pixels so they fill ~80% of the tile slot.
// Increase if character still looks too narrow; decrease if too wide.
const SPRITE_SCALE = 5.25;

// Male avatar for dialog box
const MALE_AVATAR = "https://res.cloudinary.com/dhkethrmc/image/upload/f_auto,q_auto,e_bgremoval/v1775554980/Avatar_Icon_mvbht1.png";

// ── Lobby NPC — resepsionis idle 2-frame breathing ────────────────────────
const CDN_NPC = "https://res.cloudinary.com/dhkethrmc/image/upload/f_auto,q_auto,e_bgremoval";
const NPC_LOBBY_FRAMES: string[] = [
  `${CDN_NPC}/v1775671764/ide_npc_rv001_pdrdlv.png`,
  `${CDN_NPC}/v1775671798/idle_npc_rv002_qnxkmk.png`,
];
const NPC_FRAME_MS = 700; // ms per frame — full cycle ≈ 1.4 s

// NPC character height — 25% smaller than player (CHAR_H * 0.75), lalu +25% dari itu
const NPC_CHAR_H = Math.round(CHAR_H * 0.75 * 1.25 * 1.10);  // +10% lagi = ~119px

// ── CSS keyframes ────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  /* Idle breathing — origin bottom so feet stay grounded (Guideline 12) */
  @keyframes rpgBreathe {
    0%,100% { transform: scaleY(1); }
    50%      { transform: scaleY(1.03); }
  }
  /* NPC idle breathing — 2-frame sprite + subtle scaleY (Guideline 12) */
  @keyframes npcBreathe {
    0%,100% { transform: scaleY(1);     }
    30%      { transform: scaleY(1.022); }
    70%      { transform: scaleY(1.022); }
  }
  @keyframes doorArchPulse {
    0%,100% { opacity:.65; filter:brightness(1); }
    50%      { opacity:1;   filter:brightness(1.4) drop-shadow(0 0 8px rgba(255,195,70,.95)); }
  }
  @keyframes doorFloorGlow {
    0%,100% { opacity:.3; }
    50%      { opacity:.85; }
  }
  @keyframes hudSlideIn {
    from { opacity:0; transform:translateX(-50%) translateY(-8px); }
    to   { opacity:1; transform:translateX(-50%) translateY(0); }
  }
  @keyframes innSpin {
    to { transform: rotate(360deg); }
  }
  @keyframes dialogSlideUp {
    from { opacity:0; transform:translateY(18px); }
    to   { opacity:1; transform:translateY(0); }
  }
`;

// ─ Tile image assets — Guideline 5: f_auto,q_auto for WebP/AVIF auto-compression
const TILE_IMG = {
  floor    : "https://res.cloudinary.com/dhkethrmc/image/upload/f_auto,q_auto/v1775543817/copy_of_contoh_flat_ground_interior_iznrze_e7ab2f.png",
  wall     : "https://res.cloudinary.com/dhkethrmc/image/upload/f_auto,q_auto/v1775543650/Brick_Wall_Tile_Asset_nci9xi.png",
  wood_wall: "https://res.cloudinary.com/dhkethrmc/image/upload/f_auto,q_auto/v1775628934/Wooden_Wall_Tileset_n7yydk.png",
  roof     : "https://res.cloudinary.com/dhkethrmc/image/upload/f_auto,q_auto/v1775549587/contoh_flat_roof_interior_iuclrr.png",
  deco_door: "https://res.cloudinary.com/dhkethrmc/image/upload/f_auto,q_auto/v1775546367/Single_Door_Tile_r8qtxd.png",
  stair    : "https://res.cloudinary.com/dhkethrmc/image/upload/f_auto,q_auto/v1775546459/contoh_flat_tangga_p5fbnr.png",
};
const GRASS_IMG_URL = "https://res.cloudinary.com/dhkethrmc/image/upload/f_auto,q_auto/v1775989854/mixboard-image_grass_1_nhoj9z.png";

// ── Global image cache — preload once, reuse every canvas frame ───────────────
// Stores HTMLImageElement instances keyed by URL.
// Returns the element if fully decoded, null otherwise (available next frame).
const _imgCache = new Map<string, HTMLImageElement>();
function getImg(url: string): HTMLImageElement | null {
  if (_imgCache.has(url)) {
    const img = _imgCache.get(url)!;
    return img.complete && img.naturalWidth > 0 ? img : null;
  }
  const img = new Image();
  img.src = url;
  _imgCache.set(url, img);
  return null;
}
// Eagerly kick-off preload for all tile images at module load time
[...Object.values(TILE_IMG), GRASS_IMG_URL].forEach(u => getImg(u));
// Preload tileImages overlays dari semua peta yang terdaftar (inn + village)
Object.values({ ...INN_MAPS, village: VILLAGE_MAP }).forEach(m => {
  if (m.tileImages) Object.values(m.tileImages).forEach(u => getImg(u));
});

// ── Shared asset URLs — NEVER evicted from _imgCache ─────────────────────────
// Berisi URL tile dasar, sprite player, dan NPC lobby yang selalu dibutuhkan
// di semua map. Hanya tileImages & props map-spesifik yang boleh di-evict.
// Note: SPRITES_MALE, SPRITES_MALE_IDLE, NPC_LOBBY_FRAMES sudah dideklarasi di atas.
const SHARED_ASSET_URLS: ReadonlySet<string> = new Set<string>([
  ...Object.values(TILE_IMG),
  GRASS_IMG_URL,
  ...SPRITES_MALE,
  ...SPRITES_MALE_IDLE,
  ...NPC_LOBBY_FRAMES,
]);

// ── Asset URL collector per map ───────────────────────────────────────────────
function getMapAssetUrls(map: TileMap): string[] {
  const urls: string[] = [];
  // Tile images overlay (map-specific textures)
  if (map.tileImages) urls.push(...Object.values(map.tileImages));
  // Props / furniture images
  if (map.props) map.props.forEach(p => p.src && urls.push(p.src));
  // Global tile images (always needed, but fast because they'll be cached)
  urls.push(...Object.values(TILE_IMG), GRASS_IMG_URL);
  return [...new Set(urls)]; // dedupe
}

// ── Preload all assets for a target map ──────────────────────────────────────
// Returns a Promise that resolves when every image is fully decoded.
// Reports progress 0→1 via onProgress callback (called per image completion).
// Minimum display time baked-in via caller (see doTransition).
function preloadMapAssets(
  map: TileMap,
  onProgress: (p: number) => void,
): Promise<void> {
  const urls = getMapAssetUrls(map);
  if (urls.length === 0) { onProgress(1); return Promise.resolve(); }

  let loaded = 0;
  const total = urls.length;

  function onDone() {
    loaded++;
    onProgress(Math.min(1, loaded / total));
  }

  return new Promise<void>(resolve => {
    let resolved = false;
    function maybeResolve() {
      if (!resolved && loaded >= total) { resolved = true; resolve(); }
    }

    urls.forEach(url => {
      const existing = _imgCache.get(url);
      if (existing) {
        if (existing.complete && existing.naturalWidth > 0) {
          // Already fully loaded — count immediately
          onDone();
          maybeResolve();
        } else {
          // In-flight load (started elsewhere) — wait for it
          existing.addEventListener("load",  () => { onDone(); maybeResolve(); }, { once: true });
          existing.addEventListener("error", () => { onDone(); maybeResolve(); }, { once: true });
        }
        return;
      }
      // Not in cache — kick off fresh load
      const img = new Image();
      img.addEventListener("load",  () => { onDone(); maybeResolve(); }, { once: true });
      img.addEventListener("error", () => { onDone(); maybeResolve(); }, { once: true });
      img.src = url;
      _imgCache.set(url, img);
    });

    // Safety: if all were already loaded synchronously
    maybeResolve();
  });
}

// ── Evict old map assets from JS memory cache ─────────────────────────────────
// Removes HTMLImageElement references for URLs that:
//   • Belong to oldMap's tileImages / props
//   • Are NOT shared (SHARED_ASSET_URLS)
//   • Are NOT also used by newMap
// Result: GC can reclaim the ImageBitmap memory, reducing device load.
function evictMapAssets(oldMap: TileMap, newMap: TileMap, extraShared: Set<string>) {
  const newMapUrls = new Set(getMapAssetUrls(newMap));
  const combined   = new Set([...SHARED_ASSET_URLS, ...extraShared, ...newMapUrls]);

  // Collect eviction candidates from old map
  const candidates: string[] = [];
  if (oldMap.tileImages) Object.values(oldMap.tileImages).forEach(u => candidates.push(u));
  if (oldMap.props) oldMap.props.forEach(p => p.src && candidates.push(p.src));

  let evicted = 0;
  candidates.forEach(url => {
    if (!combined.has(url)) {
      _imgCache.delete(url);
      evicted++;
    }
  });
  if (evicted > 0) console.log(`[MapLoader] Evicted ${evicted} assets from "${oldMap.id}" cache`);
}

// ── Per-map collision Sets — O(1) lookup instead of Array.includes O(n) ──────
const _blockedSetCache = new Map<string, Set<string>>();
const _allowedSetCache = new Map<string, Set<string>>();
function getBlockedSet(map: TileMap): Set<string> {
  if (!_blockedSetCache.has(map.id))
    _blockedSetCache.set(map.id, new Set(map.blockedTiles ?? []));
  return _blockedSetCache.get(map.id)!;
}
function getAllowedSet(map: TileMap): Set<string> {
  if (!_allowedSetCache.has(map.id))
    _allowedSetCache.set(map.id, new Set(map.allowedTiles ?? []));
  return _allowedSetCache.get(map.id)!;
}

// ── Canvas tile draw helper ───────────────────────────────────────────────────
function _drawGroundTile(
  ctx: CanvasRenderingContext2D,
  tile: number, tx: number, ty: number, sx: number, sy: number,
) {
  const TS = TILE_SIZE;
  switch (tile) {
    case T.FLOOR: case T.OBJ: {
      const img = getImg(TILE_IMG.floor);
      if (img) ctx.drawImage(img, sx, sy, TS, TS);
      else { ctx.fillStyle = "#4a3728"; ctx.fillRect(sx, sy, TS, TS); }
      break;
    }
    case T.STAIR: {
      const img = getImg(TILE_IMG.stair);
      if (img) ctx.drawImage(img, sx, sy, TS, TS);
      else { ctx.fillStyle = "#5a4a38"; ctx.fillRect(sx, sy, TS, TS); }
      break;
    }
    case T.DECO_DOOR: {
      const img = getImg(TILE_IMG.deco_door);
      if (img) ctx.drawImage(img, sx, sy, TS, TS);
      else { ctx.fillStyle = "#3a2a1a"; ctx.fillRect(sx, sy, TS, TS); }
      break;
    }
    case T.GRASS: {
      const img = getImg(GRASS_IMG_URL);
      if (img) ctx.drawImage(img, sx, sy, TS, TS);
      else { ctx.fillStyle = (tx + ty) % 2 === 0 ? "#3a6432" : "#44743d"; ctx.fillRect(sx, sy, TS, TS); }
      break;
    }
    case T.PATH: {
      ctx.fillStyle = (tx + ty) % 2 === 0 ? "#7a6245" : "#8f7a5a";
      ctx.fillRect(sx, sy, TS, TS);
      break;
    }
    case T.TREE: {
      ctx.fillStyle = (tx + ty) % 2 === 0 ? "#152a10" : "#1c3516";
      ctx.fillRect(sx, sy, TS, TS);
      break;
    }
    case T.WATER: {
      ctx.fillStyle = (tx + ty) % 2 === 0 ? "#16406e" : "#1a4e80";
      ctx.fillRect(sx, sy, TS, TS);
      break;
    }
  }
}

// ── PropLayer — furnitur / dekorasi di atas tile layer ───────────────────────
function PropLayer({ props }: { props?: MapProp[] }) {
  if (!props || props.length === 0) return null;
  return (
    <>
      {props.map((prop, i) => {
        const hasZoom = !!prop.contentZoom && prop.contentZoom > 1;
        const zoom    = prop.contentZoom ?? 1;
        const anchor  = prop.zoomAnchor ?? "bottom-center";

        // CSS transform:scale() — TIDAK pakai overflow:hidden agar atap/bagian
        // atas yang melebihi container tetap kelihatan (overflow ke atas = visible).
        // transform tidak mempengaruhi layout; element tetap occupies tileW×tileH.
        const imgStyle: React.CSSProperties = hasZoom
          ? {
              width         : "100%",
              height        : "100%",
              objectFit     : "contain",
              display       : "block",
              userSelect    : "none",
              imageRendering: "pixelated",
              transform     : `scale(${zoom})`,
              transformOrigin:
                anchor === "bottom-center" ? "50% 100%"
                : anchor === "center"      ? "50% 50%"
                : "0% 100%",
            }
          : {
              width         : "100%",
              height        : "100%",
              objectFit     : prop.objectFit ?? "fill",
              display       : "block",
              userSelect    : "none",
              imageRendering: "pixelated",
            };

        return (
          <div
            key={i}
            style={{
              position      : "absolute",
              left          : prop.x * TILE_SIZE,
              top           : prop.y * TILE_SIZE,
              width         : prop.tileW * TILE_SIZE,
              height        : prop.tileH * TILE_SIZE,
              zIndex        : prop.zIndex ?? (100 + prop.y * 10),
              pointerEvents : "none",
              imageRendering: "pixelated",
              // Tidak ada overflow:hidden — biarkan scale overflow ke atas agar atap kelihatan
              filter        : prop.noShadow ? undefined : "drop-shadow(2px 6px 8px rgba(0,0,0,0.65))",
            }}
          >
            <img
              src={prop.src}
              alt={prop.label ?? "prop"}
              draggable={false}
              style={imgStyle}
            />
          </div>
        );
      })}
    </>
  );
}

// ── Character refs bundle ─────────────────────────────────────────────────────
interface CharRefs {
  outer   : React.RefObject<HTMLDivElement>;
  bob     : React.RefObject<HTMLDivElement>;
  breath  : React.RefObject<HTMLDivElement>;
  sprite  : React.RefObject<HTMLImageElement>; // male sprite img
  leftLeg : React.RefObject<HTMLDivElement>;   // female CSS legs
  rightLeg: React.RefObject<HTMLDivElement>;
}

// ── Male Character — sprite-based ─────────────────────────────────────────────
function MaleCharacter({ refs }: { refs: CharRefs }) {
  return (
    <div ref={refs.outer} style={{
      position:"absolute",
      width:CHAR_W, height:CHAR_H,
      zIndex:200, pointerEvents:"none",
      willChange:"transform",
      transformOrigin:"center bottom",
    }}>
      {/* Ground shadow */}
      <div style={{
        position:"absolute", bottom:4, left:"50%",
        transform:"translateX(-50%)",
        width:Math.round(CHAR_W*.75), height:6,
        background:"radial-gradient(ellipse,rgba(0,0,0,.50) 0%,transparent 70%)",
        borderRadius:"50%",
      }}/>

      {/* Body-bob wrapper — game loop sets translateY on this */}
      <div ref={refs.bob} style={{ position:"absolute", inset:0 }}>

        {/* Breathing animation wrapper — paused while walking */}
        <div ref={refs.breath} style={{
          position:"absolute", inset:0,
          transformOrigin:"bottom center",
          // NO CSS animation here — idle is handled by sprite frame swapping
          // (rpgBreathe is kept for FemaleCharacter which uses CSS shapes)
        }}>
          {/*
           * Flex container: centers the scaleX-wrapper horizontally so the
           * character is always in the middle of the tile.
           * position absolute + bottom:0 keeps feet anchored to tile base.
           */}
          <div style={{
            position:"absolute",
            bottom:0, left:0, right:0,
            display:"flex",
            justifyContent:"center",
            alignItems:"flex-end",
          }}>
            {/*
             * scaleX zoom wrapper:
             *   scaleX(SPRITE_SCALE) expands the visible character pixels
             *   to fill ~80% of the tile width.  The transparent padding
             *   around the character overflows (invisible) rather than being
             *   cropped, so no c_trim or overflow:hidden is needed.
             *   transform-origin center-bottom keeps feet grounded.
             *   drop-shadow follows the transparent PNG shape (Guideline 10).
             */}
            <div style={{
              transform:`scaleX(${SPRITE_SCALE})`,
              transformOrigin:"center bottom",
              lineHeight:0,
              filter:"drop-shadow(1px 5px 4px rgba(0,0,0,.70))",
            }}>
              <img
                ref={refs.sprite}
                src={SPRITES_MALE[0]}
                alt=""
                draggable={false}
                style={{
                  display:"block",
                  height:CHAR_H,
                  width:"auto",
                  userSelect:"none",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Female Character — CSS placeholder ───────────────────────────────────────
function FemaleCharacter({ refs, facing }: { refs: CharRefs; facing: Direction }) {
  const isBack = facing === "up";
  return (
    <div ref={refs.outer} style={{
      position:"absolute", width:CHAR_W, height:CHAR_H,
      zIndex:200, pointerEvents:"none",
      filter:"drop-shadow(2px 8px 6px rgba(0,0,0,.75))",
      willChange:"transform",
      transformOrigin:"center bottom",
    }}>
      <div style={{
        position:"absolute",bottom:0,left:"8%",width:"84%",height:10,
        background:"radial-gradient(ellipse,rgba(0,0,0,.5) 0%,transparent 70%)",
        borderRadius:"50%",
      }}/>
      <div ref={refs.bob} style={{position:"absolute",inset:0}}>
        <div ref={refs.breath} style={{
          position:"absolute",inset:0,
          transformOrigin:"bottom center",
          animation:"rpgBreathe 2.6s ease-in-out infinite",
        }}>
          {/* Cape */}
          <div style={{position:"absolute",top:14,left:"8%",width:"84%",height:"66%",
            background:isBack
              ?"linear-gradient(180deg,#be185d 0%,#831843 80%,#500724 100%)"
              :"linear-gradient(180deg,#db2777 0%,#9d174d 80%,#500724 100%)",
            borderRadius:"4px 4px 10px 10px"}}/>
          {/* Robe */}
          <div style={{position:"absolute",top:17,left:"20%",width:"60%",height:"58%",
            background:"linear-gradient(180deg,#ec4899 0%,#be185d 80%,#831843 100%)",
            borderRadius:"3px 3px 6px 6px"}}/>
          {/* Belt */}
          <div style={{position:"absolute",top:Math.round(CHAR_H*.42-8),left:"20%",width:"60%",height:5,
            background:"linear-gradient(90deg,#92400e,#d97706,#92400e)"}}/>
          {/* Head */}
          <div style={{position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",
            width:20,height:21,borderRadius:"50%",
            background:isBack
              ?"radial-gradient(circle,#92400e,#78350f)"
              :"radial-gradient(circle at 38% 35%,#fde68a 0%,#f59e0b 60%,#d97706 100%)",
            border:"1px solid rgba(0,0,0,.22)"}}/>
          {/* Hair — longer for female */}
          <div style={{position:"absolute",top:-4,left:"50%",transform:"translateX(-50%)",
            width:22,height:14,
            background:"linear-gradient(180deg,#831843 0%,#9d174d 100%)",
            borderRadius:"50% 50% 20% 20%"}}/>
          {/* Hair flowing down sides */}
          <div style={{position:"absolute",top:2,left:"14%",width:8,height:20,
            background:"linear-gradient(180deg,#831843,#500724)",
            borderRadius:"0 0 4px 4px"}}/>
          <div style={{position:"absolute",top:2,left:"74%",width:8,height:20,
            background:"linear-gradient(180deg,#831843,#500724)",
            borderRadius:"0 0 4px 4px"}}/>
          {/* Eyes */}
          {!isBack && <>
            <div style={{position:"absolute",top:8,left:"29%",width:3,height:3,borderRadius:"50%",background:"#1e1b4b"}}/>
            <div style={{position:"absolute",top:8,left:"57%",width:3,height:3,borderRadius:"50%",background:"#1e1b4b"}}/>
          </>}
          {/* Legs */}
          <div ref={refs.leftLeg}  style={{position:"absolute",bottom:"10%",left:"21%",width:"23%",height:"18%",background:"#831843",borderRadius:"1px 1px 3px 3px",willChange:"transform"}}/>
          <div ref={refs.rightLeg} style={{position:"absolute",bottom:"10%",left:"54%",width:"23%",height:"18%",background:"#831843",borderRadius:"1px 1px 3px 3px",willChange:"transform"}}/>
          {/* Boots */}
          <div style={{position:"absolute",bottom:0,left:"18%",width:"28%",height:"11%",background:"#1c1917",borderRadius:"1px 1px 4px 4px"}}/>
          <div style={{position:"absolute",bottom:0,left:"51%",width:"28%",height:"11%",background:"#1c1917",borderRadius:"1px 1px 4px 4px"}}/>
        </div>
      </div>
    </div>
  );
}

// ── D-Pad ──────────────────────────────────────────────────────────────────
const CDN_BTN = "https://res.cloudinary.com/dhkethrmc/image/upload/f_auto,q_auto,e_bgremoval";
const DPAD_IMGS = {
  up   : `${CDN_BTN}/v1775656813/Up_Navigation_Button_qpnelk.png`,
  left : `${CDN_BTN}/v1775656808/Left_Navigation_Button_gfohm7.png`,
  right: `${CDN_BTN}/v1775656805/Right_Navigation_Button_dwnqhi.png`,
  down : `${CDN_BTN}/v1775656594/Down_Navigation_Button_ejysf7.png`,
  ok   : `${CDN_BTN}/v1775654505/OK_Button_i5k1uh.png`,
};

const DPAD: { dir: Direction; r: number; c: number }[] = [
  {dir:"up",   r:1,c:2},
  {dir:"left", r:2,c:1},
  {dir:"right",r:2,c:3},
  {dir:"down", r:3,c:2},
];
function DPad({
  onPress, onRelease, showOk, onOk,
}: {
  onPress:(d:Direction)=>void;
  onRelease:(d:Direction)=>void;
  showOk?: boolean;
  onOk?: () => void;
}) {
  // 50% of TILE_SIZE (64px) = 32px
  const B = 32;
  return (
    <div style={{
      position:"absolute",bottom:70,right:20,
      display:"grid",gridTemplateColumns:`repeat(3,${B}px)`,gridTemplateRows:`repeat(3,${B}px)`,
      gap:4,zIndex:300,touchAction:"none",
    }}>
      {DPAD.map(({dir,r,c})=>(
        <button key={dir}
          onPointerDown={e=>{e.preventDefault();onPress(dir);}}
          onPointerUp={()=>onRelease(dir)}
          onPointerLeave={()=>onRelease(dir)}
          style={{
            gridRow:r,gridColumn:c,width:B,height:B,
            background:"none",border:"none",padding:0,
            cursor:"pointer",userSelect:"none",touchAction:"none",
            display:"flex",alignItems:"center",justifyContent:"center",
            filter:"drop-shadow(0 2px 6px rgba(0,0,0,.75))",
          }}
        >
          <img
            src={DPAD_IMGS[dir]}
            alt={dir}
            draggable={false}
            style={{width:B,height:B,objectFit:"contain",imageRendering:"pixelated",pointerEvents:"none"}}
          />
        </button>
      ))}
      {/* OK button — pusat D-pad, tampil saat dialog aktif */}
      {showOk && (
        <button
          onPointerDown={e=>{e.preventDefault();onOk?.();}}
          style={{
            gridRow:2,gridColumn:2,width:B,height:B,
            background:"none",border:"none",padding:0,
            cursor:"pointer",userSelect:"none",touchAction:"none",
            display:"flex",alignItems:"center",justifyContent:"center",
            filter:"drop-shadow(0 0 8px rgba(200,100,255,.8)) drop-shadow(0 2px 6px rgba(0,0,0,.75))",
            animation:"dialogSlideUp .25s ease both",
          }}
        >
          <img
            src={DPAD_IMGS.ok}
            alt="ok"
            draggable={false}
            style={{width:B,height:B,objectFit:"contain",imageRendering:"pixelated",pointerEvents:"none"}}
          />
        </button>
      )}
    </div>
  );
}

// ── DialogBox — RPG Maker style dialog ───────────────────────────────────────
function DialogBox({
  playerName, gender, text, speakerName, speakerAvatar,
}: {
  playerName    : string;
  gender        : string;
  text          : string;
  speakerName?  : string;   // nama NPC — jika kosong tampilkan nama player
  speakerAvatar?: string;   // avatar NPC  — jika kosong tampilkan avatar player
}) {
  const isNpc      = !!speakerName;
  const displayName = speakerName ?? playerName;
  const avatarSrc  = speakerAvatar ?? (gender === "male" ? MALE_AVATAR : null);
  return (
    <div style={{
      position     : "absolute",
      bottom       : 260,
      left         : 12,
      right        : 12,
      zIndex       : 450,
      display      : "flex",
      alignItems   : "stretch",
      gap          : 0,
      background   : "linear-gradient(135deg,rgba(8,2,28,.50) 0%,rgba(15,4,42,.50) 100%)",
      border       : isNpc
        ? "1.5px solid rgba(255,160,80,.60)"
        : "1.5px solid rgba(180,110,255,.65)",
      borderRadius : 14,
      overflow     : "hidden",
      boxShadow    : isNpc
        ? "0 0 40px rgba(200,100,30,.35), 0 8px 32px rgba(0,0,0,.7)"
        : "0 0 40px rgba(130,50,240,.45), 0 8px 32px rgba(0,0,0,.7), inset 0 0 0 1px rgba(255,255,255,.04)",
      animation    : "dialogSlideUp .3s cubic-bezier(.22,.68,0,1.2) both",
    }}>
      {/* Garis aksen kiri — oranye untuk NPC, ungu untuk player */}
      <div style={{
        width:3, flexShrink:0,
        background: isNpc
          ? "linear-gradient(180deg,#f97316,#ea580c,#f97316)"
          : "linear-gradient(180deg,#a855f7,#ec4899,#a855f7)",
      }}/>

      {/* Avatar */}
      <div style={{
        width:72, flexShrink:0,
        display:"flex", alignItems:"center", justifyContent:"center",
        padding:"10px 8px",
        background:"rgba(255,255,255,.025)",
        borderRight: isNpc
          ? "1px solid rgba(255,160,80,.25)"
          : "1px solid rgba(180,110,255,.2)",
      }}>
        <div style={{
          width:52, height:52,
          borderRadius:8,
          overflow:"hidden",
          border: isNpc
            ? "2px solid rgba(255,150,60,.60)"
            : "2px solid rgba(180,110,255,.55)",
          background:"rgba(20,5,55,.8)",
          boxShadow: isNpc
            ? "0 0 12px rgba(255,120,40,.35)"
            : "0 0 12px rgba(150,60,255,.35)",
        }}>
          {avatarSrc
            ? <img src={avatarSrc} alt="avatar" draggable={false}
                style={{width:"100%",height:"100%",objectFit:"cover",imageRendering:"pixelated"}}/>
            : <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:22,color:"rgba(200,160,255,.7)"}}>?</div>
          }
        </div>
      </div>

      {/* Teks dialog */}
      <div style={{
        flex:1, padding:"10px 14px",
        display:"flex", flexDirection:"column", justifyContent:"center", gap:5,
      }}>
        {/* Nama speaker */}
        <div style={{
          fontFamily:"'Cinzel',serif",
          color: isNpc ? "rgba(255,175,90,1)" : "rgba(220,175,255,1)",
          fontSize:12,
          letterSpacing:"0.07em",
          textShadow: isNpc
            ? "0 0 10px rgba(255,130,40,.60)"
            : "0 0 10px rgba(180,100,255,.6)",
        }}>
          {displayName}
        </div>
        {/* Isi dialog */}
        <div style={{
          color     : "rgba(238,225,255,.92)",
          fontSize  : 13,
          lineHeight: 1.55,
        }}>
          &ldquo;{text}&rdquo;
        </div>
      </div>

      {/* Indikator sudut kanan bawah */}
      <div style={{
        position:"absolute", bottom:4, right:12,
        color:"rgba(200,150,255,.55)", fontSize:11,
        fontFamily:"'Cinzel',serif", letterSpacing:"0.05em",
        animation:"doorArchPulse 1.2s ease-in-out infinite",
      }}>▼</div>
    </div>
  );
}

// ── Map HUD ──────────────────────────────────────────────────────────────────
function MapHUD({name}:{name:string}) {
  return (
    <div style={{
      position:"absolute",top:16,left:"50%",zIndex:400,padding:"6px 24px",
      background:"linear-gradient(135deg,rgba(8,2,28,.50) 0%,rgba(15,4,42,.50) 100%)",
      border:"1px solid rgba(165,95,255,.38)",
      borderRadius:30,backdropFilter:"blur(10px)",
      boxShadow:"0 0 24px rgba(105,45,195,.25)",
      animation:"hudSlideIn .45s ease both",whiteSpace:"nowrap",
    }}>
      <span style={{fontFamily:"'Cinzel',serif",color:"rgba(230,200,255,.90)",fontSize:13,letterSpacing:"0.14em"}}>
        {name}
      </span>
    </div>
  );
}

// ── Bag Button — akses tas, di kanan PlayerCard ───────────────────────────────
const BAG_BTN_SRC =
  "https://res.cloudinary.com/dhkethrmc/image/upload/f_auto,q_auto,e_bgremoval/v1775712512/mixboard-image_isi4bu.jpg";

function BagButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Buka Tas"
      style={{
        position       : "relative",
        width          : 66,
        height         : 66,
        flexShrink     : 0,
        padding        : 0,
        background     : "transparent",
        border         : "none",
        cursor         : "pointer",
        transition     : "transform .15s ease, filter .2s ease",
        filter         : "drop-shadow(0 0 6px rgba(168,85,247,.50))",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.filter    = "drop-shadow(0 0 10px rgba(236,72,153,.70)) drop-shadow(0 0 20px rgba(168,85,247,.45)) brightness(1.15)";
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.07)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.filter    = "drop-shadow(0 0 6px rgba(168,85,247,.50))";
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
      }}
      onMouseDown={e => {
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(.92)";
        (e.currentTarget as HTMLButtonElement).style.filter    = "drop-shadow(0 0 4px rgba(168,85,247,.40)) brightness(.9)";
      }}
      onMouseUp={e => {
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.07)";
        (e.currentTarget as HTMLButtonElement).style.filter    = "drop-shadow(0 0 10px rgba(236,72,153,.70)) drop-shadow(0 0 20px rgba(168,85,247,.45)) brightness(1.15)";
      }}
    >
      <img
        src={BAG_BTN_SRC}
        alt="Tas"
        draggable={false}
        style={{
          width          : "100%",
          height         : "100%",
          objectFit      : "contain",
          display        : "block",
          userSelect     : "none",
          pointerEvents  : "none",
        }}
      />
    </button>
  );
}

// ── Player Card — KTP pojok kiri atas ─────────────────────────────────────────
function PlayerCard({
  name, level, experience, gender,
}: {
  name      : string;
  level     : number;
  experience: number;
  gender    : string;
}) {
  const avatarSrc = gender === "male" ? MALE_AVATAR : null;
  const expPct    = getLevelProgress(experience);
  const expIn     = getExpInLevel(experience);
  const expReq    = getExpForNextLevel(level);

  return (
    <div style={{
      width        : 190,
      display      : "flex",
      alignItems   : "center",
      gap          : 0,
      background   : "linear-gradient(135deg,rgba(8,2,28,.50) 0%,rgba(15,4,42,.50) 100%)",
      border       : "1.5px solid rgba(180,110,255,.65)",
      borderRadius : 12,
      overflow     : "hidden",
      boxShadow    : "0 0 32px rgba(130,50,240,.30), 0 6px 24px rgba(0,0,0,.6), inset 0 0 0 1px rgba(255,255,255,.03)",
      backdropFilter: "blur(10px)",
    }}>
      {/* Garis aksen kiri */}
      <div style={{
        width:3, alignSelf:"stretch", flexShrink:0,
        background:"linear-gradient(180deg,#a855f7,#ec4899,#a855f7)",
      }}/>

      {/* Avatar */}
      <div style={{
        width:46, height:46, flexShrink:0, margin:"10px 8px 10px 10px",
        borderRadius:8,
        overflow:"hidden",
        border:"1.5px solid rgba(180,110,255,.50)",
        background:"rgba(20,5,55,.75)",
        boxShadow:"0 0 10px rgba(150,60,255,.30)",
      }}>
        {avatarSrc
          ? <img src={avatarSrc} alt="avatar" draggable={false}
              style={{width:"100%",height:"100%",objectFit:"cover",imageRendering:"pixelated"}}/>
          : <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",
              justifyContent:"center",fontSize:18,color:"rgba(200,160,255,.7)"}}>?</div>
        }
      </div>

      {/* Info */}
      <div style={{
        flex:1, padding:"10px 10px 10px 0",
        display:"flex", flexDirection:"column", gap:3, minWidth:0,
      }}>
        {/* Nickname */}
        <div style={{
          fontFamily   : "'Cinzel',serif",
          color        : "rgba(220,175,255,1)",
          fontSize     : 11,
          letterSpacing: "0.06em",
          textShadow   : "0 0 8px rgba(180,100,255,.55)",
          overflow     : "hidden",
          textOverflow : "ellipsis",
          whiteSpace   : "nowrap",
        }}>
          {name}
        </div>

        {/* Level */}
        <div style={{
          color        : "rgba(196,181,253,.85)",
          fontSize     : 10,
          fontFamily   : "'Cinzel',serif",
          letterSpacing: "0.04em",
        }}>
          Level {level}
        </div>

        {/* EXP bar */}
        <div style={{marginTop:2}}>
          <div style={{
            width:"100%", height:4, borderRadius:3,
            background:"rgba(255,255,255,.08)",
            overflow:"hidden",
          }}>
            <div style={{
              width        : `${expPct}%`,
              height       : "100%",
              borderRadius : 3,
              background   : "linear-gradient(90deg,#7c3aed,#ec4899)",
              transition   : "width .4s ease",
              boxShadow    : "0 0 6px rgba(200,80,255,.60)",
            }}/>
          </div>
          <div style={{
            marginTop  : 2,
            color      : "rgba(160,130,220,.60)",
            fontSize   : 9,
            fontFamily : "serif",
            letterSpacing: "0.02em",
          }}>
            {expIn} / {expReq} EXP
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Loading / auth screen ────────────────────────────────────────────────────
function LoadingScreen({msg}:{msg:string}) {
  return (
    <div style={{
      width:"100vw",height:"100vh",display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",
      background:"radial-gradient(ellipse at center,#1a0535 0%,#060112 100%)",
    }}>
      <div style={{
        width:40,height:40,border:"3px solid rgba(168,85,247,.2)",
        borderTop:"3px solid rgba(168,85,247,.9)",
        borderRadius:"50%",animation:"innSpin .8s linear infinite",marginBottom:20,
      }}/>
      <span style={{fontFamily:"'Cinzel',serif",color:"rgba(200,160,255,.8)",fontSize:14,letterSpacing:"0.1em"}}>
        {msg}
      </span>
    </div>
  );
}

// ── LobbyNPC — Resepsionis di belakang meja, tile y4x2, inn_lobby only ───────
//
// z-index = 8 → di bawah meja resepsionis (zIndex:10, e_bgremoval transparent)
//   sehingga meja menutupi bagian bawah NPC secara natural.
//
// Posisi vertical:  NPC.top = 4*TILE_SIZE - round(CHAR_H * 0.62)
//   → ~62% dari tinggi sprite visible di atas top-edge meja (kepala+bahu+dada)
//   → sisanya tersembunyi di balik counter, memberi ilusi berdiri di balik meja.
//
// Frame swap: setInterval NPC_FRAME_MS (700ms) mutasi imgRef.src langsung
//   (no React re-render) — identik dengan teknik player idle frame swap.
// CSS npcBreathe: scaleY(1) → scaleY(1.022), transformOrigin bottom center
//   sehingga kaki NPC tetap menapak (Guideline 12).
// ─────────────────────────────────────────────────────────────────────────────
function LobbyNPC() {
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // Preload kedua frame sebelum animasi berjalan
    NPC_LOBBY_FRAMES.forEach(url => { const img = new Image(); img.src = url; });

    let frame = 0;
    const id = setInterval(() => {
      frame = 1 - frame;
      if (imgRef.current) imgRef.current.src = NPC_LOBBY_FRAMES[frame];
    }, NPC_FRAME_MS);

    return () => clearInterval(id);
  }, []);

  // ── Pixel position ─────────────────��─────────────────────────────────────
  // NPC berdiri di tile x=2, y=4. Tinggi 25% lebih kecil (NPC_CHAR_H = 86px).
  // Horizontal: center dalam tile (sama dengan formula player)
  // Vertical  : top = desk_pixel_top - visible_height
  //   desk_pixel_top = 4 * TILE_SIZE = 256px (meja tileH=1.875 → tutup s/d 376px)
  //   visible_height = round(NPC_CHAR_H * 0.62) ≈ 53px → kepala + bahu + dada
  const npcLeft = 2 * TILE_SIZE + Math.round((TILE_SIZE - CHAR_W) / 2);               // = 124px
  const npcTop  = 4 * TILE_SIZE - Math.round(NPC_CHAR_H * 0.62) + TILE_SIZE * 0.5;   // +½ tile ke bawah

  return (
    <div style={{
      position     : "absolute",
      left         : npcLeft,
      top          : npcTop,
      width        : CHAR_W,
      height       : NPC_CHAR_H,
      zIndex       : 8,          // bawah meja (10), atas tile layer (1-2)
      pointerEvents: "none",
    }}>
      {/* Ground shadow — tetap di bawah kaki NPC */}
      <div style={{
        position    : "absolute",
        bottom      : 4,
        left        : "50%",
        transform   : "translateX(-50%)",
        width       : Math.round(CHAR_W * 0.75),
        height      : 5,
        background  : "radial-gradient(ellipse,rgba(0,0,0,.40) 0%,transparent 70%)",
        borderRadius: "50%",
      }}/>

      {/* Breathing wrapper — transformOrigin bottom agar kaki tidak terangkat */}
      <div style={{
        position       : "absolute",
        inset          : 0,
        transformOrigin: "bottom center",
        animation      : "npcBreathe 2.4s ease-in-out infinite",
      }}>
        {/* Centering + scaleX zoom — teknik identik dengan player (SPRITE_SCALE) */}
        <div style={{
          position      : "absolute",
          bottom        : 0, left: 0, right: 0,
          display       : "flex",
          justifyContent: "center",
          alignItems    : "flex-end",
        }}>
          <div style={{
            transform      : `scaleX(${SPRITE_SCALE})`,
            transformOrigin: "center bottom",
            lineHeight     : 0,
            // Guideline 10: drop-shadow mengikuti bentuk PNG transparan
            filter         : "drop-shadow(1px 5px 4px rgba(0,0,0,.65))",
          }}>
            <img
              ref={imgRef}
              src={NPC_LOBBY_FRAMES[0]}
              alt="Resepsionis Penginapan"
              draggable={false}
              style={{
                display       : "block",
                height        : NPC_CHAR_H,
                width         : "auto",
                userSelect    : "none",
                imageRendering: "pixelated",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// InnPage — Main Component
// ═══════════════════════════════════════════════════════════════════════════════
export default function InnPage() {

  // ── Auth + player data ──────────────────────────────────────────────────
  const { player, loading } = useGame();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !player) navigate("/login", { replace: true });
  }, [player, loading, navigate]);

  // ── Dynamic map data from Supabase (DB overrides static, fallback ke MAPS) ─
  const { mapsRef: liveMapsRef } = useMapData();
  /** Ambil map aktif — DB override > static fallback */
  const getMap = (id: string) => liveMapsRef.current[id] ?? MAPS[id];

  // ── React state (triggers re-render only when truly needed) ───────────────
  const [mapId       , setMapId       ] = useState<MapId>("inn_room");
  const [reactFacing , setReactFacing ] = useState<Direction>("down");
  const [fadeAlpha   , setFadeAlpha   ] = useState(0);
  const [showInventory, setShowInventory] = useState(false);

  // ── Map loading screen state ─────────────────────────────────────────────
  const [mapLoading, setMapLoading] = useState<{
    show    : boolean;
    progress: number;
    mapName : string;
  }>({ show: false, progress: 0, mapName: "" });

  // ── Canvas refs — tile layer is drawn to canvas, not DOM divs ───────────────
  // groundCanvasRef: all non-roof tiles  (z:0, below character)
  // roofCanvasRef  : ROOF tiles only     (z:300, above character)
  const groundCanvasRef = useRef<HTMLCanvasElement>(null);
  const roofCanvasRef   = useRef<HTMLCanvasElement>(null);
  const [activeDialog,      setActiveDialog     ] = useState<DialogEvent    | null>(null);
  // Pending interaction — player pada trigger tile, menunggu OK press
  const [pendingTransition, setPendingTransition] = useState<MapTransition  | null>(null);
  const [pendingDialog,     setPendingDialog    ] = useState<DialogEvent    | null>(null);

  const vpRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // ── Character DOM refs ────────────────────────────────────────────────────
  const charRefs: CharRefs = {
    outer   : useRef<HTMLDivElement>(null)   as React.RefObject<HTMLDivElement>,
    bob     : useRef<HTMLDivElement>(null)   as React.RefObject<HTMLDivElement>,
    breath  : useRef<HTMLDivElement>(null)   as React.RefObject<HTMLDivElement>,
    sprite  : useRef<HTMLImageElement>(null) as React.RefObject<HTMLImageElement>,
    leftLeg : useRef<HTMLDivElement>(null)   as React.RefObject<HTMLDivElement>,
    rightLeg: useRef<HTMLDivElement>(null)   as React.RefObject<HTMLDivElement>,
  };

  // ── Game-state refs ──────────────────────────────────────────────────────
  const _initSpawn = MAPS["inn_room"].defaultSpawn;   // x:2, y:4
  const visualPx          = useRef({ x: _initSpawn.x*TILE_SIZE, y: _initSpawn.y*TILE_SIZE });
  const tilePos           = useRef({ x: _initSpawn.x, y: _initSpawn.y });
  const targetPx          = useRef({ x: _initSpawn.x*TILE_SIZE, y: _initSpawn.y*TILE_SIZE });
  const isMoving          = useRef(false);
  const facingRef         = useRef<Direction>("down");
  const lastHorizDir      = useRef<HorizDir>("right"); // NEVER changes on up/down
  const walkFrameRef      = useRef(0);   // 0-5 → sprite index
  const stepParity        = useRef(0);   // for female CSS leg anim
  const heldDir           = useRef<Direction | null>(null);
  const mapIdRef          = useRef<MapId>("inn_room");
  const inTrans           = useRef(false);
  const lastTs            = useRef(0);
  const startMoveRef      = useRef<(dir: Direction) => void>(() => {});
  const dialogActiveRef   = useRef(false);

  // ── Pending interaction refs (mirror React state — accessible in game loop) ──
  const pendingTransRef   = useRef<MapTransition | null>(null);
  const pendingDialogRef  = useRef<DialogEvent   | null>(null);
  // doTransitionRef — set inside game loop useEffect; allows onInteractOk to call it
  const doTransitionRef   = useRef<(tr: MapTransition) => void>(() => {});

  // ── Idle animation refs (male sprite) ─────────────────────────────────────
  // idleFrameRef  : 0 or 1 — which idle sprite is currently shown
  // idleTimerRef  : ms accumulated since last idle-frame swap
  const idleFrameRef = useRef(0);
  const idleTimerRef = useRef(0);

  // Gender (read once from player data; stable during session)
  const gender = player?.gender ?? "male";

  // ── Preload male sprites ──────────────────────────────────────────────────
  useEffect(() => {
    [...SPRITES_MALE, ...SPRITES_MALE_IDLE].forEach(url => {
      const i = new Image(); i.src = url;
    });
  }, []);

  // ── Canvas resize — set canvas pixel dimensions to match viewport ────────
  // Must match viewport exactly so camera math aligns with canvas draw coords.
  useLayoutEffect(() => {
    if (!player) return;
    const vp = vpRef.current;
    if (!vp) return;
    const sync = () => {
      const w = vp.offsetWidth  || window.innerWidth;
      const h = vp.offsetHeight || window.innerHeight;
      if (groundCanvasRef.current) { groundCanvasRef.current.width = w; groundCanvasRef.current.height = h; }
      if (roofCanvasRef.current)   { roofCanvasRef.current.width   = w; roofCanvasRef.current.height   = h; }
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(vp);
    return () => ro.disconnect();
  }, [player]);

  // ── Initial DOM position before first paint ──────────────────────────────
  useLayoutEffect(() => {
    if (!player || !charRefs.outer.current) return;
    const vp = visualPx.current;
    const cx = vp.x + (TILE_SIZE-CHAR_W)/2;
    const cy = vp.y + TILE_SIZE - CHAR_H + 10;
    charRefs.outer.current.style.transform = `translate(${cx}px,${cy}px) scaleX(1)`;
    if (mapContainerRef.current && vpRef.current) {
      const vpW = vpRef.current.offsetWidth  || window.innerWidth;
      const vpH = vpRef.current.offsetHeight || window.innerHeight;
      const map = getMap(mapIdRef.current);
      const tx  = (map.cols*TILE_SIZE <= vpW) ? (vpW - map.cols*TILE_SIZE)/2 : 0;
      const ty  = (map.rows*TILE_SIZE <= vpH) ? (vpH - map.rows*TILE_SIZE)/2 : 0;
      mapContainerRef.current.style.transform = `translate(${tx}px,${ty}px)`;
    }
  }, [player]); // re-run when player loads so game map shows at correct position // eslint-disable-line react-hooks/exhaustive-deps

  // ── Game loop (runs once — all state via refs) ────────────────────────────
  useEffect(() => {
    if (!player) return; // don't start loop until auth is done

    function startMove(dir: Direction) {
      if (isMoving.current || inTrans.current || dialogActiveRef.current) return;

      // Update facing in React only when it changes (needed for female isBack)
      if (dir !== facingRef.current) {
        facingRef.current = dir;
        setReactFacing(dir);
      }
      // Track last horizontal direction — NEVER updated by up/down
      if (dir === "left") lastHorizDir.current = "left";
      else if (dir === "right") lastHorizDir.current = "right";
      // up / down: lastHorizDir unchanged — sprite keeps its last horizontal flip

      const [dx,dy] = DIR_DELTA[dir];
      const nx = tilePos.current.x + dx;
      const ny = tilePos.current.y + dy;
      const map = getMap(mapIdRef.current);
      if (nx<0||ny<0||nx>=map.cols||ny>=map.rows) return;
      const tt = map.tiles[ny]?.[nx];
      const key = `${nx},${ny}`;
      // Per-tile allowed override — O(1) Set lookup
      if (!getAllowedSet(map).has(key) && !WALKABLE.has(tt ?? T.VOID)) return;
      // Per-tile blocked override — O(1) Set lookup
      if (getBlockedSet(map).has(key)) return;

      // ── Semua validasi kolisi lolos → batalkan pending LALU gerak ──────
      // PENTING: pembatalan dilakukan DI SINI (setelah semua return)
      // sehingga arah yang terblokir (misal menabrak meja) TIDAK menghapus
      // tombol OK yang sedang tampil.
      if (pendingTransRef.current) {
        pendingTransRef.current = null;
        setPendingTransition(null);
      }
      if (pendingDialogRef.current) {
        pendingDialogRef.current = null;
        setPendingDialog(null);
      }

      tilePos.current  = { x: nx, y: ny };
      targetPx.current = { x: nx * TILE_SIZE, y: ny * TILE_SIZE };
      isMoving.current = true;
    }
    startMoveRef.current = startMove;

    function doTransition(tr: MapTransition) {
      if (inTrans.current) return;
      inTrans.current = true;
      heldDir.current = null;

      const oldMapId   = mapIdRef.current;
      const nm         = tr.toMap as MapId;
      const np         = { x: tr.spawnX, y: tr.spawnY };

      // ── Phase 1: Fade to black (400ms CSS transition) ──────────────────────
      setFadeAlpha(1);

      setTimeout(() => {
        // ── Phase 2: Show loading screen over black overlay ────────────────
        const targetMap = getMap(nm);
        const targetMapName = targetMap?.name ?? nm;

        setMapLoading({ show: true, progress: 0, mapName: targetMapName });

        // Extra-shared: empty set (all sprites/NPC frames already in SHARED_ASSET_URLS)
        const extraShared = new Set<string>();

        // Start timer for minimum display (prevents flash on fast-cached loads)
        const loadStart  = Date.now();
        const MIN_DISPLAY = 600; // ms — long enough to read the map name

        // ── Phase 3: Preload all assets for target map ─────────────────────
        preloadMapAssets(targetMap, (p) => {
          setMapLoading(prev => ({ ...prev, progress: p }));
        }).then(() => {
          // ── Phase 4: Evict old map assets from JS memory ─────────────────
          const oldMap = getMap(oldMapId);
          if (oldMap && oldMap.id !== nm) {
            evictMapAssets(oldMap, targetMap, extraShared);
          }

          // ── Phase 5: Switch map state ─────────────────────────────────────
          tilePos.current      = np;
          visualPx.current     = { x: np.x * TILE_SIZE, y: np.y * TILE_SIZE };
          targetPx.current     = { x: np.x * TILE_SIZE, y: np.y * TILE_SIZE };
          isMoving.current     = false;
          mapIdRef.current     = nm;
          facingRef.current    = tr.facing as Direction;
          walkFrameRef.current = 0;
          setMapId(nm);
          setReactFacing(tr.facing as Direction);

          // ── Phase 6: Wait minimum display time, then fade out loading ─────
          const elapsed    = Date.now() - loadStart;
          const remaining  = Math.max(0, MIN_DISPLAY - elapsed);

          setTimeout(() => {
            // Two rAF ticks → ensure React has committed new map tiles to DOM
            // before we start fading out the loading screen
            requestAnimationFrame(() => requestAnimationFrame(() => {
              setMapLoading({ show: false, progress: 1, mapName: "" });
              setFadeAlpha(0);
              setTimeout(() => { inTrans.current = false; }, 500);
            }));
          }, remaining);
        });
      }, 420); // wait for fade-to-black to complete
    }
    // Expose doTransition via ref — allows onInteractOk (outside useEffect) to call it
    doTransitionRef.current = doTransition;

    function updateCharDOM() {
      const vp  = visualPx.current;
      const tgt = targetPx.current;
      const mv  = isMoving.current;
      const flipX = lastHorizDir.current === "left" ? -1 : 1;

      // ── Position + horizontal flip ──────────────────────────────────────
      if (charRefs.outer.current) {
        const cx = vp.x + (TILE_SIZE-CHAR_W)/2;
        const cy = vp.y + TILE_SIZE - CHAR_H + 10;
        charRefs.outer.current.style.transform =
          `translate(${cx}px,${cy}px) scaleX(${flipX})`;
      }

      // ── Walk-cycle math ────────────────────────────────────────────────
      const remX = Math.abs(tgt.x - vp.x);
      const remY = Math.abs(tgt.y - vp.y);
      const progress = mv ? 1 - (remX+remY)/TILE_SIZE : 0; // 0→1
      const swing    = Math.sin(progress*Math.PI)*LEG_SWING;
      const bob      = mv ? -Math.sin(progress*Math.PI)*BODY_BOB : 0;
      const sign     = stepParity.current === 0 ? 1 : -1;

      // ── Breathing — CSS rpgBreathe only for female CSS character ─────────
      // Male idle is handled by sprite frame swap (SPRITES_MALE_IDLE).
      if (charRefs.breath.current && charRefs.leftLeg.current) {
        // leftLeg ref is only set for female → safe guard
        charRefs.breath.current.style.animationPlayState = mv ? "paused" : "running";
      }

      // ── Male sprite: update frame src ───────────────────────────────────
      if (charRefs.sprite.current) {
        charRefs.sprite.current.src = mv
          ? SPRITES_MALE[walkFrameRef.current]
          : SPRITES_MALE_IDLE[idleFrameRef.current];
      }

      // ── Female CSS: bob + leg swing ──────────────────────────────────────
      if (charRefs.bob.current) {
        charRefs.bob.current.style.transform = mv ? `translateY(${bob}px)` : "";
      }
      if (charRefs.leftLeg.current && charRefs.rightLeg.current) {
        if (mv) {
          charRefs.leftLeg.current.style.transform  = `translateX(${sign*swing}px)`;
          charRefs.rightLeg.current.style.transform = `translateX(${-sign*swing}px)`;
        } else {
          charRefs.leftLeg.current.style.transform  = "";
          charRefs.rightLeg.current.style.transform = "";
        }
      }
    }

    function updateCameraDOM() {
      if (!mapContainerRef.current || !vpRef.current) return;
      const vp  = visualPx.current;
      const vpW = vpRef.current.offsetWidth;
      const vpH = vpRef.current.offsetHeight;
      const map = getMap(mapIdRef.current);
      const mW  = map.cols*TILE_SIZE, mH = map.rows*TILE_SIZE;
      const rawX = vp.x + TILE_SIZE/2 - vpW/2;
      const rawY = vp.y + TILE_SIZE/2 - vpH/2;
      const tx = mW<=vpW ? (vpW-mW)/2 : -Math.max(0,Math.min(rawX,mW-vpW));
      const ty = mH<=vpH ? (vpH-mH)/2 : -Math.max(0,Math.min(rawY,mH-vpH));
      mapContainerRef.current.style.transform = `translate(${tx}px,${ty}px)`;

      // ── Canvas tile draw — every frame, O(visible_tiles) ─────────────────
      const gCvs = groundCanvasRef.current;
      const rCvs = roofCanvasRef.current;
      if (!gCvs || !rCvs) return;
      const W = gCvs.width, H = gCvs.height;
      if (W === 0 || H === 0) return;
      const gCtx = gCvs.getContext("2d");
      const rCtx = rCvs.getContext("2d");
      if (!gCtx || !rCtx) return;
      gCtx.imageSmoothingEnabled = false;
      rCtx.imageSmoothingEnabled = false;
      // Camera pixel offset (inverse of CSS transform)
      const camX = mW <= W ? -(W-mW)/2 : Math.max(0, Math.min(rawX, mW-W));
      const camY = mH <= H ? -(H-mH)/2 : Math.max(0, Math.min(rawY, mH-H));
      const TS = TILE_SIZE;
      const x1 = Math.max(0, Math.floor(camX/TS) - 1);
      const y1 = Math.max(0, Math.floor(camY/TS) - 1);
      const x2 = Math.min(map.cols-1, x1 + Math.ceil(W/TS) + 3);
      const y2 = Math.min(map.rows-1, y1 + Math.ceil(H/TS) + 3);
      gCtx.clearRect(0, 0, W, H);
      rCtx.clearRect(0, 0, W, H);
      // Pass 1 — wall-type tiles (drawn first, extend 1 tile upward)
      for (let ty2 = y1; ty2 <= y2; ty2++) {
        for (let tx2 = x1; tx2 <= x2; tx2++) {
          const t = map.tiles[ty2]?.[tx2];
          if (t !== T.WALL && t !== T.WOOD_WALL && t !== T.DOOR && t !== T.INTERACT_DOOR) continue;
          const sx = tx2*TS - camX, sy = ty2*TS - camY;
          const imgUrl = t === T.WALL ? TILE_IMG.wall : TILE_IMG.wood_wall;
          const img = getImg(imgUrl);
          if (img) gCtx.drawImage(img, sx, sy-TS, TS, 2*TS);
          else { gCtx.fillStyle = t === T.WALL ? "#3a2f20" : "#2a1e12"; gCtx.fillRect(sx, sy-TS, TS, 2*TS); }
        }
      }
      // Pass 2 — ground/floor/outdoor tiles (drawn after walls, on top)
      for (let ty2 = y1; ty2 <= y2; ty2++) {
        for (let tx2 = x1; tx2 <= x2; tx2++) {
          const t = map.tiles[ty2]?.[tx2];
          if (t === undefined || t === T.VOID || t === T.WALL || t === T.WOOD_WALL
            || t === T.DOOR || t === T.INTERACT_DOOR || t === T.ROOF) continue;
          _drawGroundTile(gCtx, t, tx2, ty2, tx2*TS - camX, ty2*TS - camY);
        }
      }
      // Pass 3 — tileImages overlay (di atas warna base tile, sebelum roof)
      // Setiap entry map.tileImages["x,y"] = URL gambar tekstur ground
      if (map.tileImages) {
        for (let ty2 = y1; ty2 <= y2; ty2++) {
          for (let tx2 = x1; tx2 <= x2; tx2++) {
            const url = map.tileImages[`${tx2},${ty2}`];
            if (!url) continue;
            const img = getImg(url);
            if (img) {
              const sx = tx2*TS - camX, sy = ty2*TS - camY;
              gCtx.drawImage(img, sx, sy, TS, TS);
            }
          }
        }
      }
      // Pass 4 — roof tiles on separate canvas (above character z:200)
      for (let ty2 = y1; ty2 <= y2; ty2++) {
        for (let tx2 = x1; tx2 <= x2; tx2++) {
          if (map.tiles[ty2]?.[tx2] !== T.ROOF) continue;
          const sx = tx2*TS - camX, sy = ty2*TS - camY;
          const img = getImg(TILE_IMG.roof);
          if (img) rCtx.drawImage(img, sx, sy, TS, TS);
          else { rCtx.fillStyle = "#1a1008"; rCtx.fillRect(sx, sy, TS, TS); }
        }
      }
    }

    function gameLoop(ts: number) {
      const dt = lastTs.current ? Math.min(ts-lastTs.current,50) : 16;
      lastTs.current = ts;

      if (!inTrans.current) {
        if (isMoving.current) {
          const vp   = visualPx.current;
          const tgt  = targetPx.current;
          const step = MOVE_SPEED*dt;
          const remX = tgt.x-vp.x, remY = tgt.y-vp.y;
          const dist = Math.abs(remX)+Math.abs(remY);

          if (dist<=step || dist<0.5) {
            // ── Arrived at tile ───────────────��─────────────────────────
            visualPx.current = {...tgt};
            isMoving.current  = false;
            stepParity.current ^= 1;

            const {x,y} = tilePos.current;
            const tr  = getMap(mapIdRef.current).transitions[`${x},${y}`];
            const dlg = getMap(mapIdRef.current).dialogs?.[`${x},${y}`];

            if (tr) {
              // ── Immediate transition (tangga) → langsung tanpa tombol OK ──
              if (tr.immediate) {
                heldDir.current = null;
                doTransition(tr);
              } else {
                // ── Pending transition (pintu) → tampilkan OK button dulu ──
                heldDir.current         = null;
                pendingTransRef.current = tr;
                setPendingTransition(tr);
              }
            } else if (dlg) {
              // ── Pending dialog: tampilkan OK button dulu (bukan langsung dialog) ──
              heldDir.current          = null;
              pendingDialogRef.current = dlg;
              setPendingDialog(dlg);
            } else if (heldDir.current) {
              // Held: advance walk frame then continue
              walkFrameRef.current = (walkFrameRef.current+1)%6;
              startMove(heldDir.current);
            } else {
              // Released: reset to frame 1 so next tap starts clean
              walkFrameRef.current = 0;
              // Also reset idle so it starts from resting pose (frame 1)
              idleFrameRef.current = 0;
              idleTimerRef.current = 0;
            }
          } else {
            // Still travelling
            const sc = step/dist;
            visualPx.current = {x:vp.x+remX*sc, y:vp.y+remY*sc};
          }
        } else if (heldDir.current) {
          startMove(heldDir.current);
        }
      }

      // ── Idle animation ────────────────────────────────────────────────
      if (!isMoving.current) {
        idleTimerRef.current += dt;
        if (idleTimerRef.current >= IDLE_FRAME_MS) {
          idleTimerRef.current -= IDLE_FRAME_MS;
          idleFrameRef.current = 1 - idleFrameRef.current;
        }
      }

      updateCharDOM();
      updateCameraDOM();
      rafId = requestAnimationFrame(gameLoop);
    }

    updateCharDOM();
    updateCameraDOM();
    let rafId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(rafId);
  }, [player]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Keyboard input ────────────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const dir = KEY_TO_DIR[e.key];
      if (!dir) return;
      e.preventDefault();
      if (heldDir.current === dir) return;

      // NEW key press — reset walk animation to frame 1
      walkFrameRef.current = 0;
      heldDir.current = dir;
      if (!isMoving.current && !inTrans.current) startMoveRef.current(dir);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const dir = KEY_TO_DIR[e.key];
      if (dir && heldDir.current===dir) heldDir.current = null;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup",   onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup",   onKeyUp);
    };
  }, []);

  // ── D-Pad ─────────────────────────────────────────────────────────────────
  const onDPadPress = useCallback((dir: Direction) => {
    if (dialogActiveRef.current) return;   // block movement during dialog
    // New dpad press — reset walk frame to 1
    if (heldDir.current !== dir) walkFrameRef.current = 0;
    heldDir.current = dir;
    if (!isMoving.current && !inTrans.current) startMoveRef.current(dir);
  }, []);
  const onDPadRelease = useCallback((dir: Direction) => {
    if (heldDir.current===dir) heldDir.current = null;
  }, []);

  // ── Unified interaction OK ────────────────────────────────────────────────
  // Urutan prioritas: pendingTransition → pendingDialog → activeDialog
  //   1. pendingTransition : pemain konfirmasi masuk pintu/tangga → doTransition
  //   2. pendingDialog     : pemain klik OK → tampilkan dialog NPC/tile
  //   3. activeDialog      : pemain klik OK → tutup dialog
  const onInteractOk = useCallback(() => {
    // 1. Konfirmasi masuk pintu/tangga
    if (pendingTransRef.current || pendingTransition) {
      const tr = pendingTransRef.current ?? pendingTransition!;
      pendingTransRef.current = null;
      setPendingTransition(null);
      doTransitionRef.current(tr);

    // 2. Tampilkan dialog setelah OK pertama
    } else if (pendingDialogRef.current || pendingDialog) {
      const dlg = pendingDialogRef.current ?? pendingDialog!;
      pendingDialogRef.current = null;
      setPendingDialog(null);
      dialogActiveRef.current = true;
      setActiveDialog(dlg);

    // 3. Tutup dialog setelah OK kedua
    } else if (activeDialog) {
      const rx = activeDialog.returnX;
      const ry = activeDialog.returnY;
      tilePos.current  = { x: rx, y: ry };
      visualPx.current = { x: rx * TILE_SIZE, y: ry * TILE_SIZE };
      targetPx.current = { x: rx * TILE_SIZE, y: ry * TILE_SIZE };
      isMoving.current = false;
      dialogActiveRef.current = false;
      setActiveDialog(null);
    }
  }, [pendingTransition, pendingDialog, activeDialog]);

  // ── Auth guard ───────────────────────────────────────────────────────────
  if (loading)         return <LoadingScreen msg="Memuat data pemain…" />;
  if (!player)         return <LoadingScreen msg="Mengalihkan ke halaman login��" />;

  // ── Derived render values ─────────────────────────────────────────────────
  const currentMap = getMap(mapId);
  const mapPxW = currentMap.cols*TILE_SIZE;
  const mapPxH = currentMap.rows*TILE_SIZE;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{GLOBAL_CSS}</style>

      <div style={{
        width:"100vw", height:"100vh",
        background:currentMap.ambientBg,
        overflow:"hidden", userSelect:"none",
        position:"relative",
      }}>
        {/* Game viewport — full screen */}
        <div ref={vpRef} style={{position:"absolute",inset:0,overflow:"hidden",contain:"strict"}}>

          {/* Ground canvas — game loop draws all non-roof tiles here every frame */}
          <canvas
            ref={groundCanvasRef}
            style={{ position:"absolute", left:0, top:0, zIndex:0, pointerEvents:"none", imageRendering:"pixelated" }}
          />

          {/* Map container — props, character, NPCs only (NO tile DOM elements) */}
          <div ref={mapContainerRef} style={{
            position:"absolute", left:0, top:0,
            width:mapPxW, height:mapPxH,
            willChange:"transform",
          }}>
            {/* Props / furnitur — di atas tile, di bawah karakter */}
            <PropLayer props={currentMap.props} />

            {/* Character — game loop positions this via refs */}
            {gender === "male"
              ? <MaleCharacter refs={charRefs} />
              : <FemaleCharacter refs={charRefs} facing={reactFacing} />
            }

            {/* Lobby NPC — hanya di inn_lobby */}
            {mapId === "inn_lobby" && <LobbyNPC />}
          </div>

          {/* Roof canvas — drawn above character (z:300 > character z:200) */}
          <canvas
            ref={roofCanvasRef}
            style={{ position:"absolute", left:0, top:0, zIndex:300, pointerEvents:"none", imageRendering:"pixelated" }}
          />

          {/* Vignette */}
          <div style={{
            position:"absolute",inset:0,pointerEvents:"none",zIndex:10,
            backgroundImage:`linear-gradient(to bottom,rgba(4,1,16,.55) 0%,transparent 12%,transparent 88%,rgba(4,1,16,.55) 100%)`,
          }}/>

          {/* Fade overlay (transitions) */}
          <div style={{
            position:"absolute",inset:0,zIndex:600,
            background:"#000",opacity:fadeAlpha,pointerEvents:"none",
            transition:"opacity 400ms ease",
          }}/>

          {/* HUD */}
          <MapHUD name={currentMap.name} key={mapId}/>

          {/* Player Card + Bag Button — pojok kiri atas */}
          <div style={{ position:"absolute", top:14, left:14, zIndex:400, display:"flex", alignItems:"flex-start", gap:8 }}>
            <PlayerCard
              name={player.name}
              level={player.level}
              experience={player.experience}
              gender={gender}
            />
            {/* Tombol Tas */}
            <BagButton onClick={() => setShowInventory(true)} />
          </div>

          {/* D-Pad */}
          <DPad
            onPress={onDPadPress}
            onRelease={onDPadRelease}
            showOk={!!pendingTransition || !!pendingDialog || !!activeDialog}
            onOk={onInteractOk}
          />

          {/* Dialog box — RPG Maker style, fixed above D-pad */}
          {activeDialog && (
            <DialogBox
              playerName={player.name}
              gender={gender}
              text={activeDialog.message}
              speakerName={activeDialog.speakerName}
              speakerAvatar={activeDialog.speakerAvatar}
            />
          )}

          {/* Inventory Modal */}
          {showInventory && (
            <InventoryModal onClose={() => setShowInventory(false)} />
          )}
        </div>
      </div>

      {/* ── Map Loading Screen — rendered outside game viewport, above everything ── */}
      <MapLoadingScreen
        visible={mapLoading.show}
        mapName={mapLoading.mapName}
        progress={mapLoading.progress}
      />
    </>
  );
}