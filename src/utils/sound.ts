// Beautiful audio sound effects engine powered by Web Audio API
// Runs 100% offline with zero dependencies and zero download latency!

let audioCtx: AudioContext | null = null;
let soundEnabled = true;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  // Resume context if suspended (common browser privacy block)
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
};

export const toggleSystemSound = (enable: boolean) => {
  soundEnabled = enable;
  localStorage.setItem("tm_sound_enabled", enable ? "true" : "false");
};

export const isSystemSoundEnabled = (): boolean => {
  return soundEnabled;
};

// Initialize preference
try {
  const saved = localStorage.getItem("tm_sound_enabled");
  if (saved !== null) {
    soundEnabled = saved === "true";
  }
} catch {
  soundEnabled = true;
}

/**
 * Plays a sweet, premium micro-tick sound for buttons.
 */
export const playTickSound = () => {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(1200, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.08);

  gain.gain.setValueAtTime(0.04, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.08);
};

/**
 * Plays an organic chime for successful notifications/actions.
 */
export const playSuccessChime = () => {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Melody 1: Sweet upbeat chime
  const playNote = (frequency: number, delay: number, duration: number, volume = 0.08) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(frequency, now + delay);

    gain.gain.setValueAtTime(volume, now + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, now + delay + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + delay);
    osc.stop(now + delay + duration);
  };

  playNote(523.25, 0, 0.15); // C5
  playNote(659.25, 0.08, 0.18); // E5
  playNote(783.99, 0.16, 0.22); // G5
  playNote(1046.50, 0.24, 0.35, 0.05); // C6
};

/**
 * Plays low dual beep on warnings or errors.
 */
export const playErrorSound = () => {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  const playBeep = (freq: number, delay: number, duration: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq, now + delay);

    gain.gain.setValueAtTime(0.05, now + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, now + delay + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + delay);
    osc.stop(now + delay + duration);
  };

  playBeep(220, 0, 0.15); // A3
  playBeep(180, 0.12, 0.2); // F#3
};

/**
 * Plays smooth switch toggle sounds.
 */
export const playSwitchSound = (isON: boolean) => {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  const startFreq = isON ? 400 : 600;
  const endFreq = isON ? 650 : 350;

  osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + 0.12);

  gain.gain.setValueAtTime(0.05, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.12);
};
