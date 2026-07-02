import type { ServerRoom, ServerUser } from "./types";
import type { RoomMessage, RoomState } from "../../shared/src/types";

// Characters chosen to be short, readable and WhatsApp-friendly:
// A-Z without O/I/L (confused with 0/1) and 2-9 without 0/1.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

// --- Safety limits (deployment hardening) -----------------------------------
// Everything lives in RAM, so these bound worst-case memory and abuse.
/** Hard cap on concurrent rooms; creation is refused past this. */
export const MAX_ROOMS = 10_000;
/** Max simultaneously-present users per room. */
export const MAX_USERS_PER_ROOM = 8;
/** Max distinct authors whose held message a room retains. */
export const MAX_MESSAGES_PER_ROOM = 16;
/** Max decoded-text length of a single held message. */
export const MAX_MESSAGE_TEXT = 2_000;
/** Max raw-morse length of a single held message. */
export const MAX_MESSAGE_MORSE = 8_000;
/** Empty rooms are kept this long (async: let the other side read later). */
export const EMPTY_ROOM_TTL_MS = 6 * 60 * 60 * 1000; // 6h
/** Even active rooms are dropped after this much total inactivity. */
export const IDLE_ROOM_TTL_MS = 24 * 60 * 60 * 1000; // 24h

// Rooms live only in server memory (RAM). No database, no persistence across
// restarts. Held messages let the two sides talk asynchronously within a room.
const rooms = new Map<string, ServerRoom>();

export function roomCount(): number {
  return rooms.size;
}

export function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

function generateUniqueRoomCode(): string {
  let code = generateRoomCode();
  while (rooms.has(code)) {
    code = generateRoomCode();
  }
  return code;
}

/**
 * Creates a room, or returns null if the server is at capacity (after a
 * cleanup pass). Callers must handle the null case.
 */
export function createRoom(): ServerRoom | null {
  if (rooms.size >= MAX_ROOMS) {
    cleanupRooms();
    if (rooms.size >= MAX_ROOMS) return null;
  }
  const now = Date.now();
  const code = generateUniqueRoomCode();
  const room: ServerRoom = {
    code,
    users: new Map(),
    messages: new Map(),
    createdAt: now,
    lastActivityAt: now,
  };
  rooms.set(code, room);
  return room;
}

export function getRoom(code: string): ServerRoom | undefined {
  return rooms.get(code.toUpperCase());
}

export function touchRoom(room: ServerRoom): void {
  room.lastActivityAt = Date.now();
}

export function addUserToRoom(room: ServerRoom, user: ServerUser): void {
  room.users.set(user.id, user);
  touchRoom(room);
}

/**
 * Removes a present user but keeps their held message so the other side can
 * still read it. The room itself is only reclaimed later by cleanupRooms once
 * it has been empty long enough (see EMPTY_ROOM_TTL_MS).
 *
 * `expectedSocketId` guards against a stale socket (e.g. the old one from a
 * page reload) evicting a user that a newer socket has already reclaimed: the
 * user is only removed if they are still represented by that exact socket.
 */
export function removeUserFromRoom(
  room: ServerRoom,
  userId: string,
  expectedSocketId?: string
): boolean {
  const user = room.users.get(userId);
  if (!user) return false;
  if (expectedSocketId && user.socketId !== expectedSocketId) return false;
  room.users.delete(userId);
  touchRoom(room);
  // A room with neither users nor messages is useless immediately.
  if (room.users.size === 0 && room.messages.size === 0) {
    rooms.delete(room.code);
  }
  return true;
}

/** Appends decoded text + morse to an author's held message (bounded). */
export function appendToMessage(
  room: ServerRoom,
  author: ServerUser,
  textPart: string,
  morsePart: string
): RoomMessage {
  const existing = room.messages.get(author.id);
  const prevText = existing?.text ?? "";
  const prevMorse = existing?.morse ?? "";
  const text = (prevText + textPart).slice(0, MAX_MESSAGE_TEXT);
  const morse = (prevMorse ? `${prevMorse} ${morsePart}` : morsePart)
    .trim()
    .slice(0, MAX_MESSAGE_MORSE);
  const message: RoomMessage = {
    userId: author.id,
    name: author.name,
    text,
    morse,
    updatedAt: Date.now(),
  };
  setMessage(room, message);
  return message;
}

/** Resets an author's held message to empty (kept so peers see the clear). */
export function clearMessage(room: ServerRoom, author: ServerUser): RoomMessage {
  const message: RoomMessage = {
    userId: author.id,
    name: author.name,
    text: "",
    morse: "",
    updatedAt: Date.now(),
  };
  setMessage(room, message);
  return message;
}

/** Keeps the author name on a held message in sync with a rename. */
export function renameAuthor(room: ServerRoom, author: ServerUser): RoomMessage | null {
  const existing = room.messages.get(author.id);
  if (!existing) return null;
  const message = { ...existing, name: author.name, updatedAt: Date.now() };
  setMessage(room, message);
  return message;
}

function setMessage(room: ServerRoom, message: RoomMessage): void {
  room.messages.set(message.userId, message);
  touchRoom(room);
  // Evict the oldest authors if we exceed the per-room retention cap.
  if (room.messages.size > MAX_MESSAGES_PER_ROOM) {
    const oldest = [...room.messages.values()].sort((a, b) => a.updatedAt - b.updatedAt);
    for (const m of oldest.slice(0, room.messages.size - MAX_MESSAGES_PER_ROOM)) {
      room.messages.delete(m.userId);
    }
  }
}

export function toRoomState(room: ServerRoom): RoomState {
  return {
    code: room.code,
    // Only expose public fields; the internal socketId never leaves the server.
    users: Array.from(room.users.values()).map((u) => ({ id: u.id, name: u.name })),
    messages: Array.from(room.messages.values()).sort((a, b) => a.updatedAt - b.updatedAt),
  };
}

export function isValidRoomCodeFormat(code: string): boolean {
  return new RegExp(`^[${CODE_ALPHABET}]{${CODE_LENGTH}}$`).test(code.toUpperCase());
}

/**
 * Reclaims rooms that are empty past EMPTY_ROOM_TTL_MS or idle past
 * IDLE_ROOM_TTL_MS. Safe to call periodically and on demand.
 */
export function cleanupRooms(now: number = Date.now()): number {
  let removed = 0;
  for (const room of rooms.values()) {
    const idle = now - room.lastActivityAt;
    const empty = room.users.size === 0;
    if ((empty && idle > EMPTY_ROOM_TTL_MS) || idle > IDLE_ROOM_TTL_MS) {
      rooms.delete(room.code);
      removed++;
    }
  }
  return removed;
}
