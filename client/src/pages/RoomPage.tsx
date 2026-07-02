import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSettings } from "../context/SettingsContext";
import { useI18n } from "../i18n/I18nContext";
import { useSocketRoom } from "../hooks/useSocketRoom";
import { useMorseInput } from "../hooks/useMorseInput";
import { useMorseTone } from "../audio/useMorseTone";
import { MorseButton } from "../components/MorseButton";
import { RoomHeader } from "../components/RoomHeader";
import { MorseDisplay } from "../components/MorseDisplay";
import { SettingsPanel } from "../components/SettingsPanel";

export function RoomPage() {
  const { code: codeParam } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { settings, updateSettings, setLastRoomCode, clearLocalHistory, storageAvailable } =
    useSettings();
  const { t } = useI18n();

  const {
    socket,
    connected,
    roomState,
    messages,
    error,
    clearError,
    createRoom,
    joinRoom,
    sendSignalStart,
    sendSignalEnd,
    sendSymbol,
    sendLetter,
    sendWordGap,
    sendClear,
    selfId,
  } = useSocketRoom();

  const [settingsOpen, setSettingsOpen] = useState(false);
  // In-progress (not yet completed) symbols per author, shown live on top of
  // the persisted held message. Cleared once the letter/word is committed.
  const [liveSymbols, setLiveSymbols] = useState<Record<string, string>>({});
  const [ownBuffer, setOwnBuffer] = useState("");
  const [remoteFlash, setRemoteFlash] = useState(false);
  const [blindRevealed, setBlindRevealed] = useState(false);

  const localTone = useMorseTone(settings.toneFrequencyHz);
  const remoteTone = useMorseTone(settings.toneFrequencyHz);

  const initiatedRef = useRef(false);

  // Create or join the room exactly once, based on the URL: "/room/new"
  // creates a fresh server-generated code and swaps the URL for it,
  // any other code joins that existing room.
  useEffect(() => {
    if (!socket || initiatedRef.current || !codeParam) return;
    initiatedRef.current = true;

    if (codeParam.toUpperCase() === "NEW") {
      createRoom(settings.displayName)
        .then((state) => {
          setLastRoomCode(state.code);
          navigate(`/room/${state.code}`, { replace: true });
        })
        .catch(() => {});
    } else {
      joinRoom(codeParam, settings.displayName)
        .then((state) => setLastRoomCode(state.code))
        .catch(() => {});
    }
    // settings.displayName intentionally read once at join time
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, codeParam]);

  // Live remote signal -> tone + screen flash (mirrors a real morse lamp).
  // The decoded text/morse itself is server-authoritative (held messages),
  // so here we only drive the ephemeral live feedback and the in-progress
  // symbol buffer; completed letters arrive via room:message in useSocketRoom.
  useEffect(() => {
    if (!socket) return;
    const onSignalStart = () => {
      if (settings.lightEnabled) setRemoteFlash(true);
      if (settings.soundEnabled) remoteTone.start();
    };
    const onSignalEnd = () => {
      setRemoteFlash(false);
      remoteTone.stop();
    };
    const onSymbol = ({ userId, symbol }: { userId: string; symbol: "." | "-" }) => {
      setLiveSymbols((prev) => ({ ...prev, [userId]: (prev[userId] ?? "") + symbol }));
    };
    const clearLive = ({ userId }: { userId: string }) => {
      setLiveSymbols((prev) => (prev[userId] ? { ...prev, [userId]: "" } : prev));
    };

    socket.on("signal:start", onSignalStart);
    socket.on("signal:end", onSignalEnd);
    socket.on("morse:symbol", onSymbol);
    socket.on("morse:letter", clearLive);
    socket.on("morse:wordGap", clearLive);

    return () => {
      socket.off("signal:start", onSignalStart);
      socket.off("signal:end", onSignalEnd);
      socket.off("morse:symbol", onSymbol);
      socket.off("morse:letter", clearLive);
      socket.off("morse:wordGap", clearLive);
    };
  }, [socket, settings.lightEnabled, settings.soundEnabled, remoteTone]);

  const { pressed, handlers } = useMorseInput({
    config: settings,
    enableKeyboard: true,
    disabled: !roomState,
    onPressStart: () => {
      sendSignalStart();
      if (settings.soundEnabled) localTone.start();
    },
    onPressEnd: (durationMs, symbol) => {
      localTone.stop();
      if (symbol) sendSignalEnd(durationMs, symbol);
    },
    onSymbol: (symbol) => {
      setOwnBuffer((prev) => prev + symbol);
      sendSymbol(symbol);
    },
    onLetter: (morse, letter) => {
      setOwnBuffer("");
      sendLetter(morse, letter);
    },
    onWordGap: () => {
      setOwnBuffer("");
      sendWordGap();
    },
  });

  // Derive the display from the server-authoritative held messages plus the
  // live in-progress symbol buffers.
  const ownMessage = selfId ? messages[selfId] : undefined;
  const otherMessages = Object.values(messages)
    .filter((m) => m.userId !== selfId)
    .sort((a, b) => b.updatedAt - a.updatedAt);
  const otherMessage = otherMessages[0];
  const otherOnline = otherMessage
    ? !!roomState?.users.some((u) => u.id === otherMessage.userId)
    : false;

  const withLive = (morse: string, live: string) => (live ? `${morse} ${live}`.trim() : morse);
  const receivedMorse = otherMessage
    ? withLive(otherMessage.morse, liveSymbols[otherMessage.userId] ?? "")
    : "";
  const ownMorse = withLive(ownMessage?.morse ?? "", ownBuffer);

  const handleClearOwn = useCallback(() => {
    setOwnBuffer("");
    sendClear();
  }, [sendClear]);

  const shareLink = `${window.location.origin}/room/${roomState?.code ?? codeParam}`;
  const displayCode = roomState?.code ?? codeParam?.toUpperCase() ?? "";

  const handleShareWhatsApp = useCallback(() => {
    const text = `${t("shareText", { code: displayCode })}\n${shareLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  }, [displayCode, shareLink, t]);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard?.writeText(shareLink).catch(() => {});
  }, [shareLink]);

  const handleCopyCode = useCallback(() => {
    navigator.clipboard?.writeText(displayCode).catch(() => {});
  }, [displayCode]);

  return (
    <div className="morseScreen">
      <div className={`lightFlash${remoteFlash ? " isOn" : ""}`} />

      <button className="topLink" onClick={() => navigate("/")}>
        ← {t("leave")}
      </button>

      {!storageAvailable && <div className="banner">{t("storageUnavailable")}</div>}
      {error && (
        <div className="banner" onClick={clearError}>
          {error}
        </div>
      )}

      <RoomHeader
        code={displayCode}
        connected={connected}
        userCount={roomState?.users.length ?? 0}
        onShareWhatsApp={handleShareWhatsApp}
        onCopyLink={handleCopyLink}
        onCopyCode={handleCopyCode}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {otherMessage && (otherMessage.text || otherMessage.morse) && (
        <div className="asyncHint">
          {t("messageFrom")} <strong>{otherMessage.name}</strong>
          {otherOnline ? ` (${t("statusOnline")})` : ` · ${t("statusOfflineHeld")}`}
        </div>
      )}

      <MorseDisplay
        receivedText={otherMessage?.text ?? ""}
        receivedMorse={receivedMorse}
        ownMorse={ownMorse}
        ownText={ownMessage?.text ?? ""}
        displayMode={settings.displayMode}
        displayVisible={settings.displayVisible}
        blindRevealed={blindRevealed}
        onReveal={() => setBlindRevealed(true)}
      />

      <div className="morseButtonWrap">
        <MorseButton pressed={pressed} {...handlers} disabled={!roomState} />
        <span className="morseButton__hint">{t("holdHint")}</span>
        <div className="morseControls">
          <button
            className="btn btn--icon"
            onClick={handleClearOwn}
            disabled={!ownMessage?.text && !ownMessage?.morse && !ownBuffer}
            aria-label={t("newMessage")}
            title={t("newMessage")}
          >
            🗑
          </button>
          <button
            className={`btn btn--icon${settings.displayVisible ? " isActive" : ""}`}
            onClick={() => updateSettings({ displayVisible: !settings.displayVisible })}
            aria-label={t("toggleDisplay")}
          >
            👁
          </button>
          <button
            className={`btn btn--icon${settings.soundEnabled ? " isActive" : ""}`}
            onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
            aria-label={t("toggleSound")}
          >
            🔊
          </button>
          <button
            className={`btn btn--icon${settings.lightEnabled ? " isActive" : ""}`}
            onClick={() => updateSettings({ lightEnabled: !settings.lightEnabled })}
            aria-label={t("toggleLight")}
          >
            💡
          </button>
        </div>
      </div>

      <SettingsPanel
        open={settingsOpen}
        settings={settings}
        onUpdate={updateSettings}
        onClose={() => setSettingsOpen(false)}
        onClearHistory={clearLocalHistory}
      />
    </div>
  );
}
