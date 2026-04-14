// ═══════════════════════════════════════════════════════════════════════════════
// Inn Map Data — Tile-based RPG engine data for Penginapan
// ═══════════════════════════════════════════════════════════════════════════════

/** Pixel size of one tile square */
export const TILE_SIZE = 64;

/** Character sprite dimensions */
export const CHAR_W = 72;           // 1.125 × tile  (+50% dari 48)
export const CHAR_H = 115;          // 1.80 × tile   (1.8 tiles tall)

/** Movement timing */
export const MOVE_MS            = 200;  // ms per one-tile move  (natural RPG Maker walk speed)
export const KEY_REPEAT_DELAY   = 210;  // ms before key-hold repeat starts
export const KEY_REPEAT_INTERVAL = 135; // ms between repeated moves while held

// ── Tile type IDs ────────────────────────────────────────────────────────────
export const T = {
  VOID         : 0,  // empty / out of bounds
  FLOOR        : 1,  // walkable wood floor
  WALL         : 2,  // solid brick wall (blocks movement)
  DOOR         : 3,  // door arch in wall — walkable, triggers map transition
  DECO_DOOR    : 4,  // decorative wooden door tile — NOT walkable, NO transition
  STAIR        : 5,  // tangga — walkable, renders stair asset
  OBJ          : 6,  // tile di bawah furnitur/prop — floor secara visual, TIDAK bisa diinjak
  WOOD_WALL    : 7,  // tembok kayu — solid, tidak walkable
  ROOF         : 8,  // plafon / atap interior — solid, tidak walkable
  INTERACT_DOOR: 9,  // pintu walkable — trigger dialog event; render seperti WOOD_WALL
  // ── Outdoor tile types ──────────────────────────────────────────────────────
  GRASS        : 10, // outdoor walkable ground (desa, padang, dll)
  PATH         : 11, // walkable dirt/cobblestone road
  TREE         : 12, // pohon / hutan — solid, tidak walkable
  WATER        : 13, // air / sungai — solid, tidak walkable
} as const;

export type TileId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

/** Set of tile IDs the player can walk onto */
export const WALKABLE = new Set<number>([
  T.FLOOR, T.DOOR, T.STAIR, T.INTERACT_DOOR, T.WOOD_WALL,
  T.GRASS, T.PATH,  // outdoor walkable tiles
]);

// ── Interfaces ────────────────────────────────────────────────────────────
export interface MapTransition {
  toMap    : string;
  spawnX   : number;
  spawnY   : number;
  facing   : "up" | "down" | "left" | "right";
  /** Jika true → transisi langsung saat injak tile, tanpa tombol OK */
  immediate?: boolean;
}

export interface DialogEvent {
  message       : string;   // teks dialog yang tampil
  returnX       : number;   // tile X tujuan setelah OK
  returnY       : number;   // tile Y tujuan setelah OK
  facing?       : "up" | "down" | "left" | "right";
  speakerName?  : string;   // nama NPC/speaker — jika kosong, tampilkan nama player
  speakerAvatar?: string;   // URL avatar speaker — jika kosong, tampilkan avatar player
}

export interface MapProp {
  x       : number;   // kolom tile (kiri atas prop)
  y       : number;   // baris tile (kiri atas prop)
  tileW   : number;   // lebar  dalam satuan tile
  tileH   : number;   // tinggi dalam satuan tile
  src     : string;   // URL gambar (Cloudinary, f_auto,q_auto sudah disertakan)
  label?  : string;   // nama prop (opsional, untuk debug)
  zIndex? : number;   // override z-index (default: 100 + y*10)
  noShadow?: boolean; // true → tidak pakai drop-shadow (untuk prop yang menyatu dengan tembok)
  objectFit?: "fill" | "contain" | "cover"; // default "fill"
  /**
   * contentZoom — zoom multiplier untuk memotong area transparan di sekitar aset.
   * Nilai > 1 membuat gambar dirender lebih besar dari container (overflow:hidden memotong sisanya).
   * Contoh: 1.4 berarti gambar dirender 140% dari ukuran container, di-anchor ke bawah-tengah,
   * sehingga padding transparan di atas/samping terpotong dan isi bangunan mengisi penuh tile.
   * Gunakan ini ketika tileW/tileH harus merepresentasikan ukuran KONTEN bangunan, bukan gambar keseluruhan.
   */
  contentZoom?: number;
  /** anchor posisi zoom: "bottom-center" (default) | "center" | "bottom-left" */
  zoomAnchor?: "bottom-center" | "center" | "bottom-left";
}

