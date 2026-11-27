import * as THREE from 'three';
import * as Tone from 'tone';
import './style.css';
import Webgl from './js/core/Webgl';
import loop from './js/core/Loop';
import Piano from './js/components/Piano';
import Box from './js/components/Box';
import addWorldFog from './js/core/worldFog';
import DrumMachine from './js/components/DrumMachine';
import Speaker from './js/components/Speaker';
import { playClick, playTick, playLimit } from './js/core/uiSounds';
import * as drums from './js/core/drums';
import { TRACKS } from './js/core/drums';


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
const ground = new Box(0xdddddd, 120, 0.1, 120);
// The ground fades into the background around the piano, whatever the zoom
addWorldFog(ground.boxMesh.material, { color: 0xf2f2f2, near: 12, far: 45 });
webgl.add(ground);

// ##
// PIANO
const piano = new Piano();
webgl.add(piano);

// ##
// DRUM MACHINE, centered on the strip behind the keys, between two speakers
[-3.72, 3.72].forEach((x) => {
  const speaker = new Speaker();
  speaker.position.set(x, 0.5, -1.75);
  piano.add(speaker);
});
const drumMachine = new DrumMachine();
drumMachine.position.y = 0.5; // its parts are placed in piano space
piano.add(drumMachine);
drums.onStep((step) => drumMachine.setStep(step));
loop.add(() => drumMachine.update());

// ##
// CONTROLS
// - sound buttons (left of the keys): click to pick a sound (a drag still rotates the camera)
// - octave wheel (right of the keys): drag it up or down, or scroll over it
// - piano keys: press with the mouse, slide across them for a glissando
// - drum machine: click a cell on the screen to toggle it (silent), play key
//   to start / stop the loop, tempo knob: drag it up or down or scroll over it
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const WHEEL_DRAG_STEP = 40; // pixels per octave
let downAt = null;
let wheelDrag = null;
let wheelScroll = 0;
let tempoDrag = null;
let tempoScroll = 0;
let mouseKeys = false; // mouse button held down on the keys
let mouseKey = null; // key played by the mouse

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

function drumUnder(e) {
  aim(e);
  return drumMachine.pick(raycaster);
}

// Soft tick, at most every 45 ms so a fast scroll doesn't rattle
let lastTempoTick = 0;
function changeTempo(target) {
  const before = drums.getBpm();
  const bpm = drums.setBpm(target);
  if (bpm !== before) {
    const now = performance.now();
    if (now - lastTempoTick > 45) {
      playTick(true);
      lastTempoTick = now;
    }
    drumMachine.setBpm(bpm);
  }
}

function drumTitle(target) {
  if (target.type === 'play') return drums.isPlaying() ? 'Stop' : 'Lecture';
  if (target.type === 'tempo') return `Tempo ${drums.getBpm()} BPM`;
  const track = TRACKS.find((t) => t.id === target.track);
  return `${track.label} · pas ${target.step + 1}`;
}

function keyUnder(e) {
  aim(e);
  return piano.pickKey(raycaster);
}

function playMouseKey(code) {
  if (code === mouseKey) return;
  if (mouseKey !== null) piano.releaseKey(mouseKey);
  mouseKey = code;
  if (code !== null) piano.pressKey(code);
}

// Changes the octave with a tick per change; returns true if the wanted
// octave is past the end of the wheel's range
function changeOctave(target) {
  const before = piano.octave;
  piano.setOctave(target);
  if (piano.octave !== before) playTick();
  return piano.octave !== target;
}

function octaveTitle() {
  const o = piano.octave;
  return `Octave ${o > 0 ? '+' : ''}${o}`;
}

// Capture phase on the page: runs before the camera controls see the event,
// so pressing a key or the wheel doesn't rotate the camera
document.addEventListener('pointerdown', (e) => {
  if (e.target !== webgl.dom || e.button !== 0) return;
  if (wheelUnder(e)) {
    webgl.controls.enabled = false;
    wheelDrag = { y: e.clientY, octave: piano.octave };
    return;
  }
  const drum = drumUnder(e);
  if (drum && drum.type === 'tempo') {
    webgl.controls.enabled = false;
    tempoDrag = { y: e.clientY, bpm: drums.getBpm() };
    return;
  }
  const code = keyUnder(e);
  if (code !== null) {
    webgl.controls.enabled = false;
    if (Tone.getContext().state !== 'running') {
      Tone.start();
    }
    mouseKeys = true;
    playMouseKey(code);
  }
}, { capture: true });

