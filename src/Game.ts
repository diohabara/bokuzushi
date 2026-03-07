import * as THREE from "three";
import { Paddle } from "./Paddle";
import { Ball } from "./Ball";
import { StarField } from "./StarField";
import { HUD } from "./HUD";
import { Particles } from "./Particles";
import { WorldBackground } from "./WorldBackground";
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  WALL_THICKNESS,
  BALL_RADIUS,
  BALL_SPEED,
  BALL_SPEED_INCREMENT,
  BALL_MAX_SPEED,
  WAVES_PER_WORLD,
  WORLD_SPEED_BONUS,
  MAX_WORLDS,
  WORLD_THEMES,
  PADDLE_WIDTH,
  BLOCK_WIDTH,
  BLOCK_HEIGHT,
  BLOCK_COLORS,
  BALL_COLOR_BLACK,
  BALL_MAX_TIER,
  SHAKE_INTENSITY,
  SHAKE_DURATION,
  COMBO_ATSU,
  COMBO_GEKIATSU,
  COMBO_KAKUHEN,
  COMBO_OOATARI,
  COMBO_CHO_GEKIATSU,
  COMBO_FEVER,
} from "./constants";
import {
  applyBlockHit,
  applyBonusHits,
  chargeFever,
  createProgressionState,
  getBounceAxis,
  getComboCelebrationTier,
  getScoreMultiplier,
  mergeRanking,
  resolveBlockHit,
  tickTimers,
  type ProgressionResult,
  type ProgressionState,
} from "./gameRules";

type GameState = "start" | "playing" | "gameover" | "waveclear" | "worldclear";
type RankingEntry = { score: number; world: string; date: string };

export class Game {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private paddle: Paddle;
  private ball: Ball;
  private starField: StarField;
  private hud: HUD;
  private particles: Particles;
  private worldBg: WorldBackground;

  private state: GameState = "start";
  private score = 0;
  private world = 1;
  private wave = 1;
  private paddleBounces = 0;
  private blocksDestroyed = 0;
  private reachShown = false;
  private unlockedWorld = 1;
  private progression: ProgressionState = createProgressionState();

  private paused = false;
  private coarsePointer = false;

  private overlay: HTMLElement;
  private overlayTitle: HTMLElement;
  private overlayMessage: HTMLElement;
  private overlaySub: HTMLElement;
  private overlayActionBtn: HTMLButtonElement;
  private overlaySecondaryActionBtn: HTMLButtonElement;
  private flashEl: HTMLElement;
  private worldSelectEl: HTMLElement;
  private rainbowBorderEl: HTMLElement;
  private shockwaveEl: HTMLElement;
  private pauseBtn: HTMLButtonElement;
  private pauseOverlay: HTMLElement;
  private pauseResumeBtn: HTMLButtonElement;
  private pauseWorldSelectBtn: HTMLButtonElement;

  private worldButtons: HTMLButtonElement[] = [];
  private overlayActionHandler: (() => void) | null = null;
  private overlaySecondaryActionHandler: (() => void) | null = null;

  private lastTime = 0;
  private mouseX = 0;
  private keyboardDirection = 0;
  private shakeTimer = 0;
  private shakeIntensity = 0;
  private cameraBasePos = new THREE.Vector3(0, 0, 20);
  private viewCenterY = -0.2;

