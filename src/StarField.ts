import * as THREE from "three";
import { Block, type BlockKind } from "./Block";
import { Star } from "./Star";
import {
  BLOCK_HEIGHT,
  BLOCK_SPACING_X,
  BLOCK_SPACING_Y,
  BLOCK_START_Y,
  BLOCK_COLORS,
  GAME_HEIGHT,
  GAME_WIDTH,
  WALL_THICKNESS,
  WORLD_THEMES,
  INDESTRUCTIBLE_COLOR,
  INDESTRUCTIBLE_COLOR_INDEX,
  PatternName,
  IndestructiblePattern,
} from "./constants";

type PatternFn = (cols: number, rows: number) => boolean[][];
type StarFieldGenerateOptions = {
  coarsePointer?: boolean;
  paddleTop?: number;
};
type SpecialBlockSpawn = {
  kind: BlockKind;
  count: number;
};

const LATE_WORLD_ROW_THRESHOLD = 28;
const DEEP_WORLD_ROW_THRESHOLD = 32;
const DESKTOP_BLOCK_TOP_MARGIN = 0.1;
const MOBILE_BLOCK_TOP_MARGIN = 0.2;
const LATE_WORLD_PADDLE_CLEARANCE = 1.2;
const DEEP_WORLD_PADDLE_CLEARANCE = 1.8;

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

export function getStarPlacementProfile(worldIndex: number, waveIndex: number) {
  const totalStages = WORLD_THEMES.length * 3 - 1;
  const stageProgress = Math.min((worldIndex * 3 + waveIndex) / Math.max(totalStages, 1), 1);
  const waveBottomRatios = [0.5, 0.7, 0.9];
  const baseBottomRatio = waveBottomRatios[waveIndex % waveBottomRatios.length] ?? 0.5;
  const worldDepthBonus = Math.min(worldIndex * 0.02, 0.06);
  const bottomRatio = Math.min(baseBottomRatio + worldDepthBonus, 0.93);
  return {
    stageProgress,
    bottomRatio,
    starDepth: 1 - bottomRatio,
    colOffsetBase: stageProgress < 0.35 ? 1 : 2,
    allowWideOffset: stageProgress > 0.7,
    pathHalfWidth: stageProgress < 0.34 ? 1 : 0,
    guardTierBoost: stageProgress < 0.3 ? 0 : stageProgress < 0.68 ? 1 : 2,
    guardHpMultiplier: 1 + stageProgress * 0.75,
    guardRadius: stageProgress < 0.45 ? 1 : 2,
  };
}

export function getBlockLayoutProfile(rows: number, coarsePointer: boolean, paddleTop: number) {
  if (rows < LATE_WORLD_ROW_THRESHOLD) {
    return {
      startY: BLOCK_START_Y,
      spacingY: BLOCK_SPACING_Y,
    };
  }

  const topMargin = coarsePointer ? MOBILE_BLOCK_TOP_MARGIN : DESKTOP_BLOCK_TOP_MARGIN;
  const topLimitY = GAME_HEIGHT / 2 - WALL_THICKNESS - BLOCK_HEIGHT / 2 - topMargin;
  const paddleClearance = rows >= DEEP_WORLD_ROW_THRESHOLD
    ? DEEP_WORLD_PADDLE_CLEARANCE
    : LATE_WORLD_PADDLE_CLEARANCE;
  const lowestAllowedY = paddleTop + BLOCK_HEIGHT / 2 + paddleClearance;
  const fittedSpacingY = rows > 1
    ? (topLimitY - lowestAllowedY) / (rows - 1)
    : BLOCK_SPACING_Y;

  return {
    startY: topLimitY,
    spacingY: Math.max(0.1, Math.min(BLOCK_SPACING_Y, fittedSpacingY)),
  };
}

export function getFrontRowDurabilityProfile(rows: number, row: number, stageProgress: number) {
  const rowRatio = rows > 1 ? row / (rows - 1) : 0;
  const lateWorldFactor = THREE.MathUtils.smoothstep(stageProgress, 0.45, 1);
  const frontZoneFactor = THREE.MathUtils.smoothstep(rowRatio, 0.55, 1);
  const softness = lateWorldFactor * frontZoneFactor;

  return {
    tierReduction: softness >= 0.85 ? 2 : softness >= 0.35 ? 1 : 0,
  };
}

