import { LinkedInArticle } from '../models/LinkedInArticle';
import { LinkedInSettings } from '../models/LinkedInSettings';
import { Logger } from '../../../shared/utils/logger';
import { AIService } from '../../../shared/services/AIService';
import { ChatGPTProvider } from '../../../shared/services/ChatGPTProvider';
import { ClaudeProvider } from '../../../shared/services/ClaudeProvider';
import { StorageService } from '../../../shared/services/StorageService';
import { ApiConfig } from '../../../shared/models/ApiConfig';

/**
 * Service zur Optimierung von LinkedIn Chat-Nachrichten
 */
export class ChatOptimizer {
  
  /**
   * Optimiert oder generiert eine LinkedIn Chat-Nachricht basierend auf dem Chat-Verlauf
   */
  static async optimizeChat(chatMessage: LinkedInArticle, chatHistory?: string, chatGoal?: string): Promise<string> {
    Logger.info('[ChatOptimizer] Starting chat optimization...', { 
      hasHistory: !!chatHistory, 
      chatGoal 
    });

    const apiConfig = await StorageService.load<ApiConfig>('apiConfig');
    if (!apiConfig || !apiConfig.apiKey) {
      throw new Error('API-Konfiguration fehlt. Bitte im Popup konfigurieren.');
    }

    const linkedInSettings = await StorageService.load<LinkedInSettings>('linkedin_settings');
    const chatGoalFromSettings = linkedInSettings?.chatGoal;
    const chatGoalCustom = linkedInSettings?.chatGoalCustom;
    const chatGoalSalesProduct = linkedInSettings?.chatGoalSalesProduct;

    // Verwende Chat-Ziel aus Parameter oder Settings
    const actualChatGoal = chatGoal || chatGoalFromSettings;

    const aiService = this.createAIService(apiConfig);
    const prompt = this.buildChatPrompt(chatMessage, chatHistory, actualChatGoal, chatGoalCustom, chatGoalSalesProduct, chatMessage.addressForm);

    Logger.info('[ChatOptimizer] Sending to AI...', { provider: apiConfig.provider });

    const optimizedContent = await aiService.generateText(prompt);

    Logger.info('[ChatOptimizer] Chat optimization complete', { 
      originalLength: chatMessage.content.length,
      optimizedLength: optimizedContent.length 
    });

    return optimizedContent;
  }

