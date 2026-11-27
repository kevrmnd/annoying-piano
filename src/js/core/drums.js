import * as Tone from 'tone';

// 16-step drum sequencer: hi-hat, snare and kick, synthesized with Tone.js
export const STEPS = 16;
export const MIN_BPM = 60;
export const MAX_BPM = 180;
let bpm = 110;

export const TRACKS = [
  { id: 'hihat', label: 'Hi-hat', color: '#ffd23f' },
  { id: 'snare', label: 'Snare', color: '#3ee0b0' },
  { id: 'kick', label: 'Kick', color: '#ff5a5a' },
];

// A basic beat so Play gives something right away
const DEFAULT_PATTERN = {
  hihat: [0, 2, 4, 6, 8, 10, 12, 14],
  snare: [4, 12],
  kick: [0, 8, 10],
};

export const pattern = {};
TRACKS.forEach((t) => {
  pattern[t.id] = Array.from({ length: STEPS }, (_, i) => DEFAULT_PATTERN[t.id].includes(i));
});

let kit = null;

function createKit() {
  const out = new Tone.Volume(-6).toDestination();

  const kick = new Tone.MembraneSynth({
    pitchDecay: 0.05,
    octaves: 6,
    envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.1 },
  }).connect(out);

  const snareNoise = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 0.16, sustain: 0, release: 0.05 },
  }).connect(new Tone.Filter(1200, 'highpass').connect(out));
  snareNoise.volume.value = -6;
  const snareBody = new Tone.Synth({
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.05 },
  }).connect(out);
  snareBody.volume.value = -10;

  const hihat = new Tone.MetalSynth({
    envelope: { attack: 0.001, decay: 0.05, release: 0.01 },
    harmonicity: 5.1,
    modulationIndex: 32,
    resonance: 4000,
    octaves: 1.5,
  }).connect(out);
  hihat.volume.value = -22;

  return {
    hihat: (time) => hihat.triggerAttackRelease(250, '32n', time),
    snare: (time) => {
      snareNoise.triggerAttackRelease('16n', time);
      snareBody.triggerAttackRelease(180, '32n', time);
    },
    kick: (time) => kick.triggerAttackRelease('C1', '8n', time),
  };
}

let sequence = null;
let onStepListener = null;

// Called with the current step index (or -1 when stopped), in sync with the audio
export function onStep(listener) {
  onStepListener = listener;
}

export function toggleStep(track, step) {
  pattern[track][step] = !pattern[track][step];
  return pattern[track][step];
}

export function getBpm() {
  return bpm;
}

// Returns the tempo actually set (clamped to the knob's range)
export function setBpm(value) {
  bpm = Math.max(MIN_BPM, Math.min(MAX_BPM, Math.round(value)));
  Tone.getTransport().bpm.value = bpm;
  return bpm;
}

export function isPlaying() {
  return Tone.getTransport().state === 'started';
}

export function play() {
  if (!kit) kit = createKit();
  if (!sequence) {
    sequence = new Tone.Sequence((time, step) => {
      TRACKS.forEach((t) => {
        if (pattern[t.id][step]) kit[t.id](time);
      });
      Tone.getDraw().schedule(() => onStepListener && onStepListener(step), time);
    }, [...Array(STEPS).keys()], '16n').start(0);
  }
  const transport = Tone.getTransport();
  transport.bpm.value = bpm;
  transport.start();
}

export function stop() {
  Tone.getTransport().stop();
  // drop playhead updates already scheduled for the next frames
  Tone.getDraw().cancel(0);
  if (onStepListener) onStepListener(-1);
}
