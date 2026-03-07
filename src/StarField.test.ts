import { describe, expect, it } from "vitest";
import { getStarPlacementProfile } from "./StarField";

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
