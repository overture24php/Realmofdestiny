// ═══════════════════════════════════════════════════════════════════════════════
// MapEditorPage — Canvas Editor Phase 2 + Collision Override System
// ─────────────────────────────────────────────────────────────────────────────
// Phase 1: canvas tiles + free-scale resizable objects
// Phase 2: layer system + minimap + snap to grid
// Phase 2.5: blockedTiles / allowedTiles per-tile toggle (collision override)
// ═══════════════════════════════════════════════════════════════════════════════

import {
  useState, useCallback, useRef, useEffect, CSSProperties,
} from "react";
import { MAPS as INN_MAPS, T, TileMap } from "../data/innMapData";
import { VILLAGE_MAP } from "../data/villageMapData";
import { getSupabaseClient } from "../../utils/supabase-client";
import { projectId as SUPABASE_PROJECT_ID } from "/utils/supabase/info";
import {
  saveMapToDb, listMapsFromDb,
  MAPS_SETUP_SQL, type MapListItem,
} from "../../utils/supabase-maps";

// ── Constants ──────────────────────────────────────────────────────────────────
const TILE_PX   = 64;
const MIN_OBJ   = 16;
const HANDLE_PX = 10;
const MAX_HIST  = 60;
const MM_W      = 180;
const MM_H      = 120;

// ── Map registry ──────────────────────────────────────────────────────────────
const STATIC_MAPS: Record<string, TileMap> = { ...INN_MAPS, village: VILLAGE_MAP };
const ALL_MAPS: Record<string, TileMap> = { ...STATIC_MAPS };
const MAP_OPTIONS = Object.keys(ALL_MAPS);

// ── Tile styling ──────────────────────────────────────────────────────────────
const TILE_COLOR: Record<number, string> = {
  0:"#0d0720", 1:"#5c3d1e", 2:"#2e2020", 3:"#8a5c32",
  4:"#6e2c1c", 5:"#b08828", 6:"#4a3218", 7:"#231610",
  8:"#100c0c", 9:"#a84818", 10:"#2e5c28", 11:"#7a6340",
  12:"#162810", 13:"#14305a",
};
const TILE_LABEL: Record<number, string> = {
  0:"VOID", 1:"FLOOR", 2:"WALL", 3:"DOOR", 4:"DECO_DOOR",
  5:"STAIR", 6:"OBJ", 7:"WW", 8:"ROOF", 9:"IDOOR",
  10:"GRASS", 11:"PATH", 12:"TREE", 13:"WATER",
};
const BLOCKED_TYPES = new Set<number>([T.WALL, T.WOOD_WALL, T.ROOF, T.TREE, T.WATER]);
const PALETTE_TYPES = [1,10,11,12,13,2,7,8,3,9,5,6,4,0];

// ── Types ─────────────────────────────────────────────────────────────────────
// "block" = collision override tool (Phase 2.5)
// "transition" = tile transition editor (Phase 3)
type Tool        = "paint"|"erase"|"select"|"block"|"transition"|"imgpaint"|"camera";
type LayerId     = "ground"|"objects";
type ResizeHandle = "nw"|"n"|"ne"|"e"|"se"|"s"|"sw"|"w";
type SaveStatus  = "idle"|"saving"|"saved"|"error";

interface TileCell  { baseType:number; }
interface TileTransition {
  toMap:string; spawnX:number; spawnY:number;
  facing:"up"|"down"|"left"|"right"; immediate?:boolean;
}
interface MapObject {
  id:string; src:string; label:string;
  x:number; y:number; w:number; h:number;
  zIndex:number; objectFit:"fill"|"contain"|"cover"; noShadow:boolean;
  contentZoom?:number; zoomAnchor?:"bottom-center"|"center"|"bottom-left";
}
interface Camera   { panX:number; panY:number; scale:number; }
interface HistSnap {
  cells:TileCell[][];
  objects:MapObject[];
  customBlocked:string[];   // serialized for immutable snapshotting
  customAllowed:string[];
  transitions:Array<[string,TileTransition]>; // serialized transitions
  tileImages:Array<[string,string]>;          // Phase 4: image tile data
}
// Phase 4: Image Tile Library entry
interface ImgTileEntry { id:string; url:string; label:string; }
interface Layer { visible:boolean; }

// ── Helpers ───────────────────────────────────────────────────────────────────
const genId = () => `obj-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;

/**
 * Tambah / hapus e_bgremoval dari Cloudinary URL.
 * Guideline 5: posisi transform .../upload/f_auto,q_auto,e_bgremoval/...
 * URL non-Cloudinary dikembalikan apa adanya.
 */
function applyBgRemoval(url: string, enable: boolean): string {
  const raw = url.trim();
  if (!raw.includes('res.cloudinary.com')) return raw;
  const uploadIdx = raw.indexOf('/upload/');
  if (uploadIdx === -1) return raw;
  const base = raw.slice(0, uploadIdx + 8);
  const rest = raw.slice(uploadIdx + 8);
  const slashIdx = rest.indexOf('/');
  const firstSeg = slashIdx === -1 ? rest : rest.slice(0, slashIdx);
  const after    = slashIdx === -1 ? '' : rest.slice(slashIdx);
  const isTransform = (firstSeg.includes('_') || firstSeg.includes(',')) && !/^v\d+$/.test(firstSeg);
  if (enable) {
    if (isTransform) {
      if (firstSeg.includes('e_bgremoval')) return raw;
      return base + firstSeg + ',e_bgremoval' + after;
    }
    return base + 'f_auto,q_auto,e_bgremoval/' + rest;
  } else {
    if (!isTransform || !firstSeg.includes('e_bgremoval')) return raw;
    const parts = firstSeg.split(',').filter(p => p !== 'e_bgremoval');
    const newSeg = parts.join(',');
    return base + (newSeg ? newSeg + after : rest.slice(slashIdx === -1 ? firstSeg.length : firstSeg.length + 1));
  }
}
const hasBgRemoval  = (url: string) => url.includes('e_bgremoval');
const isCloudinaryUrl = (url: string) => url.includes('res.cloudinary.com');

function buildCells(map:TileMap): TileCell[][] {
  return map.tiles.map(row => row.map(t => ({ baseType:t })));
}
function buildObjects(map:TileMap): MapObject[] {
  return (map.props??[]).map((p,i) => ({
    id:`loaded-${i}`, src:p.src, label:p.label??"",
    x:p.x*TILE_PX, y:p.y*TILE_PX,
    w:p.tileW*TILE_PX, h:p.tileH*TILE_PX,
    zIndex:p.zIndex??Math.round(100+p.y*10),
    objectFit:p.objectFit??"fill", noShadow:p.noShadow??false,
    contentZoom:p.contentZoom, zoomAnchor:p.zoomAnchor,
  }));
}
function emptyMap(cols:number, rows:number) {
  return {
    cells:Array.from({length:rows},()=>Array.from({length:cols},()=>({baseType:0}))),
    objects:[] as MapObject[],
  };
}

// ── Canvas tile renderer (with collision overlay) ─────────────────────────────
function renderCanvas(
  ctx:CanvasRenderingContext2D,
  cells:TileCell[][],
  cols:number, rows:number,
  customBlocked:Set<string>,
  customAllowed:Set<string>,
) {
  const W = cols*TILE_PX, H = rows*TILE_PX;
  ctx.clearRect(0,0,W,H);

  for (let ry=0; ry<rows; ry++) {
    for (let cx=0; cx<cols; cx++) {
      const base = cells[ry]?.[cx]?.baseType ?? 0;
      const x = cx*TILE_PX, y = ry*TILE_PX;
      const key = `${cx},${ry}`;

      // Base tile color
      ctx.fillStyle = TILE_COLOR[base]??"#0d0720";
      ctx.fillRect(x,y,TILE_PX,TILE_PX);

      // Default blocked (by tile type) — dim red
      if (BLOCKED_TYPES.has(base) && !customAllowed.has(key)) {
        ctx.fillStyle = "rgba(255,30,30,.1)";
        ctx.fillRect(x,y,TILE_PX,TILE_PX);
      }

      // ── Collision Overrides ──────────────────────────────────────────────
      if (customBlocked.has(key)) {
        // Force-blocked — bright red + X mark
        ctx.fillStyle = "rgba(220,40,40,.5)";
        ctx.fillRect(x,y,TILE_PX,TILE_PX);
        ctx.strokeStyle = "rgba(255,80,80,.9)";
        ctx.lineWidth = 2.5;
        const pad = 10;
        ctx.beginPath();
        ctx.moveTo(x+pad,y+pad); ctx.lineTo(x+TILE_PX-pad,y+TILE_PX-pad);
        ctx.moveTo(x+TILE_PX-pad,y+pad); ctx.lineTo(x+pad,y+TILE_PX-pad);
        ctx.stroke();
      } else if (customAllowed.has(key)) {
        // Force-allowed — green + checkmark
        ctx.fillStyle = "rgba(40,200,80,.38)";
        ctx.fillRect(x,y,TILE_PX,TILE_PX);
        ctx.strokeStyle = "rgba(80,255,120,.9)";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x+12,y+TILE_PX/2);
        ctx.lineTo(x+TILE_PX/2-4,y+TILE_PX-14);
        ctx.lineTo(x+TILE_PX-10,y+14);
        ctx.stroke();
      }
    }
  }

  // Grid lines
  ctx.strokeStyle = "rgba(80,50,150,.22)";
  ctx.lineWidth = 0.5;
  for (let cx=0;cx<=cols;cx++){ctx.beginPath();ctx.moveTo(cx*TILE_PX,0);ctx.lineTo(cx*TILE_PX,H);ctx.stroke();}
  for (let ry=0;ry<=rows;ry++){ctx.beginPath();ctx.moveTo(0,ry*TILE_PX);ctx.lineTo(W,ry*TILE_PX);ctx.stroke();}
}

// ── Global CSS ─────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap');
  .me2-scroll::-webkit-scrollbar{width:5px;height:5px}
  .me2-scroll::-webkit-scrollbar-track{background:rgba(0,0,0,.3)}
  .me2-scroll::-webkit-scrollbar-thumb{background:rgba(140,80,220,.45);border-radius:3px}
  .me2-toolbar-strip::-webkit-scrollbar{display:none}
  @keyframes me2FadeIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
  @keyframes mmPulse{0%,100%{box-shadow:0 0 0 1.5px rgba(160,100,255,.4)}50%{box-shadow:0 0 0 2px rgba(180,120,255,.8)}}
`;
const sH:CSSProperties = {
  fontFamily:"'Cinzel',serif", fontSize:10, letterSpacing:"0.1em",
  color:"rgba(200,160,255,.85)", textTransform:"uppercase",
  borderBottom:"1px solid rgba(140,80,220,.2)", paddingBottom:4, marginBottom:8,
};
const sInp:CSSProperties = {
  width:"100%", padding:"4px 8px", fontSize:11, background:"rgba(10,5,25,.8)",
  border:"1px solid rgba(130,80,220,.35)", borderRadius:5,
  color:"rgba(220,200,255,.9)", outline:"none", fontFamily:"monospace", boxSizing:"border-box",
};
const sBtn = (active=false, accent="#7c3aed"):CSSProperties => ({
  padding:"5px 10px", fontSize:10, fontFamily:"'Cinzel',serif", letterSpacing:"0.05em",
  cursor:"pointer", border:"none", borderRadius:5, whiteSpace:"nowrap",
  background:active?`linear-gradient(135deg,${accent},${accent}cc)`:"rgba(25,12,50,.7)",
  color:active?"#fff":"rgba(180,150,255,.75)",
  outline:active?`1.5px solid ${accent}88`:"1px solid rgba(120,70,210,.3)",
});

const LAYER_META = [
  {id:"objects" as LayerId, label:"Props / Objects", icon:"📦", color:"#c07a00", hint:"Select & resize bangunan/dekorasi"},
  {id:"ground"  as LayerId, label:"Ground Tiles",   icon:"🗺", color:"#6d28d9", hint:"Cat tipe tile · toggle collision"},
];

