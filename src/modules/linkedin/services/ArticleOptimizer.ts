import { LinkedInArticle } from '../models/LinkedInArticle';
import { LinkedInSettings } from '../models/LinkedInSettings';
import { Logger } from '../../../shared/utils/logger';
import { AIService } from '../../../shared/services/AIService';
import { ChatGPTProvider } from '../../../shared/services/ChatGPTProvider';
import { ClaudeProvider } from '../../../shared/services/ClaudeProvider';
import { StorageService } from '../../../shared/services/StorageService';
import { ApiConfig } from '../../../shared/models/ApiConfig';

/**
 * Service zur Optimierung von LinkedIn-Artikeln
 */
export class ArticleOptimizer {
  
  /**
   * Optimiert einen LinkedIn-Artikel/Post/Kommentar mit AI
   */
  static async optimizeArticle(article: LinkedInArticle, type: 'article' | 'post' | 'comment' = 'article', originalPostContext?: string): Promise<string> {
    Logger.info('[ArticleOptimizer] Starting optimization...', { article, type, hasPostContext: !!originalPostContext });

    const apiConfig = await StorageService.load<ApiConfig>('apiConfig');
    if (!apiConfig || !apiConfig.apiKey) {
      throw new Error('API-Konfiguration fehlt. Bitte im Popup konfigurieren.');
    }

    const linkedInSettings = await StorageService.load<LinkedInSettings>('linkedin_settings');
    const useStyling = linkedInSettings?.useStyling !== false; // Default: true
    const highlightingIntensity = linkedInSettings?.highlightingIntensity || 'medium';

    const aiService = this.createAIService(apiConfig);
    const prompt = this.buildPrompt(article, type, useStyling, highlightingIntensity, originalPostContext);

    Logger.info('[ArticleOptimizer] Sending to AI...', { provider: apiConfig.provider, useStyling });

    const optimizedContent = await aiService.generateText(prompt);

    Logger.info('[ArticleOptimizer] Optimization complete', { 
      originalLength: article.content.length,
      optimizedLength: optimizedContent.length 
    });

    return optimizedContent;
  }

