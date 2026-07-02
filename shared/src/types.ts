// Shared types used by client, server and (later) other clients like an ESP32.

/** A single morse symbol: dot or dash. */
export type MorseSymbol = "." | "-";

/** Timing configuration in milliseconds. Users can tweak these in Settings. */
export interface TimingConfig {
  /** Taps shorter than this are ignored as accidental touches. */
  ignoreBelowMs: number;
  /** A press at or above this duration counts as a dash instead of a dot. */
  dashThresholdMs: number;
  /** A pause at or above this duration ends the current letter. */
  letterGapMs: number;
  /** A pause at or above this duration ends the current word. */
  wordGapMs: number;
  /**
   * When true the absolute ms thresholds above (dash/letter/word) are ignored.
   * Instead the decoder works purely from the *ratios* of your own keying,
   * the way real morse does: dash = 3x dot, letter gap = 3x dot,
   * word gap = 7x dot. It continuously estimates your dot unit, so a dot may
   * be 40 ms or 200 ms - only the proportions matter. `ignoreBelowMs` still
   * applies as a debounce for accidental taps.
   */
  adaptive: boolean;
}

export const DEFAULT_TIMING: TimingConfig = {
  ignoreBelowMs: 40,
  dashThresholdMs: 350,
  letterGapMs: 700,
  wordGapMs: 1400,
  adaptive: false,
};

/** A user present in a room. */
export interface RoomUser {
  id: string;
  name: string;
}

/**
 * A held ("async") message: the current standing message of one author in a
 * room. Unlike the live signal events it is persisted server-side and handed
 * to anyone who joins later, so the two sides do not have to be online at the
 * same time - each side's message is held until they replace or clear it.
 */
export interface RoomMessage {
  /** Socket id of the author at the time of writing. */
  userId: string;
  /** Author's display name (snapshotted so it survives them leaving). */
  name: string;
  /** Decoded text so far. */
  text: string;
  /** Raw morse so far (letters separated by spaces, words by " / "). */
  morse: string;
  /** Epoch ms of the last update, for ordering. */
  updatedAt: number;
}

/** Public room state sent to clients. */
export interface RoomState {
  code: string;
  users: RoomUser[];
  /** Held messages of everyone who has written in this room. */
  messages: RoomMessage[];
}

/** Client -> Server events. */
export interface ClientToServerEvents {
  "room:create": (payload: { name: string }, cb: (res: RoomCreateResult) => void) => void;
  "room:join": (payload: { code: string; name: string }, cb: (res: RoomJoinResult) => void) => void;
  "signal:start": () => void;
  "signal:end": (payload: { durationMs: number; symbol: MorseSymbol }) => void;
  "morse:symbol": (payload: { symbol: MorseSymbol }) => void;
  "morse:letter": (payload: { morse: string; letter: string }) => void;
  "morse:wordGap": () => void;
  /** Reset the sender's held message to start a fresh one. */
  "morse:clear": () => void;
  "user:updateSettings": (payload: { name: string }) => void;
}

/** Server -> Client events. */
export interface ServerToClientEvents {
  "room:created": (state: RoomState) => void;
  "room:joined": (state: RoomState) => void;
  "room:error": (payload: { message: string }) => void;
  "user:joined": (payload: { user: RoomUser }) => void;
  "user:left": (payload: { userId: string }) => void;
  "signal:start": (payload: { userId: string }) => void;
  "signal:end": (payload: { userId: string; durationMs: number; symbol: MorseSymbol }) => void;
  "morse:symbol": (payload: { userId: string; symbol: MorseSymbol }) => void;
  "morse:letter": (payload: { userId: string; morse: string; letter: string }) => void;
  "morse:wordGap": (payload: { userId: string }) => void;
  "room:users": (state: RoomState) => void;
  /** Authoritative held message for one author (also fired on clear). */
  "room:message": (payload: RoomMessage) => void;
}

export interface RoomCreateResult {
  ok: boolean;
  state?: RoomState;
  error?: string;
}

export interface RoomJoinResult {
  ok: boolean;
  state?: RoomState;
  error?: string;
}
