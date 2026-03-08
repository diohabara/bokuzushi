import { afterEach, describe, expect, it, vi } from "vitest";
import { selectLaunchAngle, toFrameStepScale } from "./Ball";

describe("selectLaunchAngle", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("初回射出で星への直線コースを避ける", () => {
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(0.9)
      .mockReturnValueOnce(0.5);

    const angle = selectLaunchAngle({
      avoidAngle: Math.PI / 2,
      avoidWindow: 0.12,
    });

    expect(angle).toBeGreaterThan(Math.PI / 2 + 0.12);
  });

  it("禁止帯が広すぎるときは通常の射出角に戻す", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.25);

    const angle = selectLaunchAngle({
      avoidAngle: Math.PI / 2,
      avoidWindow: 1,
    });

    expect(angle).toBeCloseTo(Math.PI / 2 - 0.15);
  });
});

describe("toFrameStepScale", () => {
  it("60fps 相当では従来と同じ 1 ステップになる", () => {
    expect(toFrameStepScale(1 / 60, 1)).toBeCloseTo(1);
  });

  it("timeScale を掛けた分だけ滑らかに縮む", () => {
    expect(toFrameStepScale(1 / 60, 0.62)).toBeCloseTo(0.62);
  });
});