  /**
   * Erstellt einen spezifischen Prompt für Kommentare/Antworten
   */
  private static buildCommentPrompt(comment: LinkedInArticle, originalPostContext?: string): string {
    if (!originalPostContext) {
      throw new Error('Post-Kontext fehlt. Bitte öffne einen Post, um zu kommentieren.');
    }

    const hasUserInput = comment.content && comment.content.trim().length > 0;
    const userInputSection = hasUserInput ? `
## DEINE ANTWORT (die optimiert werden soll)
${comment.content}
` : `
## HINWEIS
Der Benutzer hat noch keine Antwort eingegeben. Generiere eine passende Antwort basierend auf dem Original-Post.
`;

    return `# AUFGABE: ${hasUserInput ? 'Optimiere diese' : 'Erstelle eine'} LinkedIn-Antwort/Kommentar

## KONTEXT
Du bist ein Experte für erfolgreiche LinkedIn-Kommentare und Antworten. Deine Aufgabe ist es, ${hasUserInput ? 'eine Antwort zu optimieren' : 'eine passende Antwort zu erstellen'}, die auf einen bestehenden Post reagiert.

## ORIGINAL-POST (auf den geantwortet wird)
${originalPostContext}

**WICHTIG:** Deine Antwort muss sich auf DIESEN Post beziehen und relevant sein!

${userInputSection}

## WICHTIG: Unterschied zwischen Antwort und eigenständigem Post

### Antwort/Kommentar:
- ✅ **Reagiert auf den Original-Post** - bezieht sich direkt darauf
- ✅ **Kurz und prägnant** - max. 2-3 Sätze (100-300 Zeichen)
- ✅ **Relevant** - bezieht sich auf den Inhalt des Original-Posts
- ✅ **Wertvoll** - fügt echten Mehrwert hinzu (Perspektive, Erfahrung, Frage, Ergänzung)
- ✅ **Kontextbezogen** - macht nur Sinn im Zusammenhang mit dem Original-Post
- ✅ **Keine Hashtags** - Kommentare haben keine Hashtags
- ✅ **Keine Call-to-Actions** - keine Aufforderungen zum Teilen/Liken

### Was eine gute Antwort ausmacht:
1. **Bezug zum Original-Post** - zeigt, dass du den Post gelesen und verstanden hast
2. **Kurze, prägnante Aussage** - direkt zum Punkt, keine langen Ausführungen
3. **Mehrwert** - fügt etwas hinzu: Perspektive, Erfahrung, Frage, Ergänzung, konstruktive Kritik
4. **Natürlich und authentisch** - klingt wie eine echte menschliche Antwort

### Struktur einer guten Antwort:
1. **Bezug herstellen** (optional, 1 Satz): Kurze Referenz zum Post
2. **Hauptaussage** (1-2 Sätze): Deine Antwort, Meinung, Erfahrung oder Frage
3. **Optional: Ergänzung** (1 Satz): Falls relevant, zusätzlicher Punkt oder Frage

### Beispiele für gute Antworten:

**Beispiel 1 (Zustimmung mit Ergänzung):**
"Interessanter Punkt! Aus meiner Erfahrung ist das auch ein wichtiger Aspekt. Wie siehst du die langfristigen Auswirkungen?"

**Beispiel 2 (Perspektive teilen):**
"Ähnliche Erfahrung gemacht. Bei uns hat sich gezeigt, dass [konkreter Punkt]. Was denkst du dazu?"

**Beispiel 3 (Frage stellen):**
"Spannend! Wie gehst du mit [spezifischer Herausforderung] um?"

**Beispiel 4 (Konstruktive Ergänzung):**
"Guter Beitrag! Ergänzend würde ich noch [spezifischer Punkt] erwähnen."

### Was VERMEIDEN:
- ❌ **Generische Floskeln** - "Sehr gut!", "Interessant!", "Danke fürs Teilen!" (ohne Mehrwert)
- ❌ **Selbstreferenzielle Texte** - "Als LinkedIn-Experte empfehle ich..." (klingt wie Spam)
- ❌ **Eigenständige Posts** - Texte, die wie ein eigener Post klingen
- ❌ **Zu lang** - mehr als 3 Sätze
- ❌ **Kein Bezug zum Post** - Antworten, die nichts mit dem Original-Post zu tun haben
- ❌ **Marketing-Sprech** - "Lass uns gemeinsam daran arbeiten..."
- ❌ **Hashtags** - Kommentare haben keine Hashtags
- ❌ **Call-to-Actions** - keine Aufforderungen zum Teilen/Liken

### Ton & Stil:
- Authentisch und natürlich
- Respektvoll und konstruktiv
- Konkret statt vage
- Kurz und prägnant
- Relevant zum Original-Post

## AUSGABE
Gib NUR die optimierte Antwort aus, ohne Kommentare oder Erklärungen.
Maximal 300 Zeichen (2-3 Sätze).
Der Text muss in der GLEICHEN SPRACHE wie das Original sein! KEINE ÜBERSETZUNG!
Die Antwort muss sich auf den Original-Post beziehen und relevant sein!

## QUALITÄTSKONTROLLE (VOR AUSGABE):
✓ Prüfe dass die Antwort kurz ist (max. 2-3 Sätze, 100-300 Zeichen)
✓ Prüfe dass die Antwort sich auf den Original-Post bezieht
✓ Prüfe dass die Antwort wertvoll ist (keine generischen Floskeln)
✓ Prüfe Rechtschreibung
✓ Prüfe dass die Antwort natürlich klingt
✓ Prüfe dass keine Hashtags enthalten sind
✓ Prüfe dass keine Call-to-Actions enthalten sind
✓ Prüfe dass die Sprache beibehalten wurde`;
  }

