import { InstagramComment } from '../models/InstagramComment';
import { Logger } from '../../../shared/utils/logger';
import { AIService } from '../../../shared/services/AIService';
import { ChatGPTProvider } from '../../../shared/services/ChatGPTProvider';
import { ClaudeProvider } from '../../../shared/services/ClaudeProvider';
import { StorageService } from '../../../shared/services/StorageService';
import { ApiConfig } from '../../../shared/models/ApiConfig';
import { InstagramSettings } from '../models/InstagramSettings';

/**
 * Service zur Optimierung von Instagram-Kommentaren
 */
export class CommentOptimizer {
  private static createAIService(apiConfig: ApiConfig): AIService {
    if (apiConfig.provider === 'chatgpt') {
      return new ChatGPTProvider(apiConfig.apiKey, apiConfig.model || 'gpt-4');
    } else if (apiConfig.provider === 'claude') {
      return new ClaudeProvider(
        apiConfig.apiKey,
        apiConfig.model || 'claude-3-5-sonnet-20241022',
        1000,  // maxTokens - Instagram-Kommentare sind kurz
        0.7    // temperature
      );
    } else {
      throw new Error(`Unbekannter Provider: ${apiConfig.provider}`);
    }
  }

  /**
   * Optimiert einen Instagram-Kommentar mit AI
   */
  static async optimizeComment(comment: InstagramComment, originalPostContext?: string): Promise<string> {
    Logger.info('[CommentOptimizer] Starting optimization...', { 
      comment, 
      hasPostContext: !!originalPostContext 
    });

    const apiConfig = await StorageService.load<ApiConfig>('apiConfig');
    if (!apiConfig || !apiConfig.apiKey) {
      throw new Error('API-Konfiguration fehlt. Bitte im Popup konfigurieren.');
    }

    const instagramSettings = await StorageService.load<InstagramSettings>('instagram_settings') || {};
    const mood = instagramSettings.mood || 'neutral';

    const aiService = this.createAIService(apiConfig);
    const prompt = this.buildPrompt(comment, mood, originalPostContext);

    Logger.info('[CommentOptimizer] Sending to AI...', { 
      provider: apiConfig.provider, 
      mood,
      hasPostContext: !!originalPostContext
    });

    const optimizedContent = await aiService.generateText(prompt);

    Logger.info('[CommentOptimizer] Optimization complete', {
      originalLength: comment.content.length,
      optimizedLength: optimizedContent.length,
      mood
    });

    return optimizedContent;
  }

