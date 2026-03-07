import * as THREE from "three";
import { Block } from "./Block";
import { Star } from "./Star";
import {
  BLOCK_SPACING_X,
  BLOCK_SPACING_Y,
  BLOCK_START_Y,
  BLOCK_COLORS,
  GAME_WIDTH,
  WORLD_THEMES,
  INDESTRUCTIBLE_COLOR,
  INDESTRUCTIBLE_COLOR_INDEX,
  PatternName,
  IndestructiblePattern,
} from "./constants";

type PatternFn = (cols: number, rows: number) => boolean[][];

const patternMap: Record<PatternName, PatternFn> = {
  // Filled grid with horizontal corridors every few rows for ball to travel through
  grid: (cols, rows) =>
    Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, () => r % 4 !== 3)
    ),

  // Diamond shape with internal gaps
  diamond: (cols, rows) => {
    const cx = (cols - 1) / 2;
    const cy = (rows - 1) / 2;
    const rx = cols / 2;
    const ry = rows / 2;
    return Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => {
        const d = Math.abs(c - cx) / rx + Math.abs(r - cy) / ry;
        // Diamond shell with internal ring gaps
        return d <= 1 && !((r + c) % 3 === 0 && d > 0.3 && d < 0.7);
      })
    );
  },

  // V-shape with wider arms and internal gaps
  "v-shape": (cols, rows) =>
    Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => {
        const cx = (cols - 1) / 2;
        const armWidth = 2;
        const leftArm = Math.abs(c - (cx - r * (cx / rows)));
        const rightArm = Math.abs(c - (cx + r * (cx / rows)));
        const onArm = leftArm < armWidth || rightArm < armWidth;
        // Add horizontal bars between arms every few rows
        const bar = r % 5 === 2 && c > 1 && c < cols - 2;
        return onArm || bar;
      })
    ),

  // Random but with guaranteed corridors
  random: (cols, rows) =>
    Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => {
        if (r % 5 === 4) return false; // horizontal corridor
        if (c === Math.floor(cols / 3) || c === Math.floor(cols * 2 / 3)) {
          return r % 3 !== 0; // vertical channels with gaps
        }
        return Math.random() > 0.25;
      })
    ),

  // Concentric rings with gaps for ball to pass through
  ring: (cols, rows) => {
    const cx = (cols - 1) / 2;
    const cy = (rows - 1) / 2;
    return Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => {
        const dist = Math.sqrt(((c - cx) / cx * 5) ** 2 + ((r - cy) / cy * 5) ** 2);
        const ring = Math.floor(dist) % 2 === 0;
        // Cut gaps at cardinal directions for passages
        const angle = Math.atan2(r - cy, c - cx);
        const nearCardinal = Math.abs(Math.sin(angle * 2)) < 0.3;
        return ring && !nearCardinal;
      })
    );
  },

  // Checkerboard — classic bounce pattern
  checkerboard: (cols, rows) =>
    Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => (r + c) % 2 === 0)
    ),

  // Zigzag walls with gaps — ball bounces side to side
  zigzag: (cols, rows) =>
    Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => {
        const period = 4;
        const phase = Math.floor(r / period) % 2;
        const wall = phase === 0 ? c < cols - 2 : c > 1;
        return wall && r % period !== period - 1;
      })
    ),

  // Spiral corridors — ball travels inward
  spiral: (cols, rows) => {
    const grid = Array.from({ length: rows }, () => Array(cols).fill(true));
    // Carve spiral corridors
    let top = 1, bottom = rows - 2, left = 1, right = cols - 2;
    let dir = 0;
    while (top <= bottom && left <= right) {
      if (dir === 0) { for (let c = left; c <= right; c++) grid[top][c] = false; top += 2; }
      else if (dir === 1) { for (let r = top; r <= bottom; r++) grid[r][right] = false; right -= 2; }
      else if (dir === 2) { for (let c = right; c >= left; c--) grid[bottom][c] = false; bottom -= 2; }
      else { for (let r = bottom; r >= top; r--) grid[r][left] = false; left += 2; }
      dir = (dir + 1) % 4;
    }
    return grid;
  },

  // Cross with filled quadrants — ball bounces in the four chambers
  cross: (cols, rows) => {
    const cx = Math.floor(cols / 2);
    const cy = Math.floor(rows / 2);
    return Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => {
        // Cross gaps (corridors)
        if (Math.abs(r - cy) <= 0 || Math.abs(c - cx) <= 0) return false;
        return true;
      })
    );
  },

  // Dense grid with scattered holes for unpredictable bounces
  "dense-grid": (cols, rows) =>
    Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => {
        // Remove every Nth block in a staggered pattern
        if (r % 3 === 0 && c % 4 === 1) return false;
        if (r % 3 === 1 && c % 4 === 3) return false;
        return true;
      })
    ),

  // Arrow with bounce chambers in the head
  arrow: (cols, rows) => {
    const cx = (cols - 1) / 2;
    return Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => {
        const halfRow = Math.floor(rows / 2);
        if (r < halfRow) {
          const width = ((halfRow - r) / halfRow) * (cols / 2);
          const inArrow = Math.abs(c - cx) <= width;
          // Internal gaps in the arrowhead
          return inArrow && !((r + c) % 3 === 0);
        }
        // Wider shaft with side walls
        return Math.abs(c - cx) <= 2 || (r % 4 === 0 && c > 1 && c < cols - 2);
      })
    );
  },

  // Tunnel with alternating walls — ball ping-pongs
  tunnel: (cols, rows) =>
    Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => {
        const section = Math.floor(r / 3) % 2;
        if (r % 3 === 2) return false; // horizontal gap every 3 rows
        if (section === 0) {
          return c < cols - 3 || r % 3 === 0; // wall on right, gap on left
        } else {
          return c > 2 || r % 3 === 0; // wall on left, gap on right
        }
      })
    ),
};

