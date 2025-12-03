import { Logger } from '../../../shared/utils/logger';
import { InstagramComment } from '../models/InstagramComment';

/**
 * DOM-Service für Instagram Kommentare
 */
export class InstagramDOMService {
  /**
   * Prüft ob wir auf Instagram sind
   */
  static isInstagramPage(): boolean {
    return window.location.hostname.includes('instagram.com');
  }

  /**
   * Prüft ob ein Kommentar-Editor sichtbar ist
   */
  static isCommentEditorVisible(): boolean {
    const selectors = [
      'textarea[aria-label*="Kommentieren"]',
      'textarea[aria-label*="kommentieren"]',
      'textarea[aria-label*="Comment"]',
      'textarea[placeholder*="Kommentieren"]',
      'textarea[placeholder*="kommentieren"]',
      'textarea[placeholder*="Comment"]'
    ];

    for (const selector of selectors) {
      const textarea = document.querySelector(selector) as HTMLTextAreaElement;
      if (textarea && textarea.offsetParent !== null) {
        Logger.info('[Instagram] Comment editor found with selector:', selector);
        return true;
      }
    }

    return false;
  }

  /**
   * Extrahiert den Original-Post, auf den geantwortet wird
   */
  static extractOriginalPostForComment(): string | null {
    try {
      // Suche nach dem Post-Content in der Nähe des Kommentar-Editors
      // Instagram verwendet verschiedene Selektoren für Post-Content
      const postContentSelectors = [
        'article h1', // Post-Beschreibung in <h1>
        'article span[dir="auto"]', // Post-Text in spans
        'article div[dir="auto"]', // Post-Text in divs
        'article p', // Post-Text in paragraphs
        '[data-testid="post-text"]', // Instagram Test-ID
        'article > div > div > div span', // Verschachtelte Struktur
        'article h1 + div span', // Nach Überschrift
        'article [role="button"] + div span' // Nach Buttons
      ];

      for (const selector of postContentSelectors) {
        try {
          const elements = document.querySelectorAll(selector);
          for (const element of Array.from(elements)) {
            const el = element as HTMLElement;
            // Prüfe ob Element sichtbar ist und Text enthält
            if (el.offsetParent !== null) {
              const text = el.innerText?.trim() || el.textContent?.trim() || '';
              // Mindestens 20 Zeichen, um relevante Posts zu finden
              // Aber nicht zu lang (max 1000 Zeichen), um nicht zu viel zu extrahieren
              if (text && text.length > 20 && text.length < 2000) {
                // Prüfe ob es nicht nur ein einzelnes Wort oder sehr kurzer Text ist
                const words = text.split(/\s+/).filter(w => w.length > 0);
                if (words.length >= 3) {
                  Logger.info('[Instagram] Original post found with selector:', selector, 'length:', text.length);
                  return text.substring(0, 1000); // Maximal 1000 Zeichen für den Kontext
                }
              }
            }
          }
        } catch (error) {
          Logger.debug('[Instagram] Error with selector:', selector, error);
        }
      }

      Logger.debug('[Instagram] No original post found for comment context');
      return null;
    } catch (error) {
      Logger.error('[Instagram] Error extracting original post:', error);
      return null;
    }
  }

