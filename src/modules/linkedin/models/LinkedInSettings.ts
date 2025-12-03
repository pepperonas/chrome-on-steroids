/**
 * LinkedIn-Einstellungen
 */
export type LinkedInChatGoal = 'networking' | 'sales' | 'collaboration' | 'job-inquiry' | 'information' | 'custom';

export interface LinkedInSettings {
  optimizeTitle?: boolean; // Titel/Headline auch optimieren
  useStyling?: boolean; // Styling verwenden (fett, kursiv, Code, Zitate)
  highlightingIntensity?: 'low' | 'medium' | 'high'; // Intensität der Formatierung
  chatGoal?: LinkedInChatGoal; // Ziel der Chat-Konversation
  chatGoalCustom?: string; // Benutzerdefiniertes Chat-Ziel (wenn chatGoal === 'custom')
  chatGoalSalesProduct?: string; // Was verkauft werden soll (wenn chatGoal === 'sales')
}

