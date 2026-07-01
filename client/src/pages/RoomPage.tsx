import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSettings } from "../context/SettingsContext";
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

  const {
    socket,
    connected,
    roomState,
    error,
    clearError,
    createRoom,
    joinRoom,
    sendSignalStart,
    sendSignalEnd,
    sendSymbol,
    sendLetter,
    sendWordGap,
  } = useSocketRoom();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [receivedText, setReceivedText] = useState("");
  const [receivedHistory, setReceivedHistory] = useState("");
  const [receivedBuffer, setReceivedBuffer] = useState("");
  const [ownHistory, setOwnHistory] = useState("");
  const [ownBuffer, setOwnBuffer] = useState("");
  const [ownText, setOwnText] = useState("");
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
    const onSymbol = ({ symbol }: { symbol: "." | "-" }) => {
      setReceivedBuffer((prev) => prev + symbol);
    };
    const onLetter = ({ morse, letter }: { morse: string; letter: string }) => {
      setReceivedHistory((prev) => (prev ? `${prev} ${morse}` : morse));
      setReceivedText((prev) => prev + letter);
      setReceivedBuffer("");
    };
    const onWordGap = () => {
      setReceivedHistory((prev) => (prev ? `${prev} /` : "/"));
      setReceivedText((prev) => (prev.endsWith(" ") ? prev : prev + " "));
    };

    socket.on("signal:start", onSignalStart);
    socket.on("signal:end", onSignalEnd);
    socket.on("morse:symbol", onSymbol);
    socket.on("morse:letter", onLetter);
    socket.on("morse:wordGap", onWordGap);

    return () => {
      socket.off("signal:start", onSignalStart);
      socket.off("signal:end", onSignalEnd);
      socket.off("morse:symbol", onSymbol);
      socket.off("morse:letter", onLetter);
      socket.off("morse:wordGap", onWordGap);
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
      setOwnHistory((prev) => (prev ? `${prev} ${morse}` : morse));
      setOwnText((prev) => prev + letter);
      setOwnBuffer("");
      sendLetter(morse, letter);
    },
    onWordGap: () => {
      setOwnHistory((prev) => (prev ? `${prev} /` : "/"));
      setOwnText((prev) => (prev.endsWith(" ") ? prev : prev + " "));
      sendWordGap();
    },
  });

  const shareLink = `${window.location.origin}/room/${roomState?.code ?? codeParam}`;
  const displayCode = roomState?.code ?? codeParam?.toUpperCase() ?? "";

  const handleShareWhatsApp = useCallback(() => {
    const text = `Komm in meinen MorseRoom: ${displayCode}\n${shareLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  }, [displayCode, shareLink]);

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
        ← Verlassen
      </button>

      {!storageAvailable && (
        <div className="banner">localStorage nicht verfügbar – Einstellungen werden nicht gespeichert.</div>
      )}
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

      <MorseDisplay
        receivedText={receivedText}
        receivedMorse={receivedHistory ? `${receivedHistory} ${receivedBuffer}`.trim() : receivedBuffer}
        ownMorse={ownHistory ? `${ownHistory} ${ownBuffer}`.trim() : ownBuffer}
        ownText={ownText}
        displayMode={settings.displayMode}
        displayVisible={settings.displayVisible}
        blindRevealed={blindRevealed}
        onReveal={() => setBlindRevealed(true)}
      />

      <div className="morseButtonWrap">
        <MorseButton pressed={pressed} {...handlers} disabled={!roomState} />
        <span className="morseButton__hint">gedrückt halten (oder Leertaste)</span>
        <div className="morseControls">
          <button
            className={`btn btn--icon${settings.displayVisible ? " isActive" : ""}`}
            onClick={() => updateSettings({ displayVisible: !settings.displayVisible })}
            aria-label="Anzeige an/aus"
          >
            👁
          </button>
          <button
            className={`btn btn--icon${settings.soundEnabled ? " isActive" : ""}`}
            onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
            aria-label="Ton an/aus"
          >
            🔊
          </button>
          <button
            className={`btn btn--icon${settings.lightEnabled ? " isActive" : ""}`}
            onClick={() => updateSettings({ lightEnabled: !settings.lightEnabled })}
            aria-label="Licht an/aus"
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
