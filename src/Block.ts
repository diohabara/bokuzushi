import * as THREE from "three";
import {
  BLOCK_WIDTH, BLOCK_HEIGHT, BLOCK_DEPTH,
  INDESTRUCTIBLE_COLOR, INDESTRUCTIBLE_EMISSIVE, INDESTRUCTIBLE_COLOR_INDEX,
} from "./constants";

export class Block {
  mesh: THREE.Mesh;
  alive = true;
  hp: number;
  maxHp: number;
  row: number;
  colorIndex: number;
  indestructible: boolean;
  private pulsePhase = Math.random() * Math.PI * 2;
  private edgeGlow: THREE.LineSegments | null = null;

  constructor(x: number, y: number, color: number, colorIndex: number, hp: number, row: number) {
    this.hp = hp;
    this.maxHp = hp;
    this.row = row;
    this.colorIndex = colorIndex;
    this.indestructible = colorIndex === INDESTRUCTIBLE_COLOR_INDEX;

    const geo = new THREE.BoxGeometry(BLOCK_WIDTH, BLOCK_HEIGHT, BLOCK_DEPTH, 2, 2, 1);

    let mat: THREE.MeshStandardMaterial;
    if (this.indestructible) {
      mat = new THREE.MeshStandardMaterial({
        color: INDESTRUCTIBLE_COLOR,
        emissive: INDESTRUCTIBLE_EMISSIVE,
        emissiveIntensity: 0.8,
        metalness: 0.7,
        roughness: 0.15,
      });
      // Glowing edge wireframe (white, shifts with rainbow)
      const edgeGeo = new THREE.EdgesGeometry(geo);
      const edgeMat = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.9,
      });
      this.edgeGlow = new THREE.LineSegments(edgeGeo, edgeMat);
      this.edgeGlow.position.set(x, y, 0.01);
    } else {
      mat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.3,
        metalness: 0.4,
        roughness: 0.4,
      });
    }

    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.set(x, y, 0);
  }

  getEdgeGlow(): THREE.LineSegments | null {
    return this.edgeGlow;
  }

  updatePulse(time: number) {
    if (!this.indestructible || !this.alive) return;
    const hue = ((time * 0.4 + this.pulsePhase / (Math.PI * 2)) % 1);
    const pulse = 0.5 + 0.5 * Math.sin(time * 3.0 + this.pulsePhase);
    const mat = this.mesh.material as THREE.MeshStandardMaterial;
    const rainbowColor = new THREE.Color().setHSL(hue, 1.0, 0.5);
    mat.color.copy(rainbowColor);
    mat.emissive.copy(rainbowColor);
    mat.emissiveIntensity = 0.5 + pulse * 0.5;
    if (this.edgeGlow) {
      const edgeColor = new THREE.Color().setHSL((hue + 0.5) % 1, 1.0, 0.7);
      const edgeMat = this.edgeGlow.material as THREE.LineBasicMaterial;
      edgeMat.color.copy(edgeColor);
      edgeMat.opacity = 0.6 + pulse * 0.4;
    }
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
