import * as THREE from 'three';

// Round speaker grille set in a raised ring, for the strip behind the keys
const RADIUS = 0.54;
const RING_TUBE = 0.045;

function grilleTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#2a2a2d';
  ctx.fillRect(0, 0, size, size);
  // Perforations on a hexagonal grid, inside the circle
  const pitch = 22;
  const hole = 6.5;
  ctx.fillStyle = '#0c0c0e';
  for (let row = 0, y = pitch / 2; y < size; row += 1, y += pitch * 0.866) {
    for (let x = (row % 2 ? pitch / 2 : 0) + pitch / 2; x < size; x += pitch) {
      if (Math.hypot(x - size / 2, y - size / 2) < size / 2 - 18) {
        ctx.beginPath();
        ctx.arc(x, y, hole, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 8;
  return texture;
}

let sharedTexture = null;

class Speaker extends THREE.Object3D {
  constructor() {
    super();
    if (!sharedTexture) sharedTexture = grilleTexture();

    // Dark recess under the grille
    const well = new THREE.Mesh(
      new THREE.CylinderGeometry(RADIUS + 0.02, RADIUS + 0.02, 0.02, 64),
      new THREE.MeshLambertMaterial({ color: 0x0c0c0d }),
    );
    well.position.y = 0.01;
    this.add(well);

    // Perforated grille, slightly below the ring's top
    const side = new THREE.MeshLambertMaterial({ color: 0x1c1c1f });
    const grille = new THREE.Mesh(
      new THREE.CylinderGeometry(RADIUS, RADIUS, 0.03, 64),
      [side, new THREE.MeshLambertMaterial({ map: sharedTexture }), side],
    );
    grille.position.y = 0.015;
    this.add(grille);

    // Raised ring around it
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(RADIUS + RING_TUBE * 0.6, RING_TUBE, 12, 72),
      new THREE.MeshLambertMaterial({ color: 0x2c2c30 }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    this.add(ring);
  }
}

export default Speaker;
