import { describe, expect, it } from "vitest";
import { getBallDistanceSpeedMultiplier, getRankingStorageKey } from "./Game";

describe("getBallDistanceSpeedMultiplier", () => {
  it("上昇中は減衰しない", () => {
    expect(getBallDistanceSpeedMultiplier({
      distanceRatio: 0,
      verticalVelocity: 0.12,
      world: 4,
    })).toBe(1);
  });

  it("下降中の近距離では従来の減衰量を保つ", () => {
    expect(getBallDistanceSpeedMultiplier({
      distanceRatio: 0,
      verticalVelocity: -0.12,
      world: 5,
      coarsePointer: false,
    })).toBeCloseTo(0.66);
  });

  it("ワールドに関係なく同じ減衰カーブを使う", () => {
    const earlyWorld = getBallDistanceSpeedMultiplier({
      distanceRatio: 0.3,
      verticalVelocity: -0.12,
      world: 1,
      coarsePointer: false,
    });
    const lateWorld = getBallDistanceSpeedMultiplier({
      distanceRatio: 0.3,
      verticalVelocity: -0.12,
      world: 5,
      coarsePointer: false,
    });

    expect(earlyWorld).toBeCloseTo(lateWorld);
  });

  it("距離が離れると通常速度へ戻る", () => {
    expect(getBallDistanceSpeedMultiplier({
      distanceRatio: 1,
      verticalVelocity: -0.12,
      world: 5,
      coarsePointer: true,
    })).toBeCloseTo(1);
  });

  it("中距離でも近めなら減衰をしっかり維持する", () => {
    expect(getBallDistanceSpeedMultiplier({
      distanceRatio: 0.25,
      verticalVelocity: -0.12,
      world: 4,
      coarsePointer: false,
    })).toBeCloseTo(0.713, 3);
  });

  it("モバイルでは近距離の減衰を強める", () => {
    const desktop = getBallDistanceSpeedMultiplier({
      distanceRatio: 0,
      verticalVelocity: -0.12,
      world: 4,
      coarsePointer: false,
    });
    const mobile = getBallDistanceSpeedMultiplier({
      distanceRatio: 0,
      verticalVelocity: -0.12,
      world: 4,
      coarsePointer: true,
    });

    expect(desktop).toBeCloseTo(0.66);
    expect(mobile).toBeCloseTo(0.54);
    expect(mobile).toBeLessThan(desktop);
  });
});

describe("getRankingStorageKey", () => {
  it("銀河ごとに別の保存キーを返す", () => {
    expect(getRankingStorageKey(1)).toBe("bokuzushi_ranking_world_1");
    expect(getRankingStorageKey(5)).toBe("bokuzushi_ranking_world_5");
    expect(getRankingStorageKey(1)).not.toBe(getRankingStorageKey(2));
  });
});
