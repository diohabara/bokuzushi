import * as THREE from "three";
import { describe, expect, it } from "vitest";
import {
  getBlockLayoutProfile,
  getFrontRowDurabilityProfile,
  getSpecialBlockPlan,
  getStarPlacementProfile,
  StarField,
} from "./StarField";
import {
  BLOCK_HEIGHT,
  BLOCK_SPACING_X,
  BLOCK_SPACING_Y,
  BLOCK_START_Y,
  MOBILE_PADDLE_LIFT,
  PADDLE_HEIGHT,
  PADDLE_Y,
  WORLD_THEMES,
} from "./constants";

describe("getStarPlacementProfile", () => {
  it("各ステージは下から 50%, 70%, 90% ベースで奥へ進む", () => {
    const stage1 = getStarPlacementProfile(0, 0);
    const stage2 = getStarPlacementProfile(0, 1);
    const stage3 = getStarPlacementProfile(0, 2);

    expect(stage1.bottomRatio).toBeCloseTo(0.5);
    expect(stage2.bottomRatio).toBeCloseTo(0.7);
    expect(stage3.bottomRatio).toBeCloseTo(0.9);
    expect(stage1.starDepth).toBeGreaterThan(stage2.starDepth);
    expect(stage2.starDepth).toBeGreaterThan(stage3.starDepth);
  });

  it("後半ワールドほど同じステージでも少し奥へ寄る", () => {
    const early = getStarPlacementProfile(0, 0);
    const late = getStarPlacementProfile(4, 0);

    expect(late.bottomRatio).toBeGreaterThan(early.bottomRatio);
    expect(late.starDepth).toBeLessThan(early.starDepth);
  });

  it("序盤は中央寄り、後半は横ずれ幅が広がる", () => {
    const early = getStarPlacementProfile(0, 0);
    const late = getStarPlacementProfile(4, 2);

    expect(early.colOffsetBase).toBe(1);
    expect(late.colOffsetBase).toBe(2);
    expect(late.allowWideOffset).toBe(true);
  });

  it("後半ほど通路が細く、星周辺の防御が厚くなる", () => {
    const early = getStarPlacementProfile(0, 0);
    const late = getStarPlacementProfile(4, 2);

    expect(early.pathHalfWidth).toBeGreaterThan(late.pathHalfWidth);
    expect(early.guardTierBoost).toBeLessThan(late.guardTierBoost);
    expect(early.guardHpMultiplier).toBeLessThan(late.guardHpMultiplier);
    expect(early.guardRadius).toBeLessThanOrEqual(late.guardRadius);
  });
});

describe("getBlockLayoutProfile", () => {
  const desktopPaddleTop = PADDLE_Y + PADDLE_HEIGHT / 2;
  const mobilePaddleTop = PADDLE_Y + MOBILE_PADDLE_LIFT + PADDLE_HEIGHT / 2;

  it("3章までは desktop でも従来レイアウトを維持する", () => {
    const layout = getBlockLayoutProfile(24, false, desktopPaddleTop);

    expect(layout.startY).toBe(BLOCK_START_Y);
    expect(layout.spacingY).toBe(BLOCK_SPACING_Y);
  });

  it("3章までは mobile でも従来レイアウトを維持する", () => {
    const layout = getBlockLayoutProfile(24, true, mobilePaddleTop);

    expect(layout.startY).toBe(BLOCK_START_Y);
    expect(layout.spacingY).toBe(BLOCK_SPACING_Y);
  });

  it("desktop の 4章相当は最下段を上へ逃がす", () => {
    const rows = 28;
    const layout = getBlockLayoutProfile(rows, false, desktopPaddleTop);
    const lowestBlockY = layout.startY - layout.spacingY * (rows - 1);

    expect(layout.startY).toBeGreaterThan(BLOCK_START_Y);
    expect(layout.spacingY).toBeCloseTo(BLOCK_SPACING_Y);
    expect(lowestBlockY).toBeGreaterThan(desktopPaddleTop + BLOCK_HEIGHT / 2 + 1.1);
  });

  it("mobile の 4章相当も最下段を上へ逃がす", () => {
    const rows = 28;
    const layout = getBlockLayoutProfile(rows, true, mobilePaddleTop);
    const lowestBlockY = layout.startY - layout.spacingY * (rows - 1);

    expect(layout.startY).toBeGreaterThan(BLOCK_START_Y);
    expect(layout.spacingY).toBeCloseTo(BLOCK_SPACING_Y);
    expect(lowestBlockY).toBeGreaterThan(mobilePaddleTop + BLOCK_HEIGHT / 2 + 1.1);
  });

  it("5章相当は縦間隔を詰めて最下段をさらに離す", () => {
    const rows = 32;
    const layout = getBlockLayoutProfile(rows, false, desktopPaddleTop);
    const lowestBlockY = layout.startY - layout.spacingY * (rows - 1);

    expect(layout.startY).toBeGreaterThan(BLOCK_START_Y);
    expect(layout.spacingY).toBeLessThan(BLOCK_SPACING_Y);
    expect(lowestBlockY).toBeGreaterThan(desktopPaddleTop + BLOCK_HEIGHT / 2 + 1.7);
  });
});

