import { decodeLetter } from "./decode";
import type { MorseSymbol, TimingConfig } from "./types";
import { DEFAULT_TIMING } from "./types";

/**
 * Classifies a press duration into a morse symbol.
 * Returns null if the press was shorter than the "ignore" threshold
 * (treated as an accidental tap).
 */
export function classifyPress(durationMs: number, config: TimingConfig): MorseSymbol | null {
  if (durationMs < config.ignoreBelowMs) return null;
  return durationMs >= config.dashThresholdMs ? "-" : ".";
}

export function isLetterGap(gapMs: number, config: TimingConfig): boolean {
  return gapMs >= config.letterGapMs && gapMs < config.wordGapMs;
}

export function isWordGap(gapMs: number, config: TimingConfig): boolean {
  return gapMs >= config.wordGapMs;
}

export interface MorseInputEngineCallbacks {
  /** Called immediately once a press is classified as a dot or dash. */
  onSymbol?: (symbol: MorseSymbol) => void;
  /** Called once a letter-gap has elapsed after at least one symbol was buffered. */
  onLetter?: (morse: string, letter: string) => void;
  /** Called once a word-gap has elapsed. */
  onWordGap?: () => void;
}

/**
 * Stateful helper that turns raw press/release timing into morse symbols,
 * letters and word gaps using setTimeout-based pause detection.
 *
 * Framework-agnostic: works in the browser, in Node (server-side replay/tests)
 * and would work the same way on an ESP32 running a JS runtime, or can serve
 * as the reference implementation for a native re-port.
 */
export class MorseInputEngine {
  private config: TimingConfig;
  private callbacks: MorseInputEngineCallbacks;
  private currentLetter = "";
  private letterTimer: ReturnType<typeof setTimeout> | null = null;
  private wordTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: TimingConfig = DEFAULT_TIMING, callbacks: MorseInputEngineCallbacks = {}) {
    this.config = config;
    this.callbacks = callbacks;
  }

  updateConfig(config: TimingConfig) {
    this.config = config;
  }

  /** Call when the button/key is released after being held for `durationMs`. */
  release(durationMs: number) {
    const symbol = classifyPress(durationMs, this.config);
    if (!symbol) return; // accidental tap, ignore

    this.clearTimers();
    this.currentLetter += symbol;
    this.callbacks.onSymbol?.(symbol);
    this.scheduleGapTimers();
  }

  /** Force-flush the currently buffered letter (e.g. on manual "finish" action). */
  flush() {
    this.clearTimers();
    this.finishLetter();
  }

  reset() {
    this.clearTimers();
    this.currentLetter = "";
  }

  private scheduleGapTimers() {
    this.letterTimer = setTimeout(() => {
      this.finishLetter();
    }, this.config.letterGapMs);

    this.wordTimer = setTimeout(() => {
      this.callbacks.onWordGap?.();
    }, this.config.wordGapMs);
  }

  private finishLetter() {
    if (!this.currentLetter) return;
    const letter = decodeLetter(this.currentLetter);
    this.callbacks.onLetter?.(this.currentLetter, letter);
    this.currentLetter = "";
  }

  private clearTimers() {
    if (this.letterTimer) clearTimeout(this.letterTimer);
    if (this.wordTimer) clearTimeout(this.wordTimer);
    this.letterTimer = null;
    this.wordTimer = null;
  }
}
