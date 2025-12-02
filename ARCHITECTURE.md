# Chrome On Steroids - Modulare Architektur

## 🏗️ Übersicht

Chrome On Steroids ist jetzt modular aufgebaut und unterstützt mehrere Plattformen:

- **FreelancerMap**: Automatische Bewerbungsanschreiben
- **Kleinanzeigen**: Automatische Kaufanfragen mit Preisvorschlag

## 📁 Projektstruktur

```
src/
├── modules/                      # Plattform-spezifische Module
│   ├── freelancermap/
│   │   ├── models/              # FreelancerProject
│   │   ├── services/            # FreelancerMapDOMService
│   │   ├── controllers/         # FreelancerMapController
│   │   └── content-script.ts    # Content Script für FreelancerMap
│   └── kleinanzeigen/
│       ├── models/              # KleinanzeigenProduct, KleinanzeigenSettings
│       ├── services/            # KleinanzeigenDOMService, MessageGenerator
│       ├── controllers/         # (zukünftig)
│       └── content-script.ts    # Content Script für Kleinanzeigen
├── shared/                       # Gemeinsame Services & Modelle
│   ├── services/                # AIService, StorageService, LoggingService
│   ├── models/                  # ApiConfig, UserProfile, GenerationLog
│   └── utils/                   # Logger, Constants, Validators
├── content/
│   └── content-router.ts        # Routing-Logik (lädt passendes Modul)
├── popup/
│   ├── popup.html               # Dashboard UI
│   ├── popup.ts                 # Haupt-Controller
│   ├── popup-extended.ts        # Kleinanzeigen-Extension
│   └── popup.css
└── background/
    └── service-worker.ts        # Background Service Worker
```

## 🔄 Content Script Routing

Der `content-router.ts` entscheidet basierend auf der URL, welches Modul geladen wird:

```typescript
// FreelancerMap
if (hostname.includes('freelancermap.de')) {
  loadFreelancerMapModule();
}

// Kleinanzeigen
if (hostname.includes('kleinanzeigen.de') && pathname.includes('/s-anzeige/')) {
  loadKleinanzeigenModule();
}
```

## 📦 Module

### FreelancerMap Modul

**Funktionalität:**
- Erkennt Bewerbungsmodale und Inline-Formulare
- Extrahiert Projektdaten (Titel, Beschreibung, Skills, etc.)
- Generiert KI-basierte Anschreiben mit ChatGPT oder Claude
- Fügt Anschreiben React-kompatibel ein

**Hauptdateien:**
- `FreelancerMapDOMService`: DOM-Manipulation & Datenextraktion
- `FreelancerMapController`: Orchestriert Generierung
- `content-script.ts`: Button-Platzierung & UI-Logik

### Kleinanzeigen Modul

**Funktionalität:**
- Erkennt Produktseiten auf kleinanzeigen.de
- Extrahiert Produktdaten (Titel, Preis, Verkäufer, etc.)
- Generiert Kaufanfragen mit konfigurierbarem Preisvorschlag
- Öffnet Kontaktformular und fügt Nachricht ein

**Hauptdateien:**
- `KleinanzeigenDOMService`: DOM-Manipulation & Datenextraktion
- `MessageGenerator`: Generiert Kaufanfrage-Nachrichten
- `content-script.ts`: Button-Platzierung & Workflow

**Einstellungen:**
- Rabatt-Typ: Prozent (%) oder Festbetrag (€)
- Rabatt-Wert: z.B. 10 für 10% oder 50 für 50€
- Nachrichtenvorlage (optional): Custom Template mit Platzhaltern

**Platzhalter:**
- `{title}`: Produkttitel
- `{price}`: Original-Preis
- `{discounted_price}`: Preis nach Rabatt
- `{seller}`: Verkäufer-Name
- `{location}`: Standort

## 🎨 Popup Dashboard

Das Popup wurde erweitert für beide Module:

**FreelancerMap-Einstellungen:**
- KI-Provider (ChatGPT / Claude)
- API Keys & Modelle
- Benutzerprofil (Name, Skills, Erfahrung, Portfolio)
- Generierungs-Logs

**Kleinanzeigen-Einstellungen:**
- Rabatt-Typ (Prozent / Festbetrag)
- Rabatt-Wert
- Nachrichtenvorlage (optional)

## 🔧 Shared Services

### AIService (Abstract)
- Basis-Klasse für AI-Provider
- `generateCoverLetter()`: Generiert Anschreiben
- `validateApiKey()`: Validiert API Keys
- `buildPrompt()`: Erstellt Prompts

### StorageService
- `save()`: Speichert Daten in Chrome Storage
- `load()`: Lädt Daten aus Chrome Storage
- `remove()`: Löscht Daten

### LoggingService
- `saveLog()`: Speichert Generierungs-Logs
- `loadLogs()`: Lädt alle Logs
- `exportLogs()`: Exportiert Logs als JSON
- `clearLogs()`: Löscht alle Logs

