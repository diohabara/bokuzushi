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
  HITS_BASE,
  HITS_GROWTH,
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

type GameState = "start" | "playing" | "gameover" | "waveclear" | "worldclear";

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
  private level = 1;
  private hitCount = 0;
  private nextLevelHits = HITS_BASE;
  private world = 1;
  private wave = 1;
  private paddleBounces = 0;
  private unlockedWorld = 1;

  // Combo
  private combo = 0;
  private comboTimer = 0;
  private readonly COMBO_TIMEOUT = 2.0;

  private overlay: HTMLElement;
  private overlayTitle: HTMLElement;
  private overlayMessage: HTMLElement;
  private overlaySub: HTMLElement;
  private flashEl: HTMLElement;
  private worldSelectEl: HTMLElement;
  private rainbowBorderEl: HTMLElement;
  private shockwaveEl: HTMLElement;

  private lastTime = 0;
  private mouseX = 0;
  private shakeTimer = 0;
  private shakeIntensity = 0;
  private cameraBasePos = new THREE.Vector3(0, 0, 20);

  private timeScale = 1;
  private slowMotionTimer = 0;

  // Rainbow flash cycle
  private rainbowTimer = 0;

  // Screen zoom effect
  private zoomTarget = 1;
  private zoomCurrent = 1;

  // Background pulse
  private bgPulseTimer = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x050510);

    const aspect = window.innerWidth / window.innerHeight;
    const viewH = GAME_HEIGHT;
    const viewW = viewH * aspect;
    this.camera = new THREE.OrthographicCamera(
      -viewW / 2, viewW / 2, viewH / 2, -viewH / 2, 0.1, 100
    );
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
    this.flashEl = document.getElementById("flash")!;
    this.worldSelectEl = document.getElementById("world-select")!;
    this.rainbowBorderEl = document.getElementById("rainbow-border")!;
    this.shockwaveEl = document.getElementById("shockwave")!;

    this.unlockedWorld = parseInt(localStorage.getItem("bokuzushi_unlocked") ?? "1", 10);
    this.createWorldButtons();
    this.createWalls();
    this.setupInput();
    this.resize();
    window.addEventListener("resize", () => this.resize());

    this.overlay.addEventListener("click", () => this.handleOverlayClick());
    this.overlay.addEventListener("touchend", (e) => {
      e.preventDefault();
      this.handleOverlayClick();
    });

    this.updateHUD();
  }

  private worldButtons: HTMLButtonElement[] = [];

  private createWorldButtons() {
    for (let i = 1; i <= MAX_WORLDS; i++) {
      const theme = WORLD_THEMES[i - 1];
      const btn = document.createElement("button");
      btn.className = "world-btn";
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

      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (i <= this.unlockedWorld) this.startNewGame(i);
      });
      btn.addEventListener("touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
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
      if (i + 1 <= this.unlockedWorld) {
        btn.classList.remove("locked");
        btn.style.opacity = "1";
      } else {
        btn.classList.add("locked");
        btn.style.opacity = "0.3";
      }
    }
  }

  private createWalls() {
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a3a, emissive: 0x0a0a2a, emissiveIntensity: 0.5,
      metalness: 0.8, roughness: 0.3,
    });
    const leftWall = new THREE.Mesh(
      new THREE.BoxGeometry(WALL_THICKNESS, GAME_HEIGHT + WALL_THICKNESS, 1), wallMat
    );
    leftWall.position.set(-GAME_WIDTH / 2 - WALL_THICKNESS / 2, 0, 0);
    this.scene.add(leftWall);
    const rightWall = new THREE.Mesh(
      new THREE.BoxGeometry(WALL_THICKNESS, GAME_HEIGHT + WALL_THICKNESS, 1), wallMat
    );
    rightWall.position.set(GAME_WIDTH / 2 + WALL_THICKNESS / 2, 0, 0);
    this.scene.add(rightWall);
    const topWall = new THREE.Mesh(
      new THREE.BoxGeometry(GAME_WIDTH + WALL_THICKNESS * 2, WALL_THICKNESS, 1), wallMat
    );
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
    window.addEventListener("mousemove", (e) => {
      this.mouseX = this.screenToWorldX(e.clientX);
    });
    window.addEventListener("touchmove", (e) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        this.mouseX = this.screenToWorldX(e.touches[0].clientX);
      }
    }, { passive: false });
    window.addEventListener("click", () => {
      if (this.state === "playing" && !this.ball.active) {
        this.ball.launch();
      }
    });
    window.addEventListener("touchend", () => {
      if (this.state === "playing" && !this.ball.active) {
        this.ball.launch();
      }
    });
  }

  private screenToWorldX(screenX: number): number {
    const ndc = (screenX / window.innerWidth) * 2 - 1;
    const aspect = window.innerWidth / window.innerHeight;
    return ndc * (GAME_HEIGHT * aspect) / 2;
  }

  private resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    const aspect = w / h;
    const viewH = GAME_HEIGHT;
    const viewW = viewH * aspect;
    this.camera.left = -viewW / 2;
    this.camera.right = viewW / 2;
    this.camera.top = viewH / 2;
    this.camera.bottom = -viewH / 2;
    this.camera.updateProjectionMatrix();
  }

  private handleOverlayClick() {
    if (this.state === "start") return;
    if (this.state === "gameover") {
      this.showStartScreen();
    } else if (this.state === "waveclear") {
      this.nextWave();
    } else if (this.state === "worldclear") {
      this.nextWorld();
    }
  }

  private showStartScreen() {
    this.state = "start";
    this.updateWorldButtons();
    this.worldSelectEl.classList.add("show");
    this.showOverlay("星砕き", "ステージを選べ", "BOKUZUSHI");
    this.showRanking();
  }

  private showRanking() {
    let el = document.getElementById("ranking");
    if (!el) {
      el = document.createElement("div");
      el.id = "ranking";
      this.overlay.appendChild(el);
    }
    el.textContent = "";
    const ranking = this.getRanking();
    if (ranking.length === 0) return;

    const title = document.createElement("div");
    title.className = "ranking-title";
    title.textContent = "RANKING";
    el.appendChild(title);

    ranking.forEach((entry, i) => {
      const row = document.createElement("div");
      row.className = "ranking-row";
      const rank = document.createElement("span");
      rank.className = "ranking-rank";
      rank.textContent = `${i + 1}.`;
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

  private getBaseSpeed(): number {
    return Math.min(BALL_SPEED + (this.world - 1) * WORLD_SPEED_BONUS, BALL_MAX_SPEED);
  }

  private getWorldName(): string {
    return WORLD_THEMES[(this.world - 1) % WORLD_THEMES.length].name;
  }

  private colorToHex(colorNum: number): string {
    return "#" + colorNum.toString(16).padStart(6, "0");
  }

  private startNewGame(startWorld: number) {
    this.score = 0;
    this.level = 1;
    this.hitCount = 0;
    this.nextLevelHits = HITS_BASE;
    this.world = startWorld;
    this.wave = 1;
    this.combo = 0;
    this.comboTimer = 0;
    this.paddleBounces = 0;
    this.ball.speed = this.getBaseSpeed();
    this.ball.colorIndex = 0;
    this.ball.applyColor();
    this.ball.updateGlow();
    this.starField.generate(0, this.world - 1);
    this.ball.reset(this.paddle.x);
    this.particles.setWorld(this.world - 1);
    this.worldBg.generate(this.world - 1);
    this.state = "playing";
    this.worldSelectEl.classList.remove("show");
    this.overlay.classList.add("hidden");
    this.updateHUD();
    this.hud.updateBallColor(this.getBallColorHex());
  }

  private getBallColorHex(): string {
    if (this.ball.colorIndex >= BLOCK_COLORS.length) {
      return this.colorToHex(BALL_COLOR_BLACK);
    }
    return this.colorToHex(BLOCK_COLORS[this.ball.colorIndex]);
  }

  private nextWave() {
    this.wave++;
    this.ball.speed = Math.min(this.ball.speed + BALL_SPEED_INCREMENT, BALL_MAX_SPEED);
    this.starField.generate(this.wave - 1, this.world - 1);
    this.ball.reset(this.paddle.x);
    this.state = "playing";
    this.overlay.classList.add("hidden");
    this.updateHUD();
  }

  private nextWorld() {
    this.world++;
    this.wave = 1;
    this.level = 1;
    this.hitCount = 0;
    this.nextLevelHits = HITS_BASE;
    this.combo = 0;
    this.ball.speed = this.getBaseSpeed();
    this.ball.colorIndex = 0;
    this.ball.applyColor();
    this.ball.updateGlow();
    this.starField.generate(0, this.world - 1);
    this.ball.reset(this.paddle.x);
    this.particles.setWorld(this.world - 1);
    this.worldBg.generate(this.world - 1);
    this.state = "playing";
    this.overlay.classList.add("hidden");
    this.updateHUD();
    this.hud.updateBallColor(this.getBallColorHex());
  }

  private showOverlay(title: string, message: string, sub = "") {
    this.overlayTitle.textContent = title;
    this.overlayMessage.textContent = message;
    this.overlaySub.textContent = sub;
    this.overlay.classList.remove("hidden");
  }

  private updateHUD() {
    this.hud.update(
      this.score, this.level, this.ball.colorIndex,
      this.world, this.wave, this.getWorldName()
    );
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
    this.flashEl.style.transition = `opacity ${duration}ms ease-out`;
    this.flashEl.style.opacity = "0";
  }

  private rainbowFlash(duration: number) {
    this.rainbowBorderEl.classList.add("active");
    this.rainbowTimer = duration;
  }

  private multiFlash(count: number, interval: number, colors: string[]) {
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        this.flashScreen(colors[i % colors.length], interval * 0.8, 0.4);
      }, i * interval);
    }
  }

  private startSlowMotion(duration: number) {
    this.timeScale = 0.5;
    this.slowMotionTimer = Math.min(duration, 0.4);
  }

  private triggerShockwave(x: number, y: number) {
    this.shockwaveEl.style.left = `${x}px`;
    this.shockwaveEl.style.top = `${y}px`;
    this.shockwaveEl.classList.remove("active");
    void this.shockwaveEl.offsetWidth;
    this.shockwaveEl.classList.add("active");
  }

  private screenZoom(target: number, returnSpeed = 0.08) {
    this.zoomTarget = target;
    setTimeout(() => { this.zoomTarget = 1; }, 200);
  }

  private worldToScreen(wx: number, wy: number): { x: number; y: number } {
    const aspect = window.innerWidth / window.innerHeight;
    const viewW = GAME_HEIGHT * aspect;
    const sx = ((wx + viewW / 2) / viewW) * window.innerWidth;
    const sy = ((-wy + GAME_HEIGHT / 2) / GAME_HEIGHT) * window.innerHeight;
    return { x: sx, y: sy };
  }

  private addCombo() {
    this.combo++;
    this.comboTimer = this.COMBO_TIMEOUT;

    if (this.combo >= 2) {
      this.hud.showCombo(this.combo);
    }

    if (this.combo === COMBO_ATSU) {
      this.hud.showBigText("アツい!!", "atsu");
      this.multiFlash(3, 80, ["#ff8800", "#ffff00", "#ff4400"]);
      this.shake(0.4, 0.3);
      this.rainbowFlash(1.0);
      this.screenZoom(1.05);
    } else if (this.combo === COMBO_GEKIATSU) {
      this.hud.showBigText("激アツ!!", "gekiatsu");
      this.multiFlash(6, 70, ["#ff0000", "#ff8800", "#ffff00", "#ff0000", "#ff4400", "#ffaa00"]);
      this.shake(0.6, 0.4);
      this.rainbowFlash(2.5);
      this.startSlowMotion(0.3);
      this.screenZoom(1.1);
    } else if (this.combo === COMBO_KAKUHEN) {
      this.hud.showBigText("確変突入!!", "kakuhen");
      this.multiFlash(12, 50, ["#ff0000", "#ff8800", "#ffff00", "#00ff00", "#0088ff", "#ff00ff"]);
      this.shake(0.8, 0.6);
      this.rainbowFlash(4.0);
      this.startSlowMotion(0.5);
      this.screenZoom(1.15);
    } else if (this.combo === COMBO_OOATARI) {
      this.hud.showBigText("大当たり!!!", "kakuhen");
      this.multiFlash(20, 40, ["#ff0000", "#ffffff", "#ff8800", "#ffff00", "#00ff00", "#0088ff", "#ff00ff"]);
      this.shake(1.0, 0.8);
      this.rainbowFlash(6.0);
      this.startSlowMotion(0.8);
      this.screenZoom(1.2);
    } else if (this.combo === COMBO_CHO_GEKIATSU) {
      this.hud.showBigText("超激アツ!!!!", "kakuhen");
      this.multiFlash(30, 30, ["#ff0000", "#ffffff", "#ff8800", "#ffff00", "#00ff00", "#0088ff", "#ff00ff", "#ffffff"]);
      this.shake(1.5, 1.0);
      this.rainbowFlash(10.0);
      this.startSlowMotion(1.0);
      this.screenZoom(1.25);
    } else if (this.combo >= COMBO_FEVER) {
      this.hud.showBigText("F E V E R !!!!", "kakuhen");
      this.multiFlash(40, 25, ["#ff0000", "#ffffff", "#ff8800", "#ffff00", "#00ff00", "#0088ff", "#ff00ff", "#ffffff"]);
      this.shake(2.0, 1.5);
      this.rainbowFlash(15.0);
      this.startSlowMotion(1.5);
      this.screenZoom(1.3);
    }
  }

  private checkBallPaddle() {
    const bx = this.ball.mesh.position.x;
    const by = this.ball.mesh.position.y;
    if (
      this.ball.vy < 0 &&
      by - BALL_RADIUS <= this.paddle.top &&
      by + BALL_RADIUS >= this.paddle.bottom &&
      bx + BALL_RADIUS >= this.paddle.left &&
      bx - BALL_RADIUS <= this.paddle.right
    ) {
      const hitPos = (bx - this.paddle.x) / (PADDLE_WIDTH / 2);
      const clampedHit = Math.max(-0.95, Math.min(0.95, hitPos));
      const angle = Math.PI / 2 - clampedHit * (Math.PI / 3);
      this.ball.vx = Math.cos(angle) * this.ball.speed;
      this.ball.vy = Math.abs(Math.sin(angle) * this.ball.speed);
      this.ball.mesh.position.y = this.paddle.top + BALL_RADIUS;
      this.paddleBounces++;

      // Update paddle color to match ball
      const padMat = this.paddle.mesh.material as THREE.MeshStandardMaterial;
      if (this.ball.colorIndex >= BLOCK_COLORS.length) {
        padMat.color.setHex(BALL_COLOR_BLACK);
        padMat.emissive.setHex(0xbb44ff);
        padMat.emissiveIntensity = 2.0;
      } else {
        const curColor = BLOCK_COLORS[this.ball.colorIndex];
        padMat.color.setHex(curColor);
        padMat.emissive.setHex(curColor);
        padMat.emissiveIntensity = 0.5;
      }
    }
  }

  private getWorldMaxBallTier(): number {
    const theme = WORLD_THEMES[(this.world - 1) % WORLD_THEMES.length];
    // Ball can go 1 tier above the world's max block tier (to penetrate all)
    return Math.min(theme.maxColorTier + 1, BALL_MAX_TIER);
  }

  private onBlockHit() {
    this.hitCount++;
    if (this.hitCount >= this.nextLevelHits) {
      const maxTier = this.getWorldMaxBallTier();
      if (this.ball.colorIndex >= maxTier) {
        // Already at max for this world, don't level up
        return;
      }
      this.level++;
      this.hitCount = 0;
      this.nextLevelHits = HITS_BASE + (this.level - 1) * HITS_GROWTH;
      // Promote ball color to next tier
      this.ball.colorIndex = Math.min(this.ball.colorIndex + 1, maxTier);
      this.ball.applyColor();
      this.ball.updateGlow();
      this.hud.updateBallColor(this.getBallColorHex());
      this.hud.showLevelUp(this.level);
      if (this.ball.colorIndex === BALL_MAX_TIER) {
        // Black awakening - special effects
        this.hud.showBigText("覚醒!!黒", "kakuhen");
        this.multiFlash(12, 50, ["#111111", "#ffffff", "#9933cc", "#ffffff", "#111111", "#8800ff"]);
        this.shake(1.2, 0.8);
        this.rainbowFlash(4.0);
        this.startSlowMotion(0.8);
        this.screenZoom(1.2);
      } else {
        this.multiFlash(4, 80, ["#ffd700", "#ffffff", "#ffaa00", "#ffd700"]);
        this.shake(0.4, 0.3);
        this.screenZoom(1.08);
      }
    }
  }

  private onStarDestroyed(sx: number, sy: number) {
    this.particles.starBurst(sx, sy);
    // Fewer paddle bounces = higher star bonus (speed bonus)
    const starBonus = Math.max(100, 2000 - this.paddleBounces * 30);
    const points = starBonus;
    this.score += points;

    // MEGA effects - star destroyed
    this.shake(1.5, 1.0);
    this.multiFlash(15, 60, ["#ffd700", "#ffffff", "#ff8800", "#ffd700", "#ffffff", "#ffee00", "#ff4400", "#ff00ff"]);
    this.rainbowFlash(5.0);
    this.startSlowMotion(1.5);
    this.screenZoom(1.3);

    const screenPos = this.worldToScreen(sx, sy);
    this.triggerShockwave(screenPos.x, screenPos.y);
    this.hud.showScorePopup(screenPos.x, screenPos.y, points);
    this.hud.showBigText("★ 星砕き ★", "kakuhen");
    this.updateHUD();

    const themeName = this.getWorldName();
    setTimeout(() => {
      if (this.state !== "playing") return;
      if (this.wave >= WAVES_PER_WORLD) {
        this.state = "worldclear";
        // Unlock next world
        if (this.world >= this.unlockedWorld && this.world < MAX_WORLDS) {
          this.unlockedWorld = this.world + 1;
          localStorage.setItem("bokuzushi_unlocked", String(this.unlockedWorld));
          this.updateWorldButtons();
        }
        this.saveScore();
        this.showOverlay(
          `${themeName} 制覇!!`,
          `得点: ${this.score}`,
          "タップで次へ"
        );
      } else {
        this.state = "waveclear";
        this.showOverlay(
          `第${this.wave}波 突破!!`,
          `得点: ${this.score}`,
          "タップで次へ"
        );
      }
    }, 2000);
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
        bx + BALL_RADIUS > sx - bhw &&
        bx - BALL_RADIUS < sx + bhw &&
        by + BALL_RADIUS > sy - bhh &&
        by - BALL_RADIUS < sy + bhh
      ) {
        // Color tier comparison
        const color = (
          (block.mesh.material as THREE.MeshStandardMaterial).color as THREE.Color
        ).getHex();

        let points = 0;

        if (!block.indestructible && this.ball.colorIndex > block.colorIndex) {
          // Ball stronger than block → penetrating destroy (no bounce)
          this.onBlockHit();
          points = block.maxHp * 10;
          block.destroy();
          this.particles.burst(sx, sy, color);
          this.score += points;
          this.addCombo();
          this.shake(0.3, 0.15);
          this.flashScreen("rgba(255,255,255,0.6)", 150, 0.4);
          const screenPos = this.worldToScreen(sx, sy);
          this.triggerShockwave(screenPos.x, screenPos.y);
        } else if (!block.indestructible && this.ball.colorIndex === block.colorIndex) {
          // Same tier → normal destroy (bounce)
          this.onBlockHit();
          const destroyed = block.hit(block.hp);
          if (destroyed) {
            points = block.maxHp * 10;
            this.particles.burst(sx, sy, color);
            this.score += points;
            this.addCombo();
            this.shake(0.3, 0.15);
            this.flashScreen("rgba(255,255,255,0.6)", 150, 0.4);
            const screenPos = this.worldToScreen(sx, sy);
            this.triggerShockwave(screenPos.x, screenPos.y);
          }
          this.bounceOffBlock(bx, by, sx, sy, bhw, bhh);
        } else {
          // Ball weaker than block OR armored block → chip damage (bounce)
          const chipDmg = block.indestructible ? 2 : Math.max(1, this.ball.colorIndex);
          const destroyed = block.hit(chipDmg);
          if (destroyed) {
            this.onBlockHit();
            points = block.maxHp * 10;
            this.particles.burst(sx, sy, color);
            this.score += points;
            this.addCombo();
            this.shake(0.3, 0.15);
          } else {
            this.particles.hitBurst(sx, sy, color);
            this.shake(0.15);
            this.flashScreen("rgba(255,255,255,0.3)", 80);
          }
          this.bounceOffBlock(bx, by, sx, sy, bhw, bhh);
        }

        if (points > 0) {
          const screenPos = this.worldToScreen(sx, sy);
          this.hud.showScorePopup(screenPos.x, screenPos.y, points);
        }
        this.updateHUD();
      }
    }

    // Star collision (always hittable regardless of color)
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
          this.ball.vx = Math.abs(this.ball.vx) * Math.sign(dx);
        } else {
          this.ball.vy = Math.abs(this.ball.vy) * Math.sign(dy);
        }
      }
    }
  }

  private bounceOffBlock(
    bx: number, by: number, sx: number, sy: number, hw: number, hh: number
  ) {
    const overlapLeft = (bx + BALL_RADIUS) - (sx - hw);
    const overlapRight = (sx + hw) - (bx - BALL_RADIUS);
    const overlapTop = (sy + hh) - (by - BALL_RADIUS);
    const overlapBottom = (by + BALL_RADIUS) - (sy - hh);

    // Only consider faces the ball is actually approaching
    let minX = Infinity;
    let minY = Infinity;
    let signX = 0;
    let signY = 0;

    if (this.ball.vx > 0 && overlapLeft < minX) {
      minX = overlapLeft; signX = -1; // hit left face → push left
    }
    if (this.ball.vx < 0 && overlapRight < minX) {
      minX = overlapRight; signX = 1; // hit right face → push right
    }
    if (this.ball.vy > 0 && overlapBottom < minY) {
      minY = overlapBottom; signY = -1; // hit bottom face → push down
    }
    if (this.ball.vy < 0 && overlapTop < minY) {
      minY = overlapTop; signY = 1; // hit top face → push up
    }

    if (minX <= minY && signX !== 0) {
      this.ball.vx = Math.abs(this.ball.vx) * signX;
      this.ball.mesh.position.x += signX * minX;
    } else if (signY !== 0) {
      this.ball.vy = Math.abs(this.ball.vy) * signY;
      this.ball.mesh.position.y += signY * minY;
    } else if (signX !== 0) {
      this.ball.vx = Math.abs(this.ball.vx) * signX;
      this.ball.mesh.position.x += signX * minX;
    } else {
      // Fallback: use original minimum overlap method
      const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
      if (minOverlap === overlapLeft || minOverlap === overlapRight) {
        this.ball.vx = -this.ball.vx;
      } else {
        this.ball.vy = -this.ball.vy;
      }
    }
  }

  private saveScore() {
    if (this.score === 0) return;
    const raw = localStorage.getItem("bokuzushi_ranking");
    const ranking: { score: number; world: string; date: string }[] = raw ? JSON.parse(raw) : [];
    ranking.push({
      score: this.score,
      world: this.getWorldName(),
      date: new Date().toLocaleDateString("ja-JP"),
    });
    ranking.sort((a, b) => b.score - a.score);
    const top10 = ranking.slice(0, 10);
    localStorage.setItem("bokuzushi_ranking", JSON.stringify(top10));
  }

  private getRanking(): { score: number; world: string; date: string }[] {
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
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    // Slow-motion
    if (this.slowMotionTimer > 0) {
      this.slowMotionTimer -= dt;
      if (this.slowMotionTimer <= 0) this.timeScale = 1;
    }
    const scaledDt = dt * this.timeScale;

    // Combo timer
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    // Rainbow border timer
    if (this.rainbowTimer > 0) {
      this.rainbowTimer -= dt;
      if (this.rainbowTimer <= 0) {
        this.rainbowBorderEl.classList.remove("active");
      }
    }

    // Screen zoom interpolation
    this.zoomCurrent += (this.zoomTarget - this.zoomCurrent) * 0.1;
    this.camera.zoom = this.zoomCurrent;
    this.camera.updateProjectionMatrix();

    this.paddle.setTargetX(this.mouseX);
    this.paddle.update();

    if (this.state === "playing") {
      if (!this.ball.active) {
        this.ball.mesh.position.x = this.paddle.x;
      }

      const lost = this.ball.update(this.timeScale);
      if (lost) {
        // No lives - instant game over
        this.shake(1.0, 0.5);
        this.multiFlash(8, 60, ["#ff0022", "#ffffff", "#ff0022", "#880000"]);
        this.state = "gameover";
        this.saveScore();
        setTimeout(() => {
          this.showOverlay("終了", `得点: ${this.score}`, "タップでやり直し");
        }, 500);
      }

      this.checkBallPaddle();
      this.checkBallBlocks();
      this.starField.update();
      this.ball.updateTrail();
    }

    // Camera shake
    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      const t = Math.max(0, this.shakeTimer / SHAKE_DURATION);
      this.camera.position.x = this.cameraBasePos.x + (Math.random() - 0.5) * this.shakeIntensity * t;
      this.camera.position.y = this.cameraBasePos.y + (Math.random() - 0.5) * this.shakeIntensity * t;
      // Also rotate camera slightly for extra drama
      this.camera.rotation.z = (Math.random() - 0.5) * this.shakeIntensity * t * 0.02;
    } else {
      this.camera.position.x = this.cameraBasePos.x;
      this.camera.position.y = this.cameraBasePos.y;
      this.camera.rotation.z = 0;
      this.shakeIntensity = 0;
    }

    this.worldBg.update(dt);
    this.particles.update(scaledDt);
    this.renderer.render(this.scene, this.camera);
  };
}
