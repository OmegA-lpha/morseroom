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
}

export const DEFAULT_TIMING: TimingConfig = {
  ignoreBelowMs: 40,
  dashThresholdMs: 350,
  letterGapMs: 700,
  wordGapMs: 1400,
};

/** A user present in a room. */
export interface RoomUser {
  id: string;
  name: string;
}

/** Public room state sent to clients. */
export interface RoomState {
  code: string;
  users: RoomUser[];
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
