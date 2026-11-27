import * as THREE from 'three';
import * as Tone from 'tone';
import './style.css';
import Webgl from './js/core/Webgl';
import loop from './js/core/Loop';
import Piano from './js/components/Piano';
import Box from './js/components/Box';


// ##
// INIT
const webgl = new Webgl(window.innerWidth, window.innerHeight);
document.body.appendChild(webgl.dom);
// - Add object update to loop
loop.add(webgl.onUpdate);

// ##
// EXAMPLE LIGHT
const light = new THREE.DirectionalLight(0xffffff, 0.5 * Math.PI);
light.position.set(0, 2, 1);
light.castShadow = true;
webgl.add(light);

const ambient_light = new THREE.AmbientLight(0xffffff, 0.5 * Math.PI);
webgl.add(ambient_light);

// ##
// GROUND
const ground = new Box(0xdddddd, 60, 0.1, 60);
webgl.add(ground);

// ##
// PIANO
const piano = new Piano();
webgl.add(piano);

// ##
// CONTROLS
// - sound buttons (left of the keys): click to pick a sound (a drag still rotates the camera)
// - octave wheel (right of the keys): drag it up or down, or scroll over it
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const WHEEL_DRAG_STEP = 40; // pixels per octave
let downAt = null;
let wheelDrag = null;
let wheelScroll = 0;

function aim(e) {
  const rect = webgl.dom.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, webgl.camera);
}

function buttonUnder(e) {
  aim(e);
  return piano.selector.pick(raycaster);
}

function wheelUnder(e) {
  aim(e);
  return piano.wheel.pick(raycaster);
}

function octaveTitle() {
  const o = piano.octave;
  return `Octave ${o > 0 ? '+' : ''}${o}`;
}

// Capture phase on the page: runs before the camera controls see the event
document.addEventListener('pointerdown', (e) => {
  if (e.target !== webgl.dom || !wheelUnder(e)) return;
  webgl.controls.enabled = false;
  wheelDrag = { y: e.clientY, octave: piano.octave };
}, { capture: true });

document.addEventListener('wheel', (e) => {
  if (e.target !== webgl.dom || !wheelUnder(e)) return;
  e.preventDefault();
  e.stopPropagation(); // no camera zoom
  // Trackpads send many small deltas: one octave per accumulated notch
  wheelScroll += e.deltaY;
  if (Math.abs(wheelScroll) >= 50) {
    piano.setOctave(piano.octave + (wheelScroll < 0 ? 1 : -1));
    wheelScroll = 0;
    webgl.dom.title = octaveTitle();
  }
}, { capture: true, passive: false });

window.addEventListener('pointermove', (e) => {
  if (!wheelDrag) return;
  const steps = Math.round((wheelDrag.y - e.clientY) / WHEEL_DRAG_STEP);
  piano.setOctave(wheelDrag.octave + steps);
});

window.addEventListener('pointerup', () => {
  if (!wheelDrag) return;
  wheelDrag = null;
  webgl.controls.enabled = true;
});

webgl.dom.addEventListener('pointerdown', (e) => {
  downAt = { x: e.clientX, y: e.clientY };
  // Browsers start audio suspended until a user gesture
  if (Tone.getContext().state !== 'running') {
    Tone.start();
  }
});

webgl.dom.addEventListener('pointerup', (e) => {
  if (!downAt) return;
  const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
  downAt = null;
  if (moved > 5) return;
  const id = buttonUnder(e);
  if (id) piano.setSound(id);
});

webgl.dom.addEventListener('pointermove', (e) => {
  if (wheelDrag) {
    webgl.dom.style.cursor = 'ns-resize';
    webgl.dom.title = '';
    return;
  }
  const id = buttonUnder(e);
  piano.selector.hover(id);
  if (id) {
    webgl.dom.style.cursor = 'pointer';
    webgl.dom.title = piano.selector.label(id);
  } else if (wheelUnder(e)) {
    webgl.dom.style.cursor = 'ns-resize';
    webgl.dom.title = octaveTitle();
  } else {
    webgl.dom.style.cursor = '';
    webgl.dom.title = '';
  }
});

loop.add(() => piano.wheel.update());

// ##
// RENDERER
loop.start();


// ##
// ON RESIZE / ORIENTATION CHANGE
function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;

  webgl.onResize(w, h);
}

window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', onResize);
