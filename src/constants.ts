export const GAME_WIDTH = 16;
export const GAME_HEIGHT = 22;

export const PADDLE_WIDTH = 2.8;
export const PADDLE_HEIGHT = 0.35;
export const PADDLE_DEPTH = 0.5;
export const PADDLE_Y = -GAME_HEIGHT / 2 + 1.5;
export const PADDLE_COLOR = 0x4488ff;

export const BALL_RADIUS = 0.18;
export const BALL_SPEED = 0.15;
export const BALL_SPEED_INCREMENT = 0.008;
export const BALL_MAX_SPEED = 0.30;

export const STAR_OUTER_RADIUS = 0.9;
export const STAR_INNER_RADIUS = 0.4;
export const STAR_DEPTH = 0.5;

// Blocks
export const BLOCK_WIDTH = 1.2;
export const BLOCK_HEIGHT = 0.5;
export const BLOCK_DEPTH = 0.35;
export const BLOCK_SPACING_X = 1.3;
export const BLOCK_SPACING_Y = 0.6;
export const BLOCK_START_Y = GAME_HEIGHT / 2 - 1.8;

// Color strength tiers (weakest -> strongest), calm -> intense
export const BLOCK_COLORS: number[] = [
  0x33cc66, // green   - tier 0 (weakest)
  0x3388ff, // blue    - tier 1
  0xffcc00, // yellow  - tier 2
  0xff8822, // orange  - tier 3
  0xff3344, // red     - tier 4
  0x4444cc, // indigo  - tier 5
  0x9933cc, // violet  - tier 6 (strongest)
];
// Ball-only strongest color (tier 7). No block uses this -> penetrates all blocks
export const BALL_COLOR_BLACK = 0x220033;
export const BALL_MAX_TIER = 7; // 0-6 = rainbow 7 colors, 7 = black (strongest)

// Indestructible block
export const INDESTRUCTIBLE_COLOR = 0x888888;
export const INDESTRUCTIBLE_EMISSIVE = 0xffffff;
export const INDESTRUCTIBLE_COLOR_INDEX = -1;

export const WALL_THICKNESS = 0.3;

export const HITS_BASE = 35;
export const HITS_GROWTH = 20;

// World system
export const WAVES_PER_WORLD = 3;
export const WORLD_SPEED_BONUS = 0.015;
export const MAX_WORLDS = 5;

// Particles (MEGA)
export const PARTICLE_COUNT = 200;
export const PARTICLE_LIFETIME = 1.5;
export const PARTICLE_SPEED = 0.4;
export const HIT_PARTICLE_COUNT = 60;
export const HIT_PARTICLE_SPEED = 0.25;

// Camera shake (INTENSE)
export const SHAKE_INTENSITY = 0.5;
export const SHAKE_DURATION = 0.3;

export const BG_STAR_COUNT = 120;

// Pattern types
export type PatternName =
  | "grid" | "diamond" | "v-shape" | "random" | "ring"
  | "checkerboard" | "zigzag" | "spiral" | "cross"
  | "dense-grid" | "arrow" | "tunnel";

export type IndestructiblePattern =
  | "none" | "border" | "maze" | "pillars" | "corridors" | "fortress";

// World themes
export interface WorldTheme {
  name: string;
  subtitle: string;
  emoji: string;
  patterns: PatternName[];
  indestructiblePattern: IndestructiblePattern;
  particleShape: "sphere" | "sakura" | "flame" | "leaf" | "crystal" | "star";
  cols: number;
  rows: number;
  maxColorTier: number; // highest block color tier in this world
  btnColor: string;
  btnBg: string;
}

export const WORLD_THEMES: WorldTheme[] = [
  {
    name: "桜花", subtitle: "はるのかぜ", emoji: "🌸",
    patterns: ["grid", "checkerboard", "diamond"],
    indestructiblePattern: "none", particleShape: "sakura",
    cols: 10, rows: 16, maxColorTier: 1,
    btnColor: "#ff88aa", btnBg: "rgba(255,136,170,0.15)",
  },
  {
    name: "炎祭", subtitle: "なつのほのお", emoji: "🔥",
    patterns: ["v-shape", "arrow", "cross"],
    indestructiblePattern: "pillars", particleShape: "flame",
    cols: 11, rows: 20, maxColorTier: 2,
    btnColor: "#ff4400", btnBg: "rgba(255,68,0,0.15)",
  },
  {
    name: "紅葉", subtitle: "あきのにしき", emoji: "🍁",
    patterns: ["diamond", "zigzag", "spiral"],
    indestructiblePattern: "corridors", particleShape: "leaf",
    cols: 11, rows: 24, maxColorTier: 4,
    btnColor: "#ff6633", btnBg: "rgba(255,102,51,0.15)",
  },
  {
    name: "氷雪", subtitle: "ふゆのしずく", emoji: "❄️",
    patterns: ["tunnel", "cross", "dense-grid"],
    indestructiblePattern: "maze", particleShape: "crystal",
    cols: 12, rows: 28, maxColorTier: 5,
    btnColor: "#88ccff", btnBg: "rgba(136,204,255,0.15)",
  },
  {
    name: "黄金", subtitle: "きわみのみち", emoji: "👑",
    patterns: ["ring", "spiral", "dense-grid"],
    indestructiblePattern: "fortress", particleShape: "star",
    cols: 12, rows: 32, maxColorTier: 6,
    btnColor: "#ffd700", btnBg: "rgba(255,215,0,0.15)",
  },
];

// Combo thresholds
export const COMBO_ATSU = 3;
export const COMBO_GEKIATSU = 5;
export const COMBO_KAKUHEN = 8;
export const COMBO_OOATARI = 12;
export const COMBO_CHO_GEKIATSU = 16;
export const COMBO_FEVER = 20;