  /**
   * Extrahiert Kommentar-Daten aus dem Textarea
   */
  static extractCommentData(): InstagramComment | null {
    try {
      const selectors = [
        'textarea[aria-label*="Kommentieren"]',
        'textarea[aria-label*="kommentieren"]',
        'textarea[aria-label*="Comment"]',
        'textarea[placeholder*="Kommentieren"]',
        'textarea[placeholder*="kommentieren"]',
        'textarea[placeholder*="Comment"]'
      ];

      let textarea: HTMLTextAreaElement | null = null;
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        for (const element of Array.from(elements)) {
          const el = element as HTMLTextAreaElement;
          if (el.offsetParent !== null) {
            textarea = el;
            Logger.info('[Instagram] Comment textarea found for extraction with selector:', selector);
            break;
          }
        }
        if (textarea) break;
      }

      if (!textarea) {
        Logger.warn('[Instagram] No comment textarea found');
        return null;
      }

      const content = textarea.value?.trim() || textarea.textContent?.trim() || '';

      if (!content) {
        Logger.warn('[Instagram] No comment content found');
        return null;
      }

      Logger.info('[Instagram] Comment data extracted:', {
        contentLength: content.length,
        preview: content.substring(0, 50)
      });

      return {
        content
      };
    } catch (error) {
      Logger.error('[Instagram] Error extracting comment data:', error);
      return null;
    }
  }

  /**
   * Fügt optimierten Content in das Textarea ein
   */
  static insertOptimizedContent(optimizedContent: string): boolean {
    try {
      const selectors = [
        'textarea[aria-label*="Kommentieren"]',
        'textarea[aria-label*="kommentieren"]',
        'textarea[aria-label*="Comment"]',
        'textarea[placeholder*="Kommentieren"]',
        'textarea[placeholder*="kommentieren"]',
        'textarea[placeholder*="Comment"]'
      ];

      let textarea: HTMLTextAreaElement | null = null;
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        for (const element of Array.from(elements)) {
          const el = element as HTMLTextAreaElement;
          if (el.offsetParent !== null) {
            textarea = el;
            Logger.info('[Instagram] Comment textarea found for insertion with selector:', selector);
            break;
          }
        }
        if (textarea) break;
      }

      if (!textarea) {
        Logger.error('[Instagram] Content textarea not found');
        return false;
      }

      // Setze den Wert
      textarea.value = optimizedContent;
      
      // Trigger Events für React/Instagram
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
      textarea.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));

      // Focus setzen
      textarea.focus();

      Logger.info('[Instagram] Optimized content inserted');
      return true;
    } catch (error) {
      Logger.error('[Instagram] Error inserting content:', error);
      return false;
    }
  }

  /**
   * Findet den Container für den Optimierungs-Button (neben "Posten"-Button)
   */
  static getCommentOptimizeButtonContainer(): HTMLElement | null {
    Logger.info('[Instagram] Searching for comment button container...');
    
    // Suche nach dem "Posten"-Button durch Text-Inhalt
    // Instagram verwendet dynamische Klassen, daher suchen wir nach dem Text
    const allButtons = document.querySelectorAll('div[role="button"]');
    for (const button of Array.from(allButtons)) {
      const btn = button as HTMLElement;
      const text = btn.textContent?.trim() || btn.innerText?.trim() || '';
      
      // Prüfe ob Button "Posten" enthält (deutsch) oder "Post" (englisch)
      if (text === 'Posten' || text === 'posten' || text === 'Post' || text === 'post') {
        Logger.info('[Instagram] Found Posten button with text:', text);
        
        // Finde den Parent-Container
        // Der Container sollte das Form-Element oder ein direkter Parent sein
        let container = btn.parentElement;
        
        // Gehe weiter nach oben, bis wir einen passenden Container finden
        while (container) {
          // Prüfe ob Container bereits einen Optimieren-Button hat
          const existingBtn = container.querySelector('.cos-instagram-optimize-btn');
          if (existingBtn) {
            Logger.info('[Instagram] Optimize button already exists, returning existing container');
            return existingBtn.parentElement as HTMLElement;
          }
          
          // Prüfe ob Container ein Form oder ein div mit passenden Klassen ist
          const tagName = container.tagName.toLowerCase();
          const classes = container.className || '';
          
          // Container sollte ein div oder form sein, der den Button enthält
          if (tagName === 'form' || (tagName === 'div' && container.contains(btn))) {
            Logger.info('[Instagram] Comment button container found:', {
              tagName,
              className: classes.substring(0, 50)
            });
            return container;
          }
          
          container = container.parentElement;
        }
        
        // Fallback: Verwende direkten Parent
        if (btn.parentElement) {
          Logger.info('[Instagram] Using direct parent as container');
          return btn.parentElement;
        }
      }
    }

    // Alternative: Suche nach dem Textarea und finde den Container danach
    const textarea = document.querySelector('textarea[aria-label*="Kommentieren"], textarea[aria-label*="Comment"]') as HTMLTextAreaElement;
    if (textarea) {
      // Finde das Form-Element oder den Container, der das Textarea enthält
      let container: HTMLElement | null = textarea.closest('form') as HTMLElement | null;
      if (!container) {
        container = textarea.parentElement;
        // Gehe weiter nach oben
        while (container && container.tagName.toLowerCase() !== 'form') {
          const parent = container.parentElement;
          if (parent && (parent.tagName.toLowerCase() === 'form' || parent.tagName.toLowerCase() === 'div')) {
            container = parent;
            break;
          }
          container = parent;
        }
      }
      
      if (container) {
        Logger.info('[Instagram] Comment button container found via textarea');
        return container;
      }
    }

    Logger.warn('[Instagram] Could not find any suitable comment button container');
    return null;
  }
}

