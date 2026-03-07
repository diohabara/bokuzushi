import * as THREE from "three";
import {
  BALL_RADIUS,
  BALL_SPEED,
  GAME_WIDTH,
  GAME_HEIGHT,
  PADDLE_Y,
  BLOCK_COLORS,
  BALL_COLOR_BLACK,
} from "./constants";

export class Ball {
  mesh: THREE.Mesh;
  trail: THREE.Mesh[] = [];
  prevX = 0;
  prevY = 0;
  vx = 0;
  vy = 0;
  speed = BALL_SPEED;
  active = false;
  colorIndex = 0; // color strength tier (0=green weakest, 6=violet, 7=black strongest)
  private glow: THREE.PointLight;
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    const geo = new THREE.SphereGeometry(BALL_RADIUS, 16, 16);
    const color = BLOCK_COLORS[0];
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 1.0,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.set(0, PADDLE_Y + 0.5, 0);

    this.glow = new THREE.PointLight(color, 2, 8);
    this.mesh.add(this.glow);
  }

  applyColor() {
    const mat = this.mesh.material as THREE.MeshStandardMaterial;
    if (this.colorIndex >= BLOCK_COLORS.length) {
      // Black ball - dark aura with bright purple glow
      mat.color.setHex(BALL_COLOR_BLACK);
      mat.emissive.setHex(0xbb44ff);
      mat.emissiveIntensity = 3.0;
      this.glow.color.setHex(0xcc66ff);
      this.glow.intensity = 8;
      this.glow.distance = 16;
    } else {
      const color = BLOCK_COLORS[this.colorIndex];
      mat.color.setHex(color);
      mat.emissive.setHex(color);
      mat.emissiveIntensity = 1.0;
      this.glow.color.setHex(color);
    }
  }

  launch() {
    if (this.active) return;
    const angle = Math.PI / 2 + (Math.random() - 0.5) * 0.6;
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;
    this.active = true;
  }

  reset(paddleX: number, paddleY = PADDLE_Y) {
    this.active = false;
    this.vx = 0;
    this.vy = 0;
    this.mesh.position.set(paddleX, paddleY + 0.5, 0);
    this.prevX = paddleX;
    this.prevY = paddleY + 0.5;
    this.clearTrail();
  }

  updateGlow() {
    const tier = this.colorIndex;
    if (tier >= BLOCK_COLORS.length) {
      // Black tier: intense glow
      this.glow.intensity = 6;
      this.glow.distance = 20;
      const mat = this.mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 2.5;
      this.mesh.scale.setScalar(1.5);
    } else {
      const intensity = 2 + tier * 1.0;
      this.glow.intensity = intensity;
      this.glow.distance = 8 + tier * 2.0;
      const mat = this.mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 1.0 + tier * 0.3;
      const scale = 1 + tier * 0.06;
      this.mesh.scale.setScalar(scale);
    }
  }

  private clearTrail() {
    for (const t of this.trail) {
      this.scene.remove(t);
    }
    this.trail = [];
  }

  updateTrail() {
    if (!this.active) return;
    const color = this.colorIndex >= BLOCK_COLORS.length
      ? BALL_COLOR_BLACK : BLOCK_COLORS[this.colorIndex];
    // Add trail dot
    const geo = new THREE.SphereGeometry(BALL_RADIUS * 0.6, 6, 6);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.6,
    });
    const dot = new THREE.Mesh(geo, mat);
    dot.position.copy(this.mesh.position);
    this.scene.add(dot);
    this.trail.push(dot);

    // Fade and remove old trail
    for (let i = this.trail.length - 1; i >= 0; i--) {
      const m = this.trail[i].material as THREE.MeshBasicMaterial;
      m.opacity -= 0.04;
      if (m.opacity <= 0) {
        this.scene.remove(this.trail[i]);
        this.trail.splice(i, 1);
      }
    }
  }

  update(timeScale = 1) {
    if (!this.active) return false;
    this.prevX = this.mesh.position.x;
    this.prevY = this.mesh.position.y;
    this.mesh.position.x += this.vx * timeScale;
    this.mesh.position.y += this.vy * timeScale;

    const hw = GAME_WIDTH / 2 - BALL_RADIUS;
    if (this.mesh.position.x <= -hw) {
      this.mesh.position.x = -hw;
      this.vx = Math.abs(this.vx);
    } else if (this.mesh.position.x >= hw) {
      this.mesh.position.x = hw;
      this.vx = -Math.abs(this.vx);
    }

    const top = GAME_HEIGHT / 2 - BALL_RADIUS;
    if (this.mesh.position.y >= top) {
      this.mesh.position.y = top;
      this.vy = -Math.abs(this.vy);
    }

    if (this.mesh.position.y < -GAME_HEIGHT / 2 - 1) {
      return true; // ball lost
    }
    return false;
  }
}
