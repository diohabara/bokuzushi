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

const LAUNCH_BASE_ANGLE = Math.PI / 2;
const LAUNCH_SPREAD = 0.6;
const DEFAULT_AVOID_WINDOW = 0.22;
const MIN_LAUNCH_SEGMENT = 0.02;

export interface BallLaunchOptions {
  avoidAngle?: number;
  avoidWindow?: number;
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function normalizeAngleDelta(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

export function selectLaunchAngle(options: BallLaunchOptions = {}) {
  const minAngle = LAUNCH_BASE_ANGLE - LAUNCH_SPREAD / 2;
  const maxAngle = LAUNCH_BASE_ANGLE + LAUNCH_SPREAD / 2;
  const { avoidAngle, avoidWindow = DEFAULT_AVOID_WINDOW } = options;

  if (avoidAngle === undefined || avoidWindow <= 0) {
    return randomBetween(minAngle, maxAngle);
  }

  const adjustedAvoidAngle =
    LAUNCH_BASE_ANGLE + normalizeAngleDelta(avoidAngle - LAUNCH_BASE_ANGLE);
  const leftMax = Math.min(maxAngle, adjustedAvoidAngle - avoidWindow);
  const rightMin = Math.max(minAngle, adjustedAvoidAngle + avoidWindow);
  const leftSpan = Math.max(0, leftMax - minAngle);
  const rightSpan = Math.max(0, maxAngle - rightMin);
  const totalSpan = leftSpan + rightSpan;

  if (totalSpan < MIN_LAUNCH_SEGMENT) {
    return randomBetween(minAngle, maxAngle);
  }

  const laneRoll = Math.random() * totalSpan;
  if (laneRoll < leftSpan) {
    return randomBetween(minAngle, leftMax);
  }
  return randomBetween(rightMin, maxAngle);
}

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
  private trailGeo: THREE.SphereGeometry;
  private aura: THREE.Mesh;
  private core: THREE.Mesh;
  private trailCursor = 0;

  private static readonly TRAIL_POOL_SIZE = 24;
  private static readonly TRAIL_OPACITY = 0.82;
  private static readonly TRAIL_FADE_STEP = 0.055;

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
    this.mesh.renderOrder = 10;

    const auraGeo = new THREE.SphereGeometry(BALL_RADIUS * 1.9, 12, 12);
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });
    this.aura = new THREE.Mesh(auraGeo, auraMat);
    this.aura.renderOrder = 9;
    this.mesh.add(this.aura);

    const coreGeo = new THREE.SphereGeometry(BALL_RADIUS * 0.35, 10, 10);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    });
    this.core = new THREE.Mesh(coreGeo, coreMat);
    this.core.position.z = BALL_RADIUS * 0.4;
    this.core.renderOrder = 11;
    this.mesh.add(this.core);

    this.glow = new THREE.PointLight(color, 2, 8);
    this.mesh.add(this.glow);

    this.trailGeo = new THREE.SphereGeometry(BALL_RADIUS * 0.6, 6, 6);
    for (let i = 0; i < Ball.TRAIL_POOL_SIZE; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0,
      });
      const dot = new THREE.Mesh(this.trailGeo, mat);
      dot.visible = false;
      dot.renderOrder = 8;
      this.scene.add(dot);
      this.trail.push(dot);
    }
  }

  applyColor() {
    const mat = this.mesh.material as THREE.MeshStandardMaterial;
    if (this.colorIndex >= BLOCK_COLORS.length) {
      // Black tier should keep a black body but show a white rim so it never vanishes into the background.
      mat.color.setHex(BALL_COLOR_BLACK);
      mat.emissive.setHex(0x2a2a2a);
      mat.emissiveIntensity = 0.38;
      mat.metalness = 0.35;
      mat.roughness = 0.1;
      this.glow.color.setHex(0xffffff);
      this.glow.intensity = 2.1;
      this.glow.distance = 6.2;
      (this.aura.material as THREE.MeshBasicMaterial).color.setHex(0xffffff);
      (this.core.material as THREE.MeshBasicMaterial).color.setHex(0xffffff);
    } else {
      const color = BLOCK_COLORS[this.colorIndex];
      mat.color.setHex(color);
      mat.emissive.setHex(color);
      mat.emissiveIntensity = 1.0;
      mat.metalness = 0;
      mat.roughness = 1;
      this.glow.color.setHex(color);
      (this.aura.material as THREE.MeshBasicMaterial).color.setHex(0xffffff);
      (this.core.material as THREE.MeshBasicMaterial).color.setHex(0xffffff);
    }
  }

  launch(options: BallLaunchOptions = {}) {
    if (this.active) return;
    const angle = selectLaunchAngle(options);
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
    const auraMat = this.aura.material as THREE.MeshBasicMaterial;
    if (tier >= BLOCK_COLORS.length) {
      // White rim for contrast while keeping the body black.
      this.glow.intensity = 1.8;
      this.glow.distance = 6.2;
      const mat = this.mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.34;
      this.mesh.scale.setScalar(1.32);
      auraMat.opacity = 0.48;
      this.aura.scale.setScalar(1.52);
      this.core.scale.setScalar(1.08);
    } else {
      const intensity = 2 + tier * 1.0;
      this.glow.intensity = intensity;
      this.glow.distance = 8 + tier * 2.0;
      const mat = this.mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 1.0 + tier * 0.3;
      const scale = 1 + tier * 0.06;
      this.mesh.scale.setScalar(scale);
      auraMat.opacity = 0.18 + tier * 0.02;
      this.aura.scale.setScalar(1.1 + tier * 0.04);
      this.core.scale.setScalar(1);
    }
  }

  private clearTrail() {
    for (const t of this.trail) {
      const material = t.material as THREE.MeshBasicMaterial;
      material.opacity = 0;
      t.visible = false;
    }
    this.trailCursor = 0;
  }

  updateTrail() {
    if (!this.active) return;
    const color = this.colorIndex >= BLOCK_COLORS.length
      ? 0xe7dcff : 0xffffff;

    const dot = this.trail[this.trailCursor];
    const dotMaterial = dot.material as THREE.MeshBasicMaterial;
    dotMaterial.color.setHex(color);
    dotMaterial.opacity = Ball.TRAIL_OPACITY;
    dot.visible = true;
    dot.position.copy(this.mesh.position);
    dot.scale.copy(this.mesh.scale).multiplyScalar(1.08);
    this.trailCursor = (this.trailCursor + 1) % this.trail.length;

    for (const trailMesh of this.trail) {
      if (!trailMesh.visible) continue;
      const material = trailMesh.material as THREE.MeshBasicMaterial;
      material.opacity = Math.max(0, material.opacity - Ball.TRAIL_FADE_STEP);
      if (material.opacity <= 0.02) {
        trailMesh.visible = false;
      }
    }
  }

  update(timeScale = 1) {
    if (!this.active) return false;
    const time = performance.now() * 0.001;
    const auraBase = this.colorIndex >= BLOCK_COLORS.length
      ? 1.35
      : 1.1 + this.colorIndex * 0.04;
    const coreBase = this.colorIndex >= BLOCK_COLORS.length ? 1.15 : 1;
    this.aura.scale.setScalar(auraBase + Math.sin(time * 7) * 0.05);
    this.core.scale.setScalar(coreBase + Math.sin(time * 11) * 0.04);
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
