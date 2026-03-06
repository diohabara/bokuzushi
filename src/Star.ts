import * as THREE from "three";
import { STAR_OUTER_RADIUS, STAR_INNER_RADIUS, STAR_DEPTH } from "./constants";

export class Star {
  mesh: THREE.Mesh;
  alive = true;
  boundingRadius: number;

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
      bevelEnabled: false,
    });
    geo.center();

    const mat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xffd700,
      emissiveIntensity: 0.6,
      metalness: 0.5,
      roughness: 0.3,
    });

    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.set(x, y, 0.1);
    this.boundingRadius = STAR_OUTER_RADIUS * 0.85;
  }

  update() {
    if (this.alive) {
      this.mesh.rotation.z += 0.02;
      this.mesh.rotation.y = Math.sin(Date.now() * 0.002) * 0.3;
    }
  }

  destroy() {
    this.alive = false;
    this.mesh.visible = false;
  }
}
