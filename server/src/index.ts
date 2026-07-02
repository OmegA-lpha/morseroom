import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  MorseSymbol,
  RoomCreateResult,
  RoomJoinResult,
} from "../../shared/src/types";
import {
  createRoom,
  getRoom,
  addUserToRoom,
  removeUserFromRoom,
  toRoomState,
  touchRoom,
  appendToMessage,
  clearMessage,
  renameAuthor,
  cleanupRooms,
  isValidRoomCodeFormat,
  MAX_USERS_PER_ROOM,
} from "./rooms";

const PORT = Number(process.env.PORT) || 4000;
// Comma-separated list of allowed origins for local + deployed frontends.
// "*" disables the allow-list (handy for quick self-hosting; not recommended
// for a public deployment where you want to pin your own domain).
const RAW_ORIGINS = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";
const ALLOW_ALL_ORIGINS = RAW_ORIGINS.trim() === "*";
const ALLOWED_ORIGINS = RAW_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean);

function isAllowedOrigin(origin: string | undefined): boolean {
  if (ALLOW_ALL_ORIGINS) return true;
  return !!origin && ALLOWED_ORIGINS.includes(origin);
}

const app = express();
app.disable("x-powered-by");

// Minimal, dependency-free security headers. CSP is intentionally left to the
// reverse proxy so it can be tuned per deployment without breaking the SPA.
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  next();
});

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (isAllowedOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", ALLOW_ALL_ORIGINS ? "*" : origin!);
    res.setHeader("Vary", "Origin");
  }
  next();
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "morseroom-server" });
});

// In production the client's static build is served from the same origin
// (see README) so a single process + reverse proxy is enough. In local dev
// the client runs on its own Vite server instead.
if (process.env.NODE_ENV === "production") {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const clientDist = path.resolve(__dirname, "../../client/dist");
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

const httpServer = createServer(app);

type InterServerEvents = Record<string, never>;
interface TokenBucket {
  tokens: number;
  last: number;
}
interface SocketData {
  bucket?: TokenBucket;
}

const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
  httpServer,
  {
    cors: {
      origin: ALLOW_ALL_ORIGINS ? true : ALLOWED_ORIGINS,
      methods: ["GET", "POST"],
    },
    // Cap payload size so no single frame can exhaust memory. Morse frames are
    // tiny; 8 KB is generous.
    maxHttpBufferSize: 8 * 1024,
    pingTimeout: 20_000,
  }
);

type MorseSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

// --- Abuse protection -------------------------------------------------------
// Simple per-socket token bucket: sustained RATE_REFILL events/sec, bursts up
// to RATE_CAPACITY. Fast keying produces a few dozen events/sec at most.
const RATE_CAPACITY = 120;
const RATE_REFILL_PER_SEC = 60;

function allow(socket: MorseSocket): boolean {
  const now = Date.now();
  const bucket = socket.data.bucket ?? { tokens: RATE_CAPACITY, last: now };
  bucket.tokens = Math.min(
    RATE_CAPACITY,
    bucket.tokens + ((now - bucket.last) / 1000) * RATE_REFILL_PER_SEC
  );
  bucket.last = now;
  socket.data.bucket = bucket;
  if (bucket.tokens < 1) return false;
  bucket.tokens -= 1;
  return true;
}

