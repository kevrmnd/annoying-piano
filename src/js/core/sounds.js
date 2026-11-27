import * as Tone from 'tone';

// Each key plays two notes an octave apart (e.g. ['C3', 'C4']).
// `voicing` picks which notes a sound actually plays.
const octaveDown = (tones) => [Tone.Frequency(tones[0]).transpose(-12).toNote()];
const both = (tones) => tones;

const SOUNDS = [
  {
    id: 'bass',
    label: 'Basse',
    color: '#a46bff',
    voicing: octaveDown,
    create() {
      const synth = new Tone.PolySynth(Tone.MonoSynth, {
        oscillator: { type: 'square' },
        filter: { type: 'lowpass', Q: 2, rolloff: -24 },
        envelope: { attack: 0.005, decay: 0.3, sustain: 0.7, release: 0.3 },
        filterEnvelope: {
          attack: 0.005, decay: 0.25, sustain: 0.3, release: 0.3,
          baseFrequency: 90, octaves: 3.5,
        },
      }).toDestination();
      synth.volume.value = -10;
      return synth;
    },
  },
  {
    id: 'piano',
    label: 'Piano',
    color: '#35b8ff',
    voicing: both,
    create() {
      const reverb = new Tone.Reverb({ decay: 2.5, wet: 0.25 }).toDestination();
      const synth = new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 2,
        modulationIndex: 3.5,
        oscillator: { type: 'sine' },
        modulation: { type: 'triangle' },
        envelope: { attack: 0.002, decay: 1.6, sustain: 0.05, release: 0.9 },
        modulationEnvelope: { attack: 0.002, decay: 0.5, sustain: 0, release: 0.4 },
      }).connect(reverb);
      synth.volume.value = -8;
      return synth;
    },
  },
  {
    id: 'strings',
    label: 'Strings',
    color: '#ff9a2e',
    voicing: both,
    create() {
      const reverb = new Tone.Reverb({ decay: 4, wet: 0.4 }).toDestination();
      const filter = new Tone.Filter(1800, 'lowpass').connect(reverb);
      const synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'fatsawtooth', count: 3, spread: 25 },
        envelope: { attack: 0.35, decay: 0.2, sustain: 0.9, release: 1.4 },
      }).connect(filter);
      synth.volume.value = -16;
      return synth;
    },
  },
  {
    id: 'synth',
    label: 'Synthé',
    color: '#ff4f7b',
    voicing: both,
    // The original annoying sound
    create() {
      const synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sawtooth' },
      }).toDestination();
      synth.volume.value = -10;
      return synth;
    },
  },
];

export const DEFAULT_SOUND = 'synth';

const instances = {};

// Synths are created on first use and kept for later
export function getSynth(id) {
  if (!instances[id]) {
    instances[id] = SOUNDS.find((s) => s.id === id).create();
  }
  return instances[id];
}

export function getVoicing(id, tones) {
  return SOUNDS.find((s) => s.id === id).voicing(tones);
}

export default SOUNDS;