## 🚀 Neues Modul hinzufügen

1. **Erstelle Modul-Ordner:**
   ```
   src/modules/neue-plattform/
   ├── models/
   ├── services/
   ├── controllers/
   └── content-script.ts
   ```

2. **Erstelle Models:**
   ```typescript
   export interface NeuePlattformData {
     id: string;
     title: string;
     // ...
   }
   ```

3. **Erstelle DOMService:**
   ```typescript
   export class NeuePlattformDOMService {
     static isNeuePlattformPage(): boolean { ... }
     static extractData(): NeuePlattformData | null { ... }
   }
   ```

4. **Erstelle Content Script:**
   ```typescript
   class NeuePlattformContentScript {
     // Button-Platzierung & Logik
   }
   new NeuePlattformContentScript();
   ```

5. **Erweitere Content Router:**
   ```typescript
   if (hostname.includes('neue-plattform.de')) {
     this.loadNeuePlattformModule();
   }
   ```

6. **Erweitere Popup (optional):**
   - Füge Einstellungen in `popup.html` hinzu
   - Erstelle `popup-neue-plattform.ts` Extension
   - Integriere in `popup.ts`

7. **Update Manifest:**
   ```json
   "host_permissions": [
     "https://www.neue-plattform.de/*"
   ],
   "content_scripts": [
     {
       "matches": ["https://www.neue-plattform.de/*"]
     }
   ]
   ```

## 📊 Datenfluss

### FreelancerMap:
```
User klickt "Chrome On Steroids" Button
  → FreelancerMapController.generateAndInsertApplication()
  → FreelancerMapDOMService.extractProjectData()
  → StorageService.load(UserProfile)
  → AIService.generateCoverLetter()
  → FreelancerMapDOMService.insertCoverLetter()
  → LoggingService.saveLog()
```

### Kleinanzeigen:
```
User klickt "Chrome On Steroids Kaufanfrage" Button
  → KleinanzeigenDOMService.extractProductData()
  → StorageService.load(KleinanzeigenSettings)
  → MessageGenerator.generatePurchaseMessage()
  → KleinanzeigenDOMService.openContactForm()
  → KleinanzeigenDOMService.insertMessage()
```

## 🧪 Testing

### FreelancerMap testen:
1. Gehe zu `https://www.freelancermap.de/projektboerse.html`
2. Klicke auf ein Projekt → "Bewerben"
3. Button "Chrome On Steroids" sollte neben "Text generieren" erscheinen
4. Klicke "Chrome On Steroids" → Anschreiben wird generiert

### Kleinanzeigen testen:
1. Gehe zu einer Produktseite: `https://www.kleinanzeigen.de/s-anzeige/...`
2. Button "Chrome On Steroids Kaufanfrage" sollte unter "Nachricht schreiben" erscheinen
3. Konfiguriere Rabatt im Popup (z.B. 10%)
4. Klicke "Chrome On Steroids Kaufanfrage" → Nachricht wird generiert

## 🔐 Storage Keys

```typescript
// FreelancerMap
'api_config': ApiConfig
'user_profile': UserProfile
'generation_logs': GenerationLog[]

// Kleinanzeigen
'kleinanzeigen_settings': KleinanzeigenSettings
```

## 📝 Logging

Alle Generierungen werden automatisch geloggt:
- Timestamp
- Provider (ChatGPT / Claude)
- Projekt-/Produktdaten
- Prompt & generierter Text
- Performance (Zeit, Erfolg)
- Fehler (falls vorhanden)

Logs können exportiert werden für Optimierung.

## 🎯 Vorteile der modularen Architektur

✅ **Skalierbar**: Neue Plattformen einfach hinzufügen  
✅ **Wartbar**: Jedes Modul ist unabhängig  
✅ **Testbar**: Module können isoliert getestet werden  
✅ **Wiederverwendbar**: Shared Services für alle Module  
✅ **Übersichtlich**: Klare Trennung der Verantwortlichkeiten  

## 🔄 Migration von altem Code

Der alte Code wurde wie folgt migriert:

- `src/services/*` → `src/shared/services/*`
- `src/models/*` → `src/shared/models/*`
- `src/utils/*` → `src/shared/utils/*`
- `src/content/content-script.ts` → `src/modules/freelancermap/content-script.ts`
- `src/controllers/ApplicationController.ts` → `src/modules/freelancermap/controllers/FreelancerMapController.ts`
- `src/services/DOMService.ts` → `src/modules/freelancermap/services/FreelancerMapDOMService.ts`

## 📚 Weitere Dokumentation

- [README.md](README.md): Allgemeine Übersicht & Installation
- [OPTIMIZATION_SUMMARY.md](OPTIMIZATION_SUMMARY.md): Prompt-Optimierungen für FreelancerMap

