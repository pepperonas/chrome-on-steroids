import { LinkedInArticle } from '../models/LinkedInArticle';
import { Logger } from '../../../shared/utils/logger';
import { AIService } from '../../../shared/services/AIService';
import { ChatGPTProvider } from '../../../shared/services/ChatGPTProvider';
import { ClaudeProvider } from '../../../shared/services/ClaudeProvider';
import { StorageService } from '../../../shared/services/StorageService';
import { ApiConfig } from '../../../shared/models/ApiConfig';

/**
 * Service zur Optimierung von LinkedIn Posts (normale Beiträge)
 */
export class PostOptimizer {
  
  /**
   * Optimiert einen LinkedIn-Post
   */
  static async optimizePost(post: LinkedInArticle): Promise<string> {
    Logger.info('[PostOptimizer] Starting post optimization...', { 
      contentLength: post.content.length 
    });

    const apiConfig = await StorageService.load<ApiConfig>('apiConfig');
    if (!apiConfig || !apiConfig.apiKey) {
      throw new Error('API-Konfiguration fehlt. Bitte im Popup konfigurieren.');
    }

    const aiService = this.createAIService(apiConfig);
    const prompt = this.buildPostPrompt(post, post.addressForm);

    Logger.info('[PostOptimizer] Sending to AI...', { provider: apiConfig.provider });

    const optimizedContent = await aiService.generateText(prompt);

    Logger.info('[PostOptimizer] Post optimization complete', { 
      originalLength: post.content.length,
      optimizedLength: optimizedContent.length 
    });

    return optimizedContent;
  }

  /**
   * Erstellt einen spezifischen Prompt für Posts
   */
  private static buildPostPrompt(post: LinkedInArticle, addressForm?: 'du' | 'sie'): string {
    // Bestimme die Ansprache-Form
    const useDu = addressForm === 'du' || addressForm !== 'sie'; // Default: 'du'
    return `# AUFGABE: Optimiere diesen LinkedIn-Post

## KONTEXT
Du bist ein Experte für erfolgreiche LinkedIn-Posts. Deine Aufgabe ist es, einen Post zu optimieren, um mehr Engagement, Reichweite und Wert zu erzielen.

## ANSPRACHE-FORM
${useDu ? '**WICHTIG:** Verwende die "Du"-Form (du/deine/dein) für die Ansprache der Leser.' : '**WICHTIG:** Verwende die "Sie"-Form (Sie/Ihre/Ihr) für die Ansprache der Leser.'}

## DEIN POST (der optimiert werden soll)
${post.content || '(Noch kein Post vorhanden)'}

## WICHTIG: Unterschied zwischen Post und Artikel

### Post:
- ✅ **Kurz und prägnant** - max. 2000 Zeichen (LinkedIn-Limit für Posts)
- ✅ **Direkt und klar** - kommt schnell zum Punkt
- ✅ **Engagement-orientiert** - lädt zum Kommentieren und Teilen ein
- ✅ **Persönlich** - zeigt Persönlichkeit und Authentizität
- ✅ **Wertvoll** - bietet echten Mehrwert für die Zielgruppe
- ✅ **Hashtags möglich** - kann relevante Hashtags enthalten (max. 3-5)
- ✅ **Call-to-Action** - kann eine klare Aufforderung enthalten

### Was einen guten Post ausmacht:
1. **Starker Einstieg** - fesselt sofort die Aufmerksamkeit (erste 1-2 Sätze)
2. **Klare Hauptaussage** - der Kernpunkt ist sofort erkennbar
3. **Persönliche Note** - zeigt Persönlichkeit und Authentizität
4. **Mehrwert** - bietet echten Nutzen: Tipps, Insights, Erfahrungen, Fragen
5. **Engagement** - lädt zum Kommentieren, Teilen oder Weiterdenken ein
6. **Struktur** - gut lesbar mit Absätzen, Aufzählungen oder kurzen Sätzen

### Struktur eines guten Posts:
1. **Hook** (1-2 Sätze): Fesselnder Einstieg, der Neugier weckt
2. **Hauptteil** (3-5 Sätze): Die Kernaussage mit Details, Beispielen oder Erfahrungen
3. **Call-to-Action** (1 Satz): Frage, Aufforderung zum Kommentieren oder Teilen

### Beispiele für gute Posts:

**Beispiel 1 (Persönliche Erfahrung):**
"Vor 3 Jahren habe ich meinen ersten Job gekündigt, ohne einen neuen zu haben. Viele dachten, ich sei verrückt. Heute weiß ich: Es war die beste Entscheidung meines Lebens. Was ich dabei gelernt habe: [Kernaussage]. Was denkst du? Hast du ähnliche Erfahrungen gemacht?"

**Beispiel 2 (Tipp/Insight):**
"5 Fehler, die ich beim Networking gemacht habe (und wie du sie vermeidest): 1. [Tipp] 2. [Tipp] 3. [Tipp] 4. [Tipp] 5. [Tipp] Welcher Punkt spricht dich am meisten an?"

**Beispiel 3 (Frage/Meinung):**
"Was denkst du: Ist es besser, ein Generalist oder ein Spezialist zu sein? Aus meiner Erfahrung [Perspektive]. Wie siehst du das?"

### Was VERMEIDEN:
- ❌ **Zu lang** - mehr als 2000 Zeichen (LinkedIn-Limit)
- ❌ **Zu viele Hashtags** - max. 3-5 relevante Hashtags
- ❌ **Marketing-Sprech** - zu verkaufsorientiert oder werblich
- ❌ **Generische Floskeln** - "Sehr gut!", "Interessant!" ohne Kontext
- ❌ **Unklare Aussage** - der Leser weiß nicht, worum es geht
- ❌ **Kein Mehrwert** - bietet keine Tipps, Insights oder Erfahrungen
- ❌ **Schlechte Struktur** - keine Absätze, zu lange Sätze, schwer lesbar

### Ton & Stil:
- Authentisch und persönlich
- Professionell aber zugänglich
- Direkt und klar
- Wertvoll und hilfreich
- Engagement-orientiert

## AUSGABE
Gib NUR den optimierten Post aus, ohne Kommentare oder Erklärungen.
Maximal 2000 Zeichen.
Der Text muss in der GLEICHEN SPRACHE wie das Original sein! KEINE ÜBERSETZUNG!
Der Post sollte direkt verwendbar sein und Engagement fördern.

## QUALITÄTSKONTROLLE (VOR AUSGABE):
✓ Prüfe dass der Post kurz ist (max. 2000 Zeichen)
✓ Prüfe dass der Post einen starken Einstieg hat
✓ Prüfe dass der Post eine klare Hauptaussage hat
✓ Prüfe dass der Post Mehrwert bietet
✓ Prüfe dass der Post Engagement fördert (Frage oder Call-to-Action)
✓ Prüfe Rechtschreibung
✓ Prüfe dass der Post natürlich und authentisch klingt
✓ Prüfe dass Hashtags sparsam verwendet werden (max. 3-5)
✓ Prüfe dass die Sprache beibehalten wurde
✓ Prüfe dass der Ton professionell aber zugänglich ist`;
  }

  /**
   * Erstellt den AI-Service basierend auf der Konfiguration
   */
  private static createAIService(apiConfig: ApiConfig): AIService {
    if (apiConfig.provider === 'chatgpt') {
      return new ChatGPTProvider(apiConfig.apiKey, apiConfig.model || 'gpt-4');
    } else {
      return new ClaudeProvider(apiConfig.apiKey, apiConfig.model || 'claude-3-5-sonnet-20241022');
    }
  }
}