document.addEventListener('wheel', (e) => {
  if (e.target === webgl.dom) {
    const drum = drumUnder(e);
    if (drum && drum.type === 'tempo') {
      e.preventDefault();
      e.stopPropagation(); // no camera zoom
      tempoScroll += e.deltaY;
      if (Math.abs(tempoScroll) >= 50) {
        changeTempo(drums.getBpm() + (tempoScroll < 0 ? 2 : -2));
        tempoScroll = 0;
        webgl.dom.title = drumTitle(drum);
      }
      return;
    }
  }
  if (e.target !== webgl.dom || !wheelUnder(e)) return;
  e.preventDefault();
  e.stopPropagation(); // no camera zoom
  // Trackpads send many small deltas: one octave per accumulated notch
  wheelScroll += e.deltaY;
  if (Math.abs(wheelScroll) >= 50) {
    if (changeOctave(piano.octave + (wheelScroll < 0 ? 1 : -1))) playLimit();
    wheelScroll = 0;
    webgl.dom.title = octaveTitle();
  }
}, { capture: true, passive: false });

window.addEventListener('pointermove', (e) => {
  if (tempoDrag) {
    // 1 BPM per 4 pixels, up is faster
    changeTempo(tempoDrag.bpm + Math.round((tempoDrag.y - e.clientY) / 4));
    return;
  }
  if (mouseKeys) {
    // Glissando: the note follows the pointer, silence outside the keys
    playMouseKey(e.target === webgl.dom ? keyUnder(e) : null);
    return;
  }
  if (!wheelDrag) return;
  const steps = Math.round((wheelDrag.y - e.clientY) / WHEEL_DRAG_STEP);
  const atLimit = changeOctave(wheelDrag.octave + steps);
  // knock once when the drag goes past the end, not on every move
  if (atLimit && !wheelDrag.atLimit) playLimit();
  wheelDrag.atLimit = atLimit;
});

function endPointer() {
  if (mouseKeys) {
    mouseKeys = false;
    playMouseKey(null);
    webgl.controls.enabled = true;
  }
  if (wheelDrag) {
    wheelDrag = null;
    webgl.controls.enabled = true;
  }
  if (tempoDrag) {
    tempoDrag = null;
    webgl.controls.enabled = true;
  }
}
window.addEventListener('pointerup', endPointer);
window.addEventListener('pointercancel', endPointer);
window.addEventListener('blur', endPointer);

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
  if (id) {
    playClick();
    piano.setSound(id);
    return;
  }
  const drum = drumUnder(e);
  if (drum && drum.type === 'cell') {
    drums.toggleStep(drum.track, drum.step);
    drumMachine.draw();
  } else if (drum && drum.type === 'play') {
    playClick();
    if (drums.isPlaying()) {
      drums.stop();
      drumMachine.setPlaying(false);
    } else {
      Tone.start().then(() => drums.play());
      drumMachine.setPlaying(true);
    }
    webgl.dom.title = drumTitle(drum);
  }
});

webgl.dom.addEventListener('pointermove', (e) => {
  if (wheelDrag || tempoDrag) {
    webgl.dom.style.cursor = 'ns-resize';
    webgl.dom.title = '';
    return;
  }
  const id = buttonUnder(e);
  piano.selector.hover(id);
  const drum = id ? null : drumUnder(e);
  drumMachine.hover(drum);
  if (drum) {
    webgl.dom.style.cursor = drum.type === 'tempo' ? 'ns-resize' : 'pointer';
    webgl.dom.title = drumTitle(drum);
  } else if (id) {
    webgl.dom.style.cursor = 'pointer';
    webgl.dom.title = piano.selector.label(id);
  } else if (keyUnder(e) !== null) {
    webgl.dom.style.cursor = 'pointer';
    webgl.dom.title = '';
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
