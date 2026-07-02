# MorseRoom

Eine minimalistische Morse-Lern- und Kommunikations-App. Übe alleine oder
morse live mit einer anderen Person über einen zufälligen Roomcode – ganz
ohne Account, ohne Datenbank, ohne Cloud.

Die App soll sich auf dem Handy wie ein kleines echtes Morsegerät anfühlen:
eine große Taste unten mittig, kein versehentliches Zoomen, kein
Doppeltipp-Zoom, keine störenden Browser-Gesten.

## Features

- **Solo-Lernmodus**: Buchstaben, Wörter, Zahlen, SOS oder eigener Text üben,
  mit 3 Leveln (Ziel+Code sichtbar → nur Ziel sichtbar → Ton/Licht nachmorsen)
  und Statistik (Trefferquote, Fehler, Ø Reaktionszeit).
- **Live-Rooms**: Zufälliger, WhatsApp-tauglicher 6-stelliger Roomcode
  (z. B. `K7M2Q9`), Beitritt per Code oder direktem Link
  (`/room/K7M2Q9`), Teilen per WhatsApp-Button, Code/Link kopieren.
- **Echtzeit-Morsen** über Socket.IO: nicht nur der fertige Text, sondern
  auch das rohe Signal (`signal:start`/`signal:end`) wird live übertragen –
  die Gegenseite erlebt Ton und Bildschirm-Blitz in Echtzeit, so lange die
  Taste gehalten wird.
- **Asynchron möglich**: Die aktuelle Nachricht jeder Person wird im Room
  gehalten und auch später Beitretenden angezeigt – man muss nicht
  gleichzeitig online sein. Kein durchlaufender Chatverlauf, sondern die
  jeweils stehende Nachricht, bis die Person sie ersetzt oder verwirft.
- **Adaptives Timing (optional)**: „Zeiten aus – nur Verhältnis" dekodiert
  rein nach Morse-Proportionen (Strich = 3× Punkt) und passt sich dem Tempo
  an, statt an feste Millisekunden gebunden zu sein.
- **Drei Anzeige-Modi**: Alles sichtbar, Lernmodus (Morsecode verborgen) und
  Blindmodus (nur Ton/Licht, Auflösen erst auf Wunsch) – zum echten Hören/
  Sehen-Lernen statt Ablesen.
- **Einstellbares Timing**: Strich-Grenze, Buchstaben-/Wortpause und
  Mindestlänge für gültige Taps sind in den Einstellungen frei einstellbar.
- **Alles lokal gespeichert**: Anzeigename, letzter Roomcode und alle
  Einstellungen liegen im `localStorage` des Browsers.
- **PWA**: installierbar auf dem Homescreen, dunkles Theme, eigenes Manifest.
- **Touch-/Zoom-Sperre**: kein Doppeltipp-Zoom, kein Pinch-Zoom, kein
  Kontextmenü, kein Markieren, kein Pull-to-Refresh im Morse-Bereich.

## Projektstruktur

```
/morseroom
  /client   React + Vite + TypeScript (PWA-Frontend)
  /server   Node.js + Express + Socket.IO (Realtime-Backend)
  /shared   Framework-unabhängige Morse-Logik (auch für ESP32/CLI nutzbar)
  README.md
```

Die Morse-Logik (`shared/src`) ist bewusst UI-frei gehalten:

- `morseTable.ts` – Buchstaben/Zahlen ↔ Morsecode-Tabelle
- `encode.ts` – Text → Morsecode
- `decode.ts` – Morsecode → Text
- `timing.ts` – Klassifiziert Druckdauern (Punkt/Strich) und erkennt
  Buchstaben-/Wortpausen (`MorseInputEngine`)
- `types.ts` – gemeinsame TypeScript-Typen inkl. aller Socket.IO-Events

Sowohl `client` als auch `server` importieren diese Dateien direkt
(kein separater Build-Schritt nötig – `tsx` bzw. Vite transpilieren TS
zur Laufzeit).

## Installation & lokale Entwicklung

Voraussetzung: Node.js ≥ 18.

**Terminal 1 – Server:**

```bash
cd server
npm install
npm run dev
```

