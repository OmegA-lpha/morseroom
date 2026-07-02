import { decodeLetter } from "./decode";
import type { MorseSymbol, TimingConfig } from "./types";
import { DEFAULT_TIMING } from "./types";

/**
 * Classifies a press duration into a morse symbol using the fixed
 * ms thresholds in `config`.
 * Returns null if the press was shorter than the "ignore" threshold
 * (treated as an accidental tap).
 *
 * Note: this only implements the fixed-threshold mode. Adaptive
 * (ratio-based) decoding is stateful and lives in {@link MorseInputEngine},
 * because it depends on the running estimate of your dot unit.
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

/**
 * Adaptive (ratio-based) decoding constants. Standard morse proportions are
 * dot = 1 unit, dash = 3, intra-letter gap = 1, letter gap = 3, word gap = 7.
 * We classify at the midpoints between the expected values so a bit of human
 * jitter still lands on the right side.
 */
/** dot vs dash boundary: midpoint of 1 and 3 units. */
const ADAPTIVE_DASH_RATIO = 2;
/** element gap vs letter gap boundary: midpoint of 1 and 3 units. */
const ADAPTIVE_LETTER_GAP_RATIO = 2;
/** letter gap vs word gap boundary: midpoint of 3 and 7 units. */
const ADAPTIVE_WORD_GAP_RATIO = 5;
/** How strongly each new symbol pulls the running dot estimate (0..1). */
const ADAPTIVE_LEARN_RATE = 0.3;
/** Starting guess for the dot unit before any keying is observed. */
const ADAPTIVE_INITIAL_DOT_MS = 100;
/** Clamp the estimate so a stray extreme press can't derail decoding. */
const ADAPTIVE_MIN_DOT_MS = 20;
const ADAPTIVE_MAX_DOT_MS = 1500;

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
 * Pause detection is armed on `release()` and disarmed on `press()`, so a
 * gap is only ever measured while the signal is actually off. Holding the
 * key - however long, e.g. for a dash - can never be mistaken for a pause.
 *
 * Supports two modes (see {@link TimingConfig.adaptive}):
 *  - fixed:    absolute ms thresholds from the config.
 *  - adaptive: ratios only, adapting to your own keying speed.
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
  /** Running estimate of the dot unit, used only in adaptive mode. */
  private dotMs = ADAPTIVE_INITIAL_DOT_MS;
  /**
   * Whether the adaptive dot unit has been anchored yet. The first keyed
   * element in a session sets the scale (treated as a dot), so a 40 ms and
   * a 200 ms keyer are both understood from their own second element on.
   */
  private calibrated = false;

  constructor(config: TimingConfig = DEFAULT_TIMING, callbacks: MorseInputEngineCallbacks = {}) {
    this.config = config;
    this.callbacks = callbacks;
  }

  updateConfig(config: TimingConfig) {
    this.config = config;
  }

  /** Current estimate of the dot unit in ms (adaptive mode). */
  getEstimatedDotMs(): number {
    return Math.round(this.dotMs);
  }

  /**
   * Classify a press duration into a symbol without mutating any state.
   * Uses the adaptive estimate when enabled, otherwise the fixed thresholds.
   */
  classify(durationMs: number): MorseSymbol | null {
    if (durationMs < this.config.ignoreBelowMs) return null;
    if (this.config.adaptive) {
      // The very first element anchors the scale and is taken as a dot.
      if (!this.calibrated) return ".";
      return durationMs >= this.dotMs * ADAPTIVE_DASH_RATIO ? "-" : ".";
    }
    return durationMs >= this.config.dashThresholdMs ? "-" : ".";
  }

  /**
   * Call when the button/key is pressed down. Cancels any pending pause
   * detection so the ongoing hold is never counted as a pause - a pause
   * only exists once the signal is off again.
   */
  press() {
    this.clearTimers();
  }

  /**
   * Call when the button/key is released after being held for `durationMs`.
   * Returns the classified symbol, or null if it was ignored as a tap.
   */
  release(durationMs: number): MorseSymbol | null {
    const symbol = this.classify(durationMs);
    if (!symbol) return null; // accidental tap, ignore

    this.clearTimers();
    this.currentLetter += symbol;
    if (this.config.adaptive) {
      if (!this.calibrated) {
        this.dotMs = this.clampDot(durationMs);
        this.calibrated = true;
      } else {
        this.updateEstimate(durationMs, symbol);
      }
    }
    this.callbacks.onSymbol?.(symbol);
    this.scheduleGapTimers();
    return symbol;
  }

  /** Force-flush the currently buffered letter (e.g. on manual "finish" action). */
  flush() {
    this.clearTimers();
    this.finishLetter();
  }

  reset() {
    this.clearTimers();
    this.currentLetter = "";
    this.dotMs = ADAPTIVE_INITIAL_DOT_MS;
    this.calibrated = false;
  }

  /** Nudge the dot-unit estimate toward what this symbol implies. */
  private updateEstimate(durationMs: number, symbol: MorseSymbol) {
    const impliedDot = symbol === "-" ? durationMs / 3 : durationMs;
    this.dotMs = this.clampDot(this.dotMs * (1 - ADAPTIVE_LEARN_RATE) + impliedDot * ADAPTIVE_LEARN_RATE);
  }

  private clampDot(ms: number): number {
    return Math.min(ADAPTIVE_MAX_DOT_MS, Math.max(ADAPTIVE_MIN_DOT_MS, ms));
  }

  /** The letter/word gap durations currently in effect for either mode. */
  private gapDurations(): { letterGapMs: number; wordGapMs: number } {
    if (this.config.adaptive) {
      return {
        letterGapMs: this.dotMs * ADAPTIVE_LETTER_GAP_RATIO,
        wordGapMs: this.dotMs * ADAPTIVE_WORD_GAP_RATIO,
      };
    }
    return { letterGapMs: this.config.letterGapMs, wordGapMs: this.config.wordGapMs };
  }

  private scheduleGapTimers() {
    const { letterGapMs, wordGapMs } = this.gapDurations();

    this.letterTimer = setTimeout(() => {
      this.finishLetter();
    }, letterGapMs);

    this.wordTimer = setTimeout(() => {
      this.callbacks.onWordGap?.();
    }, wordGapMs);
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
