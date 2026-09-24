// A short, pleasant two-tone chime for "a scheduled order just came in."
// Uses the Web Audio API directly instead of an audio file, so there's
// nothing to host or bundle.
export function playScheduledOrderAlert() {
  try {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    playTone(880, now, 0.18);
    playTone(1174.7, now + 0.16, 0.28);

    setTimeout(() => ctx.close(), 700);
  } catch {
    // Audio isn't critical -- the visual toast/tag still communicates this.
  }
}
