/**
 * Instagram-Einstellungen
 */
export type InstagramMood = 'neutral' | 'friendly' | 'professional' | 'casual' | 'enthusiastic' | 'supportive';

export interface InstagramSettings {
  mood?: InstagramMood; // Stimmung/Mood für Kommentar-Optimierung
}

