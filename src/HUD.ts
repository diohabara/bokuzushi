export class HUD {
  private scoreEl: HTMLElement;
  private levelEl: HTMLElement;
  private penetrationEl: HTMLElement;
  private livesEl: HTMLElement;
  private levelUpEl: HTMLElement;
  private prevScore = 0;

  constructor() {
    this.scoreEl = document.getElementById("hud-score")!;
    this.levelEl = document.getElementById("hud-level")!;
    this.penetrationEl = document.getElementById("hud-penetration")!;
    this.livesEl = document.getElementById("hud-lives")!;
    this.levelUpEl = document.getElementById("level-up")!;
  }

  update(score: number, level: number, penetration: number, lives: number) {
    this.scoreEl.textContent = String(score);
    this.levelEl.textContent = String(level);
    this.penetrationEl.textContent =
      "\u2605".repeat(penetration) +
      "\u2606".repeat(Math.max(0, 10 - penetration));
    this.livesEl.textContent = "\u2764".repeat(lives);

    if (score !== this.prevScore) {
      this.scoreEl.style.transform = "scale(1.3)";
      setTimeout(() => { this.scoreEl.style.transform = "scale(1)"; }, 150);
    }
    this.prevScore = score;
  }

  showLevelUp(level: number) {
    this.levelUpEl.textContent = `LEVEL ${level}!`;
    this.levelUpEl.classList.remove("show");
    void this.levelUpEl.offsetWidth; // force reflow
    this.levelUpEl.classList.add("show");
  }

  showScorePopup(x: number, y: number, points: number) {
    const el = document.createElement("div");
    el.className = "score-popup";
    el.textContent = `+${points}`;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 800);
  }
}
