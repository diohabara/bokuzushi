import * as THREE from "three";
import { STAR_OUTER_RADIUS, STAR_INNER_RADIUS, STAR_DEPTH } from "./constants";

export class Star {
  mesh: THREE.Group;
  alive = true;
  boundingRadius: number;
  private light: THREE.PointLight;
  private core: THREE.Mesh;
  private haloRing: THREE.Mesh;
  private outerRing: THREE.Mesh;
  private orbiters: THREE.Mesh[] = [];
  private sparkleGroup: THREE.Group;
  private bornAt = performance.now();

  constructor(x: number, y: number) {
    const shape = new THREE.Shape();
    const points = 5;
    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const r = i % 2 === 0 ? STAR_OUTER_RADIUS : STAR_INNER_RADIUS;
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (i === 0) shape.moveTo(px, py);
      else shape.lineTo(px, py);
    }
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: STAR_DEPTH,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelSegments: 2,
    });
    geo.center();

    const mat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xffd700,
      emissiveIntensity: 1.15,
      metalness: 0.92,
      roughness: 0.08,
    });

    const starMesh = new THREE.Mesh(geo, mat);
    starMesh.position.z = 0.05;

    const coreGeo = new THREE.SphereGeometry(STAR_INNER_RADIUS * 0.7, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xfff4bd,
      transparent: true,
      opacity: 0.9,
    });
    this.core = new THREE.Mesh(coreGeo, coreMat);
    this.core.position.z = STAR_DEPTH * 0.45;

    const haloGeo = new THREE.TorusGeometry(STAR_OUTER_RADIUS * 0.92, 0.08, 12, 42);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xffd86b,
      transparent: true,
      opacity: 0.42,
    });
    this.haloRing = new THREE.Mesh(haloGeo, haloMat);
    this.haloRing.rotation.x = Math.PI / 2.4;

    const outerGeo = new THREE.TorusGeometry(STAR_OUTER_RADIUS * 1.18, 0.04, 10, 42);
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0xff88cc,
      transparent: true,
      opacity: 0.24,
    });
    this.outerRing = new THREE.Mesh(outerGeo, outerMat);
    this.outerRing.rotation.x = Math.PI / 2;
    this.outerRing.rotation.y = Math.PI / 6;

    this.sparkleGroup = new THREE.Group();
    const orbiterGeo = new THREE.OctahedronGeometry(0.08, 0);
    const orbiterColors = [0xffee88, 0xffffff, 0xff99dd, 0x88ddff];
    for (let i = 0; i < 4; i++) {
      const orbiter = new THREE.Mesh(
        orbiterGeo,
        new THREE.MeshBasicMaterial({
          color: orbiterColors[i % orbiterColors.length],
          transparent: true,
          opacity: 0.85,
        })
      );
      this.orbiters.push(orbiter);
      this.sparkleGroup.add(orbiter);
    }

    this.mesh = new THREE.Group();
    this.mesh.add(starMesh);
    this.mesh.add(this.core);
    this.mesh.add(this.haloRing);
    this.mesh.add(this.outerRing);
    this.mesh.add(this.sparkleGroup);
    this.mesh.position.set(x, y, 0.2);
    this.boundingRadius = STAR_OUTER_RADIUS * 1.1;

    this.light = new THREE.PointLight(0xffd700, 2.1, 5.5);
    this.mesh.add(this.light);
  }

  update() {
    if (this.alive) {
      const elapsed = (performance.now() - this.bornAt) / 1000;
      const pulse = 1 + Math.sin(elapsed * 3.8) * 0.08;

      this.mesh.rotation.z += 0.012;
      this.mesh.rotation.y = Math.sin(elapsed * 1.5) * 0.18;
      this.mesh.position.z = 0.2 + Math.sin(elapsed * 2.2) * 0.08;

      this.core.scale.setScalar(pulse * 1.05);
      this.haloRing.scale.setScalar(1 + Math.sin(elapsed * 2.8) * 0.06);
      this.haloRing.rotation.z -= 0.02;
      this.outerRing.rotation.z += 0.009;
      this.outerRing.rotation.y += 0.006;

      this.sparkleGroup.rotation.z -= 0.018;
      this.sparkleGroup.rotation.x = Math.sin(elapsed * 1.2) * 0.25;
      this.orbiters.forEach((orbiter, index) => {
        const angle = elapsed * (0.9 + index * 0.18) + (Math.PI * 2 * index) / this.orbiters.length;
        const radius = STAR_OUTER_RADIUS * (1.18 + (index % 2) * 0.16 + Math.sin(elapsed * 2 + index) * 0.04);
        orbiter.position.set(
          Math.cos(angle) * radius,
          Math.sin(angle) * radius,
          Math.sin(angle * 2.2) * 0.25
        );
        orbiter.rotation.x += 0.06;
        orbiter.rotation.y += 0.04;
      });

      this.light.intensity = 1.7 + Math.sin(elapsed * 5.2) * 0.55;
    }
  }

  destroy() {
    this.alive = false;
    this.mesh.visible = false;
  }
}
