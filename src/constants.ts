export const GAME_WIDTH = 16;
export const GAME_HEIGHT = 22;

export const PADDLE_WIDTH = 2.8;
export const PADDLE_HEIGHT = 0.35;
export const PADDLE_DEPTH = 0.5;
export const PADDLE_Y = -GAME_HEIGHT / 2 + 1.5;
export const PADDLE_COLOR = 0x4488ff;

export const BALL_RADIUS = 0.22;
export const BALL_SPEED = 0.15;
export const BALL_SPEED_INCREMENT = 0.008;
export const BALL_MAX_SPEED = 0.30;

export const STAR_OUTER_RADIUS = 0.9;
export const STAR_INNER_RADIUS = 0.4;
export const STAR_DEPTH = 0.5;

// Blocks
export const BLOCK_WIDTH = 1.5;
export const BLOCK_HEIGHT = 0.6;
export const BLOCK_DEPTH = 0.4;
export const BLOCK_SPACING_X = 1.7;
export const BLOCK_SPACING_Y = 1.0;
export const BLOCK_START_Y = GAME_HEIGHT / 2 - 3.5;

// Universal block colors (same across ALL worlds)
// Ball cycles through these; only matching color can be destroyed
export const BLOCK_COLORS: number[] = [
  0xff4466, // red
  0x4488ff, // blue
  0x44cc88, // green
  0xffcc44, // yellow
];

export const WALL_THICKNESS = 0.3;

export const HITS_BASE = 3;
export const HITS_GROWTH = 2;
export const MAX_PENETRATION = 10;

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

// World themes
export interface WorldTheme {
  name: string;
  subtitle: string;
  emoji: string;
  pattern: "grid" | "diamond" | "v-shape" | "random" | "ring";
  cols: number;
  rows: number;
  btnColor: string;
  btnBg: string;
}

export const WORLD_THEMES: WorldTheme[] = [
  {
    name: "桜花", subtitle: "はるのかぜ", emoji: "🌸",
    pattern: "grid", cols: 8, rows: 5,
    btnColor: "#ff88aa", btnBg: "rgba(255,136,170,0.15)",
  },
  {
    name: "炎祭", subtitle: "なつのほのお", emoji: "🔥",
    pattern: "v-shape", cols: 9, rows: 6,
    btnColor: "#ff4400", btnBg: "rgba(255,68,0,0.15)",
  },
  {
    name: "紅葉", subtitle: "あきのにしき", emoji: "🍁",
    pattern: "diamond", cols: 9, rows: 7,
    btnColor: "#ff6633", btnBg: "rgba(255,102,51,0.15)",
  },
  {
    name: "氷雪", subtitle: "ふゆのしずく", emoji: "❄️",
    pattern: "random", cols: 10, rows: 7,
    btnColor: "#88ccff", btnBg: "rgba(136,204,255,0.15)",
  },
  {
    name: "黄金", subtitle: "きわみのみち", emoji: "👑",
    pattern: "ring", cols: 10, rows: 8,
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
