import * as THREE from "three";
import { Paddle } from "./Paddle";
import { Ball } from "./Ball";
import { toFrameStepScale } from "./Ball";
import { type Block } from "./Block";
import { StarField } from "./StarField";
import { HUD } from "./HUD";
import { Particles } from "./Particles";
import { WorldBackground } from "./WorldBackground";
import {
  COMBO_CELEBRATION_COPY,
  DISPLAY_TITLE,
  FEVER_TRIGGER_COPY,
  STAR_DESTROYED_HEADLINES,
  STAR_DESTROYED_PRAISE_COPY,
  formatLayerLabel,
} from "./gameContent";
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
  MOBILE_PADDLE_LIFT,
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
const STAR_PRAISE_DELAY_MS = 350;
const WAVE_CLEAR_OVERLAY_DELAY_MS = 3600;
const WORLD_CLEAR_OVERLAY_DELAY_MS = 4700;
const MOBILE_BOTTOM_UI_SAFE_SPACE = 6.2;
const SPLIT_BALL_ANGLE_OFFSET = 0.32;
const INTERNAL_BALL_SAFETY_LIMIT = 32;
const REFLECT_BLOCK_DAMAGE = 1;
const DEBUG_UNLOCK_STORAGE_KEY = "bokuzushi_debug_unlock_all";

function parseUnlockedWorld(rawValue: string | null | undefined) {
  const parsed = Number.parseInt(rawValue ?? "1", 10);
  if (!Number.isFinite(parsed)) return 1;
  return THREE.MathUtils.clamp(parsed, 1, MAX_WORLDS);
}

export function isDebugUnlockAllEnabled(input: {
  search?: string;
  storageValue?: string | null;
}) {
  const params = new URLSearchParams(input.search ?? "");
  const queryValue = params.get("unlockAll") ?? params.get("debugUnlockAll");
  if (queryValue === "1" || queryValue === "true") {
    return true;
  }

  return input.storageValue === "1" || input.storageValue === "true";
}

export function getExtendedPaddleMultiplier(currentMultiplier: number) {
  return Math.min(currentMultiplier + 0.5, (GAME_WIDTH * 0.8) / PADDLE_WIDTH);
}

export function getRankingStorageKey(world: number) {
  return `bokuzushi_ranking_world_${world}`;
}

export function getVisibleRankingWorlds(unlockedWorld: number, preferredWorld: number) {
  const clampedUnlocked = THREE.MathUtils.clamp(unlockedWorld, 1, MAX_WORLDS);
  const clampedPreferred = THREE.MathUtils.clamp(preferredWorld, 1, clampedUnlocked);
  const worlds = Array.from({ length: clampedUnlocked }, (_, index) => index + 1);
  return [clampedPreferred, ...worlds.filter((world) => world !== clampedPreferred)];
}

export function getBallDistanceSpeedMultiplier(input: {
  distanceRatio: number;
  verticalVelocity: number;
  world: number;
  coarsePointer?: boolean;
}) {
  if (input.verticalVelocity >= 0) {
    return 1;
  }

  const clampedRatio = THREE.MathUtils.clamp(input.distanceRatio, 0, 1);
  const nearPaddleMultiplier = input.coarsePointer ? 0.54 : 0.66;
  const easedRatio = THREE.MathUtils.smoothstep(clampedRatio, 0, 1);
  return THREE.MathUtils.lerp(nearPaddleMultiplier, 1, easedRatio);
}

export function createSplitBallVelocities(input: {
  vx: number;
  vy: number;
  speed: number;
}) {
  const baseAngle = Math.atan2(input.vy, input.vx);
  return [
    baseAngle - SPLIT_BALL_ANGLE_OFFSET,
    baseAngle + SPLIT_BALL_ANGLE_OFFSET,
  ].map((angle) => ({
    vx: Math.cos(angle) * input.speed,
    vy: Math.sin(angle) * input.speed,
  }));
}

export class Game {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private paddle: Paddle;
  private balls: Ball[] = [];
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
  private reachStage = 0;
  private feverReadyShown = false;
  private unlockedWorld = 1;
  private rankingWorld = 1;
  private progression: ProgressionState = createProgressionState();

  private paused = false;
  private coarsePointer = false;
  private initialServePending = false;

  private overlay: HTMLElement;
  private overlayTitle: HTMLElement;
  private overlayMessage: HTMLElement;
  private overlaySub: HTMLElement;
  private overlayPanelKicker: HTMLElement;
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
  private renderPixelRatio = 1;
  private ballSparkTimer = 0;
  private ballSparkCooldown = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
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

    this.balls.push(this.createBall());

    this.starField = new StarField(this.scene);
    this.hud = new HUD();
    this.particles = new Particles(this.scene);

    this.overlay = document.getElementById("overlay")!;
    this.overlayTitle = document.getElementById("overlay-title")!;
    this.overlayMessage = document.getElementById("overlay-message")!;
    this.overlaySub = document.getElementById("overlay-sub")!;
    this.overlayPanelKicker = document.getElementById("overlay-panel-kicker")!;
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

