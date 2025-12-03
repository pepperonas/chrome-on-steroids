import { LinkedInArticle } from '../models/LinkedInArticle';
import { Logger } from '../../../shared/utils/logger';
import { AIService } from '../../../shared/services/AIService';
import { ChatGPTProvider } from '../../../shared/services/ChatGPTProvider';
import { ClaudeProvider } from '../../../shared/services/ClaudeProvider';
import { StorageService } from '../../../shared/services/StorageService';
import { ApiConfig } from '../../../shared/models/ApiConfig';

/**
 * Service zur Optimierung von LinkedIn Kommentaren (erste Kommentare auf Posts)
 */
export class CommentOptimizer {
  
  /**
   * Optimiert einen LinkedIn-Kommentar basierend auf dem Original-Post
   */
  static async optimizeComment(comment: LinkedInArticle, originalPostContext?: string): Promise<string> {
    Logger.info('[CommentOptimizer] Starting comment optimization...', { 
      hasPostContext: !!originalPostContext,
      hasUserInput: !!comment.content 
    });

    const apiConfig = await StorageService.load<ApiConfig>('apiConfig');
    if (!apiConfig || !apiConfig.apiKey) {
      throw new Error('API-Konfiguration fehlt. Bitte im Popup konfigurieren.');
    }

    const aiService = this.createAIService(apiConfig);
    const prompt = this.buildCommentPrompt(comment, originalPostContext, comment.addressForm);

    Logger.info('[CommentOptimizer] Sending to AI...', { provider: apiConfig.provider });

    const optimizedContent = await aiService.generateText(prompt);

    Logger.info('[CommentOptimizer] Comment optimization complete', { 
      originalLength: comment.content.length,
      optimizedLength: optimizedContent.length 
    });

    return optimizedContent;
  }

