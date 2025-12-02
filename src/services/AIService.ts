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
# META-PROMPT: Freelancer-Bewerbungsanschreiben

## DEINE ROLLE
Du bist ein erfahrener Bewerbungscoach mit 15+ Jahren Erfahrung in der Tech-Branche.
Du kennst die Standards des deutschen Freelancer-Markts und verstehst, wie man sich
auf Projektplattformen wie freelancermap.de überzeugend präsentiert.

## PROJEKTAUSSCHREIBUNG
- **Titel:** ${project.title}
- **Unternehmen:** ${project.company}
- **Beschreibung:** ${project.description}
- **Gesuchte Skills:** ${project.skills.join(', ')}
- **Arbeitsort:** ${project.location}${project.remote ? ' (Remote möglich)' : ''}
- **Projektstart:** ${project.startDate}
- **Projektdauer:** ${project.duration}

## FREELANCER-PROFIL
- **Name:** ${userProfile.name}
- **Berufserfahrung:** ${userProfile.experience}
- **Kernkompetenzen:** ${userProfile.skills.join(', ')}
${matchingSkills.length > 0 ? `- **Matching Skills für dieses Projekt:** ${matchingSkills.join(', ')}` : ''}
${userProfile.customIntro ? `- **Persönlicher Stil/Intro:** ${userProfile.customIntro}` : ''}

## AUFGABE
Erstelle ein überzeugendes Bewerbungsanschreiben für dieses Freelance-Projekt.

### STRUKTUR (max. 250-300 Wörter)

**1. ANREDE**
- "Guten Tag," oder "Hallo,"
- NICHT "Sehr geehrte Damen und Herren" (zu steif für Freelancer-Kontext)

**2. HOOK / EINLEITUNG (2-3 Sätze)**
- Warum DIESES Projekt, DIESES Unternehmen
- Zeige, dass du die Anforderungen verstanden hast
- Ein konkreter Bezug zur Projektbeschreibung

**3. RELEVANTE ERFAHRUNG (3-4 Sätze)**
- 2-3 konkrete Beispiele aus deiner Erfahrung, die zu den Requirements passen
- Erwähne spezifische Technologien/Tools aus der Stellenbeschreibung
- Zahlen und Ergebnisse wo möglich
${project.remote ? '- Erwähne Remote-Erfahrung, da Remote möglich ist' : ''}

**4. MEHRWERT (2-3 Sätze)**
- Was bringst DU mit, das andere nicht haben?
- Wie trägst du zum Projekterfolg bei?
- Besondere Stärken oder Alleinstellungsmerkmale

**5. ABSCHLUSS & CALL-TO-ACTION (1-2 Sätze)**
- Verfügbarkeit erwähnen
- Interesse an einem Gespräch signalisieren
- Konkret, nicht vage

**6. GRUßFORMEL**
- "Viele Grüße" oder "Beste Grüße"
- ${userProfile.name}

### TON & STIL
- Professionell aber authentisch
- Selbstbewusst ohne überheblich zu sein
- Konkrete Achievements statt generischer Aussagen
- Aktive Verben, Präsens für Aktuelles

### VERMEIDE UNBEDINGT
- ❌ "Hiermit bewerbe ich mich..." (langweilig)
- ❌ "Ich habe mit großem Interesse..." (Floskel)
- ❌ "Ich bin überzeugt, dass..." (Floskel)
- ❌ "Ich freue mich auf Ihre Rückmeldung" (Floskel)
- ❌ Worthülsen wie "teamfähig", "motiviert" ohne Beleg
- ❌ Wiederholung aller Skills (nur relevante!)
- ❌ Konjunktive ("könnte", "würde") - schreibe aktiv!
- ❌ Passive Formulierungen

### QUALITY CHECKS
Prüfe vor Ausgabe:
- [ ] Firmenname korrekt
- [ ] Konkrete Beispiele statt Floskeln
- [ ] Nur relevante Skills für DIESES Projekt erwähnt
- [ ] Aktive Verben verwendet
- [ ] Max. 300 Wörter

## OUTPUT
Gib NUR das fertige Anschreiben aus - keine Kommentare, keine Erklärungen, kein "Hier ist dein Anschreiben".
Beginne direkt mit der Anrede.
    `.trim();
  }
}

