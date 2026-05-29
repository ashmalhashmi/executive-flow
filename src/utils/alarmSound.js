let audioContext = null;

function getContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

/** Custom alarm — 3 rising beeps (Web Audio API) */
export async function playAlarmSound() {
  try {
    const ctx = getContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const beeps = [
      { freq: 660, at: 0 },
      { freq: 880, at: 0.45 },
      { freq: 1100, at: 0.9 },
    ];

    beeps.forEach(({ freq, at }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);

      const t = ctx.currentTime + at;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.35, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);

      osc.start(t);
      osc.stop(t + 0.42);
    });

    await new Promise((r) => setTimeout(r, 1400));
  } catch {
    /* autoplay blocked or no audio */
  }
}

/** Unlock audio on first user click (browser policy) */
export function unlockAudio() {
  const ctx = getContext();
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
}