describe("getFrontRowDurabilityProfile", () => {
  it("序盤は手前でも tier 配置をほぼ変えない", () => {
    const profile = getFrontRowDurabilityProfile(28, 27, 0.1);

    expect(profile.tierReduction).toBe(0);
  });

  it("後半の手前は低 tier ブロックを増やす", () => {
    const profile = getFrontRowDurabilityProfile(32, 31, 0.9);

    expect(profile.tierReduction).toBe(2);
  });

  it("後半でも上段はほぼ据え置く", () => {
    const profile = getFrontRowDurabilityProfile(32, 4, 0.9);

    expect(profile.tierReduction).toBe(0);
  });
});

describe("WORLD_THEMES", () => {
  it("表示名はそのままで4章と5章の難度設定だけ入れ替える", () => {
    expect(WORLD_THEMES[3]?.name).toBe("氷雪");
    expect(WORLD_THEMES[4]?.name).toBe("黄金");
    expect(WORLD_THEMES[3]?.rows).toBe(32);
    expect(WORLD_THEMES[4]?.rows).toBe(28);
    expect(WORLD_THEMES[3]?.maxColorTier).toBeGreaterThan(WORLD_THEMES[4]?.maxColorTier ?? 0);
  });
});

describe("getSpecialBlockPlan", () => {
  it("1章と2章は追加特殊ブロックを出さない", () => {
    expect(getSpecialBlockPlan(0, 0)).toEqual([]);
    expect(getSpecialBlockPlan(1, 2)).toEqual([]);
  });

  it("3章で爆弾を解禁する", () => {
    expect(getSpecialBlockPlan(2, 1)).toEqual([
      { kind: "bomb", count: 8 },
    ]);
  });

  it("4章で爆弾と増殖を累積解禁する", () => {
    expect(getSpecialBlockPlan(3, 2)).toEqual([
      { kind: "bomb", count: 5 },
      { kind: "split", count: 4 },
    ]);
  });

  it("5章で反射を追加しつつ以前の特殊も残す", () => {
    expect(getSpecialBlockPlan(4, 2)).toEqual([
      { kind: "bomb", count: 4 },
      { kind: "split", count: 16 },
      { kind: "reflect", count: 10 },
    ]);
  });
});

