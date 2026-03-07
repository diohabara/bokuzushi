import * as THREE from "three";
import { GAME_WIDTH, GAME_HEIGHT } from "./constants";

interface BgElement {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  rotSpeed: number;
  wobblePhase: number;
  wobbleSpeed: number;
  wobbleAmp: number;
  baseX: number;
}

const BG_COUNT = 60;
const Z_BACK = -6;

export class WorldBackground {
  private elements: BgElement[] = [];
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  generate(worldIndex: number) {
    this.clear();
    switch (worldIndex) {
      case 0: this.generateSakura(); break;
      case 1: this.generateFlame(); break;
      case 2: this.generateAutumn(); break;
      case 3: this.generateSnow(); break;
      case 4: this.generateGold(); break;
      default: this.generateSakura(); break;
    }
  }

  private generateSakura() {
    const petalShape = new THREE.Shape();
    petalShape.moveTo(0, 0);
    petalShape.quadraticCurveTo(0.06, 0.12, 0, 0.22);
    petalShape.quadraticCurveTo(-0.06, 0.12, 0, 0);
    const geo = new THREE.ShapeGeometry(petalShape);

    for (let i = 0; i < BG_COUNT; i++) {
      const pink = 0.85 + Math.random() * 0.15;
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(pink, 0.5 + Math.random() * 0.3, 0.6 + Math.random() * 0.2),
        transparent: true,
        opacity: 0.25 + Math.random() * 0.35,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      const scale = 0.8 + Math.random() * 1.5;
      mesh.scale.setScalar(scale);
      const x = (Math.random() - 0.5) * GAME_WIDTH * 1.4;
      const y = (Math.random() - 0.5) * GAME_HEIGHT * 1.3;
      mesh.position.set(x, y, Z_BACK - Math.random() * 5);
      mesh.rotation.z = Math.random() * Math.PI * 2;
      this.scene.add(mesh);
      this.elements.push({
        mesh, vx: 0, vy: -0.3 - Math.random() * 0.4,
        rotSpeed: (Math.random() - 0.5) * 1.5,
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleSpeed: 1.5 + Math.random() * 1.5,
        wobbleAmp: 0.5 + Math.random() * 1.0,
        baseX: x,
      });
    }
  }