export function getSpecialBlockPlan(worldIndex: number, waveIndex: number): SpecialBlockSpawn[] {
  switch (worldIndex) {
    case 0:
    case 1:
      return [];
    case 2:
      return [
        { kind: "bomb", count: waveIndex >= 2 ? 3 : 2 },
      ];
    case 3:
      return [
        { kind: "bomb", count: waveIndex >= 2 ? 3 : 2 },
        { kind: "split", count: waveIndex >= 2 ? 2 : 1 },
      ];
    default:
      return [
        { kind: "bomb", count: waveIndex >= 2 ? 2 : 1 },
        { kind: "split", count: 1 },
        { kind: "reflect", count: waveIndex >= 2 ? 2 : 1 },
      ];
  }
}

function shuffleInPlace<T>(items: T[]) {
  for (let index = items.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
}

function getSpecialBlockStats(
  kind: BlockKind,
  baseColorIndex: number,
  maxTier: number,
  baseHp: number
) {
  switch (kind) {
    case "bomb":
      return {
        colorIndex: Math.max(0, Math.min(maxTier, baseColorIndex - 1)),
        hp: Math.max(1, Math.ceil(baseHp * 0.8)),
      };
    case "split":
      return {
        colorIndex: Math.max(0, Math.min(maxTier, baseColorIndex - 1)),
        hp: 1,
      };
    case "reflect":
      return {
        colorIndex: Math.max(1, Math.min(maxTier, baseColorIndex + 1)),
        hp: 2,
      };
    default:
      return {
        colorIndex: baseColorIndex,
        hp: baseHp,
      };
  }
}

export class StarField {
  blocks: Block[] = [];
  star: Star | null = null;

  constructor(private scene: THREE.Scene) {}

  generate(
    waveIndex = 0,
    worldIndex = 0,
    options: StarFieldGenerateOptions = {}
  ) {
    this.clear();

    const theme = WORLD_THEMES[worldIndex % WORLD_THEMES.length];
    const patternName = theme.patterns[waveIndex % theme.patterns.length];
    const patternFn = patternMap[patternName];
    const cols = theme.cols;
    const rows = theme.rows;
    const layout = getBlockLayoutProfile(
      rows,
      options.coarsePointer === true && options.paddleTop !== undefined,
      options.paddleTop ?? 0
    );

    const grid = patternFn(cols, rows);

    const totalWidth = (cols - 1) * BLOCK_SPACING_X;
    const startX = -totalWidth / 2;

    // HP: 1 base + wave bonus (later waves = tougher)
    const baseHp = 1 + waveIndex;

    // Place star: start close in early stages, then push deeper as worlds and waves progress.
    const placement = getStarPlacementProfile(worldIndex, waveIndex);
    const starDepth = placement.starDepth;
    const unclampedRow = Math.floor(rows * starDepth) + Math.floor(Math.random() * 2);
    const starRow = Math.min(rows - 4, Math.max(2, unclampedRow));

    // Offset star from center only a little in early stages, then widen later.
    const centerCol = Math.floor(cols / 2);
    const colOffsetBase = placement.colOffsetBase;
    const colOffsetExtra = placement.allowWideOffset ? Math.floor(Math.random() * 2) : 0;
    const colOffset = colOffsetBase + colOffsetExtra;
    const starCol = Math.min(cols - 2, Math.max(1, centerCol + (Math.random() < 0.5 ? -colOffset : colOffset)));

    // Generate indestructible mask
    const indestructibleMask = generateIndestructibleMask(
      theme.indestructiblePattern, cols, rows
    );

    // Keep the star area destructible, but let later stages remain more crowded.
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const mr = starRow + dr;
        const mc = starCol + dc;
        if (mr >= 0 && mr < rows && mc >= 0 && mc < cols) {
          indestructibleMask[mr][mc] = false;
        }
      }
    }
    // Clear only the guaranteed lane below the star. Early stages get a wider lane.
    for (let r = starRow + 1; r < rows; r++) {
      indestructibleMask[r][starCol] = false;
      for (let offset = 1; offset <= placement.pathHalfWidth; offset++) {
        if (starCol - offset >= 0) indestructibleMask[r][starCol - offset] = false;
        if (starCol + offset < cols) indestructibleMask[r][starCol + offset] = false;
      }
    }

    const specialKindsByCell = new Map<string, BlockKind>();
    const eligibleSpecialCells = shuffleInPlace(
      Array.from({ length: rows }, (_, row) => row).flatMap((row) =>
        Array.from({ length: cols }, (_, col) => ({ row, col }))
      )
    ).filter(({ row, col }) => {
      if (!grid[row]?.[col]) return false;
      if (indestructibleMask[row]?.[col]) return false;
      if (row === starRow && col === starCol) return false;
      if (row >= rows - 2) return false;
      if (row > starRow && Math.abs(col - starCol) <= placement.pathHalfWidth) return false;
      return true;
    });

    let specialCursor = 0;
    for (const spawn of getSpecialBlockPlan(worldIndex, waveIndex)) {
      for (let index = 0; index < spawn.count; index++) {
        const cell = eligibleSpecialCells[specialCursor];
        if (!cell) break;
        specialKindsByCell.set(`${cell.row}:${cell.col}`, spawn.kind);
        specialCursor += 1;
      }
    }

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (!grid[row][col] && !indestructibleMask[row][col]) continue;

        const x = startX + col * BLOCK_SPACING_X;
        const y = layout.startY - row * layout.spacingY;

        if (Math.abs(x) > GAME_WIDTH / 2 - 0.6) continue;

        if (row === starRow && col === starCol) {
          this.star = new Star(x, y);
          this.scene.add(this.star.mesh);
          continue;
        }

        if (indestructibleMask[row][col]) {
          // Indestructible block
          const block = new Block(
            x, y, INDESTRUCTIBLE_COLOR, INDESTRUCTIBLE_COLOR_INDEX, 20, row, col, "indestructible"
          );
          this.blocks.push(block);
          this.scene.add(block.mesh);
          const glow = block.getEdgeGlow();
          if (glow) this.scene.add(glow);
        } else {
          // Normal block: color tier spread across rows within world's tier limit
          const maxTier = theme.maxColorTier;
          const t = rows > 1 ? (rows - 1 - row) / (rows - 1) : 0;
          const baseColorIndex = Math.min(Math.floor(t * (maxTier + 1)), maxTier);
          const frontDurability = getFrontRowDurabilityProfile(rows, row, placement.stageProgress);
          const softenedBaseColorIndex = Math.max(0, baseColorIndex - frontDurability.tierReduction);
          const starDistance = Math.abs(row - starRow) + Math.abs(col - starCol);
          const inGuardZone = starDistance <= placement.guardRadius;
          const appliedBoost = inGuardZone
            ? Math.max(0, placement.guardTierBoost - Math.max(0, starDistance - 1))
            : 0;
          const boostedColorIndex = Math.min(softenedBaseColorIndex + appliedBoost, maxTier);
          const baseTierHp = baseHp * (1 + boostedColorIndex);
          const guardHp = inGuardZone
            ? Math.ceil(baseTierHp * placement.guardHpMultiplier)
            : baseTierHp;
          const specialKind = specialKindsByCell.get(`${row}:${col}`) ?? "normal";
          const specialStats = getSpecialBlockStats(
            specialKind,
            boostedColorIndex,
            maxTier,
            guardHp
          );
          const color = specialKind === "normal"
            ? BLOCK_COLORS[specialStats.colorIndex]
            : specialKind === "bomb"
              ? 0xff6a3d
              : specialKind === "split"
                ? 0x57ffe5
                : 0xb8e7ff;
          const block = new Block(
            x,
            y,
            color,
            specialStats.colorIndex,
            specialStats.hp,
            row,
            col,
            specialKind
          );
          this.blocks.push(block);
          this.scene.add(block.mesh);
          const glow = block.getEdgeGlow();
          if (glow) this.scene.add(glow);
        }
      }
    }

    if (!this.star) {
      const x = 0;
      const y = layout.startY - starRow * layout.spacingY;
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
