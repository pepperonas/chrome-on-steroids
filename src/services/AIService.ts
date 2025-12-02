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
    
    // Nicht-passende Skills (für Kontext, aber nicht Fokus)
    const otherSkills = userProfile.skills.filter(skill => !matchingSkills.includes(skill));
    
    return `
# AUFGABE: Erstelle ein überzeugendes Freelancer-Bewerbungsanschreiben

## KONTEXT
Du bist ein Top-Freelancer mit ${userProfile.experience} Erfahrung, der sich auf ein Projekt bewirbt.
Dein Ziel: Zeige in 250-300 Wörtern, dass du GENAU die richtige Person für dieses Projekt bist.

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

## DEIN PROFIL
**Name:** ${userProfile.name}
**Erfahrung:** ${userProfile.experience}

**Deine Skills:**
${matchingSkills.length > 0 ? `
🎯 **PERFEKTE MATCHES für dieses Projekt:**
${matchingSkills.map(s => `- ${s}`).join('\n')}
` : ''}
${otherSkills.length > 0 ? `
Weitere Kompetenzen: ${otherSkills.slice(0, 5).join(', ')}
` : ''}

${userProfile.customIntro ? `**Dein Stil/Besonderheiten:** ${userProfile.customIntro}` : ''}

---

## SCHREIB-ANLEITUNG

### STRUKTUR (exakt einhalten!)

**[ANREDE]** (1 Zeile)
→ "Guten Tag," oder "Hallo," (NIEMALS "Sehr geehrte...")

**[HOOK]** (2-3 Sätze)
→ Warum passt DIESES Projekt perfekt zu dir?
→ Zeige, dass du die Anforderungen verstanden hast
→ Ein spezifischer Bezug zur Projektbeschreibung

**[ERFAHRUNG & SKILLS]** (4-5 Sätze)
→ Erwähne ${matchingSkills.length > 0 ? `EXPLIZIT diese Skills: ${matchingSkills.slice(0, 3).join(', ')}` : 'die wichtigsten Projekt-Skills'}
→ 2-3 konkrete Beispiele aus deiner Erfahrung
→ Zahlen/Ergebnisse wenn möglich ("5+ Jahre", "20+ Projekte", etc.)
${project.remote ? '→ Betone deine Remote-Erfahrung!' : ''}

**[MEHRWERT]** (2-3 Sätze)
→ Was macht DICH besonders?
→ Wie hilfst du dem Projekt zum Erfolg?
→ Alleinstellungsmerkmal

**[CALL-TO-ACTION]** (1-2 Sätze)
→ Verfügbarkeit: "Ich bin ab [Datum] verfügbar" oder "Ich kann sofort starten"
→ "Gerne bespreche ich die Details in einem kurzen Call"

**[VERABSCHIEDUNG]** (2 Zeilen)
→ "Viele Grüße" oder "Beste Grüße"
→ ${userProfile.name}

---

### STIL-REGELN (STRIKT befolgen!)

✅ **MACH DAS:**
- Aktive Verben: "Ich entwickle", "Ich habe umgesetzt", "Ich bringe mit"
- Konkrete Beispiele: "In meinem letzten Projekt mit React und TypeScript..."
- Selbstbewusst: "Ich bin überzeugt, dass meine Erfahrung mit X perfekt passt"
- Persönlich: Zeige Begeisterung für das Projekt
- Zahlen: "10+ Jahre", "50+ Projekte", "Team von 5 Entwicklern geleitet"

❌ **VERMEIDE UNBEDINGT:**
- "Hiermit bewerbe ich mich..." ← Langweilig!
- "Ich habe mit großem Interesse..." ← Floskel!
- "Ich würde mich freuen..." ← Konjunktiv! (Nutze "Ich freue mich")
- "teamfähig", "motiviert", "flexibel" ← Ohne Beleg wertlos!
- Alle Skills auflisten ← Nur die relevanten!
- Passive Formulierungen ← Immer aktiv!

---

### QUALITÄTSKONTROLLE

Prüfe VOR der Ausgabe:
1. ✓ Firmenname korrekt (${project.company || 'falls angegeben'})
2. ✓ Mindestens 2 konkrete Beispiele
3. ✓ Matching Skills erwähnt: ${matchingSkills.length > 0 ? matchingSkills.slice(0, 3).join(', ') : 'Projekt-Skills'}
4. ✓ Keine Floskeln oder Konjunktive
5. ✓ 250-300 Wörter
6. ✓ Aktive Verben durchgehend

---

## OUTPUT-FORMAT

Gib NUR das fertige Anschreiben aus.
KEINE Kommentare, KEINE Erklärungen, KEIN "Hier ist dein Anschreiben".
Beginne DIREKT mit "Guten Tag," oder "Hallo,".
    `.trim();
  }
}

