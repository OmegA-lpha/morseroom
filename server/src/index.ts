import express from "express";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  RoomCreateResult,
  RoomJoinResult,
} from "../../shared/src/types";
import {
  createRoom,
  getRoom,
  addUserToRoom,
  removeUserFromRoom,
  toRoomState,
  isValidRoomCodeFormat,
} from "./rooms";

const PORT = Number(process.env.PORT) || 4000;
// Comma-separated list of allowed origins for local + deployed frontends.
const ALLOWED_ORIGINS = (process.env.CLIENT_ORIGIN ?? "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim());

const app = express();
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  next();
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "morseroom-server" });
});

const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST"],
  },
});

// Tracks which room a socket currently belongs to, so we can clean up on disconnect.
const socketRoomCode = new Map<string, string>();

function sanitizeName(name: string): string {
  const trimmed = (name ?? "").trim().slice(0, 24);
  return trimmed.length > 0 ? trimmed : "Anonym";
}

io.on("connection", (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
  socket.on("room:create", ({ name }, cb: (res: RoomCreateResult) => void) => {
    const room = createRoom();
    addUserToRoom(room, { id: socket.id, name: sanitizeName(name) });
    socket.join(room.code);
    socketRoomCode.set(socket.id, room.code);
    cb({ ok: true, state: toRoomState(room) });
  });

  socket.on("room:join", ({ code, name }, cb: (res: RoomJoinResult) => void) => {
    if (!code || !isValidRoomCodeFormat(code)) {
      cb({ ok: false, error: "Ungültiger Roomcode." });
      return;
    }
    const room = getRoom(code);
    if (!room) {
      cb({ ok: false, error: "Dieser Room existiert nicht (mehr)." });
      return;
    }
    const user = { id: socket.id, name: sanitizeName(name) };
    addUserToRoom(room, user);
    socket.join(room.code);
    socketRoomCode.set(socket.id, room.code);

    cb({ ok: true, state: toRoomState(room) });
    socket.to(room.code).emit("user:joined", { user });
    io.to(room.code).emit("room:users", toRoomState(room));
  });

  socket.on("signal:start", () => {
    const code = socketRoomCode.get(socket.id);
    if (!code) return;
    socket.to(code).emit("signal:start", { userId: socket.id });
  });

  socket.on("signal:end", ({ durationMs, symbol }) => {
    const code = socketRoomCode.get(socket.id);
    if (!code) return;
    socket.to(code).emit("signal:end", { userId: socket.id, durationMs, symbol });
  });

  socket.on("morse:symbol", ({ symbol }) => {
    const code = socketRoomCode.get(socket.id);
    if (!code) return;
    socket.to(code).emit("morse:symbol", { userId: socket.id, symbol });
  });

  socket.on("morse:letter", ({ morse, letter }) => {
    const code = socketRoomCode.get(socket.id);
    if (!code) return;
    socket.to(code).emit("morse:letter", { userId: socket.id, morse, letter });
  });

  socket.on("morse:wordGap", () => {
    const code = socketRoomCode.get(socket.id);
    if (!code) return;
    socket.to(code).emit("morse:wordGap", { userId: socket.id });
  });

  socket.on("user:updateSettings", ({ name }) => {
    const code = socketRoomCode.get(socket.id);
    if (!code) return;
    const room = getRoom(code);
    if (!room) return;
    const user = room.users.get(socket.id);
    if (user) {
      user.name = sanitizeName(name);
      io.to(room.code).emit("room:users", toRoomState(room));
    }
  });

  socket.on("disconnect", () => {
    const code = socketRoomCode.get(socket.id);
    if (!code) return;
    const room = getRoom(code);
    socketRoomCode.delete(socket.id);
    if (!room) return;
    removeUserFromRoom(room, socket.id);
    io.to(room.code).emit("user:left", { userId: socket.id });
    io.to(room.code).emit("room:users", toRoomState(room));
  });
});

httpServer.listen(PORT, () => {
  console.log(`MorseRoom server listening on port ${PORT}`);
});