  /**
   * Erstellt einen spezifischen Prompt für Chat-Nachrichten
   */
  private static buildChatPrompt(
    chatMessage: LinkedInArticle, 
    chatHistory?: string, 
    chatGoal?: string,
    chatGoalCustom?: string,
    chatGoalSalesProduct?: string,
    addressForm?: 'du' | 'sie'
  ): string {
    // Bestimme die Ansprache-Form
    const useDu = addressForm === 'du' || addressForm !== 'sie'; // Default: 'du'
    // Wenn Chat-Verlauf vorhanden ist, generiere eine neue Antwort
    if (chatHistory) {
      // Ziel-Beschreibung basierend auf chatGoal
      let goalDescription = '';
      let salesProduct = '';
      let actualChatGoal = chatGoal;
      
      // Prüfe ob chatGoal das Format "sales:Produkt" hat
      if (chatGoal && chatGoal.startsWith('sales:')) {
        salesProduct = chatGoal.substring(6); // Entferne "sales:" Präfix
        actualChatGoal = 'sales';
      } else if (actualChatGoal === 'sales' && chatGoalSalesProduct) {
        salesProduct = chatGoalSalesProduct;
      }
      
      // Verwende custom goal falls vorhanden
      if (actualChatGoal === 'custom' && chatGoalCustom) {
        actualChatGoal = chatGoalCustom;
      }
      
      if (actualChatGoal) {
        const goalDescriptions: Record<string, string> = {
          'networking': '**Ziel: Networking** - Die Konversation soll dazu führen, dass ein professioneller Kontakt aufgebaut wird. Die Antworten sollten Beziehungen stärken und Möglichkeiten für zukünftige Zusammenarbeit eröffnen.',
          'sales': salesProduct 
            ? `**Ziel: Verkauf** - Die Konversation soll dazu führen, dass "${salesProduct}" verkauft wird. Die Antworten sollten Interesse wecken, Bedürfnisse identifizieren und sanft zum Verkauf führen, ohne aufdringlich zu sein. Die Antworten sollten natürlich auf das Produkt/Service eingehen, wenn es zum Kontext passt. WICHTIG: Erwähne das Produkt/Service nur, wenn es NATÜRLICH in den Konversationsfluss passt - nicht in jeder Nachricht! WICHTIG: Gehe ZUERST auf die letzte Nachricht ein, bevor du das Produkt erwähnst.`
            : '**Ziel: Verkauf** - Die Konversation soll dazu führen, dass ein Produkt oder Service verkauft wird. Die Antworten sollten Interesse wecken, Bedürfnisse identifizieren und sanft zum Verkauf führen, ohne aufdringlich zu sein. WICHTIG: Gehe ZUERST auf die letzte Nachricht ein, bevor du verkaufst.',
          'collaboration': '**Ziel: Kooperation** - Die Konversation soll dazu führen, dass eine Zusammenarbeit oder Partnerschaft entsteht. Die Antworten sollten gemeinsame Interessen hervorheben und Möglichkeiten für Kooperationen aufzeigen.',
          'job-inquiry': '**Ziel: Job-Anfrage** - Die Konversation soll dazu führen, dass ein Stellenangebot gemacht oder eine Bewerbung eingereicht wird. Die Antworten sollten professionell sein und Interesse an einer beruflichen Zusammenarbeit zeigen.',
          'information': '**Ziel: Information** - Die Konversation soll dazu führen, dass spezifische Informationen eingeholt werden. Die Antworten sollten Fragen stellen und um Informationen bitten, ohne zu aufdringlich zu sein.'
        };
        goalDescription = goalDescriptions[actualChatGoal] || `**Ziel: ${actualChatGoal}** - Die Konversation soll zu diesem spezifischen Ziel führen. Die Antworten sollten natürlich und organisch zu diesem Ziel hinführen.`;
      }

      return `# AUFGABE: Generiere eine passende kurze Antwort für diesen LinkedIn Chat

## KONTEXT
Du bist ein Experte für professionelle LinkedIn Chat-Nachrichten. Deine Aufgabe ist es, eine passende kurze Antwort basierend auf dem Chat-Verlauf zu generieren.

${actualChatGoal ? goalDescription + '\n\n**WICHTIG:** Die Antworten müssen natürlich und organisch zu diesem Ziel hinführen, ohne aufdringlich oder zu direkt zu sein. Der Konversationsfluss sollte authentisch bleiben.\n' : ''}

## CHAT-VERLAUF (chronologisch, älteste zuerst)
Format: "Du: Nachricht" = Nachricht vom aktuellen Benutzer (dir)
Format: "Name: Nachricht" = Nachricht von der anderen Person
${chatHistory}

## WICHTIG: KONTEXT VERSTEHEN
- **"Du" = DU (der aktuelle Benutzer)** - das sind deine eigenen Nachrichten
- **"Name" = DIE ANDERE PERSON** - das sind Nachrichten von deinem Gesprächspartner
- **Lies den Chat-Verlauf GENAU** - verstehe wer was gesagt hat
- **Verwechsle NICHT die Personen** - "Du" bist immer der aktuelle Benutzer, nicht die andere Person
- **Identifiziere die LETZTE Nachricht** - das ist die Nachricht, auf die du antworten sollst
- **Prüfe den ABSENDER der letzten Nachricht:**
  - Wenn die letzte Nachricht mit "Du:" beginnt → Die letzte Nachricht ist von DIR. Schaue dir die VORLETZTE Nachricht an (die von der anderen Person) und antworte darauf.
  - Wenn die letzte Nachricht mit "Name:" beginnt → Die letzte Nachricht ist von der ANDEREN PERSON. Antworte direkt auf diese Nachricht.
- **Beziehe dich auf den INHALT der letzten Nachricht** - nicht auf falsche Annahmen oder frühere Nachrichten
- **NIEMALS verwechseln** - "Du" bist immer der aktuelle Benutzer, nicht die andere Person
- **KRITISCH: Personen-Informationen nicht vermischen**
  - Wenn "Du" etwas über dich selbst gesagt hast (z.B. "Ich bin selbstständig"), dann ist das DEINE Information, nicht die der anderen Person
  - Wenn die andere Person etwas über sich selbst gesagt hat (z.B. "Ich bin bei Hyundai"), dann ist das IHRE Information, nicht deine
  - NIEMALS der anderen Person Eigenschaften zuschreiben, die du selbst hast
  - NIEMALS dir selbst Eigenschaften zuschreiben, die die andere Person hat

## ANSPRACHE-FORM
${useDu ? '**WICHTIG:** Verwende die "Du"-Form (du/deine/dein).' : '**WICHTIG:** Verwende die "Sie"-Form (Sie/Ihre/Ihr).'}

## DEINE AUFGABE
Generiere eine kurze, passende Antwort auf die **LETZTE Nachricht** im Chat-Verlauf. Die Antwort sollte:
- **KORREKT auf die letzte Nachricht eingehen** - verstehe den Kontext richtig
- **Die richtige Person ansprechen** - verwechsle nicht, wer was gesagt hat
- **Die richtige Ansprache verwenden** - ${useDu ? 'Du/Deine/Dein' : 'Sie/Ihre/Ihr'} (${useDu ? 'informell' : 'formell'})
- Kurz und prägnant sein (max. 2-3 Sätze)
- Professionell aber freundlich klingen
- Natürlich und authentisch wirken
- In der gleichen Sprache wie der Chat-Verlauf sein
- **Kontextbezogen** - bezieht sich KORREKT auf den Chat-Verlauf
${actualChatGoal ? `- **Zielorientiert** - führt natürlich zum Ziel "${actualChatGoal}" hin, ohne aufdringlich zu sein${salesProduct ? ` (Produkt/Service: "${salesProduct}")` : ''}` : ''}

### Was eine gute Chat-Antwort ausmacht:
- ✅ **Direkt und persönlich** - 1:1 Kommunikation
- ✅ **Kurz und prägnant** - max. 2-3 Sätze (100-300 Zeichen)
- ✅ **Professionell aber freundlich** - angemessener Ton für geschäftliche Kommunikation
- ✅ **Relevant** - geht auf die letzte Nachricht ein
- ✅ **Keine Hashtags** - Chat-Nachrichten haben keine Hashtags
- ✅ **Emojis sparsam** - nur wenn es passt (max. 1-2)
- ✅ **Keine Call-to-Actions** - direkte Kommunikation, keine Marketing-Sprache

### Beispiele für gute Chat-Antworten:

**Beispiel 1 (Zustimmung):**
"Das klingt interessant! Gerne können wir uns dazu austauschen. Passt nächste Woche?"

**Beispiel 2 (Frage beantworten):**
"Ja, das passt gut. Ich schlage Dienstag um 14 Uhr vor. Wie sieht es bei dir aus?"

**Beispiel 3 (Dankbarkeit):**
"Vielen Dank für die Info! Das hilft mir sehr weiter. Ich melde mich bei dir, sobald ich mehr weiß."

### Was VERMEIDEN:
- ❌ **Zu lang** - mehr als 3 Sätze
- ❌ **Marketing-Sprech** - "Lass uns gemeinsam daran arbeiten..."
- ❌ **Generische Floskeln** - "Hoffe es geht dir gut!" (ohne Kontext)
- ❌ **Hashtags** - Chat-Nachrichten haben keine Hashtags
- ❌ **Zu viele Emojis** - max. 1-2, nur wenn es passt
- ❌ **Unprofessionell** - zu casual oder unhöflich
- ❌ **Unklar** - der Empfänger weiß nicht, was du willst
- ❌ **Kein Bezug zum Chat** - Antwort hat nichts mit dem Verlauf zu tun
- ❌ **FALSCHE KONTEXT-ANNAHMEN** - verwechsle nicht, wer was gesagt hat
- ❌ **Personenverwechslung** - achte darauf, wer der Absender jeder Nachricht ist
- ❌ **Zu früher Verkauf** - erwähne Produkte/Services nur, wenn es NATÜRLICH in den Kontext passt
- ❌ **KRITISCH: Personen-Informationen vermischen** - schreibe der anderen Person NIEMALS Eigenschaften zu, die du selbst hast (z.B. "Du bist selbstständig" wenn DU selbstständig bist, nicht die andere Person)
- ❌ **Falsche Annahmen über die andere Person** - basiere deine Antwort NUR auf dem, was die andere Person tatsächlich gesagt hat, nicht auf deinen eigenen Informationen

## AUSGABE
Gib NUR die generierte Chat-Antwort aus, ohne Kommentare oder Erklärungen.
Maximal 300 Zeichen (2-3 Sätze).
Der Text muss in der GLEICHEN SPRACHE wie der Chat-Verlauf sein! KEINE ÜBERSETZUNG!
Die Antwort muss professionell, klar, direkt und auf den Chat-Verlauf bezogen sein!

## QUALITÄTSKONTROLLE (VOR AUSGABE):
✓ Prüfe dass die Antwort kurz ist (max. 2-3 Sätze, 100-300 Zeichen)
✓ Prüfe dass die Antwort KORREKT auf die LETZTE Nachricht eingeht
✓ Prüfe dass du die RICHTIGE Person ansprichst (nicht verwechselt)
✓ Prüfe dass der KONTEXT richtig verstanden wurde (wer hat was gesagt?)
✓ **KRITISCH: Prüfe dass du der anderen Person KEINE Eigenschaften zuschreibst, die du selbst hast**
✓ **KRITISCH: Prüfe dass du dir selbst KEINE Eigenschaften zuschreibst, die die andere Person hat**
✓ Prüfe Rechtschreibung
✓ Prüfe dass die Antwort natürlich klingt
✓ Prüfe dass keine Hashtags enthalten sind
✓ Prüfe dass Emojis sparsam verwendet werden (max. 1-2)
✓ Prüfe dass die Sprache beibehalten wurde
✓ Prüfe dass der Ton professionell aber freundlich ist
✓ Prüfe dass keine falschen Annahmen über die andere Person gemacht wurden
✓ Prüfe dass alle Informationen über die andere Person NUR aus deren eigenen Nachrichten stammen`;
    }
    
    // Fallback: Wenn kein Chat-Verlauf vorhanden ist, optimiere die Nachricht direkt
    return `# AUFGABE: Optimiere diese LinkedIn Chat-Nachricht

## KONTEXT
Du bist ein Experte für professionelle LinkedIn Chat-Nachrichten. Deine Aufgabe ist es, eine Chat-Nachricht zu optimieren.

## DEINE NACHRICHT (die optimiert werden soll)
${chatMessage.content}

## DEINE AUFGABE
Optimiere diese Chat-Nachricht. Die optimierte Version sollte:
- Kurz und prägnant sein (max. 2-3 Sätze, 100-300 Zeichen)
- Professionell aber freundlich klingen
- Natürlich und authentisch wirken
- In der gleichen Sprache wie das Original sein
- Klar und direkt sein

## AUSGABE
Gib NUR die optimierte Chat-Nachricht aus, ohne Kommentare oder Erklärungen.
Maximal 300 Zeichen (2-3 Sätze).
Der Text muss in der GLEICHEN SPRACHE wie das Original sein! KEINE ÜBERSETZUNG!`;
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