// --- Input validation -------------------------------------------------------
function sanitizeName(name: unknown): string {
  const cleaned = (typeof name === "string" ? name : "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, 24);
  return cleaned.length > 0 ? cleaned : "Anonym";
}

function isSymbol(value: unknown): value is MorseSymbol {
  return value === "." || value === "-";
}

/** A single letter's morse code, e.g. "...-". Kept short and charset-checked. */
function isMorseCode(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 32 && /^[.\-]+$/.test(value);
}

function sanitizeLetter(value: unknown): string {
  return (typeof value === "string" ? value : "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .slice(0, 8);
}

/**
 * The stable public author id supplied by the client (a localStorage id). It is
 * a bearer identity (no accounts), so we only accept a plausible, long-enough
 * token and otherwise fall back to the ephemeral socket id. Guessing another
 * person's random id is impractical, which is enough for these throwaway rooms.
 */
function sanitizeClientId(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const cleaned = value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
  return cleaned.length >= 8 ? cleaned : fallback;
}

function callback<T>(cb: unknown, value: T): void {
  if (typeof cb === "function") (cb as (v: T) => void)(value);
}

io.on("connection", (socket: MorseSocket) => {
  // Per-connection state. `authorId` is the stable public identity (clientId);
  // it stays the ephemeral socket id until the client identifies on create/join.
  let roomCode: string | undefined;
  let authorId = socket.id;

  const roomOf = (): ReturnType<typeof getRoom> => (roomCode ? getRoom(roomCode) : undefined);

  socket.on("room:create", (payload, cb) => {
    if (!allow(socket)) return callback<RoomCreateResult>(cb, { ok: false, error: "Zu viele Anfragen." });
    const room = createRoom();
    if (!room) {
      return callback<RoomCreateResult>(cb, { ok: false, error: "Server ausgelastet, bitte später erneut." });
    }
    authorId = sanitizeClientId(payload?.clientId, socket.id);
    roomCode = room.code;
    addUserToRoom(room, { id: authorId, name: sanitizeName(payload?.name), socketId: socket.id });
    socket.join(room.code);
    callback<RoomCreateResult>(cb, { ok: true, state: toRoomState(room) });
  });

  socket.on("room:join", (payload, cb) => {
    if (!allow(socket)) return callback<RoomJoinResult>(cb, { ok: false, error: "Zu viele Anfragen." });
    const code = payload?.code;
    if (!code || !isValidRoomCodeFormat(code)) {
      return callback<RoomJoinResult>(cb, { ok: false, error: "Ungültiger Roomcode." });
    }
    const room = getRoom(code);
    if (!room) {
      return callback<RoomJoinResult>(cb, { ok: false, error: "Dieser Room existiert nicht (mehr)." });
    }
    const id = sanitizeClientId(payload?.clientId, socket.id);
    // Rejoining with a known id (e.g. after a reload) is always allowed; the
    // full check only blocks genuinely new people.
    if (room.users.size >= MAX_USERS_PER_ROOM && !room.users.has(id)) {
      return callback<RoomJoinResult>(cb, { ok: false, error: "Dieser Room ist voll." });
    }
    authorId = id;
    roomCode = room.code;
    const user = { id: authorId, name: sanitizeName(payload?.name), socketId: socket.id };
    addUserToRoom(room, user);
    socket.join(room.code);

    callback<RoomJoinResult>(cb, { ok: true, state: toRoomState(room) });
    socket.to(room.code).emit("user:joined", { user: { id: user.id, name: user.name } });
    io.to(room.code).emit("room:users", toRoomState(room));
  });

  socket.on("signal:start", () => {
    if (!allow(socket) || !roomCode) return;
    socket.to(roomCode).emit("signal:start", { userId: authorId });
  });

  socket.on("signal:end", (payload) => {
    if (!allow(socket) || !roomCode || !payload || !isSymbol(payload.symbol)) return;
    const durationMs = Number(payload.durationMs);
    if (!Number.isFinite(durationMs)) return;
    socket.to(roomCode).emit("signal:end", { userId: authorId, durationMs, symbol: payload.symbol });
  });

  socket.on("morse:symbol", (payload) => {
    if (!allow(socket) || !roomCode || !payload || !isSymbol(payload.symbol)) return;
    socket.to(roomCode).emit("morse:symbol", { userId: authorId, symbol: payload.symbol });
  });

  socket.on("morse:letter", (payload) => {
    if (!allow(socket)) return;
    const room = roomOf();
    if (!room || !payload || !isMorseCode(payload.morse)) return;
    const author = room.users.get(authorId);
    if (!author) return;
    const letter = sanitizeLetter(payload.letter);
    const message = appendToMessage(room, author, letter, payload.morse);
    socket.to(room.code).emit("morse:letter", { userId: authorId, morse: payload.morse, letter });
    io.to(room.code).emit("room:message", message);
  });

  socket.on("morse:wordGap", () => {
    if (!allow(socket)) return;
    const room = roomOf();
    if (!room) return;
    const author = room.users.get(authorId);
    if (!author) return;
    const message = appendToMessage(room, author, " ", "/");
    socket.to(room.code).emit("morse:wordGap", { userId: authorId });
    io.to(room.code).emit("room:message", message);
  });

  socket.on("morse:clear", () => {
    if (!allow(socket)) return;
    const room = roomOf();
    if (!room) return;
    const author = room.users.get(authorId);
    if (!author) return;
    const message = clearMessage(room, author);
    io.to(room.code).emit("room:message", message);
  });

  socket.on("user:updateSettings", (payload) => {
    if (!allow(socket)) return;
    const room = roomOf();
    if (!room) return;
    const user = room.users.get(authorId);
    if (!user) return;
    user.name = sanitizeName(payload?.name);
    touchRoom(room);
    const message = renameAuthor(room, user);
    io.to(room.code).emit("room:users", toRoomState(room));
    if (message) io.to(room.code).emit("room:message", message);
  });

  socket.on("disconnect", () => {
    if (!roomCode) return;
    const room = getRoom(roomCode);
    if (!room) return;
    // Held messages are intentionally kept so the other side can still read
    // them asynchronously. Only remove presence if this exact socket still
    // represents the user - a newer socket (reload) must not be evicted.
    const removed = removeUserFromRoom(room, authorId, socket.id);
    if (!removed) return;
    io.to(room.code).emit("user:left", { userId: authorId });
    io.to(room.code).emit("room:users", toRoomState(room));
  });
});

// Periodic idle-room reclamation (also runs opportunistically on create).
const cleanupTimer = setInterval(() => cleanupRooms(), 10 * 60 * 1000);
cleanupTimer.unref();

httpServer.listen(PORT, () => {
  console.log(`MorseRoom server listening on port ${PORT}`);
});

// Graceful shutdown so deployments (SIGTERM from orchestrators) drain cleanly.
function shutdown(signal: string) {
  console.log(`Received ${signal}, shutting down...`);
  clearInterval(cleanupTimer);
  io.close();
  httpServer.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
