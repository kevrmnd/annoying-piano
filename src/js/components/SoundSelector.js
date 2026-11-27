import * as THREE from 'three';
import SOUNDS from '../core/sounds';

// Column of small square rubber keys on the side of the piano keys, no text:
// each cap has its sound's color, dimmed until the key is pressed
const SIZE = 0.38;
const KEY_H = 0.12;
const BASE_MARGIN = 0.08;
const BASE_H = 0.03;
const SPACING = 0.5;

// Height of the key's top above its base: sticks out at rest, almost flush
// when pressed (never exactly flush, or the two faces flicker)
const UP_Y = BASE_H + 0.1 - KEY_H / 2;
const DOWN_Y = BASE_H + 0.012 - KEY_H / 2;

const RUBBER = 0x2a2a2d;
// How much of the sound's color shows on the cap, mixed with the rubber color
const BRIGHTNESS = { off: 0.5, hover: 0.72, on: 1 };

function capColor(color, state) {
  return new THREE.Color(color).lerp(new THREE.Color(RUBBER), 1 - BRIGHTNESS[state]);
}

class SoundSelector extends THREE.Object3D {
  constructor() {
    super();
    this.keys = [];
    this.hovered = null;
    this.selected = null;

    const sideMaterial = new THREE.MeshLambertMaterial({ color: 0x3c3c40 });
    const baseMaterial = new THREE.MeshLambertMaterial({ color: 0x18181a });
    const keyGeometry = new THREE.BoxGeometry(SIZE, KEY_H, SIZE);
    const baseGeometry = new THREE.BoxGeometry(SIZE + BASE_MARGIN, BASE_H, SIZE + BASE_MARGIN);

    SOUNDS.forEach((sound, i) => {
      const group = new THREE.Object3D();
      group.position.z = (i - (SOUNDS.length - 1) / 2) * SPACING;

      const base = new THREE.Mesh(baseGeometry, baseMaterial);
      base.position.y = BASE_H / 2;
      group.add(base);

      const capMaterial = new THREE.MeshLambertMaterial({ color: capColor(sound.color, 'off') });
      const key = new THREE.Mesh(keyGeometry, [
        sideMaterial, sideMaterial, capMaterial, sideMaterial, sideMaterial, sideMaterial,
      ]);
      key.position.y = UP_Y;
      group.add(key);

      base.userData.soundId = sound.id;
      key.userData.soundId = sound.id;

      this.keys.push({
        id: sound.id, label: sound.label, color: sound.color, group, key, capMaterial,
      });
      this.add(group);
    });
  }

  _update(k) {
    const pressed = k.id === this.selected;
    let state = 'off';
    if (pressed) state = 'on';
    else if (k.id === this.hovered) state = 'hover';
    k.capMaterial.color.copy(capColor(k.color, state));
    k.key.position.y = pressed ? DOWN_Y : UP_Y;
  }

  select(id) {
    this.selected = id;
    this.keys.forEach((k) => this._update(k));
  }

  hover(id) {
    if (id === this.hovered) return;
    this.hovered = id;
    this.keys.forEach((k) => this._update(k));
  }

  // Returns the sound id under the raycaster, or null
  pick(raycaster) {
    const hit = raycaster.intersectObjects(this.keys.map((k) => k.group), true)[0];
    return hit ? hit.object.userData.soundId : null;
  }

  label(id) {
    return this.keys.find((k) => k.id === id).label;
  }
}

export default SoundSelector;
