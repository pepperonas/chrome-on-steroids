# ApplyAI - AI Bewerbungsassistent

Chrome Extension für automatische Generierung von Bewerbungsanschreiben auf freelancermap.de

## Features

### 🤖 KI-Integration
- ✅ Unterstützung für **ChatGPT** (OpenAI) und **Claude** (Anthropic)
- ✅ Separate API Keys für beide Provider
- ✅ Automatisches Modell-Fallback bei API-Fehlern
- ✅ Optimierte Prompts mit Anti-Hallucination-Regeln

### 🎯 Smart Button Placement
- ✅ **Projektdetailseiten**: Button neben "Text generieren" im Formular
- ✅ **Projektlisten**: Button neben "Text generieren" im Modal
- ✅ Automatische Erkennung des Kontexts
- ✅ Keine React-Konflikte (saubere DOM-Manipulation)

### 📝 Intelligente Anschreiben-Generierung
- ✅ Automatisches Skill-Matching zwischen Projekt und Profil
- ✅ Validierung gegen erfundene Inhalte
- ✅ Strukturierte Anschreiben (Anrede, Hook, Erfahrung, Mehrwert, CTA, Portfolio, Verabschiedung)
- ✅ Portfolio-Projekte optional einfügbar
- ✅ Markdown-Bereinigung und Post-Processing

### 📊 Logging & Export
- ✅ Automatisches Logging aller Generierungen
- ✅ Export/Import von Einstellungen als JSON
- ✅ Export von Generierungs-Logs
- ✅ Live-Statistiken (Erfolgsrate, Durchschnittszeit)

### 🛠️ Technisch
- ✅ TypeScript mit SOLID-Prinzipien
- ✅ Webpack für optimales Bundling
- ✅ Automatische Versionierung (Patch-Increment)
- ✅ Chrome Storage API für Settings
- ✅ Umfassende Fehlerbehandlung

## Installation

### Entwicklung

1. Repository klonen:

```bash
git clone https://github.com/pepperonas/apply-ai.git
cd apply-ai
```

2. Dependencies installieren:

```bash
npm install
```

3. Extension bauen:

```bash
npm run build
```

4. In Chrome laden:

   - Öffne `chrome://extensions/`
   - Aktiviere "Entwicklermodus"
   - Klicke "Entpackte Erweiterung laden"
   - Wähle den `dist` Ordner

### Produktion

```bash
npm run build
```

Die Extension ist dann im `dist` Ordner bereit für die Distribution.

## Verwendung

### 1. Konfiguration

#### AI-Provider einrichten:
1. Klicke auf das Extension-Icon in der Chrome-Toolbar
2. **Wähle den Provider-Tab** (ChatGPT oder Claude)
3. Gib deinen API Key ein
4. Klicke auf **"Validieren"** um den Key zu testen
5. Wähle das gewünschte **Modell** aus der Dropdown-Liste
6. Klicke auf **"Speichern"**

**Wichtig:** Der **aktive Provider** (oben rechts angezeigt als "Aktiv: ...") wird erst nach dem **Speichern** gewechselt!

#### Profil einrichten:
1. Fülle dein Profil aus:
   - **Name** (Pflicht)
   - **E-Mail** (Pflicht)
   - **Telefon** (optional)
   - **Skills** - kommagetrennt (Pflicht)
     - Beispiel: `Java, Spring Boot, React, TypeScript, MySQL`
   - **Berufserfahrung** (Pflicht)
     - Detaillierte Beschreibung deiner Erfahrung
     - Firmen, Rollen, Technologien, Zeiträume
   - **Persönliche Intro** (optional)
     - Individueller Einleitungstext für Bewerbungen
   - **Portfolio-Projekte** (optional) ⭐ NEU
     - Format: `- projektname.de - Beschreibung (Technologien)`
     - Wird vor der Verabschiedung im Anschreiben eingefügt
     - Beispiel:
       ```
       - mxster.de - Music Quiz App (React, TypeScript)
       - berlinometer.de - Berlin Events Platform
       - github.com/username/project - Beschreibung
       ```
2. Klicke auf **"Speichern"**

#### Provider wechseln:
1. Klicke auf den **anderen Provider-Tab** (z.B. Claude statt ChatGPT)
2. Gib den API Key für diesen Provider ein (falls noch nicht vorhanden)
3. Wähle das gewünschte Modell
4. **Klicke auf "Speichern"** - erst jetzt wird der Provider aktiviert!
5. Der Badge oben rechts zeigt nun den neuen Provider an

