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
  static async optimizeArticle(article: LinkedInArticle, type: 'article' | 'post' | 'comment' = 'article'): Promise<string> {
    Logger.info('[ArticleOptimizer] Starting optimization...', { article, type });

    const apiConfig = await StorageService.load<ApiConfig>('apiConfig');
    if (!apiConfig || !apiConfig.apiKey) {
      throw new Error('API-Konfiguration fehlt. Bitte im Popup konfigurieren.');
    }

    const linkedInSettings = await StorageService.load<LinkedInSettings>('linkedin_settings');
    const useStyling = linkedInSettings?.useStyling !== false; // Default: true
    const highlightingIntensity = linkedInSettings?.highlightingIntensity || 'medium';

    const aiService = this.createAIService(apiConfig);
    const prompt = this.buildPrompt(article, type, useStyling, highlightingIntensity);

    Logger.info('[ArticleOptimizer] Sending to AI...', { provider: apiConfig.provider, useStyling });

    const optimizedContent = await aiService.generateText(prompt);

    Logger.info('[ArticleOptimizer] Optimization complete', { 
      originalLength: article.content.length,
      optimizedLength: optimizedContent.length 
    });

    return optimizedContent;
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
  private static buildPrompt(article: LinkedInArticle, type: 'article' | 'post' | 'comment' = 'article', useStyling: boolean = true, highlightingIntensity: 'low' | 'medium' | 'high' = 'medium'): string {
    // Formatierung nur für Artikel verwenden
    const shouldUseStyling = type === 'article' && useStyling;
    const contentType = type === 'comment' ? 'Kommentar' : type === 'post' ? 'Beitrag' : 'Artikel';
    const maxLength = type === 'comment' ? '500' : type === 'post' ? '2000' : '3000';
    
    return `# AUFGABE: Optimiere diesen LinkedIn-${contentType}

## KONTEXT
Du bist ein Experte für erfolgreiche LinkedIn-${type === 'comment' ? 'Kommentare' : 'Inhalte'}. Deine Aufgabe ist es, den ${contentType} zu optimieren, um mehr Engagement, Likes, Kommentare und Reichweite zu erzielen.
${type === 'comment' ? '\n**WICHTIG für Kommentare:** Kommentare sollten kurz, prägnant und wertvoll sein. Maximal 2-3 Sätze, die einen echten Mehrwert bieten.' : ''}

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
${type === 'comment' ? `1. **Kurze, prägnante Antwort** (1-2 Sätze): Direkt zum Punkt, wertvoller Beitrag
2. **Optional: Persönliche Note** (1 Satz): Falls relevant, kurze persönliche Erfahrung oder Frage` : `1. **Hook** (1-2 Sätze): Fesselnde Einleitung, die zum Weiterlesen animiert
2. **Hauptteil** (${type === 'post' ? '2-4' : '3-5'} Absätze): 
   - Klare Struktur mit Absätzen
   - Konkrete Beispiele und Geschichten
   - Persönliche Erfahrungen (wenn vorhanden)
   - Daten und Fakten (wenn relevant)
3. **Call-to-Action** (1-2 Sätze): Aufforderung zum Engagement (Kommentar, Diskussion, etc.)`}

### LinkedIn-Best-Practices:
${type === 'comment' ? `- ✅ **Kurz und prägnant** - max. 2-3 Sätze
- ✅ **Wertvoller Beitrag** - füge echten Mehrwert hinzu, keine Floskeln
- ✅ **Respektvoll** - professioneller Ton, auch bei Kritik
- ✅ **Konkret** - spezifische Punkte statt Allgemeinplätze
- ✅ **Keine Hashtags** - Kommentare haben keine Hashtags` : `- ✅ **Erste Zeile ist entscheidend** - muss sofort Aufmerksamkeit erregen
- ✅ **Kurze Absätze** - max. 3-4 Zeilen pro Absatz
- ✅ **Emojis sparsam** - nur wenn es passt (max. 2-3)
- ✅ **Fragen stellen** - regt zu Kommentaren an
- ✅ **Persönliche Geschichten** - machen ${contentType} authentisch
- ✅ **Wertvolle Insights** - teile Wissen, nicht nur Meinungen
- ✅ **Hashtags** - am Ende 3-5 relevante Hashtags (nur bei Posts/Artikeln)`}

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
${type === 'comment' ? '- Kurz und prägnant (max. 2-3 Sätze)' : '- Klare Struktur mit Absätzen'}
${type !== 'comment' ? '- Call-to-Action am Ende' : ''}
${type === 'comment' ? '' : '- Relevante Hashtags (3-5, nur bei Posts/Artikeln)'}

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
${type === 'comment' ? 'Kommentare müssen kurz sein (max. 2-3 Sätze). Keine Hashtags.' : article.title ? 'Der Titel wird separat behandelt, konzentriere dich auf den Inhalt.' : 'Für Posts: Der Inhalt sollte direkt postbar sein, mit Hashtags am Ende.'}

## QUALITÄTSKONTROLLE (VOR AUSGABE):
✓ Prüfe dass die erste Zeile fesselnd ist
✓ Prüfe dass Absätze kurz sind (max. 3-4 Zeilen)
✓ Prüfe Rechtschreibung
✓ Prüfe dass ein Call-to-Action vorhanden ist
✓ Prüfe dass Hashtags am Ende stehen (3-5)
✓ Prüfe dass der Text natürlich klingt`;
  }
}