  private timeScale = 1;
  private slowMotionTimer = 0;
  private rainbowTimer = 0;
  private zoomTarget = 1;
  private zoomCurrent = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x050510);

    this.camera = new THREE.OrthographicCamera(-GAME_WIDTH / 2, GAME_WIDTH / 2, GAME_HEIGHT / 2, -GAME_HEIGHT / 2, 0.1, 100);
    this.camera.position.copy(this.cameraBasePos);

    this.scene = new THREE.Scene();
    this.scene.add(new THREE.AmbientLight(0x303050, 1.2));

    const dirLight = new THREE.DirectionalLight(0xeeeeff, 0.8);
    dirLight.position.set(5, 10, 15);
    this.scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x4466ff, 0.3);
    rimLight.position.set(-5, -5, 10);
    this.scene.add(rimLight);

    this.worldBg = new WorldBackground(this.scene);
    this.paddle = new Paddle();
    this.scene.add(this.paddle.mesh);

    this.ball = new Ball(this.scene);
    this.scene.add(this.ball.mesh);

    this.starField = new StarField(this.scene);
    this.hud = new HUD();
    this.particles = new Particles(this.scene);

    this.overlay = document.getElementById("overlay")!;
    this.overlayTitle = document.getElementById("overlay-title")!;
    this.overlayMessage = document.getElementById("overlay-message")!;
    this.overlaySub = document.getElementById("overlay-sub")!;
    this.overlayActionBtn = document.getElementById("overlay-action") as HTMLButtonElement;
    this.overlaySecondaryActionBtn = document.getElementById("overlay-secondary-action") as HTMLButtonElement;
    this.flashEl = document.getElementById("flash")!;
    this.worldSelectEl = document.getElementById("world-select")!;
    this.rainbowBorderEl = document.getElementById("rainbow-border")!;
    this.shockwaveEl = document.getElementById("shockwave")!;
    this.pauseBtn = document.getElementById("pause-btn") as HTMLButtonElement;
    this.pauseOverlay = document.getElementById("pause-overlay")!;
    this.pauseResumeBtn = document.getElementById("pause-resume-btn") as HTMLButtonElement;
    this.pauseWorldSelectBtn = document.getElementById("pause-world-select-btn") as HTMLButtonElement;

    this.coarsePointer = window.matchMedia("(pointer: coarse)").matches;

    this.unlockedWorld = parseInt(localStorage.getItem("bokuzushi_unlocked") ?? "1", 10);

    this.pauseBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      this.togglePause();
    });
    this.pauseResumeBtn.addEventListener("click", () => this.togglePause());
    this.pauseWorldSelectBtn.addEventListener("click", () => this.returnToWorldSelect());
    this.overlayActionBtn.addEventListener("click", () => this.handleOverlayAction());
    this.overlaySecondaryActionBtn.addEventListener("click", () => this.handleOverlaySecondaryAction());

    this.createWorldButtons();
    this.createWalls();
    this.setupInput();
    this.applyMobileLayout();
    this.resize();
    window.addEventListener("resize", () => this.resize());

    this.updateHUD();
  }

  private applyMobileLayout() {
    const lift = this.coarsePointer ? 2.45 : 0;
    this.paddle.setY(this.paddle.baseY + lift);
    this.ball.reset(this.paddle.x, this.paddle.y);
  }

  private createWorldButtons() {
    for (let i = 1; i <= MAX_WORLDS; i++) {
      const theme = WORLD_THEMES[i - 1];
      const btn = document.createElement("button");
      btn.className = "world-btn";
      btn.type = "button";
      btn.setAttribute("aria-label", `${theme.name} を開始`);
      btn.style.borderColor = theme.btnColor;
      btn.style.background = theme.btnBg;

      const emojiSpan = document.createElement("span");
      emojiSpan.className = "world-btn-emoji";
      emojiSpan.textContent = theme.emoji;
      btn.appendChild(emojiSpan);

      const nameSpan = document.createElement("span");
      nameSpan.className = "world-btn-name";
      nameSpan.textContent = theme.name;
      btn.appendChild(nameSpan);

      const subSpan = document.createElement("span");
      subSpan.className = "world-btn-sub";
      subSpan.textContent = theme.subtitle;
      btn.appendChild(subSpan);

      const stages = document.createElement("div");
      stages.className = "world-btn-stages";
      for (let stageIndex = 0; stageIndex < WAVES_PER_WORLD; stageIndex++) {
        const stage = document.createElement("span");
        stage.className = "world-btn-stage";
        stage.classList.add("filled");
        stages.appendChild(stage);
      }
      btn.appendChild(stages);

      btn.addEventListener("click", () => {
        if (i <= this.unlockedWorld) this.startNewGame(i);
      });

      this.worldSelectEl.appendChild(btn);
      this.worldButtons.push(btn);
    }

    this.updateWorldButtons();
  }

  private updateWorldButtons() {
    for (let i = 0; i < this.worldButtons.length; i++) {
      const btn = this.worldButtons[i];
      const unlocked = i + 1 <= this.unlockedWorld;
      btn.classList.toggle("locked", !unlocked);
      btn.style.opacity = unlocked ? "1" : "0.35";
      btn.disabled = !unlocked;
      btn.setAttribute("aria-disabled", unlocked ? "false" : "true");
    }
  }

  private createWalls() {
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a3a,
      emissive: 0x0a0a2a,
      emissiveIntensity: 0.5,
      metalness: 0.8,
      roughness: 0.3,
    });

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(WALL_THICKNESS, GAME_HEIGHT + WALL_THICKNESS, 1), wallMat);
    leftWall.position.set(-GAME_WIDTH / 2 - WALL_THICKNESS / 2, 0, 0);
    this.scene.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(WALL_THICKNESS, GAME_HEIGHT + WALL_THICKNESS, 1), wallMat);
    rightWall.position.set(GAME_WIDTH / 2 + WALL_THICKNESS / 2, 0, 0);
    this.scene.add(rightWall);

    const topWall = new THREE.Mesh(new THREE.BoxGeometry(GAME_WIDTH + WALL_THICKNESS * 2, WALL_THICKNESS, 1), wallMat);
    topWall.position.set(0, GAME_HEIGHT / 2 + WALL_THICKNESS / 2, 0);
    this.scene.add(topWall);

    const edgeMat = new THREE.MeshBasicMaterial({ color: 0x2244aa, transparent: true, opacity: 0.15 });
    const leftEdge = new THREE.Mesh(new THREE.PlaneGeometry(0.1, GAME_HEIGHT), edgeMat);
    leftEdge.position.set(-GAME_WIDTH / 2 + 0.05, 0, 0.1);
    this.scene.add(leftEdge);

    const rightEdge = new THREE.Mesh(new THREE.PlaneGeometry(0.1, GAME_HEIGHT), edgeMat);
    rightEdge.position.set(GAME_WIDTH / 2 - 0.05, 0, 0.1);
    this.scene.add(rightEdge);
  }

  private setupInput() {
    window.addEventListener("mousemove", (event) => {
      this.mouseX = this.screenToWorldX(event.clientX);
    });

    window.addEventListener("touchmove", (event) => {
      event.preventDefault();
      if (event.touches.length > 0) {
        this.mouseX = this.screenToWorldX(event.touches[0].clientX);
      }
    }, { passive: false });

    window.addEventListener("click", (event) => {
      if ((event.target as HTMLElement | null)?.closest("button")) return;
      this.handlePrimaryAction();
    });
    window.addEventListener("touchend", (event) => {
      if ((event.target as HTMLElement | null)?.closest("button")) return;
      this.handlePrimaryAction();
    });
    window.addEventListener("keydown", (event) => this.handleKeyDown(event));
    window.addEventListener("keyup", this.handleKeyUp);
  }

  private handleKeyDown(event: KeyboardEvent) {
    if (!this.coarsePointer && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      event.preventDefault();
      this.keyboardDirection = event.key === "ArrowLeft" ? -1 : 1;
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      this.togglePause();
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      this.handlePrimaryAction();
    }
  }

  private handleKeyUp = (event: KeyboardEvent) => {
    if (!this.coarsePointer && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      event.preventDefault();
      if ((event.key === "ArrowLeft" && this.keyboardDirection < 0) || (event.key === "ArrowRight" && this.keyboardDirection > 0)) {
        this.keyboardDirection = 0;
      }
    }
  };

  private handlePrimaryAction() {
    if (!this.overlay.classList.contains("hidden")) {
      this.handleOverlayAction();
      return;
    }

    if (this.state === "playing" && !this.ball.active && !this.paused) {
      this.ball.launch();
    }
  }

  private handleOverlayAction() {
    this.overlayActionHandler?.();
  }

  private handleOverlaySecondaryAction() {
    this.overlaySecondaryActionHandler?.();
  }

  private setOverlayActions(
    primaryLabel: string | null,
    primaryHandler: (() => void) | null,
    secondaryLabel: string | null,
    secondaryHandler: (() => void) | null
  ) {
    this.overlayActionHandler = primaryHandler;
    this.overlaySecondaryActionHandler = secondaryHandler;

    if (!primaryLabel || !primaryHandler) {
      this.overlayActionBtn.classList.add("hidden");
    } else {
      this.overlayActionBtn.textContent = primaryLabel;
      this.overlayActionBtn.classList.remove("hidden");
    }

    if (!secondaryLabel || !secondaryHandler) {
      this.overlaySecondaryActionBtn.classList.add("hidden");
    } else {
      this.overlaySecondaryActionBtn.textContent = secondaryLabel;
      this.overlaySecondaryActionBtn.classList.remove("hidden");
    }
  }

  private screenToWorldX(screenX: number): number {
    const ratio = screenX / window.innerWidth;
    const bounds = this.getViewBounds();
    return bounds.left + (bounds.right - bounds.left) * ratio;
  }

  private getViewBounds() {
    const width = (this.camera.right - this.camera.left) / this.camera.zoom;
    const height = (this.camera.top - this.camera.bottom) / this.camera.zoom;
    const centerX = (this.camera.left + this.camera.right) / 2;
    const centerY = (this.camera.top + this.camera.bottom) / 2;
    return {
      left: centerX - width / 2,
      right: centerX + width / 2,
      top: centerY + height / 2,
      bottom: centerY - height / 2,
    };
  }

  private resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.setSize(width, height);

    const aspect = width / height;
    const baseAspect = GAME_WIDTH / GAME_HEIGHT;
    const fitWidth = aspect <= baseAspect;
    const safeBottom = this.coarsePointer ? 4.6 : 2.2;
    const safeTop = 0.8;

    let viewWidth: number;
    let viewHeight: number;

    if (fitWidth) {
      viewWidth = GAME_WIDTH + 1.6;
      viewHeight = viewWidth / aspect;
    } else {
      viewHeight = GAME_HEIGHT + safeBottom + safeTop;
      viewWidth = viewHeight * aspect;
    }

    this.viewCenterY = this.coarsePointer ? -1.1 : -0.6;
    this.camera.left = -viewWidth / 2;
    this.camera.right = viewWidth / 2;
    this.camera.top = viewHeight / 2 + this.viewCenterY;
    this.camera.bottom = -viewHeight / 2 + this.viewCenterY;
    this.camera.updateProjectionMatrix();
  }

  private togglePause() {
    if (this.state !== "playing") return;

    this.paused = !this.paused;
    this.pauseOverlay.classList.toggle("show", this.paused);
    this.pauseOverlay.setAttribute("aria-hidden", this.paused ? "false" : "true");

    if (!this.paused) {
      this.lastTime = performance.now();
    }
  }

  private returnToWorldSelect() {
    this.paused = false;
    this.pauseOverlay.classList.remove("show");
    this.pauseOverlay.setAttribute("aria-hidden", "true");
    this.showStartScreen();
  }

  private showStartScreen() {
    this.state = "start";
    this.pauseBtn.classList.add("hidden");
    this.pauseOverlay.classList.remove("show");
    this.pauseOverlay.setAttribute("aria-hidden", "true");
    this.worldSelectEl.classList.add("show");
    this.updateWorldButtons();
    this.showOverlay("星砕き", "ステージを選べ", "BOKUZUSHI", null, null);
    this.showRanking();
  }

  private showOverlay(
    title: string,
    message: string,
    sub: string,
    primaryLabel: string | null,
    primaryHandler: (() => void) | null,
    secondaryLabel: string | null = null,
    secondaryHandler: (() => void) | null = null
  ) {
    const ranking = document.getElementById("ranking");
    if (ranking) ranking.style.display = primaryHandler || secondaryHandler ? "none" : "block";
    this.pauseBtn.classList.toggle("hidden", this.state !== "playing");
    if (primaryHandler || secondaryHandler) {
      this.worldSelectEl.classList.remove("show");
    }
    this.overlayTitle.textContent = title;
    this.overlayMessage.textContent = message;
    this.overlaySub.textContent = sub;
    this.setOverlayActions(primaryLabel, primaryHandler, secondaryLabel, secondaryHandler);
    this.overlay.classList.remove("hidden");
  }

  private hideOverlay() {
    this.overlay.classList.add("hidden");
    this.setOverlayActions(null, null, null, null);
  }

  private showRanking() {
    let el = document.getElementById("ranking");
    if (!el) {
      el = document.createElement("div");
      el.id = "ranking";
      this.overlay.appendChild(el);
    }
    el.style.display = "block";
    el.textContent = "";

    const ranking = this.getRanking();
    if (ranking.length === 0) return;

    const title = document.createElement("div");
    title.className = "ranking-title";
    title.textContent = "RANKING";
    el.appendChild(title);

    ranking.forEach((entry, index) => {
      const row = document.createElement("div");
      row.className = "ranking-row";

      const rank = document.createElement("span");
      rank.className = "ranking-rank";
      rank.textContent = `${index + 1}.`;

      const score = document.createElement("span");
      score.className = "ranking-score";
      score.textContent = String(entry.score);

      const world = document.createElement("span");
      world.className = "ranking-world";
      world.textContent = entry.world;

      row.appendChild(rank);
      row.appendChild(score);
      row.appendChild(world);
      el!.appendChild(row);
    });
  }

  private resetRoundMomentum() {
    this.progression.combo = 0;
    this.progression.comboTimer = 0;
    this.progression.feverGauge = 0;
    this.progression.feverActive = false;
    this.progression.feverTimer = 0;
    this.timeScale = 1;
    this.slowMotionTimer = 0;
  }

  private getBaseSpeed(): number {
    return Math.min(BALL_SPEED + (this.world - 1) * WORLD_SPEED_BONUS, BALL_MAX_SPEED);
  }

  private getWorldName(): string {
    return WORLD_THEMES[(this.world - 1) % WORLD_THEMES.length].name;
  }

  private colorToHex(colorNum: number): string {
    return `#${colorNum.toString(16).padStart(6, "0")}`;
  }

  private getBallColorHex(): string {
    if (this.progression.ballColorIndex >= BLOCK_COLORS.length) {
      return this.colorToHex(BALL_COLOR_BLACK);
    }
    return this.colorToHex(BLOCK_COLORS[this.progression.ballColorIndex]);
  }

  private syncBallTier() {
    this.ball.colorIndex = this.progression.ballColorIndex;
    this.ball.applyColor();
    this.ball.updateGlow();
    this.hud.updateBallColor(this.getBallColorHex());
  }

  private updateHUD() {
    this.hud.update(
      this.score,
      this.progression.level,
      this.progression.ballColorIndex,
      this.world,
      this.wave,
      this.getWorldName()
    );
    this.hud.updateBallColor(this.getBallColorHex());
    this.hud.updateFever(this.progression.feverGauge, this.progression.feverActive);
  }

  private startNewGame(startWorld: number) {
    this.score = 0;
    this.world = startWorld;
    this.wave = 1;
    this.paddleBounces = 0;
    this.blocksDestroyed = 0;
    this.reachShown = false;
    this.progression = createProgressionState();
    this.resetRoundMomentum();
    this.syncBallTier();
    this.ball.speed = this.getBaseSpeed();
    this.starField.generate(0, this.world - 1);
    this.particles.setWorld(this.world - 1);
    this.worldBg.generate(this.world - 1);
    this.ball.reset(this.paddle.x, this.paddle.y);
    this.mouseX = this.paddle.x;
    this.state = "playing";
    this.paused = false;
    this.pauseBtn.classList.remove("hidden");
    this.worldSelectEl.classList.remove("show");
    this.hideOverlay();
    this.updateHUD();
    this.pauseBtn.classList.remove("hidden");
  }

  private nextWave() {
    this.wave += 1;
    this.blocksDestroyed = 0;
    this.reachShown = false;
    this.resetRoundMomentum();
    this.ball.speed = Math.min(this.ball.speed + BALL_SPEED_INCREMENT, BALL_MAX_SPEED);
    this.starField.generate(this.wave - 1, this.world - 1);
    this.ball.reset(this.paddle.x, this.paddle.y);
    this.mouseX = this.paddle.x;
    this.state = "playing";
    this.hideOverlay();
    this.pauseBtn.classList.remove("hidden");
    this.updateHUD();
  }

  private nextWorld() {
    if (this.world >= MAX_WORLDS) {
      this.showStartScreen();
      return;
    }

    this.world += 1;
    this.wave = 1;
    this.blocksDestroyed = 0;
    this.reachShown = false;
    this.progression = createProgressionState();
    this.resetRoundMomentum();
    this.syncBallTier();
    this.ball.speed = this.getBaseSpeed();
    this.starField.generate(0, this.world - 1);
    this.particles.setWorld(this.world - 1);
    this.worldBg.generate(this.world - 1);
    this.ball.reset(this.paddle.x, this.paddle.y);
    this.mouseX = this.paddle.x;
    this.state = "playing";
    this.hideOverlay();
    this.pauseBtn.classList.remove("hidden");
    this.updateHUD();
  }

  private shake(intensity = SHAKE_INTENSITY, duration = SHAKE_DURATION) {
    this.shakeTimer = Math.max(this.shakeTimer, duration);
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  private flashScreen(color: string, duration: number, intensity = 0.35) {
    this.flashEl.style.background = color;
    this.flashEl.style.opacity = String(intensity);
    this.flashEl.style.transition = "none";
    void this.flashEl.offsetWidth;
    this.flashEl.style.transition = `opacity ${Math.round(duration)}ms ease-out`;
    this.flashEl.style.opacity = "0";
  }

  private rainbowFlash(duration: number) {
    this.rainbowBorderEl.classList.add("active");
    this.rainbowTimer = duration;
  }

  private multiFlash(count: number, interval: number, colors: string[]) {
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        this.flashScreen(colors[i % colors.length], interval * 0.75, 0.36);
      }, i * interval);
    }
  }

  private startSlowMotion(duration: number) {
    this.timeScale = 0.55;
    this.slowMotionTimer = Math.min(duration, 0.45);
  }

  private triggerShockwave(x: number, y: number) {
    this.shockwaveEl.style.left = `${x}px`;
    this.shockwaveEl.style.top = `${y}px`;
    this.shockwaveEl.classList.remove("active");
    void this.shockwaveEl.offsetWidth;
    this.shockwaveEl.classList.add("active");
  }

  private screenZoom(target: number) {
    this.zoomTarget = target;
    setTimeout(() => {
      this.zoomTarget = 1;
    }, 180);
  }

  private worldToScreen(wx: number, wy: number): { x: number; y: number } {
    const bounds = this.getViewBounds();
    const xRatio = (wx - bounds.left) / (bounds.right - bounds.left);
    const yRatio = (bounds.top - wy) / (bounds.top - bounds.bottom);
    return {
      x: xRatio * window.innerWidth,
      y: yRatio * window.innerHeight,
    };
  }

  private pick<T>(items: T[]): T {
    return items[Math.floor(Math.random() * items.length)];
  }

  private pushProgression(result: ProgressionResult) {
    this.progression = result.state;
    if (result.leveledUp.length > 0) {
      for (const level of result.leveledUp) {
        this.hud.showLevelUp(level);
      }
      this.syncBallTier();

      if (this.progression.ballColorIndex === BALL_MAX_TIER) {
        this.hud.showBigText("覚醒!! 黒", "kakuhen");
        this.multiFlash(12, 50, ["#111111", "#ffffff", "#9933cc", "#ffffff"]);
        this.shake(1.1, 0.7);
        this.rainbowFlash(3.5);
        this.startSlowMotion(0.8);
        this.screenZoom(1.15);
      } else {
        this.multiFlash(4, 80, ["#ffd700", "#ffffff", "#ffaa00", "#ffd700"]);
        this.shake(0.4, 0.3);
        this.screenZoom(1.05);
      }
    }

    if (result.feverTriggered) {
      this.hud.showBigText("FEVER RUSH", "kakuhen");
      this.multiFlash(10, 55, ["#ffd700", "#ff8844", "#ff4477", "#ffffff"]);
      this.rainbowFlash(4);
      this.startSlowMotion(0.35);
      this.shake(0.7, 0.45);
      this.screenZoom(1.12);
    }
  }

  private addScore(points: number) {
    const multiplier = getScoreMultiplier(this.progression);
    this.score += Math.round(points * multiplier);
  }

  private addCombo() {
    this.progression.combo += 1;
    this.progression.comboTimer = 2;

    if (this.progression.combo >= 2) {
      this.hud.showCombo(this.progression.combo);
    }

    if (this.progression.combo >= 3) {
      this.pushProgression(applyBonusHits(this.progression, Math.floor(this.progression.combo / 2)));
    }

    const combo = this.progression.combo;
    const tier = getComboCelebrationTier(combo);
    if (!tier) return;

    if (combo === COMBO_ATSU) {
      this.hud.showBigText(this.pick(["アツい!!", "チャンス!", "来てる!"]), "atsu");
      this.multiFlash(3, 90, ["#ff8800", "#ffff00", "#ff4400"]);
      this.shake(0.35, 0.25);
      this.screenZoom(1.04);
    } else if (combo === COMBO_GEKIATSU) {
      this.hud.showBigText(this.pick(["激アツ!!", "魚群出現!!", "赤保留!!"]), "gekiatsu");
      this.multiFlash(5, 80, ["#ff0000", "#ff8800", "#ffff00"]);
      this.shake(0.55, 0.35);
      this.rainbowFlash(1.8);
      this.startSlowMotion(0.25);
      this.screenZoom(1.08);
    } else if (combo === COMBO_KAKUHEN) {
      this.hud.showBigText(this.pick(["確変突入!!", "金保留!!", "確定演出!!"]), "kakuhen");
      this.multiFlash(8, 65, ["#ff0000", "#ff8800", "#ffff00", "#00ff00", "#0088ff"]);
      this.shake(0.7, 0.45);
      this.rainbowFlash(3);
      this.startSlowMotion(0.35);
      this.screenZoom(1.1);
    } else if (combo === COMBO_OOATARI || combo === COMBO_CHO_GEKIATSU || combo >= COMBO_FEVER) {
      this.hud.showBigText(this.pick(["大当たり!!!", "全回転!!!!", "∞ FEVER ∞"]), "kakuhen");
      this.multiFlash(tier === "jackpot" ? 14 : 10, 45, ["#ff0000", "#ffffff", "#ff8800", "#ffff00", "#00ff00", "#0088ff", "#ff00ff"]);
      this.shake(1.0, 0.7);
      this.rainbowFlash(5);
      this.startSlowMotion(0.5);
      this.screenZoom(1.15);
    }
  }

  private onBlockDestroyed() {
    this.blocksDestroyed += 1;
    const count = this.blocksDestroyed;

    if (count === 10) {
      this.hud.showBigText("好調!", "atsu");
    } else if (count === 30) {
      this.hud.showBigText("絶好調!!", "atsu");
      this.shake(0.3, 0.2);
    } else if (count === 60) {
      this.hud.showBigText(this.pick(["無双!!", "暴れ打ち!!"]), "gekiatsu");
      this.shake(0.45, 0.28);
      this.rainbowFlash(1.4);
    } else if (count === 100) {
      this.hud.showBigText("破壊神降臨!!!", "kakuhen");
      this.shake(0.7, 0.45);
      this.rainbowFlash(2.4);
      this.screenZoom(1.08);
    }

    const alive = this.starField.aliveCount;
    if (!this.reachShown && alive <= 5 && alive > 0) {
      this.reachShown = true;
      this.hud.showBigText("リーチ!!", "gekiatsu");
      this.shake(0.4, 0.24);
      this.rainbowFlash(1.8);
      this.multiFlash(4, 90, ["#ffd700", "#ffffff", "#ff8800", "#ffd700"]);
    }
  }

  private checkBallPaddle() {
    const bx = this.ball.mesh.position.x;
    const by = this.ball.mesh.position.y;
    if (
      this.ball.vy < 0
      && by - BALL_RADIUS <= this.paddle.top
      && by + BALL_RADIUS >= this.paddle.bottom
      && bx + BALL_RADIUS >= this.paddle.left
      && bx - BALL_RADIUS <= this.paddle.right
    ) {
      const hitPos = (bx - this.paddle.x) / (PADDLE_WIDTH / 2);
      const clampedHit = Math.max(-0.95, Math.min(0.95, hitPos));
      const angle = Math.PI / 2 - clampedHit * (Math.PI / 3);
      this.ball.vx = Math.cos(angle) * this.ball.speed;
      this.ball.vy = Math.abs(Math.sin(angle) * this.ball.speed);
      this.ball.mesh.position.y = this.paddle.top + BALL_RADIUS;
      this.paddleBounces += 1;
    }
  }

  private checkBallBlocks() {
    const bx = this.ball.mesh.position.x;
    const by = this.ball.mesh.position.y;
    const bhw = BLOCK_WIDTH / 2;
    const bhh = BLOCK_HEIGHT / 2;

    for (const block of this.starField.getAliveBlocks()) {
      const sx = block.mesh.position.x;
      const sy = block.mesh.position.y;

      if (
        bx + BALL_RADIUS > sx - bhw
        && bx - BALL_RADIUS < sx + bhw
        && by + BALL_RADIUS > sy - bhh
        && by - BALL_RADIUS < sy + bhh
      ) {
        const color = ((block.mesh.material as THREE.MeshStandardMaterial).color as THREE.Color).getHex();
        const resolution = resolveBlockHit({
          level: this.progression.level,
          ballColorIndex: this.progression.ballColorIndex,
          blockColorIndex: block.colorIndex,
          blockMaxHp: block.maxHp,
          indestructible: block.indestructible,
        });

        this.pushProgression(applyBlockHit(this.progression));

        let destroyed = false;
        let points = 0;

        if (resolution.destroysImmediately) {
          destroyed = true;
          block.destroy();
        } else {
          destroyed = block.hit(resolution.damage);
          if (resolution.shouldBounce) {
            this.bounceOffBlock(bx, by, sx, sy, bhw, bhh);
          }
        }

        if (destroyed) {
          points = resolution.scoreOnDestroy;
          this.onBlockDestroyed();
          this.addScore(points);
          this.addCombo();

          const feverCharge = resolution.feverGain + Math.min(this.progression.combo * 2, 18);
          this.pushProgression(chargeFever(this.progression, feverCharge));

          this.particles.burst(sx, sy, color);
          this.shake(resolution.destroysImmediately ? 0.35 : 0.28, 0.16);
          this.flashScreen("rgba(255,255,255,0.6)", 140, 0.42);
          const screenPos = this.worldToScreen(sx, sy);
          this.triggerShockwave(screenPos.x, screenPos.y);
          this.hud.showScorePopup(screenPos.x, screenPos.y, Math.round(points * getScoreMultiplier(this.progression)));
          if (resolution.destroysImmediately && Math.random() < 0.25) {
            this.hud.showBigText(this.pick(["貫通!!", "突破!", "粉砕!", "一閃!"]), "atsu");
          }
        } else {
          this.pushProgression(chargeFever(this.progression, Math.max(3, Math.floor(resolution.feverGain / 3))));
          this.particles.hitBurst(sx, sy, color);
          this.shake(0.12, 0.14);
          this.flashScreen("rgba(255,255,255,0.24)", 70, 0.18);
        }

        this.updateHUD();
      }
    }

    const star = this.starField.star;
    if (star?.alive) {
      const sx = star.mesh.position.x;
      const sy = star.mesh.position.y;
      const dist = Math.sqrt((bx - sx) ** 2 + (by - sy) ** 2);
      if (dist < BALL_RADIUS + star.boundingRadius) {
        star.destroy();
        this.onStarDestroyed(sx, sy);

        const dx = bx - sx;
        const dy = by - sy;
        if (Math.abs(dx) > Math.abs(dy)) {
          this.ball.vx = Math.abs(this.ball.vx) * Math.sign(dx || 1);
        } else {
          this.ball.vy = Math.abs(this.ball.vy) * Math.sign(dy || 1);
        }
      }
    }
  }

  private onStarDestroyed(sx: number, sy: number) {
    this.ball.active = false;
    this.particles.starBurst(sx, sy);

    const starBonus = Math.max(100, 2000 - this.paddleBounces * 30);
    this.addScore(starBonus);
    this.pushProgression(chargeFever(this.progression, 40));

    this.shake(1.1, 0.8);
    this.multiFlash(12, 60, ["#ffd700", "#ffffff", "#ff8800", "#ff00ff"]);
    this.rainbowFlash(4);
    this.screenZoom(1.18);

    const screenPos = this.worldToScreen(sx, sy);
    this.triggerShockwave(screenPos.x, screenPos.y);
    this.hud.showScorePopup(screenPos.x, screenPos.y, Math.round(starBonus * getScoreMultiplier(this.progression)));
    this.hud.showBigText("★ V入賞 ★", "kakuhen");
    this.updateHUD();

    const themeName = this.getWorldName();
    this.saveScore();

    if (this.wave >= WAVES_PER_WORLD) {
      this.state = "worldclear";
      if (this.world >= this.unlockedWorld && this.world < MAX_WORLDS) {
        this.unlockedWorld = this.world + 1;
        localStorage.setItem("bokuzushi_unlocked", String(this.unlockedWorld));
        this.updateWorldButtons();
      }

      setTimeout(() => {
        if (this.world >= MAX_WORLDS) {
          this.showOverlay(
            "全世界制覇",
            `得点: ${this.score}`,
            `${themeName} を超えて、番付へ`,
            "番付へ戻る",
            () => this.showStartScreen()
          );
        } else {
          this.showOverlay(
            `${themeName} 制覇!!`,
            `得点: ${this.score}`,
            "次の世界へ進む",
            "次の世界へ",
            () => this.nextWorld()
          );
        }
      }, 1800);
    } else {
      this.state = "waveclear";
      setTimeout(() => {
        this.showOverlay(
          `第${this.wave}波 突破!!`,
          `得点: ${this.score}`,
          "一気に次の波へ",
          "次の波へ",
          () => this.nextWave()
        );
      }, 1400);
    }
  }

  private bounceOffBlock(
    bx: number,
    by: number,
    sx: number,
    sy: number,
    hw: number,
    hh: number
  ) {
    const axis = getBounceAxis({
      prevX: this.ball.prevX,
      prevY: this.ball.prevY,
      nextX: bx,
      nextY: by,
      blockX: sx,
      blockY: sy,
      halfWidth: hw,
      halfHeight: hh,
      radius: BALL_RADIUS,
    });

    if (axis === "x") {
      const direction = this.ball.prevX <= sx ? -1 : 1;
      this.ball.vx = Math.abs(this.ball.vx) * direction;
      this.ball.mesh.position.x = sx + direction * (hw + BALL_RADIUS);
    } else {
      const direction = this.ball.prevY <= sy ? -1 : 1;
      this.ball.vy = Math.abs(this.ball.vy) * direction;
      this.ball.mesh.position.y = sy + direction * (hh + BALL_RADIUS);
    }
  }

  private saveScore() {
    if (this.score === 0) return;
    const top10 = mergeRanking(this.getRanking(), {
      score: this.score,
      world: this.getWorldName(),
      date: new Date().toLocaleDateString("ja-JP"),
    });
    localStorage.setItem("bokuzushi_ranking", JSON.stringify(top10));
  }

  private getRanking(): RankingEntry[] {
    const raw = localStorage.getItem("bokuzushi_ranking");
    return raw ? JSON.parse(raw) : [];
  }

  start() {
    this.showStartScreen();
    this.lastTime = performance.now();
    this.loop();
  }

  private loop = () => {
    requestAnimationFrame(this.loop);

    if (this.paused) {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    if (this.slowMotionTimer > 0) {
      this.slowMotionTimer -= dt;
      if (this.slowMotionTimer <= 0) this.timeScale = 1;
    }

    this.progression = tickTimers(this.progression, dt);

    if (this.rainbowTimer > 0) {
      this.rainbowTimer -= dt;
      if (this.rainbowTimer <= 0) {
        this.rainbowBorderEl.classList.remove("active");
      }
    }

    this.zoomCurrent += (this.zoomTarget - this.zoomCurrent) * 0.1;
    this.camera.zoom = this.zoomCurrent;
    this.camera.updateProjectionMatrix();

    if (!this.coarsePointer && this.keyboardDirection !== 0 && this.state === "playing") {
      this.mouseX += this.keyboardDirection * dt * 18;
    }

    this.paddle.setTargetX(this.mouseX);
    this.paddle.update();

    if (this.state === "playing") {
      if (!this.ball.active) {
        this.ball.mesh.position.x = this.paddle.x;
        this.ball.mesh.position.y = this.paddle.y + 0.5;
      }

      const lost = this.ball.update(this.timeScale);
      if (lost) {
        this.shake(0.9, 0.45);
        this.multiFlash(6, 70, ["#ff0022", "#ffffff", "#880000"]);
        this.state = "gameover";
        this.saveScore();
        setTimeout(() => {
          this.showOverlay(
            "ゲームオーバー",
            `得点: ${this.score}`,
            "流れを切り替える",
            "もう一度",
            () => this.startNewGame(this.world),
            "ワールド選択",
            () => this.showStartScreen()
          );
        }, 500);
      }

      this.checkBallPaddle();
      this.checkBallBlocks();
      this.starField.update();
      this.ball.updateTrail();
      this.updateHUD();
    }

    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      const t = Math.max(0, this.shakeTimer / SHAKE_DURATION);
      this.camera.position.x = this.cameraBasePos.x + (Math.random() - 0.5) * this.shakeIntensity * t;
      this.camera.position.y = this.cameraBasePos.y + (Math.random() - 0.5) * this.shakeIntensity * t;
      this.camera.rotation.z = (Math.random() - 0.5) * this.shakeIntensity * t * 0.02;
    } else {
      this.camera.position.x = this.cameraBasePos.x;
      this.camera.position.y = this.cameraBasePos.y;
      this.camera.rotation.z = 0;
      this.shakeIntensity = 0;
    }

    this.worldBg.update(dt);
    this.particles.update(dt * this.timeScale);
    this.renderer.render(this.scene, this.camera);
  };
}
