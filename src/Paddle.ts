import * as THREE from "three";
import {
  PADDLE_WIDTH,
  PADDLE_HEIGHT,
  PADDLE_DEPTH,
  PADDLE_Y,
  PADDLE_COLOR,
  GAME_WIDTH,
} from "./constants";

export class Paddle {
  mesh: THREE.Mesh;
  private halfWidth = PADDLE_WIDTH / 2;
  private targetX = 0;

  constructor() {
    const geo = new THREE.BoxGeometry(PADDLE_WIDTH, PADDLE_HEIGHT, PADDLE_DEPTH);
    // Rounded edges feel
    const mat = new THREE.MeshStandardMaterial({
      color: PADDLE_COLOR,
      emissive: PADDLE_COLOR,
      emissiveIntensity: 0.4,
      metalness: 0.6,
      roughness: 0.2,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.set(0, PADDLE_Y, 0);
  }

  setTargetX(x: number) {
    this.targetX = x;
  }

  update() {
    // Smooth follow
    const limit = GAME_WIDTH / 2 - this.halfWidth;
    const clamped = Math.max(-limit, Math.min(limit, this.targetX));
    this.mesh.position.x += (clamped - this.mesh.position.x) * 0.25;
  }

  get left() {
    return this.mesh.position.x - this.halfWidth;
  }
  get right() {
    return this.mesh.position.x + this.halfWidth;
  }
  get top() {
    return this.mesh.position.y + PADDLE_HEIGHT / 2;
  }
  get bottom() {
    return this.mesh.position.y - PADDLE_HEIGHT / 2;
  }
  get x() {
    return this.mesh.position.x;
  }
}
