import * as THREE from "three";
import { BLOCK_WIDTH, BLOCK_HEIGHT, BLOCK_DEPTH } from "./constants";

const HP_BRIGHTNESS = [1.0, 0.85, 0.7, 0.55, 0.4];

export class Block {
  mesh: THREE.Mesh;
  alive = true;
  hp: number;
  maxHp: number;
  row: number;
  baseColor: number;

  constructor(x: number, y: number, color: number, hp: number, row: number) {
    this.hp = hp;
    this.maxHp = hp;
    this.row = row;
    this.baseColor = color;

    const geo = new THREE.BoxGeometry(BLOCK_WIDTH, BLOCK_HEIGHT, BLOCK_DEPTH);
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.15,
      metalness: 0.2,
      roughness: 0.6,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.set(x, y, 0);
    this.updateAppearance();
  }

  hit(damage: number): boolean {
    this.hp -= damage;
    if (this.hp <= 0) {
      this.destroy();
      return true;
    }
    this.updateAppearance();
    return false;
  }

  private updateAppearance() {
    const mat = this.mesh.material as THREE.MeshStandardMaterial;
    const ratio = this.hp / this.maxHp;
    const base = new THREE.Color(this.baseColor);
    mat.color.copy(base).multiplyScalar(0.5 + ratio * 0.5);
    mat.emissiveIntensity = 0.1 + ratio * 0.2;
    // Scale slightly based on HP to show damage
    const s = 0.7 + ratio * 0.3;
    this.mesh.scale.set(s, s, s);
  }

  destroy() {
    this.alive = false;
    this.mesh.visible = false;
  }
}
