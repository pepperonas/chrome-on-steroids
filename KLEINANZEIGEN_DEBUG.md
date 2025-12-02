# Kleinanzeigen Modul - Debug Guide

## 🔍 Schritt-für-Schritt Debugging

### 1. Extension neu laden
```
1. Öffne chrome://extensions/
2. Finde "Chrome On Steroids - AI Bewerbungsassistent"
3. Klicke auf das Reload-Icon (🔄)
```

### 2. Gehe zu einer Kleinanzeigen Produktseite
Beispiel-URL:
```
https://www.kleinanzeigen.de/s-anzeige/vintage-apotheker-kommode-schubkasten-schrank-industriedesign-16-schubladen-140x100x40cm/3243531485-87-16734
```

### 3. Öffne die Browser-Konsole
```
Drücke F12 oder Rechtsklick → "Untersuchen" → Console Tab
```

### 4. Prüfe die Logs

**Erwartete Logs (in dieser Reihenfolge):**

```javascript
// 1. Content Router startet
[ContentRouter] Initializing...
[ContentRouter] Current URL: { hostname: "www.kleinanzeigen.de", pathname: "/s-anzeige/..." }

// 2. Kleinanzeigen Modul wird geladen
[ContentRouter] Loading Kleinanzeigen module
[ContentRouter] Kleinanzeigen module loaded

// 3. Content Script initialisiert
[Kleinanzeigen] Content Script initialized

// 4. Prüft ob Produktseite
[Kleinanzeigen] Checking if product page... { hostname: "www.kleinanzeigen.de", pathname: "/s-anzeige/..." }
[Kleinanzeigen] Product page detected! Creating button...

// 5. Sucht nach Contact Button
[Kleinanzeigen] Contact button found! { id: "viewad-contact-button", className: "..." }

// 6. Button wird erstellt
[Kleinanzeigen] Button created in iconlist
```

## 🐛 Mögliche Probleme & Lösungen

### Problem 1: "Not a product page"
**Symptom:**
```
[Kleinanzeigen] Not a product page
```

**Ursache:** URL enthält nicht `/s-anzeige/`

**Lösung:** Stelle sicher, dass du auf einer Produktseite bist (nicht auf der Startseite oder Suchergebnissen)

---

### Problem 2: "Contact button not found"
**Symptom:**
```
[Kleinanzeigen] Contact button not found, retrying in 1s...
```

**Ursache:** Seite noch nicht vollständig geladen oder Button hat andere ID

**Lösung:** 
1. Warte 2-3 Sekunden
2. Prüfe in der Konsole:
   ```javascript
   document.querySelector('#viewad-contact-button')
   ```
3. Wenn `null`: Prüfe HTML-Struktur der Seite

---

### Problem 3: Modul wird nicht geladen
**Symptom:**
```
[ContentRouter] No matching module for this page
```

**Ursache:** URL-Matching schlägt fehl

**Lösung:**
1. Prüfe URL in der Konsole:
   ```javascript
   console.log(window.location.hostname, window.location.pathname)
   ```
2. Sollte sein: `www.kleinanzeigen.de` und `/s-anzeige/...`

---

### Problem 4: Button erscheint nicht (trotz "Button created")
**Symptom:**
```
[Kleinanzeigen] Button created in iconlist
// Aber kein Button sichtbar
```

**Ursache:** Button wurde an falscher Stelle eingefügt oder CSS versteckt ihn

**Lösung:**
1. Prüfe in der Konsole:
   ```javascript
   document.getElementById('kleinanzeigen-ai-btn')
   ```
2. Wenn Element existiert, prüfe CSS:
   ```javascript
   const btn = document.getElementById('kleinanzeigen-ai-btn');
   console.log(btn.style.display, btn.offsetParent);
   ```
3. Prüfe Parent-Element:
   ```javascript
   console.log(btn.parentElement, btn.parentElement.parentElement);
   ```

## 🔧 Manuelle Tests

### Test 1: Modul-Loading
```javascript
// In der Konsole auf kleinanzeigen.de:
console.log('Hostname:', window.location.hostname);
console.log('Pathname:', window.location.pathname);
console.log('Includes kleinanzeigen:', window.location.hostname.includes('kleinanzeigen.de'));
console.log('Includes s-anzeige:', window.location.pathname.includes('/s-anzeige/'));
```

### Test 2: Contact Button finden
```javascript
// In der Konsole:
const btn = document.querySelector('#viewad-contact-button');
console.log('Contact Button:', btn);
console.log('Parent:', btn?.parentElement);
console.log('IconList:', btn?.closest('ul.iconlist'));
```

### Test 3: Button manuell erstellen
```javascript
// In der Konsole:
const contactBtn = document.querySelector('#viewad-contact-button');
const li = document.createElement('li');
li.innerHTML = '<button class="button-tertiary full-width taller" style="background: red;">TEST BUTTON</button>';
const iconList = contactBtn.closest('ul.iconlist');
iconList.appendChild(li);
```

## 📸 Screenshots für Debugging

### Wo der Button erscheinen sollte:

```
┌─────────────────────────────────────┐
│  [Produktbild]                      │
│                                     │
│  Produkttitel                       │
│  399 €                              │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 📧 Nachricht schreiben      │   │ ← Bestehender Button
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ 💎 Chrome On Steroids Kaufanfrage      │   │ ← UNSER Button (hier sollte er sein)
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ ❤️ Zur Merkliste hinzufügen │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

## 🚨 Wenn gar nichts funktioniert

### Vollständiger Reset:

1. **Extension deinstallieren:**
   ```
   chrome://extensions/ → Chrome On Steroids → Entfernen
   ```

2. **Neu bauen:**
   ```bash
   cd /Users/martin/cursor/chrome-on-steroids
   npm run build
   ```

3. **Neu installieren:**
   ```
   chrome://extensions/ → Entwicklermodus AN
   → "Entpackte Erweiterung laden" → dist/ Ordner wählen
   ```

4. **Seite neu laden:**
   ```
   F5 auf kleinanzeigen.de
   ```

5. **Konsole prüfen:**
   ```
   F12 → Console → Nach [Kleinanzeigen] Logs suchen
   ```

## 📞 Hilfe anfordern

Wenn der Button immer noch nicht erscheint, sende mir:

1. **Console Logs** (alle [ContentRouter] und [Kleinanzeigen] Logs)
2. **URL** der Produktseite
3. **Ergebnis von:**
   ```javascript
   document.querySelector('#viewad-contact-button')
   document.querySelector('ul.iconlist')
   ```
4. **Screenshot** der Sidebar (wo der Button sein sollte)

