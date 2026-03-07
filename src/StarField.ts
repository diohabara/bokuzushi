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
  // Full wall — ball must smash through everything
  grid: (cols, rows) =>
    Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => true)
    ),

  // Filled diamond — solid shape, ball bounces off edges and inside
  diamond: (cols, rows) => {
    const cx = (cols - 1) / 2;
    const cy = (rows - 1) / 2;
    const rx = cols / 2;
    const ry = rows / 2;
    return Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => {
        const d = Math.abs(c - cx) / rx + Math.abs(r - cy) / ry;
        return d <= 1;
      })
    );
  },

  // V-shape — wide filled arms with connecting bars
  "v-shape": (cols, rows) =>
    Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => {
        const cx = (cols - 1) / 2;
        const armWidth = 3;
        const leftArm = Math.abs(c - (cx - r * (cx / rows)));
        const rightArm = Math.abs(c - (cx + r * (cx / rows)));
        const onArm = leftArm < armWidth || rightArm < armWidth;
        return onArm || r % 2 === 0;
      })
    ),

  // Nearly full random — 95% fill
  random: (cols, rows) =>
    Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => Math.random() > 0.05)
    ),

  // Tight concentric rings — ball ping-pongs between rings
  ring: (cols, rows) => {
    const cx = (cols - 1) / 2;
    const cy = (rows - 1) / 2;
    return Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => {
        const dist = Math.sqrt(((c - cx) / cx * 5) ** 2 + ((r - cy) / cy * 5) ** 2);
        return Math.floor(dist * 2) % 4 !== 0;
      })
    );
  },

  // Staggered bricks — 75% fill, lots of bounce angles
  checkerboard: (cols, rows) =>
    Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => !((r + c) % 4 === 0))
    ),

  // Zigzag — dense alternating walls, ball bounces side to side
  zigzag: (cols, rows) =>
    Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => {
        const period = 6;
        const phase = Math.floor(r / period) % 2;
        return phase === 0 ? c < cols - 1 : c > 0;
      })
    ),

  // Spiral — narrow carved path through solid mass
  spiral: (cols, rows) => {
    const grid = Array.from({ length: rows }, () => Array(cols).fill(true));
    let top = 1, bottom = rows - 2, left = 1, right = cols - 2;
    let dir = 0;
    while (top <= bottom && left <= right) {
      if (dir === 0) { for (let c = left; c <= right; c++) grid[top][c] = false; top += 4; }
      else if (dir === 1) { for (let r = top; r <= bottom; r++) grid[r][right] = false; right -= 4; }
      else if (dir === 2) { for (let c = right; c >= left; c--) grid[bottom][c] = false; bottom -= 4; }
      else { for (let r = bottom; r >= top; r--) grid[r][left] = false; left += 4; }
      dir = (dir + 1) % 4;
    }
    return grid;
  },

  // Cross — thin cross gap divides four dense quadrants
  cross: (cols, rows) => {
    const cx = Math.floor(cols / 2);
    const cy = Math.floor(rows / 2);
    return Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => {
        return !(r === cy || c === cx);
      })
    );
  },

  // Dense grid — almost full, tiny scattered holes
  "dense-grid": (cols, rows) =>
    Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => {
        if (r % 7 === 0 && c % 7 === 0) return false;
        return true;
      })
    ),

  // Arrow — filled arrowhead with wide shaft
  arrow: (cols, rows) => {
    const cx = (cols - 1) / 2;
    return Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => {
        const halfRow = Math.floor(rows / 2);
        if (r < halfRow) {
          const width = ((halfRow - r) / halfRow) * (cols / 2);
          return Math.abs(c - cx) <= width;
        }
        return Math.abs(c - cx) <= 4 || r % 2 === 0;
      })
    );
  },

  // Tunnel — dense alternating walls, ball ping-pongs vertically
  tunnel: (cols, rows) =>
    Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => {
        const section = Math.floor(r / 5) % 2;
        if (r % 8 === 7) return false;
        return section === 0 ? c < cols - 1 : c > 0;
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

    // Place star: earlier worlds → closer to paddle (lower rows), later worlds → deeper
    const starDepth = Math.min(0.3 + worldIndex * 0.15, 0.7);
    const starRow = Math.floor(rows * starDepth) + Math.floor(Math.random() * 2 - 0.5);
    // Offset star from center column to prevent straight-line penetration
    const centerCol = Math.floor(cols / 2);
    const colOffset = 2 + Math.floor(Math.random() * 2); // 2-3 columns off-center
    const starCol = Math.min(cols - 2, Math.max(1, centerCol + (Math.random() < 0.5 ? -colOffset : colOffset)));

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
          const tierHp = baseHp * (1 + colorIndex);
          const block = new Block(x, y, color, colorIndex, tierHp, row);
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
