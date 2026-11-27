import * as THREE from 'three';
import {
  STEPS, TRACKS, MIN_BPM, MAX_BPM, pattern,
} from '../core/drums';

// Drum machine centered on the strip behind the keys: a retro pink phosphor
// screen set in a raised frame, showing the 3 x 16 grid (click a cell to
// toggle it), with a tempo knob above a physical play key on its right.
// Positions are in piano space.

const SCREEN_W = 3.4;
const SCREEN_D = 0.85;
const FRAME = 0.035; // raised frame around the screen
const FRAME_H = 0.055;
const SCREEN_Y = 0.036; // recessed below the frame's top
const GAP = 0.12; // between the frame and the controls
const CONTROLS_W = 0.44;
const STRIP_Z = -1.75; // middle of the strip behind the keys

// The screen + controls group is centered on x = 0
const GROUP_W = SCREEN_W + 2 * FRAME + GAP + CONTROLS_W;
const SCREEN_X = -GROUP_W / 2 + FRAME + SCREEN_W / 2;
const SCREEN_Z = STRIP_Z;
const CONTROLS_X = GROUP_W / 2 - CONTROLS_W / 2;
// Controls column lined up with the frame: the knob plate's back edge on the
// frame's back edge, the play key's base front edge on the frame's front edge
const OUTER_D = SCREEN_D + 2 * FRAME;
const KNOB_PLATE_R = 0.2;
const PLAY = 0.38;
const PLAY_BASE = PLAY + 0.06;
const KNOB_Z = STRIP_Z - OUTER_D / 2 + KNOB_PLATE_R;
const PLAY_Z = STRIP_Z + OUTER_D / 2 - PLAY_BASE / 2;

// Canvas layout (pixels)
const CW = 1300;
const CH = Math.round(CW * (SCREEN_D / SCREEN_W));
const MARGIN = 22;
const HEADER_H = 52;
const LABEL_W = 140;
const GROUP_GAP = 16;
const GRID_X = MARGIN + LABEL_W;
const GRID_Y = MARGIN + HEADER_H + 8;
const GRID_W = CW - GRID_X - MARGIN;
// extra room at the bottom: the frame's front edge hides a little of it
const GRID_H = CH - GRID_Y - MARGIN - 12;
const COL_W = (GRID_W - 3 * GROUP_GAP) / STEPS;
const ROW_H = GRID_H / TRACKS.length;

const BG = '#12060a';
const ON = '#ff5c8a';
const BRIGHT = '#ffd6e2'; // active cell on the playing step
const MID = '#8a2f4c';
const LABEL = '#c4466e';
const CELL_OFF = '#241018';
const CELL_OFF_BEAT = '#2e1420'; // first step of each beat
const LABELS = { hihat: 'HAT', snare: 'SNR', kick: 'KCK' };

// 5 x 7 pixel font, only the characters the screen needs
const FONT = {
  0: ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  2: ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  3: ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  4: ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  5: ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  6: ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  7: ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  8: ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  9: ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
};

function drawText(ctx, text, x, y, px, color) {
  ctx.fillStyle = color;
  [...text].forEach((ch, i) => {
    const glyph = FONT[ch] || FONT[' '];
    glyph.forEach((row, r) => {
      [...row].forEach((bit, c) => {
        if (bit === '1') ctx.fillRect(x + (i * 6 + c) * px, y + r * px, px - 1, px - 1);
      });
    });
  });
}

function textWidth(text, px) {
  return (text.length * 6 - 1) * px;
}

function cellRect(row, step) {
  const x = GRID_X + step * COL_W + Math.floor(step / 4) * GROUP_GAP;
  const y = GRID_Y + row * ROW_H;
  return { x, y, w: COL_W, h: ROW_H };
}

// Small ribbed knob, like the Akai K1-K8
function makeKnob() {
  const R = 0.16;
  const knob = new THREE.Object3D();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(R, R, 0.16, 32),
    new THREE.MeshLambertMaterial({ color: 0x232326, flatShading: true }),
  );
  body.position.y = 0.08;
  knob.add(body);
  const ribMat = new THREE.MeshLambertMaterial({ color: 0x3e3e44 });
  const ribGeo = new THREE.BoxGeometry(0.02, 0.15, 0.025);
  for (let i = 0; i < 24; i += 1) {
    const a = (i / 24) * Math.PI * 2;
    const rib = new THREE.Mesh(ribGeo, ribMat);
    rib.position.set(Math.sin(a) * R, 0.08, Math.cos(a) * R);
    rib.rotation.y = a;
    knob.add(rib);
  }
  const pointer = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.01, R * 0.7),
    new THREE.MeshLambertMaterial({ color: 0xeeeeee }),
  );
  pointer.position.set(0, 0.165, -R * 0.55);
  knob.add(pointer);
  return { knob, body };
}

