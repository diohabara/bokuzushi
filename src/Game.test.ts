import { describe, expect, it } from "vitest";
import {
  createSplitBallVelocities,
  getExtendedPaddleMultiplier,
  getBallDistanceSpeedMultiplier,
  getRankingStorageKey,
  isDebugUnlockAllEnabled,
} from "./Game";

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

describe("isDebugUnlockAllEnabled", () => {
  it("URL クエリで全銀河解放を有効化できる", () => {
    expect(isDebugUnlockAllEnabled({
      search: "?unlockAll=1",
      storageValue: null,
    })).toBe(true);
    expect(isDebugUnlockAllEnabled({
      search: "?debugUnlockAll=true",
      storageValue: null,
    })).toBe(true);
  });

  it("localStorage フラグでも全銀河解放を有効化できる", () => {
    expect(isDebugUnlockAllEnabled({
      search: "",
      storageValue: "1",
    })).toBe(true);
    expect(isDebugUnlockAllEnabled({
      search: "",
      storageValue: "true",
    })).toBe(true);
  });

  it("フラグがなければ通常進行のまま", () => {
    expect(isDebugUnlockAllEnabled({
      search: "?unlockAll=0",
      storageValue: null,
    })).toBe(false);
    expect(isDebugUnlockAllEnabled({
      search: "",
      storageValue: "0",
    })).toBe(false);
  });
});

describe("createSplitBallVelocities", () => {
  it("増殖球は元の速度を保ったまま2方向に分かれる", () => {
    const velocities = createSplitBallVelocities({
      vx: 0,
      vy: 0.2,
      speed: 0.2,
    });

    expect(velocities).toHaveLength(2);
    expect(Math.hypot(velocities[0]!.vx, velocities[0]!.vy)).toBeCloseTo(0.2);
    expect(Math.hypot(velocities[1]!.vx, velocities[1]!.vy)).toBeCloseTo(0.2);
    expect(velocities[0]!.vx).toBeCloseTo(-velocities[1]!.vx, 6);
    expect(velocities[0]!.vy).toBeCloseTo(velocities[1]!.vy, 6);
  });
});

describe("getExtendedPaddleMultiplier", () => {
  it("パドル延長は取るたびに一定量ずつ伸びる", () => {
    expect(getExtendedPaddleMultiplier(1)).toBeCloseTo(1.5);
    expect(getExtendedPaddleMultiplier(1.5)).toBeCloseTo(2);
  });

  it("画面の8割幅で上限に達する", () => {
    expect(getExtendedPaddleMultiplier(4.3)).toBeCloseTo((16 * 0.8) / 2.8);
    expect(getExtendedPaddleMultiplier(10)).toBeCloseTo((16 * 0.8) / 2.8);
  });
});
