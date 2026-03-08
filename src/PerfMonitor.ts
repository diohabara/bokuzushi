const HISTORY_SIZE = 120;
const UPDATE_INTERVAL_MS = 200;

type PhaseKey =
  | "timers"
  | "physics"
  | "collision"
  | "starField"
  | "trails"
  | "hud"
  | "background"
  | "particles"
  | "render";

interface PhaseSample {
  timers: number;
  physics: number;
  collision: number;
  starField: number;
  trails: number;
  hud: number;
  background: number;
  particles: number;
  render: number;
}

const PHASE_LABELS: Record<PhaseKey, string> = {
  timers: "Timer",
  physics: "Physics",
  collision: "Collision",
  starField: "Blocks",
  trails: "Trails",
  hud: "HUD",
  background: "BG",
  particles: "Particles",
  render: "GL Render",
};

const PHASE_COLORS: Record<PhaseKey, string> = {
  timers: "#888",
  physics: "#4af",
  collision: "#f44",
  starField: "#fa4",
  trails: "#4fa",
  hud: "#a4f",
  background: "#4ff",
  particles: "#ff4",
  render: "#f4a",
};

const PHASE_KEYS: PhaseKey[] = [
  "timers",
  "physics",
  "collision",
  "starField",
  "trails",
  "hud",
  "background",
  "particles",
  "render",
];

export class PerfMonitor {
  private el: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private frameTimes: number[] = [];
  private phaseSamples: PhaseSample[] = [];
  private currentFrame: Partial<PhaseSample> = {};
  private frameStart = 0;
  private phaseStart = 0;
  private lastUIUpdate = 0;
  private statsEl: HTMLElement;
  private phaseEls: HTMLElement;
  private extrasEl: HTMLElement;
  private particleCountFn: (() => number) | null = null;
  private sceneChildCountFn: (() => number) | null = null;
  private visible = false;

  constructor() {
    this.el = document.createElement("div");
    this.el.id = "perf-monitor";
    this.el.style.cssText = `
      position: fixed; top: 4px; left: 4px; z-index: 9999;
      background: rgba(0,0,0,0.82); color: #eee; font: 11px/1.4 monospace;
      padding: 6px 8px; border-radius: 6px; pointer-events: none;
      display: none; min-width: 220px;
    `;

    this.canvas = document.createElement("canvas");
    this.canvas.width = 220;
    this.canvas.height = 60;
    this.canvas.style.cssText = "display:block; margin-bottom:4px;";
    this.ctx = this.canvas.getContext("2d")!;
    this.el.appendChild(this.canvas);

    this.statsEl = document.createElement("div");
    this.el.appendChild(this.statsEl);
    this.phaseEls = document.createElement("div");
    this.el.appendChild(this.phaseEls);
    this.extrasEl = document.createElement("div");
    this.el.appendChild(this.extrasEl);

    document.body.appendChild(this.el);

    document.addEventListener("keydown", (e) => {
      if (e.key === "F2") {
        e.preventDefault();
        this.toggle();
      }
    });
  }

  setParticleCountFn(fn: () => number) {
    this.particleCountFn = fn;
  }

  setSceneChildCountFn(fn: () => number) {
    this.sceneChildCountFn = fn;
  }

  toggle() {
    this.visible = !this.visible;
    this.el.style.display = this.visible ? "block" : "none";
  }

  beginFrame() {
    if (!this.visible) return;
    this.frameStart = performance.now();
    this.currentFrame = {};
  }

  beginPhase(_phase: PhaseKey) {
    if (!this.visible) return;
    this.phaseStart = performance.now();
  }

  endPhase(phase: PhaseKey) {
    if (!this.visible) return;
    this.currentFrame[phase] = (this.currentFrame[phase] ?? 0) + (performance.now() - this.phaseStart);
  }

  endFrame() {
    if (!this.visible) return;
    const total = performance.now() - this.frameStart;
    this.frameTimes.push(total);
    if (this.frameTimes.length > HISTORY_SIZE) this.frameTimes.shift();

    const sample: PhaseSample = {
      timers: 0, physics: 0, collision: 0, starField: 0,
      trails: 0, hud: 0, background: 0, particles: 0, render: 0,
    };
    for (const key of PHASE_KEYS) {
      sample[key] = this.currentFrame[key] ?? 0;
    }
    this.phaseSamples.push(sample);
    if (this.phaseSamples.length > HISTORY_SIZE) this.phaseSamples.shift();

    const now = performance.now();
    if (now - this.lastUIUpdate > UPDATE_INTERVAL_MS) {
      this.lastUIUpdate = now;
      this.updateUI();
    }
  }

  private updateUI() {
    const n = this.frameTimes.length;
    if (n === 0) return;

    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / n;
    const max = Math.max(...this.frameTimes);
    const fps = n > 1 ? 1000 / avg : 0;

    // Draw stacked bar chart
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);

    // 16.67ms line (60fps target)
    ctx.strokeStyle = "rgba(0,255,0,0.3)";
    ctx.setLineDash([2, 2]);
    const y60 = h - (16.67 / 33.33) * h;
    ctx.beginPath(); ctx.moveTo(0, y60); ctx.lineTo(w, y60); ctx.stroke();
    ctx.setLineDash([]);

    const barW = Math.max(1, w / HISTORY_SIZE);
    const samples = this.phaseSamples;
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      let yOff = h;
      for (const key of PHASE_KEYS) {
        const ms = s[key];
        const barH = (ms / 33.33) * h;
        ctx.fillStyle = PHASE_COLORS[key];
        ctx.fillRect(i * barW, yOff - barH, barW, barH);
        yOff -= barH;
      }
    }

    // Text stats (using textContent for safety)
    this.statsEl.textContent = `FPS: ${fps.toFixed(0)} | avg: ${avg.toFixed(1)}ms | max: ${max.toFixed(1)}ms`;
    this.statsEl.style.fontWeight = "bold";

    const recent = this.phaseSamples.slice(-30);
    // Rebuild phase elements
    this.phaseEls.textContent = "";
    for (const key of PHASE_KEYS) {
      const phaseAvg = recent.reduce((sum, s) => sum + s[key], 0) / recent.length;
      if (phaseAvg > 0.05) {
        const line = document.createElement("div");
        line.style.color = PHASE_COLORS[key];
        line.textContent = `${PHASE_LABELS[key]}: ${phaseAvg.toFixed(2)}ms`;
        this.phaseEls.appendChild(line);
      }
    }

    const extras: string[] = [];
    if (this.particleCountFn) extras.push(`Particles: ${this.particleCountFn()}`);
    if (this.sceneChildCountFn) extras.push(`Scene: ${this.sceneChildCountFn()}`);
    this.extrasEl.textContent = extras.join(" | ");
  }
}
