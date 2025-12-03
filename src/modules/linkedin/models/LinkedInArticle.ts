/**
 * LinkedIn Artikel-Daten
 */
export interface LinkedInArticle {
  title?: string;
  content: string;
  addressForm?: 'du' | 'sie'; // Ansprache-Form: 'du' für Du/Deine, 'sie' für Sie/Ihre
}

