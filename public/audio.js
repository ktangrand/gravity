let ctx = null;
let muted = false;

function ensureContext () {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
  return ctx;
}

function playLaunch () {
  if (muted) return;
  const a = ensureContext();
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.connect(gain);
  gain.connect(a.destination);
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(200, a.currentTime);
  osc.frequency.exponentialRampToValueAtTime(800, a.currentTime + 0.3);
  gain.gain.setValueAtTime(0.15, a.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.3);
  osc.start(a.currentTime);
  osc.stop(a.currentTime + 0.3);
}

function playImpact () {
  if (muted) return;
  const a = ensureContext();
  const bufferSize = Math.floor(a.sampleRate * 0.2);
  const buffer = a.createBuffer(1, bufferSize, a.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const source = a.createBufferSource();
  source.buffer = buffer;
  const gain = a.createGain();
  gain.gain.setValueAtTime(0.2, a.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.2);
  source.connect(gain);
  gain.connect(a.destination);
  source.start();
}

function playMine () {
  if (muted) return;
  const a = ensureContext();
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.connect(gain);
  gain.connect(a.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, a.currentTime);
  osc.frequency.setValueAtTime(800, a.currentTime + 0.08);
  gain.gain.setValueAtTime(0.1, a.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.15);
  osc.start(a.currentTime);
  osc.stop(a.currentTime + 0.15);
}

function playBlocked () {
  if (muted) return;
  const a = ensureContext();
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.connect(gain);
  gain.connect(a.destination);
  osc.type = 'square';
  osc.frequency.setValueAtTime(150, a.currentTime);
  osc.frequency.setValueAtTime(100, a.currentTime + 0.1);
  gain.gain.setValueAtTime(0.1, a.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.2);
  osc.start(a.currentTime);
  osc.stop(a.currentTime + 0.2);
}

let ambientOsc = null;
let ambientGain = null;

function startAmbient () {
  if (muted || ambientOsc) return;
  const a = ensureContext();
  ambientOsc = a.createOscillator();
  ambientGain = a.createGain();
  const filter = a.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(200, a.currentTime);
  ambientOsc.type = 'sawtooth';
  ambientOsc.frequency.setValueAtTime(55, a.currentTime);
  ambientGain.gain.setValueAtTime(0.03, a.currentTime);
  ambientOsc.connect(filter);
  filter.connect(ambientGain);
  ambientGain.connect(a.destination);
  ambientOsc.start();
}

function stopAmbient () {
  if (ambientOsc) {
    ambientOsc.stop();
    ambientOsc = null;
    ambientGain = null;
  }
}

function toggleMute () {
  muted = !muted;
  if (muted) {
    stopAmbient();
  } else {
    startAmbient();
  }
  return muted;
}

function isMuted () {
  return muted;
}

export { playLaunch, playImpact, playMine, playBlocked, startAmbient, toggleMute, isMuted };
