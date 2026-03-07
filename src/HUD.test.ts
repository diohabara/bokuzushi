import { beforeEach, describe, expect, it } from "vitest";
import { HUD } from "./HUD";

describe("HUD", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="hud-score"></div>
      <div id="hud-level"></div>
      <div id="hud-penetration"></div>
      <div id="hud-world"></div>
      <div id="level-up"></div>
      <div id="combo"></div>
      <div id="big-text"></div>
      <div id="hud-ball-color"></div>
      <div id="hud-fever-fill"></div>
      <div id="hud-fever-state"></div>
      <div id="mobile-fever-fill"></div>
      <div id="mobile-fever-state"></div>
      <div id="mobile-wave"></div>
    `;
  });

  it("Fever HUD を更新する", () => {
    const hud = new HUD();
    hud.updateFever(50, false);

    const fill = document.getElementById("hud-fever-fill");
    const state = document.getElementById("hud-fever-state");

    expect(fill?.style.transform).toBe("scaleX(0.5)");
    expect(state?.textContent).toBe("CHARGE");
  });

  it("Fever 中は状態ラベルを切り替える", () => {
    const hud = new HUD();
    hud.updateFever(100, true);

    const state = document.getElementById("hud-fever-state");
    expect(state?.textContent).toBe("FEVER");
    expect(state?.dataset.active).toBe("true");
  });

  it("モバイルドックにも FEVER と wave を反映する", () => {
    const hud = new HUD();
    hud.update(1200, 3, 2, 1, 2, "桜花");
    hud.updateFever(80, false);

    expect(document.getElementById("mobile-wave")?.textContent).toBe("桜花 2/3");
    expect(document.getElementById("mobile-fever-fill")?.style.transform).toBe("scaleX(0.8)");
  });
});
