import { Routes, Route } from "react-router-dom";
import { SettingsProvider } from "./context/SettingsContext";
import { I18nProvider } from "./i18n/I18nContext";
import { LanguageSwitcher } from "./components/LanguageSwitcher";
import { HomePage } from "./pages/HomePage";
import { RoomPage } from "./pages/RoomPage";
import { SoloPage } from "./pages/SoloPage";

export default function App() {
  return (
    <I18nProvider>
      <SettingsProvider>
        <LanguageSwitcher />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/room/:code" element={<RoomPage />} />
          <Route path="/solo" element={<SoloPage />} />
        </Routes>
      </SettingsProvider>
    </I18nProvider>
  );
}
