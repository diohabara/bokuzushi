import { describe, expect, it } from "vitest";
import {
  createSplitBallVelocities,
  getExtendedPaddleMultiplier,
  getBallDistanceSpeedMultiplier,
  getRankingStorageKey,
  getStagePaddleBaseMultiplier,
  getVisibleRankingWorlds,
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

  it("前半ステージほど減衰を弱くして間延びを防ぐ", () => {
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

    expect(earlyWorld).toBeGreaterThan(lateWorld);
  });

  it("距離が離れると通常速度へ戻る", () => {
    expect(getBallDistanceSpeedMultiplier({
      distanceRatio: 1,
      verticalVelocity: -0.12,
      world: 5,
      coarsePointer: true,
    })).toBeCloseTo(1);
  });

  it("後半の中距離では近めなら減衰をしっかり維持する", () => {
    expect(getBallDistanceSpeedMultiplier({
      distanceRatio: 0.25,
      verticalVelocity: -0.12,
      world: 5,
      coarsePointer: false,
    })).toBeCloseTo(0.713, 3);
  });

  it("前半の中距離では後半より自然に速く返る", () => {
    expect(getBallDistanceSpeedMultiplier({
      distanceRatio: 0.25,
      verticalVelocity: -0.12,
      world: 1,
      coarsePointer: false,
    })).toBeCloseTo(0.865, 3);
  });

  it("モバイルでは近距離の減衰を強める", () => {
    const desktop = getBallDistanceSpeedMultiplier({
      distanceRatio: 0,
      verticalVelocity: -0.12,
      world: 5,
      coarsePointer: false,
    });
    const mobile = getBallDistanceSpeedMultiplier({
      distanceRatio: 0,
      verticalVelocity: -0.12,
      world: 5,
      coarsePointer: true,
    });

    expect(desktop).toBeCloseTo(0.66);
    expect(mobile).toBeCloseTo(0.54);
    expect(mobile).toBeLessThan(desktop);
  });

  it("モバイル前半も後半より減衰を弱くする", () => {
    const earlyMobile = getBallDistanceSpeedMultiplier({
      distanceRatio: 0,
      verticalVelocity: -0.12,
      world: 1,
      coarsePointer: true,
    });
    const lateMobile = getBallDistanceSpeedMultiplier({
      distanceRatio: 0,
      verticalVelocity: -0.12,
      world: 5,
      coarsePointer: true,
    });

    expect(earlyMobile).toBeCloseTo(0.76);
    expect(lateMobile).toBeCloseTo(0.54);
    expect(earlyMobile).toBeGreaterThan(lateMobile);
  });
});

describe("getRankingStorageKey", () => {
  it("銀河ごとに別の保存キーを返す", () => {
    expect(getRankingStorageKey(1)).toBe("bokuzushi_ranking_world_1");
    expect(getRankingStorageKey(5)).toBe("bokuzushi_ranking_world_5");
    expect(getRankingStorageKey(1)).not.toBe(getRankingStorageKey(2));
  });
});

describe("getVisibleRankingWorlds", () => {
  it("選択中の銀河を先頭にしつつ解放済み銀河を全部返す", () => {
    expect(getVisibleRankingWorlds(5, 3)).toEqual([3, 1, 2, 4, 5]);
  });

  it("未解放の銀河は並びに含めない", () => {
    expect(getVisibleRankingWorlds(2, 5)).toEqual([2, 1]);
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
  it("パドル延長は基礎長に対して一定量ずつ伸びる", () => {
    expect(getExtendedPaddleMultiplier(1, 1)).toBeCloseTo(1.5);
    expect(getExtendedPaddleMultiplier(1.18, 2)).toBeCloseTo(2.18);
  });

  it("画面の8割幅で上限に達する", () => {
    expect(getExtendedPaddleMultiplier(4.3, 1)).toBeCloseTo((16 * 0.8) / 2.8);
    expect(getExtendedPaddleMultiplier(1.18, 20)).toBeCloseTo((16 * 0.8) / 2.8);
  });
});

describe("getStagePaddleBaseMultiplier", () => {
  it("同じ銀河でも巡目ごとに基礎長を変える", () => {
    expect(getStagePaddleBaseMultiplier({ world: 1, wave: 1 })).toBeGreaterThan(
      getStagePaddleBaseMultiplier({ world: 1, wave: 2 })
    );
    expect(getStagePaddleBaseMultiplier({ world: 1, wave: 2 })).toBeGreaterThan(
      getStagePaddleBaseMultiplier({ world: 1, wave: 3 })
    );
  });

  it("後半銀河ほど基礎長を少し短くする", () => {
    expect(getStagePaddleBaseMultiplier({ world: 1, wave: 1 })).toBeGreaterThan(
      getStagePaddleBaseMultiplier({ world: 5, wave: 1 })
    );
  });
});
