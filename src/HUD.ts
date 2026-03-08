import { FEVER_MAX } from "./gameRules";
import {
  BALL_FINAL_TIER,
  FEVER_STATE_COPY,
  formatLayerLabel,
  getComboLabelCopy,
  TIER_CONTENT,
} from "./gameContent";

type StarPraiseWordPlacement = {
  leftPercent: number;
  topPercent: number;
  rotationDeg: number;
  fontScale: number;
  opacity: number;
  align: "left" | "right";
  delayMs: number;
  motionIndex: number;
  auraIndex: number;
  depthPx: number;
  tiltXDeg: number;
  tiltYDeg: number;
  driftXPx: number;
  driftYPx: number;
  sparkScale: number;
};

export function createStarPraiseWordPlacements(
  count: number,
  randomSource: () => number = Math.random
): StarPraiseWordPlacement[] {
  const rows = 8;
  const cols = 10;
  const placements: StarPraiseWordPlacement[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const inCenterRows = row >= 2 && row <= 5;
      const inCenterCols = col >= 3 && col <= 6;
      if (inCenterRows && inCenterCols) continue;

      const leftPercent = ((col + 0.5 + (randomSource() - 0.5) * 0.55) / cols) * 100;
      const topPercent = ((row + 0.5 + (randomSource() - 0.5) * 0.6) / rows) * 100;
      placements.push({
        leftPercent: Math.max(4, Math.min(96, leftPercent)),
        topPercent: Math.max(5, Math.min(95, topPercent)),
        rotationDeg: -16 + randomSource() * 32,
        fontScale: 0.82 + randomSource() * 0.5,
        opacity: 0.55 + randomSource() * 0.35,
        align: col >= cols / 2 ? "right" : "left",
        delayMs: Math.round(randomSource() * 180),
        motionIndex: 0,
        auraIndex: 0,
        depthPx: -120 + randomSource() * 320,
        tiltXDeg: -32 + randomSource() * 64,
        tiltYDeg: -26 + randomSource() * 52,
        driftXPx: -24 + randomSource() * 48,
        driftYPx: -20 + randomSource() * 40,
        sparkScale: 0.8 + randomSource() * 0.9,
      });
    }
  }

  for (let index = placements.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(randomSource() * (index + 1));
    [placements[index], placements[swapIndex]] = [placements[swapIndex], placements[index]];
  }

  return placements.slice(0, count).map((placement, index) => ({
    ...placement,
    motionIndex: index % 8,
    auraIndex: Math.floor(index / 8) % 8,
  }));
}

export class HUD {
  private scoreEl: HTMLElement;
  private levelEl: HTMLElement;
  private colorTierEl: HTMLElement;
  private colorRowEl: HTMLElement;
  private worldWaveEl: HTMLElement;
  private levelUpEl: HTMLElement;
  private comboEl: HTMLElement;
  private bigTextEl: HTMLElement;
  private starPraiseEl: HTMLElement;
  private ballColorEl: HTMLElement;
  private feverFillEl: HTMLElement;
  private feverStateEl: HTMLElement;
  private mobileFeverFillEl: HTMLElement | null;
  private mobileFeverStateEl: HTMLElement | null;
  private mobileWaveEl: HTMLElement | null;
  private prevScore = -1;
  private prevLevel = -1;
  private prevColorTier = -1;
  private prevWorldWave = "";
  private prevBallColor = "";
  private prevFeverRatio = -1;
  private prevFeverActive = false;

  constructor() {
    this.scoreEl = document.getElementById("hud-score")!;
    this.levelEl = document.getElementById("hud-level")!;
    this.colorTierEl = document.getElementById("hud-penetration")!;
    this.colorRowEl = this.colorTierEl.parentElement as HTMLElement;
    this.worldWaveEl = document.getElementById("hud-world")!;
    this.levelUpEl = document.getElementById("level-up")!;
    this.comboEl = document.getElementById("combo")!;
    this.bigTextEl = document.getElementById("big-text")!;
    this.starPraiseEl = document.getElementById("star-praise")!;
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
    if (score !== this.prevScore) {
      this.scoreEl.textContent = String(score);
      this.scoreEl.style.transform = "scale(1.5)";
      setTimeout(() => {
        this.scoreEl.style.transform = "scale(1)";
      }, 200);
      this.prevScore = score;
    }

    if (level !== this.prevLevel) {
      this.levelEl.textContent = String(level);
      this.prevLevel = level;
    }

    if (colorTier !== this.prevColorTier) {
      const tierNames = [...TIER_CONTENT.map((tier) => tier.label), BALL_FINAL_TIER.label];
      this.colorTierEl.textContent = "\u2605".repeat(colorTier + 1) + " " + (tierNames[colorTier] ?? "");
      this.prevColorTier = colorTier;
    }

    const worldWaveText = `${worldName} ${formatLayerLabel(wave)}`;
    if (worldWaveText !== this.prevWorldWave) {
      this.worldWaveEl.textContent = worldWaveText;
      if (this.mobileWaveEl) {
        this.mobileWaveEl.textContent = worldWaveText;
      }
      this.prevWorldWave = worldWaveText;
    }
  }