Der Server läuft auf `http://localhost:4000` (Health-Check: `/health`).

**Terminal 2 – Client:**

```bash
cd client
npm install
npm run dev
```

Der Client läuft auf `http://localhost:5173`.

### Ausprobieren mit zwei Browserfenstern

1. Browser-Fenster 1 öffnen: `http://localhost:5173`
2. „Room erstellen" klicken → du landest auf `/room/ABC123` mit deinem
   zufälligen Roomcode.
3. Roomcode kopieren (Button „Roomcode kopieren") oder Link kopieren.
4. Browser-Fenster 2 öffnen: `http://localhost:5173`
5. Roomcode eingeben → „Beitreten". Alternativ direkt den kopierten Link
   öffnen (`http://localhost:5173/room/ABC123`) – das funktioniert lokal
   genauso wie später mit der echten Domain.
6. In Fenster 1 die MORSE-Taste gedrückt halten und loslassen → in Fenster 2
   erscheint sofort das Live-Signal (Ton/Blitz), danach der dekodierte
   Buchstabe/Morsecode.

### Roomcode per WhatsApp teilen

Im Room-Screen öffnet der Button „Per WhatsApp teilen" eine
`wa.me`-Share-URL mit vorausgefülltem Text („Komm in meinen MorseRoom:
ABC123" + Link). Zusätzlich gibt es separate Buttons zum Kopieren von Link
und Roomcode.

## PWA-Hinweise

- `client/index.html` setzt den Viewport mit `maximum-scale=1,
  user-scalable=no, viewport-fit=cover`.
- `client/public/manifest.json` definiert Name, Icons, `display: standalone`
  und die dunklen Theme-/Hintergrundfarben.
- Ein minimaler Service Worker (`client/public/sw.js`) cached das App-Shell
  für Offline-/Installierbarkeit. Der Echtzeit-Datenverkehr (Socket.IO) läuft
  immer live über das Netzwerk.
- Auf dem Handy: über „Zum Home-Bildschirm hinzufügen" (iOS Safari) bzw.
  „App installieren" (Android Chrome) installierbar.

## Touch-/Zoom-Sperre

Im gesamten Morse-Bereich sind folgende Browser-Gesten bewusst deaktiviert:

- Doppeltipp-Zoom & Pinch-Zoom (`touch-action`, `user-scalable=no`)
- Textauswahl (`user-select: none`, `-webkit-user-select: none`)
- Kontextmenü bei langem Drücken (`onContextMenu` → `preventDefault`)
- Tap-Highlight (`-webkit-tap-highlight-color: transparent`)
- Pull-to-Refresh/Scroll-Bounce (`overscroll-behavior: none`)
- Multi-Touch-Auslösung: nur der erste aktive Pointer steuert das Signal,
  alle weiteren Touches werden ignoriert (siehe `useMorseInput.ts`)

Die Morse-Taste nutzt **Pointer Events** (`pointerdown/up/cancel/leave`)
statt reiner Maus-/Touch-Events, damit Touch, Maus und Pen identisch
funktionieren. Auf dem Desktop steuert zusätzlich die **Leertaste**
(gedrückt halten) die Morse-Taste.

## Architektur

- **Client** (`client/src`): React-Router mit drei Screens (`HomePage`,
  `RoomPage`, `SoloPage`). `RoomPage` verbindet `useSocketRoom` (Socket.IO-
  Verbindung & Events), `useMorseInput` (Press/Release → Morse-Symbole) und
  `useMorseTone` (Web Audio) miteinander. Einstellungen liegen in einem
  React-Context (`SettingsContext`) über `useLocalSettings`.
- **Server** (`server/src`): Express liefert nur `/health`, die eigentliche
  Logik läuft über Socket.IO. `rooms.ts` verwaltet Rooms **rein im
  Server-RAM** (`Map`) – kein Datenbankzugriff. Roomcodes werden aus einem
  Alphabet ohne verwechselbare Zeichen (`0/O`, `1/I/L` ausgeschlossen)
  generiert.
- **Shared** (`shared/src`): reine Funktionen/Typen ohne Browser- oder
  Node-Abhängigkeiten – lauffähig überall, wo JavaScript/TypeScript läuft.

### Socket.IO-Events

**Client → Server**

```
room:create          { name }                          → RoomCreateResult
room:join             { code, name }                    → RoomJoinResult
signal:start
signal:end             { durationMs, symbol }
morse:symbol          { symbol }
morse:letter           { morse, letter }
morse:wordGap
morse:clear                                             (aktuelle Nachricht verwerfen)
user:updateSettings  { name }
```

**Server → Client**

```
room:created / room:joined   RoomState (inkl. users + gehaltene messages)
room:error                     { message }
user:joined / user:left        { user } / { userId }
signal:start / signal:end      { userId, ... }
morse:symbol / morse:letter / morse:wordGap   { userId, ... }
room:message                   RoomMessage (autoritative gehaltene Nachricht)
room:users                     RoomState
```

Die **live** übertragenen Events (`signal:*`, `morse:symbol`) sorgen für das
Echtzeit-Gefühl (Ton/Blitz, Punkte/Striche im Entstehen). Die eigentliche
Nachricht (Text + Morsecode) ist dagegen **server-autoritativ**: der Server
hängt sie pro Autor:in an und schickt sie als `room:message` an alle – auch an
später Beitretende. So funktioniert die Kommunikation asynchron.

## Morse-Logik

Unterstützt werden A–Z, 0–9, `.`, `,`, `?`, `/`. Buchstaben werden durch
Leerzeichen getrennt, Wörter durch ` / `:

```
SOS           = ... --- ...
HALLO WELT    = .... .- .-.. .-.. --- / .-- . .-.. -
```

Standard-Timing (in den Einstellungen änderbar):

| Parameter                     | Standard |
| ------------------------------ | -------- |
| Taps ignorieren unter          | 40 ms    |
| Strich ab                      | 350 ms   |
| Buchstabenpause ab             | 700 ms   |
| Wortpause ab                   | 1400 ms  |

Die Klassifizierung (Punkt/Strich) und Pausenerkennung
(Buchstabe/Wort fertig) übernimmt `MorseInputEngine` in
`shared/src/timing.ts` – dieselbe Logik läuft im Browser (Client) und
könnte unverändert auf einem Node-Server oder in einer JS-Laufzeit auf
einem Mikrocontroller laufen.

## Datenschutz

- Keine Accounts, keine Registrierung, keine Cloud-Datenbank.
- Räume existieren nur flüchtig im **Arbeitsspeicher** des Servers (keine
  Datenbank, keine Festplatte) und sind nach einem Server-Neustart weg.
- **Asynchrones Halten**: Damit beide Seiten nicht gleichzeitig online sein
  müssen, wird die jeweils *aktuelle* Nachricht pro Person im Room gehalten
  und späteren Beitretenden angezeigt. Dazu bleibt ein Room mit seinen
  aktuellen Nachrichten nach dem Verlassen der letzten Person noch bis zu
  **6 Stunden** im Speicher und wird dann automatisch gelöscht (inaktive
  Rooms spätestens nach 24 h). Es gibt keine dauerhafte Speicherung und
  keinen durchsuchbaren Verlauf – jede Person kann ihre gehaltene Nachricht
  jederzeit über „🗑 Neue Nachricht" verwerfen.
- Anzeigename, letzter Roomcode und alle Einstellungen liegen ausschließlich
  lokal im Browser (`localStorage`) – über „Lokalen Verlauf löschen" in den
  Einstellungen jederzeit entfernbar.
- **Wichtig**: Es gibt **keine Ende-zu-Ende-Verschlüsselung**. Der Server
  verarbeitet die Events (Signale, Symbole, Buchstaben) aktiv, um sie
  weiterzuleiten und die aktuelle Nachricht zu halten – er kann sie daher
  technisch mitlesen. Für vertrauliche Inhalte ist das relevant.

## ESP32-Ausblick

Die Webapp nutzt bewusst dieselben, minimalen Events, die später auch ein
Hardware-Client (z. B. ein ESP32) sprechen könnte:

```
signal:start
signal:end
morse:symbol
morse:letter
morse:wordGap
```

Geplante Hardware für eine spätere Version:

- ESP32-S3 als Steuerung
- OLED-Display für empfangenen Text/Morsecode
- großer physischer Taster
- LED für den Lichtmodus
- Piezo-Buzzer für den Ton
- LiPo-Akku
- 3D-gedrucktes Gehäuse

Ein ESP32 müsste sich lediglich per WebSocket (Socket.IO-kompatibler
Client, z. B. `arduinoWebSockets` + Socket.IO-Protokoll, oder ein simpler
roher WebSocket-Adapter auf Serverseite) mit demselben Roomcode verbinden
und dieselben Events senden/empfangen wie die Webapp. Die Morse-Logik aus
`shared/src/timing.ts` dient dabei als Referenzimplementierung für die
Firmware. In dieser Version wird noch keine ESP32-Firmware ausgeliefert.

## Sicherheit & Limits

Der Server ist bewusst schlank, aber für den öffentlichen Betrieb gehärtet.
Alle Grenzwerte stehen in `server/src/rooms.ts` bzw. `server/src/index.ts`:

- **Eingabevalidierung**: Jede Socket-Nachricht wird geprüft (Symbol nur
  `.`/`-`, Morsecode nur aus `.`/`-`, Längen begrenzt, Steuerzeichen entfernt).
  Ungültige Events werden verworfen. React escaped die Ausgabe zusätzlich.
- **Rate-Limiting**: Pro Verbindung ein Token-Bucket (Dauerlast ~60 Events/s,
  Burst 120) gegen Flooding.
- **Grenzwerte**: max. 8 Personen/Room, max. 10 000 Rooms gleichzeitig,
  max. 16 gehaltene Nachrichten/Room, begrenzte Nachrichtenlänge,
  `maxHttpBufferSize` von 8 KB.
- **Aufräumen**: Leere Rooms werden nach 6 h, inaktive nach 24 h automatisch
  entfernt (periodischer Sweep + beim Anlegen).
- **Header**: `X-Content-Type-Options`, `X-Frame-Options: DENY`,
  `Referrer-Policy: no-referrer`, restriktive `Permissions-Policy`;
  `x-powered-by` ist aus. Eine CSP setzt man am besten im Reverse-Proxy.
- **Graceful Shutdown** auf `SIGTERM`/`SIGINT` für saubere Deployments.

Es gibt weiterhin keine Ende-zu-Ende-Verschlüsselung (siehe „Datenschutz").

## Deployment

Für den produktiven Betrieb (z. B. unter einer eigenen Subdomain):

- `client` wird mit `npm run build` zu statischen Dateien gebaut
  (`client/dist`) und kann von jedem Webserver/CDN ausgeliefert werden.
- `server` läuft dauerhaft als Node-Prozess (`npm run build && npm start`)
  und muss per WebSocket erreichbar sein (Reverse-Proxy mit
  WebSocket-Upgrade-Unterstützung, z. B. nginx oder Caddy).

### Umgebungsvariablen

Siehe `client/.env.example` und `server/.env.example`.

| Variable          | Ort    | Default                        | Zweck                                              |
| ----------------- | ------ | ------------------------------ | -------------------------------------------------- |
| `VITE_SERVER_URL` | client | gleiche Origin (prod)          | URL des Socket.IO-Servers (Build-Zeit)             |
| `VITE_GITHUB_URL` | client | Upstream-Repo                  | Ziel des „Open Source"-Links auf der Startseite    |
| `PORT`            | server | `4000`                         | Listen-Port                                        |
| `CLIENT_ORIGIN`   | server | `http://localhost:5173`        | Erlaubte Origins (kommagetrennt) – `*` erlaubt alle |
| `NODE_ENV`        | server | –                              | `production` liefert zusätzlich `client/dist` aus   |

Beim Fork genügt es, `VITE_GITHUB_URL` auf das eigene Repo zu setzen und
`CLIENT_ORIGIN` auf die eigene Domain zu pinnen.

## Lizenz

MIT – siehe [`LICENSE`](./LICENSE). Der Platzhalter „MorseRoom contributors"
kann durch den eigenen Namen/die eigene Organisation ersetzt werden.
