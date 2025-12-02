import { Project } from '../models/Project';
import { UserProfile } from '../models/UserProfile';

/**
 * Abstrakte Basisklasse für AI-Provider (Strategy Pattern)
 */
export abstract class AIService {
  protected apiKey: string;
  protected model: string;

  constructor(apiKey: string, model: string) {
    this.apiKey = apiKey;
    this.model = model;
  }

  /**
   * Generiert ein Bewerbungsanschreiben
   * @param project Projektdaten
   * @param userProfile Benutzerprofil
   * @returns Promise mit generiertem Anschreiben
   */
  abstract generateCoverLetter(
    project: Project,
    userProfile: UserProfile
  ): Promise<string>;

  /**
   * Validiert die API-Verbindung
   */
  abstract validateApiKey(): Promise<boolean>;

  /**
   * Baut den Prompt für die AI-Generierung
   */
  protected buildPrompt(project: Project, userProfile: UserProfile): string {
    // Finde übereinstimmende Skills zwischen Projekt und Bewerber
    const projectSkillsLower = project.skills.map(s => s.toLowerCase());
    const matchingSkills = userProfile.skills.filter(skill => 
      projectSkillsLower.some(ps => ps.includes(skill.toLowerCase()) || skill.toLowerCase().includes(ps))
    );
    
    return `
# AUFGABE: Erstelle ein überzeugendes Freelancer-Bewerbungsanschreiben

## ⚠️ KRITISCH: WICHTIGSTE REGEL
**DU DARFST NICHTS ERFINDEN!**
- Verwende NUR die Informationen, die unten im "DEIN PROFIL" Abschnitt stehen
- Erfinde KEINE Projekte, Rollen, Technologien oder Erfahrungen
- Erwähne KEINE Skills, die nicht in der Liste "Deine Skills" stehen
- Erfinde KEINE Firmennamen, Projekte oder Tätigkeiten
- Wenn etwas nicht in deinem Profil steht, erwähne es NICHT

**Beispiel FALSCH:** "Als ITSM-Berater habe ich..." ← NICHT im Profil!
**Beispiel RICHTIG:** "Als Senior Java Developer bei Intertek habe ich..." ← Steht im Profil!

---

## PROJEKTDETAILS
**Titel:** ${project.title}
**Unternehmen:** ${project.company || 'Nicht angegeben'}
**Beschreibung:** ${project.description}

**Anforderungen:**
${project.skills.length > 0 ? project.skills.map(s => `- ${s}`).join('\n') : '- Keine spezifischen Skills angegeben'}

**Rahmenbedingungen:**
- Ort: ${project.location || 'Nicht angegeben'}${project.remote ? ' (Remote möglich ✓)' : ''}
- Start: ${project.startDate || 'Flexibel'}
- Dauer: ${project.duration || 'Nicht angegeben'}
${project.workload ? `- Auslastung: ${project.workload}` : ''}

---

## DEIN PROFIL - NUR DIESE DATEN VERWENDEN!

**Name:** ${userProfile.name}

**Deine tatsächlichen Skills (NUR diese erwähnen!):**
${userProfile.skills.map(s => `- ${s}`).join('\n')}

${matchingSkills.length > 0 ? `
**🎯 Skills die zum Projekt passen:**
${matchingSkills.map(s => `- ${s}`).join('\n')}
` : `
**⚠️ HINWEIS:** Keine direkten Skill-Matches gefunden. Fokussiere auf übertragbare Erfahrungen.
`}

**Deine tatsächliche Berufserfahrung (WORTWÖRTLICH aus diesem Text):**
${userProfile.experience}

${userProfile.customIntro ? `**Persönlicher Stil:** ${userProfile.customIntro}` : ''}

---

## SCHREIB-ANLEITUNG

### STRUKTUR (exakt einhalten!)

**[ANREDE]** (1 Zeile)
→ "Guten Tag," oder "Hallo," (NIEMALS "Sehr geehrte...")

**[HOOK]** (2-3 Sätze)
→ Warum passt DIESES Projekt zu deinen tatsächlichen Erfahrungen?
→ Zeige, dass du die Anforderungen verstanden hast
→ Bezug zu deinen tatsächlichen Projekten/Erfahrungen

**[ERFAHRUNG & SKILLS]** (4-5 Sätze)
${matchingSkills.length > 0 ? `→ Erwähne diese Skills aus deinem Profil: ${matchingSkills.slice(0, 3).join(', ')}` : '→ Erwähne Skills aus deinem Profil, die relevant sind'}
→ Zitiere KONKRET aus deiner Berufserfahrung (Firmenname, Tätigkeit, Technologien)
→ Verwende NUR Informationen aus dem "Deine tatsächliche Berufserfahrung" Abschnitt
→ Zahlen wenn vorhanden ("7 Jahre", "seit 2014", etc.)
${project.remote ? '→ Erwähne Remote-Erfahrung nur wenn sie im Profil steht!' : ''}

**[MEHRWERT]** (2-3 Sätze)
→ Was macht DICH besonders? (basierend auf tatsächlichen Erfahrungen)
→ Wie hilfst du dem Projekt? (nur mit echten Skills/Erfahrungen)
→ Alleinstellungsmerkmal (aus deinem Profil)

**[CALL-TO-ACTION]** (1-2 Sätze)
→ Verfügbarkeit: "Ich bin ab [Datum] verfügbar" oder "Ich kann sofort starten"
→ "Gerne bespreche ich die Details in einem kurzen Call"

${userProfile.portfolio ? `
**[PORTFOLIO-PROJEKTE]** (2-4 Zeilen, optional)
→ Erwähne relevante Portfolio-Projekte kurz und prägnant
→ Format: "Gerne zeige ich Ihnen auch meine Projekte: [Projekt-Links/Namen]"
→ Portfolio-Projekte aus deinem Profil:
${userProfile.portfolio.split('\n').map(line => line.trim()).filter(line => line).map(line => `  ${line}`).join('\n')}
→ NUR erwähnen wenn relevant für das Projekt!
` : ''}

**[VERABSCHIEDUNG]** (2 Zeilen)
→ "Viele Grüße" oder "Beste Grüße"
→ ${userProfile.name}

---

### STIL-REGELN (STRIKT befolgen!)

✅ **MACH DAS:**
- Aktive Verben: "Ich entwickle", "Ich habe umgesetzt", "Ich bringe mit"
- Konkrete Beispiele AUS DEINEM PROFIL: "Bei Intertek entwickle ich...", "Als Freelancer bei celox.io..."
- Selbstbewusst: "Ich bin überzeugt, dass meine Erfahrung mit X perfekt passt"
- Persönlich: Zeige Begeisterung für das Projekt
- Zahlen AUS DEM PROFIL: "7 Jahre", "seit 2014", etc.

❌ **VERMEIDE UNBEDINGT:**
- "Hiermit bewerbe ich mich..." ← Langweilig!
- "Ich habe mit großem Interesse..." ← Floskel!
- "Ich würde mich freuen..." ← Konjunktiv! (Nutze "Ich freue mich")
- "teamfähig", "motiviert", "flexibel" ← Ohne Beleg wertlos!
- Alle Skills auflisten ← Nur die relevanten!
- Passive Formulierungen ← Immer aktiv!
- **ERFINDEN von Projekten, Rollen, Technologien ← ABSOLUT VERBOTEN!**

---

### VALIDIERUNG VOR AUSGABE

Prüfe JEDEN Satz:
1. ✓ Jede erwähnte Firma steht im Profil? (Intertek, celox.io, CodingGiants)
2. ✓ Jede erwähnte Rolle/Tätigkeit steht im Profil? (Senior Java Developer, Full-Stack Developer, etc.)
3. ✓ Jede erwähnte Technologie steht in den Skills? (Java, Spring Boot, React, etc.)
4. ✓ Jede Zahl/Zeitangabe steht im Profil? (7 Jahre, seit 2014, etc.)
5. ✓ Keine erfundenen Projekte, Firmen oder Erfahrungen?
6. ✓ Firmenname korrekt (${project.company || 'falls angegeben'})
7. ✓ 250-300 Wörter
8. ✓ Aktive Verben durchgehend

**Wenn du dir bei einem Satz nicht sicher bist, ob er im Profil steht → LASS IHN WEG!**

---

## OUTPUT-FORMAT

Gib NUR das fertige Anschreiben aus.
KEINE Kommentare, KEINE Erklärungen, KEIN "Hier ist dein Anschreiben".
Beginne DIREKT mit "Guten Tag," oder "Hallo,".
    `.trim();
  }
}