function playTexture(color) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#2a2a2d';
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(98, 78);
  ctx.lineTo(178, 128);
  ctx.lineTo(98, 178);
  ctx.closePath();
  ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 8;
  return texture;
}

class DrumMachine extends THREE.Object3D {
  constructor() {
    super();
    this.step = -1;
    this.playing = false;
    this.bpm = 110;
    this.hovered = null;
    this.hitTargets = [];

    const baseMat = new THREE.MeshLambertMaterial({ color: 0x18181a });
    const side = new THREE.MeshLambertMaterial({ color: 0x3c3c40 });

    // Raised frame around the recessed screen: lighter top, darker walls
    const frameTop = new THREE.MeshLambertMaterial({ color: 0x2c2c30 });
    const frameWall = new THREE.MeshLambertMaterial({ color: 0x161618 });
    const frameMats = [frameWall, frameWall, frameTop, frameWall, frameWall, frameWall];
    const outerW = SCREEN_W + 2 * FRAME;
    const outerD = OUTER_D;
    [
      [outerW, FRAME, 0, -(SCREEN_D + FRAME) / 2],
      [outerW, FRAME, 0, (SCREEN_D + FRAME) / 2],
      [FRAME, SCREEN_D, -(SCREEN_W + FRAME) / 2, 0],
      [FRAME, SCREEN_D, (SCREEN_W + FRAME) / 2, 0],
    ].forEach(([w, d, x, z]) => {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(w, FRAME_H, d), frameMats);
      bar.position.set(SCREEN_X + x, FRAME_H / 2, SCREEN_Z + z);
      this.add(bar);
    });
    // Floor of the recess, under the screen, and a dark base under the frame
    const well = new THREE.Mesh(
      new THREE.BoxGeometry(outerW, SCREEN_Y, outerD),
      new THREE.MeshLambertMaterial({ color: 0x0c0c0d }),
    );
    well.position.set(SCREEN_X, SCREEN_Y / 2, SCREEN_Z);
    this.add(well);

    this.canvas = document.createElement('canvas');
    this.canvas.width = CW;
    this.canvas.height = CH;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.anisotropy = 8;
    this.screen = new THREE.Mesh(
      new THREE.PlaneGeometry(SCREEN_W, SCREEN_D),
      new THREE.MeshBasicMaterial({ map: this.texture }),
    );
    this.screen.rotation.x = -Math.PI / 2;
    this.screen.position.set(SCREEN_X, SCREEN_Y + 0.001, SCREEN_Z);
    this.screen.userData.target = { type: 'screen' };
    this.add(this.screen);
    this.hitTargets.push(this.screen);

    // Play key
    const PLAY_H = 0.12;
    this.playUp = 0.025 + 0.09 - PLAY_H / 2;
    this.playDown = 0.025 + 0.012 - PLAY_H / 2;
    this.playOff = playTexture('#cfcfd4');
    this.playOn = playTexture(ON);
    this.playCap = new THREE.MeshLambertMaterial({ map: this.playOff });
    const playBase = new THREE.Mesh(new THREE.BoxGeometry(PLAY_BASE, 0.025, PLAY_BASE), baseMat);
    playBase.position.set(CONTROLS_X, 0.0125, PLAY_Z);
    this.add(playBase);
    this.playKey = new THREE.Mesh(
      new THREE.BoxGeometry(PLAY, PLAY_H, PLAY),
      [side, side, this.playCap, side, side, side],
    );
    this.playKey.position.set(CONTROLS_X, this.playUp, PLAY_Z);
    this.add(this.playKey);
    playBase.userData.target = { type: 'play' };
    this.playKey.userData.target = { type: 'play' };
    this.hitTargets.push(playBase, this.playKey);

    // Tempo knob above the play key, on a small round plate
    const plate = new THREE.Mesh(
      new THREE.CylinderGeometry(KNOB_PLATE_R, KNOB_PLATE_R, 0.02, 32),
      baseMat,
    );
    plate.position.set(CONTROLS_X, 0.01, KNOB_Z);
    this.add(plate);
    const { knob, body } = makeKnob();
    knob.position.set(CONTROLS_X, 0.02, KNOB_Z);
    this.add(knob);
    this.knob = knob;
    this.knobAngle = this.bpmAngle(this.bpm);
    plate.userData.target = { type: 'tempo' };
    body.userData.target = { type: 'tempo' };
    this.hitTargets.push(plate, body);

