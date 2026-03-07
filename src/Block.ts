import * as THREE from "three";
import {
  BLOCK_WIDTH, BLOCK_HEIGHT, BLOCK_DEPTH,
  INDESTRUCTIBLE_COLOR, INDESTRUCTIBLE_EMISSIVE, INDESTRUCTIBLE_COLOR_INDEX,
} from "./constants";

// Shared HP number textures to avoid creating one canvas per block
const hpTextureCache = new Map<number, THREE.Texture>();
function getHpTexture(hp: number): THREE.Texture {
  if (hpTextureCache.has(hp)) return hpTextureCache.get(hp)!;
  const canvas = document.createElement("canvas");
  canvas.width = 48;
  canvas.height = 24;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 20px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 3;
  ctx.strokeText(String(hp), 24, 12);
  ctx.fillText(String(hp), 24, 12);
  const texture = new THREE.CanvasTexture(canvas);
  hpTextureCache.set(hp, texture);
  return texture;
}

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
  private hpSprite: THREE.Sprite | null = null;
  private hpBarBg: THREE.Mesh | null = null;
  private hpBarFg: THREE.Mesh | null = null;

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

    if (!this.indestructible) {
      this.createHpDisplay();
    }
  }

  private createHpDisplay() {
    // HP number sprite
    const spriteMat = new THREE.SpriteMaterial({
      map: getHpTexture(this.hp),
      transparent: true,
    });
    this.hpSprite = new THREE.Sprite(spriteMat);
    this.hpSprite.scale.set(0.45, 0.22, 1);
    this.hpSprite.position.set(0, 0, 0.2);
    this.mesh.add(this.hpSprite);

    // HP bar (hidden when full)
    const barWidth = BLOCK_WIDTH * 0.8;
    const barHeight = 0.06;

    const bgGeo = new THREE.PlaneGeometry(barWidth, barHeight);
    const bgMat = new THREE.MeshBasicMaterial({
      color: 0x000000, transparent: true, opacity: 0.5,
    });
    this.hpBarBg = new THREE.Mesh(bgGeo, bgMat);
    this.hpBarBg.position.set(0, -BLOCK_HEIGHT / 2 - 0.05, 0.1);
    this.hpBarBg.visible = false;
    this.mesh.add(this.hpBarBg);

    const fgGeo = new THREE.PlaneGeometry(barWidth, barHeight);
    const fgMat = new THREE.MeshBasicMaterial({ color: 0x44ff44 });
    this.hpBarFg = new THREE.Mesh(fgGeo, fgMat);
    this.hpBarFg.position.set(0, -BLOCK_HEIGHT / 2 - 0.05, 0.11);
    this.hpBarFg.visible = false;
    this.mesh.add(this.hpBarFg);
  }

  private updateHpDisplay() {
    // Update HP number
    if (this.hpSprite) {
      const spriteMat = this.hpSprite.material as THREE.SpriteMaterial;
      spriteMat.map = getHpTexture(this.hp);
      spriteMat.needsUpdate = true;
    }

    // Update HP bar (show only when damaged)
    if (!this.hpBarBg || !this.hpBarFg) return;
    if (this.hp >= this.maxHp) {
      this.hpBarBg.visible = false;
      this.hpBarFg.visible = false;
      return;
    }
    this.hpBarBg.visible = true;
    this.hpBarFg.visible = true;
    const ratio = Math.max(0, this.hp / this.maxHp);
    this.hpBarFg.scale.x = ratio;
    const barWidth = BLOCK_WIDTH * 0.8;
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
    this.updateHpDisplay();
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