  /**
   * Optimiert einen LinkedIn-Artikel-Titel
   */
  static async optimizeTitle(title: string): Promise<string> {
    Logger.info('[ArticleOptimizer] Starting title optimization...', { title });

    const apiConfig = await StorageService.load<ApiConfig>('apiConfig');
    if (!apiConfig || !apiConfig.apiKey) {
      throw new Error('API-Konfiguration fehlt. Bitte im Popup konfigurieren.');
    }

    const aiService = this.createAIService(apiConfig);
    const prompt = this.buildTitlePrompt(title);

    Logger.info('[ArticleOptimizer] Sending title to AI...', { provider: apiConfig.provider });

    const optimizedTitle = await aiService.generateText(prompt);

    Logger.info('[ArticleOptimizer] Title optimization complete', { 
      originalLength: title.length,
      optimizedLength: optimizedTitle.length 
    });

    return optimizedTitle.trim();
  }

  /**
   * Erstellt AI-Service basierend auf Konfiguration
   */
  private static createAIService(apiConfig: ApiConfig): AIService {
    if (apiConfig.provider === 'chatgpt') {
      return new ChatGPTProvider(
        apiConfig.chatgptApiKey || apiConfig.apiKey,
        apiConfig.chatgptModel || apiConfig.model || 'gpt-4o-mini',
        3000,  // maxTokens - mehr für längere Artikel
        0.8    // temperature - kreativer für Artikel
      );
    } else {
      return new ClaudeProvider(
        apiConfig.claudeApiKey || apiConfig.apiKey,
        apiConfig.claudeModel || apiConfig.model || 'claude-3-haiku-20240307',
        3000,  // maxTokens
        0.8    // temperature
      );
    }
  }

  /**
   * Erstellt den Titel-Optimierungs-Prompt
   */
  private static buildTitlePrompt(title: string): string {
    return `# AUFGABE: Optimiere diesen LinkedIn-Artikel-Titel

## KONTEXT
Du bist ein Experte für erfolgreiche LinkedIn-Artikel-Titel. Deine Aufgabe ist es, den Titel zu optimieren, um mehr Klicks und Engagement zu erzielen.

## ORIGINAL-TITEL
${title || '(Kein Titel)'}

## WICHTIGE REGELN:
- ✅ **SPRACHE BEIBEHALTEN** - Der Titel muss in der GLEICHEN SPRACHE wie das Original bleiben!
- ✅ **KEINE ÜBERSETZUNG** - Übersetze den Titel NICHT ins Englische oder in eine andere Sprache!
- ✅ **NUR OPTIMIERUNG** - Verbessere Formulierung, Struktur und Wirkung, aber behalte die Sprache bei!

## OPTIMIERUNGS-REGELN

### Was macht einen guten LinkedIn-Titel aus:
- ✅ **Fesselnd** - weckt Neugier und Interesse
- ✅ **Prägnant** - max. 150 Zeichen (LinkedIn-Limit)
- ✅ **Klare Aussage** - der Leser weiß sofort worum es geht
- ✅ **Emotionale Ansprache** - spricht Gefühle oder Bedürfnisse an
- ✅ **Wertversprechen** - zeigt welchen Nutzen der Artikel bietet
- ✅ **Keywords** - enthält relevante Suchbegriffe

### Beispiele für gute Titel (DEUTSCH):
- "Wie ich in 30 Tagen 10.000 Follower gewonnen habe (und was ich dabei gelernt habe)"
- "5 Fehler, die 90% der Entwickler beim Code-Review machen"
- "Warum ich nach 10 Jahren meinen Job gekündigt habe - und was ich dabei gelernt habe"

### Was VERMEIDEN:
- Clickbait ohne Substanz
- Zu lange Titel (über 150 Zeichen)
- Vage Formulierungen
- Übertreibungen
- Zu viele Emojis im Titel
- **SPRACHWECHSEL** - NIEMALS die Sprache ändern!

## AUSGABE
Gib NUR den optimierten Titel aus, ohne Kommentare oder Erklärungen.
Maximal 150 Zeichen.
Der Titel muss in der GLEICHEN SPRACHE wie das Original sein!
Der Titel sollte direkt verwendbar sein.`;
  }

