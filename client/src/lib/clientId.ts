const CLIENT_ID_KEY = "morseroom.clientId";

/**
 * A stable per-browser id used as the public author identity in rooms. It lets
 * a page reload (which gets a fresh socket id) reclaim the same held message
 * and presence instead of showing up as a new person.
 *
 * Persisted in localStorage; falls back to an in-memory id if storage is
 * unavailable (private mode) so the app still works for the session.
 */
let cached: string | null = null;

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getClientId(): string {
  if (cached) return cached;
  try {
    const existing = window.localStorage.getItem(CLIENT_ID_KEY);
    if (existing) {
      cached = existing;
      return existing;
    }
    const id = createId();
    window.localStorage.setItem(CLIENT_ID_KEY, id);
    cached = id;
    return id;
  } catch {
    // localStorage unavailable: use a stable-for-this-session in-memory id.
    cached = cached ?? createId();
    return cached;
  }
}
