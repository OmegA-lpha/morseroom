import type { RoomMessage } from "../../shared/src/types";

export interface ServerUser {
  /** Stable public author id (clientId, or socket id fallback). */
  id: string;
  name: string;
  /** The socket currently representing this user (for reconnect handling). */
  socketId: string;
}

export interface ServerRoom {
  code: string;
  users: Map<string, ServerUser>;
  /**
   * Held ("async") messages keyed by author socket id. Retained even after the
   * author disconnects, so the other side can read them later. Bounded in size
   * and age by the room limits in rooms.ts.
   */
  messages: Map<string, RoomMessage>;
  createdAt: number;
  /** Updated on any meaningful activity; drives idle cleanup. */
  lastActivityAt: number;
}
