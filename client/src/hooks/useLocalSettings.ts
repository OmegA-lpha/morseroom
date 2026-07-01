import { useCallback, useEffect, useState } from "react";
import { DEFAULT_TIMING, type TimingConfig } from "@shared/types";

export interface MorseRoomSettings extends TimingConfig {
  displayName: string;
  soundEnabled: boolean;
  lightEnabled: boolean;
  /** Master switch: hide all text/morse readouts ("Anzeige aus"). */
  displayVisible: boolean;
  /** Full = everything visible, learn = morse partly hidden, blind = nothing until "Auflösen". */
  displayMode: "full" | "learn" | "blind";
  toneFrequencyHz: number;
  saveRoomCode: boolean;
}

export const DEFAULT_SETTINGS: MorseRoomSettings = {
  ...DEFAULT_TIMING,
  displayName: "",
  soundEnabled: true,
  lightEnabled: true,
  displayVisible: true,
  displayMode: "full",
  toneFrequencyHz: 600,
  saveRoomCode: true,
};

const SETTINGS_KEY = "morseroom.settings";
const LAST_ROOM_KEY = "morseroom.lastRoomCode";

function isStorageAvailable(): boolean {
  try {
    const testKey = "__morseroom_test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

function loadSettings(): MorseRoomSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/**
 * Reads/writes all user preferences (name, timing, audio/light, display mode)
 * to localStorage. Falls back to in-memory defaults if storage is unavailable
 * (e.g. private browsing) so the app still works, just without persistence.
 */
export function useLocalSettings() {
  const [storageAvailable] = useState(isStorageAvailable);
  const [settings, setSettings] = useState<MorseRoomSettings>(() =>
    storageAvailable ? loadSettings() : DEFAULT_SETTINGS
  );
  const [lastRoomCode, setLastRoomCodeState] = useState<string | null>(() => {
    if (!storageAvailable) return null;
    try {
      return window.localStorage.getItem(LAST_ROOM_KEY);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!storageAvailable) return;
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // ignore quota/availability errors, app keeps working in-memory
    }
  }, [settings, storageAvailable]);

  const updateSettings = useCallback((partial: Partial<MorseRoomSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  const setLastRoomCode = useCallback(
    (code: string | null) => {
      setLastRoomCodeState(code);
      if (!storageAvailable) return;
      try {
        if (code && settings.saveRoomCode) {
          window.localStorage.setItem(LAST_ROOM_KEY, code);
        } else {
          window.localStorage.removeItem(LAST_ROOM_KEY);
        }
      } catch {
        // ignore
      }
    },
    [storageAvailable, settings.saveRoomCode]
  );

  const clearLocalHistory = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    setLastRoomCodeState(null);
    if (!storageAvailable) return;
    try {
      window.localStorage.removeItem(SETTINGS_KEY);
      window.localStorage.removeItem(LAST_ROOM_KEY);
    } catch {
      // ignore
    }
  }, [storageAvailable]);

  return {
    settings,
    updateSettings,
    lastRoomCode,
    setLastRoomCode,
    clearLocalHistory,
    storageAvailable,
  };
}
