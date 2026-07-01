import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSettings } from "../context/SettingsContext";

export function HomePage() {
  const navigate = useNavigate();
  const { lastRoomCode } = useSettings();
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
          <p className="home__subtitle">Morsen lernen. Live morsen. Ganz ohne Account.</p>
        </div>

        <div className="home__actions">
          <button className="btn btn--primary" onClick={() => navigate("/solo")}>
            Solo üben
          </button>
          <button className="btn" onClick={() => navigate("/room/new")}>
            Room erstellen
          </button>

          <div className="home__divider">oder beitreten</div>

          <div className="home__joinRow">
            <input
              className="input"
              placeholder="ROOMCODE"
              value={joinCode}
              maxLength={6}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleJoin();
              }}
            />
            <button className="btn" onClick={handleJoin}>
              Beitreten
            </button>
          </div>

          {lastRoomCode && (
            <button className="btn btn--ghost" onClick={() => navigate(`/room/${lastRoomCode}`)}>
              Zuletzt genutzt: {lastRoomCode}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
