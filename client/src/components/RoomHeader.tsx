interface RoomHeaderProps {
  code: string;
  connected: boolean;
  userCount: number;
  onShareWhatsApp: () => void;
  onCopyLink: () => void;
  onCopyCode: () => void;
  onOpenSettings: () => void;
}

export function RoomHeader({
  code,
  connected,
  userCount,
  onShareWhatsApp,
  onCopyLink,
  onCopyCode,
  onOpenSettings,
}: RoomHeaderProps) {
  return (
    <div className="roomHeader">
      <div className="roomHeader__top">
        <div>
          <div className="roomHeader__code">{code}</div>
          <div className="roomHeader__status">
            <span className={`statusDot${connected ? " isOnline" : ""}`} />
            {connected ? "Verbunden" : "Getrennt"} · {userCount} {userCount === 1 ? "Nutzer" : "Nutzer"}
          </div>
        </div>
        <button className="btn btn--icon" onClick={onOpenSettings} aria-label="Einstellungen">
          ⚙
        </button>
      </div>
      <div className="roomHeader__actions">
        <button className="btn btn--small btn--primary" onClick={onShareWhatsApp}>
          Per WhatsApp teilen
        </button>
        <button className="btn btn--small" onClick={onCopyLink}>
          Link kopieren
        </button>
        <button className="btn btn--small" onClick={onCopyCode}>
          Roomcode kopieren
        </button>
      </div>
    </div>
  );
}