    const debugUnlockAll = isDebugUnlockAllEnabled({
      search: window.location.search,
      storageValue: localStorage.getItem(DEBUG_UNLOCK_STORAGE_KEY),
    });
    this.unlockedWorld = debugUnlockAll
      ? MAX_WORLDS
      : parseUnlockedWorld(localStorage.getItem("bokuzushi_unlocked"));
    this.rankingWorld = this.unlockedWorld;

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

  private createBall() {
    const ball = new Ball(this.scene);
    this.scene.add(ball.mesh);
    return ball;
  }

  private getPrimaryBall() {
    return this.balls[0]!;
  }

  private getActiveBalls() {
    return this.balls.filter((ball) => ball.active);
  }

  private getEffectBall() {
    return this.getActiveBalls()[0] ?? this.getPrimaryBall();
  }

  private removeExtraBalls() {
    while (this.balls.length > 1) {
      const ball = this.balls.pop();
      ball?.dispose();
    }
  }

  private resetBalls(speed: number) {
    this.removeExtraBalls();
    const ball = this.getPrimaryBall();
    ball.mesh.visible = true;
    ball.speed = speed;
    ball.reset(this.paddle.x, this.paddle.y);
    this.syncBallTier();
  }

  private spawnSplitBalls(source: Ball) {
    if (this.balls.length >= INTERNAL_BALL_SAFETY_LIMIT) return;

    for (const velocity of createSplitBallVelocities({
      vx: source.vx,
      vy: source.vy,
      speed: source.speed,
    })) {
      if (this.balls.length >= INTERNAL_BALL_SAFETY_LIMIT) break;
      const ball = this.createBall();
      ball.speed = source.speed;
      ball.colorIndex = this.progression.ballColorIndex;
      ball.applyColor();
      ball.updateGlow();
      ball.mesh.visible = true;
      ball.mesh.position.copy(source.mesh.position);
      ball.prevX = source.prevX;
      ball.prevY = source.prevY;
      ball.vx = velocity.vx;
      ball.vy = velocity.vy;
      ball.active = true;
      this.balls.push(ball);
    }
  }

  private clearAllBalls() {
    for (const ball of this.balls) {
      ball.deactivate(true);
    }
  }

  private resetPaddleBoost() {
    this.paddle.setWidthMultiplier(1);
  }

  private extendPaddle() {
    this.paddle.setWidthMultiplier(getExtendedPaddleMultiplier(this.paddle.widthScale));
    this.flashScreen("rgba(255,205,120,0.42)", 120, 0.22);
    this.shake(0.14, 0.14);
    this.hud.showBigText(this.pick(["伸びた!!", "受けやすい!!", "返し板拡張!!"]), "atsu");
  }

  private applyMobileLayout() {
    const lift = this.coarsePointer ? MOBILE_PADDLE_LIFT : 0;
    this.paddle.setY(this.paddle.baseY + lift);
    this.resetPaddleBoost();
    this.resetBalls(this.getBaseSpeed());
  }

