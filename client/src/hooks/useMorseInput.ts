import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { MorseInputEngine, classifyPress } from "@shared/timing";
import type { MorseSymbol, TimingConfig } from "@shared/types";

export interface UseMorseInputOptions {
  config: TimingConfig;
  onPressStart?: () => void;
  onPressEnd?: (durationMs: number, symbol: MorseSymbol | null) => void;
  onSymbol?: (symbol: MorseSymbol) => void;
  onLetter?: (morse: string, letter: string) => void;
  onWordGap?: () => void;
  /** Whether the spacebar should act as the morse key (desktop). */
  enableKeyboard?: boolean;
  disabled?: boolean;
}

/**
 * Turns pointer (touch/mouse/pen) and optional keyboard (Space) interaction
 * into press-start / press-end events, and feeds durations into the shared
 * MorseInputEngine to derive symbols, letters and word gaps.
 *
 * Only the first active pointer controls the signal - any additional
 * simultaneous touches are ignored to avoid double-triggering.
 */
export function useMorseInput({
  config,
  onPressStart,
  onPressEnd,
  onSymbol,
  onLetter,
  onWordGap,
  enableKeyboard = false,
  disabled = false,
}: UseMorseInputOptions) {
  const [pressed, setPressed] = useState(false);
  const activeSourceRef = useRef<"pointer" | "keyboard" | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const pressStartRef = useRef<number>(0);

  const engineRef = useRef<MorseInputEngine>();
  if (!engineRef.current) {
    engineRef.current = new MorseInputEngine(config, { onSymbol, onLetter, onWordGap });
  }

  useEffect(() => {
    engineRef.current?.updateConfig(config);
  }, [config]);

  // Keep latest callbacks without re-creating the engine.
  const callbacksRef = useRef({ onSymbol, onLetter, onWordGap });
  callbacksRef.current = { onSymbol, onLetter, onWordGap };
  useEffect(() => {
    engineRef.current = new MorseInputEngine(config, {
      onSymbol: (s) => callbacksRef.current.onSymbol?.(s),
      onLetter: (m, l) => callbacksRef.current.onLetter?.(m, l),
      onWordGap: () => callbacksRef.current.onWordGap?.(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const beginPress = useCallback(
    (source: "pointer" | "keyboard") => {
      if (disabled || activeSourceRef.current !== null) return;
      activeSourceRef.current = source;
      pressStartRef.current = performance.now();
      setPressed(true);
      onPressStart?.();
    },
    [disabled, onPressStart]
  );

  const endPress = useCallback(
    (source: "pointer" | "keyboard") => {
      if (activeSourceRef.current !== source) return;
      activeSourceRef.current = null;
      activePointerIdRef.current = null;
      const durationMs = performance.now() - pressStartRef.current;
      setPressed(false);
      const symbol = classifyPress(durationMs, config);
      onPressEnd?.(durationMs, symbol);
      engineRef.current?.release(durationMs);
    },
    [config, onPressEnd]
  );

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (disabled) return;
      if (activePointerIdRef.current !== null) return; // ignore extra touches
      e.preventDefault();
      activePointerIdRef.current = e.pointerId;
      beginPress("pointer");
    },
    [beginPress, disabled]
  );

  const onPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (activePointerIdRef.current !== e.pointerId) return;
      e.preventDefault();
      endPress("pointer");
    },
    [endPress]
  );

  const onPointerCancel = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (activePointerIdRef.current !== e.pointerId) return;
      endPress("pointer");
    },
    [endPress]
  );

  const onPointerLeave = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (activePointerIdRef.current !== e.pointerId) return;
      endPress("pointer");
    },
    [endPress]
  );

  const onContextMenu = useCallback((e: React.SyntheticEvent) => {
    e.preventDefault();
  }, []);

  // Desktop keyboard support: hold Space to send.
  useEffect(() => {
    if (!enableKeyboard) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      e.preventDefault();
      beginPress("keyboard");
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      e.preventDefault();
      endPress("keyboard");
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [enableKeyboard, beginPress, endPress]);

  const reset = useCallback(() => {
    engineRef.current?.reset();
  }, []);

  return {
    pressed,
    handlers: { onPointerDown, onPointerUp, onPointerCancel, onPointerLeave, onContextMenu },
    reset,
  };
}
