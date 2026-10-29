let ctx = null;
let master = null;
let muted = false;
const VOLUME = 0.25;

function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : VOLUME;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone({ type = 'square', from = 880, to = 220, dur = 0.1, vol = 0.3, delay = 0 }) {
  if (muted || !ensure()) return;
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), t + dur);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(gain).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise({ dur = 0.4, vol = 0.5, from = 3000, to = 120 }) {
  if (muted || !ensure()) return;
  const t = ctx.currentTime;
  const len = Math.floor(ctx.sampleRate * dur);
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(from, t);
  filter.frequency.exponentialRampToValueAtTime(to, t + dur);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(filter).connect(gain).connect(master);
  src.start(t);
}

export const sfx = {
  unlock: ensure,
  shoot: () => tone({ from: 1400, to: 380, dur: 0.07, vol: 0.12 }),
  enemyShoot: () => tone({ type: 'sawtooth', from: 520, to: 160, dur: 0.12, vol: 0.06 }),
  hit: () => tone({ type: 'triangle', from: 300, to: 90, dur: 0.05, vol: 0.2 }),
  explode: (big = false) => noise(big ? { dur: 1.4, vol: 0.9, from: 2500, to: 60 } : { dur: 0.35, vol: 0.45 }),
  dive: () => tone({ type: 'sawtooth', from: 900, to: 200, dur: 0.35, vol: 0.05 }),
  playerHit: () => {
    noise({ dur: 0.8, vol: 0.8, from: 4000, to: 80 });
    tone({ from: 600, to: 50, dur: 0.6, vol: 0.2 });
  },
  shieldHit: () => tone({ type: 'triangle', from: 200, to: 900, dur: 0.25, vol: 0.25 }),
  powerup: () => [523, 659, 784, 1047].forEach((f, i) => tone({ from: f, to: f, dur: 0.08, vol: 0.15, delay: i * 0.06 })),
  wave: () => [392, 523].forEach((f, i) => tone({ type: 'triangle', from: f, to: f, dur: 0.18, vol: 0.2, delay: i * 0.16 })),
  gameOver: () => [392, 330, 262, 196].forEach((f, i) => tone({ type: 'triangle', from: f, to: f * 0.97, dur: 0.3, vol: 0.25, delay: i * 0.25 })),
  toggleMute() {
    muted = !muted;
    if (master) master.gain.value = muted ? 0 : VOLUME;
    return muted;
  },
};