    this.draw();
  }

  // Knob turns over 270 degrees from MIN_BPM to MAX_BPM
  bpmAngle(bpm) {
    const t = (bpm - MIN_BPM) / (MAX_BPM - MIN_BPM);
    return THREE.MathUtils.degToRad(-135 + t * 270);
  }

  draw() {
    const ctx = this.canvas.getContext('2d');
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, CW, CH);

    // Header: play / stop icon and step on the left, tempo on the right
    const px = 6;
    const iconY = MARGIN + 4;
    ctx.fillStyle = this.playing ? ON : MID;
    if (this.playing) {
      for (let r = 0; r < 7; r += 1) {
        const w = r < 4 ? r + 1 : 7 - r;
        ctx.fillRect(MARGIN, iconY + r * px, w * px - 1, px - 1);
      }
    } else {
      ctx.fillRect(MARGIN, iconY, 6 * px - 1, 7 * px - 1);
    }
    const stepText = this.playing ? `${String(this.step + 1).padStart(2, '0')}` : '  ';
    drawText(ctx, stepText, MARGIN + 60, iconY, px, ON);
    const bpmText = `${this.bpm} BPM`;
    drawText(ctx, bpmText, CW - MARGIN - textWidth(bpmText, px), iconY, px, ON);

    // Row labels
    TRACKS.forEach((t, row) => {
      const y = GRID_Y + row * ROW_H + (ROW_H - 7 * 6) / 2;
      drawText(ctx, LABELS[t.id], MARGIN, y, 6, LABEL);
    });

    // Playing step: highlighted column
    if (this.playing && this.step >= 0) {
      const { x } = cellRect(0, this.step);
      ctx.fillStyle = 'rgba(255, 92, 138, 0.16)';
      ctx.fillRect(x, GRID_Y - 6, COL_W, GRID_H + 12);
    }

    // Cells
    TRACKS.forEach((t, row) => {
      for (let step = 0; step < STEPS; step += 1) {
        const r = cellRect(row, step);
        const inset = 8;
        const x = r.x + inset;
        const y = r.y + inset;
        const w = r.w - inset * 2;
        const h = r.h - inset * 2;
        const on = pattern[t.id][step];
        const hovered = this.hovered && this.hovered.track === t.id && this.hovered.step === step;
        if (on) {
          ctx.fillStyle = this.playing && step === this.step ? BRIGHT : ON;
          ctx.fillRect(x, y, w, h);
        } else {
          ctx.fillStyle = step % 4 === 0 ? CELL_OFF_BEAT : CELL_OFF;
          ctx.fillRect(x, y, w, h);
        }
        if (hovered) {
          ctx.strokeStyle = on ? BRIGHT : MID;
          ctx.lineWidth = 4;
          ctx.strokeRect(x - 4, y - 4, w + 8, h + 8);
        }
      }
    });

    // Scanlines and a soft vignette for the CRT feel
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    for (let y = 0; y < CH; y += 4) ctx.fillRect(0, y, CW, 1);
    const vignette = ctx.createRadialGradient(CW / 2, CH / 2, CH * 0.4, CW / 2, CH / 2, CW * 0.62);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, CW, CH);

    this.texture.needsUpdate = true;
  }

  setPlaying(playing) {
    this.playing = playing;
    this.playCap.map = playing ? this.playOn : this.playOff;
    this.playKey.position.y = playing ? this.playDown : this.playUp;
    this.draw();
  }

  setStep(step) {
    this.step = step;
    this.draw();
  }

  setBpm(bpm) {
    this.bpm = bpm;
    this.draw();
  }

  update() {
    const target = this.bpmAngle(this.bpm);
    this.knobAngle += (target - this.knobAngle) * 0.25;
    this.knob.rotation.y = -this.knobAngle;
  }

  hover(target) {
    const cell = target && target.type === 'cell' ? target : null;
    const same = (cell && this.hovered && cell.track === this.hovered.track
      && cell.step === this.hovered.step) || (!cell && !this.hovered);
    if (same) return;
    this.hovered = cell;
    this.draw();
  }

  // { type: 'cell', track, step }, { type: 'play' }, { type: 'tempo' },
  // or null (also null on the screen outside the cells)
  pick(raycaster) {
    const hit = raycaster.intersectObjects(this.hitTargets, false)[0];
    if (!hit) return null;
    const { target } = hit.object.userData;
    if (target.type !== 'screen') return target;
    const cx = hit.uv.x * CW;
    const cy = (1 - hit.uv.y) * CH;
    for (let row = 0; row < TRACKS.length; row += 1) {
      for (let step = 0; step < STEPS; step += 1) {
        const r = cellRect(row, step);
        if (cx >= r.x && cx < r.x + r.w && cy >= r.y && cy < r.y + r.h) {
          return { type: 'cell', track: TRACKS[row].id, step };
        }
      }
    }
    return null;
  }
}

export default DrumMachine;