export interface TileMap {
  id           : string;
  name         : string;
  cols         : number;
  rows         : number;
  /** tiles[row][col] = tiles[y][x] */
  tiles        : TileId[][];
  /** Map from "x,y" string to transition definition */
  transitions  : Record<string, MapTransition>;
  /** Map from "x,y" string to dialog event definition */
  dialogs?     : Record<string, DialogEvent>;
  defaultSpawn : { x: number; y: number; facing: "up" | "down" | "left" | "right" };
  /** Ambient fill color shown outside the map when it is smaller than viewport */
  ambientBg    : string;
  /** Props / furnitur yang di-render di atas tile layer, di bawah karakter */
  props?       : MapProp[];
  /**
   * Override per-tile collision — list of "x,y" string koordinat yang
   * selalu BLOCKED meski tile type-nya masuk set WALKABLE.
   * Berguna misalnya: WW tembok yang secara global walkable tapi di
   * titik tertentu harus solid.
   */
  blockedTiles?: string[];
  /**
   * Override per-tile collision — list of "x,y" string koordinat yang
   * selalu WALKABLE meski tile type-nya TIDAK ada di set WALKABLE.
   * Berguna misalnya: OBJ tile di bawah prop yang ingin tetap bisa dilalui.
   */
  allowedTiles?: string[];
  /**
   * Per-tile image override — maps "x,y" string ke URL gambar yang
   * dirender di atas tile color (canvas) sebagai tekstur/dekorasi ground.
   * Di-set dari Map Editor via tool Image Tile Painter.
   */
  tileImages?: Record<string, string>;
}

// ── Shorthand tile aliases (for readable map layout below) ───────────────────
const V  = T.VOID       as TileId;
const W  = T.WALL       as TileId;
const F  = T.FLOOR      as TileId;
const D  = T.DOOR       as TileId;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DD = T.DECO_DOOR  as TileId;
const S  = T.STAIR      as TileId;
const O  = T.OBJ        as TileId;
const WW = T.WOOD_WALL  as TileId;
const RO = T.ROOF       as TileId;
const ID = T.INTERACT_DOOR as TileId;  // pintu interaktif — dialog trigger

