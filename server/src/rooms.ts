import type { ServerRoom, ServerUser } from "./types";
import type { RoomState } from "../../shared/src/types";

// Characters chosen to be short, readable and WhatsApp-friendly:
// A-Z without O/I/L (confused with 0/1) and 2-9 without 0/1.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

// Rooms live only in server memory (RAM). They disappear on restart or
// once the last user leaves. No database, no persistence.
const rooms = new Map<string, ServerRoom>();

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

export function createRoom(): ServerRoom {
  const code = generateUniqueRoomCode();
  const room: ServerRoom = { code, users: new Map(), createdAt: Date.now() };
  rooms.set(code, room);
  return room;
}

export function getRoom(code: string): ServerRoom | undefined {
  return rooms.get(code.toUpperCase());
}

export function addUserToRoom(room: ServerRoom, user: ServerUser): void {
  room.users.set(user.id, user);
}

export function removeUserFromRoom(room: ServerRoom, userId: string): void {
  room.users.delete(userId);
  if (room.users.size === 0) {
    rooms.delete(room.code);
  }
}

export function toRoomState(room: ServerRoom): RoomState {
  return {
    code: room.code,
    users: Array.from(room.users.values()),
  };
}

export function isValidRoomCodeFormat(code: string): boolean {
  return new RegExp(`^[${CODE_ALPHABET}]{${CODE_LENGTH}}$`).test(code.toUpperCase());
}
