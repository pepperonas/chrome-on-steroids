# Quick Start Guide

## Installation in 5 Minuten

### 1. Dependencies installieren

```bash
npm install
```

### 2. Extension bauen

```bash
npm run build
```

### 3. Icons erstellen (optional)

Die Extension benötigt Icons. Du kannst:
- Platzhalter-Icons verwenden (Extension funktioniert auch ohne)
- Eigene Icons erstellen und in `icons/` ablegen:
  - `icon16.png` (16x16px)
  - `icon48.png` (48x48px)
  - `icon128.png` (128x128px)

### 4. Extension in Chrome laden

**Option A: Automatisch (macOS/Linux)**
```bash
npm run install-extension
```

**Option B: Manuell**
1. Öffne Chrome: `chrome://extensions/`
2. Aktiviere "Entwicklermodus" (oben rechts)
3. Klicke "Entpackte Erweiterung laden"
4. Wähle den `dist` Ordner

### 5. Konfiguration

1. Klicke auf das Extension-Icon in der Chrome-Toolbar
2. Wähle deinen AI-Provider (ChatGPT oder Claude)
3. Füge deinen API Key ein und klicke "Validieren"
4. Fülle dein Profil aus:
   - Name *
   - E-Mail *
   - Skills (kommagetrennt) *
   - Erfahrung *
   - Optional: Telefon, Persönliche Intro
5. Klicke "Speichern"

### 6. Verwendung

1. Gehe zu einer Projektseite auf freelancermap.de
2. Klicke auf den blauen Floating Action Button (unten rechts)
3. Klicke "Anschreiben generieren"
4. Das generierte Anschreiben wird automatisch eingefügt

## Entwicklung

### Watch-Modus

```bash
npm run dev
```

Änderungen werden automatisch neu kompiliert.

### Tests

```bash
npm test              # Einmalig
npm run test:watch    # Watch-Modus
npm run test:coverage # Mit Coverage Report
```

### Code-Qualität

```bash
npm run lint          # Linting
npm run type-check    # TypeScript Type Checking
```

## Troubleshooting

### Extension lädt nicht
- Prüfe ob `dist` Ordner existiert
- Führe `npm run build` aus
- Prüfe Browser-Konsole auf Fehler

### API-Fehler

#### ChatGPT API Key
- **Format:** Muss mit `sk-` beginnen
- Prüfe ob API Key korrekt kopiert wurde (keine Leerzeichen)
- Prüfe Browser-Konsole (F12 → Console) für detaillierte Fehlermeldungen

#### Claude API Key
- **Format:** Muss mit `sk-ant-` oder `sk-ant-api03-` beginnen
- **Wichtig:** Die Extension verwendet den Background Service Worker für Claude API-Anfragen
- **Häufige Probleme:**
  - **401 Unauthorized**: API Key ist ungültig oder falsch kopiert
    - Lösung: Prüfe den Key, entferne Leerzeichen, generiere neuen Key falls nötig
  - **403 Forbidden**: API Key hat keine Berechtigung
    - Lösung: Prüfe die API Key-Berechtigungen auf console.anthropic.com
  - **400 Bad Request**: Request-Format ist falsch
    - Lösung: Extension sollte automatisch funktionieren, prüfe Browser-Konsole
  - **CORS Error**: Wird automatisch über Background Service Worker umgangen
    - Lösung: Extension neu laden (`chrome://extensions/` → Aktualisieren)

**Debugging:**
1. Öffne Browser-Konsole (F12 → Console)
2. Suche nach Fehlermeldungen mit `[Chrome On Steroids]`
3. Die Fehlermeldungen zeigen das genaue Problem
4. Prüfe auch den Background Service Worker (Extension-Seite → Service Worker → Inspect)

### Anschreiben wird nicht eingefügt
- Prüfe ob du auf einer Projektseite bist (`freelancermap.de/projekt/...`)
- Prüfe ob der Bewerbungsdialog geöffnet ist (Button "Bewerben" geklickt)
- Prüfe ob der "Chrome On Steroids" Button erscheint (sollte automatisch neben "Text generieren" erscheinen)
- Öffne Browser-Konsole (F12) für Debug-Informationen

### Button erscheint nicht
- Prüfe ob du auf einer Projektseite bist
- Prüfe ob der Bewerbungsdialog geöffnet ist
- Prüfe Browser-Konsole für Fehlermeldungen
- Extension neu laden (`chrome://extensions/` → Aktualisieren)

## Support

Bei Fragen oder Problemen:
- GitHub Issues: [GitHub Repository]
- Email: [Deine Email]

