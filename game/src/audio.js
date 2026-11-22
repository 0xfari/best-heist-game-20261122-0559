// Sound, synthesized live with WebAudio: no audio files ship with the game.
// Every sound is a few oscillators shaped by an envelope. The context only
// starts after the player's first gesture, as browsers require.

export function createAudio() {
  let context = null;
  let siren = null;
  let sirenGain = null;

  function ensure() {
    if (context !== null) return context;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    context = new AudioContext();
    return context;
  }

  function tone(freq, when, length, type, volume) {
    if (context === null) return;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(volume, when + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + length);
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(when);
    osc.stop(when + length + 0.05);
  }

  return {
    /** Call from the first user gesture so later sounds are allowed. */
    unlock() {
      const ctx = ensure();
      if (ctx !== null && ctx.state === 'suspended') ctx.resume();
    },
    /** A soft blip when small loot is pocketed. */
    pickup() {
      const ctx = ensure();
      if (ctx === null) return;
      tone(880, ctx.currentTime, 0.12, 'sine', 0.16);
      tone(1318, ctx.currentTime + 0.07, 0.16, 'sine', 0.12);
    },
    /** The vault case cracking open. */
    diamond() {
      const ctx = ensure();
      if (ctx === null) return;
      tone(523, ctx.currentTime, 0.14, 'triangle', 0.2);
      tone(784, ctx.currentTime + 0.09, 0.14, 'triangle', 0.2);
      tone(1046, ctx.currentTime + 0.18, 0.24, 'triangle', 0.2);
    },
    /** The coin's clink as it lands. */
    clink() {
      const ctx = ensure();
      if (ctx === null) return;
      tone(2093, ctx.currentTime, 0.09, 'square', 0.05);
      tone(1568, ctx.currentTime + 0.05, 0.12, 'square', 0.04);
    },
    /** A fuse box sparking as the cameras die. */
    fuse() {
      const ctx = ensure();
      if (ctx === null) return;
      tone(220, ctx.currentTime, 0.1, 'sawtooth', 0.1);
      tone(110, ctx.currentTime + 0.08, 0.18, 'sawtooth', 0.12);
    },
    /** A short rising tick while a guard's eyes fill. */
    tick(level) {
      const ctx = ensure();
      if (ctx === null) return;
      tone(660 + level * 440, ctx.currentTime, 0.06, 'sine', 0.05);
    },
    /** The two-tone siren while the alarm is up; call stopSiren to end it. */
    startSiren() {
      const ctx = ensure();
      if (ctx === null || siren !== null) return;
      siren = ctx.createOscillator();
      sirenGain = ctx.createGain();
      siren.type = 'sine';
      siren.frequency.setValueAtTime(620, ctx.currentTime);
      siren.frequency.linearRampToValueAtTime(920, ctx.currentTime + 0.4);
      siren.frequency.linearRampToValueAtTime(620, ctx.currentTime + 0.8);
      sirenGain.gain.setValueAtTime(0.05, ctx.currentTime);
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.setValueAtTime(1.25, ctx.currentTime);
      lfoGain.gain.setValueAtTime(160, ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(siren.frequency);
      siren.connect(sirenGain);
      sirenGain.connect(ctx.destination);
      siren.start();
      lfo.start();
      siren._lfo = lfo;
    },
    stopSiren() {
      if (siren === null) return;
      try {
        siren._lfo.stop();
        siren.stop();
      } catch {
        // Already stopped: nothing to do.
      }
      siren = null;
      sirenGain = null;
    },
    /** The getaway fanfare. */
    win() {
      const ctx = ensure();
      if (ctx === null) return;
      const notes = [523, 659, 784, 1046, 1318];
      for (let i = 0; i < notes.length; i += 1) {
        tone(notes[i], ctx.currentTime + i * 0.11, 0.22, 'triangle', 0.18);
      }
    },
    /** A low thud for getting caught. */
    caught() {
      const ctx = ensure();
      if (ctx === null) return;
      tone(196, ctx.currentTime, 0.3, 'sawtooth', 0.16);
      tone(98, ctx.currentTime + 0.16, 0.5, 'sawtooth', 0.18);
    },
  };
}