// ── Kamar Penginapan — 6 × 10 tiles ─────────────────────────────────────────
//
//   col→  0   1   2   3   4   5
//  row 0 [RO][RO][RO][RO][RO][RO]  ← baris plafon BARU — ruang atas untuk tembok extend
//  row 1 [RO][ V][ V][ V][ V][RO]  ← x1-x4 hapus plafon; tembok bisa extend penuh 2 tiles
//  row 2 [RO][WW][WW][WW][WW][RO]  ← tembok kayu atas; x4 di-block via blockedTiles
//  row 3 [RO][ O][ F][ O][ O][RO]  ← x1=O lemari (BLOCKED), x3=O meja, x4=O kasur tengah
//  row 4 [RO][ F][ F][ F][ F][RO]  ← x4=F (kaki kasur — walkable)
//  row 5 [RO][ F][ F][ F][ F][RO]
//  row 6 [RO][ F][ F][ F][ F][RO]
//  row 7 [RO][ F][RO][RO][RO][RO]  ← x=1 exit tile
//  row 8 [ V][ V][ V][ V][ V][ V]  ← baris kosong
//  row 9 [WW][WW][WW][WW][WW][WW]  ← tembok kayu bawah
//
export const INN_ROOM: TileMap = {
  id   : "inn_room",
  name : "Kamar Penginapan",
  cols : 6,
  rows : 10,
  tiles: [
    [RO,  RO,  RO,  RO,  RO,  RO ],  // row 0 — plafon baru (ruang extend tembok atas)
    [RO,  V,   V,   V,   V,   RO ],  // row 1 — x1-x4 hapus plafon (was RO)
    [RO,  WW,  WW,  WW,  WW,  RO ],  // row 2 — tembok kayu atas; x4 di-override blockedTiles
    [RO,  O,   F,   O,   O,   RO ],  // row 3 — x1=O (lemari, BLOCKED), x3=O (meja), x4=O (kasur)
    [RO,  F,   F,   F,   F,   RO ],  // row 4 — x4=F (kaki kasur, walkable)
    [RO,  F,   F,   F,   F,   RO ],  // row 5
    [RO,  F,   F,   F,   F,   RO ],  // row 6
    [RO,  F,   RO,  RO,  RO,  RO ],  // row 7 — x=1 exit
    [V,   V,   V,   V,   V,   V  ],  // row 8 — baris kosong
    [WW,  WW,  WW,  WW,  WW,  WW ],  // row 9 — tembok kayu bawah
  ] as TileId[][],
  transitions: {
    "1,7": { toMap: "inn_floor2", spawnX: 7, spawnY: 3, facing: "down" },
  },
  defaultSpawn: { x: 2, y: 4, facing: "down" },
  ambientBg   : "#0e0620",
  props: [
    {
      // ── Lemari Kayu — y3,x1 (menempel ke dinding WW y2) ──
      // Prop span dari y2 ke y3 (1.5 tile tinggi) agar kaki lemari di y3, tutup di area WW
      x    : 0.5,
      y    : 1.0,
      tileW: 1.875,
      tileH: 2.5,
      src  : "https://res.cloudinary.com/dhkethrmc/image/upload/f_auto,q_auto,e_bgremoval/v1775624874/Tileset_Lemari_Kayu_prlz86.png",
      label: "Lemari Kayu",
    },
    {
      // ── Karpet — menutupi area y4-y6, x1-x4 (4×3 tiles) ──
      // zIndex harus > 2 (floor tile zIndex=2) agar tidak tertimpa floor,
      // tapi cukup rendah agar tetap di bawah furnitur (auto zIndex ~125+)
      x       : 1,
      y       : 4,
      tileW   : 4,
      tileH   : 3,
      src     : "https://res.cloudinary.com/dhkethrmc/image/upload/f_auto,q_auto/v1775623809/Carpet_Tileset_kvafp2.png",
      label   : "Karpet",
      zIndex  : 5,
    },
    {
      x    : 4,
      y    : 2.5,
      tileW: 1,
      tileH: 2,
      src  : "https://res.cloudinary.com/dhkethrmc/image/upload/f_auto,q_auto,e_bgremoval/v1775623366/wooden_bed_c_dvkltp.png",
      label: "Kasur",
    },
    {
      // Meja kayu — posisi y:2.5 agar 50% atas masuk ke tile y2, 50% bawah di tile y3
      x    : 3,
      y    : 2.5,
      tileW: 1,
      tileH: 1,
      src  : "https://res.cloudinary.com/dhkethrmc/image/upload/f_auto,q_auto/v1775617986/meja_kayu_kxwikb.png",
      label: "Meja Kayu",
    },
    {
      // Kursi kayu — di-center dalam tile y3,x3
      // x = 3 + (1 - 0.8)/2 = 3.1 | y = 3 + (1 - 0.8)/2 = 3.1
      x         : 3.1,
      y         : 3.1,
      tileW     : 0.8,
      tileH     : 0.8,
      objectFit : "contain",
      src       : "https://res.cloudinary.com/dhkethrmc/image/upload/f_auto,q_auto,e_bgremoval/v1775617984/kursi_kayu_fysdbd.png",
      label     : "Kursi Kayu",
    },
    {
      x       : 1.25,
      y       : 1.25,
      tileW   : 2,
      tileH   : 1.0,
      src     : "https://res.cloudinary.com/dhkethrmc/image/upload/f_auto,q_auto/v1775552037/jwndela_kamar_gbgrnk.png",
      label   : "Jendela",
      zIndex  : 2,
      noShadow: true,
    },
    {
      x       : 1.05,
      y       : 8,
      tileW   : 0.9,
      tileH   : 2,
      src     : "https://res.cloudinary.com/dhkethrmc/image/upload/f_auto,q_auto/v1775546367/Single_Door_Tile_r8qtxd.png",
      label   : "Pintu Kamar",
      zIndex  : 3,
      noShadow: true,
    },
  ],
  /** x4,y2 adalah tembok WW tapi di-paksa BLOCKED secara individual */
  blockedTiles: ["4,2", "1,2", "3,2"],  // y2x4 (WW global), y2x1 & y2x3 (WW di-block)
  /** y3x1 & y3x3 adalah OBJ (secara default blocked) tapi di-izinkan dilalui */
  allowedTiles: ["1,3", "3,3"],
};

