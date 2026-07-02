import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSettings } from "../context/SettingsContext";
import { useI18n } from "../i18n/I18nContext";

// Public source URL. Override at build time with VITE_GITHUB_URL; the default
// points at the upstream repository so forks just need to set the env var.
const GITHUB_URL = import.meta.env.VITE_GITHUB_URL ?? "https://github.com/OmegA-lpha/morseroom";

export function HomePage() {
  const navigate = useNavigate();
  const { lastRoomCode } = useSettings();
  const { t } = useI18n();
  const [joinCode, setJoinCode] = useState("");

  const handleJoin = () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) return;
    navigate(`/room/${code}`);
  };

  return (
    <div className="screen">
      <div className="home">
        <div>
          <h1 className="home__title">
            Morse<span className="dot">Room</span>
          </h1>
          <p className="home__subtitle">{t("homeSubtitle")}</p>
        </div>

        <div className="home__actions">
          <button className="btn btn--primary" onClick={() => navigate("/solo")}>
            {t("soloPractice")}
          </button>
          <button className="btn" onClick={() => navigate("/room/new")}>
            {t("createRoom")}
          </button>

          <div className="home__divider">{t("orJoin")}</div>

          <div className="home__joinRow">
            <input
              className="input"
              placeholder={t("roomcodePlaceholder")}
              value={joinCode}
              maxLength={6}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleJoin();
              }}
            />
            <button className="btn" onClick={handleJoin}>
              {t("join")}
            </button>
          </div>

          {lastRoomCode && (
            <button className="btn btn--ghost" onClick={() => navigate(`/room/${lastRoomCode}`)}>
              {t("lastUsed", { code: lastRoomCode })}
            </button>
          )}
        </div>

        <div className="home__footer">
          <a
            className="home__ghLink"
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
            </svg>
            {t("sourceOnGitHub")}
          </a>
        </div>
      </div>
    </div>
  );
}
