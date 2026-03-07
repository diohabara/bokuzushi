import { describe, expect, it } from "vitest";
import {
  getBlockLayoutProfile,
  getStarPlacementProfile,
} from "./StarField";
import {
  BLOCK_HEIGHT,
  BLOCK_SPACING_Y,
  BLOCK_START_Y,
  PADDLE_HEIGHT,
  PADDLE_Y,
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
  const mobilePaddleTop = PADDLE_Y + 1.75 + PADDLE_HEIGHT / 2;

  it("desktop では高段数でも従来レイアウトを維持する", () => {
    const layout = getBlockLayoutProfile(32, false, mobilePaddleTop);

    expect(layout.startY).toBe(BLOCK_START_Y);
    expect(layout.spacingY).toBe(BLOCK_SPACING_Y);
  });

  it("mobile でも 24 行以下は従来レイアウトを維持する", () => {
    const layout = getBlockLayoutProfile(24, true, mobilePaddleTop);

    expect(layout.startY).toBe(BLOCK_START_Y);
    expect(layout.spacingY).toBe(BLOCK_SPACING_Y);
  });

  it("mobile の 4章相当は上へ逃がしつつ間隔は維持する", () => {
    const rows = 28;
    const layout = getBlockLayoutProfile(rows, true, mobilePaddleTop);
    const lowestBlockY = layout.startY - layout.spacingY * (rows - 1);

    expect(layout.startY).toBeGreaterThan(BLOCK_START_Y);
    expect(layout.spacingY).toBeCloseTo(BLOCK_SPACING_Y);
    expect(lowestBlockY).toBeGreaterThan(mobilePaddleTop + BLOCK_HEIGHT / 2);
  });

  it("mobile の 5章相当は縦間隔を詰めて最下段をパドルより上に保つ", () => {
    const rows = 32;
    const layout = getBlockLayoutProfile(rows, true, mobilePaddleTop);
    const lowestBlockY = layout.startY - layout.spacingY * (rows - 1);

    expect(layout.startY).toBeGreaterThan(BLOCK_START_Y);
    expect(layout.spacingY).toBeLessThan(BLOCK_SPACING_Y);
    expect(lowestBlockY).toBeGreaterThan(mobilePaddleTop + BLOCK_HEIGHT / 2);
  });
});
