// ─── Level / EXP Table (Level Cap: 100) ──────────────────────────────────────
// Columns: level, expNext (EXP needed to reach next level), totalExp (cumulative)

export interface LevelEntry {
  level    : number;
  expNext  : number; // EXP required from this level → next
  totalExp : number; // total cumulative EXP at start of this level
}

export const LEVEL_TABLE: LevelEntry[] = [
  { level:   1, expNext:       80, totalExp:           0 },
  { level:   2, expNext:      160, totalExp:          80 },
  { level:   3, expNext:      240, totalExp:         240 },
  { level:   4, expNext:      320, totalExp:         480 },
  { level:   5, expNext:      420, totalExp:         800 },
  { level:   6, expNext:      540, totalExp:       1_220 },
  { level:   7, expNext:      680, totalExp:       1_760 },
  { level:   8, expNext:      840, totalExp:       2_440 },
  { level:   9, expNext:    1_020, totalExp:       3_280 },
  { level:  10, expNext:    1_220, totalExp:       4_300 },
  { level:  11, expNext:    1_440, totalExp:       5_520 },
  { level:  12, expNext:    1_680, totalExp:       6_960 },
  { level:  13, expNext:    1_940, totalExp:       8_640 },
  { level:  14, expNext:    2_220, totalExp:      10_580 },
  { level:  15, expNext:    2_520, totalExp:      12_800 },
  { level:  16, expNext:    2_840, totalExp:      15_320 },
  { level:  17, expNext:    3_180, totalExp:      18_160 },
  { level:  18, expNext:    3_540, totalExp:      21_340 },
  { level:  19, expNext:    3_920, totalExp:      24_880 },
  { level:  20, expNext:    4_320, totalExp:      28_800 },
  { level:  21, expNext:    5_000, totalExp:      33_120 },
  { level:  22, expNext:    5_700, totalExp:      38_120 },
  { level:  23, expNext:    6_500, totalExp:      43_820 },
  { level:  24, expNext:    7_400, totalExp:      50_320 },
  { level:  25, expNext:    8_400, totalExp:      57_720 },
  { level:  26, expNext:    9_500, totalExp:      66_120 },
  { level:  27, expNext:   10_700, totalExp:      75_620 },
  { level:  28, expNext:   12_000, totalExp:      86_320 },
  { level:  29, expNext:   13_400, totalExp:      98_320 },
  { level:  30, expNext:   14_900, totalExp:     111_720 },
  { level:  31, expNext:   16_500, totalExp:     126_620 },
  { level:  32, expNext:   18_200, totalExp:     143_120 },
  { level:  33, expNext:   20_000, totalExp:     161_320 },
  { level:  34, expNext:   21_900, totalExp:     181_320 },
  { level:  35, expNext:   23_900, totalExp:     203_220 },
  { level:  36, expNext:   26_000, totalExp:     227_120 },
  { level:  37, expNext:   28_200, totalExp:     253_120 },
  { level:  38, expNext:   30_500, totalExp:     281_320 },
  { level:  39, expNext:   32_900, totalExp:     311_820 },
  { level:  40, expNext:   35_400, totalExp:     344_720 },
  { level:  41, expNext:   40_000, totalExp:     380_120 },
  { level:  42, expNext:   45_500, totalExp:     420_120 },
  { level:  43, expNext:   52_000, totalExp:     465_620 },
  { level:  44, expNext:   60_000, totalExp:     517_620 },
  { level:  45, expNext:   70_000, totalExp:     577_620 },
  { level:  46, expNext:   82_000, totalExp:     647_620 },
  { level:  47, expNext:   96_000, totalExp:     729_620 },
  { level:  48, expNext:  112_000, totalExp:     825_620 },
  { level:  49, expNext:  130_000, totalExp:     937_620 },
  { level:  50, expNext:  150_000, totalExp:   1_067_620 },
  { level:  51, expNext:  175_000, totalExp:   1_217_620 },
  { level:  52, expNext:  205_000, totalExp:   1_392_620 },
  { level:  53, expNext:  240_000, totalExp:   1_597_620 },
  { level:  54, expNext:  280_000, totalExp:   1_837_620 },
  { level:  55, expNext:  325_000, totalExp:   2_117_620 },
  { level:  56, expNext:  375_000, totalExp:   2_442_620 },
  { level:  57, expNext:  430_000, totalExp:   2_817_620 },
  { level:  58, expNext:  490_000, totalExp:   3_247_620 },
  { level:  59, expNext:  555_000, totalExp:   3_737_620 },
  { level:  60, expNext:  625_000, totalExp:   4_292_620 },
  { level:  61, expNext:  700_000, totalExp:   4_917_620 },
  { level:  62, expNext:  780_000, totalExp:   5_617_620 },
  { level:  63, expNext:  865_000, totalExp:   6_397_620 },
  { level:  64, expNext:  955_000, totalExp:   7_262_620 },
  { level:  65, expNext: 1_050_000, totalExp:  8_217_620 },
  { level:  66, expNext: 1_150_000, totalExp:  9_267_620 },
  { level:  67, expNext: 1_260_000, totalExp: 10_417_620 },
  { level:  68, expNext: 1_380_000, totalExp: 11_677_620 },
  { level:  69, expNext: 1_510_000, totalExp: 13_057_620 },
  { level:  70, expNext: 1_650_000, totalExp: 14_567_620 },
  { level:  71, expNext: 1_850_000, totalExp: 16_217_620 },
  { level:  72, expNext: 2_100_000, totalExp: 18_067_620 },
  { level:  73, expNext: 2_400_000, totalExp: 20_167_620 },
  { level:  74, expNext: 2_750_000, totalExp: 22_567_620 },
  { level:  75, expNext: 3_150_000, totalExp: 25_317_620 },
  { level:  76, expNext: 3_600_000, totalExp: 28_467_620 },
  { level:  77, expNext: 4_100_000, totalExp: 32_067_620 },
  { level:  78, expNext: 4_650_000, totalExp: 36_167_620 },
  { level:  79, expNext: 5_250_000, totalExp: 40_817_620 },
  { level:  80, expNext: 5_900_000, totalExp: 46_067_620 },
  { level:  81, expNext: 6_600_000, totalExp: 51_967_620 },
  { level:  82, expNext: 7_350_000, totalExp: 58_567_620 },
  { level:  83, expNext: 8_150_000, totalExp: 65_917_620 },
  { level:  84, expNext: 9_000_000, totalExp: 74_067_620 },
  { level:  85, expNext: 9_900_000, totalExp: 83_067_620 },
  { level:  86, expNext: 10_850_000, totalExp: 92_967_620 },
  { level:  87, expNext: 11_850_000, totalExp: 103_817_620 },
  { level:  88, expNext: 12_900_000, totalExp: 115_667_620 },
  { level:  89, expNext: 14_000_000, totalExp: 128_567_620 },
  { level:  90, expNext: 15_150_000, totalExp: 142_567_620 },
  { level:  91, expNext: 16_350_000, totalExp: 157_717_620 },
  { level:  92, expNext: 17_600_000, totalExp: 174_067_620 },
  { level:  93, expNext: 18_900_000, totalExp: 191_667_620 },
  { level:  94, expNext: 20_250_000, totalExp: 210_567_620 },
  { level:  95, expNext: 21_650_000, totalExp: 230_817_620 },
  { level:  96, expNext: 23_100_000, totalExp: 252_467_620 },
  { level:  97, expNext: 24_600_000, totalExp: 275_567_620 },
  { level:  98, expNext: 26_150_000, totalExp: 300_167_620 },
  { level:  99, expNext: 27_750_000, totalExp: 326_317_620 },
  { level: 100, expNext: 29_400_000, totalExp: 354_067_620 },
];

