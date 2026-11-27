import * as Tone from 'tone';

// Small synthesized sounds for the controls, kept apart from the instruments
// (no reverb). Created on first use, once audio has been started.
let voices = null;

function createVoices() {
  const out = new Tone.Volume(-10).toDestination();

  // Button: short filtered noise for the plastic click + a soft low "thock"
  const clickNoise = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.01 },
  }).connect(new Tone.Filter(2600, 'bandpass').connect(out));
  clickNoise.volume.value = -10;
  const thock = new Tone.MembraneSynth({
    pitchDecay: 0.012,
    octaves: 3,
    envelope: { attack: 0.001, decay: 0.07, sustain: 0, release: 0.02 },
  }).connect(out);
  thock.volume.value = -14;

  // Wheel detent: very short, bright tick
  const tickNoise = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.0005, decay: 0.012, sustain: 0, release: 0.005 },
  }).connect(new Tone.Filter(5000, 'highpass').connect(out));
  tickNoise.volume.value = -8;
  const tickTone = new Tone.Synth({
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.0005, decay: 0.025, sustain: 0, release: 0.01 },
  }).connect(out);
  tickTone.volume.value = -20;

  return {
    clickNoise, thock, tickNoise, tickTone,
  };
}

function ready() {
  if (Tone.getContext().state !== 'running') return false;
  if (!voices) voices = createVoices();
  return true;
}

// Monophonic synths refuse two notes at the same instant: nudge the time
let last = 0;
function when() {
  last = Math.max(Tone.now(), last + 0.001);
  return last;
}

export function playClick() {
  if (!ready()) return;
  const t = when();
  voices.clickNoise.triggerAttackRelease(0.03, t);
  voices.thock.triggerAttackRelease('G2', 0.07, t);
}

// soft: much quieter, for controls turned quickly (tempo knob)
export function playTick(soft = false) {
  if (!ready()) return;
  const t = when();
  const velocity = soft ? 0.3 : 1;
  voices.tickNoise.triggerAttackRelease(0.012, t, velocity);
  voices.tickTone.triggerAttackRelease(2200, 0.025, t, velocity);
}

// End of the wheel's range: a duller knock
export function playLimit() {
  if (!ready()) return;
  const t = when();
  voices.thock.triggerAttackRelease('D2', 0.07, t);
  voices.tickTone.triggerAttackRelease(700, 0.02, t);
}
