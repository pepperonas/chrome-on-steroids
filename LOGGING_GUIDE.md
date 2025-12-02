# ApplyAI - Logging & Analytics Guide

## 🎯 Zweck

Das Logging-System zeichnet **automatisch alle Parameter** jeder Anschreiben-Generierung auf. Dies ermöglicht:
- 📊 Analyse der Prompt-Effektivität
- 🔧 Optimierung der API-Parameter
- 🐛 Debugging von Fehlern
- 📈 Performance-Monitoring
- 🧪 A/B-Testing verschiedener Ansätze

---

## 📝 Was wird geloggt?

### 1. **Metadaten**
```json
{
  "timestamp": "2025-12-02T15:30:45.123Z",
  "sessionId": "session_1733151045123_abc123def"
}
```

### 2. **API-Konfiguration**
```json
{
  "provider": "claude",
  "model": "claude-3-haiku-20240307"
}
```

### 3. **Projektdaten (Input)**
```json
{
  "project": {
    "id": "react-developer-berlin",
    "title": "React Developer (m/w/d) für Startup",
    "description": "Wir suchen einen erfahrenen React Developer...",
    "company": "TechStart GmbH",
    "location": "Berlin",
    "remote": true,
    "skills": ["React", "TypeScript", "Node.js", "Docker"],
    "startDate": "01.01.2025",
    "duration": "6 Monate",
    "workload": "100%"
  }
}
```

### 4. **Benutzerprofil (Input)**
```json
{
  "userProfile": {
    "name": "Martin Pfeffer",
    "email": "martin@example.com",
    "phone": "+49 123 456789",
    "skills": ["Java", "React", "TypeScript", "Spring Boot", "Docker"],
    "experience": "10+ Jahre Full-Stack Development...",
    "customIntro": "Spezialisiert auf moderne Web-Technologien..."
  }
}
```

### 5. **Skill-Matching-Analyse**
```json
{
  "matchingSkills": ["React", "TypeScript", "Docker"],
  "otherSkills": ["Java", "Spring Boot"],
  "matchingPercentage": 75
}
```
- **matchingSkills**: Skills die sowohl im Projekt als auch im Profil vorkommen
- **otherSkills**: Skills im Profil, die nicht im Projekt gefordert sind
- **matchingPercentage**: Wie viele der Projekt-Skills werden abgedeckt?

### 6. **Generierter Prompt**
```json
{
  "prompt": {
    "fullPrompt": "# AUFGABE: Erstelle ein überzeugendes...",
    "promptLength": 2847,
    "estimatedTokens": 712
  }
}
```

### 7. **API-Parameter**
```json
{
  "apiRequest": {
    "temperature": 0.8,
    "maxTokens": 1500,
    "presencePenalty": 0.3,
    "frequencyPenalty": 0.3
  }
}
```

### 8. **Generiertes Anschreiben (Output)**
```json
{
  "coverLetter": {
    "text": "Guten Tag,\n\nich habe Ihr Projekt...",
    "length": 1234,
    "wordCount": 287,
    "hasGreeting": true,
    "hasClosing": true,
    "mentionedSkills": ["React", "TypeScript", "Docker"]
  }
}
```
- **hasGreeting**: Beginnt mit "Guten Tag", "Hallo", etc.?
- **hasClosing**: Enthält "Viele Grüße", "Beste Grüße", etc.?
- **mentionedSkills**: Welche User-Skills wurden im Anschreiben erwähnt?

### 9. **Performance-Metriken**
```json
{
  "performance": {
    "generationTimeMs": 3456,
    "modelUsed": "claude-3-haiku-20240307",
    "success": true,
    "error": null
  }
}
```

---

## 🎨 UI-Features

### Statistiken im Popup

Öffne die Extension → Scrolle zu "Generierungs-Logs":

```
┌─────────────────────────────────────┐
│ Generierungs-Logs                   │
├─────────────────────────────────────┤
│ Gesamt: 42        Erfolgreich: 40   │
│ Fehler: 2         Ø Zeit: 3200ms    │
├─────────────────────────────────────┤
│ [Logs exportieren] [Logs löschen]   │
└─────────────────────────────────────┘
```

### Buttons

**Logs exportieren:**
- Lädt alle Logs als JSON-Datei herunter
- Dateiname: `applyai-logs-2025-12-02.json`
- Format siehe unten

**Logs löschen:**
- Löscht alle gespeicherten Logs
- Bestätigungs-Dialog
- ⚠️ Nicht rückgängig machbar!

---

## 📄 Export-Format

