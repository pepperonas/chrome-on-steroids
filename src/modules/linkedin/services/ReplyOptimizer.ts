import { LinkedInArticle } from '../models/LinkedInArticle';
import { Logger } from '../../../shared/utils/logger';
import { AIService } from '../../../shared/services/AIService';
import { ChatGPTProvider } from '../../../shared/services/ChatGPTProvider';
import { ClaudeProvider } from '../../../shared/services/ClaudeProvider';
import { StorageService } from '../../../shared/services/StorageService';
import { ApiConfig } from '../../../shared/models/ApiConfig';

/**
 * Service zur Optimierung von LinkedIn Antworten auf Kommentare
 */
export class ReplyOptimizer {
  
  /**
   * Optimiert eine LinkedIn-Antwort auf einen Kommentar basierend auf dem Original-Post und dem Kommentar
   */
  static async optimizeReply(
    reply: LinkedInArticle, 
    originalPostContext?: string,
    parentCommentContext?: string
  ): Promise<string> {
    Logger.info('[ReplyOptimizer] Starting reply optimization...', { 
      hasPostContext: !!originalPostContext,
      hasCommentContext: !!parentCommentContext,
      hasUserInput: !!reply.content 
    });

    const apiConfig = await StorageService.load<ApiConfig>('apiConfig');
    if (!apiConfig || !apiConfig.apiKey) {
      throw new Error('API-Konfiguration fehlt. Bitte im Popup konfigurieren.');
    }

    const aiService = this.createAIService(apiConfig);
    const prompt = this.buildReplyPrompt(reply, originalPostContext, parentCommentContext, reply.addressForm);

    Logger.info('[ReplyOptimizer] Sending to AI...', { provider: apiConfig.provider });

    const optimizedContent = await aiService.generateText(prompt);

    Logger.info('[ReplyOptimizer] Reply optimization complete', { 
      originalLength: reply.content.length,
      optimizedLength: optimizedContent.length 
    });

    return optimizedContent;
  }

