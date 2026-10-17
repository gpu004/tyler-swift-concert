import type { SoundCue } from "./game";

interface Tone {
  readonly wave: OscillatorType;
  readonly from: number;
  readonly to: number;
  readonly seconds: number;
  readonly volume: number;
}

const TONES: Readonly<Record<SoundCue, readonly Tone[]>> = {
  stapler: [{ wave: "square", from: 900, to: 200, seconds: 0.08, volume: 0.12 }],
  keyboard: [{ wave: "triangle", from: 300, to: 120, seconds: 0.1, volume: 0.15 }],
  hit: [{ wave: "sawtooth", from: 400, to: 250, seconds: 0.08, volume: 0.1 }],
  enemyDown: [
    { wave: "sawtooth", from: 500, to: 80, seconds: 0.35, volume: 0.12 },
    { wave: "square", from: 250, to: 60, seconds: 0.35, volume: 0.06 },
  ],
  hurt: [{ wave: "sawtooth", from: 180, to: 90, seconds: 0.2, volume: 0.16 }],
  pickup: [
    { wave: "square", from: 660, to: 660, seconds: 0.07, volume: 0.08 },
    { wave: "square", from: 990, to: 990, seconds: 0.12, volume: 0.08 },
  ],
  door: [{ wave: "triangle", from: 120, to: 220, seconds: 0.45, volume: 0.12 }],
  denied: [{ wave: "square", from: 160, to: 150, seconds: 0.25, volume: 0.1 }],
  memo: [{ wave: "triangle", from: 1200, to: 500, seconds: 0.15, volume: 0.06 }],
  level: [
    { wave: "square", from: 523, to: 523, seconds: 0.15, volume: 0.08 },
    { wave: "square", from: 784, to: 784, seconds: 0.3, volume: 0.08 },
  ],
  win: [
    { wave: "square", from: 523, to: 1046, seconds: 0.9, volume: 0.09 },
    { wave: "triangle", from: 659, to: 1318, seconds: 0.9, volume: 0.09 },
  ],
  lose: [{ wave: "sawtooth", from: 300, to: 60, seconds: 1, volume: 0.12 }],
};

export interface Audio {
  readonly resume: () => void;
  readonly play: (cue: SoundCue) => void;
}

export const createAudio = (): Audio => {
  let context: AudioContext | null = null;

  const resume = (): void => {
    context ??= new AudioContext();
    void context.resume();
  };

  const play = (cue: SoundCue): void => {
    if (context === null) {
      return;
    }

    const now = context.currentTime;

    for (const [index, tone] of TONES[cue].entries()) {
      const start = now + index * 0.07;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = tone.wave;
      oscillator.frequency.setValueAtTime(tone.from, start);
      oscillator.frequency.exponentialRampToValueAtTime(tone.to, start + tone.seconds);
      gain.gain.setValueAtTime(tone.volume, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.seconds);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + tone.seconds);
    }
  };

  return { resume, play };
};
