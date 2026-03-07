export class HUD {
  private scoreEl: HTMLElement;
  private levelEl: HTMLElement;
  private colorTierEl: HTMLElement;
  private worldWaveEl: HTMLElement;
  private levelUpEl: HTMLElement;
  private comboEl: HTMLElement;
  private bigTextEl: HTMLElement;
  private ballColorEl: HTMLElement;
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
    const tierNames = ["緑", "青", "黄", "橙", "赤", "藍", "紫", "黒"];
    this.colorTierEl.textContent =
      "\u2605".repeat(colorTier + 1) + " " + (tierNames[colorTier] ?? "");
    this.worldWaveEl.textContent = `${worldName} \u2015 ${wave}`;

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

  showLevelUp(level: number) {
    this.levelUpEl.textContent = `Lv.${level} 覚醒!!`;
    this.levelUpEl.classList.remove("show");
    void this.levelUpEl.offsetWidth;
    this.levelUpEl.classList.add("show");
  }

  showCombo(count: number) {
    this.comboEl.textContent = `${count} COMBO!!`;
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
