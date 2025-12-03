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
   * Optimiert einen LinkedIn-Artikel mit AI
   */
  static async optimizeArticle(article: LinkedInArticle): Promise<string> {
    Logger.info('[ArticleOptimizer] Starting article optimization...', { 
      hasTitle: !!article.title,
      contentLength: article.content.length 
    });

    const apiConfig = await StorageService.load<ApiConfig>('apiConfig');
    if (!apiConfig || !apiConfig.apiKey) {
      throw new Error('API-Konfiguration fehlt. Bitte im Popup konfigurieren.');
    }

    const linkedInSettings = await StorageService.load<LinkedInSettings>('linkedin_settings');
    const useStyling = linkedInSettings?.useStyling !== false; // Default: true
    const highlightingIntensity = linkedInSettings?.highlightingIntensity || 'medium';

    const aiService = this.createAIService(apiConfig);
    const prompt = this.buildArticlePrompt(article, useStyling, highlightingIntensity, article.addressForm);

    Logger.info('[ArticleOptimizer] Sending to AI...', { provider: apiConfig.provider, useStyling });

    const optimizedContent = await aiService.generateText(prompt);

    Logger.info('[ArticleOptimizer] Article optimization complete', { 
      originalLength: article.content.length,
      optimizedLength: optimizedContent.length 
    });

    return optimizedContent;
  }

  /**
   * Erstellt einen spezifischen Prompt für Artikel
   */
  private static buildArticlePrompt(article: LinkedInArticle, useStyling: boolean, highlightingIntensity: 'low' | 'medium' | 'high', addressForm?: 'du' | 'sie'): string {
    const shouldUseStyling = useStyling;
    // Bestimme die Ansprache-Form
    const useDu = addressForm === 'du' || addressForm !== 'sie'; // Default: 'du'
    
    return `# AUFGABE: Optimiere diesen LinkedIn-Artikel

## KONTEXT
Du bist ein Experte für erfolgreiche LinkedIn-Artikel. Deine Aufgabe ist es, den Artikel zu optimieren, um mehr Engagement, Likes, Kommentare und Reichweite zu erzielen.

## ANSPRACHE-FORM
${useDu ? '**WICHTIG:** Verwende die "Du"-Form (du/deine/dein) für die Ansprache der Leser.' : '**WICHTIG:** Verwende die "Sie"-Form (Sie/Ihre/Ihr) für die Ansprache der Leser.'}

## ORIGINAL-ARTIKEL
${article.title ? `**Titel:** ${article.title}` : '**Typ:** LinkedIn-Artikel'}

**Inhalt:**
${article.content || '(Noch kein Inhalt vorhanden)'}

## WICHTIG FÜR ARTIKEL:
${article.title ? `- Der Titel "${article.title}" ist bereits optimiert und wird SEPARAT behandelt
- Der Titel soll NICHT im Artikel-Text wiederholt oder erwähnt werden
- Der Artikel-Text sollte sich auf den INHALT konzentrieren, nicht auf den Titel
- KEINE Übersetzung des Titels ins Englische oder andere Sprachen!` : ''}

## OPTIMIERUNGS-REGELN

### Struktur (WICHTIG):
1. **Hook** (1-2 Sätze): Fesselnde Einleitung, die zum Weiterlesen animiert
2. **Hauptteil** (3-5 Absätze): 
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
- ✅ **Persönliche Geschichten** - machen Artikel authentisch
- ✅ **Wertvolle Insights** - teile Wissen, nicht nur Meinungen
- ✅ **Hashtags** - am Ende 3-5 relevante Hashtags

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

## AUSGABE
Gib NUR den optimierten Artikel-Text aus, ohne Kommentare oder Erklärungen.
Maximal 3000 Zeichen.
Der Text muss in der GLEICHEN SPRACHE wie das Original sein! KEINE ÜBERSETZUNG!
${shouldUseStyling ? 'Der Text sollte Markdown-Formatierung enthalten (Fett, Kursiv, Code, Zitate).' : 'Der Text sollte als reiner Text formatiert sein.'}

## QUALITÄTSKONTROLLE (VOR AUSGABE):
✓ Prüfe dass der Artikel eine fesselnde Einleitung hat
✓ Prüfe dass der Artikel eine klare Struktur hat
✓ Prüfe dass der Artikel wertvolle Insights bietet
✓ Prüfe dass der Artikel einen Call-to-Action hat
✓ Prüfe Rechtschreibung
✓ Prüfe dass der Artikel natürlich und authentisch klingt
✓ Prüfe dass die Sprache beibehalten wurde
${shouldUseStyling ? `✓ Prüfe dass die Formatierung angemessen ist (${highlightingIntensity} Intensität)` : ''}`;
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
}
