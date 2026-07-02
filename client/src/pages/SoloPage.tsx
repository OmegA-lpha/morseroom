import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSettings } from "../context/SettingsContext";
import { useI18n } from "../i18n/I18nContext";
import { useMorseInput } from "../hooks/useMorseInput";
import { useMorseTone } from "../audio/useMorseTone";
import { MorseButton } from "../components/MorseButton";
import { SettingsPanel } from "../components/SettingsPanel";
import { encodeText } from "@shared/encode";

type PracticeType = "letters" | "words" | "numbers" | "sos" | "custom";
type Level = 1 | 2 | 3;

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const WORDS = ["HALLO", "MORSE", "ROOM", "FUNK", "SIGNAL", "TEXT", "CODE", "ECHO", "TEAM", "ZEIT"];
const DIGITS = "0123456789".split("");

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function nextTarget(type: PracticeType, customText: string): string {
  switch (type) {
    case "letters":
      return randomFrom(LETTERS);
    case "words":
      return randomFrom(WORDS);
    case "numbers":
      return Array.from({ length: 1 + Math.floor(Math.random() * 3) }, () => randomFrom(DIGITS)).join("");
    case "sos":
      return "SOS";
    case "custom":
      return customText.trim().toUpperCase() || "SOS";
  }
}

/** Standalone practice mode: no socket, just you and the morse key. */
export function SoloPage() {
  const navigate = useNavigate();
  const { settings, updateSettings, clearLocalHistory } = useSettings();
  const { t } = useI18n();
  const tone = useMorseTone(settings.toneFrequencyHz);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [practiceType, setPracticeType] = useState<PracticeType>("letters");
  const [level, setLevel] = useState<Level>(1);
  const [customText, setCustomText] = useState("");
  const [target, setTarget] = useState(() => nextTarget("letters", ""));
  const [attemptText, setAttemptText] = useState("");
  const [attemptHistory, setAttemptHistory] = useState("");
  const [attemptBuffer, setAttemptBuffer] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [playedBack, setPlayedBack] = useState(false);

  const [stats, setStats] = useState({ correct: 0, wrong: 0, reactionSamples: [] as number[] });

  const targetShownAtRef = useRef(performance.now());
  const firstPressAtRef = useRef<number | null>(null);
  const playbackTimeoutsRef = useRef<number[]>([]);

  const targetMorse = useMemo(() => encodeText(target), [target]);

  const newTarget = useCallback(
    (type: PracticeType = practiceType) => {
      playbackTimeoutsRef.current.forEach((id) => window.clearTimeout(id));
      playbackTimeoutsRef.current = [];
      setTarget(nextTarget(type, customText));
      setAttemptText("");
      setAttemptHistory("");
      setAttemptBuffer("");
      setFeedback(null);
      setPlayedBack(false);
      firstPressAtRef.current = null;
      targetShownAtRef.current = performance.now();
    },
    [practiceType, customText]
  );

  useEffect(() => {
    newTarget(practiceType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practiceType]);

  // Level 3: play the target as tone/light before the user replies.
  const playTargetBack = useCallback(() => {
    let t = 0;
    for (const symbol of targetMorse.replace(/\//g, "").split("")) {
      if (symbol !== "." && symbol !== "-") continue;
      const duration = symbol === "-" ? settings.dashThresholdMs + 150 : 120;
      const id = window.setTimeout(() => tone.beep(duration), t);
      playbackTimeoutsRef.current.push(id);
      t += duration + 150;
    }
    const doneId = window.setTimeout(() => setPlayedBack(true), t);
    playbackTimeoutsRef.current.push(doneId);
  }, [targetMorse, tone, settings.dashThresholdMs]);

  useEffect(() => {
    if (level === 3) playTargetBack();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, target]);

  const checkAttempt = useCallback(
    (finalText: string) => {
      const isCorrect = finalText.trim() === target.trim();
      setFeedback(isCorrect ? "correct" : "wrong");
      const reaction = firstPressAtRef.current
        ? firstPressAtRef.current - targetShownAtRef.current
        : 0;
      setStats((prev) => ({
        correct: prev.correct + (isCorrect ? 1 : 0),
        wrong: prev.wrong + (isCorrect ? 0 : 1),
        reactionSamples: reaction ? [...prev.reactionSamples, reaction] : prev.reactionSamples,
      }));
    },
    [target]
  );

  const { pressed, handlers } = useMorseInput({
    config: settings,
    enableKeyboard: true,
    onPressStart: () => {
      if (settings.soundEnabled) tone.start();
      if (firstPressAtRef.current === null) firstPressAtRef.current = performance.now();
    },
    onPressEnd: () => {
      tone.stop();
    },
    onSymbol: (symbol) => {
      setAttemptBuffer((prev) => prev + symbol);
    },
    onLetter: (morse, letter) => {
      setAttemptHistory((prev) => (prev ? `${prev} ${morse}` : morse));
      setAttemptBuffer("");
      setAttemptText((prev) => {
        const next = prev + letter;
        if (next.length >= target.length) checkAttempt(next);
        return next;
      });
    },
    onWordGap: () => {
      setAttemptText((prev) => {
        checkAttempt(prev);
        return prev;
      });
    },
  });

  const accuracy =
    stats.correct + stats.wrong > 0
      ? Math.round((stats.correct / (stats.correct + stats.wrong)) * 100)
      : 0;
  const avgReaction =
    stats.reactionSamples.length > 0
      ? Math.round(stats.reactionSamples.reduce((a, b) => a + b, 0) / stats.reactionSamples.length)
      : 0;

  const showTargetWord = level <= 2;
  const showTargetMorse = level === 1;

  return (
    <div className="morseScreen">
      <div className="solo__topRow">
        <button className="topLink" onClick={() => navigate("/")}>
          ← {t("back")}
        </button>
        <button className="btn btn--icon" onClick={() => setSettingsOpen(true)} aria-label={t("settings")}>
          ⚙️
        </button>
      </div>

      <div className="solo">
        <div className="solo__topBar">
          <div className="solo__chips">
            {(["letters", "words", "numbers", "sos", "custom"] as const).map((type) => (
              <button
                key={type}
                className={`chip${practiceType === type ? " isActive" : ""}`}
                onClick={() => setPracticeType(type)}
              >
                {type === "letters"
                  ? t("practiceLetters")
                  : type === "words"
                  ? t("practiceWords")
                  : type === "numbers"
                  ? t("practiceNumbers")
                  : type === "sos"
                  ? t("practiceSos")
                  : t("practiceCustom")}
              </button>
            ))}
          </div>
          <div className="solo__chips">
            {[1, 2, 3].map((lvl) => (
              <button
                key={lvl}
                className={`chip${level === lvl ? " isActive" : ""}`}
                onClick={() => setLevel(lvl as Level)}
              >
                {t("level")} {lvl}
              </button>
            ))}
          </div>
        </div>

        {practiceType === "custom" && (
          <input
            className="input"
            placeholder={t("customPlaceholder")}
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            onBlur={() => newTarget("custom")}
          />
        )}

        <div className="solo__target">
          {level === 3 ? (
            <>
              <div className="display__label">{t("level3Label")}</div>
              {!playedBack ? (
                <button className="btn" onClick={playTargetBack}>
                  {t("playAgain")}
                </button>
              ) : (
                <button className="btn btn--small" onClick={playTargetBack}>
                  🔁 {t("repeat")}
                </button>
              )}
            </>
          ) : (
            <>
              {showTargetWord && <div className="solo__targetWord">{target}</div>}
              {showTargetMorse && <div className="solo__targetMorse">{targetMorse}</div>}
            </>
          )}

          <div className="display__morse display__morse--own">
            {(attemptHistory ? `${attemptHistory} ${attemptBuffer}`.trim() : attemptBuffer) || "…"}
          </div>
          <div className="display__text">{attemptText}</div>

          <div
            className={`solo__feedback${
              feedback === "correct" ? " solo__feedback--ok" : feedback === "wrong" ? " solo__feedback--error" : ""
            }`}
          >
            {feedback === "correct" && t("correct")}
            {feedback === "wrong" && t("wrongExpected", { target, morse: targetMorse })}
          </div>

          {feedback && (
            <button className="btn btn--primary" onClick={() => newTarget()}>
              {t("next")}
            </button>
          )}
        </div>

        <div className="solo__stats">
          <div className="statTile">
            <div className="statTile__value">{stats.correct}</div>
            <div className="statTile__label">{t("statCorrect")}</div>
          </div>
          <div className="statTile">
            <div className="statTile__value">{stats.wrong}</div>
            <div className="statTile__label">{t("statWrong")}</div>
          </div>
          <div className="statTile">
            <div className="statTile__value">{accuracy}%</div>
            <div className="statTile__label">{t("statAccuracy")}</div>
          </div>
          <div className="statTile">
            <div className="statTile__value">{avgReaction || "–"}</div>
            <div className="statTile__label">{t("statReaction")}</div>
          </div>
        </div>
        <div className="display__label">
          {settings.adaptive
            ? t("timingRatio")
            : t("timingFixed", {
                dash: settings.dashThresholdMs,
                letter: settings.letterGapMs,
                word: settings.wordGapMs,
              })}
          {" · "}
          <button className="linkButton" onClick={() => setSettingsOpen(true)}>
            {t("adjust")}
          </button>
        </div>

        <div className="morseButtonWrap">
          <MorseButton pressed={pressed} {...handlers} disabled={level === 3 && !playedBack} />
          <span className="morseButton__hint">{t("holdHint")}</span>
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
