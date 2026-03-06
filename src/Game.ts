import * as THREE from "three";
import { Paddle } from "./Paddle";
import { Ball } from "./Ball";
import { StarField } from "./StarField";
import { HUD } from "./HUD";
import { Particles } from "./Particles";
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  WALL_THICKNESS,
  BALL_RADIUS,
  BALL_SPEED_INCREMENT,
  BALL_MAX_SPEED,
  INITIAL_LIVES,
  BLOCKS_PER_LEVEL,
  MAX_PENETRATION,
  PADDLE_WIDTH,
  BLOCK_WIDTH,
  BLOCK_HEIGHT,
  BG_STAR_COUNT,
  SHAKE_INTENSITY,
  SHAKE_DURATION,
} from "./constants";

type GameState = "start" | "playing" | "gameover" | "roundclear";

export class Game {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private paddle: Paddle;
  private ball: Ball;
  private starField: StarField;
  private hud: HUD;
  private particles: Particles;

  private state: GameState = "start";
  private score = 0;
  private level = 1;
  private penetrationLevel = 0;
  private lives = INITIAL_LIVES;
  private blocksDestroyed = 0;
  private round = 1;

  private overlay: HTMLElement;
  private overlayTitle: HTMLElement;
  private overlayMessage: HTMLElement;
  private overlaySub: HTMLElement;

  private lastTime = 0;
  private mouseX = 0;
  private shakeTimer = 0;
  private shakeIntensity = 0;
  private cameraBasePos = new THREE.Vector3(0, 0, 20);

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

    // Lighting
    this.scene.add(new THREE.AmbientLight(0x303050, 1.2));
    const dirLight = new THREE.DirectionalLight(0xeeeeff, 0.8);
    dirLight.position.set(5, 10, 15);
    this.scene.add(dirLight);
    const rimLight = new THREE.DirectionalLight(0x4466ff, 0.3);
    rimLight.position.set(-5, -5, 10);
    this.scene.add(rimLight);

    this.createBackgroundStars();

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

  private createBackgroundStars() {
    const geo = new THREE.SphereGeometry(0.04, 4, 4);
    for (let i = 0; i < BG_STAR_COUNT; i++) {
      const brightness = 0.3 + Math.random() * 0.7;
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(brightness, brightness, brightness * 1.2),
        transparent: true,
        opacity: 0.3 + Math.random() * 0.5,
      });
      const star = new THREE.Mesh(geo, mat);
      star.position.set(
        (Math.random() - 0.5) * GAME_WIDTH * 1.5,
        (Math.random() - 0.5) * GAME_HEIGHT * 1.2,
        -5 - Math.random() * 10
      );
      star.scale.setScalar(0.5 + Math.random() * 2);
      this.scene.add(star);
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

    // Left wall
    const leftWall = new THREE.Mesh(
      new THREE.BoxGeometry(WALL_THICKNESS, GAME_HEIGHT + WALL_THICKNESS, 1),
      wallMat
    );
    leftWall.position.set(-GAME_WIDTH / 2 - WALL_THICKNESS / 2, 0, 0);
    this.scene.add(leftWall);

    // Right wall
    const rightWall = new THREE.Mesh(
      new THREE.BoxGeometry(WALL_THICKNESS, GAME_HEIGHT + WALL_THICKNESS, 1),
      wallMat
    );
    rightWall.position.set(GAME_WIDTH / 2 + WALL_THICKNESS / 2, 0, 0);
    this.scene.add(rightWall);

    // Top wall
    const topWall = new THREE.Mesh(
      new THREE.BoxGeometry(GAME_WIDTH + WALL_THICKNESS * 2, WALL_THICKNESS, 1),
      wallMat
    );
    topWall.position.set(0, GAME_HEIGHT / 2 + WALL_THICKNESS / 2, 0);
    this.scene.add(topWall);

