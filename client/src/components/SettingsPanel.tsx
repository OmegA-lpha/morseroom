import { useEffect } from "react";
import type { MorseRoomSettings } from "../hooks/useLocalSettings";

interface SettingsPanelProps {
  open: boolean;
  settings: MorseRoomSettings;
  onUpdate: (partial: Partial<MorseRoomSettings>) => void;
  onClose: () => void;
  onClearHistory: () => void;
}

function Toggle({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <div className="field__row">
      <span className="field__label">{label}</span>
      <button
        type="button"
        className={`switch${on ? " isOn" : ""}`}
        onClick={onToggle}
        aria-pressed={on}
        aria-label={label}
      >
        <span className="switch__knob" />
      </button>
    </div>
  );
}

/** Bottom-sheet settings panel. Closes on Escape or backdrop tap. */
export function SettingsPanel({ open, settings, onUpdate, onClose, onClearHistory }: SettingsPanelProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="settingsPanel" onClick={(e) => e.stopPropagation()}>
        <div className="settingsPanel__header">
          <span className="settingsPanel__title">Einstellungen</span>
          <button className="btn btn--icon" onClick={onClose} aria-label="Schließen">
            ✕
          </button>
        </div>

        <div className="field">
          <span className="field__label">Anzeigename</span>
          <input
            className="input"
            style={{ textTransform: "none", letterSpacing: "normal" }}
            value={settings.displayName}
            maxLength={24}
            onChange={(e) => onUpdate({ displayName: e.target.value })}
            placeholder="Dein Name"
          />
        </div>

        <Toggle
          label="Ton"
          on={settings.soundEnabled}
          onToggle={() => onUpdate({ soundEnabled: !settings.soundEnabled })}
        />
        <Toggle
          label="Lichtmodus"
          on={settings.lightEnabled}
          onToggle={() => onUpdate({ lightEnabled: !settings.lightEnabled })}
        />
        <Toggle
          label="Anzeige (Text/Code)"
          on={settings.displayVisible}
          onToggle={() => onUpdate({ displayVisible: !settings.displayVisible })}
        />
        <Toggle
          label="Roomcode merken"
          on={settings.saveRoomCode}
          onToggle={() => onUpdate({ saveRoomCode: !settings.saveRoomCode })}
        />

        <div className="field">
          <span className="field__label">Anzeige-Modus</span>
          <div className="solo__chips">
            {(["full", "learn", "blind"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                className={`chip${settings.displayMode === mode ? " isActive" : ""}`}
                onClick={() => onUpdate({ displayMode: mode })}
              >
                {mode === "full" ? "Alles sichtbar" : mode === "learn" ? "Lernmodus" : "Blindmodus"}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <div className="field__row">
            <span className="field__label">Ton-Frequenz</span>
            <span className="field__value">{settings.toneFrequencyHz} Hz</span>
          </div>
          <input
            type="range"
            min={300}
            max={1000}
            step={10}
            value={settings.toneFrequencyHz}
            onChange={(e) => onUpdate({ toneFrequencyHz: Number(e.target.value) })}
          />
        </div>

        <Toggle
          label="Zeiten aus – nur Verhältnis"
          on={settings.adaptive}
          onToggle={() => onUpdate({ adaptive: !settings.adaptive })}
        />

        {settings.adaptive ? (
          <div className="field">
            <span className="field__hint">
              Feste Zeiten sind aus. Erkannt wird allein am Verhältnis deines eigenen Tempos
              (Strich = 3× Punkt, Buchstabenpause = 3×, Wortpause = 7×). Ein Punkt darf 40 ms
              oder 200 ms lang sein – es zählt nur die Proportion.
            </span>
          </div>
        ) : (
          <>
            <div className="field">
              <div className="field__row">
                <span className="field__label">Strich-Grenze</span>
                <span className="field__value">{settings.dashThresholdMs} ms</span>
              </div>
              <input
                type="range"
                min={150}
                max={800}
                step={10}
                value={settings.dashThresholdMs}
                onChange={(e) => onUpdate({ dashThresholdMs: Number(e.target.value) })}
              />
            </div>

            <div className="field">
              <div className="field__row">
                <span className="field__label">Buchstabenpause</span>
                <span className="field__value">{settings.letterGapMs} ms</span>
              </div>
              <input
                type="range"
                min={300}
                max={1500}
                step={10}
                value={settings.letterGapMs}
                onChange={(e) => onUpdate({ letterGapMs: Number(e.target.value) })}
              />
            </div>

            <div className="field">
              <div className="field__row">
                <span className="field__label">Wortpause</span>
                <span className="field__value">{settings.wordGapMs} ms</span>
              </div>
              <input
                type="range"
                min={600}
                max={3000}
                step={10}
                value={settings.wordGapMs}
                onChange={(e) => onUpdate({ wordGapMs: Number(e.target.value) })}
              />
            </div>
          </>
        )}

        <div className="field">
          <div className="field__row">
            <span className="field__label">Versehentliche Taps ignorieren bis</span>
            <span className="field__value">{settings.ignoreBelowMs} ms</span>
          </div>
          <input
            type="range"
            min={0}
            max={150}
            step={5}
            value={settings.ignoreBelowMs}
            onChange={(e) => onUpdate({ ignoreBelowMs: Number(e.target.value) })}
          />
        </div>

        <button className="btn btn--danger" onClick={onClearHistory}>
          Lokalen Verlauf löschen
        </button>
      </div>
    </div>
  );
}
