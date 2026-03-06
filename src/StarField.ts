import * as THREE from "three";
import { Block } from "./Block";
import { Star } from "./Star";
import {
  BLOCK_COLS,
  BLOCK_ROWS,
  BLOCK_SPACING_X,
  BLOCK_SPACING_Y,
  BLOCK_START_Y,
  BLOCK_ROW_CONFIG,
} from "./constants";

export class StarField {
  blocks: Block[] = [];
  star: Star | null = null;

  constructor(private scene: THREE.Scene) {}

  generate() {
    this.clear();
    const totalWidth = (BLOCK_COLS - 1) * BLOCK_SPACING_X;
    const startX = -totalWidth / 2;

    const centerRow = Math.floor(BLOCK_ROWS / 2);
    const centerCol = Math.floor(BLOCK_COLS / 2);

    for (let row = 0; row < BLOCK_ROWS; row++) {
      const config = BLOCK_ROW_CONFIG[row];
      for (let col = 0; col < BLOCK_COLS; col++) {
        const x = startX + col * BLOCK_SPACING_X;
        const y = BLOCK_START_Y - row * BLOCK_SPACING_Y;

        // Place star in the center instead of a block
        if (row === centerRow && col === centerCol) {
          this.star = new Star(x, y);
          this.scene.add(this.star.mesh);
          continue;
        }

        const block = new Block(x, y, config.color, config.hp, row);
        this.blocks.push(block);
        this.scene.add(block.mesh);
      }
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