// ══════════════════════════════════════════════════════════════════════════════
// ResizableObject
// ══════════════════════════════════════════════════════════════════════════════
function ResizableObject({obj,selected,scale,isSelectMode,snapGrid,onPointerDown,onUpdate,onDelete}:{
  obj:MapObject; selected:boolean; scale:number; isSelectMode:boolean; snapGrid:boolean;
  onPointerDown:(e:React.PointerEvent,id:string)=>void;
  onUpdate:(id:string,patch:Partial<MapObject>)=>void;
  onDelete:(id:string)=>void;
}) {
  const hs = HANDLE_PX/scale;
  const handles:{id:ResizeHandle;wx:number;wy:number;cursor:string}[] = [
    {id:"nw",wx:-hs/2,       wy:-hs/2,       cursor:"nwse-resize"},
    {id:"n", wx:obj.w/2-hs/2,wy:-hs/2,       cursor:"ns-resize"},
    {id:"ne",wx:obj.w-hs/2,  wy:-hs/2,       cursor:"nesw-resize"},
    {id:"e", wx:obj.w-hs/2,  wy:obj.h/2-hs/2,cursor:"ew-resize"},
    {id:"se",wx:obj.w-hs/2,  wy:obj.h-hs/2,  cursor:"nwse-resize"},
    {id:"s", wx:obj.w/2-hs/2,wy:obj.h-hs/2,  cursor:"ns-resize"},
    {id:"sw",wx:-hs/2,       wy:obj.h-hs/2,  cursor:"nesw-resize"},
    {id:"w", wx:-hs/2,       wy:obj.h/2-hs/2,cursor:"ew-resize"},
  ];
  const dragRef = useRef<{startCX:number;startCY:number;origX:number;origY:number;origW:number;origH:number;handle:ResizeHandle|null}|null>(null);
  const snap = (v:number) => snapGrid?Math.round(v/TILE_PX)*TILE_PX:v;
  const snapSz = (v:number) => snapGrid?Math.max(TILE_PX,Math.round(v/TILE_PX)*TILE_PX):Math.max(MIN_OBJ,v);
  const startDrag=(e:React.PointerEvent,handle:ResizeHandle|null)=>{
    e.stopPropagation();e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current={startCX:e.clientX,startCY:e.clientY,origX:obj.x,origY:obj.y,origW:obj.w,origH:obj.h,handle};
  };
  const onPtrMove=(e:React.PointerEvent)=>{
    if(!dragRef.current)return;
    const{startCX,startCY,origX,origY,origW,origH,handle}=dragRef.current;
    const dx=(e.clientX-startCX)/scale, dy=(e.clientY-startCY)/scale;
    if(handle===null){onUpdate(obj.id,{x:snap(origX+dx),y:snap(origY+dy)});return;}
    let nx=origX,ny=origY,nw=origW,nh=origH;
    if(handle.includes("e"))nw=snapSz(origW+dx);
    if(handle.includes("s"))nh=snapSz(origH+dy);
    if(handle.includes("w")){nw=snapSz(origW-dx);nx=snap(origX+origW-nw);}
    if(handle.includes("n")){nh=snapSz(origH-dy);ny=snap(origY+origH-nh);}
    onUpdate(obj.id,{x:nx,y:ny,w:nw,h:nh});
  };
  const onPtrUp=()=>{dragRef.current=null;};
  const outlineW=Math.max(1,2/scale);
  return (
    <div style={{position:"absolute",left:obj.x,top:obj.y,width:obj.w,height:obj.h,zIndex:obj.zIndex,
      cursor:isSelectMode?(selected?"move":"pointer"):"default",
      pointerEvents:isSelectMode?"auto":"none",userSelect:"none",
      outline:selected?`${outlineW}px solid rgba(255,200,70,.9)`:"none",boxSizing:"border-box"}}
      onPointerDown={e=>{if(!isSelectMode)return;e.stopPropagation();onPointerDown(e,obj.id);startDrag(e,null);}}
      onPointerMove={onPtrMove} onPointerUp={onPtrUp}
      onContextMenu={e=>{e.preventDefault();e.stopPropagation();if(isSelectMode)onDelete(obj.id);}}>
      <img src={obj.src} alt={obj.label} draggable={false} style={{width:"100%",height:"100%",objectFit:obj.objectFit,display:"block",imageRendering:"pixelated",pointerEvents:"none",filter:obj.noShadow?"none":"drop-shadow(1px 4px 6px rgba(0,0,0,.7))"}}/>
      {selected&&handles.map(h=>(
        <div key={h.id} style={{position:"absolute",left:h.wx,top:h.wy,width:hs,height:hs,background:"rgba(255,200,70,.95)",border:`${Math.max(.5,1/scale)}px solid rgba(0,0,0,.55)`,borderRadius:2,cursor:h.cursor,zIndex:9999,boxShadow:`0 0 ${4/scale}px rgba(255,160,0,.6)`}}
          onPointerDown={e=>startDrag(e,h.id)} onPointerMove={onPtrMove} onPointerUp={onPtrUp}/>
      ))}
      {selected&&snapGrid&&<div style={{position:"absolute",top:`${-14/scale}px`,left:"50%",transform:"translateX(-50%)",background:"rgba(100,200,100,.85)",color:"#fff",fontSize:`${8/scale}px`,padding:`${1/scale}px ${4/scale}px`,borderRadius:`${3/scale}px`,pointerEvents:"none",whiteSpace:"nowrap"}}>⊞ SNAP</div>}
      {selected&&obj.label&&<div style={{position:"absolute",bottom:`${-18/scale}px`,left:0,background:"rgba(0,0,0,.75)",color:"rgba(255,200,80,.9)",fontSize:`${10/scale}px`,padding:`${2/scale}px ${5/scale}px`,borderRadius:`${3/scale}px`,whiteSpace:"nowrap",pointerEvents:"none",fontFamily:"'Crimson Text',serif"}}>{obj.label}</div>}
      {/* contentZoom ghost — shows visual extent at contentZoom scale so editor matches gameplay */}
      {obj.contentZoom && obj.contentZoom > 1 && (()=>{
        const cz = obj.contentZoom;
        const anchor = obj.zoomAnchor ?? "bottom-center";
        const gw = obj.w * cz, gh = obj.h * cz;
        const dx = anchor==="bottom-center" ? -(gw-obj.w)/2 : 0;
        const dy = -(gh-obj.h);
        return (
          <div style={{position:"absolute",left:dx,top:dy,width:gw,height:gh,
            border:`${1.5/scale}px dashed rgba(255,200,60,.55)`,
            background:"rgba(255,200,60,.04)",pointerEvents:"none",boxSizing:"border-box"}}>
            <span style={{position:"absolute",top:2/scale,left:2/scale,fontSize:8/scale,
              color:"rgba(255,200,60,.7)",background:"rgba(0,0,0,.5)",
              padding:`${1/scale}px ${3/scale}px`,borderRadius:2/scale,whiteSpace:"nowrap"}}>
              ×{cz} zoom ({anchor})
            </span>
          </div>
        );
      })()}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Clipboard helper — navigator.clipboard is blocked inside iframes/sandboxes;
// fall back to the legacy document.execCommand approach.
// ══════════════════════════════════════════════════════════════════════════════
function copyToClipboard(text: string): void {
  if (navigator?.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(() => legacyCopy(text));
    return;
  }
  legacyCopy(text);
}
function legacyCopy(text: string): void {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try { document.execCommand("copy"); } catch (_) { /* silent */ }
  document.body.removeChild(ta);
}

// ══════════════════════════════════════════════════════════════════════════════
// Main
// ══════════════════════════════════════════════════════════════════════════════
export default function MapEditorPage() {

  const [mode,        setMode]        = useState<"new"|"edit">("edit");
  const [existingMap, setExistingMap] = useState("inn_lobby");
  const [newCols,     setNewCols]     = useState(20);
  const [newRows,     setNewRows]     = useState(15);
  const [mapName,     setMapName]     = useState("my_map");
  const [editorReady, setEditorReady] = useState(false);
  const [mapCols,     setMapCols]     = useState(0);
  const [mapRows,     setMapRows]     = useState(0);
  const [cells,       setCells]       = useState<TileCell[][]>([]);
  const [objects,     setObjects]     = useState<MapObject[]>([]);

  // Collision overrides (Phase 2.5)
  const [customBlocked, setCustomBlocked] = useState<Set<string>>(new Set());
  const [customAllowed,  setCustomAllowed]  = useState<Set<string>>(new Set());

  // Transition editor (Phase 3)
  const [transitions,      setTransitions]      = useState<Record<string, TileTransition>>({});
  const [editingTransTile, setEditingTransTile] = useState<{tx:number;ty:number}|null>(null);
  const [transDraft,       setTransDraft]       = useState<TileTransition>({toMap:"",spawnX:0,spawnY:0,facing:"down"});
  // Separate controlled value for the custom toMap text input
  const [customMapStr,     setCustomMapStr]     = useState("");

  const [tool,        setTool]        = useState<Tool>("select");
  const [paintType,   setPaintType]   = useState<number>(T.FLOOR);
  const [selectedId,  setSelectedId]  = useState<string|null>(null);
  const [cam,         setCam]         = useState<Camera>({panX:20,panY:20,scale:1});
  const [hoverTile,   setHoverTile]   = useState<{x:number;y:number}|null>(null);
  const [showGrid,    setShowGrid]    = useState(true);
  const [showCollision, setShowCollision] = useState(true);

  const [layers,      setLayers]      = useState<Record<LayerId,Layer>>({ground:{visible:true},objects:{visible:true}});
  const [activeLayer, setActiveLayer] = useState<LayerId>("ground");
  const [snapToGrid,  setSnapToGrid]  = useState(false);
  const [mmExpanded,  setMmExpanded]  = useState(true);

  // UI states
  const [objUrl,      setObjUrl]      = useState("");
  const [objLabel,    setObjLabel]    = useState("");
  const [objBgRemove, setObjBgRemove] = useState(false); // toggle bg removal saat tambah object
  const [showExport,  setShowExport]  = useState(false);
  const [exportCode,  setExportCode]  = useState("");

  // ── Phase 4: Image Tile Painter — MUST be declared before the refs/useEffect that use tileImages ──
  const [tileImages,      setTileImages]      = useState<Record<string,string>>({});
  const [tileImgLib,      setTileImgLib]      = useState<ImgTileEntry[]>([]);
  const [selectedTileImg, setSelectedTileImg] = useState<string|null>(null);
  const [tileImgUrl,      setTileImgUrl]      = useState("");
  const [tileImgLabel,    setTileImgLabel]    = useState("");
  const [showImgLibInput,  setShowImgLibInput]  = useState(false);
  const [showDeployedMgr,  setShowDeployedMgr]  = useState(false);
  const [deployedFilter,   setDeployedFilter]   = useState("");
  const [expandedUrls,     setExpandedUrls]     = useState<Set<string>>(new Set());

  // ── DB Save state ────────────���────────────────────────────────────────────
  const [saveStatus,   setSaveStatus]   = useState<SaveStatus>("idle");
  const [saveMsg,      setSaveMsg]      = useState("");
  const [dbMapList,    setDbMapList]    = useState<MapListItem[]>([]);
  const [allMapsLocal, setAllMapsLocal] = useState<Record<string, TileMap>>(STATIC_MAPS);
  const [showSqlSetup, setShowSqlSetup] = useState(false);

  // ── Auto Setup state ─────────────────────────────────────────────────────���─
  const [setupKey,    setSetupKey]    = useState("");
  const [setupStatus, setSetupStatus] = useState<"idle"|"running"|"done"|"error">("idle");
  const [setupMsg,    setSetupMsg]    = useState("");

  // ── DB Diagnostics state ───────────────────────────────────────────────────
  const [showDiag,    setShowDiag]    = useState(false);
  const [diagSteps,   setDiagSteps]   = useState<Array<{label:string;status:"pending"|"ok"|"fail"|"warn";detail:string}>>([]);
  const [diagRunning, setDiagRunning] = useState(false);

  // Refs
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const minimapRef  = useRef<HTMLCanvasElement>(null);
  const isPanRef    = useRef(false);
  const spaceRef    = useRef(false);
  const lastPanRef  = useRef<{x:number;y:number}|null>(null);
  const isPaintRef  = useRef(false);
  const lastCellRef = useRef<string|null>(null);
  const isBlockPaintRef = useRef<"block"|"allow"|null>(null); // drag direction for block tool
  const isImgPaintRef   = useRef<"paint"|"erase"|null>(null); // Phase 4

  const histRef    = useRef<HistSnap[]>([]);
  const histPosRef = useRef(-1);
  const cellsRef   = useRef(cells);
  const objectsRef = useRef(objects);
  const cbRef      = useRef(customBlocked);
  const caRef      = useRef(customAllowed);
  const transRef      = useRef(transitions);
  const tileImagesRef = useRef<Record<string,string>>({});
  const toolbarRef = useRef<HTMLDivElement>(null);
  useEffect(()=>{cellsRef.current=cells;},[cells]);
  useEffect(()=>{objectsRef.current=objects;},[objects]);
  useEffect(()=>{cbRef.current=customBlocked;},[customBlocked]);
  useEffect(()=>{caRef.current=customAllowed;},[customAllowed]);
  useEffect(()=>{transRef.current=transitions;},[transitions]);
  useEffect(()=>{tileImagesRef.current=tileImages;},[tileImages]);

  // ── Load DB map list on mount ──────────────────────────────────────────────
  useEffect(()=>{
    async function fetchDbMaps() {
      try {
        const supabase = getSupabaseClient();
        const list     = await listMapsFromDb(supabase);
        setDbMapList(list);
        if (list.length > 0) {
          const { data } = await supabase.from("maps").select("id, data");
          if (data) {
            const dbRec: Record<string, TileMap> = Object.fromEntries(
              (data as Array<{id:string;data:TileMap}>).map(r=>[r.id, r.data])
            );
            setAllMapsLocal({ ...STATIC_MAPS, ...dbRec });
          }
        }
      } catch (_) { /* Supabase belum connected — fallback ke static */ }
    }
    fetchDbMaps();
  }, []);

  // ── Build TileMap dari editor state ───────────────────────────────────────
  const buildTileMap = useCallback((): TileMap => {
    const tiles = cellsRef.current.map(row => row.map(c => c.baseType));
    const props = objectsRef.current.map(o => ({
      x      : Math.round(o.x / TILE_PX * 100) / 100,
      y      : Math.round(o.y / TILE_PX * 100) / 100,
      tileW  : Math.round(o.w / TILE_PX * 100) / 100,
      tileH  : Math.round(o.h / TILE_PX * 100) / 100,
      src    : o.src,
      label  : o.label,
      zIndex : o.zIndex,
      ...(o.objectFit !== "fill"                   ? { objectFit  : o.objectFit   } : {}),
      ...(o.noShadow                               ? { noShadow   : true           } : {}),
      ...(o.contentZoom && o.contentZoom > 1       ? { contentZoom: o.contentZoom  } : {}),
      ...(o.zoomAnchor                             ? { zoomAnchor : o.zoomAnchor   } : {}),
    }));
    return {
      id           : mapName,
      name         : mapName,
      cols         : mapCols,
      rows         : mapRows,
      ambientBg    : "radial-gradient(ellipse at center,#1a0535 0%,#060112 100%)",
      defaultSpawn : { x: 1, y: 1, facing: "down" },
      transitions  : { ...transRef.current },
      dialogs      : {},
      tiles,
      blockedTiles : [...cbRef.current],
      allowedTiles : [...caRef.current],
      tileImages   : { ...tileImagesRef.current },
      props,
    };
  }, [mapName, mapCols, mapRows]);

  // ── Save ke Supabase DB ────────────────────────────────────────────────────
  const doSaveToDb = useCallback(async () => {
    if (!editorReady) return;
    setSaveStatus("saving");
    setSaveMsg("");
    try {
      const supabase  = getSupabaseClient();
      const tileMap   = buildTileMap();
      const { error } = await saveMapToDb(supabase, tileMap);
      if (error) {
        const isMissing = error.includes("relation") || error.includes("does not exist") || error.includes("42P01");
        if (isMissing) {
          // Otomatis buka setup wizard
          setSaveStatus("error");
          setSaveMsg("⚠ Tabel belum ada — Setup Wizard terbuka...");
          setTimeout(() => { setShowSqlSetup(true); setSaveStatus("idle"); setSaveMsg(""); }, 600);
        } else {
          setSaveStatus("error");
          setSaveMsg(`Error: ${error}`);
        }
      } else {
        setSaveStatus("saved");
        setSaveMsg(`✓ "${mapName}" tersimpan ke database`);
        // Refresh daftar map dari DB
        const list = await listMapsFromDb(supabase);
        setDbMapList(list);
        const { data } = await supabase.from("maps").select("id, data");
        if (data) {
          const dbRec: Record<string, TileMap> = Object.fromEntries(
            (data as Array<{id:string;data:TileMap}>).map(r=>[r.id, r.data])
          );
          setAllMapsLocal({ ...STATIC_MAPS, ...dbRec });
        }
        setTimeout(() => setSaveStatus("idle"), 3000);
      }
    } catch (e: unknown) {
      setSaveStatus("error");
      setSaveMsg(e instanceof Error ? e.message : "Koneksi Supabase gagal");
    }
  }, [editorReady, buildTileMap, mapName]);

  // ── Auto-create tabel maps via Supabase Management API ────────────────────
  const doAutoSetup = useCallback(async () => {
    const key = setupKey.trim();
    if (!key) { setSetupMsg("⚠ Service Role Key tidak boleh kosong."); return; }

    setSetupStatus("running");
    setSetupMsg("");

    // Gunakan SQL yang sama dengan MAPS_SETUP_SQL (manual option) agar konsisten
    const sql = MAPS_SETUP_SQL.trim();

    try {
      // Gunakan Supabase Management API — butuh project ref + Personal Access Token (PAT)
      // PAT diambil dari: https://supabase.com/dashboard/account/tokens
      const mgmtRes = await fetch(
        `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_ID}/database/query`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: sql }),
        }
      );

      if (mgmtRes.ok) {
        setSetupStatus("done");
        setSetupMsg("✅ Tabel 'maps' berhasil dibuat! Tombol 💾 Simpan ke DB sudah bisa digunakan.");
        return;
      }

      const mgmtErr = await mgmtRes.text();

      if (mgmtErr.includes("Invalid API key") || mgmtRes.status === 401) {
        setSetupStatus("error");
        setSetupMsg(
          "❌ Key tidak valid untuk Management API.\n" +
          "Gunakan Personal Access Token (PAT) dari:\n" +
          "https://supabase.com/dashboard/account/tokens\n\n" +
          "Bukan Service Role Key dari Project Settings!"
        );
      } else if (mgmtErr.includes("already exists")) {
        // Tabel sudah ada — bukan error sebenarnya
        setSetupStatus("done");
        setSetupMsg("✅ Tabel 'maps' sudah ada! Tombol 💾 Simpan ke DB siap digunakan.");
      } else {
        setSetupStatus("error");
        setSetupMsg(`❌ Gagal: ${mgmtRes.status} — ${mgmtErr.slice(0, 200)}`);
      }
    } catch (e: unknown) {
      setSetupStatus("error");
      setSetupMsg(e instanceof Error ? `❌ ${e.message}` : "❌ Gagal terhubung ke Management API");
    }
  }, [setupKey]);

  // ── DB Diagnostics — test setiap layer koneksi ─────────────────────────────
  const doDiagnose = useCallback(async () => {
    setDiagRunning(true);
    const steps: Array<{label:string;status:"pending"|"ok"|"fail"|"warn";detail:string}> = [];
    const push = (label:string, status:"ok"|"fail"|"warn", detail:string) => {
      steps.push({ label, status, detail });
      setDiagSteps([...steps]);
    };

    // 1. Cek apakah Supabase client terbentuk
    let supabase;
    try {
      supabase = getSupabaseClient();
      push("1. Supabase client init", "ok", `Project: ${SUPABASE_PROJECT_ID}`);
    } catch(e) {
      push("1. Supabase client init", "fail", e instanceof Error ? e.message : String(e));
      setDiagRunning(false); return;
    }

    // 2. Ping: baca 1 baris dari tabel apa saja (cek koneksi ke Supabase)
    try {
      const t0 = Date.now();
      const { error } = await supabase.from("maps").select("id").limit(1);
      const ms = Date.now() - t0;
      if (error) {
        const code = (error as {code?:string}).code ?? "";
        if (code === "42P01" || error.message.includes("does not exist")) {
          push("2. Koneksi ke Supabase", "ok", `✓ Supabase reachable (${ms}ms) — tabel 'maps' BELUM ADA`);
          push("3. Tabel 'maps' exists", "fail", `Error ${code}: ${error.message}\n→ Klik tombol 🛠 Setup untuk buat tabel`);
          setDiagRunning(false); return;
        } else if (error.message.includes("JWT") || error.message.includes("apikey") || code === "PGRST301") {
          push("2. Koneksi ke Supabase", "fail", `Auth gagal: ${error.message}\n→ Periksa anon key di /utils/supabase/info.tsx`);
          setDiagRunning(false); return;
        } else {
          push("2. Koneksi ke Supabase", "warn", `Response diterima tapi ada error: ${error.message}`);
        }
      } else {
        push("2. Koneksi ke Supabase", "ok", `✓ Supabase reachable (${ms}ms)`);
        push("3. Tabel 'maps' exists", "ok", "✓ Tabel 'maps' ditemukan di database");
      }
    } catch(e) {
      push("2. Koneksi ke Supabase", "fail",
        `Network error: ${e instanceof Error ? e.message : String(e)}\n→ Pastikan tidak ada firewall/VPN yang block supabase.co`);
      setDiagRunning(false); return;
    }

    // 3. Cek bisa SELECT
    try {
      const { data, error } = await supabase.from("maps").select("id, name").limit(5);
      if (error) {
        push("4. SELECT dari maps", "fail", `${(error as {code?:string}).code}: ${error.message}`);
      } else {
        push("4. SELECT dari maps", "ok", `✓ SELECT ok — ${data?.length ?? 0} row(s) ada di DB`);
      }
    } catch(e) {
      push("4. SELECT dari maps", "fail", e instanceof Error ? e.message : String(e));
    }

    // 4. Coba INSERT test row lalu DELETE
    try {
      const testId = `__diag_test_${Date.now()}`;
      const { error: insErr } = await supabase.from("maps").insert({
        id: testId, name: "__test__",
        data: { id: testId, name: "__test__", cols:1, rows:1, tiles:[[0]], ambientBg:"", defaultSpawn:{x:0,y:0,facing:"down"}, transitions:{}, dialogs:{}, props:[], blockedTiles:[], allowedTiles:[], tileImages:{} },
        updated_at: new Date().toISOString(),
      });
      if (insErr) {
        const isRls = insErr.message.includes("row-level security") || insErr.message.includes("policy");
        push("5. INSERT ke maps (RLS check)", "fail",
          isRls
            ? `RLS memblokir INSERT!\nPolicy 'maps_write_auth' mungkin menggunakan auth.role()='authenticated'\n→ Klik 🛠 Setup untuk recreate policy dengan USING (true)\nDetail: ${insErr.message}`
            : `${(insErr as {code?:string}).code}: ${insErr.message}`
        );
      } else {
        // cleanup
        await supabase.from("maps").delete().eq("id", testId);
        push("5. INSERT ke maps (RLS check)", "ok", "✓ INSERT + DELETE ok — RLS policy mengizinkan write");
      }
    } catch(e) {
      push("5. INSERT ke maps (RLS check)", "fail", e instanceof Error ? e.message : String(e));
    }

    setDiagRunning(false);
  }, []);

  // ── History ────────────────────────────────────────────────────────────────
  const pushHist = useCallback(()=>{
    const snap:HistSnap = {
      cells:cellsRef.current.map(r=>r.map(c=>({...c}))),
      objects:objectsRef.current.map(o=>({...o})),
      customBlocked:[...cbRef.current],
      customAllowed:[...caRef.current],
      transitions:Object.entries(transRef.current).map(([k,v])=>[k,{...v}]),
      tileImages:Object.entries(tileImagesRef.current).map(([k,v])=>[k,v]),
    };
    histRef.current = histRef.current.slice(0,histPosRef.current+1);
    histRef.current.push(snap);
    if(histRef.current.length>MAX_HIST)histRef.current.shift();
    histPosRef.current = histRef.current.length-1;
  },[]);

  const undo = useCallback(()=>{
    if(histPosRef.current<=0)return;
    histPosRef.current--;
    const s=histRef.current[histPosRef.current];
    setCells(s.cells);setObjects(s.objects);
    setCustomBlocked(new Set(s.customBlocked));
    setCustomAllowed(new Set(s.customAllowed));
    setTransitions(Object.fromEntries(s.transitions));
    setTileImages(Object.fromEntries(s.tileImages??[]));
  },[]);

  const redo = useCallback(()=>{
    if(histPosRef.current>=histRef.current.length-1)return;
    histPosRef.current++;
    const s=histRef.current[histPosRef.current];
    setCells(s.cells);setObjects(s.objects);
    setCustomBlocked(new Set(s.customBlocked));
    setCustomAllowed(new Set(s.customAllowed));
    setTransitions(Object.fromEntries(s.transitions));
    setTileImages(Object.fromEntries(s.tileImages??[]));
  },[]);

  // ── Load map ───────────────────────────────────────────────────────────────
  const loadMap = useCallback(()=>{
    let c:TileCell[][], o:MapObject[], cols:number, rows:number, name:string;
    let cb:Set<string>, ca:Set<string>;
    if(mode==="edit"){
      // DB maps override static maps
      const m=allMapsLocal[existingMap] ?? ALL_MAPS[existingMap];
      c=buildCells(m); o=buildObjects(m);
      cols=m.cols; rows=m.rows; name=m.id;
      // ← Load collision overrides from existing map data
      cb=new Set(m.blockedTiles??[]);
      ca=new Set(m.allowedTiles??[]);
    } else {
      const cl=Math.max(1,Math.min(200,newCols));
      const rw=Math.max(1,Math.min(200,newRows));
      const r=emptyMap(cl,rw);
      c=r.cells; o=r.objects; cols=cl; rows=rw; name=mapName;
      cb=new Set(); ca=new Set();
    }
    // Load transitions (DB override static)
    const srcMap = mode==="edit" ? (allMapsLocal[existingMap] ?? ALL_MAPS[existingMap]) : null;
    const srcTrans = srcMap?.transitions ?? {};
    const loadedTrans: Record<string,TileTransition> = {};
    Object.entries(srcTrans).forEach(([k,v])=>{
      const tv = v as TileTransition;
      const entry:TileTransition = {toMap:tv.toMap,spawnX:tv.spawnX??0,spawnY:tv.spawnY??0,facing:tv.facing??"down"};
      if(tv.immediate) entry.immediate=true;
      loadedTrans[k]=entry;
    });
    setTransitions(loadedTrans);
    setEditingTransTile(null);

    // Load tileImages
    const srcTileImages = srcMap?.tileImages ?? {};
    setTileImages({...srcTileImages});

    setCells(c); setObjects(o);
    setCustomBlocked(cb); setCustomAllowed(ca);
    setMapCols(cols); setMapRows(rows); setMapName(name);
    setSelectedId(null);
    histRef.current=[]; histPosRef.current=-1;
    setTimeout(()=>pushHist(),50);
    const vp=viewportRef.current;
    if(vp){
      const scale=Math.min(vp.clientWidth/(cols*TILE_PX),vp.clientHeight/(rows*TILE_PX))*.9;
      setCam({panX:(vp.clientWidth-cols*TILE_PX*scale)/2,panY:(vp.clientHeight-rows*TILE_PX*scale)/2,scale});
    }
    setEditorReady(true);
  },[mode,existingMap,newCols,newRows,mapName,pushHist,allMapsLocal]);

  // ── Canvas draw ─────────────────────────────────────────────────────────────
  useEffect(()=>{
    if(!editorReady||!canvasRef.current)return;
    const ctx=canvasRef.current.getContext("2d");
    if(!ctx)return;
    if(showCollision){
      renderCanvas(ctx,cells,mapCols,mapRows,customBlocked,customAllowed);
    } else {
      // Draw without collision overlays
      renderCanvas(ctx,cells,mapCols,mapRows,new Set(),new Set());
    }
  },[cells,mapCols,mapRows,editorReady,customBlocked,customAllowed,showCollision]);

  // ── Minimap ────────────────────────────────────────────────────────────────
  useEffect(()=>{
    if(!editorReady||!minimapRef.current||!mapCols||!mapRows)return;
    const mm=minimapRef.current;
    const ctx=mm.getContext("2d"); if(!ctx)return;
    ctx.clearRect(0,0,MM_W,MM_H);
    ctx.fillStyle="#0a0515"; ctx.fillRect(0,0,MM_W,MM_H);
    const tW=MM_W/mapCols, tH=MM_H/mapRows;
    for(let ry=0;ry<mapRows;ry++){
      for(let cx=0;cx<mapCols;cx++){
        const base=cells[ry]?.[cx]?.baseType??0;
        const key=`${cx},${ry}`;
        ctx.fillStyle=TILE_COLOR[base]??"#0d0720";
        ctx.fillRect(cx*tW,ry*tH,tW+.5,tH+.5);
        if(customBlocked.has(key)){ctx.fillStyle="rgba(220,40,40,.7)";ctx.fillRect(cx*tW,ry*tH,tW+.5,tH+.5);}
        else if(customAllowed.has(key)){ctx.fillStyle="rgba(40,200,80,.6)";ctx.fillRect(cx*tW,ry*tH,tW+.5,tH+.5);}
        if(transitions[key]){
          // Transition overlay on minimap — yellow diamond
          ctx.fillStyle="rgba(255,210,40,.85)";
          const mx=cx*tW+tW/2, my=ry*tH+tH/2, r=Math.max(1.5,Math.min(tW,tH)/2.2);
          ctx.beginPath();ctx.moveTo(mx,my-r);ctx.lineTo(mx+r,my);ctx.lineTo(mx,my+r);ctx.lineTo(mx-r,my);ctx.closePath();
          ctx.fill();
        }
      }
    }
    if(layers.objects.visible){
      objects.forEach(obj=>{
        ctx.fillStyle="rgba(255,180,60,.35)";
        ctx.fillRect((obj.x/TILE_PX)*tW,(obj.y/TILE_PX)*tH,(obj.w/TILE_PX)*tW,(obj.h/TILE_PX)*tH);
      });
    }
    const vp=viewportRef.current;
    if(vp){
      const vpW=vp.clientWidth,vpH=vp.clientHeight;
      const wx1=-cam.panX/cam.scale, wy1=-cam.panY/cam.scale;
      const wx2=wx1+vpW/cam.scale, wy2=wy1+vpH/cam.scale;
      ctx.strokeStyle="rgba(180,120,255,.9)"; ctx.lineWidth=1.5;
      ctx.strokeRect((wx1/TILE_PX)*tW,(wy1/TILE_PX)*tH,((wx2-wx1)/TILE_PX)*tW,((wy2-wy1)/TILE_PX)*tH);
    }
    ctx.strokeStyle="rgba(140,80,220,.35)"; ctx.lineWidth=1;
    ctx.strokeRect(0,0,MM_W,MM_H);
  },[cells,objects,transitions,cam,mapCols,mapRows,editorReady,layers.objects.visible,customBlocked,customAllowed]);

  const onMinimapClick=useCallback((e:React.MouseEvent<HTMLCanvasElement>)=>{
    if(!minimapRef.current||!viewportRef.current)return;
    const rect=minimapRef.current.getBoundingClientRect();
    const wx=(e.clientX-rect.left)/MM_W*mapCols*TILE_PX;
    const wy=(e.clientY-rect.top)/MM_H*mapRows*TILE_PX;
    const vp=viewportRef.current;
    setCam(p=>({...p,panX:vp.clientWidth/2-wx*p.scale,panY:vp.clientHeight/2-wy*p.scale}));
  },[mapCols,mapRows]);

  // ── Jump kamera ke tile x,y ───────────────────────────────────────────────
  const jumpToTile = useCallback((tx:number,ty:number)=>{
    const vp=viewportRef.current;
    if(!vp)return;
    setCam(p=>({
      ...p,
      panX:vp.clientWidth /2-(tx+0.5)*TILE_PX*p.scale,
      panY:vp.clientHeight/2-(ty+0.5)*TILE_PX*p.scale,
    }));
  },[]);

  // ── Duplikat object terpilih ──────────────────────────────────────────────
  const duplicateObj = useCallback((id: string) => {
    const src = objectsRef.current.find(o => o.id === id);
    if (!src) return;
    pushHist();
    const dup: MapObject = {
      ...src,
      id: genId(),
      x : src.x + TILE_PX,
      y : src.y + TILE_PX * 0.5,
    };
    setObjects(p => [...p, dup]);
    setSelectedId(dup.id);
  }, [pushHist]);

  // ── Keyboard ──────────────────────────────────────────────────────────────
  useEffect(()=>{
    const down=(e:KeyboardEvent)=>{
      if(e.code==="Space"){spaceRef.current=true;e.preventDefault();}
      if(e.key==="z"&&(e.ctrlKey||e.metaKey)){e.shiftKey?redo():undo();}
      if(e.key==="y"&&(e.ctrlKey||e.metaKey))redo();
      if(e.key==="d"&&(e.ctrlKey||e.metaKey)&&document.activeElement?.tagName!=="INPUT"){
        e.preventDefault();
        if(selectedId)duplicateObj(selectedId);
      }
      if((e.key==="Delete"||e.key==="Backspace")&&document.activeElement?.tagName!=="INPUT"){
        if(selectedId){pushHist();setObjects(p=>p.filter(o=>o.id!==selectedId));setSelectedId(null);}
      }
      if(e.key==="Escape"){setSelectedId(null);setEditingTransTile(null);}
      if(!e.ctrlKey&&!e.metaKey){
        if(e.key==="s")setTool("select");
        if(e.key==="p")setTool("paint");
        if(e.key==="e")setTool("erase");
        if(e.key==="b"){setTool("block");setActiveLayer("ground");}
        if(e.key==="t"){setTool("transition");setActiveLayer("ground");setEditingTransTile(null);}
        if(e.key==="i"){setTool("imgpaint");setActiveLayer("ground");}
        if(e.key==="c")setTool("camera");
        if(e.key==="1")setActiveLayer("ground");
        if(e.key==="2")setActiveLayer("objects");
        if(e.key==="g")setSnapToGrid(v=>!v);
      }
    };
    const up=(e:KeyboardEvent)=>{if(e.code==="Space")spaceRef.current=false;};
    window.addEventListener("keydown",down);
    window.addEventListener("keyup",up);
    return()=>{window.removeEventListener("keydown",down);window.removeEventListener("keyup",up);};
  },[selectedId,undo,redo,pushHist,duplicateObj]);

  // ── World ↔ Screen ─────────────────────────────────────────────────────────
  const toWorld=useCallback((sx:number,sy:number):[number,number]=>{
    const vp=viewportRef.current!.getBoundingClientRect();
    return[(sx-vp.left-cam.panX)/cam.scale,(sy-vp.top-cam.panY)/cam.scale];
  },[cam]);
  const worldToTile=(wx:number,wy:number)=>({tx:Math.floor(wx/TILE_PX),ty:Math.floor(wy/TILE_PX)});

  // ── Paint tile ─────────────────────────────────────────────────────────────
  const paintCell=useCallback((tx:number,ty:number,isErase:boolean)=>{
    const key=`${tx},${ty}`;
    if(lastCellRef.current===key)return;
    lastCellRef.current=key;
    setCells(prev=>{
      if(!prev[ty]?.[tx])return prev;
      const next=prev.map(r=>[...r]);
      next[ty][tx]={baseType:isErase?0:paintType};
      return next;
    });
  },[paintType]);

  // ── Block toggle (per-tile collision override) ──────────────────────────────
  const blockCell=useCallback((tx:number,ty:number,action:"block"|"allow",canToggle=false)=>{
    const key=`${tx},${ty}`;
    if(lastCellRef.current===key)return;
    lastCellRef.current=key;

    if(action==="block"){
      setCustomBlocked(prev=>{
        const next=new Set(prev);
        // canToggle hanya true saat mousedown (klik tunggal), bukan saat drag
        // Saat drag, selalu ADD — jangan toggle balik saat lewat tile yang sudah diblok
        if(canToggle && next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
      setCustomAllowed(prev=>{const n=new Set(prev);n.delete(key);return n;});
    } else {
      setCustomAllowed(prev=>{
        const next=new Set(prev);
        if(canToggle && next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
      setCustomBlocked(prev=>{const n=new Set(prev);n.delete(key);return n;});
    }
  },[]);

  // ── Phase 4: Image Tile Paint / Erase ─────────────────────────────────────
  const paintTileImg=useCallback((tx:number,ty:number,isErase:boolean)=>{
    const key=`${tx},${ty}`;
    if(lastCellRef.current===key)return;
    lastCellRef.current=key;
    if(isErase){
      setTileImages(prev=>{
        if(!prev[key])return prev;
        const n={...prev}; delete n[key]; return n;
      });
    } else if(selectedTileImg){
      const url=selectedTileImg;
      setTileImages(prev=>({...prev,[key]:url}));
    }
  },[selectedTileImg]);

  // ── Viewport pointer events ───────────────────────────────────────────────
  const onVpDown=useCallback((e:React.PointerEvent)=>{
    if(!editorReady)return;
    if(e.button===1||(e.button===0&&spaceRef.current)||(e.button===0&&tool==="camera")){
      isPanRef.current=true;
      lastPanRef.current={x:e.clientX,y:e.clientY};
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }
    const[wx,wy]=toWorld(e.clientX,e.clientY);
    const{tx,ty}=worldToTile(wx,wy);

    if(tool==="transition"&&activeLayer==="ground"){
      if(tx<0||ty<0||tx>=mapCols||ty>=mapRows)return;
      const key=`${tx},${ty}`;
      const existing=transitions[key];
      if(existing){
        setTransDraft({...existing});
        // If toMap is a known map, no custom; otherwise set customMapStr
        setCustomMapStr(ALL_MAPS[existing.toMap]?"":existing.toMap);
      } else {
        setTransDraft({toMap:"",spawnX:0,spawnY:0,facing:"down"});
        setCustomMapStr("");
      }
      setEditingTransTile({tx,ty});
      return;
    }
    if(tool==="block"&&activeLayer==="ground"){
      if(tx<0||ty<0||tx>=mapCols||ty>=mapRows)return;
      lastCellRef.current=null;
      // Determine drag direction from first click
      const action = e.button===2 ? "allow" : "block";
      isBlockPaintRef.current=action;
      pushHist();
      // canToggle=true → klik tunggal bisa un-block tile yang sudah diblok
      blockCell(tx,ty,action,true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }
    if((tool==="paint"||tool==="erase")&&activeLayer==="ground"){
      isPaintRef.current=true;
      lastCellRef.current=null;
      pushHist();
      paintCell(tx,ty,tool==="erase"||e.button===2);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
    if(tool==="imgpaint"&&activeLayer==="ground"){
      if(tx<0||ty<0||tx>=mapCols||ty>=mapRows)return;
      const isErase=e.button===2||!selectedTileImg;
      isImgPaintRef.current=isErase?"erase":"paint";
      lastCellRef.current=null;
      pushHist();
      paintTileImg(tx,ty,isErase);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }
    if(tool==="select"&&e.button===0)setSelectedId(null);
    if(tool==="transition"&&e.button===0&&(tx<0||ty<0||tx>=mapCols||ty>=mapRows))setEditingTransTile(null);
  },[editorReady,tool,activeLayer,mapCols,mapRows,toWorld,pushHist,paintCell,blockCell,paintTileImg,selectedTileImg,transitions]);

  const onVpMove=useCallback((e:React.PointerEvent)=>{
    if(!editorReady)return;
    const[wx,wy]=toWorld(e.clientX,e.clientY);
    const{tx,ty}=worldToTile(wx,wy);
    setHoverTile({x:tx,y:ty});
    if(isPanRef.current&&lastPanRef.current){
      const dx=e.clientX-lastPanRef.current.x;
      const dy=e.clientY-lastPanRef.current.y;
      lastPanRef.current={x:e.clientX,y:e.clientY};
      setCam(p=>({...p,panX:p.panX+dx,panY:p.panY+dy}));
      return;
    }
    if(isPaintRef.current)paintCell(tx,ty,tool==="erase");
    // canToggle=false saat drag — hanya ADD, tidak pernah hapus tile yang sudah diset
    if(isBlockPaintRef.current&&tool==="block"&&tx>=0&&ty>=0&&tx<mapCols&&ty<mapRows)
      blockCell(tx,ty,isBlockPaintRef.current,false);
    if(isImgPaintRef.current&&tool==="imgpaint"&&tx>=0&&ty>=0&&tx<mapCols&&ty<mapRows)
      paintTileImg(tx,ty,isImgPaintRef.current==="erase");
  },[editorReady,toWorld,tool,mapCols,mapRows,paintCell,blockCell,paintTileImg]);

  const onVpUp=useCallback(()=>{
    isPanRef.current=false;isPaintRef.current=false;
    isBlockPaintRef.current=null;
    isImgPaintRef.current=null;
    lastPanRef.current=null;lastCellRef.current=null;
  },[]);

  const onVpWheel=useCallback((e:React.WheelEvent)=>{
    e.preventDefault();
    const factor=e.deltaY<0?1.12:1/1.12;
    const vp=viewportRef.current!.getBoundingClientRect();
    const mx=e.clientX-vp.left,my=e.clientY-vp.top;
    setCam(p=>{const ns=Math.max(0.08,Math.min(5,p.scale*factor));
      return{panX:mx-(mx-p.panX)*(ns/p.scale),panY:my-(my-p.panY)*(ns/p.scale),scale:ns};});
  },[]);

  // ── Object handlers ────────────────────────────────────────────────────────
  const objPointerDown=useCallback((e:React.PointerEvent,id:string)=>{
    if(tool!=="select")return;
    e.stopPropagation();pushHist();setSelectedId(id);
  },[tool,pushHist]);
  const objUpdate=useCallback((id:string,patch:Partial<MapObject>)=>{
    setObjects(p=>p.map(o=>o.id===id?{...o,...patch}:o));
  },[]);
  const objDelete=useCallback((id:string)=>{
    pushHist();setObjects(p=>p.filter(o=>o.id!==id));setSelectedId(null);
  },[pushHist]);

  // ── Priority / zIndex reordering ──────────────────────────────────────────
  /** Naik 1 tingkat: tukar zIndex dengan object tepat di atasnya (sorted by zIndex) */
  const objMoveUp=useCallback((id:string)=>{
    pushHist();
    setObjects(prev=>{
      const sorted=[...prev].sort((a,b)=>a.zIndex-b.zIndex);
      const idx=sorted.findIndex(o=>o.id===id);
      if(idx<0||idx>=sorted.length-1)return prev; // sudah paling atas
      const cur=sorted[idx];
      const above=sorted[idx+1];
      // Jika zIndex sama, cukup naikkan current
      const newCurZ=above.zIndex===cur.zIndex?above.zIndex+1:above.zIndex;
      const newAboveZ=above.zIndex===cur.zIndex?cur.zIndex:cur.zIndex;
      return prev.map(o=>o.id===id?{...o,zIndex:newCurZ}:o.id===above.id?{...o,zIndex:newAboveZ}:o);
    });
  },[pushHist]);

  /** Turun 1 tingkat: tukar zIndex dengan object tepat di bawahnya */
  const objMoveDown=useCallback((id:string)=>{
    pushHist();
    setObjects(prev=>{
      const sorted=[...prev].sort((a,b)=>a.zIndex-b.zIndex);
      const idx=sorted.findIndex(o=>o.id===id);
      if(idx<=0)return prev; // sudah paling bawah
      const cur=sorted[idx];
      const below=sorted[idx-1];
      const newCurZ=below.zIndex===cur.zIndex?below.zIndex-1:below.zIndex;
      const newBelowZ=below.zIndex===cur.zIndex?cur.zIndex:cur.zIndex;
      return prev.map(o=>o.id===id?{...o,zIndex:newCurZ}:o.id===below.id?{...o,zIndex:newBelowZ}:o);
    });
  },[pushHist]);

  /** Paling Depan: zIndex → max + 1 */
  const objBringFront=useCallback((id:string)=>{
    pushHist();
    setObjects(prev=>{
      const maxZ=prev.reduce((m,o)=>Math.max(m,o.zIndex),0);
      return prev.map(o=>o.id===id?{...o,zIndex:maxZ+1}:o);
    });
  },[pushHist]);

  /** Paling Belakang: zIndex → min - 1 (floor 0) */
  const objSendBack=useCallback((id:string)=>{
    pushHist();
    setObjects(prev=>{
      const minZ=prev.reduce((m,o)=>Math.min(m,o.zIndex),Infinity);
      return prev.map(o=>o.id===id?{...o,zIndex:Math.max(0,minZ-1)}:o);
    });
  },[pushHist]);

  const addObject=()=>{
    if(!objUrl.trim())return;
    pushHist();
    const[wx,wy]=toWorld(
      (viewportRef.current?.clientWidth??800)/2+(viewportRef.current?.getBoundingClientRect().left??0),
      (viewportRef.current?.clientHeight??600)/2+(viewportRef.current?.getBoundingClientRect().top??0),
    );
    // Proses URL: tambah e_bgremoval jika dipilih (Cloudinary only)
    const finalSrc = applyBgRemoval(objUrl.trim(), objBgRemove);
    const newObj:MapObject={id:genId(),src:finalSrc,label:objLabel.trim(),
      x:Math.max(0,wx-TILE_PX*2),y:Math.max(0,wy-TILE_PX*2),
      w:TILE_PX*4,h:TILE_PX*4,zIndex:200,objectFit:"fill",noShadow:false};
    setObjects(p=>[...p,newObj]);
    setSelectedId(newObj.id);setTool("select");setActiveLayer("objects");setObjUrl("");
  };

  // ── Clear all collision overrides ──────────────────────────────────────────
  const clearAllCollision=()=>{
    pushHist();
    setCustomBlocked(new Set());
    setCustomAllowed(new Set());
  };

  // ── Export ─────────────────────────────────────────────────────────────────
  const doExport=useCallback(()=>{
    const tilesCode=cells.map(row=>"  ["+row.map(c=>c.baseType).join(",")+"],").join("\n");
    const bArr=[...customBlocked].map(k=>`"${k}"`);
    const aArr=[...customAllowed].map(k=>`"${k}"`);
    // Transitions
    const transEntries=Object.entries(transitions);
    const transCode=transEntries.map(([k,v])=>
      `    "${k}": { toMap: "${v.toMap}", spawnX: ${v.spawnX}, spawnY: ${v.spawnY}, facing: "${v.facing}"${v.immediate?", immediate: true":""} }`
    ).join(",\n");
    // Props — now includes zIndex, contentZoom, zoomAnchor
    const propsCode=objects.map(o=>{
      const tx=Math.round(o.x/TILE_PX*100)/100,ty=Math.round(o.y/TILE_PX*100)/100;
      const tw=Math.round(o.w/TILE_PX*100)/100,th=Math.round(o.h/TILE_PX*100)/100;
      const extras=[
        o.objectFit!=="fill"?`, objectFit:"${o.objectFit}"`:"",
        o.noShadow?", noShadow:true":"",
        `, zIndex:${o.zIndex}`,
        o.contentZoom&&o.contentZoom>1?`, contentZoom:${o.contentZoom}`:"",
        o.zoomAnchor?`, zoomAnchor:"${o.zoomAnchor}"`:"",
      ].join("");
      return `  { x:${tx}, y:${ty}, tileW:${tw}, tileH:${th}, src:"${o.src}", label:"${o.label}"${extras} }`;
    }).join(",\n");
    // tileImages
    const tiImgEntries=Object.entries(tileImages);
    const tiImgCode=tiImgEntries.map(([k,v])=>`    "${k}": "${v}"`).join(",\n");

    const N=mapName.toUpperCase().replace(/[^A-Z0-9_]/g,"_");
    const isExisting=mode==="edit"&&!!ALL_MAPS[existingMap];
    const targetFile=existingMap==="village"?"villageMapData.ts":"innMapData.ts";
    const exportKey=isExisting?existingMap:`${mapName}`;

    setExportCode(
`// ═══════════════════════════════════════════════════════════
// LANGKAH DEPLOY KE GAME:
//
// 1. Salin seluruh kode di bawah ini (klik tombol 📋 Salin)
//
// 2. Buka file:  src/app/data/${targetFile}
//
// 3. Cari definisi map "${exportKey}" lalu GANTI SELURUHNYA
//    dengan kode di bawah. (Kalau map baru, tambahkan ke MAPS)
//
// 4. Kalau map BARU (belum ada di MAPS), tambahkan:
//    export const MAPS = { ..., ${mapName}: ${N}_MAP };
//
// 5. Simpan file → game langsung pakai data baru
//    (hot-reload aktif, tidak perlu restart)
//
// 📌 Collision summary:
//    🔴 blockedTiles : ${bArr.length} tile di-force BLOCKED
//    🟢 allowedTiles : ${aArr.length} tile di-force WALKABLE
//    🔀 transitions  : ${transEntries.length} tile transisi
// ════════════════════════════════════════════════���══════════

export const ${N}_MAP: TileMap = {
  id:"${mapName}", name:"${mapName}", cols:${mapCols}, rows:${mapRows},
  ambientBg:"radial-gradient(ellipse at center,#1a0535 0%,#060112 100%)",
  defaultSpawn:{x:1,y:1,facing:"down"},
  transitions:{
${transCode||"    // (kosong — tambah via tool Transition [T])"}
  },
  dialogs:{},
  tiles:[
${tilesCode}
  ],
  blockedTiles:[${bArr.join(",")}],
  allowedTiles:[${aArr.join(",")}],
  tileImages:{
${tiImgCode||"    // (kosong)"}
  },
  props:[
${propsCode||"    // (kosong)"}
  ],
};`);
    setShowExport(true);
  },[cells,objects,transitions,tileImages,customBlocked,customAllowed,mapName,mapCols,mapRows,mode,existingMap]);

  // ── Derived ─────────────────────────────────────────────────��──────────────
  const selectedObj=objects.find(o=>o.id===selectedId)??null;
  const zoomPct=Math.round(cam.scale*100);
  const isInMap=hoverTile
    ?hoverTile.x>=0&&hoverTile.x<mapCols&&hoverTile.y>=0&&hoverTile.y<mapRows:false;
  const isSelectMode=tool==="select"&&activeLayer==="objects";

  // Hover tile collision state
  const hoverKey=hoverTile?`${hoverTile.x},${hoverTile.y}`:"";
  const hoverIsCustomBlocked=customBlocked.has(hoverKey);
  const hoverIsCustomAllowed=customAllowed.has(hoverKey);
  const hoverBaseBlocked=hoverTile?BLOCKED_TYPES.has(cells[hoverTile.y]?.[hoverTile.x]?.baseType??-1):false;
  const hoverEffectiveBlocked=hoverIsCustomBlocked||(hoverBaseBlocked&&!hoverIsCustomAllowed);

  const vpCursor=isPanRef.current?"grabbing"
    :tool==="camera"?"grab"
    :spaceRef.current?"grab"
    :tool==="paint"&&activeLayer==="ground"?"crosshair"
    :tool==="erase"&&activeLayer==="ground"?"cell"
    :tool==="block"&&activeLayer==="ground"?"cell"
    :tool==="transition"&&activeLayer==="ground"?"pointer"
    :tool==="imgpaint"&&activeLayer==="ground"?(selectedTileImg?"crosshair":"not-allowed")
    :"default";

  // ── Render ──────────────────────────────────────────────────────���──────────
  return (
    <div style={{width:"100vw",height:"100vh",display:"flex",flexDirection:"column",
      background:"radial-gradient(ellipse at center,#160430 0%,#04010e 100%)",
      fontFamily:"'Crimson Text',serif",overflow:"hidden"}}>
      <style>{CSS}</style>

      {/* ════ HEADER ════ */}
      <div style={{height:50,flexShrink:0,display:"flex",alignItems:"center",gap:0,padding:"0 8px",
        background:"linear-gradient(90deg,rgba(22,4,55,.97),rgba(8,2,22,.97))",
        borderBottom:"1px solid rgba(140,80,220,.25)",boxShadow:"0 2px 20px rgba(0,0,0,.6)"}}>
        <span style={{fontFamily:"'Cinzel',serif",color:"rgba(220,170,255,.95)",fontSize:13,letterSpacing:"0.12em",marginRight:4,flexShrink:0,whiteSpace:"nowrap"}}>
          ⚔ MAP EDITOR
        </span>

        {/* Scroll left */}
        <button title="Geser kiri" onClick={()=>toolbarRef.current?.scrollBy({left:-160,behavior:"smooth"})}
          style={{...sBtn(),flexShrink:0,padding:"3px 5px",fontSize:11,opacity:.65,marginRight:2}}>&#9664;</button>

        {/* Scrollable tools strip */}
        <div ref={toolbarRef} className="me2-toolbar-strip" style={{display:"flex",alignItems:"center",gap:5,overflowX:"auto",flex:1,
          padding:"3px 2px",scrollbarWidth:"none"} as React.CSSProperties}>

        {/* Tools */}
        <div style={{display:"flex",gap:3,background:"rgba(0,0,0,.3)",borderRadius:7,padding:3,flexShrink:0}}>
          {([["select","↖","Select","s"],["paint","🖌","Paint","p"],["erase","✏","Erase","e"]] as const).map(([t,ic,lb,sc])=>(
            <button key={t} onClick={()=>setTool(t)} title={`${lb} (${sc})`}
              style={{...sBtn(tool===t,t==="paint"?"#6d28d9":t==="erase"?"#b45309":"#1d4ed8"),fontSize:10}}>
              {ic} {lb}
            </button>
          ))}
          {/* Block tool */}
          <div style={{width:1,background:"rgba(140,80,220,.2)",margin:"3px 2px",flexShrink:0}}/>
          <button onClick={()=>{setTool("block");setActiveLayer("ground");}} title="Block/Unblock tiles (B)"
            style={{...sBtn(tool==="block","#991b1b"),fontSize:10,flexShrink:0}}>
            🔒 Collision
          </button>
          {/* Transition tool */}
          <button onClick={()=>{setTool("transition");setActiveLayer("ground");setEditingTransTile(null);}} title="Transition Editor (T)"
            style={{...sBtn(tool==="transition","#b45309"),fontSize:10,flexShrink:0}}>
            🔀 Transition
          </button>
          {/* Image Tile Painter */}
          <button onClick={()=>{setTool("imgpaint");setActiveLayer("ground");}} title="Image Tile Painter (I)"
            style={{...sBtn(tool==="imgpaint","#166534"),fontSize:10,flexShrink:0,
              background:tool==="imgpaint"?"linear-gradient(135deg,#14532d,#166534)":undefined,
              color:tool==="imgpaint"?"#86efac":undefined}}>
            🖼 ImgTile
          </button>
          {/* Camera/Pan Mode */}
          <button onClick={()=>setTool("camera")} title="Camera Pan Mode — klik tahan untuk geser kamera (C)"
            style={{...sBtn(tool==="camera","#0369a1"),fontSize:10,flexShrink:0,
              background:tool==="camera"?"linear-gradient(135deg,#0c4a6e,#0369a1)":undefined,
              color:tool==="camera"?"#7dd3fc":undefined}}>
            🎥 Camera
          </button>
        </div>

        <div style={{width:1,height:22,background:"rgba(140,80,220,.25)",flexShrink:0}}/>

        {/* Layer quick switch */}
        <div style={{display:"flex",gap:3,background:"rgba(0,0,0,.3)",borderRadius:7,padding:3,flexShrink:0}}>
          {LAYER_META.map(l=>(
            <button key={l.id} onClick={()=>setActiveLayer(l.id)} title={`Layer ${l.label} (${l.id==="ground"?"1":"2"})`}
              style={{...sBtn(activeLayer===l.id,l.color),fontSize:10,flexShrink:0}}>
              {l.icon} {l.id==="ground"?"Ground":"Objects"}
            </button>
          ))}
        </div>

        <div style={{width:1,height:22,background:"rgba(140,80,220,.25)",flexShrink:0}}/>
        <button onClick={undo} style={{...sBtn(),flexShrink:0}} title="Undo (Ctrl+Z)">↩</button>
        <button onClick={redo} style={{...sBtn(),flexShrink:0}} title="Redo (Ctrl+Y)">↪</button>
        <div style={{width:1,height:22,background:"rgba(140,80,220,.25)",flexShrink:0}}/>
        <button onClick={()=>setCam(p=>({...p,scale:Math.min(5,p.scale*1.2)}))} style={{...sBtn(),flexShrink:0}}>＋</button>
        <span style={{fontSize:11,color:"rgba(180,150,255,.8)",fontFamily:"monospace",width:36,textAlign:"center",flexShrink:0}}>{zoomPct}%</span>
        <button onClick={()=>setCam(p=>({...p,scale:Math.max(0.08,p.scale/1.2)}))} style={{...sBtn(),flexShrink:0}}>－</button>
        <button onClick={()=>editorReady&&loadMap()} style={{...sBtn(),flexShrink:0}} title="Fit viewport">⊞</button>
        <div style={{width:1,height:22,background:"rgba(140,80,220,.25)",flexShrink:0}}/>
        <button onClick={()=>setShowGrid(v=>!v)} style={{...sBtn(showGrid),flexShrink:0}}># Grid</button>
        <button onClick={()=>setShowCollision(v=>!v)} style={{...sBtn(showCollision,"#991b1b"),flexShrink:0}} title="Show/hide collision overlay">🔒 Col</button>
        <button onClick={()=>setSnapToGrid(v=>!v)} style={{...sBtn(snapToGrid,"#15803d"),fontSize:10,flexShrink:0}}>
          {snapToGrid?"⊞ Snap":"⊡ Snap"}
        </button>

        {/* ── End scrollable strip ── */}
        </div>

        {/* Scroll right */}
        <button title="Geser kanan" onClick={()=>toolbarRef.current?.scrollBy({left:160,behavior:"smooth"})}
          style={{...sBtn(),flexShrink:0,padding:"3px 5px",fontSize:11,opacity:.65,marginLeft:2}}>&#9654;</button>

        {/* Save ke DB — pinned kanan */}
        {editorReady&&(
          <button onClick={doSaveToDb} disabled={saveStatus==="saving"}
            style={{...sBtn(),flexShrink:0,marginLeft:6,whiteSpace:"nowrap",
              background:saveStatus==="saved"
                ?"linear-gradient(135deg,#14532d,#166534)"
                :saveStatus==="error"
                ?"linear-gradient(135deg,#7f1d1d,#991b1b)"
                :saveStatus==="saving"
                ?"rgba(40,20,80,.7)"
                :"linear-gradient(135deg,#1e3a8a,#1d4ed8)",
              color:saveStatus==="saved"?"#86efac":saveStatus==="error"?"#fca5a5":"#bfdbfe",
              outline:saveStatus==="saved"?"1px solid rgba(134,239,172,.3)":saveStatus==="error"?"1px solid rgba(252,165,165,.3)":"1px solid rgba(191,219,254,.3)",
              opacity:saveStatus==="saving"?0.7:1,cursor:saveStatus==="saving"?"not-allowed":"pointer"}}>
            {saveStatus==="saving"?"⏳ Menyimpan…":saveStatus==="saved"?"✅ Tersimpan!":saveStatus==="error"?"❌ Gagal":"💾 Simpan ke DB"}
          </button>
        )}
        {/* SQL Setup button */}
        <button onClick={()=>setShowSqlSetup(true)} title="Setup — buat tabel maps di Supabase"
          style={{...sBtn(),flexShrink:0,marginLeft:4,padding:"5px 7px",fontSize:11,opacity:.6}}>🛠</button>
        {/* Diagnosa DB */}
        <button onClick={()=>{setDiagSteps([]);setShowDiag(true);}} title="Diagnosa koneksi database"
          style={{...sBtn(),flexShrink:0,marginLeft:2,padding:"5px 7px",fontSize:11,opacity:.6}}>🔬</button>
        {/* Export — selalu terlihat, pinned kanan */}
        {editorReady&&(
          <button onClick={doExport}
            style={{...sBtn(),flexShrink:0,marginLeft:4,whiteSpace:"nowrap",
              background:"linear-gradient(135deg,#14532d,#166534)",
              color:"#86efac",outline:"1px solid rgba(134,239,172,.3)"}}>
            📋 Export
          </button>
        )}
        {/* Save status message */}
        {saveMsg&&(
          <span
            onClick={saveStatus==="error" ? ()=>setShowDiag(true) : undefined}
            style={{flexShrink:0,marginLeft:6,fontSize:10,fontFamily:"monospace",
              color:saveStatus==="error"?"rgba(252,165,165,.9)":"rgba(134,239,172,.9)",
              whiteSpace:"nowrap",maxWidth:320,overflow:"hidden",textOverflow:"ellipsis",
              cursor:saveStatus==="error"?"pointer":"default",
              textDecoration:saveStatus==="error"?"underline dotted":"none"}}
            title={saveMsg + (saveStatus==="error" ? "\n→ Klik untuk buka Diagnosa DB" : "")}>
            {saveMsg}
          </span>
        )}
      </div>

      {/* ════ BODY ════ */}
      <div style={{flex:1,display:"flex",overflow:"hidden"}}>

        {/* ── LEFT SIDEBAR ── */}
        <div style={{width:236,flexShrink:0,display:"flex",flexDirection:"column",
          background:"rgba(6,2,16,.9)",borderRight:"1px solid rgba(120,70,210,.2)",overflow:"hidden"}}>
          <div className="me2-scroll" style={{flex:1,overflowY:"auto",padding:"10px 11px 24px"}}>

            {/* Map Setup */}
            <div style={{marginBottom:14}}>
              <h3 style={sH}>⚙ Setup Map</h3>
              <div style={{display:"flex",gap:4,marginBottom:7}}>
                {(["edit","new"] as const).map(m=>(
                  <button key={m} onClick={()=>setMode(m)} style={{...sBtn(mode===m),flex:1,fontSize:10}}>
                    {m==="edit"?"✎ Muat":"✦ Baru"}
                  </button>
                ))}
              </div>
              {mode==="edit"?(
                <>
                <select value={existingMap} onChange={e=>setExistingMap(e.target.value)}
                  style={{...sInp,cursor:"pointer",marginBottom:4}}>
                  <optgroup label="── Static (source code) ──">
                    {MAP_OPTIONS.map(id=>(
                      <option key={id} value={id}>{id} ({ALL_MAPS[id].cols}×{ALL_MAPS[id].rows})</option>
                    ))}
                  </optgroup>
                  {dbMapList.length>0&&(
                    <optgroup label="── Database (Supabase) 💾 ──">
                      {dbMapList.filter(m=>!ALL_MAPS[m.id]).map(m=>(
                        <option key={m.id} value={m.id}>{m.id} 💾</option>
                      ))}
                      {dbMapList.filter(m=>!!ALL_MAPS[m.id]).map(m=>(
                        <option key={`db_${m.id}`} value={m.id}>{m.id} ↑DB</option>
                      ))}
                    </optgroup>
                  )}
                </select>
                {dbMapList.length>0&&(
                  <div style={{fontSize:8,color:"rgba(120,200,120,.6)",marginBottom:5,lineHeight:1.5}}>
                    💾 {dbMapList.length} map di DB · {dbMapList.filter(m=>!!ALL_MAPS[m.id]).length} override static
                  </div>
                )}
                </>
              
              ):(
                <>
                  <input placeholder="Nama map" value={mapName}
                    onChange={e=>setMapName(e.target.value.replace(/\s+/g,"_"))}
                    style={{...sInp,marginBottom:5}}/>
                  <div style={{display:"flex",gap:5,marginBottom:7}}>
                    <input type="number" placeholder="Cols" value={newCols} min={1} max={200}
                      onChange={e=>setNewCols(+e.target.value)} style={{...sInp,width:"50%"}}/>
                    <input type="number" placeholder="Rows" value={newRows} min={1} max={200}
                      onChange={e=>setNewRows(+e.target.value)} style={{...sInp,width:"50%"}}/>
                  </div>
                </>
              )}
              <button onClick={loadMap} style={{width:"100%",padding:"7px 0",fontFamily:"'Cinzel',serif",fontSize:11,
                letterSpacing:"0.08em",cursor:"pointer",border:"none",borderRadius:6,
                background:"linear-gradient(135deg,#6d28d9,#a855f7)",color:"#fff",
                boxShadow:"0 0 14px rgba(140,60,255,.3)"}}>
                {mode==="edit"?"✎ Muat Map":"✦ Buat Map"}
              </button>
            </div>

            {/* ── Layer Panel ── */}
            {editorReady&&(
              <div style={{marginBottom:14}}>
                <h3 style={sH}>📚 Layers</h3>
                {LAYER_META.map(layer=>{
                  const lData=layers[layer.id];
                  const isActive=activeLayer===layer.id;
                  return(
                    <div key={layer.id} onClick={()=>setActiveLayer(layer.id)}
                      style={{display:"flex",alignItems:"center",gap:6,padding:"6px 7px",marginBottom:4,
                        borderRadius:6,cursor:"pointer",
                        background:isActive?`${layer.color}18`:"rgba(10,5,25,.4)",
                        border:`1px solid ${isActive?`${layer.color}55`:"rgba(100,60,180,.18)"}`,
                        transition:"all .15s ease"}}>
                      <button onClick={e=>{e.stopPropagation();setLayers(p=>({...p,[layer.id]:{visible:!p[layer.id].visible}}));}}
                        style={{background:"none",border:"none",cursor:"pointer",fontSize:13,padding:0,lineHeight:1,
                          opacity:lData.visible?1:.28,filter:lData.visible?"none":"grayscale(1)"}}>👁</button>
                      <div style={{width:7,height:7,borderRadius:2,background:layer.color,flexShrink:0,opacity:lData.visible?1:.35}}/>
                      <span style={{fontSize:10,flex:1,color:isActive?"rgba(230,210,255,.9)":"rgba(150,130,190,.65)"}}>{layer.icon} {layer.label}</span>
                      {isActive&&<span style={{fontSize:7.5,fontFamily:"'Cinzel',serif",letterSpacing:"0.08em",color:layer.color,background:`${layer.color}22`,padding:"1px 4px",borderRadius:3}}>AKTIF</span>}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Transition Editor Panel ── */}
            {editorReady&&(
              <div style={{marginBottom:14,opacity:tool==="transition"?1:.55,transition:"opacity .2s"}}>
                <h3 style={{...sH,color:tool==="transition"?"rgba(255,180,60,.9)":"rgba(200,160,255,.85)"}}>
                  🔀 Transition Editor {tool==="transition"&&<span style={{color:"rgba(255,160,40,.7)",fontSize:8}}>● AKTIF</span>}
                </h3>
                <div style={{fontSize:8.5,color:"rgba(160,130,200,.55)",marginBottom:8,lineHeight:1.6}}>
                  Klik tile di peta untuk set transisi.<br/>
                  Tile bertanda 🔀 = sudah ada transisi.<br/>
                  Shortcut: [T]
                </div>
                {/* Transition list */}
                {Object.keys(transitions).length>0?(
                  <div style={{display:"flex",flexDirection:"column",gap:3,marginBottom:8}}>
                    {Object.entries(transitions).map(([k,v])=>{
                      const[kx,ky]=k.split(",").map(Number);
                      const isActive=editingTransTile?.tx===kx&&editingTransTile?.ty===ky;
                      return(
                        <div key={k}
                          onClick={()=>{
                            setTransDraft({...v});setCustomMapStr(ALL_MAPS[v.toMap]?"":(v.toMap));
                            setEditingTransTile({tx:kx,ty:ky});
                            setTool("transition");setActiveLayer("ground");
                            // Pan camera to tile
                            const vp=viewportRef.current;
                            if(vp){setCam(p=>({...p,panX:vp.clientWidth/2-kx*TILE_PX*p.scale,panY:vp.clientHeight/2-ky*TILE_PX*p.scale}));}
                          }}
                          style={{display:"flex",alignItems:"center",gap:5,padding:"4px 6px",
                            cursor:"pointer",
                            background:isActive?"rgba(255,180,40,.2)":"rgba(180,100,20,.15)",
                            border:`1px solid ${isActive?"rgba(255,200,60,.5)":"rgba(200,140,40,.25)"}`,borderRadius:5}}>
                          <span style={{fontSize:10}}>🔀</span>
                          <div style={{flex:1}}>
                            <div style={{fontSize:9,color:"rgba(255,200,80,.9)",fontFamily:"monospace"}}>{k}</div>
                            <div style={{fontSize:8,color:"rgba(180,150,100,.6)"}}>→ {v.toMap} ({v.spawnX},{v.spawnY}) {v.facing}{v.immediate?" ⚡":""}</div>
                          </div>
                          <button onClick={e=>{e.stopPropagation();pushHist();setTransitions(p=>{const n={...p};delete n[k];return n;});if(isActive)setEditingTransTile(null);}}
                            style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,100,80,.7)",fontSize:11,padding:0}}>✕</button>
                        </div>
                      );
                    })}
                  </div>
                ):(
                  <div style={{fontSize:8.5,color:"rgba(120,100,160,.4)",textAlign:"center",padding:"8px 0",
                    border:"1px dashed rgba(120,80,180,.2)",borderRadius:5,marginBottom:8}}>
                    Belum ada transisi
                  </div>
                )}
                <button onClick={()=>{pushHist();setTransitions({});}}
                  style={{width:"100%",padding:"5px 0",fontSize:9.5,fontFamily:"'Cinzel',serif",
                    letterSpacing:"0.05em",cursor:"pointer",border:"1px solid rgba(200,100,40,.25)",
                    borderRadius:5,background:"rgba(100,40,10,.35)",color:"rgba(255,160,80,.7)"}}>
                  🗑 Hapus Semua Transisi
                </button>
              </div>
            )}

            {/* ── Collision Override Panel (Block Tool) ── */}
            {editorReady&&(
              <div style={{marginBottom:14,opacity:tool==="block"?1:.55,transition:"opacity .2s"}}>
                <h3 style={{...sH,color:tool==="block"?"rgba(255,130,130,.85)":"rgba(200,160,255,.85)"}}>
                  🔒 Collision Override {tool==="block"&&<span style={{color:"rgba(255,100,100,.7)",fontSize:8}}>● AKTIF</span>}
                </h3>

                {/* Legend */}
                <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:9}}>
                  <div style={{display:"flex",alignItems:"center",gap:7,padding:"5px 7px",borderRadius:5,background:"rgba(220,40,40,.12)",border:"1px solid rgba(220,60,60,.25)"}}>
                    <div style={{width:20,height:20,background:"rgba(220,40,40,.6)",borderRadius:3,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10}}>✕</div>
                    <div>
                      <div style={{fontSize:9.5,color:"rgba(255,130,130,.9)"}}>🖱 Klik Kiri = BLOKIR</div>
                      <div style={{fontSize:8,color:"rgba(200,100,100,.5)"}}>Tile ini tidak bisa dilewati player</div>
                    </div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:7,padding:"5px 7px",borderRadius:5,background:"rgba(40,180,80,.1)",border:"1px solid rgba(60,200,80,.2)"}}>
                    <div style={{width:20,height:20,background:"rgba(40,200,80,.5)",borderRadius:3,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10}}>✓</div>
                    <div>
                      <div style={{fontSize:9.5,color:"rgba(100,255,130,.9)"}}>🖱 Klik Kanan = IZINKAN</div>
                      <div style={{fontSize:8,color:"rgba(80,200,100,.5)"}}>Tile ini bisa dilewati meski tipe WALL</div>
                    </div>
                  </div>
                  <div style={{fontSize:8,color:"rgba(150,120,180,.45)",padding:"3px 0"}}>
                    Klik tile yang sama = hapus override<br/>
                    Drag untuk cat banyak tile sekaligus<br/>
                    Shortcut: [B] aktifkan tool ini
                  </div>
                </div>

                {/* Stats */}
                <div style={{display:"flex",gap:6,marginBottom:8}}>
                  <div style={{flex:1,padding:"5px 8px",background:"rgba(180,30,30,.15)",border:"1px solid rgba(200,50,50,.25)",borderRadius:5,textAlign:"center"}}>
                    <div style={{fontSize:16,color:"rgba(255,100,100,.9)"}}>{customBlocked.size}</div>
                    <div style={{fontSize:8,color:"rgba(200,100,100,.6)"}}>🔴 Blokir</div>
                  </div>
                  <div style={{flex:1,padding:"5px 8px",background:"rgba(30,180,60,.12)",border:"1px solid rgba(50,200,80,.2)",borderRadius:5,textAlign:"center"}}>
                    <div style={{fontSize:16,color:"rgba(100,255,130,.9)"}}>{customAllowed.size}</div>
                    <div style={{fontSize:8,color:"rgba(80,200,100,.5)"}}>🟢 Izinkan</div>
                  </div>
                </div>

                <button onClick={clearAllCollision}
                  style={{width:"100%",padding:"5px 0",fontSize:9.5,fontFamily:"'Cinzel',serif",
                    letterSpacing:"0.05em",cursor:"pointer",border:"1px solid rgba(200,60,60,.25)",
                    borderRadius:5,background:"rgba(100,20,20,.35)",color:"rgba(255,130,130,.75)"}}>
                  🗑 Hapus Semua Override
                </button>
              </div>
            )}

            {/* ── Phase 4: Image Tile Painter ── */}
            {editorReady&&(
              <div style={{marginBottom:14,opacity:activeLayer==="ground"&&(tool==="imgpaint"||tool==="paint"||tool==="erase")?1:.55,transition:"opacity .2s"}}>
                <h3 style={{...sH,color:tool==="imgpaint"?"rgba(120,255,180,.9)":"rgba(200,160,255,.85)"}}>
                  🖼 Image Tiles {tool==="imgpaint"&&<span style={{color:"rgba(100,255,160,.7)",fontSize:8}}>● AKTIF</span>}
                </h3>
                <div style={{fontSize:8.5,color:"rgba(160,130,200,.5)",marginBottom:8,lineHeight:1.6}}>
                  Tambah gambar tekstur ke palette, lalu cat ke tile ground.<br/>
                  LMB=cat · RMB=hapus · Shortcut: [I]
                </div>

                {/* Library Grid */}
                {tileImgLib.length>0?(
                  <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:8}}>
                    {tileImgLib.map(entry=>{
                      const isSel=selectedTileImg===entry.url;
                      return(
                        <div key={entry.id} title={entry.label||entry.url}
                          onClick={()=>{setSelectedTileImg(entry.url);setTool("imgpaint");setActiveLayer("ground");}}
                          style={{position:"relative",width:38,height:38,borderRadius:5,overflow:"hidden",
                            cursor:"pointer",flexShrink:0,
                            outline:isSel?"2.5px solid rgba(100,255,180,.9)":"1.5px solid rgba(100,60,180,.3)",
                            boxShadow:isSel?"0 0 8px rgba(80,255,150,.5)":"none",
                            background:"rgba(0,0,0,.4)"}}>
                          <img src={entry.url} alt="" style={{width:"100%",height:"100%",objectFit:"cover",imageRendering:"pixelated"}}/>
                          {isSel&&<div style={{position:"absolute",inset:0,background:"rgba(80,255,150,.12)"}}/>}
                          <button title="Hapus dari library"
                            onClick={e=>{e.stopPropagation();setTileImgLib(p=>p.filter(x=>x.id!==entry.id));if(selectedTileImg===entry.url)setSelectedTileImg(null);}}
                            style={{position:"absolute",top:1,right:1,width:12,height:12,background:"rgba(200,40,40,.8)",
                              border:"none",borderRadius:2,cursor:"pointer",color:"#fff",fontSize:7,
                              display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1,padding:0,
                              opacity:0,transition:"opacity .15s"}}
                            onMouseEnter={e=>(e.currentTarget.style.opacity="1")}
                            onMouseLeave={e=>(e.currentTarget.style.opacity="0")}>
                            ✕
                          </button>
                        </div>
                      );
                    })}
                    {/* "none" eraser slot */}
                    <div title="Pilih mode hapus (RMB juga bisa)"
                      onClick={()=>{setSelectedTileImg(null);setTool("imgpaint");setActiveLayer("ground");}}
                      style={{width:38,height:38,borderRadius:5,border:"1.5px dashed rgba(255,100,80,.4)",
                        cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",
                        background:selectedTileImg===null&&tool==="imgpaint"?"rgba(255,80,60,.18)":"rgba(0,0,0,.3)",
                        outline:selectedTileImg===null&&tool==="imgpaint"?"2px solid rgba(255,100,80,.7)":"none",
                        fontSize:16,color:"rgba(255,100,80,.7)"}}>
                      ✕
                    </div>
                  </div>
                ):(
                  <div style={{fontSize:8.5,color:"rgba(120,100,160,.4)",textAlign:"center",padding:"8px 0",
                    border:"1px dashed rgba(120,80,180,.2)",borderRadius:5,marginBottom:8}}>
                    Belum ada tile gambar
                  </div>
                )}

                {/* Current tileImages count */}
                {Object.keys(tileImages).length>0&&(
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                    padding:"4px 8px",marginBottom:8,background:"rgba(50,180,80,.1)",
                    border:"1px solid rgba(80,200,100,.2)",borderRadius:5}}>
                    <span style={{fontSize:9,color:"rgba(120,220,140,.8)"}}>🖼 {Object.keys(tileImages).length} tile di-cat</span>
                    <button onClick={()=>{pushHist();setTileImages({});}}
                      style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,120,100,.7)",fontSize:9,padding:0}}>
                      🗑 Hapus Semua
                    </button>
                  </div>
                )}

                {/* Add to library */}
                <button onClick={()=>setShowImgLibInput(v=>!v)}
                  style={{width:"100%",padding:"4px 0",fontSize:9,fontFamily:"'Cinzel',serif",
                    letterSpacing:"0.05em",cursor:"pointer",border:"1px solid rgba(100,200,140,.3)",
                    borderRadius:5,background:showImgLibInput?"rgba(50,150,80,.25)":"rgba(20,60,30,.4)",
                    color:"rgba(120,220,150,.75)",marginBottom:showImgLibInput?6:0}}>
                  {showImgLibInput?"▲ Tutup":"➕ Tambah Tile Gambar"}
                </button>
                {showImgLibInput&&(
                  <div style={{padding:"8px 0 0"}}>
                    <input placeholder="URL gambar tile..." value={tileImgUrl}
                      onChange={e=>setTileImgUrl(e.target.value)}
                      style={{...sInp,marginBottom:4}}/>
                    <input placeholder="Label (opsional)" value={tileImgLabel}
                      onChange={e=>setTileImgLabel(e.target.value)}
                      style={{...sInp,marginBottom:6}}/>
                    {tileImgUrl&&(
                      <div style={{width:"100%",height:48,marginBottom:6,borderRadius:4,
                        overflow:"hidden",background:"#111",border:"1px solid rgba(140,80,220,.2)"}}>
                        <img src={tileImgUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                      </div>
                    )}
                    <button onClick={()=>{
                      if(!tileImgUrl.trim())return;
                      const entry:ImgTileEntry={id:`ti-${Date.now()}`,url:tileImgUrl.trim(),label:tileImgLabel.trim()};
                      setTileImgLib(p=>[...p,entry]);
                      setSelectedTileImg(entry.url);
                      setTool("imgpaint");setActiveLayer("ground");
                      setTileImgUrl("");setTileImgLabel("");setShowImgLibInput(false);
                    }} style={{width:"100%",padding:"5px 0",fontSize:10,fontFamily:"'Cinzel',serif",
                      letterSpacing:"0.06em",cursor:tileImgUrl?"pointer":"not-allowed",border:"none",borderRadius:5,
                      background:tileImgUrl?"linear-gradient(135deg,#14532d,#166534)":"rgba(30,60,30,.4)",
                      color:tileImgUrl?"#86efac":"rgba(100,150,110,.4)"}}>
                      ➕ Simpan ke Library
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Deployed Tile Image Manager ─────────────────────────────── */}
            {editorReady&&Object.keys(tileImages).length>0&&(()=>{
              // Grupkan tileImages berdasarkan URL
              const grouped: Record<string,string[]> = {};
              Object.entries(tileImages).forEach(([key,url])=>{
                if(!grouped[url]) grouped[url]=[];
                grouped[url].push(key);
              });
              const urls = Object.keys(grouped);
              const filteredUrls = deployedFilter.trim()
                ? urls.filter(u=>u.toLowerCase().includes(deployedFilter.toLowerCase()))
                : urls;
              const totalTiles = Object.keys(tileImages).length;

              return(
                <div style={{marginBottom:14}}>
                  {/* Header toggle */}
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6,cursor:"pointer"}}
                    onClick={()=>setShowDeployedMgr(v=>!v)}>
                    <h3 style={{...sH,marginBottom:0,flex:1,color:"rgba(255,180,80,.85)"}}>
                      📍 Tile Deployed
                    </h3>
                    <span style={{fontSize:9,background:"rgba(255,160,40,.15)",border:"1px solid rgba(255,160,40,.3)",
                      borderRadius:10,padding:"1px 7px",color:"rgba(255,180,60,.8)",fontFamily:"monospace"}}>
                      {totalTiles}
                    </span>
                    <span style={{fontSize:10,color:"rgba(180,140,60,.6)"}}>{showDeployedMgr?"▲":"▼"}</span>
                  </div>

                  {showDeployedMgr&&(
                    <div style={{display:"flex",flexDirection:"column",gap:0}}>

                      {/* Search/filter */}
                      <input
                        placeholder="🔍 Filter URL..."
                        value={deployedFilter}
                        onChange={e=>setDeployedFilter(e.target.value)}
                        style={{...sInp,marginBottom:6,fontSize:9}}
                      />

                      {/* Hapus semua tombol */}
                      <div style={{display:"flex",gap:5,marginBottom:8}}>
                        <button onClick={()=>{pushHist();setTileImages({});}}
                          style={{...sBtn(),flex:1,fontSize:9,
                            background:"linear-gradient(135deg,#7f1d1d,#991b1b)",color:"#fca5a5"}}>
                          🗑 Hapus Semua ({totalTiles})
                        </button>
                        {deployedFilter&&(
                          <button onClick={()=>{
                            pushHist();
                            const toRemove=new Set(filteredUrls);
                            setTileImages(prev=>{
                              const next={...prev};
                              Object.entries(next).forEach(([k,v])=>{if(toRemove.has(v))delete next[k];});
                              return next;
                            });
                          }} style={{...sBtn(),flex:1,fontSize:9,
                            background:"linear-gradient(135deg,#78350f,#92400e)",color:"#fcd34d"}}>
                          🗑 Hapus Filtered ({filteredUrls.reduce((s,u)=>s+grouped[u].length,0)})
                          </button>
                        )}
                      </div>

                      {/* Daftar grup per URL */}
                      <div style={{display:"flex",flexDirection:"column",gap:5,maxHeight:360,overflowY:"auto"}}
                        className="me2-scroll">
                        {filteredUrls.length===0?(
                          <div style={{fontSize:9,color:"rgba(160,120,80,.5)",textAlign:"center",padding:"6px 0"}}>
                            Tidak ada hasil untuk filter ini
                          </div>
                        ):filteredUrls.map(url=>{
                          const keys=grouped[url];
                          const isExpanded=expandedUrls.has(url);
                          const label=tileImgLib.find(e=>e.url===url)?.label||"";
                          const shortUrl=url.replace(/^https?:\/\//,"").slice(0,34)+(url.length>40?"…":"");
                          return(
                            <div key={url} style={{border:"1px solid rgba(200,140,40,.2)",borderRadius:7,
                              background:"rgba(40,25,5,.4)",overflow:"hidden"}}>

                              {/* Row header */}
                              <div style={{display:"flex",alignItems:"center",gap:6,padding:"5px 7px",cursor:"pointer"}}
                                onClick={()=>setExpandedUrls(prev=>{
                                  const s=new Set(prev);
                                  s.has(url)?s.delete(url):s.add(url);
                                  return s;
                                })}>
                                {/* Thumbnail */}
                                <div style={{width:28,height:28,flexShrink:0,borderRadius:4,overflow:"hidden",
                                  background:"rgba(0,0,0,.5)",border:"1px solid rgba(200,140,40,.3)"}}>
                                  <img src={url} alt="" style={{width:"100%",height:"100%",objectFit:"cover",imageRendering:"pixelated"}}/>
                                </div>
                                {/* Label+URL */}
                                <div style={{flex:1,minWidth:0}}>
                                  {label&&<div style={{fontSize:8.5,color:"rgba(255,200,80,.85)",fontFamily:"'Cinzel',serif",
                                    letterSpacing:"0.04em",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                                    {label}
                                  </div>}
                                  <div style={{fontSize:7.5,color:"rgba(200,160,80,.5)",overflow:"hidden",
                                    textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:"monospace"}}
                                    title={url}>
                                    {shortUrl}
                                  </div>
                                </div>
                                {/* Count badge */}
                                <span style={{fontSize:9,fontFamily:"monospace",flexShrink:0,
                                  background:"rgba(255,160,40,.15)",border:"1px solid rgba(255,160,40,.25)",
                                  borderRadius:8,padding:"1px 6px",color:"rgba(255,190,60,.8)"}}>
                                  {keys.length}
                                </span>
                                {/* Hapus grup */}
                                <button title={`Hapus semua ${keys.length} tile dengan gambar ini`}
                                  onClick={e=>{
                                    e.stopPropagation();
                                    pushHist();
                                    setTileImages(prev=>{
                                      const next={...prev};
                                      keys.forEach(k=>delete next[k]);
                                      return next;
                                    });
                                  }}
                                  style={{...sBtn(),flexShrink:0,padding:"2px 6px",fontSize:9,
                                    background:"linear-gradient(135deg,#7f1d1d,#991b1b)",color:"#fca5a5"}}>
                                  🗑
                                </button>
                                <span style={{fontSize:9,color:"rgba(200,140,60,.4)",flexShrink:0}}>{isExpanded?"▲":"▼"}</span>
                              </div>

                              {/* Expanded: koordinat tiles */}
                              {isExpanded&&(
                                <div style={{borderTop:"1px solid rgba(200,140,40,.15)",padding:"6px 8px",
                                  background:"rgba(20,12,3,.5)"}}>
                                  {/* Tombol select/paint ulang */}
                                  <button onClick={()=>{
                                    setSelectedTileImg(url);
                                    setTool("imgpaint");
                                    setActiveLayer("ground");
                                    // Pastikan ada di library
                                    if(!tileImgLib.find(e=>e.url===url)){
                                      setTileImgLib(p=>[...p,{id:`ti-${Date.now()}`,url,label}]);
                                    }
                                  }} style={{...sBtn(),width:"100%",marginBottom:6,fontSize:9,
                                    background:"linear-gradient(135deg,#14532d,#166534)",color:"#86efac"}}>
                                    🖌 Pilih & Paint dengan Ini
                                  </button>

                                  {/* Grid koordinat */}
                                  <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
                                    {keys.sort((a,b)=>{
                                      const [ax,ay]=a.split(",").map(Number);
                                      const [bx,by]=b.split(",").map(Number);
                                      return ay!==by?ay-by:ax-bx;
                                    }).map(key=>{
                                      const [tx,ty]=key.split(",").map(Number);
                                      return(
                                        <div key={key} style={{display:"flex",alignItems:"center",gap:2,
                                          background:"rgba(40,25,5,.7)",border:"1px solid rgba(200,140,40,.2)",
                                          borderRadius:4,padding:"2px 4px",fontSize:8,fontFamily:"monospace"}}>
                                          {/* Koordinat — klik untuk jump */}
                                          <span
                                            onClick={()=>jumpToTile(tx,ty)}
                                            title={`Klik untuk pergi ke tile (${tx},${ty})`}
                                            style={{color:"rgba(255,200,80,.8)",cursor:"pointer",
                                              textDecoration:"underline dotted",textUnderlineOffset:2}}>
                                            {tx},{ty}
                                          </span>
                                          {/* Hapus tile ini saja */}
                                          <button
                                            title={`Hapus tile (${tx},${ty})`}
                                            onClick={()=>{
                                              pushHist();
                                              setTileImages(prev=>{
                                                const next={...prev};
                                                delete next[key];
                                                return next;
                                              });
                                            }}
                                            style={{background:"none",border:"none",cursor:"pointer",
                                              color:"rgba(255,100,80,.7)",fontSize:8,padding:0,
                                              lineHeight:1,display:"flex",alignItems:"center"}}>
                                            ✕
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>

                                  {/* Info total */}
                                  <div style={{marginTop:5,fontSize:8,color:"rgba(180,140,60,.45)",textAlign:"right"}}>
                                    {keys.length} tile • klik koordinat untuk jump ke posisi
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ── Tile Palette ── */}
            {editorReady&&(
              <div style={{marginBottom:14,opacity:activeLayer==="ground"&&(tool==="paint"||tool==="erase")?1:.4,transition:"opacity .2s"}}>
                <h3 style={sH}>🖌 Tile Palette</h3>
                <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
                  {PALETTE_TYPES.map(t=>(
                    <button key={t} onClick={()=>{setPaintType(t);setTool("paint");setActiveLayer("ground");}}
                      title={`${TILE_LABEL[t]} (type ${t})`}
                      style={{width:30,height:30,border:"none",borderRadius:4,cursor:"pointer",
                        background:TILE_COLOR[t],
                        outline:paintType===t&&tool==="paint"&&activeLayer==="ground"?"2px solid rgba(255,220,80,.9)":"1px solid rgba(100,60,180,.3)",
                        boxShadow:paintType===t&&tool==="paint"&&activeLayer==="ground"?"0 0 8px rgba(255,200,60,.5)":"none"}}>
                      <span style={{fontSize:5,color:"rgba(255,255,255,.45)",display:"block"}}>{TILE_LABEL[t]}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Selected Object Props ── */}
            {selectedObj&&(
              <div style={{marginBottom:14}}>
                <h3 style={{...sH,color:"rgba(255,200,80,.85)"}}>📦 Object Selected</h3>

                {/* ── Asset preview + duplikat ── */}
                <div style={{display:"flex",gap:8,marginBottom:8,alignItems:"stretch"}}>
                  {/* Thumbnail */}
                  <div style={{width:56,height:56,flexShrink:0,borderRadius:6,overflow:"hidden",
                    background:"rgba(0,0,0,.6)",border:"1.5px solid rgba(255,200,80,.25)",
                    display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
                    <img src={selectedObj.src} alt=""
                      style={{width:"100%",height:"100%",objectFit:"contain",imageRendering:"pixelated",
                        filter:"drop-shadow(0 2px 6px rgba(0,0,0,.6))"}}/>
                  </div>
                  {/* Info + Tombol Duplikat */}
                  <div style={{flex:1,display:"flex",flexDirection:"column",gap:4,minWidth:0}}>
                    <div style={{fontSize:8.5,color:"rgba(255,200,100,.8)",fontFamily:"'Cinzel',serif",
                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
                      letterSpacing:"0.04em"}}>
                      {selectedObj.label||"(no label)"}
                    </div>
                    <div style={{fontSize:7.5,color:"rgba(160,130,200,.45)",fontFamily:"monospace",
                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}
                      title={selectedObj.src}>
                      {selectedObj.src.replace(/^https?:\/\//,"").slice(0,30)}…
                    </div>
                    {/* Tombol utama: duplikat */}
                    <button
                      onClick={()=>duplicateObj(selectedObj.id)}
                      title="Duplikat object ini — salinan muncul di sebelah kanan (Ctrl+D)"
                      style={{marginTop:"auto",padding:"5px 0",fontSize:9,
                        fontFamily:"'Cinzel',serif",letterSpacing:"0.05em",
                        cursor:"pointer",border:"1.5px solid rgba(100,220,255,.35)",
                        borderRadius:5,background:"linear-gradient(135deg,#0c2a4a,#1e4976)",
                        color:"rgba(120,210,255,.95)",
                        boxShadow:"0 0 8px rgba(60,160,255,.15)",
                        display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
                      <span style={{fontSize:13}}>⧉</span> Duplikat
                      <span style={{fontSize:7,opacity:.55,marginLeft:2}}>Ctrl+D</span>
                    </button>
                  </div>
                </div>

                <div style={{fontSize:9.5,color:"rgba(200,160,100,.7)",lineHeight:1.8}}>
                  <div>Label: <span style={{color:"rgba(255,200,100,.9)"}}>{selectedObj.label||"(kosong)"}</span></div>
                  <div>X:<b style={{color:"rgba(200,200,255,.8)",fontFamily:"monospace"}}>{Math.round(selectedObj.x/TILE_PX*10)/10}t</b> Y:<b style={{color:"rgba(200,200,255,.8)",fontFamily:"monospace"}}>{Math.round(selectedObj.y/TILE_PX*10)/10}t</b></div>
                  <div>W:<b style={{color:"rgba(200,200,255,.8)",fontFamily:"monospace"}}>{Math.round(selectedObj.w/TILE_PX*10)/10}t</b> H:<b style={{color:"rgba(200,200,255,.8)",fontFamily:"monospace"}}>{Math.round(selectedObj.h/TILE_PX*10)/10}t</b></div>
                </div>
                <div style={{marginTop:7}}>
                  <div style={{fontSize:8.5,color:"rgba(140,110,190,.5)",marginBottom:4}}>Object Fit:</div>
                  <div style={{display:"flex",gap:3}}>
                    {(["fill","contain","cover"] as const).map(f=>(
                      <button key={f} onClick={()=>objUpdate(selectedObj.id,{objectFit:f})}
                        style={{...sBtn(selectedObj.objectFit===f),fontSize:8.5,padding:"3px 6px"}}>{f}</button>
                    ))}
                  </div>
                </div>
                <div style={{marginTop:5,display:"flex",gap:5}}>
                  <button onClick={()=>objUpdate(selectedObj.id,{noShadow:!selectedObj.noShadow})}
                    style={{...sBtn(selectedObj.noShadow),fontSize:8.5}}>
                    {selectedObj.noShadow?"✓ No Shadow":"Shadow ON"}
                  </button>
                  {/* BG Remove toggle — hanya aktif untuk URL Cloudinary */}
                  <button
                    onClick={()=>{
                      if(!isCloudinaryUrl(selectedObj.src))return;
                      const isBgR=hasBgRemoval(selectedObj.src);
                      objUpdate(selectedObj.id,{src:applyBgRemoval(selectedObj.src,!isBgR)});
                    }}
                    title={isCloudinaryUrl(selectedObj.src)
                      ?"Toggle hapus background via Cloudinary AI"
                      :"Hanya tersedia untuk URL Cloudinary"}
                    style={{...sBtn(hasBgRemoval(selectedObj.src),"#059669"),fontSize:8.5,
                      opacity:isCloudinaryUrl(selectedObj.src)?1:.35,
                      cursor:isCloudinaryUrl(selectedObj.src)?"pointer":"not-allowed"}}>
                    {hasBgRemoval(selectedObj.src)?"✨ BG Removed":"🖼 BG Normal"}
                  </button>
                  <button onClick={()=>objDelete(selectedObj.id)}
                    style={{...sBtn(),color:"rgba(255,120,80,.9)",fontSize:8.5,flex:1}}>🗑 Hapus</button>
                </div>
                {/* Tampilkan URL yang aktif (singkat) */}
                {isCloudinaryUrl(selectedObj.src)&&(
                  <div style={{marginTop:4,fontSize:7,color:"rgba(100,180,140,.45)",fontFamily:"monospace",
                    wordBreak:"break-all",lineHeight:1.4,padding:"3px 5px",
                    background:"rgba(0,60,30,.12)",borderRadius:3,border:"1px solid rgba(0,120,60,.12)"}}>
                    {hasBgRemoval(selectedObj.src)?"✨ e_bgremoval aktif":"🖼 BG asli"}
                  </div>
                )}
                {/* ── Priority / Render Order ── */}
                <div style={{marginTop:7}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
                    <div style={{fontSize:8.5,color:"rgba(180,140,255,.7)",letterSpacing:"0.05em",fontFamily:"'Cinzel',serif",textTransform:"uppercase"}}>
                      Prioritas Render
                    </div>
                    <div style={{fontFamily:"monospace",fontSize:8,color:"rgba(200,170,255,.5)",
                      background:"rgba(80,40,160,.2)",borderRadius:3,padding:"1px 5px",
                      border:"1px solid rgba(120,70,210,.2)"}}>
                      z: {selectedObj.zIndex}
                    </div>
                  </div>
                  {/* Quick: Depan / Belakang */}
                  <div style={{display:"flex",gap:3,marginBottom:3}}>
                    <button
                      onClick={()=>objBringFront(selectedObj.id)}
                      title="Paling Depan — selalu tampil paling atas semua object"
                      style={{...sBtn(false,"#7c3aed"),fontSize:8,flex:1,padding:"4px 2px",
                        background:"linear-gradient(135deg,#3b0764,#6d28d9)",
                        color:"rgba(216,180,254,.9)",border:"1px solid rgba(140,80,220,.3)"}}>
                      ⏫ Paling Depan
                    </button>
                    <button
                      onClick={()=>objSendBack(selectedObj.id)}
                      title="Paling Belakang — tertutup semua object lain"
                      style={{...sBtn(false,"#1e3a5f"),fontSize:8,flex:1,padding:"4px 2px",
                        background:"linear-gradient(135deg,#0f172a,#1e3a5f)",
                        color:"rgba(147,197,253,.8)",border:"1px solid rgba(59,130,246,.2)"}}>
                      ⏬ Paling Belakang
                    </button>
                  </div>
                  {/* Step: Naik / Turun 1 tingkat */}
                  <div style={{display:"flex",gap:3,marginBottom:5}}>
                    <button
                      onClick={()=>objMoveUp(selectedObj.id)}
                      title="Naik 1 tingkat — tampil di atas object berikutnya"
                      style={{flex:1,padding:"5px 2px",fontSize:8.5,fontFamily:"'Cinzel',serif",
                        cursor:"pointer",border:"1px solid rgba(120,200,120,.25)",borderRadius:5,
                        background:"linear-gradient(135deg,#052e16,#14532d)",
                        color:"rgba(134,239,172,.9)",letterSpacing:"0.04em",
                        boxShadow:"0 0 6px rgba(0,180,80,.15)"}}>
                      ▲ Naik Tingkat
                    </button>
                    <button
                      onClick={()=>objMoveDown(selectedObj.id)}
                      title="Turun 1 tingkat — masuk ke belakang object berikutnya"
                      style={{flex:1,padding:"5px 2px",fontSize:8.5,fontFamily:"'Cinzel',serif",
                        cursor:"pointer",border:"1px solid rgba(200,80,80,.2)",borderRadius:5,
                        background:"linear-gradient(135deg,#2d1111,#7f1d1d)",
                        color:"rgba(252,165,165,.85)",letterSpacing:"0.04em",
                        boxShadow:"0 0 6px rgba(180,0,0,.12)"}}>
                      ▼ Turun Tingkat
                    </button>
                  </div>
                  {/* Fine-tune manual */}
                  <div style={{fontSize:7.5,color:"rgba(120,90,180,.5)",marginBottom:3}}>
                    Fine-tune zIndex manual:
                  </div>
                  <input type="number" value={selectedObj.zIndex}
                    onChange={e=>objUpdate(selectedObj.id,{zIndex:+e.target.value})}
                    style={{...sInp,width:"100%"}}/>
                </div>
                {/* contentZoom */}
                <div style={{marginTop:7}}>
                  <div style={{fontSize:8.5,color:"rgba(255,200,60,.6)",marginBottom:3}}>
                    contentZoom (1 = normal, 1.6 = 160% visual):
                  </div>
                  <input type="number" step="0.1" min="1" max="3"
                    value={selectedObj.contentZoom ?? 1}
                    onChange={e=>{const v=+e.target.value;objUpdate(selectedObj.id,{contentZoom:v>1?v:undefined});}}
                    style={{...sInp,width:"100%"}}/>
                </div>
                {/* zoomAnchor */}
                {(selectedObj.contentZoom??1)>1&&(
                  <div style={{marginTop:5}}>
                    <div style={{fontSize:8.5,color:"rgba(255,200,60,.5)",marginBottom:3}}>Zoom Anchor:</div>
                    <div style={{display:"flex",gap:3}}>
                      {(["bottom-center","center","bottom-left"] as const).map(a=>(
                        <button key={a} onClick={()=>objUpdate(selectedObj.id,{zoomAnchor:a})}
                          style={{...sBtn((selectedObj.zoomAnchor??'bottom-center')===a,"#b45309"),fontSize:7.5,padding:"2px 4px",flex:1}}>
                          {a==="bottom-center"?"bot-ctr":a==="center"?"center":"bot-left"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Add Object ── */}
            {editorReady&&(
              <div style={{marginBottom:14,opacity:activeLayer==="objects"?1:.5,transition:"opacity .2s"}}>
                <h3 style={{...sH,color:"rgba(255,200,80,.85)"}}>➕ Tambah Object</h3>
                <input placeholder="https://... URL gambar" value={objUrl} onChange={e=>setObjUrl(e.target.value)} style={{...sInp,marginBottom:5}}/>
                <input placeholder="Label (opsional)" value={objLabel} onChange={e=>setObjLabel(e.target.value)} style={{...sInp,marginBottom:6}}/>

                {/* ── BG Mode Toggle ── */}
                <div style={{marginBottom:6}}>
                  <div style={{fontSize:8,color:"rgba(180,140,255,.6)",marginBottom:4,letterSpacing:"0.08em",fontFamily:"'Cinzel',serif",textTransform:"uppercase"}}>
                    Mode Background
                  </div>
                  <div style={{display:"flex",gap:4}}>
                    <button
                      onClick={()=>setObjBgRemove(false)}
                      style={{flex:1,padding:"5px 4px",fontSize:9,fontFamily:"'Cinzel',serif",
                        cursor:"pointer",border:"none",borderRadius:5,letterSpacing:"0.04em",
                        background:!objBgRemove?"linear-gradient(135deg,#4a2800,#8a5000)":"rgba(20,10,40,.7)",
                        color:!objBgRemove?"#fcd34d":"rgba(160,120,80,.6)",
                        boxShadow:!objBgRemove?"0 0 8px rgba(180,100,0,.4)":"none",
                        outline:!objBgRemove?"1px solid rgba(200,140,0,.4)":"1px solid rgba(100,60,180,.2)"}}>
                      🖼 Normal BG
                    </button>
                    <button
                      onClick={()=>setObjBgRemove(true)}
                      disabled={objUrl?!isCloudinaryUrl(objUrl):false}
                      title={objUrl&&!isCloudinaryUrl(objUrl)?"Hanya berlaku untuk URL Cloudinary":"Hapus background otomatis via Cloudinary AI"}
                      style={{flex:1,padding:"5px 4px",fontSize:9,fontFamily:"'Cinzel',serif",
                        cursor:objUrl&&!isCloudinaryUrl(objUrl)?"not-allowed":"pointer",
                        border:"none",borderRadius:5,letterSpacing:"0.04em",
                        background:objBgRemove?"linear-gradient(135deg,#0a3a2a,#0d6644)":"rgba(20,10,40,.7)",
                        color:objBgRemove?"#6ee7b7":objUrl&&!isCloudinaryUrl(objUrl)?"rgba(80,80,80,.5)":"rgba(80,180,140,.6)",
                        boxShadow:objBgRemove?"0 0 8px rgba(0,180,100,.3)":"none",
                        outline:objBgRemove?"1px solid rgba(0,200,120,.3)":"1px solid rgba(100,60,180,.2)"}}>
                      ✨ Transparan BG
                    </button>
                  </div>
                  {/* Non-cloudinary warning */}
                  {objUrl&&!isCloudinaryUrl(objUrl)&&(
                    <div style={{marginTop:4,padding:"3px 6px",background:"rgba(120,60,0,.25)",borderRadius:4,
                      fontSize:8,color:"rgba(255,180,80,.7)",border:"1px solid rgba(180,90,0,.25)"}}>
                      ⚠ Transparan BG hanya untuk URL Cloudinary
                    </div>
                  )}
                </div>

                {/* ── Preview ── */}
                {objUrl&&(()=>{
                  const previewSrc = applyBgRemoval(objUrl, objBgRemove && isCloudinaryUrl(objUrl));
                  const bgStyle = objBgRemove
                    ? "repeating-conic-gradient(rgba(150,150,150,.25) 0% 25%, rgba(30,30,30,.25) 0% 50%) 0 0 / 14px 14px"
                    : "#111";
                  return (
                    <div style={{marginBottom:6}}>
                      <div style={{fontSize:7.5,color:"rgba(150,110,220,.5)",marginBottom:3,letterSpacing:"0.06em",fontFamily:"'Cinzel',serif"}}>
                        {objBgRemove?"PREVIEW — Transparan (checkerboard = area transparan)":"PREVIEW — Normal"}
                      </div>
                      <div style={{width:"100%",height:70,borderRadius:5,overflow:"hidden",
                        background:bgStyle,border:"1px solid rgba(140,80,220,.25)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <img src={previewSrc} alt="" style={{maxWidth:"100%",maxHeight:"100%",objectFit:"contain"}}/>
                      </div>
                      {objBgRemove&&isCloudinaryUrl(objUrl)&&(
                        <div style={{marginTop:3,fontSize:7.5,color:"rgba(100,200,150,.55)",fontFamily:"monospace",
                          wordBreak:"break-all",lineHeight:1.4,padding:"3px 5px",
                          background:"rgba(0,80,40,.15)",borderRadius:3,border:"1px solid rgba(0,150,80,.15)"}}>
                          {previewSrc}
                        </div>
                      )}
                    </div>
                  );
                })()}

                <button onClick={addObject} style={{width:"100%",padding:"6px 0",fontSize:10.5,fontFamily:"'Cinzel',serif",
                  letterSpacing:"0.06em",cursor:"pointer",border:"none",borderRadius:6,
                  background:objUrl?"linear-gradient(135deg,#7a4a00,#c07a00)":"rgba(60,30,0,.5)",
                  color:objUrl?"#fff":"rgba(150,100,50,.5)"}}>➕ Taruh ke Map</button>
              </div>
            )}

            {/* ── Objects list ── */}
            {editorReady&&objects.length>0&&(
              <div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                  <h3 style={{...sH,marginBottom:0}}>📋 Objects ({objects.length})</h3>
                  <div style={{fontSize:7,color:"rgba(140,100,200,.4)",letterSpacing:"0.05em"}}>↓ Z rendah · ↑ Z tinggi</div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:3}}>
                  {[...objects].sort((a,b)=>a.zIndex-b.zIndex).map((o,rank)=>{
                    const isSelected=selectedId===o.id;
                    const maxZ=Math.max(...objects.map(x=>x.zIndex));
                    const minZ=Math.min(...objects.map(x=>x.zIndex));
                    const pct=maxZ===minZ?100:Math.round(((o.zIndex-minZ)/(maxZ-minZ))*100);
                    return (
                      <div key={o.id} style={{display:"flex",alignItems:"stretch",gap:2}}>
                        {/* Priority step buttons */}
                        <div style={{display:"flex",flexDirection:"column",gap:2,flexShrink:0}}>
                          <button onClick={e=>{e.stopPropagation();objMoveUp(o.id);}}
                            title="Naik 1 tingkat" style={{width:16,flex:1,fontSize:8,padding:0,
                              background:"rgba(0,80,40,.35)",border:"1px solid rgba(80,180,80,.2)",
                              borderRadius:3,cursor:"pointer",color:"rgba(134,239,172,.8)",lineHeight:1}}>▲</button>
                          <button onClick={e=>{e.stopPropagation();objMoveDown(o.id);}}
                            title="Turun 1 tingkat" style={{width:16,flex:1,fontSize:8,padding:0,
                              background:"rgba(80,10,10,.35)",border:"1px solid rgba(200,60,60,.2)",
                              borderRadius:3,cursor:"pointer",color:"rgba(252,165,165,.7)",lineHeight:1}}>▼</button>
                        </div>
                        {/* Main item button */}
                        <button onClick={()=>{setSelectedId(o.id);setTool("select");setActiveLayer("objects");}}
                          style={{flex:1,display:"flex",alignItems:"center",gap:5,padding:"4px 5px",
                            background:isSelected?"rgba(100,60,0,.5)":"rgba(20,10,40,.4)",
                            border:`1px solid ${isSelected?"rgba(200,140,40,.5)":"rgba(100,60,180,.2)"}`,
                            borderRadius:5,cursor:"pointer",textAlign:"left",minWidth:0}}>
                          <img src={o.src} alt="" style={{width:20,height:20,objectFit:"contain",borderRadius:3,flexShrink:0,background:"rgba(0,0,0,.5)"}}/>
                          <div style={{flex:1,overflow:"hidden",minWidth:0}}>
                            <div style={{fontSize:9,color:"rgba(220,190,150,.9)",textOverflow:"ellipsis",overflow:"hidden",whiteSpace:"nowrap"}}>
                              {o.label||"(unlabeled)"}
                            </div>
                            <div style={{display:"flex",alignItems:"center",gap:4,marginTop:1}}>
                              {/* Priority bar */}
                              <div style={{flex:1,height:3,borderRadius:2,background:"rgba(60,30,120,.4)",overflow:"hidden"}}>
                                <div style={{height:"100%",width:`${pct}%`,borderRadius:2,
                                  background:`linear-gradient(90deg,rgba(100,60,200,.5),rgba(180,100,255,.8))`}}/>
                              </div>
                              <div style={{fontFamily:"monospace",fontSize:7,color:"rgba(160,130,220,.5)",flexShrink:0}}>z{o.zIndex}</div>
                            </div>
                          </div>
                        </button>
                        {/* ⧉ Duplikat per item */}
                        <button
                          onClick={e=>{e.stopPropagation();duplicateObj(o.id);}}
                          title={`Duplikat "${o.label||"object"}"`}
                          style={{width:20,flexShrink:0,
                            background:"rgba(0,40,80,.55)",
                            border:"1px solid rgba(60,160,255,.28)",
                            borderRadius:4,cursor:"pointer",
                            color:"rgba(100,200,255,.9)",fontSize:12,
                            display:"flex",alignItems:"center",
                            justifyContent:"center",
                            padding:0,lineHeight:1}}>⧉</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── VIEWPORT ── */}
        <div ref={viewportRef}
          style={{flex:1,position:"relative",overflow:"hidden",
            background:"repeating-conic-gradient(rgba(20,10,50,.12) 0% 25%,transparent 0% 50%) 0 0/18px 18px",
            cursor:vpCursor}}
          onPointerDown={onVpDown} onPointerMove={onVpMove}
          onPointerUp={onVpUp} onPointerLeave={onVpUp}
          onWheel={onVpWheel} onContextMenu={e=>{e.preventDefault();e.stopPropagation();}}>

          {!editorReady?(
            <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,pointerEvents:"none"}}>
              <div style={{fontSize:52,filter:"drop-shadow(0 0 20px rgba(140,60,220,.25))"}}>🗺</div>
              <div style={{fontFamily:"'Cinzel',serif",fontSize:13,letterSpacing:"0.12em",color:"rgba(140,100,220,.4)"}}>
                {mode==="edit"?'Pilih map → Muat Map':'Konfigurasi → Buat Map'}
              </div>
            </div>
          ):(
            /* World container */
            <div style={{position:"absolute",left:0,top:0,transformOrigin:"0 0",
              transform:`translate(${cam.panX}px,${cam.panY}px) scale(${cam.scale})`,
              width:mapCols*TILE_PX,height:mapRows*TILE_PX}}>

              <canvas ref={canvasRef} width={mapCols*TILE_PX} height={mapRows*TILE_PX}
                style={{display:"block",imageRendering:"pixelated",pointerEvents:"none",
                  opacity:layers.ground.visible?(activeLayer==="ground"?1:.45):0,transition:"opacity .2s"}}/>

              {/* ── Phase 4: Image Tile Layer ── */}
              {layers.ground.visible&&Object.entries(tileImages).map(([key,url])=>{
                const[kx,ky]=key.split(",").map(Number);
                const isHover=hoverTile?.x===kx&&hoverTile?.y===ky&&tool==="imgpaint";
                return(
                  <div key={key} style={{position:"absolute",left:kx*TILE_PX,top:ky*TILE_PX,
                    width:TILE_PX,height:TILE_PX,pointerEvents:"none",zIndex:3,
                    outline:isHover?"1.5px solid rgba(255,80,80,.9)":"none",boxSizing:"border-box"}}>
                    <img src={url} alt="" draggable={false} style={{width:"100%",height:"100%",
                      objectFit:"cover",display:"block",imageRendering:"pixelated",
                      opacity:activeLayer==="ground"?1:.5}}/>
                    {isHover&&<div style={{position:"absolute",inset:0,background:"rgba(255,80,60,.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18/cam.scale}}>✕</div>}
                  </div>
                );
              })}

              {/* Image tile ghost preview while imgpaint hover */}
              {tool==="imgpaint"&&selectedTileImg&&hoverTile&&isInMap&&!tileImages[`${hoverTile.x},${hoverTile.y}`]&&(
                <div style={{position:"absolute",left:hoverTile.x*TILE_PX,top:hoverTile.y*TILE_PX,
                  width:TILE_PX,height:TILE_PX,pointerEvents:"none",zIndex:4,opacity:.65,
                  outline:"1.5px dashed rgba(180,255,180,.7)",boxSizing:"border-box"}}>
                  <img src={selectedTileImg} alt="" draggable={false} style={{width:"100%",height:"100%",
                    objectFit:"cover",display:"block",imageRendering:"pixelated"}}/>
                </div>
              )}

              {showGrid&&layers.ground.visible&&(
                <div style={{position:"absolute",inset:0,pointerEvents:"none",
                  backgroundImage:`linear-gradient(rgba(80,50,160,.2) 1px,transparent 1px),linear-gradient(90deg,rgba(80,50,160,.2) 1px,transparent 1px)`,
                  backgroundSize:`${TILE_PX}px ${TILE_PX}px`,
                  opacity:activeLayer==="ground"?1:.35,transition:"opacity .2s"}}/>
              )}

              {/* Hover highlight */}
              {hoverTile&&isInMap&&activeLayer==="ground"&&(
                <div style={{position:"absolute",left:hoverTile.x*TILE_PX,top:hoverTile.y*TILE_PX,
                  width:TILE_PX,height:TILE_PX,pointerEvents:"none",zIndex:5,
                  background:tool==="block"
                    ?(hoverIsCustomBlocked?"rgba(255,80,80,.25)":hoverIsCustomAllowed?"rgba(80,255,100,.2)":"rgba(255,150,50,.15)")
                    :tool==="paint"?"rgba(140,80,255,.2)":tool==="erase"?"rgba(255,80,60,.2)":"rgba(255,255,255,.05)",
                  outline:`1.5px solid ${tool==="block"
                    ?(hoverIsCustomBlocked?"rgba(255,80,80,.8)":hoverIsCustomAllowed?"rgba(80,255,100,.8)":"rgba(255,150,50,.6)")
                    :"rgba(200,150,255,.5)"}`}}>
                  {/* Block tool cursor hint */}
                  {tool==="block"&&(
                    <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:16/cam.scale,opacity:.7,pointerEvents:"none"}}>
                      {hoverIsCustomBlocked?"✕":hoverIsCustomAllowed?"✓":"🔒"}
                    </div>
                  )}
                </div>
              )}

              {cam.scale>=0.5&&hoverTile&&isInMap&&(
                <div style={{position:"absolute",left:hoverTile.x*TILE_PX+2,top:hoverTile.y*TILE_PX+2,
                  fontSize:9/cam.scale,color:"rgba(255,255,255,.4)",fontFamily:"monospace",pointerEvents:"none",zIndex:6,lineHeight:1}}>
                  {hoverTile.x},{hoverTile.y}
                </div>
              )}

              {/* Transition tile overlays */}
              {Object.entries(transitions).map(([key,tr])=>{
                const[kx,ky]=key.split(",").map(Number);
                const isEditing=editingTransTile?.tx===kx&&editingTransTile?.ty===ky;
                return(
                  <div key={key} style={{position:"absolute",left:kx*TILE_PX,top:ky*TILE_PX,
                    width:TILE_PX,height:TILE_PX,pointerEvents:"none",zIndex:15,
                    background:isEditing?"rgba(255,180,40,.3)":"rgba(255,160,20,.18)",
                    outline:isEditing?`2px solid rgba(255,200,60,.9)`:`1.5px solid rgba(255,160,20,.6)`}}>
                    <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",
                      alignItems:"center",justifyContent:"center",fontSize:11/cam.scale,
                      color:"rgba(255,220,80,.9)",lineHeight:1.2,textAlign:"center"}}>
                      <span>🔀</span>
                      {cam.scale>=0.6&&<span style={{fontSize:7/cam.scale,color:"rgba(255,200,60,.75)",
                        background:"rgba(0,0,0,.55)",padding:`${1/cam.scale}px ${2/cam.scale}px`,borderRadius:2/cam.scale}}>
                        {tr.toMap}
                      </span>}
                    </div>
                  </div>
                );
              })}

              {/* Transition hover hint */}
              {tool==="transition"&&hoverTile&&isInMap&&(
                <div style={{position:"absolute",left:hoverTile.x*TILE_PX,top:hoverTile.y*TILE_PX,
                  width:TILE_PX,height:TILE_PX,pointerEvents:"none",zIndex:16,
                  background:"rgba(255,180,40,.15)",outline:"1.5px solid rgba(255,200,60,.5)"}}/>
              )}

              {/* Objects overlay */}
              <div style={{position:"absolute",inset:0,zIndex:20,
                opacity:layers.objects.visible?(activeLayer==="objects"?1:.45):0,
                transition:"opacity .2s",pointerEvents:"none"}}>
                {objects.map(obj=>(
                  <ResizableObject key={obj.id} obj={obj} selected={selectedId===obj.id}
                    scale={cam.scale} isSelectMode={isSelectMode} snapGrid={snapToGrid}
                    onPointerDown={objPointerDown} onUpdate={objUpdate} onDelete={objDelete}/>
                ))}
              </div>

              {activeLayer==="objects"&&layers.ground.visible&&(
                <div style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:10,background:"rgba(5,2,15,.3)"}}/>
              )}
              <div style={{position:"absolute",inset:0,pointerEvents:"none",boxShadow:"inset 0 0 0 2px rgba(140,80,220,.4)"}}/>
            </div>
          )}

          {/* ── TRANSITION EDIT POPUP ── */}
          {editingTransTile&&tool==="transition"&&(()=>{
            const key=`${editingTransTile.tx},${editingTransTile.ty}`;
            const vp=viewportRef.current?.getBoundingClientRect();
            // Position popup near the tile in viewport coords
            const wx=(editingTransTile.tx*TILE_PX*cam.scale)+cam.panX;
            const wy=(editingTransTile.ty*TILE_PX*cam.scale)+cam.panY;
            const popX=Math.min(wx+TILE_PX*cam.scale+8, (vp?.width??800)-250);
            const popY=Math.max(4, Math.min(wy, (vp?.height??600)-280));
            const hasExisting=!!transitions[key];
            const stopAll=(e:React.SyntheticEvent)=>{e.stopPropagation();e.preventDefault();};
            const stopProp=(e:React.SyntheticEvent)=>{e.stopPropagation();};
            return(<>
              {/* Invisible full-viewport blocker — prevents ANY pointer event reaching tiles behind */}
              <div style={{position:"absolute",inset:0,zIndex:799,cursor:"not-allowed"}}
                onPointerDown={stopAll} onPointerMove={stopAll} onPointerUp={stopAll}
                onClick={stopAll} onContextMenu={stopAll} onWheel={stopAll}/>
              <div style={{position:"absolute",left:popX,top:popY,width:230,zIndex:800,
                background:"linear-gradient(135deg,rgba(12,4,32,.98),rgba(6,2,18,.98))",
                border:"1.5px solid rgba(255,180,40,.5)",borderRadius:10,
                boxShadow:"0 8px 32px rgba(0,0,0,.8),0 0 20px rgba(255,160,20,.15)",
                padding:"12px 14px",fontFamily:"'Crimson Text',serif",cursor:"default"}}
                onPointerDown={stopProp} onPointerMove={stopProp} onPointerUp={stopProp}
                onClick={stopProp} onContextMenu={stopProp} onWheel={stopProp}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                  <span style={{fontFamily:"'Cinzel',serif",fontSize:10.5,color:"rgba(255,200,60,.9)",letterSpacing:"0.08em"}}>
                    🔀 Tile ({editingTransTile.tx},{editingTransTile.ty})
                  </span>
                  <button onClick={()=>setEditingTransTile(null)}
                    style={{background:"none",border:"none",cursor:"pointer",color:"rgba(180,140,220,.6)",fontSize:13,padding:0}}>✕</button>
                </div>
                {/* toMap */}
                <div style={{marginBottom:7}}>
                  <div style={{fontSize:8.5,color:"rgba(200,160,100,.6)",marginBottom:3}}>→ Tujuan Map (toMap):</div>
                  <select
                    value={transDraft.toMap==="__custom__"||!ALL_MAPS[transDraft.toMap]&&transDraft.toMap!==""?"__custom__":transDraft.toMap}
                    onChange={e=>{
                      if(e.target.value==="__custom__"){
                        setCustomMapStr("");
                        setTransDraft(p=>({...p,toMap:"__custom__"}));
                      } else {
                        setTransDraft(p=>({...p,toMap:e.target.value}));
                      }
                    }}
                    style={{...sInp,width:"100%",cursor:"pointer"}}>
                    <option value="">-- pilih map --</option>
                    {Object.keys(ALL_MAPS).map(id=>(
                      <option key={id} value={id}>{id}</option>
                    ))}
                    <option value="__custom__">✎ custom (ketik manual)</option>
                  </select>
                  {(transDraft.toMap==="__custom__"||(transDraft.toMap!==""&&!ALL_MAPS[transDraft.toMap]))&&(
                    <input
                      placeholder="nama map custom..."
                      value={transDraft.toMap==="__custom__"?customMapStr:transDraft.toMap}
                      onChange={e=>{
                        setCustomMapStr(e.target.value);
                        setTransDraft(p=>({...p,toMap:e.target.value||"__custom__"}));
                      }}
                      style={{...sInp,width:"100%",marginTop:4}}
                      autoFocus
                    />
                  )}
                </div>
                {/* spawnX spawnY */}
                <div style={{display:"flex",gap:6,marginBottom:7}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:8.5,color:"rgba(200,160,100,.6)",marginBottom:3}}>Spawn X:</div>
                    <input type="number" min={0} value={transDraft.spawnX}
                      onChange={e=>setTransDraft(p=>({...p,spawnX:+e.target.value}))}
                      style={{...sInp,width:"100%"}}/>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:8.5,color:"rgba(200,160,100,.6)",marginBottom:3}}>Spawn Y:</div>
                    <input type="number" min={0} value={transDraft.spawnY}
                      onChange={e=>setTransDraft(p=>({...p,spawnY:+e.target.value}))}
                      style={{...sInp,width:"100%"}}/>
                  </div>
                </div>
                {/* facing */}
                <div style={{marginBottom:7}}>
                  <div style={{fontSize:8.5,color:"rgba(200,160,100,.6)",marginBottom:3}}>Facing saat spawn:</div>
                  <div style={{display:"flex",gap:3}}>
                    {(["up","down","left","right"] as const).map(f=>(
                      <button key={f} onClick={()=>setTransDraft(p=>({...p,facing:f}))}
                        style={{...sBtn(transDraft.facing===f,"#b45309"),fontSize:8.5,flex:1,padding:"3px 2px"}}>{f}</button>
                    ))}
                  </div>
                </div>
                {/* immediate */}
                <div style={{marginBottom:10,display:"flex",alignItems:"center",gap:7}}>
                  <button onClick={()=>setTransDraft(p=>({...p,immediate:!p.immediate}))}
                    style={{...sBtn(!!transDraft.immediate,"#15803d"),fontSize:8.5,padding:"3px 8px"}}>
                    {transDraft.immediate?"✓ Immediate":"Immediate"}
                  </button>
                  <span style={{fontSize:8,color:"rgba(140,120,180,.5)"}}>langsung pindah tanpa animasi fade</span>
                </div>
                {/* Buttons */}
                <div style={{display:"flex",gap:6}}>
                  {(()=>{
                    const finalMap = transDraft.toMap==="__custom__"?"":transDraft.toMap;
                    const canSave = !!finalMap;
                    return (
                      <button disabled={!canSave}
                        onClick={()=>{
                          if(!canSave)return;
                          pushHist();
                          setTransitions(p=>({...p,[key]:{...transDraft,toMap:finalMap}}));
                          setEditingTransTile(null);
                        }}
                        style={{flex:1,padding:"6px 0",fontSize:10,fontFamily:"'Cinzel',serif",
                          letterSpacing:"0.05em",cursor:canSave?"pointer":"not-allowed",border:"none",borderRadius:6,
                          background:canSave?"linear-gradient(135deg,#b45309,#d97706)":"rgba(60,30,0,.5)",
                          color:canSave?"#fff":"rgba(150,100,50,.5)"}}>
                        {hasExisting?"✎ Update":"➕ Tambah"}
                      </button>
                    );
                  })()}
                  {hasExisting&&(
                    <button onClick={()=>{
                      pushHist();
                      setTransitions(p=>{const n={...p};delete n[key];return n;});
                      setEditingTransTile(null);
                    }}
                      style={{padding:"6px 10px",fontSize:10,cursor:"pointer",border:"1px solid rgba(200,60,60,.3)",
                        borderRadius:6,background:"rgba(100,20,20,.4)",color:"rgba(255,120,80,.8)"}}>
                      🗑
                    </button>
                  )}
                </div>
              </div>
            </>);
          })()}

          {/* ── MINIMAP ── */}
          {editorReady&&(
            <div style={{position:"absolute",bottom:34,right:14,zIndex:500,borderRadius:8,overflow:"hidden",
              boxShadow:"0 4px 24px rgba(0,0,0,.7),0 0 0 1.5px rgba(140,80,220,.4)",animation:"mmPulse 3s ease-in-out infinite"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"3px 7px",
                background:"rgba(8,3,20,.92)",borderBottom:"1px solid rgba(140,80,220,.25)"}}>
                <span style={{fontSize:8.5,fontFamily:"'Cinzel',serif",color:"rgba(180,140,255,.7)",letterSpacing:"0.08em"}}>
                  🗺 MINIMAP
                  {customBlocked.size>0&&<span style={{color:"rgba(255,100,100,.7)",marginLeft:6}}>🔴{customBlocked.size}</span>}
                  {customAllowed.size>0&&<span style={{color:"rgba(100,255,120,.7)",marginLeft:4}}>🟢{customAllowed.size}</span>}
                  {Object.keys(transitions).length>0&&<span style={{color:"rgba(255,200,60,.7)",marginLeft:4}}>🔀{Object.keys(transitions).length}</span>}
                  {Object.keys(tileImages).length>0&&<span style={{color:"rgba(120,255,180,.7)",marginLeft:4}}>🖼{Object.keys(tileImages).length}</span>}
                </span>
                <button onClick={()=>setMmExpanded(v=>!v)}
                  style={{background:"none",border:"none",cursor:"pointer",fontSize:9,color:"rgba(140,100,200,.6)",padding:0}}>
                  {mmExpanded?"▼":"▲"}
                </button>
              </div>
              {mmExpanded&&(
                <canvas ref={minimapRef} width={MM_W} height={MM_H}
                  onClick={onMinimapClick}
                  style={{display:"block",cursor:"crosshair",imageRendering:"pixelated"}}
                  title="Klik untuk navigasi"/>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ════ STATUS BAR ════ */}
      <div style={{height:24,flexShrink:0,display:"flex",alignItems:"center",gap:10,padding:"0 14px",
        background:"rgba(4,1,12,.95)",borderTop:"1px solid rgba(100,50,180,.15)",
        fontSize:9.5,color:"rgba(140,110,200,.65)",fontFamily:"monospace"}}>
        {editorReady&&<>
          <span>{mapCols}×{mapRows}</span>
          <span style={{color:"rgba(80,60,130,.4)"}}>|</span>
          <span style={{color:activeLayer==="ground"?"rgba(160,110,255,.8)":"rgba(255,180,60,.8)",fontFamily:"'Cinzel',serif",fontSize:8.5,letterSpacing:"0.05em"}}>
            {activeLayer==="ground"?"🗺 GROUND":"📦 OBJECTS"}
          </span>
          <span style={{color:"rgba(80,60,130,.4)"}}>|</span>
          {/* Tool status */}
          {tool==="block"?(
            <span style={{color:"rgba(255,130,100,.85)"}}>
              🔒 COLLISION — LMB=Blokir / RMB=Izinkan / Klik sama=hapus
            </span>
          ):tool==="transition"?(
            <span style={{color:"rgba(255,200,60,.85)"}}>
              🔀 TRANSITION — Klik tile untuk set transisi antar map · {Object.keys(transitions).length} tile
            </span>
          ):tool==="imgpaint"?(
            <span style={{color:"rgba(120,255,180,.85)"}}>
              🖼 IMAGE TILE — {selectedTileImg?"LMB=cat RMB=hapus drag=cat banyak":"⚠ Pilih tile dari library dulu!"} · {Object.keys(tileImages).length} tile di-cat
            </span>
          ):tool==="camera"?(
            <span style={{color:"rgba(125,211,252,.9)"}}>
              🎥 CAMERA MODE — Klik tahan + geser untuk pan kamera · Scroll=zoom · Tekan [C] untuk aktif
            </span>
          ):(
            <span style={{color:tool==="paint"?"rgba(180,130,255,.8)":tool==="erase"?"rgba(255,160,80,.8)":"rgba(100,180,255,.8)"}}>
              {tool==="paint"?`🖌 ${TILE_LABEL[paintType]}`:tool==="erase"?"✏ ERASE":"↖ SELECT"}
            </span>
          )}
          {snapToGrid&&<span style={{color:"rgba(100,200,100,.7)"}}>⊞ SNAP</span>}
          {hoverTile&&isInMap&&<>
            <span style={{color:"rgba(80,60,130,.4)"}}>|</span>
            <span>({hoverTile.x},{hoverTile.y})</span>
            {/* Collision state of hovered tile */}
            <span style={{color:hoverIsCustomBlocked?"rgba(255,100,100,.9)":hoverIsCustomAllowed?"rgba(100,255,130,.9)":hoverEffectiveBlocked?"rgba(200,80,80,.5)":"rgba(100,200,100,.5)"}}>
              {hoverIsCustomBlocked?"🔴 FORCE-BLOCKED":hoverIsCustomAllowed?"🟢 FORCE-ALLOWED":hoverEffectiveBlocked?"🔴 BLOCKED":"🟢 WALKABLE"}
            </span>
            {transitions[hoverKey]&&(
              <span style={{color:"rgba(255,210,60,.85)"}}>
                🔀 → {transitions[hoverKey].toMap} ({transitions[hoverKey].spawnX},{transitions[hoverKey].spawnY})
              </span>
            )}
          </>}
          {selectedObj&&<><span style={{color:"rgba(80,60,130,.4)"}}>|</span><span style={{color:"rgba(255,200,80,.8)"}}>📦 {selectedObj.label||selectedObj.id}</span></>}
        </>}
        <span style={{flex:1}}/>
        <span style={{color:"rgba(90,70,140,.4)"}}>[B]=Collision [T]=Transition [I]=ImgTile [1]Ground [2]Objects [G]Snap · Ctrl+Z=undo</span>
        <span style={{color:"rgba(80,60,130,.4)"}}>|</span>
        <span>{zoomPct}%</span>
      </div>

      {/* ════ AUTO SETUP WIZARD ════ */}
      {showSqlSetup&&(
        <div style={{position:"fixed",inset:0,zIndex:9100,background:"rgba(0,0,0,.88)",
          display:"flex",alignItems:"center",justifyContent:"center",animation:"me2FadeIn .18s ease both"}}
          onClick={()=>{if(setupStatus!=="running")setShowSqlSetup(false);}}>
          <div style={{width:"min(580px,94vw)",display:"flex",flexDirection:"column",
            background:"linear-gradient(145deg,rgba(6,2,18,.99),rgba(3,1,10,.99))",
            border:"1.5px solid rgba(80,180,120,.45)",borderRadius:16,
            boxShadow:"0 0 80px rgba(40,180,80,.15),0 24px 80px rgba(0,0,0,.9)"}}
            onClick={e=>e.stopPropagation()}>

            {/* Header */}
            <div style={{padding:"14px 20px",display:"flex",alignItems:"center",gap:10,
              borderBottom:"1px solid rgba(80,180,120,.2)"}}>
              <span style={{fontSize:22}}>🛠</span>
              <div style={{flex:1}}>
                <div style={{fontFamily:"'Cinzel',serif",color:"rgba(140,230,170,.95)",fontSize:13,letterSpacing:"0.1em"}}>
                  Database Setup — Tabel Maps
                </div>
                <div style={{fontSize:9,color:"rgba(100,180,120,.55)",marginTop:1}}>
                  Buat tabel maps di Supabase agar Map Editor bisa menyimpan data permanen
                </div>
              </div>
              {setupStatus!=="running"&&(
                <button onClick={()=>setShowSqlSetup(false)} style={{...sBtn(),padding:"4px 8px",fontSize:12}}>✕</button>
              )}
            </div>

            {/* Body */}
            <div style={{padding:"18px 20px",display:"flex",flexDirection:"column",gap:14}}>

              {setupStatus==="done" ? (
                /* ── Success state ── */
                <div style={{textAlign:"center",padding:"20px 10px"}}>
                  <div style={{fontSize:44,marginBottom:10}}>✅</div>
                  <div style={{fontFamily:"'Cinzel',serif",color:"rgba(120,220,160,.95)",fontSize:13,marginBottom:8}}>
                    Setup Berhasil!
                  </div>
                  <div style={{fontSize:10,color:"rgba(140,200,160,.7)",lineHeight:1.8,whiteSpace:"pre-wrap"}}>
                    {setupMsg}
                  </div>
                  <button onClick={()=>{setShowSqlSetup(false);setSetupStatus("idle");setSetupKey("");setSetupMsg("");}}
                    style={{...sBtn(),marginTop:16,padding:"8px 24px",fontSize:11,
                      background:"linear-gradient(135deg,#14532d,#166534)",color:"#86efac"}}>
                    ✓ Tutup & Mulai Simpan
                  </button>
                </div>
              ) : (
                <>
                  {/* Pilihan: Auto vs Manual */}
                  <div style={{background:"rgba(80,180,120,.07)",border:"1px solid rgba(80,180,120,.2)",
                    borderRadius:9,padding:"12px 14px"}}>
                    <div style={{fontFamily:"'Cinzel',serif",color:"rgba(140,220,160,.8)",fontSize:10,
                      letterSpacing:"0.08em",marginBottom:8}}>
                      🚀 OPSI 1 — AUTO SETUP (Direkomendasikan)
                    </div>
                    <div style={{fontSize:9,color:"rgba(160,200,160,.65)",lineHeight:1.7,marginBottom:10}}>
                      Paste <strong style={{color:"rgba(200,230,200,.8)"}}>Personal Access Token (PAT)</strong> dari akun Supabase kamu.<br/>
                      PAT berbeda dari Service Role Key — ambil di:<br/>
                      <span style={{color:"rgba(120,200,255,.7)"}}>supabase.com/dashboard/account/tokens</span>
                    </div>
                    <div style={{display:"flex",gap:7,alignItems:"center",marginBottom:8}}>
                      <input
                        type="password"
                        placeholder="sbp_xxxxxxxxxxxx (Personal Access Token)"
                        value={setupKey}
                        onChange={e=>setSetupKey(e.target.value)}
                        disabled={setupStatus==="running"}
                        style={{...sInp,flex:1,fontSize:10}}
                      />
                      <button
                        onClick={doAutoSetup}
                        disabled={setupStatus==="running"||!setupKey.trim()}
                        style={{...sBtn(),padding:"5px 12px",fontSize:10,flexShrink:0,
                          background:setupStatus==="running"?"rgba(30,15,60,.7)":"linear-gradient(135deg,#14532d,#166534)",
                          color:setupStatus==="running"?"rgba(140,200,140,.4)":"#86efac",
                          cursor:setupStatus==="running"||!setupKey.trim()?"not-allowed":"pointer"}}>
                        {setupStatus==="running"?"⏳ Membuat…":"⚡ Auto Create"}
                      </button>
                    </div>
                    {/* Status message */}
                    {setupMsg&&setupStatus==="error"&&(
                      <div style={{fontSize:9,color:"rgba(255,150,150,.85)",background:"rgba(200,50,50,.1)",
                        border:"1px solid rgba(255,100,100,.2)",borderRadius:6,padding:"8px 10px",
                        lineHeight:1.7,whiteSpace:"pre-wrap"}}>
                        {setupMsg}
                      </div>
                    )}
                    <a href="https://supabase.com/dashboard/account/tokens" target="_blank" rel="noopener noreferrer"
                      style={{display:"inline-block",marginTop:4,fontSize:8.5,color:"rgba(120,180,255,.6)",textDecoration:"none"}}>
                      → Buka halaman Personal Access Tokens ↗
                    </a>
                  </div>

                  {/* Divider */}
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{flex:1,height:1,background:"rgba(120,80,200,.15)"}}/>
                    <span style={{fontSize:9,color:"rgba(120,100,160,.4)"}}>atau lakukan manual</span>
                    <div style={{flex:1,height:1,background:"rgba(120,80,200,.15)"}}/>
                  </div>

                  {/* Manual fallback */}
                  <div style={{background:"rgba(80,50,180,.06)",border:"1px solid rgba(100,70,200,.2)",
                    borderRadius:9,padding:"12px 14px"}}>
                    <div style={{fontFamily:"'Cinzel',serif",color:"rgba(180,150,255,.7)",fontSize:10,
                      letterSpacing:"0.08em",marginBottom:8}}>
                      📋 OPSI 2 — MANUAL (SQL Editor)
                    </div>
                    <div style={{fontSize:9,color:"rgba(160,140,200,.55)",lineHeight:1.7,marginBottom:10}}>
                      Buka <strong style={{color:"rgba(180,160,255,.75)"}}>Supabase Dashboard → SQL Editor → New query</strong>,
                      paste SQL di bawah ini, lalu klik Run.
                    </div>
                    <div style={{display:"flex",gap:6,marginBottom:8}}>
                      <button onClick={()=>copyToClipboard(MAPS_SETUP_SQL)}
                        style={{...sBtn(),fontSize:9,background:"linear-gradient(135deg,#1e3a8a,#1d4ed8)",color:"#bfdbfe"}}>
                        📋 Salin SQL Setup
                      </button>
                      <a href={`https://supabase.com/dashboard/project/${SUPABASE_PROJECT_ID}/editor`} target="_blank" rel="noopener noreferrer"
                        style={{...sBtn(),fontSize:9,textDecoration:"none",display:"inline-block",
                          background:"rgba(30,15,60,.8)",color:"rgba(160,130,255,.75)"}}>
                        🔗 Buka SQL Editor Project Ini
                      </a>
                    </div>
                    <pre className="me2-scroll" style={{maxHeight:120,overflowY:"auto",margin:0,
                      fontSize:9,lineHeight:1.55,fontFamily:"monospace",padding:"8px 10px",
                      color:"rgba(140,200,140,.7)",background:"rgba(0,0,0,.4)",
                      borderRadius:6,border:"1px solid rgba(80,180,120,.15)",whiteSpace:"pre-wrap"}}>
                      {MAPS_SETUP_SQL}
                    </pre>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════ DB DIAGNOSTICS MODAL ════ */}
      {showDiag&&(
        <div style={{position:"fixed",inset:0,zIndex:9200,background:"rgba(0,0,0,.88)",
          display:"flex",alignItems:"center",justifyContent:"center"}}
          onClick={()=>{if(!diagRunning)setShowDiag(false);}}>
          <div style={{width:"min(600px,94vw)",maxHeight:"88vh",display:"flex",flexDirection:"column",
            background:"linear-gradient(145deg,rgba(4,1,14,.99),rgba(2,1,8,.99))",
            border:"1.5px solid rgba(100,200,120,.35)",borderRadius:16,
            boxShadow:"0 0 80px rgba(40,200,80,.1),0 24px 80px rgba(0,0,0,.9)"}}
            onClick={e=>e.stopPropagation()}>

            {/* Header */}
            <div style={{padding:"14px 20px",display:"flex",alignItems:"center",gap:10,
              borderBottom:"1px solid rgba(100,200,120,.18)"}}>
              <span style={{fontSize:22}}>🔬</span>
              <div style={{flex:1}}>
                <div style={{fontFamily:"'Cinzel',serif",color:"rgba(140,230,170,.95)",fontSize:13,letterSpacing:"0.08em"}}>
                  Diagnosa Koneksi Database
                </div>
                <div style={{fontSize:9,color:"rgba(100,180,120,.5)",marginTop:1}}>
                  Test step-by-step: client → network → tabel → RLS policy
                </div>
              </div>
              {!diagRunning&&(
                <button onClick={()=>setShowDiag(false)} style={{...sBtn(),padding:"4px 8px",fontSize:12}}>✕</button>
              )}
            </div>

            {/* Body */}
            <div style={{padding:"16px 20px",display:"flex",flexDirection:"column",gap:10,overflowY:"auto"}} className="me2-scroll">

              {/* Run button */}
              <button onClick={doDiagnose} disabled={diagRunning}
                style={{...sBtn(),padding:"8px 18px",fontSize:11,alignSelf:"flex-start",
                  background:diagRunning?"rgba(20,10,40,.7)":"linear-gradient(135deg,#14532d,#166534)",
                  color:diagRunning?"rgba(140,200,140,.4)":"#86efac",
                  cursor:diagRunning?"not-allowed":"pointer"}}>
                {diagRunning ? "⏳ Menjalankan tes…" : diagSteps.length > 0 ? "🔄 Jalankan Ulang" : "▶ Jalankan Diagnosa"}
              </button>

              {/* Results */}
              {diagSteps.length === 0 && !diagRunning && (
                <div style={{fontSize:10,color:"rgba(120,160,120,.5)",fontStyle:"italic",padding:"8px 0"}}>
                  Klik tombol di atas untuk mulai diagnosa. Proses berlangsung ~2–5 detik.
                </div>
              )}

              {diagSteps.map((step, i) => {
                const colors = {
                  ok:   { bg:"rgba(20,80,40,.3)",  border:"rgba(80,180,80,.25)",  icon:"✅", text:"rgba(140,240,140,.9)" },
                  fail: { bg:"rgba(80,15,15,.4)",   border:"rgba(200,60,60,.3)",   icon:"❌", text:"rgba(255,150,150,.9)" },
                  warn: { bg:"rgba(60,50,10,.35)",  border:"rgba(200,160,40,.25)", icon:"⚠️", text:"rgba(240,200,80,.9)"  },
                  pending: { bg:"rgba(10,10,30,.3)", border:"rgba(80,80,160,.2)", icon:"⏳", text:"rgba(160,160,255,.7)" },
                };
                const c = colors[step.status];
                return (
                  <div key={i} style={{background:c.bg,border:`1px solid ${c.border}`,borderRadius:8,padding:"10px 12px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:step.detail?5:0}}>
                      <span style={{fontSize:14}}>{c.icon}</span>
                      <span style={{fontFamily:"'Cinzel',serif",fontSize:10,color:c.text,letterSpacing:"0.05em"}}>
                        {step.label}
                      </span>
                    </div>
                    {step.detail&&(
                      <pre style={{margin:0,fontSize:9,color:"rgba(200,220,200,.65)",lineHeight:1.7,
                        whiteSpace:"pre-wrap",wordBreak:"break-word",fontFamily:"monospace",
                        paddingLeft:21}}>
                        {step.detail}
                      </pre>
                    )}
                  </div>
                );
              })}

              {/* Action shortcuts setelah diagnosa */}
              {diagSteps.length > 0 && !diagRunning && (
                <div style={{marginTop:4,paddingTop:10,borderTop:"1px solid rgba(100,180,100,.1)",
                  display:"flex",gap:8,flexWrap:"wrap"}}>
                  <button onClick={()=>{setShowDiag(false);setShowSqlSetup(true);}}
                    style={{...sBtn(),fontSize:9,padding:"5px 10px",
                      background:"linear-gradient(135deg,#14532d,#166534)",color:"#86efac"}}>
                    🛠 Buka Setup Wizard
                  </button>
                  <a href={`https://supabase.com/dashboard/project/${SUPABASE_PROJECT_ID}/editor`}
                    target="_blank" rel="noopener noreferrer"
                    style={{...sBtn(),fontSize:9,padding:"5px 10px",textDecoration:"none",display:"inline-block",
                      background:"rgba(30,15,60,.8)",color:"rgba(160,130,255,.75)"}}>
                    🔗 SQL Editor Project Ini
                  </a>
                  <button onClick={()=>copyToClipboard(MAPS_SETUP_SQL)}
                    style={{...sBtn(),fontSize:9,padding:"5px 10px",
                      background:"linear-gradient(135deg,#1e3a8a,#1d4ed8)",color:"#bfdbfe"}}>
                    📋 Salin SQL Setup
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════ EXPORT + DEPLOY GUIDE MODAL ════ */}
      {showExport&&(
        <div style={{position:"fixed",inset:0,zIndex:9000,background:"rgba(0,0,0,.78)",display:"flex",alignItems:"center",justifyContent:"center"}}
          onClick={()=>setShowExport(false)}>
          <div style={{width:"min(860px,94vw)",maxHeight:"88vh",display:"flex",flexDirection:"column",
            background:"linear-gradient(135deg,rgba(10,3,28,.98),rgba(5,1,14,.98))",
            border:"1.5px solid rgba(140,80,220,.45)",borderRadius:14,
            boxShadow:"0 0 60px rgba(100,40,220,.25),0 20px 80px rgba(0,0,0,.8)",
            animation:"me2FadeIn .15s ease both"}}
            onClick={e=>e.stopPropagation()}>
            {/* Modal header */}
            <div style={{padding:"12px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",
              borderBottom:"1px solid rgba(120,70,210,.2)",flexShrink:0}}>
              <span style={{fontFamily:"'Cinzel',serif",color:"rgba(210,170,255,.9)",fontSize:13,letterSpacing:"0.1em"}}>
                📋 Export Code + Panduan Deploy
              </span>
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>copyToClipboard(exportCode.replace(/^\/\/[^\n]*\n/gm,"").trim())}
                  style={{...sBtn(),background:"linear-gradient(135deg,#14532d,#166534)",color:"#86efac"}}>
                  📋 Salin Kode Saja
                </button>
                <button onClick={()=>copyToClipboard(exportCode)}
                  style={{...sBtn(),background:"linear-gradient(135deg,#1e3a8a,#1d4ed8)",color:"#bfdbfe"}}>
                  📋 Salin + Panduan
                </button>
                <button onClick={()=>setShowExport(false)} style={sBtn()}>✕</button>
              </div>
            </div>
            <pre className="me2-scroll" style={{flex:1,overflowY:"auto",margin:0,padding:"16px 18px",
              fontSize:11,lineHeight:1.65,fontFamily:"monospace",
              color:"rgba(190,210,255,.85)",background:"transparent",whiteSpace:"pre-wrap"}}>
              {exportCode}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