  /**
   * Erstellt den Optimierungs-Prompt
   */
  private static buildPrompt(article: LinkedInArticle, type: 'article' | 'post' | 'comment' = 'article', useStyling: boolean = true, highlightingIntensity: 'low' | 'medium' | 'high' = 'medium', originalPostContext?: string): string {
    // Formatierung nur für Artikel verwenden
    const shouldUseStyling = type === 'article' && useStyling;
    const contentType = type === 'comment' ? 'Kommentar/Antwort' : type === 'post' ? 'Beitrag' : 'Artikel';
    const maxLength = type === 'comment' ? '300' : type === 'post' ? '2000' : '3000';
    
    // Spezieller Prompt für Kommentare/Antworten
    if (type === 'comment') {
      return this.buildCommentPrompt(article, originalPostContext);
    }
    
    // Ab hier ist type nur noch 'article' | 'post'
    return `# AUFGABE: Optimiere diesen LinkedIn-${contentType}

## KONTEXT
Du bist ein Experte für erfolgreiche LinkedIn-Inhalte. Deine Aufgabe ist es, den ${contentType} zu optimieren, um mehr Engagement, Likes, Kommentare und Reichweite zu erzielen.

## ORIGINAL-${article.title ? 'ARTIKEL' : 'BEITRAG'}
${article.title ? `**Titel:** ${article.title}` : '**Typ:** LinkedIn-Beitrag (Post)'}

**Inhalt:**
${article.content || '(Noch kein Inhalt vorhanden)'}

## WICHTIG FÜR ARTIKEL:
${type === 'article' && article.title ? `- Der Titel "${article.title}" ist bereits optimiert und wird SEPARAT behandelt
- Der Titel soll NICHT im Artikel-Text wiederholt oder erwähnt werden
- Der Artikel-Text sollte sich auf den INHALT konzentrieren, nicht auf den Titel
- KEINE Übersetzung des Titels ins Englische oder andere Sprachen!` : ''}

## OPTIMIERUNGS-REGELN

### Struktur (WICHTIG):
1. **Hook** (1-2 Sätze): Fesselnde Einleitung, die zum Weiterlesen animiert
2. **Hauptteil** (${type === 'post' ? '2-4' : '3-5'} Absätze): 
   - Klare Struktur mit Absätzen
   - Konkrete Beispiele und Geschichten
   - Persönliche Erfahrungen (wenn vorhanden)
   - Daten und Fakten (wenn relevant)
3. **Call-to-Action** (1-2 Sätze): Aufforderung zum Engagement (Kommentar, Diskussion, etc.)

### LinkedIn-Best-Practices:
- ✅ **Erste Zeile ist entscheidend** - muss sofort Aufmerksamkeit erregen
- ✅ **Kurze Absätze** - max. 3-4 Zeilen pro Absatz
- ✅ **Emojis sparsam** - nur wenn es passt (max. 2-3)
- ✅ **Fragen stellen** - regt zu Kommentaren an
- ✅ **Persönliche Geschichten** - machen ${contentType} authentisch
- ✅ **Wertvolle Insights** - teile Wissen, nicht nur Meinungen
- ✅ **Hashtags** - am Ende 3-5 relevante Hashtags (nur bei Posts/Artikeln)

${shouldUseStyling ? `### Formatierung (WICHTIG):
Verwende Markdown-Formatierung für bessere Lesbarkeit:
- **Fett** für wichtige Begriffe: \`**Text**\`
- *Kursiv* für Betonung: \`*Text*\`
- \`Code\` für technische Begriffe: \`\`Code\`\`
- > Zitate für wichtige Aussagen: \`> Zitat\`
- Code-Blöcke für längere Code-Beispiele: \`\`\`code\`\`\`

### Highlighting-Intensität: ${highlightingIntensity === 'low' ? 'NIEDRIG' : highlightingIntensity === 'high' ? 'HOCH' : 'MITTEL'}
${highlightingIntensity === 'low' ? `- Verwende Formatierung SPARSAM - nur bei wirklich wichtigen Begriffen (max. 2-3 pro Absatz)
- Fett nur für Kernbegriffe oder Schlüsselwörter
- Kursiv nur für leichte Betonung
- Keine übermäßige Formatierung` : highlightingIntensity === 'high' ? `- Verwende Formatierung INTENSIV - viele wichtige Begriffe formatieren
- Fett für wichtige Konzepte, Zahlen, Namen, Produkte
- Kursiv für Betonungen und Hervorhebungen
- Code für technische Begriffe und Tools
- Zitate für wichtige Aussagen` : `- Verwende Formatierung AUSGEWOGEN - wichtige Begriffe formatieren
- Fett für wichtige Konzepte und Schlüsselwörter (3-5 pro Absatz)
- Kursiv für Betonungen
- Code für technische Begriffe
- Zitate sparsam für besonders wichtige Aussagen`}

**Beispiel (${highlightingIntensity === 'low' ? 'niedrig' : highlightingIntensity === 'high' ? 'hoch' : 'mittel'}):**
\`\`\`
${highlightingIntensity === 'low' ? `Dies ist ein wichtiger Punkt über **KI**.

Erfolg kommt durch kontinuierliche Anstrengung.` : highlightingIntensity === 'high' ? `**Wichtig:** Dies ist ein *wichtiger* Punkt über **KI** und **Machine Learning**.

> "Erfolg ist die Summe kleiner Anstrengungen, die jeden Tag wiederholt werden."

Für \`JavaScript\` Entwickler: **React**, **TypeScript** und **Node.js** sind essentiell.` : `**Wichtig:** Dies ist ein *wichtiger* Punkt über **KI**.

> "Erfolg ist die Summe kleiner Anstrengungen."

Für \`JavaScript\` Entwickler sind **React** und **TypeScript** wichtig.`}
\`\`\`` : ''}

