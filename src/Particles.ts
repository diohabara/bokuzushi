import * as THREE from "three";
import {
  PARTICLE_COUNT,
  PARTICLE_LIFETIME,
  PARTICLE_SPEED,
  HIT_PARTICLE_COUNT,
  HIT_PARTICLE_SPEED,
  WORLD_THEMES,
  WorldTheme,
} from "./constants";

interface Particle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  baseScale: number;
  rotSpeed: number;
}

const PARTICLE_BASE_Z = -0.65;
const PARTICLE_MIN_Z = -1.25;
const PARTICLE_MAX_Z = -0.25;
const PARTICLE_OPACITY_SCALE = 0.68;

function createGeometries(
  shape: WorldTheme["particleShape"]
): [THREE.BufferGeometry, THREE.BufferGeometry, THREE.BufferGeometry] {
  switch (shape) {
    case "sakura": {
      // Petal shape: flat thin cylinder
      return [
        new THREE.CylinderGeometry(0.09, 0.06, 0.02, 5),
        new THREE.CylinderGeometry(0.14, 0.09, 0.03, 5),
        new THREE.CylinderGeometry(0.2, 0.14, 0.04, 5),
      ];
    }
    case "flame": {
      // Cone shape for flames
      return [
        new THREE.ConeGeometry(0.07, 0.18, 5),
        new THREE.ConeGeometry(0.11, 0.28, 5),
        new THREE.ConeGeometry(0.16, 0.4, 5),
      ];
    }
    case "leaf": {
      // Thin plane for leaves
      return [
        new THREE.PlaneGeometry(0.14, 0.09),
        new THREE.PlaneGeometry(0.22, 0.14),
        new THREE.PlaneGeometry(0.32, 0.2),
      ];
    }
    case "crystal": {
      // Octahedron for ice crystals
      return [
        new THREE.OctahedronGeometry(0.09),
        new THREE.OctahedronGeometry(0.14),
        new THREE.OctahedronGeometry(0.2),
      ];
    }
    case "star": {
      // 5-point star using LatheGeometry trick -> use dodecahedron as approximation
      return [
        new THREE.DodecahedronGeometry(0.09, 0),
        new THREE.DodecahedronGeometry(0.14, 0),
        new THREE.DodecahedronGeometry(0.2, 0),
      ];
    }
    case "sphere":
    default:
      return [
        new THREE.SphereGeometry(0.09, 6, 6),
        new THREE.SphereGeometry(0.14, 8, 8),
        new THREE.SphereGeometry(0.2, 8, 8),
      ];
  }
}

export class Particles {
  private particles: Particle[] = [];
  private geo: THREE.BufferGeometry;
  private bigGeo: THREE.BufferGeometry;
  private hugeGeo: THREE.BufferGeometry;
  private intensity = 1;

  constructor(private scene: THREE.Scene) {
    [this.geo, this.bigGeo, this.hugeGeo] = createGeometries("sphere");
  }

  setWorld(worldIndex: number) {
    const theme = WORLD_THEMES[worldIndex % WORLD_THEMES.length];
    [this.geo, this.bigGeo, this.hugeGeo] = createGeometries(theme.particleShape);
  }

  setIntensity(intensity: number) {
    this.intensity = Math.max(0.55, Math.min(1, intensity));
  }

  private scaledCount(baseCount: number, minimum = 6) {
    return Math.max(minimum, Math.round(baseCount * this.intensity));
  }

