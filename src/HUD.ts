import { FEVER_MAX } from "./gameRules";
import {
  BALL_FINAL_TIER,
  COMBO_LABEL_SUFFIX,
  FEVER_STATE_COPY,
  TIER_CONTENT,
} from "./gameContent";
import { WAVES_PER_WORLD } from "./constants";

export class HUD {
  private scoreEl: HTMLElement;
  private levelEl: HTMLElement;
  private colorTierEl: HTMLElement;
  private worldWaveEl: HTMLElement;
  private levelUpEl: HTMLElement;
  private comboEl: HTMLElement;
  private bigTextEl: HTMLElement;
  private ballColorEl: HTMLElement;
  private feverFillEl: HTMLElement;
  private feverStateEl: HTMLElement;
  private mobileFeverFillEl: HTMLElement | null;
  private mobileFeverStateEl: HTMLElement | null;
  private mobileWaveEl: HTMLElement | null;
  private prevScore = 0;

  constructor() {
    this.scoreEl = document.getElementById("hud-score")!;
    this.levelEl = document.getElementById("hud-level")!;
    this.colorTierEl = document.getElementById("hud-penetration")!;
    this.worldWaveEl = document.getElementById("hud-world")!;
    this.levelUpEl = document.getElementById("level-up")!;
    this.comboEl = document.getElementById("combo")!;
    this.bigTextEl = document.getElementById("big-text")!;
    this.ballColorEl = document.getElementById("hud-ball-color")!;
    this.feverFillEl = document.getElementById("hud-fever-fill")!;
    this.feverStateEl = document.getElementById("hud-fever-state")!;
    this.mobileFeverFillEl = document.getElementById("mobile-fever-fill");
    this.mobileFeverStateEl = document.getElementById("mobile-fever-state");
    this.mobileWaveEl = document.getElementById("mobile-wave");
  }

  update(
    score: number,
    level: number,
    colorTier: number,
    world: number,
    wave: number,
    worldName: string
  ) {
    this.scoreEl.textContent = String(score);
    this.levelEl.textContent = String(level);
    const tierNames = [...TIER_CONTENT.map((tier) => tier.label), BALL_FINAL_TIER.label];
    this.colorTierEl.textContent = "\u2605".repeat(colorTier + 1) + " " + (tierNames[colorTier] ?? "");
    this.worldWaveEl.textContent = `${worldName} ${wave}/${WAVES_PER_WORLD}`;
    if (this.mobileWaveEl) {
      this.mobileWaveEl.textContent = `${worldName} ${wave}/${WAVES_PER_WORLD}`;
    }

    if (score !== this.prevScore) {
      this.scoreEl.style.transform = "scale(1.5)";
      setTimeout(() => {
        this.scoreEl.style.transform = "scale(1)";
      }, 200);
    }
    this.prevScore = score;
  }

  updateBallColor(colorHex: string) {
    this.ballColorEl.style.background = colorHex;
    this.ballColorEl.style.boxShadow = `0 0 12px ${colorHex}, 0 0 24px ${colorHex}`;
  }

  updateFever(gauge: number, active: boolean) {
    const ratio = Math.max(0, Math.min(1, gauge / FEVER_MAX));
    this.feverFillEl.style.transform = `scaleX(${ratio})`;
    this.feverStateEl.textContent = active
      ? FEVER_STATE_COPY.active
      : ratio >= 0.75
        ? FEVER_STATE_COPY.hot
        : FEVER_STATE_COPY.charge;
    this.feverStateEl.dataset.active = active ? "true" : "false";
    if (this.mobileFeverFillEl && this.mobileFeverStateEl) {
      this.mobileFeverFillEl.style.transform = `scaleX(${ratio})`;
      this.mobileFeverStateEl.textContent = this.feverStateEl.textContent;
      this.mobileFeverStateEl.dataset.active = this.feverStateEl.dataset.active ?? "false";
    }
  }

  showLevelUp(level: number) {
    this.levelUpEl.textContent = `Lv.${level} 覚醒!!`;
    this.levelUpEl.classList.remove("show");
    void this.levelUpEl.offsetWidth;
    this.levelUpEl.classList.add("show");
  }

  showCombo(count: number) {
    this.comboEl.textContent = `${count}${COMBO_LABEL_SUFFIX}`;
    const minSize = 28;
    const maxSize = 96;
    const growth = Math.min(count - 1, 12) * 4;
    const maxFontSize = Math.min(maxSize, minSize + growth);
    const viewportSize = Math.min(14, 6 + Math.min(count - 1, 12) * 0.6);
    this.comboEl.style.setProperty("--combo-font-size", `clamp(${minSize}px, ${viewportSize}vw, ${maxFontSize}px)`);
    this.comboEl.classList.remove("show");
    void this.comboEl.offsetWidth;
    this.comboEl.classList.add("show");
  }

  showBigText(text: string, cssClass: string) {
    this.bigTextEl.textContent = text;
    this.bigTextEl.className = cssClass;
    void this.bigTextEl.offsetWidth;
    this.bigTextEl.classList.add("show");
  }

  showScorePopup(x: number, y: number, points: number) {
    const el = document.createElement("div");
    el.className = "score-popup";
    el.textContent = `+${points}`;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }
}
