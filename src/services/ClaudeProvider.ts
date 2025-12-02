import { AIService } from './AIService';
import { Project } from '../models/Project';
import { UserProfile } from '../models/UserProfile';
import { Logger } from '../utils/logger';
import { CONSTANTS } from '../utils/constants';

/**
 * Claude API Provider - Einfache Implementierung wie ChatGPT
 */
export class ClaudeProvider extends AIService {
  private readonly baseUrl = CONSTANTS.API_ENDPOINTS.CLAUDE;

  // Funktionierende Modelle (getestet Dezember 2025)
  private readonly modelsToTry = [
    'claude-3-haiku-20240307',        // ✅ Funktioniert! Schnell & günstig
    'claude-3-opus-20240229'          // Opus (falls Haiku nicht verfügbar)
  ];

  async generateCoverLetter(
    project: Project,
    userProfile: UserProfile
  ): Promise<string> {
    const prompt = this.buildPrompt(project, userProfile);
    const apiKey = this.getCleanApiKey();

    // Erstelle Liste der zu probierenden Modelle
    // Beginne mit dem konfigurierten Modell, dann die Fallbacks
    const modelsToTry = [
      this.model,
      ...this.modelsToTry
    ].filter((m, i, arr) => m && arr.indexOf(m) === i); // Duplikate entfernen

    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    };

    let lastError: Error | null = null;

    for (const model of modelsToTry) {
      try {
        Logger.info(`Generating with model: ${model}`);

        const response = await fetch(this.baseUrl, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({
            model: model,
            max_tokens: 2000, // Ausreichend für 300 Wörter Anschreiben
            temperature: 0.8, // Höher für kreativere Texte
            system: 'Du bist ein Top-Bewerbungscoach für Freelancer in der Tech-Branche. Du schreibst präzise, überzeugende Anschreiben ohne Floskeln. Du kennst den deutschen Freelancer-Markt und weißt, wie man sich auf Plattformen wie freelancermap.de erfolgreich bewirbt.\n\nKRITISCH: Du darfst NICHTS erfinden! Verwende NUR die Informationen, die im Benutzerprofil angegeben sind. Erfinde keine Projekte, Rollen, Technologien, Firmen oder Erfahrungen. Wenn etwas nicht im Profil steht, erwähne es NICHT.',
            messages: [{
              role: 'user',
              content: prompt
            }]
          })
        });

        // Auth-Fehler: Sofort abbrechen
        if (response.status === 401 || response.status === 403) {
          throw new Error(`API Key ungültig: ${response.status}`);
        }

        // Modell nicht gefunden: Nächstes probieren
        if (response.status === 404) {
          Logger.warn(`Model ${model} not found, trying next`);
          lastError = new Error(`Model ${model} nicht verfügbar`);
          continue;
        }

        if (!response.ok) {
          Logger.warn(`Model ${model} failed: ${response.status}`);
          lastError = new Error(`${model}: ${response.status}`);
          continue;
        }

        const data = await response.json();

        if (!data.content || !data.content[0] || !data.content[0].text) {
          Logger.warn(`Model ${model} returned invalid response`);
          lastError = new Error(`${model}: Ungültige Antwort`);
          continue;
        }

        Logger.info(`✅ Generated successfully with model: ${model}`);
        return data.content[0].text;

      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('401') || error.message.includes('403') || error.message.includes('ungültig')) {
            throw error;
          }
          Logger.warn(`Model ${model} error:`, error.message);
          lastError = error;
        }
      }
    }

    // Alle Modelle fehlgeschlagen
    throw lastError || new Error('Kein Claude-Modell verfügbar');
  }

  async validateApiKey(): Promise<boolean> {
    const apiKey = this.getCleanApiKey();

    // Validiere API Key Format
    if (!apiKey) {
      throw new Error('API Key ist leer');
    }

    if (!apiKey.startsWith('sk-ant-')) {
      throw new Error(`Ungültiges Format. Key muss mit sk-ant- beginnen.`);
    }

    Logger.info('Validating Claude API Key...', {
      keyPrefix: apiKey.substring(0, 15) + '...',
      keyLength: apiKey.length
    });

    // Header für Browser-basierte Anfragen (Chrome Extension)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'  // Erforderlich für Browser!
    };

    let lastError: Error | null = null;

    for (const model of this.modelsToTry) {
      try {
        Logger.info(`Testing model: ${model}`);

        const response = await fetch(this.baseUrl, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({
            model: model,
            max_tokens: 10,
            messages: [{
              role: 'user',
              content: 'Hi'
            }]
          })
        });

        Logger.info(`Response for ${model}:`, {
          status: response.status,
          ok: response.ok
        });

        // Erfolg!
        if (response.ok) {
          const data = await response.json();
          if (data.content && Array.isArray(data.content)) {
            Logger.info(`✅ API Key valid with model: ${model}`);
            return true;
          }
        }

        // Auth-Fehler: Sofort abbrechen
        if (response.status === 401 || response.status === 403) {
          const errorText = await response.text();
          let errorDetail = '';
          try {
            const errorJson = JSON.parse(errorText);
            errorDetail = errorJson.error?.message || errorJson.message || errorText;
          } catch {
            errorDetail = errorText;
          }
          
          Logger.error(`Auth failed`, { 
            status: response.status, 
            error: errorDetail
          });
          
          throw new Error(`API Key ungültig: ${errorDetail.substring(0, 80)}`);
        }

        // Anderer Fehler (z.B. Modell nicht verfügbar): Nächstes Modell
        Logger.warn(`Model ${model} failed, trying next`, { status: response.status });
        lastError = new Error(`${model}: Status ${response.status}`);

      } catch (error) {
        if (error instanceof Error) {
          // Auth-Fehler sofort abbrechen
          if (error.message.includes('ungültig') || error.message.includes('401') || error.message.includes('403')) {
            throw error;
          }
          Logger.warn(`Model ${model} error:`, error.message);
          lastError = error;
        }
      }
    }

    // Alle Modelle fehlgeschlagen
    if (lastError) {
      throw new Error(`Kein Modell verfügbar: ${lastError.message}`);
    }

    throw new Error('Validierung fehlgeschlagen');
  }

  /**
   * Bereinigt den API Key
   */
  private getCleanApiKey(): string {
    let key = this.apiKey;
    
    // Falls Objekt, zu String konvertieren
    if (typeof key === 'object' && key !== null) {
      key = String(key);
    }
    
    // Trimmen
    return String(key || '').trim();
  }
}
