import * as THREE from 'three';

// Ribbed rubber wheel coming out of a dark slot, like the Akai MPK wheels,
// with an octave scale beside it
export const MIN_OCTAVE = -2;
export const MAX_OCTAVE = 2;

const RADIUS = 0.45;
const WIDTH = 0.24;
const PROTRUDE = 0.22; // height of the wheel above the slot plate
const PLATE_H = 0.02;
const STEP_ANGLE = 0.5; // wheel rotation per octave (radians)
const RIBS = 40;

const PINK = '#ff4f7b';
const DIM = '#cfcfd4';

function drawScale(canvas, octave) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);

  // One small square per octave, highest at the top; the current one in pink
  const steps = MAX_OCTAVE - MIN_OCTAVE;
  const size = 30;
  const top = 40;
  const bottom = height - 40;
  for (let o = MAX_OCTAVE; o >= MIN_OCTAVE; o -= 1) {
    const y = top + ((MAX_OCTAVE - o) / steps) * (bottom - top);
    ctx.fillStyle = o === octave ? PINK : DIM;
    ctx.fillRect(width / 2 - size / 2, y - size / 2, size, size);
  }
}

class OctaveWheel extends THREE.Object3D {
  constructor() {
    super();
    this.octave = 0;
    this.angle = 0;

    // Slot plate the wheel comes out of
    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(WIDTH + 0.16, PLATE_H, 0.95),
      new THREE.MeshLambertMaterial({ color: 0x18181a }),
    );
    plate.position.y = PLATE_H / 2;
    this.add(plate);

    // Wheel, mostly hidden inside the piano body
    this.wheel = new THREE.Object3D();
    this.wheel.position.y = PLATE_H + PROTRUDE - RADIUS;
    this.add(this.wheel);

    const rubber = new THREE.MeshLambertMaterial({ color: 0x2c2c30, flatShading: true });
    const cylinder = new THREE.Mesh(
      new THREE.CylinderGeometry(RADIUS - 0.02, RADIUS - 0.02, WIDTH, RIBS, 1),
      rubber,
    );
    cylinder.rotation.z = Math.PI / 2;
    this.wheel.add(cylinder);

    // Ribs around the rim
    const ribMaterial = new THREE.MeshLambertMaterial({ color: 0x3e3e44 });
    const ribGeometry = new THREE.BoxGeometry(WIDTH - 0.02, 0.04, 0.028);
    for (let i = 0; i < RIBS; i += 1) {
      const a = (i / RIBS) * Math.PI * 2;
      const rib = new THREE.Mesh(ribGeometry, ribMaterial);
      rib.position.set(0, Math.cos(a) * (RADIUS - 0.01), Math.sin(a) * (RADIUS - 0.01));
      rib.rotation.x = a;
      this.wheel.add(rib);
    }

    // Octave scale printed beside the wheel
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 320;
    this.scaleTexture = new THREE.CanvasTexture(canvas);
    this.scaleTexture.anisotropy = 8;
    const scale = new THREE.Mesh(
      new THREE.PlaneGeometry(0.34, 0.85),
      new THREE.MeshBasicMaterial({ map: this.scaleTexture, transparent: true, depthWrite: false }),
    );
    // The piano body is transparent too: draw the scale after it
    scale.renderOrder = 1;
    scale.rotation.x = -Math.PI / 2;
    scale.position.set(WIDTH / 2 + 0.3, 0.004, 0);
    this.add(scale);

    this.hitTargets = [plate, cylinder];
    this.setOctave(0);
  }

  setOctave(octave) {
    this.octave = octave;
    drawScale(this.scaleTexture.image, octave);
    this.scaleTexture.needsUpdate = true;
  }

  // Rolls the wheel to its detent (pushing it away raises the octave)
  update() {
    const target = -this.octave * STEP_ANGLE;
    this.angle += (target - this.angle) * 0.2;
    this.wheel.rotation.x = this.angle;
  }

  pick(raycaster) {
    return raycaster.intersectObjects(this.hitTargets, false).length > 0;
  }
}

export default OctaveWheel;
