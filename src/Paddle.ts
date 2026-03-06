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

  constructor() {
    const geo = new THREE.BoxGeometry(PADDLE_WIDTH, PADDLE_HEIGHT, PADDLE_DEPTH);
    const mat = new THREE.MeshStandardMaterial({
      color: PADDLE_COLOR,
      emissive: PADDLE_COLOR,
      emissiveIntensity: 0.3,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.set(0, PADDLE_Y, 0);
  }

  setX(x: number) {
    const limit = GAME_WIDTH / 2 - this.halfWidth;
    this.mesh.position.x = Math.max(-limit, Math.min(limit, x));
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
