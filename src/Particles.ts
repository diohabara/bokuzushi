import * as THREE from "three";
import { PARTICLE_COUNT, PARTICLE_LIFETIME, PARTICLE_SPEED } from "./constants";

interface Particle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
}

export class Particles {
  private particles: Particle[] = [];
  private geo = new THREE.SphereGeometry(0.07, 6, 6);

  constructor(private scene: THREE.Scene) {}

  burst(x: number, y: number, color: number) {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 1,
      });
      const mesh = new THREE.Mesh(this.geo, mat);
      mesh.position.set(x, y, 0);
      this.scene.add(mesh);

      const angle = (Math.PI * 2 * i) / PARTICLE_COUNT + Math.random() * 0.4;
      const speed = PARTICLE_SPEED * (0.5 + Math.random());
      const life = PARTICLE_LIFETIME * (0.6 + Math.random() * 0.4);
      this.particles.push({
        mesh,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        vz: (Math.random() - 0.5) * speed * 0.5,
        life,
        maxLife: life,
      });
    }
  }

  // Larger burst for star destruction
  starBurst(x: number, y: number) {
    const colors = [0xffd700, 0xffaa00, 0xffffff, 0xffee88];
    for (let i = 0; i < PARTICLE_COUNT * 2; i++) {
      const color = colors[i % colors.length];
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 1,
      });
      const mesh = new THREE.Mesh(this.geo, mat);
      mesh.position.set(x, y, 0);
      mesh.scale.setScalar(1 + Math.random());
      this.scene.add(mesh);

      const angle = (Math.PI * 2 * i) / (PARTICLE_COUNT * 2) + Math.random() * 0.2;
      const speed = PARTICLE_SPEED * (0.8 + Math.random() * 1.2);
      const life = PARTICLE_LIFETIME * 1.5;
      this.particles.push({
        mesh,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        vz: (Math.random() - 0.5) * speed,
        life,
        maxLife: life,
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
      // Gravity
      p.vy -= 0.003;
      const t = Math.max(0, p.life / p.maxLife);
      p.mesh.scale.setScalar(t * p.mesh.scale.x / Math.max(p.mesh.scale.x, 0.01));
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = t;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
      }
    }
  }
}