// ── Lantai 2 Penginapan — 12 × 7 tiles ──────────────────────────────────────
//
//   col→  0   1   2   3   4   5   6   7   8   9  10  11
//  row 0 [RO][RO][RO][RO][RO][RO][RO][RO][RO][RO][RO][RO]  ← full plafon atas
//  row 1 [RO][ V][ V][ V][ V][ V][ V][ V][ V][ V][ V][RO]  ← x1-x10 cleared ke V
//  row 2 [RO][WW][ID][WW][WW][WW][WW][ D][WW][WW][WW][RO]  ← (2,2)=ID; (7,2)=D
//  row 3 [RO][ F][ F][ F][ F][ F][ F][ F][ F][ F][ F][RO]  ← koridor
//  row 4 [RO][RO][RO][RO][RO][ F][RO][RO][RO][RO][RO][RO]  ← (5,4)=F akses Lobby
//  row 5 [WW][WW][WW][WW][WW][ S][WW][WW][WW][WW][WW][WW]  ← (5,5)=S tangga
//  row 6 [WW][WW][WW][WW][WW][ S][WW][WW][WW][WW][WW][WW]  ← wadah tembok bawah
//
export const INN_FLOOR2: TileMap = {
  id   : "inn_floor2",
  name : "Lantai 2 Penginapan",
  cols : 12,
  rows : 7,
  tiles: [
    [RO, RO, RO, RO, RO, RO, RO, RO, RO, RO, RO, RO],  // row 0 — full plafon atas
    [RO, V,  V,  V,  V,  V,  V,  V,  V,  V,  V,  RO],  // row 1 — x1-x10 = V
    [RO, WW, ID, WW, WW, WW, WW, D,  WW, WW, WW, RO],  // row 2 — (2,2) dialog; (7,2) Kamar
    [RO, F,  F,  F,  F,  F,  F,  F,  F,  F,  F,  RO],  // row 3 — koridor
    [RO, RO, RO, RO, RO, F,  RO, RO, RO, RO, RO, RO],  // row 4 — (5,4) akses Lobby
    [WW, WW, WW, WW, WW, S,  WW, WW, WW, WW, WW, WW],  // row 5 — tangga
    [WW, WW, WW, WW, WW, S,  WW, WW, WW, WW, WW, WW],  // row 6 — wadah tembok bawah
  ] as TileId[][],
  transitions: {
    "5,4": { toMap: "inn_lobby",  spawnX: 5, spawnY: 1, facing: "down", immediate: true },
    "5,5": { toMap: "inn_lobby",  spawnX: 5, spawnY: 1, facing: "down", immediate: true },
    "5,6": { toMap: "inn_lobby",  spawnX: 5, spawnY: 1, facing: "down", immediate: true },
    "7,2": { toMap: "inn_room",   spawnX: 1, spawnY: 6, facing: "up"   },
  },
  dialogs: {
    "2,2": {
      message : "Ini bukan kamarku, kamarku di kanan koridor",
      returnX : 2,
      returnY : 3,
    },
  },
  defaultSpawn: { x: 1, y: 3, facing: "right" },
  ambientBg   : "#0e0620",
  props: [
    {
      x       : 2,
      y       : 1,
      tileW   : 1,
      tileH   : 2,
      src     : "https://res.cloudinary.com/dhkethrmc/image/upload/f_auto,q_auto/v1775546367/Single_Door_Tile_r8qtxd.png",
      label   : "Pintu Kamar Lain",
      zIndex  : 3,
      noShadow: true,
    },
    {
      x       : 7,
      y       : 1,
      tileW   : 1,
      tileH   : 2,
      src     : "https://res.cloudinary.com/dhkethrmc/image/upload/f_auto,q_auto/v1775546367/Single_Door_Tile_r8qtxd.png",
      label   : "Pintu Kamarku",
      zIndex  : 3,
      noShadow: true,
    },
  ],
};