export const MAX_LEVEL     = 100;
export const MAX_TOTAL_EXP = LEVEL_TABLE[MAX_LEVEL - 1].totalExp + LEVEL_TABLE[MAX_LEVEL - 1].expNext;

// ─── Utility Functions ────────────────────────────────────────────────────────

/** Get the current level from cumulative total EXP. */
export function getLevelFromExp(totalExp: number): number {
  if (totalExp >= MAX_TOTAL_EXP) return MAX_LEVEL;
  // Walk from highest down — fast because most players are low level
  for (let i = LEVEL_TABLE.length - 1; i >= 0; i--) {
    if (totalExp >= LEVEL_TABLE[i].totalExp) return LEVEL_TABLE[i].level;
  }
  return 1;
}

/** EXP progress within the current level (0 … expNext). */
export function getExpInLevel(totalExp: number): number {
  const level = getLevelFromExp(totalExp);
  if (level >= MAX_LEVEL) return LEVEL_TABLE[MAX_LEVEL - 1].expNext; // capped
  const entry = LEVEL_TABLE[level - 1];
  return totalExp - entry.totalExp;
}

/** EXP required to go from current level → next level. */
export function getExpForNextLevel(level: number): number {
  if (level >= MAX_LEVEL) return LEVEL_TABLE[MAX_LEVEL - 1].expNext;
  return LEVEL_TABLE[level - 1].expNext;
}

/** Progress percentage (0–100) within the current level. */
export function getLevelProgress(totalExp: number): number {
  const level = getLevelFromExp(totalExp);
  if (level >= MAX_LEVEL) return 100;
  const inLevel  = getExpInLevel(totalExp);
  const required = getExpForNextLevel(level);
  return Math.min(100, (inLevel / required) * 100);
}

/** Stat gains applied per level-up (per level gained). */
export const STAT_GAINS_PER_LEVEL = {
  hp          : 5,
  mp          : 2,
  physicalAtk : 1,
  magicAtk    : 1,
  physicalDef : 0,   // +1 every 2 levels (handled with milestones)
  magicDef    : 0,
  dodge       : 0,
  accuracy    : 0,
};

/** Milestone bonuses — extra stats at specific levels. */
export const MILESTONE_LEVELS = new Set([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);

/** Format large numbers with K/M suffix. */
export function formatExp(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
  return String(n);
}
