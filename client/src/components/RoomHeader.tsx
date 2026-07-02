import { useI18n } from "../i18n/I18nContext";

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
  const { t } = useI18n();
  return (
    <div className="roomHeader">
      <div className="roomHeader__top">
        <div>
          <div className="roomHeader__code">{code}</div>
          <div className="roomHeader__status">
            <span className={`statusDot${connected ? " isOnline" : ""}`} />
            {connected ? t("connected") : t("disconnected")} · {userCount} {t("users")}
          </div>
        </div>
        <button className="btn btn--icon" onClick={onOpenSettings} aria-label={t("settings")}>
          ⚙
        </button>
      </div>
      <div className="roomHeader__actions">
        <button className="btn btn--small btn--primary" onClick={onShareWhatsApp}>
          {t("shareWhatsApp")}
        </button>
        <button className="btn btn--small" onClick={onCopyLink}>
          {t("copyLink")}
        </button>
        <button className="btn btn--small" onClick={onCopyCode}>
          {t("copyCode")}
        </button>
      </div>
    </div>
  );
}
