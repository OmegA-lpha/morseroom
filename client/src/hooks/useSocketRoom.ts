import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  RoomState,
  RoomMessage,
  MorseSymbol,
} from "@shared/types";
import { getClientId } from "../lib/clientId";

/** Index the server's held-message list by author id for quick lookup. */
function indexMessages(list: RoomMessage[]): Record<string, RoomMessage> {
  const record: Record<string, RoomMessage> = {};
  for (const message of list) record[message.userId] = message;
  return record;
}

function getServerUrl(): string {
  const envUrl = import.meta.env.VITE_SERVER_URL as string | undefined;
  if (envUrl) return envUrl;
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
    return "http://localhost:4000";
  }
  // In production we assume the Socket.IO server is reachable at the same
  // origin (e.g. reverse-proxied under /socket.io). See README for details.
  return location.origin;
}

export type MorseSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * Owns the single Socket.IO connection for a room session: connecting,
 * creating/joining a room, tracking connection + room state, and exposing
 * typed emit helpers for the live morse signal events.
 */
export function useSocketRoom() {
  // Stable public identity for this browser (survives reloads/new sockets).
  const clientId = getClientId();
  const socketRef = useRef<MorseSocket | null>(null);
  const [socket, setSocket] = useState<MorseSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  /** Server-authoritative held messages, keyed by author id. */
  const [messages, setMessages] = useState<Record<string, RoomMessage>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const socket: MorseSocket = io(getServerUrl(), { autoConnect: true });
    socketRef.current = socket;
    setSocket(socket);

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", () => setError("Server nicht erreichbar."));
    socket.on("room:error", ({ message }) => setError(message));
    socket.on("room:users", (state) => {
      setRoomState(state);
      setMessages(indexMessages(state.messages));
    });
    socket.on("room:message", (message) => {
      setMessages((prev) => ({ ...prev, [message.userId]: message }));
    });
    socket.on("user:joined", ({ user }) => {
      setRoomState((prev) =>
        prev ? { ...prev, users: [...prev.users.filter((u) => u.id !== user.id), user] } : prev
      );
    });
    socket.on("user:left", ({ userId }) => {
      setRoomState((prev) =>
        prev ? { ...prev, users: prev.users.filter((u) => u.id !== userId) } : prev
      );
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, []);

  const createRoom = useCallback((name: string) => {
    return new Promise<RoomState>((resolve, reject) => {
      const socket = socketRef.current;
      if (!socket) return reject(new Error("Keine Verbindung zum Server."));
      socket.emit("room:create", { name, clientId }, (res) => {
        if (res.ok && res.state) {
          setRoomState(res.state);
          setMessages(indexMessages(res.state.messages));
          resolve(res.state);
        } else {
          const message = res.error ?? "Room konnte nicht erstellt werden.";
          setError(message);
          reject(new Error(message));
        }
      });
    });
  }, [clientId]);

  const joinRoom = useCallback((code: string, name: string) => {
    return new Promise<RoomState>((resolve, reject) => {
      const socket = socketRef.current;
      if (!socket) return reject(new Error("Keine Verbindung zum Server."));
      socket.emit("room:join", { code: code.toUpperCase(), name, clientId }, (res) => {
        if (res.ok && res.state) {
          setRoomState(res.state);
          setMessages(indexMessages(res.state.messages));
          resolve(res.state);
        } else {
          const message = res.error ?? "Room konnte nicht betreten werden.";
          setError(message);
          reject(new Error(message));
        }
      });
    });
  }, [clientId]);

  const sendSignalStart = useCallback(() => {
    socketRef.current?.emit("signal:start");
  }, []);

  const sendSignalEnd = useCallback((durationMs: number, symbol: MorseSymbol) => {
    socketRef.current?.emit("signal:end", { durationMs, symbol });
  }, []);

  const sendSymbol = useCallback((symbol: MorseSymbol) => {
    socketRef.current?.emit("morse:symbol", { symbol });
  }, []);

  const sendLetter = useCallback((morse: string, letter: string) => {
    socketRef.current?.emit("morse:letter", { morse, letter });
  }, []);

  const sendWordGap = useCallback(() => {
    socketRef.current?.emit("morse:wordGap");
  }, []);

  const sendClear = useCallback(() => {
    socketRef.current?.emit("morse:clear");
  }, []);

  const updateName = useCallback((name: string) => {
    socketRef.current?.emit("user:updateSettings", { name });
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    socket,
    connected,
    roomState,
    messages,
    error,
    clearError,
    createRoom,
    joinRoom,
    sendSignalStart,
    sendSignalEnd,
    sendSymbol,
    sendLetter,
    sendWordGap,
    sendClear,
    updateName,
    /** Stable public identity of this browser (matches RoomMessage.userId). */
    selfId: clientId,
  };
}