  updateBallColor(colorHex: string) {
    if (colorHex === this.prevBallColor) return;
    this.prevBallColor = colorHex;
    this.ballColorEl.style.background = colorHex;
    this.ballColorEl.style.boxShadow = `0 0 12px ${colorHex}, 0 0 24px ${colorHex}`;
  }

  updateFever(gauge: number, active: boolean) {
    const ratio = Math.max(0, Math.min(1, gauge / FEVER_MAX));
    const quantizedRatio = Math.round(ratio * 200) / 200;
    if (quantizedRatio === this.prevFeverRatio && active === this.prevFeverActive) return;
    this.prevFeverRatio = quantizedRatio;
    this.prevFeverActive = active;
    this.feverFillEl.style.transform = `scaleX(${ratio})`;
    const stateText = active
      ? FEVER_STATE_COPY.active
      : ratio >= 0.75
        ? FEVER_STATE_COPY.hot
        : FEVER_STATE_COPY.charge;
    this.feverStateEl.textContent = stateText;
    const activeStr = active ? "true" : "false";
    this.feverStateEl.dataset.active = activeStr;
    if (this.mobileFeverFillEl && this.mobileFeverStateEl) {
      this.mobileFeverFillEl.style.transform = `scaleX(${ratio})`;
      this.mobileFeverStateEl.textContent = stateText;
      this.mobileFeverStateEl.dataset.active = activeStr;
    }
  }

  showLevelUp(level: number) {
    this.levelEl.textContent = String(level);
    for (const el of [this.levelEl, this.ballColorEl, this.colorTierEl, this.colorRowEl]) {
      el.classList.remove("level-up");
      void el.offsetWidth;
      el.classList.add("level-up");
    }
  }

  showCombo(count: number) {
    this.comboEl.textContent = getComboLabelCopy(count);
    const minSize = 28;
    const growth = Math.max(count - 1, 0) * 6;
    const maxFontSize = minSize + growth;
    const viewportSize = 6 + Math.max(count - 1, 0) * 0.7;
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

  showStarPraise(headline: string, praiseWords: readonly string[]) {
    this.starPraiseEl.replaceChildren();

    const shell = document.createElement("div");
    shell.className = "star-praise-shell";

    const headlineEl = document.createElement("div");
    headlineEl.className = "star-praise-headline";
    headlineEl.textContent = headline;
    shell.appendChild(headlineEl);

    const placements = createStarPraiseWordPlacements(praiseWords.length);
    for (let index = 0; index < placements.length; index++) {
      const placement = placements[index];
      const wordEl = document.createElement("div");
      wordEl.className = `star-praise-word motion-${placement.motionIndex + 1} aura-${placement.auraIndex + 1}`;
      wordEl.textContent = praiseWords[index % praiseWords.length] ?? "";
      wordEl.dataset.motion = String(placement.motionIndex + 1);
      wordEl.dataset.aura = String(placement.auraIndex + 1);
      wordEl.style.left = `${placement.leftPercent}%`;
      wordEl.style.top = `${placement.topPercent}%`;
      wordEl.style.setProperty("--word-rotate", `${placement.rotationDeg}deg`);
      wordEl.style.setProperty("--word-scale", `${placement.fontScale}`);
      wordEl.style.setProperty("--word-opacity", `${placement.opacity}`);
      wordEl.style.setProperty("--word-delay", `${placement.delayMs}ms`);
      wordEl.style.setProperty("--word-depth", `${placement.depthPx}px`);
      wordEl.style.setProperty("--word-tilt-x", `${placement.tiltXDeg}deg`);
      wordEl.style.setProperty("--word-tilt-y", `${placement.tiltYDeg}deg`);
      wordEl.style.setProperty("--word-drift-x", `${placement.driftXPx}px`);
      wordEl.style.setProperty("--word-drift-y", `${placement.driftYPx}px`);
      wordEl.style.setProperty("--word-spark-scale", `${placement.sparkScale}`);
      wordEl.style.textAlign = placement.align;
      shell.appendChild(wordEl);
    }

    this.starPraiseEl.appendChild(shell);
    this.starPraiseEl.classList.remove("show");
    void this.starPraiseEl.offsetWidth;
    this.starPraiseEl.classList.add("show");
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
