import * as THREE from "three";
import { BLOCK_WIDTH, BLOCK_HEIGHT, BLOCK_DEPTH } from "./constants";

export class Block {
  mesh: THREE.Mesh;
  alive = true;
  hp: number;
  maxHp: number;
  row: number;
  colorIndex: number; // index into BLOCK_COLORS

  constructor(x: number, y: number, color: number, colorIndex: number, hp: number, row: number) {
    this.hp = hp;
    this.maxHp = hp;
    this.row = row;
    this.colorIndex = colorIndex;

    const geo = new THREE.BoxGeometry(BLOCK_WIDTH, BLOCK_HEIGHT, BLOCK_DEPTH, 2, 2, 1);
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.3,
      metalness: 0.4,
      roughness: 0.4,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.set(x, y, 0);
  }

  hit(damage: number): boolean {
    this.hp -= damage;
    if (this.hp <= 0) {
      this.destroy();
      return true;
    }
    // Hit flash - bright white flash
    const mat = this.mesh.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = 2.0;
    const originalScale = this.mesh.scale.x;
    this.mesh.scale.setScalar(1.3);
    setTimeout(() => {
      if (this.alive) {
        mat.emissiveIntensity = 0.3;
        this.mesh.scale.setScalar(originalScale);
      }
    }, 100);
    return false;
  }

  destroy() {
    this.alive = false;
    this.mesh.visible = false;
  }
}
