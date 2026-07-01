import { Routes, Route } from "react-router-dom";
import { SettingsProvider } from "./context/SettingsContext";
import { HomePage } from "./pages/HomePage";
import { RoomPage } from "./pages/RoomPage";
import { SoloPage } from "./pages/SoloPage";

export default function App() {
  return (
    <SettingsProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/room/:code" element={<RoomPage />} />
        <Route path="/solo" element={<SoloPage />} />
      </Routes>
    </SettingsProvider>
  );
}
