import * as THREE from "three";
import { BLOCK_WIDTH, BLOCK_HEIGHT, BLOCK_DEPTH } from "./constants";

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

    // Create block with beveled look using slightly smaller inner geometry
    const geo = new THREE.BoxGeometry(BLOCK_WIDTH, BLOCK_HEIGHT, BLOCK_DEPTH, 2, 2, 1);
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.2,
      metalness: 0.4,
      roughness: 0.4,
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
    // Hit flash
    const mat = this.mesh.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = 1.0;
    setTimeout(() => {
      if (this.alive) mat.emissiveIntensity = 0.1 + (this.hp / this.maxHp) * 0.3;
    }, 80);
    return false;
  }

  private updateAppearance() {
    const mat = this.mesh.material as THREE.MeshStandardMaterial;
    const ratio = this.hp / this.maxHp;
    const base = new THREE.Color(this.baseColor);
    mat.color.copy(base).multiplyScalar(0.5 + ratio * 0.5);
    mat.emissiveIntensity = 0.1 + ratio * 0.3;
  }

  destroy() {
    this.alive = false;
    this.mesh.visible = false;
  }
}