  private createWorldButtons() {
    for (let i = 1; i <= MAX_WORLDS; i++) {
      const theme = WORLD_THEMES[i - 1];
      const btn = document.createElement("button");
      btn.className = "world-btn";
      btn.type = "button";
      btn.setAttribute("aria-label", `${theme.name} の${formatLayerLabel(1)}から始める`);
      btn.style.borderColor = theme.btnColor;
      btn.style.background = theme.btnBg;
      btn.addEventListener("mouseenter", () => this.setRankingWorld(i));
      btn.addEventListener("focus", () => this.setRankingWorld(i));

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

  private setRankingWorld(world: number) {
    const clampedWorld = Math.max(1, Math.min(MAX_WORLDS, world));
    if (this.rankingWorld === clampedWorld) return;
    this.rankingWorld = clampedWorld;
    if (this.state === "start") {
      this.showRanking();
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

    window.addEventListener("touchstart", (event) => {
      if (event.touches.length > 1) {
        event.preventDefault();
      }
    }, { passive: false });

    window.addEventListener("touchmove", (event) => {
      if (event.touches.length > 1) {
        event.preventDefault();
        return;
      }
      if (!this.shouldCaptureTouchInput()) return;
      event.preventDefault();
      if (event.touches.length > 0) {
        this.mouseX = this.screenToWorldX(event.touches[0].clientX);
      }
    }, { passive: false });

    // iOS Safari can still open magnifier/zoom gestures unless gesture events are blocked.
    for (const type of ["gesturestart", "gesturechange", "gestureend"]) {
      window.addEventListener(type, (event) => {
        event.preventDefault();
      }, { passive: false });
    }

    window.addEventListener("dblclick", (event) => {
      event.preventDefault();
    });

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

  private shouldCaptureTouchInput() {
    return this.state === "playing" && !this.paused && this.overlay.classList.contains("hidden");
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

    this.launchBallIfReady();
  }

  private getInitialServeAvoidAngle() {
    const star = this.starField.star;
    if (!star?.alive) return undefined;

    const ball = this.getPrimaryBall();
    const dx = star.mesh.position.x - ball.mesh.position.x;
    const dy = star.mesh.position.y - ball.mesh.position.y;
    if (dy <= 0) return undefined;

    return Math.atan2(dy, dx);
  }

  private launchBallIfReady() {
    const ball = this.getPrimaryBall();
    if (this.state !== "playing" || ball.active || this.paused) return;

    ball.launch({
      avoidAngle: this.initialServePending ? this.getInitialServeAvoidAngle() : undefined,
    });
    this.initialServePending = false;
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
    this.updatePerformanceProfile(width, height);
    this.renderer.setSize(width, height);

    const aspect = width / height;
    const baseAspect = GAME_WIDTH / GAME_HEIGHT;
    const fitWidth = aspect <= baseAspect;
    const safeBottom = this.coarsePointer ? MOBILE_BOTTOM_UI_SAFE_SPACE : 2.2;
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

    this.viewCenterY = this.coarsePointer ? -0.9 : -0.6;
    this.camera.left = -viewWidth / 2;
    this.camera.right = viewWidth / 2;
    this.camera.top = viewHeight / 2 + this.viewCenterY;
    this.camera.bottom = -viewHeight / 2 + this.viewCenterY;
    this.camera.updateProjectionMatrix();
  }

  private updatePerformanceProfile(width: number, height: number) {
    const viewportPixels = Math.max(1, width * height);
    const maxRenderPixels = this.coarsePointer ? 2_100_000 : 2_600_000;
    const areaLimitedRatio = Math.sqrt(maxRenderPixels / viewportPixels);
    const nextPixelRatio = Math.min(
      window.devicePixelRatio || 1,
      this.coarsePointer ? 1.35 : 1.6,
      Math.max(0.85, areaLimitedRatio)
    );

    if (Math.abs(nextPixelRatio - this.renderPixelRatio) > 0.01) {
      this.renderPixelRatio = nextPixelRatio;
      this.renderer.setPixelRatio(nextPixelRatio);
    }

    const renderPixels = viewportPixels * nextPixelRatio * nextPixelRatio;
    const effectIntensity = renderPixels > 3_200_000 ? 0.72 : renderPixels > 2_500_000 ? 0.84 : 1;
    this.particles.setIntensity(effectIntensity);
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
    this.rankingWorld = Math.max(1, Math.min(this.world, this.unlockedWorld));
    this.initialServePending = false;
    this.resetPaddleBoost();
    this.resetBalls(this.getBaseSpeed());
    this.pauseBtn.classList.add("hidden");
    this.pauseOverlay.classList.remove("show");
    this.pauseOverlay.setAttribute("aria-hidden", "true");
    this.worldSelectEl.classList.add("show");
    this.updateWorldButtons();
    this.showOverlay(DISPLAY_TITLE, "銀河を選べ", "当たり星まで通せ", null, null);
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
    const isStartScreen = !primaryHandler && !secondaryHandler;
    const ranking = document.getElementById("ranking");
    if (ranking) ranking.style.display = primaryHandler || secondaryHandler ? "none" : "block";
    this.pauseBtn.classList.toggle("hidden", this.state !== "playing");
    if (primaryHandler || secondaryHandler) {
      this.worldSelectEl.classList.remove("show");
    }
    this.overlay.dataset.mode = isStartScreen ? "start" : "interstitial";
    this.overlayPanelKicker.textContent = isStartScreen
      ? "解放中の銀河"
      : "次の巡目";
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
    const rankingSlot = document.getElementById("ranking-slot");
    if (!el) {
      el = document.createElement("div");
      el.id = "ranking";
      (rankingSlot ?? this.overlay).appendChild(el);
    }
    el.style.display = "block";
    el.textContent = "";

    const title = document.createElement("div");
    title.className = "ranking-title";
    title.textContent = "銀河別ハイスコア";
    el.appendChild(title);

    const carousel = document.createElement("div");
    carousel.className = "ranking-carousel";
    el.appendChild(carousel);

    const visibleWorlds = getVisibleRankingWorlds(this.unlockedWorld, this.rankingWorld);
    for (const world of visibleWorlds) {
      const section = document.createElement("section");
      section.className = "ranking-section";

      const sectionTitle = document.createElement("div");
      sectionTitle.className = "ranking-section-title";
      sectionTitle.textContent = `${WORLD_THEMES[world - 1]?.name ?? "銀河"} の記録`;
      section.appendChild(sectionTitle);

      const ranking = this.getRanking(world);
      if (ranking.length === 0) {
        const empty = document.createElement("div");
        empty.className = "ranking-empty";
        empty.textContent = "未記録";
        section.appendChild(empty);
      } else {
        ranking.forEach((entry, index) => {
          const row = document.createElement("div");
          row.className = "ranking-row";

          const rank = document.createElement("span");
          rank.className = "ranking-rank";
          rank.textContent = `${index + 1}.`;

          const score = document.createElement("span");
          score.className = "ranking-score";
          score.textContent = String(entry.score);

          const worldLabel = document.createElement("span");
          worldLabel.className = "ranking-world";
          worldLabel.textContent = entry.date;

          row.appendChild(rank);
          row.appendChild(score);
          row.appendChild(worldLabel);
          section.appendChild(row);
        });
      }

      carousel.appendChild(section);
    }
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
    return Math.min(
      (BALL_SPEED + (this.world - 1) * WORLD_SPEED_BONUS) * this.getSpeedScale(),
      this.getMaxSpeed()
    );
  }

  private getWaveSpeedIncrement(): number {
    return BALL_SPEED_INCREMENT * this.getSpeedScale();
  }

  private getMaxSpeed(): number {
    return this.coarsePointer ? BALL_MAX_SPEED * 0.88 : BALL_MAX_SPEED;
  }

  private getSpeedScale(): number {
    return this.coarsePointer ? 0.88 : 1;
  }

  private getBallPaddleDistanceRatio(ball: Ball): number {
    const ceiling = GAME_HEIGHT / 2 - BALL_RADIUS;
    const travel = Math.max(0.001, ceiling - this.paddle.top);
    const distance = THREE.MathUtils.clamp(ball.mesh.position.y - this.paddle.top, 0, travel);
    return distance / travel;
  }

  private getBallDistanceSpeedMultiplier(ball: Ball): number {
    return getBallDistanceSpeedMultiplier({
      distanceRatio: this.getBallPaddleDistanceRatio(ball),
      verticalVelocity: ball.vy,
      world: this.world,
      coarsePointer: this.coarsePointer,
    });
  }

  private syncBallDistanceSpeed(ball: Ball) {
    if (!ball.active) return;
    const velocity = Math.hypot(ball.vx, ball.vy);
    if (velocity <= 0.0001) return;

    const targetSpeed = Math.min(
      ball.speed * this.getBallDistanceSpeedMultiplier(ball),
      this.getMaxSpeed()
    );
    const speedScale = targetSpeed / velocity;
    ball.vx *= speedScale;
    ball.vy *= speedScale;
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
    for (const ball of this.balls) {
      ball.colorIndex = this.progression.ballColorIndex;
      ball.applyColor();
      ball.updateGlow();
    }
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
    if (!this.progression.feverActive && !this.feverReadyShown && this.progression.feverGauge >= 80) {
      this.feverReadyShown = true;
      this.showCenterCallout(this.pick(["ざわり濃い!!", "アガり近い!!"]), "atsu");
    }
  }

  private startNewGame(startWorld: number) {
    this.score = 0;
    this.world = startWorld;
    this.wave = 1;
    this.paddleBounces = 0;
    this.blocksDestroyed = 0;
    this.reachStage = 0;
    this.feverReadyShown = false;
    this.progression = createProgressionState();
    this.resetRoundMomentum();
    this.resetPaddleBoost();
    this.syncBallTier();
    this.resetBalls(this.getBaseSpeed());
    this.starField.generate(0, this.world - 1, {
      coarsePointer: this.coarsePointer,
      paddleTop: this.paddle.top,
    });
    this.particles.setWorld(this.world - 1);
    this.worldBg.generate(this.world - 1);
    this.initialServePending = true;
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
    this.reachStage = 0;
    this.feverReadyShown = false;
    this.resetRoundMomentum();
    const nextSpeed = Math.min(this.getPrimaryBall().speed + this.getWaveSpeedIncrement(), this.getMaxSpeed());
    this.resetBalls(nextSpeed);
    this.starField.generate(this.wave - 1, this.world - 1, {
      coarsePointer: this.coarsePointer,
      paddleTop: this.paddle.top,
    });
    this.initialServePending = true;
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
    this.reachStage = 0;
    this.feverReadyShown = false;
    this.progression = createProgressionState();
    this.resetRoundMomentum();
    this.resetPaddleBoost();
    this.syncBallTier();
    this.resetBalls(this.getBaseSpeed());
    this.starField.generate(0, this.world - 1, {
      coarsePointer: this.coarsePointer,
      paddleTop: this.paddle.top,
    });
    this.particles.setWorld(this.world - 1);
    this.worldBg.generate(this.world - 1);
    this.initialServePending = true;
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

  private vibrate(pattern: number | number[]) {
    if (!this.coarsePointer) return;
    if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
    navigator.vibrate(pattern);
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

  private pick<T>(items: readonly T[]): T {
    return items[Math.floor(Math.random() * items.length)];
  }

  private pickStarPraiseWords(count: number): string[] {
    const pool = [...STAR_DESTROYED_PRAISE_COPY];
    for (let index = pool.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
    }

    if (count <= pool.length) {
      return pool.slice(0, count);
    }

    return Array.from({ length: count }, (_, index) => pool[index % pool.length] ?? "");
  }

  private showCenterCallout(text: string, cssClass: "atsu" | "gekiatsu" | "kakuhen") {
    this.hud.showBigText(text, cssClass);
  }

  private emitBallSparkBurst(strength = 1) {
    const color = this.progression.ballColorIndex >= BLOCK_COLORS.length
      ? 0xffffff
      : BLOCK_COLORS[this.progression.ballColorIndex];
    const ball = this.getEffectBall();
    this.particles.colorChangeBurst(ball.mesh.position.x, ball.mesh.position.y, color, strength);
  }

  private triggerLevelUpFx(levelUps: number, reachedMaxTier: boolean) {
    const strength = reachedMaxTier ? 3.1 : 2 + Math.max(0, levelUps - 1) * 0.55;
    this.ballSparkTimer = Math.max(this.ballSparkTimer, reachedMaxTier ? 2.2 : 1.35 + levelUps * 0.24);
    this.ballSparkCooldown = 0;
    this.emitBallSparkBurst(strength);
    this.emitBallSparkBurst(strength * 0.85);
    const ball = this.getEffectBall();
    const screenPos = this.worldToScreen(ball.mesh.position.x, ball.mesh.position.y);
    this.triggerShockwave(screenPos.x, screenPos.y);
    this.flashScreen("rgba(255,245,180,0.72)", reachedMaxTier ? 240 : 180, reachedMaxTier ? 0.62 : 0.48);
    this.multiFlash(
      reachedMaxTier ? 10 : 6,
      reachedMaxTier ? 42 : 55,
      reachedMaxTier
        ? ["#ffffff", "#ffe55c", "#ff9a00", "#fff1a8", "#ffffff"]
        : ["#fff4c4", "#ffcf4d", "#ff8f00", "#fff1a8"]
    );
    this.shake(reachedMaxTier ? 0.95 : 0.6, reachedMaxTier ? 0.55 : 0.34);
    this.screenZoom(reachedMaxTier ? 1.16 : 1.09);
    this.startSlowMotion(reachedMaxTier ? 0.32 : 0.18);
    this.vibrate(reachedMaxTier ? [14, 18, 22, 20, 36] : [12, 12, 22]);
    this.hud.showLevelUp(this.progression.level);
  }

  private pushProgression(result: ProgressionResult) {
    this.progression = result.state;
    if (result.leveledUp.length > 0) {
      this.syncBallTier();
      const reachedMaxTier = this.progression.ballColorIndex === BALL_MAX_TIER;
      this.triggerLevelUpFx(result.leveledUp.length, reachedMaxTier);

      if (reachedMaxTier) {
        this.multiFlash(12, 50, ["#111111", "#ffffff", "#9933cc", "#ffffff"]);
        this.shake(1.1, 0.7);
        this.rainbowFlash(3.5);
        this.startSlowMotion(0.8);
        this.screenZoom(1.15);
        this.vibrate([18, 24, 18, 50, 28]);
      } else {
        this.rainbowFlash(0.85);
      }
    }

    if (result.feverTriggered) {
      this.feverReadyShown = false;
      this.hud.showBigText(this.pick(FEVER_TRIGGER_COPY), "kakuhen");
      this.multiFlash(10, 55, ["#ffd700", "#ff8844", "#ff4477", "#ffffff"]);
      this.rainbowFlash(4);
      this.startSlowMotion(0.35);
      this.shake(0.7, 0.45);
      this.screenZoom(1.12);
      this.vibrate([24, 30, 24, 40, 48]);
    }
  }

  private addScore(points: number) {
    const multiplier = getScoreMultiplier(this.progression);
    this.score += Math.round(points * multiplier);
  }

  private addCombo() {
    this.progression.combo += 1;
    this.progression.comboTimer = 2;

    if (this.progression.combo >= 1) {
      this.hud.showCombo(this.progression.combo);
    }

    if (this.progression.combo >= 3) {
      this.pushProgression(applyBonusHits(this.progression, Math.floor(this.progression.combo / 2)));
    }

    const combo = this.progression.combo;
    const tier = getComboCelebrationTier(combo);
    if (!tier) return;

    if (combo === COMBO_ATSU) {
      this.hud.showBigText(this.pick(COMBO_CELEBRATION_COPY.atsu), "atsu");
      this.multiFlash(3, 90, ["#ff8800", "#ffff00", "#ff4400"]);
      this.shake(0.35, 0.25);
      this.screenZoom(1.04);
    } else if (combo === COMBO_GEKIATSU) {
      this.hud.showBigText(this.pick(COMBO_CELEBRATION_COPY.gekiatsu), "gekiatsu");
      this.multiFlash(5, 80, ["#ff0000", "#ff8800", "#ffff00"]);
      this.shake(0.55, 0.35);
      this.rainbowFlash(1.8);
      this.startSlowMotion(0.25);
      this.screenZoom(1.08);
    } else if (combo === COMBO_KAKUHEN) {
      this.hud.showBigText(this.pick(COMBO_CELEBRATION_COPY.kakuhen), "kakuhen");
      this.multiFlash(8, 65, ["#ff0000", "#ff8800", "#ffff00", "#00ff00", "#0088ff"]);
      this.shake(0.7, 0.45);
      this.rainbowFlash(3);
      this.startSlowMotion(0.35);
      this.screenZoom(1.1);
    } else if (combo === COMBO_OOATARI) {
      this.hud.showBigText(this.pick(COMBO_CELEBRATION_COPY.ooatari), "kakuhen");
      this.multiFlash(tier === "jackpot" ? 14 : 10, 45, ["#ff0000", "#ffffff", "#ff8800", "#ffff00", "#00ff00", "#0088ff", "#ff00ff"]);
      this.shake(1.0, 0.7);
      this.rainbowFlash(5);
      this.startSlowMotion(0.5);
      this.screenZoom(1.15);
    } else if (combo === COMBO_CHO_GEKIATSU) {
      this.hud.showBigText(this.pick(COMBO_CELEBRATION_COPY.choGekiatsu), "kakuhen");
      this.multiFlash(tier === "jackpot" ? 14 : 10, 45, ["#ff0000", "#ffffff", "#ff8800", "#ffff00", "#00ff00", "#0088ff", "#ff00ff"]);
      this.shake(1.0, 0.7);
      this.rainbowFlash(5);
      this.startSlowMotion(0.5);
      this.screenZoom(1.15);
    } else if (combo >= COMBO_FEVER) {
      this.hud.showBigText(this.pick(COMBO_CELEBRATION_COPY.fever), "kakuhen");
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

    if (count === 5) {
      this.showCenterCallout("波が来た!", "atsu");
    } else if (count === 10) {
      this.hud.showBigText("好調!", "atsu");
    } else if (count === 20) {
      this.showCenterCallout(this.pick(["ざわり濃い!!", "流れが見えた!!"]), "atsu");
    } else if (count === 30) {
      this.hud.showBigText("絶好調!!", "atsu");
      this.shake(0.3, 0.2);
    } else if (count === 45) {
      this.showCenterCallout(this.pick(["銀河が寄る!!", "当たりの息がある!!"]), "gekiatsu");
    } else if (count === 60) {
      this.hud.showBigText(this.pick(["無双!!", "暴れ打ち!!"]), "gekiatsu");
      this.shake(0.45, 0.28);
      this.rainbowFlash(1.4);
    } else if (count === 80) {
      this.showCenterCallout(this.pick(["止まる気がせん!!", "盤ごと熱い!!"]), "gekiatsu");
    } else if (count === 100) {
      this.hud.showBigText("破壊神降臨!!!", "kakuhen");
      this.shake(0.7, 0.45);
      this.rainbowFlash(2.4);
      this.screenZoom(1.08);
    }

    const alive = this.starField.aliveCount;
    if (this.reachStage === 0 && alive <= 12 && alive > 5) {
      this.reachStage = 1;
      this.showCenterCallout("当たり星が見えた!!", "atsu");
    } else if (this.reachStage <= 1 && alive <= 5 && alive > 2) {
      this.reachStage = 2;
      this.hud.showBigText("リーチ!!", "gekiatsu");
      this.shake(0.4, 0.24);
      this.rainbowFlash(1.8);
      this.multiFlash(4, 90, ["#ffd700", "#ffffff", "#ff8800", "#ffd700"]);
    } else if (this.reachStage <= 2 && alive <= 2 && alive > 0) {
      this.reachStage = 3;
      this.showCenterCallout("もう通る!!", "gekiatsu");
    }
  }

  private getBlockColor(block: Block) {
    return ((block.mesh.material as THREE.MeshStandardMaterial).color as THREE.Color).getHex();
  }

  private rewardDestroyedBlock(
    block: Block,
    points: number,
    feverGain: number,
    options: {
      destroysImmediately?: boolean;
      chain?: boolean;
    } = {}
  ) {
    const color = this.getBlockColor(block);
    const sx = block.mesh.position.x;
    const sy = block.mesh.position.y;
    const chain = options.chain === true;

    this.onBlockDestroyed();
    this.addScore(points);
    this.addCombo();
    this.pushProgression(chargeFever(
      this.progression,
      feverGain + (chain ? 0 : Math.min(this.progression.combo * 2, 18))
    ));

    if (chain) {
      this.particles.hitBurst(sx, sy, color);
      this.shake(0.08, 0.1);
    } else {
      this.particles.burst(sx, sy, color);
      this.shake(options.destroysImmediately ? 0.35 : 0.28, 0.16);
      this.flashScreen("rgba(255,255,255,0.6)", 140, 0.42);
    }

    const screenPos = this.worldToScreen(sx, sy);
    this.triggerShockwave(screenPos.x, screenPos.y);
    this.hud.showScorePopup(screenPos.x, screenPos.y, Math.round(points * getScoreMultiplier(this.progression)));

    if (!chain && options.destroysImmediately && Math.random() < 0.45) {
      this.hud.showBigText(this.pick(["貫通!!", "突破!", "粉砕!", "一閃!", "星路ひらく!", "通った!!"]), "atsu");
    }
  }

  private checkBallPaddle() {
    for (const ball of this.getActiveBalls()) {
      const bx = ball.mesh.position.x;
      const by = ball.mesh.position.y;
      if (
        ball.vy < 0
        && by - BALL_RADIUS <= this.paddle.top
        && by + BALL_RADIUS >= this.paddle.bottom
        && bx + BALL_RADIUS >= this.paddle.left
        && bx - BALL_RADIUS <= this.paddle.right
      ) {
        const hitPos = (bx - this.paddle.x) / this.paddle.halfWidth;
        const clampedHit = Math.max(-0.95, Math.min(0.95, hitPos));
        const angle = Math.PI / 2 - clampedHit * (Math.PI / 3);
        ball.vx = Math.cos(angle) * ball.speed;
        ball.vy = Math.abs(Math.sin(angle) * ball.speed);
        ball.mesh.position.y = this.paddle.top + BALL_RADIUS;
        this.paddleBounces += 1;
      }
    }
  }

  private handleBlockCollision(
    ball: Ball,
    block: Block,
    bx: number,
    by: number,
    bhw: number,
    bhh: number
  ) {
    const sx = block.mesh.position.x;
    const sy = block.mesh.position.y;
    this.pushProgression(applyBlockHit(this.progression));

    if (block.kind === "split") {
      block.destroy();
      this.spawnSplitBalls(ball);
      this.rewardDestroyedBlock(block, block.maxHp * 12, 16, { destroysImmediately: true });
      this.particles.colorChangeBurst(sx, sy, 0x57ffe5, 1.3);
      this.updateHUD();
      return;
    }

    if (block.kind === "extend") {
      block.destroy();
      this.extendPaddle();
      this.rewardDestroyedBlock(block, block.maxHp * 11, 12, { destroysImmediately: true });
      this.particles.colorChangeBurst(sx, sy, 0xffc14f, 1.15);
      this.updateHUD();
      return;
    }

    if (block.kind === "reflect") {
      const destroyed = block.hit(REFLECT_BLOCK_DAMAGE);
      this.bounceOffBlock(ball, bx, by, sx, sy, bhw, bhh);
      if (destroyed) {
        this.rewardDestroyedBlock(block, block.maxHp * 14, 14);
      } else {
        this.pushProgression(chargeFever(this.progression, 4));
        this.particles.hitBurst(sx, sy, this.getBlockColor(block));
        this.flashScreen("rgba(180,235,255,0.26)", 90, 0.16);
        this.shake(0.12, 0.12);
      }
      this.updateHUD();
      return;
    }

    const resolution = resolveBlockHit({
      level: this.progression.level,
      ballColorIndex: this.progression.ballColorIndex,
      blockColorIndex: block.colorIndex,
      blockMaxHp: block.maxHp,
      indestructible: block.indestructible,
    });

    let destroyed = false;
    if (resolution.destroysImmediately) {
      destroyed = true;
      block.destroy();
    } else {
      destroyed = block.hit(resolution.damage);
      if (resolution.shouldBounce) {
        this.bounceOffBlock(ball, bx, by, sx, sy, bhw, bhh);
      }
    }

    if (destroyed) {
      this.rewardDestroyedBlock(
        block,
        resolution.scoreOnDestroy,
        resolution.feverGain,
        { destroysImmediately: resolution.destroysImmediately }
      );
    } else {
      this.pushProgression(chargeFever(this.progression, Math.max(3, Math.floor(resolution.feverGain / 3))));
      this.particles.hitBurst(sx, sy, this.getBlockColor(block));
      this.shake(0.12, 0.14);
      this.flashScreen("rgba(255,255,255,0.24)", 70, 0.18);
    }

    this.updateHUD();
  }

  private checkBallBlocks() {
    const bhw = BLOCK_WIDTH / 2;
    const bhh = BLOCK_HEIGHT / 2;

    for (const ball of [...this.getActiveBalls()]) {
      const bx = ball.mesh.position.x;
      const by = ball.mesh.position.y;

      let collided = false;
      for (const block of this.starField.getAliveBlocks()) {
        const sx = block.mesh.position.x;
        const sy = block.mesh.position.y;
        if (
          bx + BALL_RADIUS > sx - bhw
          && bx - BALL_RADIUS < sx + bhw
          && by + BALL_RADIUS > sy - bhh
          && by - BALL_RADIUS < sy + bhh
        ) {
          this.handleBlockCollision(ball, block, bx, by, bhw, bhh);
          collided = true;
          break;
        }
      }

      if (this.state !== "playing") return;
      if (collided) continue;

      const star = this.starField.star;
      if (star?.alive) {
        const sx = star.mesh.position.x;
        const sy = star.mesh.position.y;
        const dist = Math.sqrt((bx - sx) ** 2 + (by - sy) ** 2);
        if (dist < BALL_RADIUS + star.boundingRadius) {
          star.destroy();
          this.onStarDestroyed(sx, sy);
          return;
        }
      }
    }
  }

  private onStarDestroyed(sx: number, sy: number) {
    this.clearAllBalls();
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
    const starPraiseHeadline = this.pick(STAR_DESTROYED_HEADLINES);
    const starPraiseWords = this.pickStarPraiseWords(64);
    setTimeout(() => {
      this.hud.showStarPraise(starPraiseHeadline, starPraiseWords);
    }, STAR_PRAISE_DELAY_MS);
    this.vibrate([30, 20, 30, 20, 70]);
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
            "全銀河到達",
            `得点: ${this.score}`,
            `${themeName} を抜けても、まだざわりが残っている`,
            "記録を見る",
            () => this.showStartScreen(),
            "銀河選択",
            () => this.showStartScreen()
          );
        } else {
          this.showOverlay(
            `${themeName} 銀河抜け`,
            `得点: ${this.score}`,
            "次の銀河がもう近い",
            "次の銀河へ",
            () => this.nextWorld(),
            "銀河選択",
            () => this.showStartScreen()
          );
        }
      }, WORLD_CLEAR_OVERLAY_DELAY_MS);
    } else {
      this.state = "waveclear";
      setTimeout(() => {
        this.showOverlay(
          `${formatLayerLabel(this.wave)} 到達`,
          `得点: ${this.score}`,
          "まだ先へ通せる",
          "次の巡目へ",
          () => this.nextWave(),
          "銀河選択",
          () => this.showStartScreen()
        );
      }, WAVE_CLEAR_OVERLAY_DELAY_MS);
    }
  }

  private bounceOffBlock(
    ball: Ball,
    bx: number,
    by: number,
    sx: number,
    sy: number,
    hw: number,
    hh: number
  ) {
    const axis = getBounceAxis({
      prevX: ball.prevX,
      prevY: ball.prevY,
      nextX: bx,
      nextY: by,
      blockX: sx,
      blockY: sy,
      halfWidth: hw,
      halfHeight: hh,
      radius: BALL_RADIUS,
    });

    if (axis === "x") {
      const direction = ball.prevX <= sx ? -1 : 1;
      ball.vx = Math.abs(ball.vx) * direction;
      ball.mesh.position.x = sx + direction * (hw + BALL_RADIUS);
    } else {
      const direction = ball.prevY <= sy ? -1 : 1;
      ball.vy = Math.abs(ball.vy) * direction;
      ball.mesh.position.y = sy + direction * (hh + BALL_RADIUS);
    }
  }

  private saveScore() {
    if (this.score === 0) return;
    const top10 = mergeRanking(this.getRanking(), {
      score: this.score,
      world: this.getWorldName(),
      date: new Date().toLocaleDateString("ja-JP"),
    });
    localStorage.setItem(getRankingStorageKey(this.world), JSON.stringify(top10));
  }

  private getRanking(world = this.rankingWorld): RankingEntry[] {
    const raw = localStorage.getItem(getRankingStorageKey(world));
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
    const frameScale = toFrameStepScale(dt);

    if (this.slowMotionTimer > 0) {
      this.slowMotionTimer -= dt;
      if (this.slowMotionTimer <= 0) this.timeScale = 1;
    }

    if (this.ballSparkTimer > 0) {
      this.ballSparkTimer -= dt;
      this.ballSparkCooldown -= dt;
      if (this.ballSparkCooldown <= 0) {
        const strength = this.progression.ballColorIndex >= BALL_MAX_TIER ? 2.1 : 1.35;
        this.emitBallSparkBurst(strength);
        this.ballSparkCooldown = this.progression.ballColorIndex >= BALL_MAX_TIER ? 0.03 : 0.045;
      }
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
      if (this.initialServePending && this.getActiveBalls().length === 0) {
        const ball = this.getPrimaryBall();
        ball.mesh.position.x = this.paddle.x;
        ball.mesh.position.y = this.paddle.y + 0.5;
      }

      for (const ball of [...this.getActiveBalls()]) {
        this.syncBallDistanceSpeed(ball);
        const lost = ball.update(frameScale * this.timeScale);
        if (!lost) continue;
        ball.deactivate();
        if (this.balls.length > 1) {
          this.balls = this.balls.filter((candidate) => candidate !== ball);
          ball.dispose();
        }
      }

      if (!this.initialServePending && this.getActiveBalls().length === 0) {
        this.shake(0.9, 0.45);
        this.multiFlash(6, 70, ["#ff0022", "#ffffff", "#880000"]);
        this.state = "gameover";
        this.saveScore();
        this.vibrate([40, 30, 60]);
        setTimeout(() => {
          this.showOverlay(
            "飲まれた",
            `得点: ${this.score}`,
            "返し板を戻して、もう一度通せ",
            "もう一度通す",
            () => this.startNewGame(this.world),
            "銀河選択",
            () => this.showStartScreen()
          );
        }, 500);
      }

      this.checkBallPaddle();
      this.checkBallBlocks();
      for (const ball of this.getActiveBalls()) {
        this.syncBallDistanceSpeed(ball);
      }
      this.starField.update();
      for (const ball of this.balls) {
        ball.updateTrail(frameScale);
      }
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