  private generateFlame() {
    const geo = new THREE.SphereGeometry(0.15, 8, 8);
    for (let i = 0; i < BG_COUNT; i++) {
      const t = Math.random();
      const color = new THREE.Color().setHSL(0.02 + t * 0.08, 1, 0.4 + t * 0.3);
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.15 + Math.random() * 0.3,
      });
      const mesh = new THREE.Mesh(geo, mat);
      const scale = 0.5 + Math.random() * 2.0;
      mesh.scale.setScalar(scale);
      const x = (Math.random() - 0.5) * GAME_WIDTH * 1.4;
      const y = -GAME_HEIGHT / 2 + Math.random() * GAME_HEIGHT * 0.6;
      mesh.position.set(x, y, Z_BACK - Math.random() * 5);
      this.scene.add(mesh);
      this.elements.push({
        mesh, vx: 0, vy: 0.4 + Math.random() * 0.8,
        rotSpeed: 0,
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleSpeed: 2 + Math.random() * 2,
        wobbleAmp: 0.3 + Math.random() * 0.6,
        baseX: x,
      });
    }
  }

  private generateAutumn() {
    const leafShape = new THREE.Shape();
    leafShape.moveTo(0, 0);
    leafShape.quadraticCurveTo(0.1, 0.08, 0.08, 0.2);
    leafShape.quadraticCurveTo(0.02, 0.15, 0, 0.22);
    leafShape.quadraticCurveTo(-0.02, 0.15, -0.08, 0.2);
    leafShape.quadraticCurveTo(-0.1, 0.08, 0, 0);
    const geo = new THREE.ShapeGeometry(leafShape);

    const leafColors = [0xcc3311, 0xdd5522, 0xee7733, 0xcc6600, 0xbb2200, 0xdd4400];
    for (let i = 0; i < BG_COUNT; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: leafColors[Math.floor(Math.random() * leafColors.length)],
        transparent: true,
        opacity: 0.2 + Math.random() * 0.35,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      const scale = 1.0 + Math.random() * 2.0;
      mesh.scale.setScalar(scale);
      const x = (Math.random() - 0.5) * GAME_WIDTH * 1.4;
      const y = (Math.random() - 0.5) * GAME_HEIGHT * 1.3;
      mesh.position.set(x, y, Z_BACK - Math.random() * 5);
      mesh.rotation.z = Math.random() * Math.PI * 2;
      this.scene.add(mesh);
      this.elements.push({
        mesh, vx: 0, vy: -0.2 - Math.random() * 0.4,
        rotSpeed: (Math.random() - 0.5) * 2.0,
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleSpeed: 1.0 + Math.random() * 1.5,
        wobbleAmp: 0.8 + Math.random() * 1.2,
        baseX: x,
      });
    }
  }

  private generateSnow() {
    const geo = new THREE.CircleGeometry(0.08, 6);
    for (let i = 0; i < BG_COUNT + 20; i++) {
      const brightness = 0.7 + Math.random() * 0.3;
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(brightness, brightness, brightness * 1.1),
        transparent: true,
        opacity: 0.2 + Math.random() * 0.4,
      });
      const mesh = new THREE.Mesh(geo, mat);
      const scale = 0.5 + Math.random() * 2.5;
      mesh.scale.setScalar(scale);
      const x = (Math.random() - 0.5) * GAME_WIDTH * 1.4;
      const y = (Math.random() - 0.5) * GAME_HEIGHT * 1.3;
      mesh.position.set(x, y, Z_BACK - Math.random() * 5);
      this.scene.add(mesh);
      this.elements.push({
        mesh, vx: 0, vy: -0.15 - Math.random() * 0.3,
        rotSpeed: (Math.random() - 0.5) * 0.5,
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.8 + Math.random() * 1.0,
        wobbleAmp: 0.3 + Math.random() * 0.5,
        baseX: x,
      });
    }
  }

  private generateGold() {
    const geo = new THREE.SphereGeometry(0.06, 6, 6);
    for (let i = 0; i < BG_COUNT; i++) {
      const t = Math.random();
      const color = new THREE.Color().setHSL(0.12 + t * 0.04, 0.9, 0.5 + t * 0.3);
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.15 + Math.random() * 0.4,
      });
      const mesh = new THREE.Mesh(geo, mat);
      const scale = 0.5 + Math.random() * 2.5;
      mesh.scale.setScalar(scale);
      const x = (Math.random() - 0.5) * GAME_WIDTH * 1.4;
      const y = (Math.random() - 0.5) * GAME_HEIGHT * 1.3;
      mesh.position.set(x, y, Z_BACK - Math.random() * 5);
      this.scene.add(mesh);
      this.elements.push({
        mesh, vx: 0, vy: 0.05 + Math.random() * 0.15,
        rotSpeed: 0,
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.5 + Math.random() * 1.0,
        wobbleAmp: 0.2 + Math.random() * 0.4,
        baseX: x,
      });
    }
  }

  update(dt: number) {
    const halfW = GAME_WIDTH * 0.8;
    const halfH = GAME_HEIGHT * 0.75;
    const time = performance.now() / 1000;

    for (const el of this.elements) {
      el.mesh.position.y += el.vy * dt;
      el.mesh.position.x = el.baseX + Math.sin(time * el.wobbleSpeed + el.wobblePhase) * el.wobbleAmp;
      el.mesh.rotation.z += el.rotSpeed * dt;

      // Wrap around
      if (el.vy < 0 && el.mesh.position.y < -halfH) {
        el.mesh.position.y = halfH;
        el.baseX = (Math.random() - 0.5) * GAME_WIDTH * 1.4;
      } else if (el.vy > 0 && el.mesh.position.y > halfH) {
        el.mesh.position.y = -halfH;
        el.baseX = (Math.random() - 0.5) * GAME_WIDTH * 1.4;
      }

      // Shimmer for gold
      const mat = el.mesh.material as THREE.MeshBasicMaterial;
      if (el.rotSpeed === 0 && el.vy > 0 && el.vy < 0.3) {
        mat.opacity = 0.15 + 0.35 * (0.5 + 0.5 * Math.sin(time * 3 + el.wobblePhase));
      }
    }
  }

  clear() {
    for (const el of this.elements) {
      this.scene.remove(el.mesh);
    }
    this.elements = [];
  }
}