function generateIndestructibleMask(
  pattern: IndestructiblePattern,
  cols: number,
  rows: number
): boolean[][] {
  const mask = Array.from({ length: rows }, () => Array(cols).fill(false));

  switch (pattern) {
    case "none":
      break;
    case "border":
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
            mask[r][c] = true;
          }
        }
      }
      break;
    case "pillars":
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (r % 3 === 1 && c % 3 === 1) mask[r][c] = true;
        }
      }
      break;
    case "corridors":
      for (let r = 0; r < rows; r++) {
        if (r % 3 === 0) {
          for (let c = 0; c < cols; c++) {
            // Leave gaps every 3 columns for passage
            if (c % 4 !== 0) mask[r][c] = true;
          }
        }
      }
      break;
    case "maze":
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          // Alternating walls with passages
          if (r % 2 === 0 && c % 2 === 1) mask[r][c] = true;
          if (r % 2 === 1 && c % 2 === 0) mask[r][c] = true;
        }
      }
      break;
    case "fortress": {
      const cx = Math.floor(cols / 2);
      const cy = Math.floor(rows / 2);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const dist = Math.max(Math.abs(r - cy), Math.abs(c - cx));
          if (dist === 2 || dist === 4) mask[r][c] = true;
        }
      }
      break;
    }
  }

  return mask;
}

export class StarField {
  blocks: Block[] = [];
  star: Star | null = null;

  constructor(private scene: THREE.Scene) {}

  generate(waveIndex = 0, worldIndex = 0) {
    this.clear();

    const theme = WORLD_THEMES[worldIndex % WORLD_THEMES.length];
    const patternName = theme.patterns[waveIndex % theme.patterns.length];
    const patternFn = patternMap[patternName];
    const cols = theme.cols;
    const rows = theme.rows;

    const grid = patternFn(cols, rows);

    const totalWidth = (cols - 1) * BLOCK_SPACING_X;
    const startX = -totalWidth / 2;

    // HP: 1 base + wave bonus (later waves = tougher)
    const baseHp = 1 + waveIndex;

    // Place star near center
    const starRow = Math.floor(rows / 2) + Math.floor(Math.random() * 2 - 0.5);
    const starCol = Math.floor(cols / 2) + Math.floor(Math.random() * 2 - 0.5);

    // Generate indestructible mask
    const indestructibleMask = generateIndestructibleMask(
      theme.indestructiblePattern, cols, rows
    );

    // Clear indestructible mask around star (3x3) and below star (path to paddle)
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const mr = starRow + dr;
        const mc = starCol + dc;
        if (mr >= 0 && mr < rows && mc >= 0 && mc < cols) {
          indestructibleMask[mr][mc] = false;
        }
      }
    }
    // Clear column below star for reachability
    for (let r = starRow + 1; r < rows; r++) {
      indestructibleMask[r][starCol] = false;
      // Also clear neighbors for wider path
      if (starCol > 0) indestructibleMask[r][starCol - 1] = false;
      if (starCol < cols - 1) indestructibleMask[r][starCol + 1] = false;
    }

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (!grid[row][col] && !indestructibleMask[row][col]) continue;

        const x = startX + col * BLOCK_SPACING_X;
        const y = BLOCK_START_Y - row * BLOCK_SPACING_Y;

        if (Math.abs(x) > GAME_WIDTH / 2 - 0.6) continue;

        if (row === starRow && col === starCol) {
          this.star = new Star(x, y);
          this.scene.add(this.star.mesh);
          continue;
        }

        if (indestructibleMask[row][col]) {
          // Indestructible block
          const block = new Block(
            x, y, INDESTRUCTIBLE_COLOR, INDESTRUCTIBLE_COLOR_INDEX, 20, row
          );
          this.blocks.push(block);
          this.scene.add(block.mesh);
          const glow = block.getEdgeGlow();
          if (glow) this.scene.add(glow);
        } else {
          // Normal block: color tier spread across rows within world's tier limit
          const maxTier = theme.maxColorTier;
          const t = rows > 1 ? (rows - 1 - row) / (rows - 1) : 0;
          const colorIndex = Math.min(Math.floor(t * (maxTier + 1)), maxTier);
          const color = BLOCK_COLORS[colorIndex];
          const block = new Block(x, y, color, colorIndex, baseHp, row);
          this.blocks.push(block);
          this.scene.add(block.mesh);
        }
      }
    }

    if (!this.star) {
      const x = 0;
      const y = BLOCK_START_Y - starRow * BLOCK_SPACING_Y;
      this.star = new Star(x, y);
      this.scene.add(this.star.mesh);
    }
  }

  clear() {
    for (const block of this.blocks) {
      this.scene.remove(block.mesh);
      const glow = block.getEdgeGlow();
      if (glow) this.scene.remove(glow);
    }
    if (this.star) {
      this.scene.remove(this.star.mesh);
    }
    this.blocks = [];
    this.star = null;
  }

  update() {
    if (this.star) this.star.update();
    const time = performance.now() / 1000;
    for (const block of this.blocks) {
      block.updatePulse(time);
    }
  }

  get aliveCount() {
    let count = this.blocks.filter((b) => b.alive && !b.indestructible).length;
    if (this.star?.alive) count++;
    return count;
  }

  getAliveBlocks() {
    return this.blocks.filter((b) => b.alive);
  }
}
