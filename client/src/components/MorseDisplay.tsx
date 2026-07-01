import type { MorseRoomSettings } from "../hooks/useLocalSettings";

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
  if (!displayVisible) {
    return (
      <div className="display">
        <p className="display__blindHint">Anzeige ausgeblendet – nur Ton/Licht aktiv.</p>
      </div>
    );
  }

  const isBlind = displayMode === "blind" && !blindRevealed;

  if (isBlind) {
    return (
      <div className="display">
        <p className="display__blindHint">
          Blindmodus: nur hören/sehen, kein Mitlesen. Wenn du fertig bist, löse auf.
        </p>
        <button className="btn btn--small" onClick={onReveal}>
          Auflösen
        </button>
      </div>
    );
  }

  const hideMorse = displayMode === "learn";

  return (
    <div className="display">
      <div className="display__block">
        <span className="display__label">Empfangener Text</span>
        <div className="display__text">{receivedText || "–"}</div>
      </div>
      <div className="display__block">
        <span className="display__label">Empfangener Morsecode</span>
        <div className={`display__morse${hideMorse ? " display__hidden" : ""}`}>
          {receivedMorse || "–"}
        </div>
      </div>
      <div className="display__block">
        <span className="display__label">Eigener Morsecode</span>
        <div className="display__morse display__morse--own">{ownMorse || "–"}</div>
        {ownText ? <div className="display__label">→ {ownText}</div> : null}
      </div>
    </div>
  );
}