```json
{
  "version": "1.0",
  "exportDate": "2025-12-02T15:45:00.000Z",
  "totalLogs": 42,
  "logs": [
    {
      "timestamp": "2025-12-02T15:30:45.123Z",
      "sessionId": "session_1733151045123_abc123def",
      "provider": "claude",
      "model": "claude-3-haiku-20240307",
      "project": { ... },
      "userProfile": { ... },
      "matchingSkills": [...],
      "otherSkills": [...],
      "matchingPercentage": 75,
      "prompt": { ... },
      "apiRequest": { ... },
      "coverLetter": { ... },
      "performance": { ... }
    },
    // ... weitere Logs
  ]
}
```

---

## 🔍 Analyse-Möglichkeiten

### 1. **Prompt-Optimierung**

**Frage:** Welche Prompts führen zu den besten Anschreiben?

**Analyse:**
```javascript
// Filtere erfolgreiche Generierungen
const successful = logs.filter(log => log.performance.success);

// Finde Logs mit hoher Skill-Erwähnung
const goodLogs = successful.filter(log => 
  log.coverLetter.mentionedSkills.length >= log.matchingSkills.length * 0.8
);

// Vergleiche Prompts
goodLogs.forEach(log => {
  console.log('Prompt Length:', log.prompt.promptLength);
  console.log('Mentioned Skills:', log.coverLetter.mentionedSkills.length);
  console.log('Has Greeting:', log.coverLetter.hasGreeting);
  console.log('Has Closing:', log.coverLetter.hasClosing);
});
```

### 2. **API-Parameter-Tuning**

**Frage:** Welche Temperature liefert die besten Ergebnisse?

**Analyse:**
```javascript
// Gruppiere nach Temperature
const byTemperature = {};
logs.forEach(log => {
  const temp = log.apiRequest.temperature;
  if (!byTemperature[temp]) byTemperature[temp] = [];
  byTemperature[temp].push(log);
});

// Vergleiche Durchschnittswerte
Object.keys(byTemperature).forEach(temp => {
  const logsForTemp = byTemperature[temp];
  const avgWordCount = logsForTemp.reduce((sum, log) => 
    sum + log.coverLetter.wordCount, 0
  ) / logsForTemp.length;
  
  console.log(`Temperature ${temp}: Ø ${avgWordCount} Wörter`);
});
```

### 3. **Skill-Matching-Effektivität**

**Frage:** Wie gut funktioniert das Skill-Matching?

**Analyse:**
```javascript
// Durchschnittliche Matching-Rate
const avgMatching = logs.reduce((sum, log) => 
  sum + log.matchingPercentage, 0
) / logs.length;

console.log(`Durchschnittliche Skill-Match-Rate: ${avgMatching}%`);

// Korrelation: Matching-Rate vs. erwähnte Skills
logs.forEach(log => {
  const mentionRate = (log.coverLetter.mentionedSkills.length / log.matchingSkills.length) * 100;
  console.log(`Match: ${log.matchingPercentage}% → Mentioned: ${mentionRate}%`);
});
```

### 4. **Performance-Analyse**

**Frage:** Welcher Provider/Modell ist am schnellsten?

**Analyse:**
```javascript
// Gruppiere nach Provider
const byProvider = {};
logs.forEach(log => {
  if (!byProvider[log.provider]) byProvider[log.provider] = [];
  byProvider[log.provider].push(log.performance.generationTimeMs);
});

// Durchschnittliche Zeit pro Provider
Object.keys(byProvider).forEach(provider => {
  const times = byProvider[provider];
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  console.log(`${provider}: Ø ${avg}ms`);
});
```

### 5. **Fehler-Analyse**

**Frage:** Warum schlagen Generierungen fehl?

**Analyse:**
```javascript
// Filtere Fehler
const errors = logs.filter(log => !log.performance.success);

// Gruppiere nach Fehlertyp
const errorTypes = {};
errors.forEach(log => {
  const error = log.performance.error || 'Unknown';
  errorTypes[error] = (errorTypes[error] || 0) + 1;
});

console.log('Fehlerverteilung:', errorTypes);

// Prüfe fehlende Daten
errors.forEach(log => {
  console.log('Project Data:', !!log.project);
  console.log('User Profile:', !!log.userProfile);
  console.log('Skills:', log.userProfile?.skills?.length || 0);
});
```

---

## 💡 Best Practices

### 1. **Regelmäßig exportieren**
- Exportiere Logs wöchentlich
- Speichere in einem Analytics-Ordner
- Versioniere mit Datum

### 2. **Vor großen Änderungen**
- Exportiere aktuelle Logs als Baseline
- Implementiere Änderung
- Vergleiche neue Logs mit Baseline

### 3. **A/B-Testing**
```
Woche 1: Temperature 0.7 → Export → Analyse
Woche 2: Temperature 0.8 → Export → Analyse
Woche 3: Temperature 0.9 → Export → Analyse
→ Vergleiche Ergebnisse
```

