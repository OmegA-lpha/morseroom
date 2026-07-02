import type { MorseRoomSettings } from "../hooks/useLocalSettings";
import { useI18n } from "../i18n/I18nContext";

interface MorseDisplayProps {
  receivedText: string;
  receivedMorse: string;
  ownMorse: string;
  ownText?: string;
  displayMode: MorseRoomSettings["displayMode"];
  displayVisible: boolean;
  blindRevealed: boolean;
  onReveal: () => void;
}

/**
 * Shows the live conversation: what was received (as text + raw morse) and
 * what you yourself are currently sending. Respects the three display modes
 * (full / learn / blind) so the app can double as a listening trainer.
 */
export function MorseDisplay({
  receivedText,
  receivedMorse,
  ownMorse,
  ownText,
  displayMode,
  displayVisible,
  blindRevealed,
  onReveal,
}: MorseDisplayProps) {
  const { t } = useI18n();
  if (!displayVisible) {
    return (
      <div className="display">
        <p className="display__blindHint">{t("displayHidden")}</p>
      </div>
    );
  }

  const isBlind = displayMode === "blind" && !blindRevealed;

  if (isBlind) {
    return (
      <div className="display">
        <p className="display__blindHint">{t("blindHint")}</p>
        <button className="btn btn--small" onClick={onReveal}>
          {t("reveal")}
        </button>
      </div>
    );
  }

  const hideMorse = displayMode === "learn";

  return (
    <div className="display">
      <div className="display__block">
        <span className="display__label">{t("receivedText")}</span>
        <div className="display__text">{receivedText || "–"}</div>
      </div>
      <div className="display__block">
        <span className="display__label">{t("receivedMorse")}</span>
        <div className={`display__morse${hideMorse ? " display__hidden" : ""}`}>
          {receivedMorse || "–"}
        </div>
      </div>
      <div className="display__block">
        <span className="display__label">{t("ownMorse")}</span>
        <div className="display__morse display__morse--own">{ownMorse || "–"}</div>
        {ownText ? <div className="display__label">→ {ownText}</div> : null}
      </div>
    </div>
  );
}