describe("StarField special generation", () => {
  it("3章は爆弾ブロックがはっきり見える数だけ出る", () => {
    const starField = new StarField(new THREE.Scene());
    starField.generate(0, 2, { coarsePointer: false, paddleTop: PADDLE_Y + PADDLE_HEIGHT / 2 });

    const bombs = starField.blocks.filter((block) => block.kind === "bomb");
    expect(bombs.length).toBeGreaterThanOrEqual(8);
    expect(Math.min(...bombs.map((block) => block.row))).toBeGreaterThanOrEqual(15);
  });

  it("4章は爆弾と増殖が両方とも複数見える", () => {
    const starField = new StarField(new THREE.Scene());
    starField.generate(2, 3, { coarsePointer: false, paddleTop: PADDLE_Y + PADDLE_HEIGHT / 2 });

    const bombs = starField.blocks.filter((block) => block.kind === "bomb");
    const splits = starField.blocks.filter((block) => block.kind === "split");
    expect(bombs.length).toBeGreaterThanOrEqual(5);
    expect(splits.length).toBeGreaterThanOrEqual(4);
    expect(
      splits.reduce((sum, block) => sum + block.row, 0) / splits.length
    ).toBeGreaterThan(
      bombs.reduce((sum, block) => sum + block.row, 0) / bombs.length
    );
  });

  it("5章は反射ブロックが目立つ数だけ出る", () => {
    const starField = new StarField(new THREE.Scene());
    starField.generate(2, 4, { coarsePointer: false, paddleTop: PADDLE_Y + PADDLE_HEIGHT / 2 });
    const theme = WORLD_THEMES[4]!;

    const reflects = starField.blocks.filter((block) => block.kind === "reflect");
    const splits = starField.blocks.filter((block) => block.kind === "split");
    expect(reflects.length).toBeGreaterThanOrEqual(10);
    expect(splits.length).toBeGreaterThanOrEqual(16);
    expect(
      reflects.reduce((sum, block) => sum + block.row, 0) / reflects.length
    ).toBeLessThan(
      splits.reduce((sum, block) => sum + block.row, 0) / splits.length
    );
    expect(Math.max(...reflects.map((block) => block.row))).toBeLessThan(
      Math.min(...splits.map((block) => block.row))
    );
    expect(Math.max(...splits.map((block) => block.row))).toBe(theme.rows - 1);
  });

  it("5章の1巡目も増殖ブロックが最前列まで届く", () => {
    const starField = new StarField(new THREE.Scene());
    starField.generate(0, 4, { coarsePointer: false, paddleTop: PADDLE_Y + PADDLE_HEIGHT / 2 });
    const theme = WORLD_THEMES[4]!;

    const splits = starField.blocks.filter((block) => block.kind === "split");
    expect(splits.length).toBeGreaterThanOrEqual(10);
    expect(Math.max(...splits.map((block) => block.row))).toBe(theme.rows - 1);
  });

  it("5章は星の真下に直線で抜けられる穴を作らない", () => {
    const paddleTop = PADDLE_Y + PADDLE_HEIGHT / 2;
    const starField = new StarField(new THREE.Scene());
    starField.generate(2, 4, { coarsePointer: false, paddleTop });

    const theme = WORLD_THEMES[4]!;
    const layout = getBlockLayoutProfile(theme.rows, false, paddleTop);
    const startX = -((theme.cols - 1) * BLOCK_SPACING_X) / 2;
    const star = starField.star!;
    const starCol = Math.round((star.mesh.position.x - startX) / BLOCK_SPACING_X);
    const starRow = Math.round((layout.startY - star.mesh.position.y) / layout.spacingY);
    const barrierBlocks = starField.blocks.filter((block) =>
      (block.kind === "indestructible" || block.kind === "reflect")
      && block.row > starRow
      && Math.abs(block.col - starCol) <= 1
    );

    const barrierRows = new Set(barrierBlocks.map((block) => block.row));
    for (let row = starRow + 1; row < theme.rows - 1; row++) {
      expect(barrierRows.has(row)).toBe(true);
    }
  });

  it("同じ銀河と巡目なら特殊ブロック配置は seed 固定で再現される", () => {
    const first = new StarField(new THREE.Scene());
    const second = new StarField(new THREE.Scene());

    first.generate(0, 2, { coarsePointer: false, paddleTop: PADDLE_Y + PADDLE_HEIGHT / 2 });
    second.generate(0, 2, { coarsePointer: false, paddleTop: PADDLE_Y + PADDLE_HEIGHT / 2 });

    const firstSpecials = first.blocks
      .filter((block) => block.kind !== "normal" && block.kind !== "indestructible")
      .map((block) => `${block.kind}:${block.row}:${block.col}`);
    const secondSpecials = second.blocks
      .filter((block) => block.kind !== "normal" && block.kind !== "indestructible")
      .map((block) => `${block.kind}:${block.row}:${block.col}`);

    expect(firstSpecials).toEqual(secondSpecials);
  });
});