### 2. Bewerbung generieren

#### Auf Projektdetailseiten (`/projekt/*`)
1. Navigiere zu einer Projektseite auf freelancermap.de
2. Scrolle zum Bewerbungsformular (oder klicke "Bewerben")
3. Der **"ApplyAI"** Button (mit Diamant-Icon 💎) erscheint automatisch neben dem "Text generieren" Button
4. Klicke auf **"ApplyAI"** um das Anschreiben zu generieren
5. Das generierte Anschreiben wird automatisch in das Textfeld eingefügt

#### Auf Projektlisten (`/projektboerse.html`)
1. Klicke auf ein Projekt in der Liste
2. Klicke auf **"Bewerben"** im Modal-Dialog
3. Der **"ApplyAI"** Button erscheint neben dem "Text generieren" Button
4. Klicke auf **"ApplyAI"** um das Anschreiben zu generieren
5. Das generierte Anschreiben wird automatisch eingefügt

**Hinweis:** Der Button erscheint nur, wenn ein Bewerbungsformular mit Anschreiben-Feld vorhanden ist.

### 3. Einstellungen exportieren/importieren

**Export:**
1. Öffne die Extension (Klick auf das Icon)
2. Klicke auf **"Export"** (unten links)
3. Eine JSON-Datei wird heruntergeladen: `applyai-settings-YYYY-MM-DD.json`

**Import:**
1. Öffne die Extension
2. Klicke auf **"Import"** (unten links)
3. Wähle eine zuvor exportierte JSON-Datei
4. Bestätige den Import (überschreibt aktuelle Einstellungen!)
5. Alle Einstellungen werden automatisch geladen

**Was wird exportiert/importiert:**
- ✅ API Keys (ChatGPT & Claude)
- ✅ Ausgewählte Modelle
- ✅ Aktiver Provider
- ✅ Benutzerprofil (Name, E-Mail, Skills, Erfahrung, Portfolio, etc.)

**Anwendungsfälle:**
- 💾 Backup deiner Einstellungen
- 🔄 Synchronisation zwischen mehreren Geräten
- 👥 Team-Settings teilen (ohne API Keys zu teilen - einfach vorher löschen)

## AI-Provider & Modelle

### ChatGPT (OpenAI)
- **gpt-4** - Empfohlen für beste Qualität
- **gpt-4-turbo** - Schneller, kostengünstiger
- **gpt-3.5-turbo** - Am günstigsten

API Key Format: `sk-proj-...` oder `sk-...`  
Weitere Infos: https://platform.openai.com/api-keys

### Claude (Anthropic)

#### Funktionierende Modelle (getestet Dezember 2025) ⭐
- **claude-3-haiku-20240307** - ⭐ Standard, schnell & zuverlässig
- **claude-3-opus-20240229** - Höchste Qualität (Fallback)

API Key Format: `sk-ant-api03-...` oder `sk-ant-...`  
API Key erstellen: https://console.anthropic.com/

**Wichtig:** 
- Die Extension verwendet den `anthropic-dangerous-direct-browser-access` Header für Browser-Anfragen
- Automatisches Modell-Fallback: Falls ein Modell nicht verfügbar ist, wird automatisch das nächste probiert
- Bei 404-Fehlern (Modell nicht gefunden) wird automatisch ein alternatives Modell verwendet

## Entwicklung

### Befehle

- `npm run dev` - Entwicklungsmodus mit Watch
- `npm run build` - Production Build
- `npm test` - Tests ausführen
- `npm run test:watch` - Tests im Watch-Modus
- `npm run test:coverage` - Test Coverage Report
- `npm run lint` - Code linting
- `npm run type-check` - TypeScript Type Checking
- `npm run install-extension` - Extension automatisch in Chrome installieren/updaten

### Projektstruktur

```
apply-ai/
├── src/
│   ├── background/      # Service Worker
│   ├── content/         # Content Scripts
│   ├── popup/           # Extension Popup
│   ├── overlay/         # Overlay UI
│   ├── models/          # Data Models
│   ├── services/        # Business Logic
│   ├── controllers/     # MVC Controllers
│   └── utils/           # Utilities
├── tests/               # Test Files
└── dist/                # Build Output
```

## API Keys

### ChatGPT