  /**
   * Erstellt einen spezifischen Prompt für Kommentare
   */
  private static buildCommentPrompt(comment: LinkedInArticle, originalPostContext?: string, addressForm?: 'du' | 'sie'): string {
    // Bestimme die Ansprache-Form
    const useDu = addressForm === 'du' || addressForm !== 'sie'; // Default: 'du'
    const hasUserInput = comment.content && comment.content.trim().length > 0;
    
    // Wenn kein Post-Kontext vorhanden ist, aber Text eingegeben wurde, optimiere nur den Text
    if (!originalPostContext && !hasUserInput) {
      throw new Error('Post-Kontext fehlt und kein Kommentar-Text vorhanden. Bitte öffne einen Post und gib einen Kommentar ein.');
    }
    
    // Wenn kein Post-Kontext vorhanden ist, aber Text vorhanden ist, optimiere nur den Text
    if (!originalPostContext && hasUserInput) {
      return `# AUFGABE: Optimiere diesen LinkedIn-Kommentar

## KONTEXT
Du bist ein Experte für erfolgreiche LinkedIn-Kommentare. Deine Aufgabe ist es, einen Kommentar zu optimieren, den der Benutzer bereits eingegeben hat.

## ANSPRACHE-FORM
${useDu ? '**WICHTIG:** Verwende die "Du"-Form (du/deine/dein).' : '**WICHTIG:** Verwende die "Sie"-Form (Sie/Ihre/Ihr).'}

## DEIN KOMMENTAR (der optimiert werden soll)
${comment.content}

**WICHTIG:** 
- BEHALTE die Kernaussage und den Gedanken des Benutzers bei
- VERBESSERE die Formulierung, Struktur und Klarheit
- Die optimierte Version soll die ursprüngliche Intention widerspiegeln, aber professioneller formuliert sein
- **Verwende die richtige Ansprache** - ${useDu ? 'Du/Deine/Dein' : 'Sie/Ihre/Ihr'} (${useDu ? 'informell' : 'formell'})

## WICHTIG: Kommentar-Optimierung

### Was einen guten Kommentar ausmacht:
- ✅ **Kurz und prägnant** - max. 2-3 Sätze (100-300 Zeichen)
- ✅ **Wertvoll** - fügt echten Mehrwert hinzu (Perspektive, Erfahrung, Frage, Ergänzung)
- ✅ **Natürlich und authentisch** - klingt wie eine echte menschliche Antwort
- ✅ **Konkret statt vage** - spezifische Aussagen statt Floskeln

### Was VERMEIDEN:
- ❌ **Generische Floskeln** - "Sehr gut!", "Interessant!", "Danke fürs Teilen!" (ohne Mehrwert)
- ❌ **Selbstreferenzielle Texte** - "Als LinkedIn-Experte empfehle ich..." (klingt wie Spam)
- ❌ **Zu lang** - mehr als 3 Sätze
- ❌ **Marketing-Sprech** - "Lass uns gemeinsam daran arbeiten..."
- ❌ **Hashtags** - Kommentare haben keine Hashtags
- ❌ **Call-to-Actions** - keine Aufforderungen zum Teilen/Liken

### Ton & Stil:
- Authentisch und natürlich
- Respektvoll und konstruktiv
- Konkret statt vage
- Kurz und prägnant

## AUSGABE
Gib NUR den optimierten Kommentar aus, ohne Kommentare oder Erklärungen.
Maximal 300 Zeichen (2-3 Sätze).
Der Text muss in der GLEICHEN SPRACHE wie das Original sein! KEINE ÜBERSETZUNG!

## QUALITÄTSKONTROLLE (VOR AUSGABE):
✓ Prüfe dass der Kommentar kurz ist (max. 2-3 Sätze, 100-300 Zeichen)
✓ Prüfe dass der Kommentar wertvoll ist (keine generischen Floskeln)
✓ Prüfe Rechtschreibung
✓ Prüfe dass der Kommentar natürlich klingt
✓ Prüfe dass keine Hashtags enthalten sind
✓ Prüfe dass keine Call-to-Actions enthalten sind
✓ Prüfe dass die Sprache beibehalten wurde`;
    }
    
    const userInputSection = hasUserInput ? `
## DEIN KOMMENTAR (der optimiert werden soll)
${comment.content}

**WICHTIG:** 
- Dieser Kommentar wurde vom Benutzer bereits eingegeben und soll optimiert werden
- BEHALTE die Kernaussage und den Gedanken des Benutzers bei
- VERBESSERE die Formulierung, Struktur und Klarheit
- STELLE den Bezug zum Original-Post her, wenn noch nicht vorhanden
- Die optimierte Version soll die ursprüngliche Intention des Benutzers widerspiegeln, aber professioneller und wertvoller formuliert sein
- **Verwende die richtige Ansprache** - ${useDu ? 'Du/Deine/Dein' : 'Sie/Ihre/Ihr'} (${useDu ? 'informell' : 'formell'})
` : `
## HINWEIS
Der Benutzer hat noch keinen Kommentar eingegeben. Generiere eine passende Antwort basierend auf dem Original-Post.
`;

    return `# AUFGABE: ${hasUserInput ? 'Optimiere diesen' : 'Erstelle einen'} LinkedIn-Kommentar

## KONTEXT
Du bist ein Experte für erfolgreiche LinkedIn-Kommentare. Deine Aufgabe ist es, ${hasUserInput ? 'einen Kommentar zu optimieren, den der Benutzer bereits eingegeben hat' : 'einen passenden Kommentar zu erstellen'}, der auf einen bestehenden Post reagiert.

## ANSPRACHE-FORM
${useDu ? '**WICHTIG:** Verwende die "Du"-Form (du/deine/dein).' : '**WICHTIG:** Verwende die "Sie"-Form (Sie/Ihre/Ihr).'}

## ORIGINAL-POST (auf den kommentiert wird)
${originalPostContext}

**WICHTIG:** Dein Kommentar muss sich auf DIESEN Post beziehen und relevant sein!

${userInputSection}

## WICHTIG: Unterschied zwischen Kommentar und eigenständigem Post

### Kommentar:
- ✅ **Reagiert auf den Original-Post** - bezieht sich direkt darauf
- ✅ **Kurz und prägnant** - max. 2-3 Sätze (100-300 Zeichen)
- ✅ **Relevant** - bezieht sich auf den Inhalt des Original-Posts
- ✅ **Wertvoll** - fügt echten Mehrwert hinzu (Perspektive, Erfahrung, Frage, Ergänzung)
- ✅ **Kontextbezogen** - macht nur Sinn im Zusammenhang mit dem Original-Post
- ✅ **Keine Hashtags** - Kommentare haben keine Hashtags
- ✅ **Keine Call-to-Actions** - keine Aufforderungen zum Teilen/Liken

### Was einen guten Kommentar ausmacht:
1. **Bezug zum Original-Post** - zeigt, dass du den Post gelesen und verstanden hast
2. **Kurze, prägnante Aussage** - direkt zum Punkt, keine langen Ausführungen
3. **Mehrwert** - fügt etwas hinzu: Perspektive, Erfahrung, Frage, Ergänzung, konstruktive Kritik
4. **Natürlich und authentisch** - klingt wie eine echte menschliche Antwort
${hasUserInput ? `5. **Beibehaltung der Kernaussage** - die ursprüngliche Intention und der Gedanke des Benutzers bleiben erhalten, nur die Formulierung wird verbessert` : ''}

### Struktur eines guten Kommentars:
1. **Bezug herstellen** (optional, 1 Satz): Kurze Referenz zum Post
2. **Hauptaussage** (1-2 Sätze): Deine Antwort, Meinung, Erfahrung oder Frage
3. **Optional: Ergänzung** (1 Satz): Falls relevant, zusätzlicher Punkt oder Frage

### Beispiele für gute Kommentare:

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
- ❌ **Kein Bezug zum Post** - Kommentare, die nichts mit dem Original-Post zu tun haben
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
Gib NUR den optimierten Kommentar aus, ohne Kommentare oder Erklärungen.
Maximal 300 Zeichen (2-3 Sätze).
Der Text muss in der GLEICHEN SPRACHE wie das Original sein! KEINE ÜBERSETZUNG!

## QUALITÄTSKONTROLLE (VOR AUSGABE):
✓ Prüfe dass der Kommentar kurz ist (max. 2-3 Sätze, 100-300 Zeichen)
✓ Prüfe dass der Kommentar wertvoll ist (keine generischen Floskeln)
✓ Prüfe dass der Kommentar sich auf den Original-Post bezieht
✓ Prüfe Rechtschreibung
✓ Prüfe dass der Kommentar natürlich klingt
✓ Prüfe dass keine Hashtags enthalten sind
✓ Prüfe dass keine Call-to-Actions enthalten sind
✓ Prüfe dass die Sprache beibehalten wurde
${hasUserInput ? '✓ Prüfe dass die Kernaussage des Benutzers erhalten bleibt' : ''}`;
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

