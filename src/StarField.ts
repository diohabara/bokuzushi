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
  WorldTheme,
} from "./constants";

type PatternFn = (cols: number, rows: number) => boolean[][];

const patternMap: Record<WorldTheme["pattern"], PatternFn> = {
  grid: (cols, rows) =>
    Array.from({ length: rows }, () => Array(cols).fill(true)),

  diamond: (cols, rows) => {
    const cx = (cols - 1) / 2;
    const cy = (rows - 1) / 2;
    const rx = cols / 2;
    const ry = rows / 2;
    return Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) =>
        Math.abs(c - cx) / rx + Math.abs(r - cy) / ry <= 1
      )
    );
  },

  "v-shape": (cols, rows) =>
    Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => {
        const cx = (cols - 1) / 2;
        const armWidth = 1.5;
        const leftArm = Math.abs(c - (cx - r * (cx / rows)));
        const rightArm = Math.abs(c - (cx + r * (cx / rows)));
        return leftArm < armWidth || rightArm < armWidth;
      })
    ),

  random: (cols, rows) =>
    Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => Math.random() > 0.2)
    ),

  ring: (cols, rows) =>
    Array.from({ length: rows }, (_, r) =>
      Array.from(
        { length: cols },
        (_, c) => r === 0 || r === rows - 1 || c === 0 || c === cols - 1
      )
    ),
};

export class StarField {
  blocks: Block[] = [];
  star: Star | null = null;

  constructor(private scene: THREE.Scene) {}

  generate(waveIndex = 0, worldIndex = 0) {
    this.clear();

    const theme = WORLD_THEMES[worldIndex % WORLD_THEMES.length];
    const patternFn = patternMap[theme.pattern];
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

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (!grid[row][col]) continue;

        const x = startX + col * BLOCK_SPACING_X;
        const y = BLOCK_START_Y - row * BLOCK_SPACING_Y;

        if (Math.abs(x) > GAME_WIDTH / 2 - 1) continue;

        if (row === starRow && col === starCol) {
          this.star = new Star(x, y);
          this.scene.add(this.star.mesh);
          continue;
        }

        // Color by row - uniform across all worlds
        const colorIndex = row % BLOCK_COLORS.length;
        const color = BLOCK_COLORS[colorIndex];

        const block = new Block(x, y, color, colorIndex, baseHp, row);
        this.blocks.push(block);
        this.scene.add(block.mesh);
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
    }
    if (this.star) {
      this.scene.remove(this.star.mesh);
    }
    this.blocks = [];
    this.star = null;
  }

  update() {
    if (this.star) this.star.update();
  }

  get aliveCount() {
    let count = this.blocks.filter((b) => b.alive).length;
    if (this.star?.alive) count++;
    return count;
  }

  getAliveBlocks() {
    return this.blocks.filter((b) => b.alive);
  }
}