### 4. **Daten-Hygiene**
- Lösche Logs nach Analyse (spart Speicher)
- Behalte nur relevante Logs
- Exportiere vor dem Löschen

---

## 🔧 Technische Details

### Storage
- **Location:** `chrome.storage.local`
- **Key:** `generation_logs`
- **Max Logs:** 100 (automatisches Cleanup)
- **Size Limit:** ~10MB (Chrome Limit für local storage)

### Session-Tracking
```javascript
// Session-ID wird pro Browser-Session erstellt
sessionId = `session_${Date.now()}_${randomString}`;

// Gespeichert in sessionStorage
// Alle Logs einer Session haben die gleiche ID
```

### Performance
- **Logging:** Asynchron, blockiert nicht
- **Export:** Synchron, ~100ms für 100 Logs
- **Storage:** Automatisches Cleanup bei >100 Logs

---

## 📊 Beispiel-Workflow

### Szenario: Prompt-Optimierung

**Ziel:** Finde den optimalen Prompt für React-Projekte

**Schritte:**

1. **Baseline erstellen**
   ```
   - Generiere 10 Anschreiben für React-Projekte
   - Exportiere Logs: baseline-react-v1.json
   ```

2. **Prompt anpassen**
   ```
   - Ändere Prompt in src/services/AIService.ts
   - z.B. mehr Fokus auf konkrete Beispiele
   ```

3. **Neue Daten sammeln**
   ```
   - Generiere 10 Anschreiben mit neuem Prompt
   - Exportiere Logs: test-react-v2.json
   ```

4. **Vergleichen**
   ```javascript
   const baseline = require('./baseline-react-v1.json');
   const test = require('./test-react-v2.json');
   
   // Vergleiche Metriken
   const baselineAvgWords = baseline.logs.reduce(...) / baseline.logs.length;
   const testAvgWords = test.logs.reduce(...) / test.logs.length;
   
   console.log('Baseline:', baselineAvgWords, 'Wörter');
   console.log('Test:', testAvgWords, 'Wörter');
   console.log('Verbesserung:', ((testAvgWords - baselineAvgWords) / baselineAvgWords * 100).toFixed(2) + '%');
   ```

5. **Entscheidung**
   ```
   - Wenn Test besser: Behalte neuen Prompt
   - Wenn Baseline besser: Revert
   - Wenn unklar: Sammle mehr Daten
   ```

---

## 🎓 Erweiterte Analyse-Tools

### Python-Script für Analyse

```python
import json
import pandas as pd
import matplotlib.pyplot as plt

# Lade Logs
with open('applyai-logs-2025-12-02.json') as f:
    data = json.load(f)

# Konvertiere zu DataFrame
logs = pd.DataFrame(data['logs'])

# Analyse 1: Generation Time über Zeit
plt.figure(figsize=(12, 6))
plt.plot(logs['timestamp'], logs['performance'].apply(lambda x: x['generationTimeMs']))
plt.title('Generation Time Over Time')
plt.xlabel('Timestamp')
plt.ylabel('Time (ms)')
plt.xticks(rotation=45)
plt.tight_layout()
plt.savefig('generation_time.png')

# Analyse 2: Skill Matching Distribution
plt.figure(figsize=(10, 6))
plt.hist(logs['matchingPercentage'], bins=20, edgecolor='black')
plt.title('Skill Matching Distribution')
plt.xlabel('Matching Percentage')
plt.ylabel('Frequency')
plt.savefig('skill_matching.png')

# Analyse 3: Word Count vs. Generation Time
plt.figure(figsize=(10, 6))
word_counts = logs['coverLetter'].apply(lambda x: x['wordCount'])
gen_times = logs['performance'].apply(lambda x: x['generationTimeMs'])
plt.scatter(word_counts, gen_times, alpha=0.5)
plt.title('Word Count vs. Generation Time')
plt.xlabel('Word Count')
plt.ylabel('Generation Time (ms)')
plt.savefig('wordcount_vs_time.png')

print('Analyse abgeschlossen! Grafiken gespeichert.')
```

---

## 🚀 Zukünftige Erweiterungen

### Mögliche Features:
1. **Dashboard:** Visualisierung der Logs direkt im Popup
2. **Ratings:** User kann Anschreiben bewerten (1-5 Sterne)
3. **Auto-Optimization:** ML-basierte Prompt-Optimierung
4. **Vergleichs-Modus:** Zwei Prompts parallel testen
5. **Cloud-Sync:** Logs über Geräte hinweg synchronisieren

---

**Status:** ✅ Implementiert und funktional  
**Version:** 0.0.40  
**Letzte Aktualisierung:** 2025-12-02

