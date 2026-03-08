import * as THREE from "three";
import {
  BLOCK_WIDTH, BLOCK_HEIGHT, BLOCK_DEPTH,
  INDESTRUCTIBLE_COLOR, INDESTRUCTIBLE_EMISSIVE, INDESTRUCTIBLE_COLOR_INDEX,
} from "./constants";

export type BlockKind = "normal" | "indestructible" | "bomb" | "split" | "reflect";

export class Block {
  mesh: THREE.Mesh;
  alive = true;
  hp: number;
  maxHp: number;
  row: number;
  col: number;
  colorIndex: number;
  kind: BlockKind;
  indestructible: boolean;
  private pulsePhase = Math.random() * Math.PI * 2;
  private edgeGlow: THREE.LineSegments | null = null;
  private hpBarBg: THREE.Mesh | null = null;
  private hpBarFg: THREE.Mesh | null = null;
  private baseColor: THREE.Color;
  private baseEmissive: THREE.Color;
  private baseEmissiveIntensity: number;

  constructor(
    x: number,
    y: number,
    color: number,
    colorIndex: number,
    hp: number,
    row: number,
    col: number,
    kind: BlockKind = "normal"
  ) {
    this.hp = hp;
    this.maxHp = hp;
    this.row = row;
    this.col = col;
    this.colorIndex = colorIndex;
    this.kind = kind;
    this.indestructible = kind === "indestructible" || colorIndex === INDESTRUCTIBLE_COLOR_INDEX;

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
      const edgeGeo = new THREE.EdgesGeometry(geo);
      const edgeMat = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.9,
      });
      this.edgeGlow = new THREE.LineSegments(edgeGeo, edgeMat);
      this.edgeGlow.position.set(x, y, 0.01);
      this.baseColor = new THREE.Color(INDESTRUCTIBLE_COLOR);
      this.baseEmissive = new THREE.Color(INDESTRUCTIBLE_EMISSIVE);
      this.baseEmissiveIntensity = 0.8;
    } else if (this.kind === "bomb") {
      mat = new THREE.MeshStandardMaterial({
        color: 0xff6a3d,
        emissive: 0xff3a18,
        emissiveIntensity: 0.75,
        metalness: 0.3,
        roughness: 0.25,
      });
      const edgeGeo = new THREE.EdgesGeometry(geo);
      const edgeMat = new THREE.LineBasicMaterial({
        color: 0xfff2d8,
        transparent: true,
        opacity: 0.9,
      });
      this.edgeGlow = new THREE.LineSegments(edgeGeo, edgeMat);
      this.edgeGlow.position.set(x, y, 0.01);
      this.baseColor = new THREE.Color(0xff6a3d);
      this.baseEmissive = new THREE.Color(0xff3a18);
      this.baseEmissiveIntensity = 0.75;
    } else if (this.kind === "split") {
      mat = new THREE.MeshStandardMaterial({
        color: 0x57ffe5,
        emissive: 0x00d5d5,
        emissiveIntensity: 0.68,
        metalness: 0.2,
        roughness: 0.2,
      });
      const edgeGeo = new THREE.EdgesGeometry(geo);
      const edgeMat = new THREE.LineBasicMaterial({
        color: 0xe4ffff,
        transparent: true,
        opacity: 0.88,
      });
      this.edgeGlow = new THREE.LineSegments(edgeGeo, edgeMat);
      this.edgeGlow.position.set(x, y, 0.01);
      this.baseColor = new THREE.Color(0x57ffe5);
      this.baseEmissive = new THREE.Color(0x00d5d5);
      this.baseEmissiveIntensity = 0.68;
    } else if (this.kind === "reflect") {
      mat = new THREE.MeshStandardMaterial({
        color: 0xb8e7ff,
        emissive: 0x8fd3ff,
        emissiveIntensity: 0.62,
        metalness: 0.95,
        roughness: 0.08,
      });
      const edgeGeo = new THREE.EdgesGeometry(geo);
      const edgeMat = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.85,
      });
      this.edgeGlow = new THREE.LineSegments(edgeGeo, edgeMat);
      this.edgeGlow.position.set(x, y, 0.01);
      this.baseColor = new THREE.Color(0xb8e7ff);
      this.baseEmissive = new THREE.Color(0x8fd3ff);
      this.baseEmissiveIntensity = 0.62;
    } else {
      mat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.3,
        metalness: 0.4,
        roughness: 0.4,
      });
      this.baseColor = new THREE.Color(color);
      this.baseEmissive = new THREE.Color(color);
      this.baseEmissiveIntensity = 0.3;
    }

    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.set(x, y, 0);
    this.addSpecialAccent();
  }

  private addSpecialAccent() {
    const zFront = BLOCK_DEPTH / 2 + 0.03;

    if (this.kind === "bomb") {
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0xfff4b5 })
      );
      core.position.set(0, 0, zFront + 0.01);
      this.mesh.add(core);

      for (const rotationZ of [Math.PI / 4, -Math.PI / 4]) {
        const bar = new THREE.Mesh(
          new THREE.BoxGeometry(BLOCK_WIDTH * 0.5, 0.07, 0.02),
          new THREE.MeshBasicMaterial({ color: 0x2a0600 })
        );
        bar.position.set(0, 0, zFront);
        bar.rotation.z = rotationZ;
        this.mesh.add(bar);
      }
      return;
    }

    if (this.kind === "split") {
      for (const [x, rotationZ] of [[-0.18, -0.4], [0.18, 0.4]] as const) {
        const shard = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, BLOCK_HEIGHT * 0.62, 0.02),
          new THREE.MeshBasicMaterial({ color: 0xe8ffff })
        );
        shard.position.set(x, 0, zFront);
        shard.rotation.z = rotationZ;
        this.mesh.add(shard);
      }
      return;
    }

    if (this.kind === "reflect") {
      const pane = new THREE.Mesh(
        new THREE.PlaneGeometry(BLOCK_WIDTH * 0.72, BLOCK_HEIGHT * 0.62),
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.35,
        })
      );
      pane.position.set(0, 0, zFront);
      this.mesh.add(pane);

      const rim = new THREE.Mesh(
        new THREE.RingGeometry(0.12, 0.2, 4),
        new THREE.MeshBasicMaterial({ color: 0xc8f6ff })
      );
      rim.position.set(0, 0, zFront + 0.01);
      rim.rotation.z = Math.PI / 4;
      this.mesh.add(rim);
    }
  }

  private createHpBar() {
    if (this.hpBarBg || this.hpBarFg) return;
    const barWidth = BLOCK_WIDTH * 0.85;
    const barHeight = 0.07;
    const zFront = BLOCK_DEPTH / 2 + 0.05;

    const bgGeo = new THREE.PlaneGeometry(barWidth, barHeight);
    const bgMat = new THREE.MeshBasicMaterial({
      color: 0x000000, transparent: true, opacity: 0.5,
    });
    this.hpBarBg = new THREE.Mesh(bgGeo, bgMat);
    this.hpBarBg.position.set(0, -BLOCK_HEIGHT / 2 - 0.06, zFront);
    this.mesh.add(this.hpBarBg);

    const fgGeo = new THREE.PlaneGeometry(barWidth, barHeight);
    const fgMat = new THREE.MeshBasicMaterial({ color: 0x44ff44 });
    this.hpBarFg = new THREE.Mesh(fgGeo, fgMat);
    this.hpBarFg.position.set(0, -BLOCK_HEIGHT / 2 - 0.06, zFront + 0.01);
    this.mesh.add(this.hpBarFg);
  }

  private updateHpBar() {
    if (!this.hpBarBg || !this.hpBarFg) return;
    const ratio = Math.max(0, this.hp / this.maxHp);
    this.hpBarFg.scale.x = ratio;
    const barWidth = BLOCK_WIDTH * 0.85;
    this.hpBarFg.position.x = -(barWidth * (1 - ratio)) / 2;

    const fgMat = this.hpBarFg.material as THREE.MeshBasicMaterial;
    if (ratio > 0.5) fgMat.color.setHex(0x44ff44);
    else if (ratio > 0.25) fgMat.color.setHex(0xffcc00);
    else fgMat.color.setHex(0xff3344);
  }

  getEdgeGlow(): THREE.LineSegments | null {
    return this.edgeGlow;
  }

  updatePulse(time: number) {
    if (!this.alive) return;
    const mat = this.mesh.material as THREE.MeshStandardMaterial;

    const hue = ((time * 0.4 + this.pulsePhase / (Math.PI * 2)) % 1);
    const pulse = 0.5 + 0.5 * Math.sin(time * 3.0 + this.pulsePhase);

    if (this.indestructible) {
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
      return;
    }

    if (this.kind === "bomb") {
      mat.color.copy(this.baseColor).offsetHSL(0, 0, pulse * 0.08);
      mat.emissive.copy(this.baseEmissive);
      mat.emissiveIntensity = this.baseEmissiveIntensity + pulse * 0.35;
      if (this.edgeGlow) {
        const edgeMat = this.edgeGlow.material as THREE.LineBasicMaterial;
        edgeMat.opacity = 0.65 + pulse * 0.35;
      }
      return;
    }

    if (this.kind === "split") {
      const splitColor = new THREE.Color().setHSL(0.46 + pulse * 0.06, 1, 0.62);
      mat.color.copy(splitColor);
      mat.emissive.copy(splitColor);
      mat.emissiveIntensity = this.baseEmissiveIntensity + pulse * 0.28;
      if (this.edgeGlow) {
        const edgeMat = this.edgeGlow.material as THREE.LineBasicMaterial;
        edgeMat.opacity = 0.58 + pulse * 0.3;
      }
      return;
    }

    if (this.kind === "reflect") {
      const shimmer = 0.84 + pulse * 0.16;
      mat.color.copy(this.baseColor).multiplyScalar(shimmer);
      mat.emissive.copy(this.baseEmissive);
      mat.emissiveIntensity = this.baseEmissiveIntensity + pulse * 0.24;
      if (this.edgeGlow) {
        const edgeMat = this.edgeGlow.material as THREE.LineBasicMaterial;
        edgeMat.color.setHSL(0.55, 0.85, 0.7 + pulse * 0.1);
        edgeMat.opacity = 0.55 + pulse * 0.35;
      }
      return;
    }
  }

  hit(damage: number): boolean {
    this.hp -= damage;
    if (this.hp <= 0) {
      this.destroy();
      return true;
    }
    if (this.maxHp > 1) {
      this.createHpBar();
      this.updateHpBar();
    }
    // Hit flash - bright white flash
    const mat = this.mesh.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = 2.0;
    const originalScale = this.mesh.scale.x;
    this.mesh.scale.setScalar(1.3);
    setTimeout(() => {
      if (this.alive) {
        mat.emissiveIntensity = this.baseEmissiveIntensity;
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