    // Subtle edge glow on walls
    const edgeMat = new THREE.MeshBasicMaterial({
      color: 0x2244aa,
      transparent: true,
      opacity: 0.15,
    });
    const leftEdge = new THREE.Mesh(
      new THREE.PlaneGeometry(0.1, GAME_HEIGHT),
      edgeMat
    );
    leftEdge.position.set(-GAME_WIDTH / 2 + 0.05, 0, 0.1);
    this.scene.add(leftEdge);

    const rightEdge = new THREE.Mesh(
      new THREE.PlaneGeometry(0.1, GAME_HEIGHT),
      edgeMat
    );
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
        this.ball.launch(this.penetrationLevel);
      }
    });
    window.addEventListener("touchend", () => {
      if (this.state === "playing" && !this.ball.active) {
        this.ball.launch(this.penetrationLevel);
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
    if (this.state === "start" || this.state === "gameover") {
      this.startNewGame();
    } else if (this.state === "roundclear") {
      this.nextRound();
    }
  }

  private startNewGame() {
    this.score = 0;
    this.level = 1;
    this.penetrationLevel = 0;
    this.lives = INITIAL_LIVES;
    this.blocksDestroyed = 0;
    this.round = 1;
    this.ball.speed = 0.1;
    this.ball.updateGlow(0);
    this.starField.generate();
    this.ball.reset(this.paddle.x);
    this.state = "playing";
    this.overlay.classList.add("hidden");
    this.updateHUD();
  }

  private nextRound() {
    this.round++;
    this.ball.speed = Math.min(
      this.ball.speed + BALL_SPEED_INCREMENT,
      BALL_MAX_SPEED
    );
    this.starField.generate();
    this.ball.reset(this.paddle.x);
    this.state = "playing";
    this.overlay.classList.add("hidden");
    this.updateHUD();
  }

  private showOverlay(title: string, message: string, sub = "") {
    this.overlayTitle.textContent = title;
    this.overlayMessage.textContent = message;
    this.overlaySub.textContent = sub;
    this.overlay.classList.remove("hidden");
  }

  private updateHUD() {
    this.hud.update(this.score, this.level, this.penetrationLevel, this.lives);
  }

  private shake(intensity = SHAKE_INTENSITY) {
    this.shakeTimer = SHAKE_DURATION;
    this.shakeIntensity = intensity;
  }

  private worldToScreen(wx: number, wy: number): { x: number; y: number } {
    const aspect = window.innerWidth / window.innerHeight;
    const viewW = GAME_HEIGHT * aspect;
    const sx = ((wx + viewW / 2) / viewW) * window.innerWidth;
    const sy = ((-wy + GAME_HEIGHT / 2) / GAME_HEIGHT) * window.innerHeight;
    return { x: sx, y: sy };
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
      this.ball.penetrationRemaining = this.penetrationLevel;
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
        bx + BALL_RADIUS > sx - bhw &&
        bx - BALL_RADIUS < sx + bhw &&
        by + BALL_RADIUS > sy - bhh &&
        by - BALL_RADIUS < sy + bhh
      ) {
        const color = (
          (block.mesh.material as THREE.MeshStandardMaterial).color as THREE.Color
        ).getHex();

        let points = 0;
        if (this.ball.penetrationRemaining >= block.hp) {
          // Penetrate through
          this.ball.penetrationRemaining -= block.hp;
          points = block.maxHp * 10;
          block.destroy();
          this.particles.burst(sx, sy, color);
          this.score += points;
          this.onBlockDestroyed();
          this.shake(0.08);
        } else if (this.ball.penetrationRemaining > 0) {
          // Partial penetration
          block.hit(this.ball.penetrationRemaining);
          this.ball.penetrationRemaining = 0;
          this.bounceOffBlock(bx, by, sx, sy, bhw, bhh);
          this.shake(0.05);
        } else {
          // Normal hit
          const destroyed = block.hit(1);
          if (destroyed) {
            points = block.maxHp * 10;
            this.particles.burst(sx, sy, color);
            this.score += points;
            this.onBlockDestroyed();
            this.shake(0.08);
          } else {
            this.shake(0.03);
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

    // Check star collision
    const star = this.starField.star;
    if (star?.alive) {
      const sx = star.mesh.position.x;
      const sy = star.mesh.position.y;
      const dist = Math.sqrt((bx - sx) ** 2 + (by - sy) ** 2);
      if (dist < BALL_RADIUS + star.boundingRadius) {
        star.destroy();
        this.particles.starBurst(sx, sy);
        const points = 200;
        this.score += points;
        this.penetrationLevel = Math.min(this.penetrationLevel + 1, MAX_PENETRATION);
        this.ball.updateGlow(this.penetrationLevel);
        this.onBlockDestroyed();
        this.shake(0.25);
        const screenPos = this.worldToScreen(sx, sy);
        this.hud.showScorePopup(screenPos.x, screenPos.y, points);
        this.hud.showLevelUp(this.level);
        // Bounce
        const dx = bx - sx;
        const dy = by - sy;
        if (Math.abs(dx) > Math.abs(dy)) {
          this.ball.vx = Math.abs(this.ball.vx) * Math.sign(dx);
        } else {
          this.ball.vy = Math.abs(this.ball.vy) * Math.sign(dy);
        }
        this.updateHUD();
      }
    }
  }

  private bounceOffBlock(
    bx: number, by: number,
    sx: number, sy: number,
    hw: number, hh: number
  ) {
    const overlapLeft = (bx + BALL_RADIUS) - (sx - hw);
    const overlapRight = (sx + hw) - (bx - BALL_RADIUS);
    const overlapTop = (sy + hh) - (by - BALL_RADIUS);
    const overlapBottom = (by + BALL_RADIUS) - (sy - hh);
    const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

    if (minOverlap === overlapLeft || minOverlap === overlapRight) {
      this.ball.vx = -this.ball.vx;
    } else {
      this.ball.vy = -this.ball.vy;
    }
  }

  private onBlockDestroyed() {
    this.blocksDestroyed++;
    if (this.blocksDestroyed % BLOCKS_PER_LEVEL === 0) {
      this.level++;
      this.penetrationLevel = Math.min(this.penetrationLevel + 1, MAX_PENETRATION);
      this.ball.updateGlow(this.penetrationLevel);
      this.hud.showLevelUp(this.level);
    }
  }

  start() {
    this.showOverlay("BOKUZUSHI", "CLICK TO START", "Star Breaker");
    this.lastTime = performance.now();
    this.loop();
  }

  private loop = () => {
    requestAnimationFrame(this.loop);
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    this.paddle.setTargetX(this.mouseX);
    this.paddle.update();

    if (this.state === "playing") {
      if (!this.ball.active) {
        this.ball.mesh.position.x = this.paddle.x;
      }

      const lost = this.ball.update();
      if (lost) {
        this.lives--;
        this.shake(0.3);
        this.updateHUD();
        if (this.lives <= 0) {
          this.state = "gameover";
          this.showOverlay("GAME OVER", `Score: ${this.score}`, "Click to Retry");
        } else {
          this.ball.reset(this.paddle.x);
        }
      }

      this.checkBallPaddle();
      this.checkBallBlocks();
      this.starField.update();
      this.ball.updateTrail();

      if (this.starField.aliveCount === 0 && this.state === "playing") {
        this.state = "roundclear";
        this.showOverlay(
          `ROUND ${this.round} CLEAR!`,
          `Score: ${this.score}`,
          "Click for Next Round"
        );
      }
    }

    // Camera shake
    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      const t = this.shakeTimer / SHAKE_DURATION;
      this.camera.position.x = this.cameraBasePos.x + (Math.random() - 0.5) * this.shakeIntensity * t;
      this.camera.position.y = this.cameraBasePos.y + (Math.random() - 0.5) * this.shakeIntensity * t;
    } else {
      this.camera.position.x = this.cameraBasePos.x;
      this.camera.position.y = this.cameraBasePos.y;
    }

    this.particles.update(dt);
    this.renderer.render(this.scene, this.camera);
  };
}