### Ton & Stil:
- Professionell aber zugänglich
- Authentisch und persönlich
- Konkret statt vage
- Positiv und motivierend
- Keine Übertreibungen oder Clickbait

### Was MUSS enthalten sein:
- Alle wichtigen Punkte aus dem Original-${contentType}
- Klare Struktur mit Absätzen
- Call-to-Action am Ende
- Relevante Hashtags (3-5, nur bei Posts/Artikeln)

### Was VERMEIDEN:
- Zu lange Absätze
- Floskeln und Marketing-Sprech
- Rechtschreibfehler
- Zu viele Emojis
- Clickbait-Formulierungen
- Unnötige Wiederholungen

## BEISPIEL-STRUKTUR:

[Hook - fesselnde erste Zeile]

[Absatz 1: Kontext oder persönliche Geschichte]

[Absatz 2: Hauptpunkt mit Beispiel]

[Absatz 3: Weitere Insights oder Erfahrungen]

[Absatz 4: Praktische Tipps oder Learnings]

[Call-to-Action: Frage oder Diskussionsaufforderung]

#hashtag1 #hashtag2 #hashtag3

## AUSGABE
Gib NUR den optimierten ${contentType}-Inhalt aus, ohne Kommentare oder Erklärungen.
Maximal ${maxLength} Zeichen.
${article.title ? 'Der Titel wird separat behandelt, konzentriere dich auf den Inhalt.' : 'Für Posts: Der Inhalt sollte direkt postbar sein, mit Hashtags am Ende.'}

## QUALITÄTSKONTROLLE (VOR AUSGABE):
✓ Prüfe dass die erste Zeile fesselnd ist
✓ Prüfe dass Absätze kurz sind (max. 3-4 Zeilen)
✓ Prüfe Rechtschreibung
✓ Prüfe dass ein Call-to-Action vorhanden ist
✓ Prüfe dass Hashtags am Ende stehen (3-5)
✓ Prüfe dass der Text natürlich klingt`;
  }
}

