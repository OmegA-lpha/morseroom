import { useEffect } from "react";
import type { MorseRoomSettings } from "../hooks/useLocalSettings";
import { useI18n } from "../i18n/I18nContext";

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
  const { t } = useI18n();
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
          <span className="settingsPanel__title">{t("settings")}</span>
          <button className="btn btn--icon" onClick={onClose} aria-label={t("close")}>
            ✕
          </button>
        </div>

        <div className="field">
          <span className="field__label">{t("displayName")}</span>
          <input
            className="input"
            style={{ textTransform: "none", letterSpacing: "normal" }}
            value={settings.displayName}
            maxLength={24}
            onChange={(e) => onUpdate({ displayName: e.target.value })}
            placeholder={t("yourName")}
          />
        </div>

        <Toggle
          label={t("sound")}
          on={settings.soundEnabled}
          onToggle={() => onUpdate({ soundEnabled: !settings.soundEnabled })}
        />
        <Toggle
          label={t("lightMode")}
          on={settings.lightEnabled}
          onToggle={() => onUpdate({ lightEnabled: !settings.lightEnabled })}
        />
        <Toggle
          label={t("displayTextCode")}
          on={settings.displayVisible}
          onToggle={() => onUpdate({ displayVisible: !settings.displayVisible })}
        />
        <Toggle
          label={t("rememberRoomcode")}
          on={settings.saveRoomCode}
          onToggle={() => onUpdate({ saveRoomCode: !settings.saveRoomCode })}
        />

        <div className="field">
          <span className="field__label">{t("displayModeLabel")}</span>
          <div className="solo__chips">
            {(["full", "learn", "blind"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                className={`chip${settings.displayMode === mode ? " isActive" : ""}`}
                onClick={() => onUpdate({ displayMode: mode })}
              >
                {mode === "full" ? t("modeFull") : mode === "learn" ? t("modeLearn") : t("modeBlind")}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <div className="field__row">
            <span className="field__label">{t("toneFrequency")}</span>
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
          label={t("ratioOnly")}
          on={settings.adaptive}
          onToggle={() => onUpdate({ adaptive: !settings.adaptive })}
        />

        {settings.adaptive ? (
          <div className="field">
            <span className="field__hint">{t("ratioHint")}</span>
          </div>
        ) : (
          <>
            <div className="field">
              <div className="field__row">
                <span className="field__label">{t("dashThreshold")}</span>
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
                <span className="field__label">{t("letterGap")}</span>
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
                <span className="field__label">{t("wordGap")}</span>
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
            <span className="field__label">{t("ignoreTapsBelow")}</span>
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
          {t("clearLocalHistory")}
        </button>
      </div>
    </div>
  );
}
