import { useCallback, useEffect, useRef } from "react";

/**
 * Wraps the Web Audio API to produce an instant, lag-free sine tone while
 * the morse key is held down. The AudioContext is only created lazily on
 * the first user interaction (start), respecting browser autoplay policies.
 */
export function useMorseTone(frequencyHz: number) {
  const ctxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const frequencyRef = useRef(frequencyHz);
  frequencyRef.current = frequencyHz;

  const getContext = useCallback(() => {
    if (!ctxRef.current) {
      const AudioCtx = window.AudioContext ?? (window as any).webkitAudioContext;
      if (!AudioCtx) return null;
      ctxRef.current = new AudioCtx();
    }
    if (ctxRef.current.state === "suspended") {
      ctxRef.current.resume().catch(() => {});
    }
    return ctxRef.current;
  }, []);

  const start = useCallback(() => {
    const ctx = getContext();
    if (!ctx) return;
    stop();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = frequencyRef.current;
    gain.gain.value = 0.0001;
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.005);

    osc.connect(gain).connect(ctx.destination);
    osc.start();

    oscRef.current = osc;
    gainRef.current = gain;
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
  }, [getContext]);

  const stop = useCallback(() => {
    const ctx = ctxRef.current;
    const osc = oscRef.current;
    const gain = gainRef.current;
    if (!ctx || !osc || !gain) return;
    const now = ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.01);
    osc.stop(now + 0.02);
    oscRef.current = null;
    gainRef.current = null;
  }, []);

  /** Plays a short beep for `durationMs`, used to play back received/target signals. */
  const beep = useCallback(
    (durationMs: number) => {
      start();
      window.setTimeout(() => stop(), durationMs);
    },
    [start, stop]
  );

  useEffect(() => () => stop(), [stop]);

  return { start, stop, beep };
}
