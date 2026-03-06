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

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(0x0a0a1a);

    const aspect = window.innerWidth / window.innerHeight;
    const viewH = GAME_HEIGHT;
    const viewW = viewH * aspect;
    this.camera = new THREE.OrthographicCamera(
      -viewW / 2, viewW / 2, viewH / 2, -viewH / 2, 0.1, 100
    );
    this.camera.position.z = 20;

    this.scene = new THREE.Scene();
    this.scene.add(new THREE.AmbientLight(0x404060, 1.5));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 10, 15);
    this.scene.add(dirLight);

    this.paddle = new Paddle();
    this.scene.add(this.paddle.mesh);

    this.ball = new Ball();
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

  private createWalls() {
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x222244,
      emissive: 0x111133,
      emissiveIntensity: 0.3,
    });
    const leftWall = new THREE.Mesh(
      new THREE.BoxGeometry(WALL_THICKNESS, GAME_HEIGHT, 1),
      wallMat
    );
    leftWall.position.set(-GAME_WIDTH / 2 - WALL_THICKNESS / 2, 0, 0);
    this.scene.add(leftWall);

    const rightWall = new THREE.Mesh(
      new THREE.BoxGeometry(WALL_THICKNESS, GAME_HEIGHT, 1),
      wallMat
    );
    rightWall.position.set(GAME_WIDTH / 2 + WALL_THICKNESS / 2, 0, 0);
    this.scene.add(rightWall);

    const topWall = new THREE.Mesh(
      new THREE.BoxGeometry(GAME_WIDTH + WALL_THICKNESS * 2, WALL_THICKNESS, 1),
      wallMat
    );
    topWall.position.set(0, GAME_HEIGHT / 2 + WALL_THICKNESS / 2, 0);
    this.scene.add(topWall);
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
    this.ball.speed = 0.12;
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
      const angle = Math.PI / 2 - hitPos * (Math.PI / 3);
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
      const scale = block.mesh.scale.x;

      // AABB collision with scaled block
      const hw = bhw * scale;
      const hh = bhh * scale;
      if (
        bx + BALL_RADIUS > sx - hw &&
        bx - BALL_RADIUS < sx + hw &&
        by + BALL_RADIUS > sy - hh &&
        by - BALL_RADIUS < sy + hh
      ) {
        const color = (
          (block.mesh.material as THREE.MeshStandardMaterial).color as THREE.Color
        ).getHex();

        if (this.ball.penetrationRemaining >= block.hp) {
          // Penetrate through: destroy block, reduce counter
          this.ball.penetrationRemaining -= block.hp;
          block.destroy();
          this.particles.burst(sx, sy, color);
          this.score += block.maxHp * 10;
          this.onBlockDestroyed();
        } else if (this.ball.penetrationRemaining > 0) {
          // Partial penetration: deal damage, bounce
          block.hit(this.ball.penetrationRemaining);
          this.ball.penetrationRemaining = 0;
          this.bounceOffBlock(bx, by, sx, sy, hw, hh);
        } else {
          // No penetration: deal 1 damage, bounce
          const destroyed = block.hit(1);
          if (destroyed) {
            this.particles.burst(sx, sy, color);
            this.score += block.maxHp * 10;
            this.onBlockDestroyed();
          }
          this.bounceOffBlock(bx, by, sx, sy, hw, hh);
        }
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
        this.particles.burst(sx, sy, 0xffd700);
        this.score += 200;
        // Star bonus: +1 penetration level
        this.penetrationLevel = Math.min(this.penetrationLevel + 1, MAX_PENETRATION);
        this.ball.updateGlow(this.penetrationLevel);
        this.onBlockDestroyed();
        // Bounce
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
    bx: number, by: number,
    sx: number, sy: number,
    hw: number, hh: number
  ) {
    // Determine which side was hit
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
    }
    this.updateHUD();
  }

  start() {
    this.showOverlay("BOKUZUSHI", "Click to Start", "Mouse / Touch to move paddle");
    this.lastTime = performance.now();
    this.loop();
  }

  private loop = () => {
    requestAnimationFrame(this.loop);
    const now = performance.now();
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    this.paddle.setX(this.mouseX);

    if (this.state === "playing") {
      if (!this.ball.active) {
        this.ball.mesh.position.x = this.paddle.x;
      }

      const lost = this.ball.update();
      if (lost) {
        this.lives--;
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

      if (this.starField.aliveCount === 0 && this.state === "playing") {
        this.state = "roundclear";
        this.showOverlay(
          "ROUND CLEAR!",
          `Round ${this.round} Complete`,
          "Click for Next Round"
        );
      }
    }

    this.particles.update(dt);
    this.renderer.render(this.scene, this.camera);
  };
}
