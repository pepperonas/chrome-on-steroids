import { AIService } from './AIService';
import { Project } from '../models/Project';
import { UserProfile } from '../models/UserProfile';
import { Logger } from '../utils/logger';
import { CONSTANTS } from '../utils/constants';

export class ChatGPTProvider extends AIService {
  private readonly baseUrl = CONSTANTS.API_ENDPOINTS.CHATGPT;

  async generateCoverLetter(
    project: Project,
    userProfile: UserProfile
  ): Promise<string> {
    const prompt = this.buildPrompt(project, userProfile);

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model || CONSTANTS.DEFAULT_MODELS.CHATGPT,
          messages: [
            {
              role: 'system',
              content: 'Du bist ein Top-Bewerbungscoach für Freelancer in der Tech-Branche. Du schreibst präzise, überzeugende Anschreiben ohne Floskeln. Du kennst den deutschen Freelancer-Markt und weißt, wie man sich auf Plattformen wie freelancermap.de erfolgreich bewirbt.\n\nKRITISCH: Du darfst NICHTS erfinden! Verwende NUR die Informationen, die im Benutzerprofil angegeben sind. Erfinde keine Projekte, Rollen, Technologien, Firmen oder Erfahrungen. Wenn etwas nicht im Profil steht, erwähne es NICHT.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.8, // Höher für kreativere, persönlichere Texte
          max_tokens: 1500, // Mehr Tokens für ausführlichere Anschreiben
          presence_penalty: 0.3, // Reduziert Wiederholungen
          frequency_penalty: 0.3 // Fördert Vielfalt im Wortschatz
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Ungültige API-Antwort: Keine Nachricht gefunden');
      }

      return data.choices[0].message.content;

    } catch (error) {
      Logger.error('ChatGPT API Error:', error);
      throw new Error('Fehler bei der Generierung des Anschreibens mit ChatGPT');
    }
  }

  async validateApiKey(): Promise<boolean> {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