  private createMaterial(color: number, opacity: number) {
    const scaledOpacity = opacity * PARTICLE_OPACITY_SCALE;
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: scaledOpacity,
      depthWrite: false,
    });
    material.userData.baseOpacity = scaledOpacity;
    return material;
  }

  private primeMesh(mesh: THREE.Mesh, x: number, y: number, z = PARTICLE_BASE_Z) {
    mesh.position.set(x, y, z);
    mesh.renderOrder = 1;
    this.scene.add(mesh);
  }

  // Block hit (no destroy) - still very flashy
  hitBurst(x: number, y: number, color: number) {
    const count = this.scaledCount(HIT_PARTICLE_COUNT, 18);
    for (let i = 0; i < count; i++) {
      const mat = this.createMaterial(color, 0.9);
      const mesh = new THREE.Mesh(this.geo, mat);
      const scale = 0.8 + Math.random() * 1.5;
      this.primeMesh(mesh, x, y, PARTICLE_BASE_Z - Math.random() * 0.12);
      mesh.scale.setScalar(scale);

      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = HIT_PARTICLE_SPEED * (0.5 + Math.random() * 1.5);
      const life = PARTICLE_LIFETIME * 0.6;
      this.particles.push({
        mesh,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        vz: (Math.random() - 0.5) * speed * 0.5,
        life,
        maxLife: life,
        baseScale: scale,
        rotSpeed: (Math.random() - 0.5) * 0.3,
      });
    }
  }

  // Block destroy burst - MASSIVE
  burst(x: number, y: number, color: number) {
    const count = this.scaledCount(PARTICLE_COUNT, 48);
    // Main color burst
    for (let i = 0; i < count; i++) {
      const mat = this.createMaterial(color, 0.9);
      const isHuge = i < count * 0.15;
      const mesh = new THREE.Mesh(isHuge ? this.hugeGeo : this.bigGeo, mat);
      const scale = 0.8 + Math.random() * 2.0;
      this.primeMesh(
        mesh,
        x + (Math.random() - 0.5) * 0.3,
        y + (Math.random() - 0.5) * 0.3,
        PARTICLE_BASE_Z - Math.random() * 0.2
      );
      mesh.scale.setScalar(scale);

      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const speed = PARTICLE_SPEED * (0.5 + Math.random() * 1.5);
      const life = PARTICLE_LIFETIME * (0.6 + Math.random() * 0.6);
      this.particles.push({
        mesh,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        vz: (Math.random() - 0.5) * speed * 0.8,
        life,
        maxLife: life,
        baseScale: scale,
        rotSpeed: (Math.random() - 0.5) * 0.5,
      });
    }

    // White sparkle ring
    const ringCount = this.scaledCount(30, 10);
    for (let i = 0; i < ringCount; i++) {
      const mat = this.createMaterial(0xffffff, 0.85);
      const mesh = new THREE.Mesh(this.geo, mat);
      this.primeMesh(mesh, x, y, PARTICLE_BASE_Z - 0.08);

      const angle = (Math.PI * 2 * i) / ringCount;
      const speed = PARTICLE_SPEED * 2.0;
      const life = PARTICLE_LIFETIME * 0.4;
      this.particles.push({
        mesh,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        vz: 0,
        life,
        maxLife: life,
        baseScale: 1.5,
        rotSpeed: 0,
      });
    }
  }

  // Non-matching block bounce - small spark effect
  bounceSpark(x: number, y: number) {
    for (let i = 0; i < 8; i++) {
      const mat = this.createMaterial(0x888888, 0.45);
      const mesh = new THREE.Mesh(this.geo, mat);
      this.primeMesh(mesh, x, y, PARTICLE_BASE_Z - 0.04);

      const angle = Math.random() * Math.PI * 2;
      const speed = 0.1 + Math.random() * 0.1;
      const life = 0.3;
      this.particles.push({
        mesh,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        vz: 0,
        life,
        maxLife: life,
        baseScale: 0.5,
        rotSpeed: 0,
      });
    }
  }

  // Star destruction - ABSOLUTELY INSANE
  starBurst(x: number, y: number) {
    const colors = [0xffd700, 0xffaa00, 0xffffff, 0xffee88, 0xff4400, 0xff00ff];
    const count = this.scaledCount(PARTICLE_COUNT * 5, 160);
    for (let i = 0; i < count; i++) {
      const color = colors[i % colors.length];
      const mat = this.createMaterial(color, 0.88);
      const isHuge = i < count * 0.2;
      const mesh = new THREE.Mesh(isHuge ? this.hugeGeo : this.bigGeo, mat);
      const scale = 1 + Math.random() * 3.0;
      this.primeMesh(
        mesh,
        x + (Math.random() - 0.5) * 0.5,
        y + (Math.random() - 0.5) * 0.5,
        PARTICLE_BASE_Z - Math.random() * 0.35
      );
      mesh.scale.setScalar(scale);

      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = PARTICLE_SPEED * (0.8 + Math.random() * 2.5);
      const life = PARTICLE_LIFETIME * 3;
      this.particles.push({
        mesh,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        vz: (Math.random() - 0.5) * speed * 1.5,
        life,
        maxLife: life,
        baseScale: scale,
        rotSpeed: (Math.random() - 0.5) * 0.8,
      });
    }
  }

  // Ball-related burst - used for color shifts, level-up sparks, and ball emphasis.
  colorChangeBurst(x: number, y: number, color: number, strength = 1) {
    const count = this.scaledCount(Math.round(28 * strength), Math.max(10, Math.round(10 * strength)));
    for (let i = 0; i < count; i++) {
      const mat = this.createMaterial(color, 0.85);
      const mesh = new THREE.Mesh(this.bigGeo, mat);
      const scale = (0.35 + Math.random() * 1.25) * (0.9 + strength * 0.35);
      this.primeMesh(mesh, x, y, PARTICLE_BASE_Z - Math.random() * 0.16);
      mesh.scale.setScalar(scale);

      const angle = (Math.PI * 2 * i) / count;
      const speed = PARTICLE_SPEED * (0.65 + Math.random() * (0.8 + strength * 0.3));
      const life = PARTICLE_LIFETIME * (0.34 + strength * 0.18);
      this.particles.push({
        mesh,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        vz: (Math.random() - 0.5) * 0.2,
        life,
        maxLife: life,
        baseScale: scale,
        rotSpeed: (Math.random() - 0.5) * 0.3,
      });
    }
  }

  update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.mesh.position.x += p.vx;
      p.mesh.position.y += p.vy;
      p.mesh.position.z = Math.min(
        PARTICLE_MAX_Z,
        Math.max(PARTICLE_MIN_Z, p.mesh.position.z + p.vz)
      );
      p.mesh.rotation.z += p.rotSpeed;
      // Gravity
      p.vy -= 0.004;
      const t = Math.max(0, p.life / p.maxLife);
      p.mesh.scale.setScalar(t * p.baseScale);
      const material = p.mesh.material as THREE.MeshBasicMaterial;
      material.opacity = t * ((material.userData.baseOpacity as number | undefined) ?? 1);

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
      }
    }
  }
}
