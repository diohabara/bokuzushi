export const GAME_WIDTH = 16;
export const GAME_HEIGHT = 22;

export const PADDLE_WIDTH = 2.8;
export const PADDLE_HEIGHT = 0.35;
export const PADDLE_DEPTH = 0.5;
export const PADDLE_Y = -GAME_HEIGHT / 2 + 1.5;
export const PADDLE_COLOR = 0x4488ff;

export const BALL_RADIUS = 0.22;
export const BALL_SPEED = 0.1;
export const BALL_SPEED_INCREMENT = 0.004;
export const BALL_MAX_SPEED = 0.22;
export const BALL_COLOR = 0xffffff;

// Star (special bonus target)
export const STAR_OUTER_RADIUS = 0.9;
export const STAR_INNER_RADIUS = 0.4;
export const STAR_DEPTH = 0.5;

// Blocks
export const BLOCK_COLS = 8;
export const BLOCK_ROWS = 5;
export const BLOCK_WIDTH = 1.5;
export const BLOCK_HEIGHT = 0.6;
export const BLOCK_DEPTH = 0.4;
export const BLOCK_SPACING_X = 1.7;
export const BLOCK_SPACING_Y = 1.0;
export const BLOCK_START_Y = GAME_HEIGHT / 2 - 3.5;

// Row index -> { color, hp }
// Top row is hardest, bottom row is easiest
export const BLOCK_ROW_CONFIG: { color: number; hp: number }[] = [
  { color: 0x4488ff, hp: 5 }, // blue   - hardest
  { color: 0x44cc88, hp: 4 }, // green
  { color: 0xffcc44, hp: 3 }, // yellow
  { color: 0xff8844, hp: 2 }, // orange
  { color: 0xff4466, hp: 1 }, // red     - easiest
];

export const WALL_THICKNESS = 0.3;

export const INITIAL_LIVES = 3;
export const BLOCKS_PER_LEVEL = 5;
export const MAX_PENETRATION = 10;

export const PARTICLE_COUNT = 16;
export const PARTICLE_LIFETIME = 0.8;
export const PARTICLE_SPEED = 0.18;

// Camera shake
export const SHAKE_INTENSITY = 0.15;
export const SHAKE_DURATION = 0.12;

// Background stars
export const BG_STAR_COUNT = 120;