  /**
   * Erstellt den Optimierungs-Prompt
   */
  private static buildPrompt(comment: InstagramComment, mood: string = 'neutral', originalPostContext?: string): string {
    // Definiere Mood-spezifische Anweisungen
    const moodInstructions: Record<string, string> = {
      neutral: `**Ton & Stil:**
- Sachlich und professionell
- Ausgewogen und objektiv
- Keine übertriebene Emotionalität
- Klar und präzise`,
      friendly: `**Ton & Stil:**
- Warm und einladend
- Freundlich und herzlich
- Empathisch und verständnisvoll
- Positiv und ermutigend`,
      professional: `**Ton & Stil:**
- Geschäftsmäßig und seriös
- Kompetent und zuverlässig
- Respektvoll und höflich
- Strukturiert und klar`,
      casual: `**Ton & Stil:**
- Entspannt und ungezwungen
- Natürlich und locker
- Authentisch und persönlich
- Leicht und zugänglich`,
      enthusiastic: `**Ton & Stil:**
- Energiegeladen und begeistert
- Positiv und motivierend
- Dynamisch und lebendig
- Inspirierend und mitreißend`,
      supportive: `**Ton & Stil:**
- Ermutigend und hilfreich
- Verständnisvoll und einfühlsam
- Konstruktiv und aufbauend
- Solidarisch und unterstützend`
    };

    const moodInstruction = moodInstructions[mood] || moodInstructions.neutral;

    const postContextSection = originalPostContext ? `
## ORIGINAL-POST (auf den geantwortet wird)
${originalPostContext}

**WICHTIG:** Deine Antwort muss sich auf DIESEN Post beziehen und relevant sein!
` : `
## HINWEIS
Dies ist eine Antwort auf einen Instagram-Post. Stelle sicher, dass deine Antwort relevant und passend zum ursprünglichen Post ist.
`;

    return `# AUFGABE: Optimiere diese Instagram-Antwort/Kommentar

## KONTEXT
Du bist ein Experte für erfolgreiche Instagram-Kommentare und Antworten. Deine Aufgabe ist es, eine Antwort zu optimieren, die auf einen bestehenden Post reagiert.

${postContextSection}

## DEINE ANTWORT (die optimiert werden soll)
${comment.content || '(Noch keine Antwort vorhanden)'}

## WICHTIG: Unterschied zwischen Antwort und eigenständigem Post

### Antwort/Kommentar:
- ✅ **Reagiert auf den Original-Post** - bezieht sich direkt darauf
- ✅ **Kurz und prägnant** - max. 2-3 Sätze (100-300 Zeichen)
- ✅ **Relevant** - bezieht sich auf den Inhalt des Original-Posts
- ✅ **Wertvoll** - fügt echten Mehrwert hinzu (Perspektive, Erfahrung, Frage, Ergänzung)
- ✅ **Kontextbezogen** - macht nur Sinn im Zusammenhang mit dem Original-Post
- ✅ **Keine Hashtags** - Kommentare haben keine Hashtags
- ✅ **Emojis sparsam** - nur wenn es passt (max. 1-2)

### Was eine gute Instagram-Antwort ausmacht:
1. **Bezug zum Original-Post** - zeigt, dass du den Post gelesen und verstanden hast
2. **Kurze, prägnante Aussage** - direkt zum Punkt, keine langen Ausführungen
3. **Mehrwert** - fügt etwas hinzu: Perspektive, Erfahrung, Frage, Ergänzung, konstruktive Kritik
4. **Natürlich und authentisch** - klingt wie eine echte menschliche Antwort
5. **Stimmung (${mood})** - der gewählte Ton muss erkennbar sein

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
- ❌ **Selbstreferenzielle Texte** - "Als Instagram-Experte empfehle ich..." (klingt wie Spam)
- ❌ **Eigenständige Posts** - Texte, die wie ein eigener Post klingen
- ❌ **Zu lang** - mehr als 3 Sätze
- ❌ **Kein Bezug zum Post** - Antworten, die nichts mit dem Original-Post zu tun haben
- ❌ **Marketing-Sprech** - "Lass uns gemeinsam daran arbeiten..."
- ❌ **Hashtags** - Kommentare haben keine Hashtags
- ❌ **Zu viele Emojis** - max. 1-2, nur wenn es passt

${moodInstruction}

## AUSGABE
Gib NUR die optimierte Antwort aus, ohne Kommentare oder Erklärungen.
Maximal 300 Zeichen (2-3 Sätze).
Der Text muss in der GLEICHEN SPRACHE wie das Original sein! KEINE ÜBERSETZUNG!
Die Antwort muss sich auf den Original-Post beziehen und relevant sein!
Die Stimmung "${mood}" muss im Ton erkennbar sein!

## QUALITÄTSKONTROLLE (VOR AUSGABE):
✓ Prüfe dass die Antwort kurz ist (max. 2-3 Sätze, 100-300 Zeichen)
✓ Prüfe dass die Antwort sich auf den Original-Post bezieht
✓ Prüfe dass die Antwort wertvoll ist (keine generischen Floskeln)
✓ Prüfe Rechtschreibung
✓ Prüfe dass die Antwort natürlich klingt
✓ Prüfe dass keine Hashtags enthalten sind
✓ Prüfe dass Emojis sparsam verwendet werden (max. 1-2)
✓ Prüfe dass die Sprache beibehalten wurde
✓ Prüfe dass die Stimmung "${mood}" im Ton erkennbar ist`;
  }
}