  /**
   * Erstellt einen spezifischen Prompt für Antworten auf Kommentare
   */
  private static buildReplyPrompt(
    reply: LinkedInArticle, 
    originalPostContext?: string,
    parentCommentContext?: string,
    addressForm?: 'du' | 'sie'
  ): string {
    // Bestimme die Ansprache-Form
    const useDu = addressForm === 'du' || addressForm !== 'sie'; // Default: 'du'
    const hasUserInput = reply.content && reply.content.trim().length > 0;
    
    // Wenn weder Post-Kontext noch Kommentar-Kontext vorhanden ist, aber Text eingegeben wurde, optimiere nur den Text
    if (!originalPostContext && !parentCommentContext && !hasUserInput) {
      throw new Error('Post-Kontext und Kommentar-Kontext fehlen und keine Antwort vorhanden. Bitte öffne einen Post mit Kommentaren.');
    }
    
    const userInputSection = hasUserInput ? `
## DEINE ANTWORT (die optimiert werden soll)
${reply.content}

**WICHTIG:** 
- Diese Antwort wurde vom Benutzer bereits eingegeben und soll optimiert werden
- BEHALTE die Kernaussage und den Gedanken des Benutzers bei
- VERBESSERE die Formulierung, Struktur und Klarheit
- STELLE den Bezug zum Original-Kommentar her, wenn noch nicht vorhanden
- Die optimierte Antwort soll die ursprüngliche Intention des Benutzers widerspiegeln, aber professioneller und wertvoller formuliert sein
- **Verwende die richtige Ansprache** - ${useDu ? 'Du/Deine/Dein' : 'Sie/Ihre/Ihr'} (${useDu ? 'informell' : 'formell'})
` : `
## HINWEIS
Der Benutzer hat noch keine Antwort eingegeben. Generiere eine passende Antwort basierend auf dem Original-Kommentar.
`;

    const contextSection = originalPostContext ? `
## ORIGINAL-POST (Kontext)
${originalPostContext}
` : '';

    const commentSection = parentCommentContext ? `
## ORIGINAL-KOMMENTAR (auf den geantwortet wird)
${parentCommentContext}

**WICHTIG:** Deine Antwort muss sich auf DIESEN Kommentar beziehen und relevant sein!
` : '';

    return `# AUFGABE: ${hasUserInput ? 'Optimiere diese' : 'Erstelle eine'} LinkedIn-Antwort auf einen Kommentar

## KONTEXT
Du bist ein Experte für erfolgreiche LinkedIn-Antworten auf Kommentare. Deine Aufgabe ist es, ${hasUserInput ? 'eine Antwort zu optimieren, die der Benutzer bereits eingegeben hat' : 'eine passende Antwort zu erstellen'}, die auf einen bestehenden Kommentar reagiert.

## ANSPRACHE-FORM
${useDu ? '**WICHTIG:** Verwende die "Du"-Form (du/deine/dein).' : '**WICHTIG:** Verwende die "Sie"-Form (Sie/Ihre/Ihr).'}

${contextSection}${commentSection}${userInputSection}

## WICHTIG: Unterschied zwischen Antwort auf Kommentar und eigenständigem Kommentar

### Antwort auf Kommentar:
- ✅ **Reagiert auf den Original-Kommentar** - bezieht sich direkt darauf
- ✅ **Kurz und prägnant** - max. 2-3 Sätze (100-300 Zeichen)
- ✅ **Relevant** - bezieht sich auf den Inhalt des Original-Kommentars
- ✅ **Wertvoll** - fügt echten Mehrwert hinzu (Perspektive, Erfahrung, Frage, Ergänzung, Klarstellung)
- ✅ **Kontextbezogen** - macht nur Sinn im Zusammenhang mit dem Original-Kommentar
- ✅ **Respektvoll** - bleibt höflich und konstruktiv, auch bei unterschiedlichen Meinungen
- ✅ **Keine Hashtags** - Antworten haben keine Hashtags
- ✅ **Keine Call-to-Actions** - keine Aufforderungen zum Teilen/Liken

### Was eine gute Antwort auf einen Kommentar ausmacht:
1. **Bezug zum Original-Kommentar** - zeigt, dass du den Kommentar gelesen und verstanden hast
2. **Kurze, prägnante Aussage** - direkt zum Punkt, keine langen Ausführungen
3. **Mehrwert** - fügt etwas hinzu: Perspektive, Erfahrung, Frage, Ergänzung, Klarstellung, konstruktive Kritik
4. **Natürlich und authentisch** - klingt wie eine echte menschliche Antwort
5. **Respektvoll** - bleibt höflich, auch bei unterschiedlichen Meinungen
${hasUserInput ? `6. **Beibehaltung der Kernaussage** - die ursprüngliche Intention und der Gedanke des Benutzers bleiben erhalten, nur die Formulierung wird verbessert` : ''}

### Struktur einer guten Antwort auf einen Kommentar:
1. **Bezug herstellen** (optional, 1 Satz): Kurze Referenz zum Kommentar
2. **Hauptaussage** (1-2 Sätze): Deine Antwort, Meinung, Erfahrung, Klarstellung oder Frage
3. **Optional: Ergänzung** (1 Satz): Falls relevant, zusätzlicher Punkt oder Frage

### Beispiele für gute Antworten auf Kommentare:

**Beispiel 1 (Klarstellung):**
"Danke für die Frage! Ich meinte damit [spezifische Klarstellung]. Wie siehst du das?"

**Beispiel 2 (Perspektive teilen):**
"Interessanter Punkt! Aus meiner Erfahrung ist [konkreter Punkt] auch wichtig. Was denkst du dazu?"

**Beispiel 3 (Frage beantworten):**
"Gute Frage! Bei uns funktioniert das so: [konkrete Antwort]. Wie handhabt ihr das?"

**Beispiel 4 (Zustimmung mit Ergänzung):**
"Absolut! Ergänzend würde ich noch [spezifischer Punkt] erwähnen."

### Was VERMEIDEN:
- ❌ **Generische Floskeln** - "Sehr gut!", "Interessant!", "Danke!" (ohne Mehrwert)
- ❌ **Selbstreferenzielle Texte** - "Als LinkedIn-Experte empfehle ich..." (klingt wie Spam)
- ❌ **Eigenständige Kommentare** - Texte, die wie ein eigener Kommentar klingen, ohne Bezug zum Original
- ❌ **Zu lang** - mehr als 3 Sätze
- ❌ **Kein Bezug zum Kommentar** - Antworten, die nichts mit dem Original-Kommentar zu tun haben
- ❌ **Unhöflich oder aggressiv** - bleibt respektvoll, auch bei unterschiedlichen Meinungen
- ❌ **Marketing-Sprech** - "Lass uns gemeinsam daran arbeiten..."
- ❌ **Hashtags** - Antworten haben keine Hashtags
- ❌ **Call-to-Actions** - keine Aufforderungen zum Teilen/Liken

### Ton & Stil:
- Authentisch und natürlich
- Respektvoll und konstruktiv
- Konkret statt vage
- Kurz und prägnant
- Relevant zum Original-Kommentar
- Höflich, auch bei unterschiedlichen Meinungen

## AUSGABE
Gib NUR die optimierte Antwort aus, ohne Kommentare oder Erklärungen.
Maximal 300 Zeichen (2-3 Sätze).
Der Text muss in der GLEICHEN SPRACHE wie das Original sein! KEINE ÜBERSETZUNG!
Die Antwort muss sich auf den Original-Kommentar beziehen und relevant sein!
${hasUserInput ? '**WICHTIG:** Die optimierte Antwort soll die ursprüngliche Aussage des Benutzers im Kontext des Kommentars verwerten und verbessern, nicht ersetzen!' : ''}

## QUALITÄTSKONTROLLE (VOR AUSGABE):
✓ Prüfe dass die Antwort kurz ist (max. 2-3 Sätze, 100-300 Zeichen)
✓ Prüfe dass die Antwort wertvoll ist (keine generischen Floskeln)
✓ Prüfe dass die Antwort sich auf den Original-Kommentar bezieht
✓ Prüfe dass die Antwort respektvoll ist
✓ Prüfe Rechtschreibung
✓ Prüfe dass die Antwort natürlich klingt
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