// ── Lobby Penginapan — 12 × 12 tiles ─────────────────────────────────────────
//
//   col→  0  1  2  3  4  5  6  7  8  9 10 11
//  row  0 [V][V][V][V][W][F][W][V][V][V][V][V]  ← hanya x=4,5,6 yang tampil
//  row  1 [V][V][V][V][W][S][W][V][V][V][V][V]  ← x=5 → tangga
//  row  2 [V][V][V][V][W][S][W][V][V][V][V][V]  ← x=5 → tangga
//  row  3 [W][W][W][W][W][S][W][W][W][W][W][W]  ← x=5 → tangga (satu-satunya jalan masuk)
//  row  4 [W][F][F][F][F][F][F][F][F][F][F][W]
//         ...  (rows 4-10 identik) ...
//  row 11 [W][W][W][W][W][W][W][W][W][W][W][W]
//
export const INN_LOBBY: TileMap = {
  id   : "inn_lobby",
  name : "Lobby Penginapan",
  cols : 12,
  rows : 12,
  tiles: [
    [RO,RO,RO,RO,RO,F, RO,RO,RO,RO,RO,RO], // row 0  — plafon kayu penuh
    [RO,RO,RO,RO,RO,S, RO,RO,RO,RO,RO,RO], // row 1  — full plafon kecuali x5 (tangga)
    [RO,RO,RO,RO,RO,S, RO,RO,RO,RO,RO,RO], // row 2  — full plafon kecuali x5 (tangga)
    [RO,WW,WW,WW,WW,S, WW,WW,WW,WW,WW,RO], // row 3  — tembok kayu; x0 & x11 → plafon pilar
    [RO,WW,WW,WW,WW,F, WW,ID,WW,WW,WW,RO], // row 4  — x7 → pintu kayu (INTERACT_DOOR)
    [RO,F, F, F, F, F, F, F, F, F, F, RO],  // row 5  — lantai; x0 & x11 → plafon pilar
    [RO,F, F, F, F, F, F, F, F, F, F, RO],  // row 6
    [RO,RO,RO,RO,F, F, RO,RO,RO,RO,RO,RO],  // row 7 — plafon; x4,x5 = exit ke Desa Daun
    [V, V, V, V, V, V, V, V, V, V, V, V],   // row 8  — void (transparan)
    [V, V, V, V, V, V, V, V, V, V, V, V],   // row 9  — void
    [V, V, V, V, V, V, V, V, V, V, V, V],   // row 10 — void
    [V, V, V, V, V, V, V, V, V, V, V, V],   // row 11 — void
  ] as TileId[][],
  transitions: {
    "5,0": { toMap: "inn_floor2", spawnX: 5, spawnY: 3, facing: "up",   immediate: true  },
    "4,7": { toMap: "village",    spawnX: 49, spawnY: 15, facing: "down", immediate: true },
    "5,7": { toMap: "village",    spawnX: 50, spawnY: 15, facing: "down", immediate: true },
  },
  dialogs: {
    "7,4": {
      message : "Kamarku di lantai 2 sebelah kanan",
      returnX : 7,
      returnY : 5,
      facing  : "down",
    },
    "2,5": {
      message      : "Selamat datang di Penginapan Desa Daun. Biaya sewamu sudah ditanggung kepala desa, silahkan langsung naik saja. Kamarmu di lantai 2 sebelah kanan.",
      returnX      : 2,
      returnY      : 5,
      facing       : "up",
      speakerName  : "Resepsionis",
      speakerAvatar: "https://res.cloudinary.com/dhkethrmc/image/upload/f_auto,q_auto,e_bgremoval/v1775672298/ava_npc_rv_jgnxol.png",
    },
  },
  defaultSpawn: { x: 5, y: 5, facing: "down" },
  ambientBg   : "#080318",
  blockedTiles: [
    "1,3","2,3","3,3","4,3",
    "6,3","7,3","8,3","9,3","10,3",
    "1,4","2,4","3,4","4,4",
  ],
  props: [
    {
      // ── Pintu Kayu — y3x7 s/d y4x7 (2 tile tinggi mengikuti sistem 2-tile wall) ──
      x       : 7,
      y       : 3.05,
      tileW   : 1,
      tileH   : 2,
      src     : "https://res.cloudinary.com/dhkethrmc/image/upload/f_auto,q_auto/v1775546367/Single_Door_Tile_r8qtxd.png",
      label   : "Pintu Kayu Lobby",
      zIndex  : 3,
      noShadow: true,
    },
    {
      // ── Meja Resepsionis — y4x1 s/d y4x4 (4 tile lebar, 1 tile tinggi) ──
      x       : 1,
      y       : 4,
      tileW   : 4,
      tileH   : 1.875,
      src     : "https://res.cloudinary.com/dhkethrmc/image/upload/f_auto,q_auto,e_bgremoval/v1775670167/Inn_Counter_Front_View_nf2f4n.png",
      label   : "Meja Resepsionis",
      zIndex  : 10,
      noShadow: false,
    },
  ],
};

// ─ Registry ─────────────────────────────────────────────────────────────────
export const MAPS: Record<string, TileMap> = {
  inn_room   : INN_ROOM,
  inn_floor2 : INN_FLOOR2,
  inn_lobby  : INN_LOBBY,
};