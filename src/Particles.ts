import * as THREE from "three";
import { PARTICLE_COUNT, PARTICLE_LIFETIME, PARTICLE_SPEED } from "./constants";

interface Particle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
}

export class Particles {
  private particles: Particle[] = [];

  constructor(private scene: THREE.Scene) {}

  burst(x: number, y: number, color: number) {
    const geo = new THREE.SphereGeometry(0.06, 6, 6);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const mat = new THREE.MeshBasicMaterial({ color });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, 0);
      this.scene.add(mesh);

      const angle = (Math.PI * 2 * i) / PARTICLE_COUNT + Math.random() * 0.3;
      const speed = PARTICLE_SPEED * (0.5 + Math.random());
      this.particles.push({
        mesh,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        vz: (Math.random() - 0.5) * speed * 0.5,
        life: PARTICLE_LIFETIME,
      });
    }
  }

  update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.mesh.position.x += p.vx;
      p.mesh.position.y += p.vy;
      p.mesh.position.z += p.vz;
      const scale = Math.max(0, p.life / PARTICLE_LIFETIME);
      p.mesh.scale.setScalar(scale);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = scale;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
      }
    }
  }
}
