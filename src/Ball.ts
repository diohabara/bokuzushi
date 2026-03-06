import * as THREE from "three";
import {
  BALL_RADIUS,
  BALL_SPEED,
  BALL_COLOR,
  GAME_WIDTH,
  GAME_HEIGHT,
  PADDLE_Y,
} from "./constants";

export class Ball {
  mesh: THREE.Mesh;
  vx = 0;
  vy = 0;
  speed = BALL_SPEED;
  penetrationRemaining = 0;
  active = false;
  private glow: THREE.PointLight;

  constructor() {
    const geo = new THREE.SphereGeometry(BALL_RADIUS, 16, 16);
    const mat = new THREE.MeshStandardMaterial({
      color: BALL_COLOR,
      emissive: BALL_COLOR,
      emissiveIntensity: 0.5,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.set(0, PADDLE_Y + 0.5, 0);

    this.glow = new THREE.PointLight(0xffffff, 0.5, 5);
    this.mesh.add(this.glow);
  }

  launch(penetrationLevel: number) {
    if (this.active) return;
    const angle = Math.PI / 2 + (Math.random() - 0.5) * 0.6;
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;
    this.penetrationRemaining = penetrationLevel;
    this.active = true;
  }

  reset(paddleX: number) {
    this.active = false;
    this.vx = 0;
    this.vy = 0;
    this.mesh.position.set(paddleX, PADDLE_Y + 0.5, 0);
  }

  updateGlow(penetrationLevel: number) {
    const intensity = 0.3 + penetrationLevel * 0.2;
    this.glow.intensity = intensity;
    const hue = penetrationLevel / 10;
    const color = new THREE.Color().setHSL(hue * 0.15, 1, 0.6);
    (this.mesh.material as THREE.MeshStandardMaterial).emissive = color;
    (this.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity =
      0.5 + penetrationLevel * 0.15;
    this.glow.color = color;
  }

  update() {
    if (!this.active) return false;
    this.mesh.position.x += this.vx;
    this.mesh.position.y += this.vy;

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
