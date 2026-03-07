import { describe, expect, it } from "vitest";
import {
  applyBlockHit,
  chargeFever,
  createProgressionState,
  getAttackPower,
  getBounceAxis,
  mergeRanking,
  resolveBlockHit,
  tickTimers,
} from "./gameRules";

describe("resolveBlockHit", () => {
  it("貫通条件なら即破壊して反射しない", () => {
    const result = resolveBlockHit({
      level: 5,
      ballColorIndex: 4,
      blockColorIndex: 2,
      blockMaxHp: 6,
      indestructible: false,
    });

    expect(result.destroysImmediately).toBe(true);
    expect(result.shouldBounce).toBe(false);
    expect(result.damage).toBe(6);
  });

  it("同色以下なら反射しながら削る", () => {
    const result = resolveBlockHit({
      level: 1,
      ballColorIndex: 1,
      blockColorIndex: 3,
      blockMaxHp: 8,
      indestructible: false,
    });

    expect(result.destroysImmediately).toBe(false);
    expect(result.shouldBounce).toBe(true);
    expect(result.damage).toBe(2);
  });
});

describe("getAttackPower", () => {
  it("レベルに応じて攻撃力が上がる", () => {
    expect(getAttackPower(1, 0)).toBe(1);
    expect(getAttackPower(5, 0)).toBe(3);
    expect(getAttackPower(7, 2)).toBe(6);
  });
});

describe("progression", () => {
  it("必要ヒットを超えるとレベルアップする", () => {
    let state = createProgressionState();

    for (let i = 0; i < 35; i++) {
      state = applyBlockHit(state).state;
    }

    expect(state.level).toBe(2);
    expect(state.ballColorIndex).toBe(1);
  });

  it("Fever ゲージが満タンで発火する", () => {
    const initial = createProgressionState();
    const result = chargeFever(initial, 100);

    expect(result.feverTriggered).toBe(true);
    expect(result.state.feverActive).toBe(true);
    expect(result.state.feverGauge).toBe(100);
  });

  it("タイマー更新で combo と fever が切れる", () => {
    const state = {
      ...createProgressionState(),
      combo: 5,
      comboTimer: 0.2,
      feverActive: true,
      feverTimer: 0.2,
      feverGauge: 100,
    };

    const next = tickTimers(state, 0.3);

    expect(next.combo).toBe(0);
    expect(next.feverActive).toBe(false);
    expect(next.feverGauge).toBe(0);
  });
});

describe("getBounceAxis", () => {
  it("横面から入ったときは x 反転を返す", () => {
    const axis = getBounceAxis({
      prevX: -2,
      prevY: 0.1,
      nextX: -0.4,
      nextY: 0.18,
      blockX: 0,
      blockY: 0,
      halfWidth: 0.6,
      halfHeight: 0.25,
      radius: 0.18,
    });

    expect(axis).toBe("x");
  });

  it("上下面から入ったときは y 反転を返す", () => {
    const axis = getBounceAxis({
      prevX: 0.1,
      prevY: 1.5,
      nextX: 0.12,
      nextY: 0.35,
      blockX: 0,
      blockY: 0,
      halfWidth: 0.6,
      halfHeight: 0.25,
      radius: 0.18,
    });

    expect(axis).toBe("y");
  });
});

describe("mergeRanking", () => {
  it("高得点順で上位10件に切り詰める", () => {
    const current = Array.from({ length: 10 }, (_, index) => ({
      score: 1000 - index * 10,
      world: "桜花",
      date: "2026/03/07",
    }));

    const next = mergeRanking(current, {
      score: 1200,
      world: "黄金",
      date: "2026/03/07",
    });

    expect(next).toHaveLength(10);
    expect(next[0]?.score).toBe(1200);
  });
});
