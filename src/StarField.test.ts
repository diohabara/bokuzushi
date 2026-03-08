import { describe, expect, it } from "vitest";
import {
  getBlockLayoutProfile,
  getFrontRowDurabilityProfile,
  getStarPlacementProfile,
} from "./StarField";
import {
  BLOCK_HEIGHT,
  BLOCK_SPACING_Y,
  BLOCK_START_Y,
  MOBILE_PADDLE_LIFT,
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
