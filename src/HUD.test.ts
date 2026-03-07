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
    expect(state?.textContent).toBe("気配");
  });

  it("Fever 中は状態ラベルを切り替える", () => {
    const hud = new HUD();
    hud.updateFever(100, true);

    const state = document.getElementById("hud-fever-state");
    expect(state?.textContent).toBe("アガり");
    expect(state?.dataset.active).toBe("true");
  });

  it("最小コンボでも連ツキ表示を出す", () => {
    const hud = new HUD();
    hud.showCombo(1);

    const combo = document.getElementById("combo");
    expect(combo?.textContent).toBe("1連 ざわり!!");
    expect(combo?.style.getPropertyValue("--combo-font-size")).toBe("clamp(28px, 6vw, 28px)");
  });

  it("コンボ数に応じて文言とサイズを変える", () => {
    const hud = new HUD();
    hud.showCombo(1);
    const small = document.getElementById("combo")?.style.getPropertyValue("--combo-font-size");

    hud.showCombo(7);
    const large = document.getElementById("combo")?.style.getPropertyValue("--combo-font-size");

    expect(large).not.toBe(small);
    expect(document.getElementById("combo")?.textContent).toBe("7連 当たりの癖!!");
    expect(large).toBe("clamp(28px, 9.6vw, 52px)");
  });

  it("高コンボ帯では専用の煽り文言に切り替える", () => {
    const hud = new HUD();
    hud.showCombo(16);

    expect(document.getElementById("combo")?.textContent).toBe("16連 銀河ごと前のめり!!!");
  });

  it("モバイルドックにも FEVER と wave を反映する", () => {
    const hud = new HUD();
    hud.update(1200, 3, 2, 1, 2, "桜花");
    hud.updateFever(80, false);

    expect(document.getElementById("mobile-wave")?.textContent).toBe("桜花 2巡目");
    expect(document.getElementById("mobile-fever-fill")?.style.transform).toBe("scaleX(0.8)");
  });
});
