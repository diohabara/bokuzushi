export class HUD {
  private scoreEl: HTMLElement;
  private levelEl: HTMLElement;
  private penetrationEl: HTMLElement;
  private livesEl: HTMLElement;

  constructor() {
    this.scoreEl = document.getElementById("hud-score")!;
    this.levelEl = document.getElementById("hud-level")!;
    this.penetrationEl = document.getElementById("hud-penetration")!;
    this.livesEl = document.getElementById("hud-lives")!;
  }

  update(score: number, level: number, penetration: number, lives: number) {
    this.scoreEl.textContent = String(score);
    this.levelEl.textContent = String(level);
    this.penetrationEl.textContent =
      "\u2605".repeat(penetration) + "\u2606".repeat(Math.max(0, 10 - penetration));
    this.livesEl.textContent = "\u2764".repeat(lives);
  }
}