Erstelle einen API Key auf [platform.openai.com](https://platform.openai.com/api-keys)

**Format:** `sk-...` (beginnt mit `sk-`)

### Claude

Erstelle einen API Key auf [console.anthropic.com](https://console.anthropic.com/)

**Format:** `sk-ant-...` oder `sk-ant-api03-...` (beginnt mit `sk-ant-`)

**Wichtig:** 
- Der API Key muss vollständig kopiert werden (keine Leerzeichen am Anfang/Ende)
- Die Extension verwendet direkte Browser-Anfragen mit dem `anthropic-dangerous-direct-browser-access` Header
- Automatisches Modell-Fallback bei 404-Fehlern
- Falls die Validierung fehlschlägt, prüfe die Browser-Konsole (F12 → Console) für detaillierte Fehlermeldungen

## Troubleshooting

### Claude API Key wird als ungültig erkannt

1. **Prüfe das Format:**
   - Der Key sollte mit `sk-ant-` oder `sk-ant-api03-` beginnen
   - Stelle sicher, dass der Key vollständig kopiert wurde (keine Leerzeichen)

2. **Prüfe die Browser-Konsole:**
   - Öffne die Browser-Konsole (F12 → Console)
   - Suche nach Fehlermeldungen mit `[ApplyAI]`
   - Die Fehlermeldungen zeigen das genaue Problem

3. **Häufige Fehler:**
   - **401 Unauthorized**: API Key ist ungültig oder falsch kopiert
   - **403 Forbidden**: API Key hat keine Berechtigung für die API
   - **400 Bad Request**: Request-Format ist falsch (sollte automatisch funktionieren)
   - **CORS Error**: Wird automatisch über Background Service Worker umgangen

4. **API Key neu generieren:**
   - Falls der Key nicht funktioniert, generiere einen neuen auf [console.anthropic.com](https://console.anthropic.com/)
   - Stelle sicher, dass der Key die richtigen Berechtigungen hat

5. **Extension neu laden:**
   - Gehe zu `chrome://extensions/`
   - Klicke auf "Aktualisieren" (🔄) bei der ApplyAI Extension
   - Versuche die Validierung erneut

### Button erscheint nicht

1. **Prüfe die Seite:**
   - Der Button erscheint nur auf `freelancermap.de/projekt/*` oder in Bewerbungsmodalen
   - Das Anschreiben-Textfeld muss vorhanden sein

2. **Extension-Kontext ungültig:**
   - Falls "⚠️ Seite neu laden" angezeigt wird, lade die Seite neu (F5)
   - Dies passiert, wenn die Extension während der Nutzung aktualisiert wurde

3. **Browser-Konsole prüfen:**
   - Öffne die Konsole (F12 → Console)
   - Suche nach `[ApplyAI]` Meldungen
   - Fehlermeldungen zeigen das Problem

### Portfolio wird nicht eingefügt

1. **Prüfe das Profil:**
   - Öffne die Extension (Klick auf Icon)
   - Scrolle zu "Portfolio-Projekte"
   - Stelle sicher, dass das Feld ausgefüllt ist
   - Klicke auf "Speichern"

2. **Format prüfen:**
   - Jedes Projekt in einer neuen Zeile
   - Format: `- projektname.de - Beschreibung (Technologien)`
   - Beispiel:
     ```
     - mxster.de - Music Quiz App (React, TypeScript)
     - berlinometer.de - Berlin Events Platform
     ```

3. **Generierung neu starten:**
   - Lösche das Textfeld
   - Klicke erneut auf "ApplyAI"
   - Portfolio sollte jetzt vor der Verabschiedung erscheinen

### React Error #418 (Minified)

**Problem:** Die Extension versucht, React-DOM zu manipulieren.

**Lösung:** 
- Dieser Fehler sollte nicht mehr auftreten (ab Version 0.0.48+)
- Die Extension platziert den Button nur noch neben "Text generieren", nicht mehr als Floating Button
- Falls der Fehler weiterhin auftritt:
  1. Extension neu laden (`chrome://extensions/` → 🔄)
  2. Seite neu laden (F5)
  3. Browser-Konsole prüfen und Fehler melden

### Extension Context Invalidated

**Problem:** Die Extension wurde während der Nutzung neu geladen.

**Lösung:**
- Lade die Seite neu (F5)
- Der Button zeigt "⚠️ Seite neu laden" mit Tooltip
- Nach dem Neuladen funktioniert alles wieder normal

## Lizenz

MIT License - siehe LICENSE Datei

## Author

© 2025 Martin Pfeffer | [celox.io](https://celox.io)

---

Entwickelt mit ❤️ in Berlin

