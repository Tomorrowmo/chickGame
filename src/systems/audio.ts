/**
 * Programmatic audio system using Web Audio API.
 * All sounds are generated with oscillators and noise — no audio files needed.
 */

let ctx: AudioContext | null = null
let masterGain: GainNode | null = null
let _muted = localStorage.getItem('linda-muted') === 'true'
let _volume = 0.35

function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext()
    masterGain = ctx.createGain()
    masterGain.gain.value = _muted ? 0 : _volume
    masterGain.connect(ctx.destination)
  }
  // Resume if suspended (browser autoplay policy)
  if (ctx.state === 'suspended') {
    ctx.resume()
  }
  return ctx
}

function getMaster(): GainNode {
  getCtx()
  return masterGain!
}

// ─── helpers ────────────────────────────────────────────────────────────────

function osc(
  type: OscillatorType,
  freq: number,
  startTime: number,
  duration: number,
  gainValue: number,
  destination?: AudioNode,
) {
  const c = getCtx()
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.value = freq
  g.gain.setValueAtTime(gainValue, startTime)
  g.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
  o.connect(g)
  g.connect(destination ?? getMaster())
  o.start(startTime)
  o.stop(startTime + duration + 0.05)
}

function freqRamp(
  type: OscillatorType,
  startFreq: number,
  endFreq: number,
  startTime: number,
  duration: number,
  gainValue: number,
) {
  const c = getCtx()
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(startFreq, startTime)
  o.frequency.exponentialRampToValueAtTime(endFreq, startTime + duration)
  g.gain.setValueAtTime(gainValue, startTime)
  g.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
  o.connect(g)
  g.connect(getMaster())
  o.start(startTime)
  o.stop(startTime + duration + 0.05)
}

function noise(startTime: number, duration: number, gainValue: number, filterFreq?: number) {
  const c = getCtx()
  const bufferSize = c.sampleRate * duration
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1
  }
  const src = c.createBufferSource()
  src.buffer = buffer

  const g = c.createGain()
  g.gain.setValueAtTime(gainValue, startTime)
  g.gain.exponentialRampToValueAtTime(0.001, startTime + duration)

  if (filterFreq) {
    const filter = c.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = filterFreq
    filter.Q.value = 1
    src.connect(filter)
    filter.connect(g)
  } else {
    src.connect(g)
  }

  g.connect(getMaster())
  src.start(startTime)
  src.stop(startTime + duration + 0.05)
}

// ─── public sound functions ─────────────────────────────────────────────────

/** Short high-pitched chirp for chick click */
export function chirp() {
  const t = getCtx().currentTime
  osc('sine', 1200, t, 0.06, 0.25)
  osc('sine', 1600, t + 0.06, 0.06, 0.2)
  osc('sine', 1400, t + 0.12, 0.08, 0.15)
}

/** Scatter/sprinkle sound for feeding */
export function feed() {
  const t = getCtx().currentTime
  noise(t, 0.15, 0.15, 4000)
  for (let i = 0; i < 4; i++) {
    const freq = 800 + Math.random() * 600
    osc('sine', freq, t + i * 0.04, 0.05, 0.1)
  }
}

/** Crack + mini fanfare for egg hatching */
export function hatch() {
  const t = getCtx().currentTime
  // === Cracking sounds: multiple cracks building up ===
  noise(t, 0.08, 0.15, 2500)
  noise(t + 0.1, 0.06, 0.12, 3000)
  noise(t + 0.18, 0.1, 0.2, 2000)
  // Big crack
  noise(t + 0.3, 0.15, 0.35, 1800)
  noise(t + 0.32, 0.12, 0.3, 3500)
  // Shell pop
  freqRamp('square', 400, 100, t + 0.4, 0.06, 0.2)

  // === Baby chick first chirp! ===
  osc('sine', 1200, t + 0.55, 0.06, 0.12)
  osc('sine', 1400, t + 0.62, 0.05, 0.10)
  osc('sine', 1100, t + 0.68, 0.07, 0.11)

  // === Celebration fanfare: ascending sparkle notes ===
  osc('triangle', 523, t + 0.8, 0.12, 0.18)   // C5
  osc('triangle', 659, t + 0.92, 0.12, 0.18)  // E5
  osc('triangle', 784, t + 1.04, 0.12, 0.18)  // G5
  osc('triangle', 1047, t + 1.16, 0.3, 0.22)  // C6 (held longer)
  // Sparkle shimmer
  osc('sine', 2093, t + 1.2, 0.08, 0.06)
  osc('sine', 2349, t + 1.28, 0.06, 0.05)
  osc('sine', 2637, t + 1.35, 0.05, 0.04)
  // Final warm chord
  osc('triangle', 523, t + 1.4, 0.4, 0.15)
  osc('triangle', 659, t + 1.4, 0.4, 0.12)
  osc('triangle', 784, t + 1.4, 0.4, 0.12)
}

/** Small pop for effects appearing */
export function pop() {
  const t = getCtx().currentTime
  freqRamp('sine', 600, 200, t, 0.08, 0.2)
}

/** Water splash — filtered noise burst + descending bubble tones */
export function splash() {
  const t = getCtx().currentTime
  // Filtered white noise for the "splat"
  noise(t, 0.25, 0.2, 800)
  // Bubble tones descending
  freqRamp('sine', 1200, 400, t, 0.15, 0.12)
  freqRamp('sine', 900, 300, t + 0.05, 0.12, 0.1)
  freqRamp('sine', 600, 200, t + 0.1, 0.1, 0.08)
}

/** Upbeat jingle — 4 ascending notes */
export function gameStart() {
  const t = getCtx().currentTime
  const notes = [523, 659, 784, 1047] // C5 E5 G5 C6
  notes.forEach((f, i) => {
    osc('triangle', f, t + i * 0.12, 0.15, 0.2)
  })
}

/** Happy ascending jingle + resolution chord */
export function gameWin() {
  const t = getCtx().currentTime
  const notes = [523, 659, 784, 1047]
  notes.forEach((f, i) => {
    osc('triangle', f, t + i * 0.12, 0.18, 0.18)
  })
  // resolution chord
  const chordTime = t + 0.55
  osc('triangle', 1047, chordTime, 0.5, 0.18)
  osc('triangle', 1319, chordTime, 0.5, 0.14)
  osc('triangle', 1568, chordTime, 0.5, 0.12)
}

/** Descending sad notes */
export function gameLose() {
  const t = getCtx().currentTime
  const notes = [784, 659, 523, 392] // G5 E5 C5 G4
  notes.forEach((f, i) => {
    osc('sine', f, t + i * 0.18, 0.22, 0.18)
  })
}

// ─── volume / mute controls ────────────────────────────────────────────────

export function isMuted(): boolean {
  return _muted
}

export function setMuted(muted: boolean) {
  _muted = muted
  localStorage.setItem('linda-muted', String(muted))
  if (masterGain) {
    masterGain.gain.setValueAtTime(_muted ? 0 : _volume, getCtx().currentTime)
  }
}

export function toggleMute(): boolean {
  setMuted(!_muted)
  return _muted
}

export function setVolume(v: number) {
  _volume = Math.max(0, Math.min(1, v))
  if (masterGain && !_muted) {
    masterGain.gain.setValueAtTime(_volume, getCtx().currentTime)
  }
}
