import { Logger } from '../../../shared/utils/logger';
import { LinkedInArticle } from '../models/LinkedInArticle';

/**
 * DOM-Service für LinkedIn Artikel-Editor und Posts
 */
export class LinkedInDOMService {
  /**
   * Bereinigt den Content (keine Erkennung von --du/--sie mehr, da über Button-Klick gesteuert)
   * @param content Der zu bereinigende Content
   * @returns Der bereinigte Content (aktuell unverändert, für zukünftige Bereinigungen)
   */
  static cleanContent(content: string): string {
    return content.trim();
  }

  /**
   * @deprecated Wird nicht mehr verwendet - Ansprache-Form wird über Button-Klick gesteuert
   */
  static detectAndRemoveAddressForm(content: string): { cleanedContent: string; addressForm?: 'du' | 'sie' } {
    let cleanedContent = content;
    let addressForm: 'du' | 'sie' | undefined = undefined;

    // DEBUG: Logge den Input
    Logger.info('[LinkedIn] 🔍 detectAndRemoveAddressForm called with:', {
      content: content,
      contentLength: content.length
    });

    // Prüfe auf --du (case-insensitive)
    // Erkennt: --du am Anfang, Ende, oder mit Leerzeichen davor/danach
    const duPattern = /(^|\s)--du(\s|$)/i;
    const duMatch = duPattern.test(content);
    Logger.info('[LinkedIn] 🔍 Testing --du pattern:', {
      pattern: '/(^|\\s)--du(\\s|$)/i',
      testResult: duMatch,
      content: content
    });
    
    if (duMatch) {
      addressForm = 'du';
      const beforeReplace = cleanedContent;
      cleanedContent = cleanedContent.replace(/(^|\s)--du(\s|$)/gi, (_match, before, after) => {
        // Entferne --du, behalte Leerzeichen nur wenn beide vorhanden sind
        if (before && after) return ' '; // Leerzeichen davor und danach -> ein Leerzeichen
        return before || after || ''; // Nur davor oder danach -> behalte das Leerzeichen
      }).trim();
      Logger.info('[LinkedIn] 🔍 --du detected and removed:', {
        before: beforeReplace,
        after: cleanedContent,
        addressForm: 'du'
      });
    }
    
    // Prüfe auf --sie (case-insensitive)
    // Erkennt: --sie am Anfang, Ende, oder mit Leerzeichen davor/danach
    const siePattern = /(^|\s)--sie(\s|$)/i;
    const sieMatch = siePattern.test(content);
    Logger.info('[LinkedIn] 🔍 Testing --sie pattern:', {
      pattern: '/(^|\\s)--sie(\\s|$)/i',
      testResult: sieMatch,
      content: content
    });
    
    if (sieMatch) {
      addressForm = 'sie';
      const beforeReplace = cleanedContent;
      cleanedContent = cleanedContent.replace(/(^|\s)--sie(\s|$)/gi, (_match, before, after) => {
        // Entferne --sie, behalte Leerzeichen nur wenn beide vorhanden sind
        if (before && after) return ' '; // Leerzeichen davor und danach -> ein Leerzeichen
        return before || after || ''; // Nur davor oder danach -> behalte das Leerzeichen
      }).trim();
      Logger.info('[LinkedIn] 🔍 --sie detected and removed:', {
        before: beforeReplace,
        after: cleanedContent,
        addressForm: 'sie'
      });
    }

    Logger.info('[LinkedIn] 🔍 detectAndRemoveAddressForm result:', {
      originalContent: content,
      cleanedContent: cleanedContent,
      addressForm: addressForm || 'nicht erkannt'
    });

    return { cleanedContent, addressForm };
  }

  /**
   * Prüft ob wir auf der LinkedIn Artikel-Erstellen- oder Bearbeiten-Seite sind
   */
  static isArticleEditorPage(): boolean {
    return window.location.hostname.includes('linkedin.com') &&
           (window.location.pathname.includes('/article/new') ||
            window.location.pathname.includes('/article/edit'));
  }

  /**
   * Prüft ob das Share-Box-Modal (für normale Posts) geöffnet ist
   */
  static isShareBoxOpen(): boolean {
    // Verschiedene Selektoren für Share-Box
    const selectors = [
      '[data-test-modal-id="sharebox"]',
      '.share-creation-state__content-scrollable',
      '.share-box-v2__modal',
      '.share-creation-state__text-editor'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector) as HTMLElement;
      if (element && element.offsetParent !== null) {
        // Prüfe auch aria-hidden
        const ariaHidden = element.getAttribute('aria-hidden');
        if (ariaHidden === 'true') {
          continue;
        }
        // Prüfe ob Modal sichtbar ist
        if (element.getAttribute('aria-hidden') === 'false' || 
            element.offsetParent !== null) {
          Logger.info('[LinkedIn] Share box found with selector:', selector);
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Prüft ob wir auf einer LinkedIn Chat/Messaging-Seite sind
   */
  static isChatPage(): boolean {
    return window.location.hostname.includes('linkedin.com') &&
           (window.location.pathname.includes('/messaging/') ||
            window.location.pathname.includes('/inbox/') ||
            window.location.pathname.includes('/mynetwork/invite-manager/'));
  }

  /**
   * Prüft ob ein Chat-Editor sichtbar ist
   */
  static isChatEditorVisible(): boolean {
    // Verschiedene Selektoren für Chat-Editoren
    const selectors = [
      '.msg-form__contenteditable[contenteditable="true"]',
      '.msg-form__contenteditable[role="textbox"]',
      '.msg-form__contenteditable',
      '.msg-send-form [contenteditable="true"]',
      '.msg-form__texteditor [contenteditable="true"]',
      '[data-test-msg-form__contenteditable]',
      '.msg-form [contenteditable="true"]',
      '.msg-form__editor [contenteditable="true"]',
      '.msg-form__editor div[contenteditable="true"]',
      'div.msg-form__contenteditable[contenteditable="true"][role="textbox"]'
    ];

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of Array.from(elements)) {
        const chatEditor = element as HTMLElement;
        // Prüfe ob Element sichtbar ist (offsetParent ist nicht null)
        // und nicht versteckt ist
        if (chatEditor && 
            chatEditor.offsetParent !== null &&
            chatEditor.getAttribute('aria-hidden') !== 'true' &&
            window.getComputedStyle(chatEditor).display !== 'none' &&
            window.getComputedStyle(chatEditor).visibility !== 'hidden') {
          Logger.info('[LinkedIn] Chat editor found with selector:', selector);
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Prüft ob ein Kommentar-Editor sichtbar ist (inkl. Antwort-Editoren)
   */
  static isCommentEditorVisible(): boolean {
    // Ignoriere, wenn Share-Box offen ist (dann ist es kein Kommentar-Editor)
    if (this.isShareBoxOpen()) {
      return false;
    }
    
    // Verschiedene Selektoren für Kommentar-Editoren (inkl. Antwort-Editoren)
    const selectors = [
      '.comments-comment-box [data-test-ql-editor-contenteditable="true"]',
      '.comments-comment-box__form [data-test-ql-editor-contenteditable="true"]',
      '.comments-comment-texteditor [data-test-ql-editor-contenteditable="true"]',
      '.comments-comment-box .ql-editor[contenteditable="true"]',
      '.comments-comment-box__form .ql-editor[contenteditable="true"]',
      '.comments-comment-texteditor .ql-editor[contenteditable="true"]',
      '.comments-comment-box [contenteditable="true"].ql-editor',
      '.comments-comment-box__form [contenteditable="true"].ql-editor',
      '.comments-comment-texteditor [contenteditable="true"].ql-editor',
      '.comments-comment-box .ql-editor',
      '.comments-comment-box__form .ql-editor',
      '.comments-comment-texteditor .ql-editor',
      '.comments-comment-box [contenteditable="true"]',
      '.comments-comment-box__form [contenteditable="true"]',
      '.comments-comment-texteditor [contenteditable="true"]',
      '.comments-comment-box__editor [contenteditable="true"]',
      '.comments-comment-box__editor .ql-editor',
      '.comment-box [contenteditable="true"]',
      '.comment-box .ql-editor',
      '.editor-content .ql-editor[contenteditable="true"]'
    ];

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of Array.from(elements)) {
        const commentEditor = element as HTMLElement;
        if (commentEditor && 
            commentEditor.getAttribute('aria-hidden') !== 'true' &&
            commentEditor.offsetParent !== null) {
          Logger.info('[LinkedIn] Comment editor found with selector:', selector);
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Extrahiert Artikel-Daten aus dem Editor
   */
  static extractArticleData(): LinkedInArticle | null {
    try {
      // Titel extrahieren
      const titleTextarea = document.querySelector('#article-editor-headline__textarea') as HTMLTextAreaElement;
      const title = titleTextarea?.value?.trim() || '';

      // Content extrahieren - verschiedene Selektoren für Artikel-Editor
      let contentEditor: HTMLElement | null = null;
      const articleEditorSelectors = [
        '[data-test-article-editor-content-textbox]',
        '.article-editor-paragraph',
        '.article-editor-content',
        'p.article-editor-paragraph',
        '[data-placeholder*="Geben Sie Ihren Text"]'
      ];
      
      for (const selector of articleEditorSelectors) {
        const element = document.querySelector(selector) as HTMLElement;
        if (element && element.offsetParent !== null) {
          contentEditor = element;
          Logger.info('[LinkedIn] Article editor found with selector:', selector);
          break;
        }
      }
      
      let content = '';
      if (contentEditor) {
        content = contentEditor.innerText?.trim() || contentEditor.textContent?.trim() || '';
        
        // Falls leer, versuche aus <p> Tags zu extrahieren
        if (!content || content === '' || content === '\n') {
          const paragraphs = contentEditor.querySelectorAll('p');
          if (paragraphs.length > 0) {
            const extracted = Array.from(paragraphs)
              .map(p => {
                const text = p.textContent?.trim() || '';
                if (text === '' && (p.innerHTML.trim() === '<br>' || p.innerHTML.trim() === '<br/>')) {
                  return '';
                }
                return text;
              })
              .filter(p => p.length > 0)
              .join('\n');
            if (extracted) {
              content = extracted;
            }
          }
        }
      }

      if (!title && !content) {
        Logger.warn('[LinkedIn] No article data found');
        return null;
      }

      // DEBUG: Logge den rohen Content aus dem Artikel-Editor
      Logger.info('[LinkedIn] 🔍 RAW CONTENT from article editor:', {
        rawTitle: title,
        rawContent: content,
        titleLength: title.length,
        contentLength: content.length,
        contentEditorHTML: contentEditor?.innerHTML?.substring(0, 200)
      });

      // Bereinige Titel und Content
      const cleanedTitle = title ? this.cleanContent(title) : '';
      const cleanedContentText = this.cleanContent(content);

      Logger.info('[LinkedIn] Article data extracted:', {
        rawTitle: title,
        rawContent: content,
        cleanedTitle: cleanedTitle,
        cleanedContent: cleanedContentText,
        titleLength: cleanedTitle.length,
        contentLength: cleanedContentText.length
      });

      return {
        title: cleanedTitle || undefined,
        content: cleanedContentText
      };
    } catch (error) {
      Logger.error('[LinkedIn] Error extracting article data:', error);
      return null;
    }
  }

  /**
   * Extrahiert Post-Daten aus dem Share-Box-Modal
   */
  static extractPostData(): LinkedInArticle | null {
    try {
      // Quill-Editor für normale Posts (nicht in Kommentar-Box)
      const shareBox = document.querySelector('[data-test-modal-id="sharebox"]');
      let quillEditor: HTMLElement | null = null;
      
      // Verschiedene Selektoren für Post-Editor
      const postEditorSelectors = [
        '[data-test-ql-editor-contenteditable="true"]',
        '.ql-editor[contenteditable="true"]',
        '.ql-editor',
        '[contenteditable="true"].ql-editor'
      ];
      
      for (const selector of postEditorSelectors) {
        const element = shareBox?.querySelector(selector) as HTMLElement;
        if (element && element.offsetParent !== null) {
          quillEditor = element;
          Logger.info('[LinkedIn] Post editor found with selector:', selector);
          break;
        }
      }
      
      let content = '';
      if (quillEditor) {
        content = quillEditor.innerText?.trim() || quillEditor.textContent?.trim() || '';
        
        // Falls leer, versuche aus <p> Tags zu extrahieren
        if (!content || content === '' || content === '\n') {
          const paragraphs = quillEditor.querySelectorAll('p');
          if (paragraphs.length > 0) {
            const extracted = Array.from(paragraphs)
              .map(p => {
                const text = p.textContent?.trim() || '';
                if (text === '' && (p.innerHTML.trim() === '<br>' || p.innerHTML.trim() === '<br/>')) {
                  return '';
                }
                return text;
              })
              .filter(p => p.length > 0)
              .join('\n');
            if (extracted) {
              content = extracted;
            }
          }
        }
      }

      if (!content) {
        Logger.warn('[LinkedIn] No post data found');
        return null;
      }

      if (!quillEditor) {
        Logger.warn('[LinkedIn] No post editor found');
        return null;
      }

      // DEBUG: Logge den rohen Content aus dem Eingabefeld
      Logger.info('[LinkedIn] 🔍 RAW CONTENT from post editor:', {
        rawContent: content,
        contentLength: content.length,
        innerText: quillEditor.innerText,
        textContent: quillEditor.textContent,
        innerHTML: quillEditor.innerHTML?.substring(0, 200) // Erste 200 Zeichen
      });

      // Bereinige Content
      const cleanedContent = this.cleanContent(content);

      Logger.info('[LinkedIn] Post data extracted:', {
        rawContent: content,
        cleanedContent: cleanedContent,
        contentLength: cleanedContent.length
      });

      return {
        title: '', // Posts haben keinen Titel
        content: cleanedContent
      };
    } catch (error) {
      Logger.error('[LinkedIn] Error extracting post data:', error);
      return null;
    }
  }

  /**
   * Extrahiert den Original-Post, auf den geantwortet wird
   * @param editorElement Optional: Der Kommentar-Editor, in dessen Nähe gesucht werden soll
   */
  static extractOriginalPostForComment(editorElement?: HTMLElement | null): string | null {
    try {
      // Erweiterte Selektoren für Post-Content (Feed) und Artikel-Content
      const postContentSelectors = [
        // Feed-Post Selektoren
        '.attributed-text-segment-list__content',
        '[data-test-id="main-feed-activity-card__commentary"]',
        '.feed-shared-update-v2__commentary',
        '.feed-shared-text-view__text-view',
        '.feed-shared-text-view__text',
        '.main-feed-activity-card__commentary',
        'p[data-test-id="main-feed-activity-card__commentary"]',
        '.feed-shared-update-v2__description',
        '.feed-shared-text-view',
        '.update-components-text',
        '.feed-shared-inline-show-more-text',
        '.feed-shared-text-view__text-view span',
        '.feed-shared-update-v2__commentary span',
        '[data-test-id="main-feed-activity-card__commentary"] span',
        '.attributed-text-segment-list__content span',
        // Artikel-Selektoren
        '.reader-article-content',
        '.reader-content-blocks-container',
        '.reader-text-block__paragraph',
        '.reader-text-block__heading-2',
        '.reader-text-block__heading-3',
        'article .reader-text-block__paragraph',
        'article .reader-content-blocks-container p',
        'article .reader-content-blocks-container h2',
        'article .reader-content-blocks-container h3',
        '[data-scaffold-immersive-reader-content] .reader-text-block__paragraph',
        '[data-scaffold-immersive-reader-content] .reader-content-blocks-container'
      ];

      // Wenn ein Editor-Element übergeben wurde, suche zuerst in dessen Nähe
      if (editorElement) {
        Logger.info('[LinkedIn] Searching for post context near editor element');
        
        // Finde den nächstgelegenen Post-Container (verschiedene Strategien)
        let postContainer: HTMLElement | null = null;
        
        // Strategie 1: Suche nach bekannten Container-Klassen (Feed und Artikel)
        const containerSelectors = [
          // Feed-Container
          '.feed-shared-update-v2',
          '.main-feed-activity-card',
          '[data-test-id="main-feed-activity-card"]',
          '.feed-shared-update-v2__commentary',
          '.feed-shared-update-v2__description',
          '.feed-shared-update-v2__content',
          '.feed-shared-update-v2__commentary-wrapper',
          '.feed-shared-update-v2__social-actions',
          '.feed-shared-update-v2__comments-container',
          // Artikel-Container
          'article',
          '[data-scaffold-immersive-reader-content]',
          '.reader-article-content',
          '.reader-content-blocks-container',
          '.reader-social-activity',
          '.reader-social-activity__right-rail'
        ];
        
        for (const containerSelector of containerSelectors) {
          const container = editorElement.closest(containerSelector);
          if (container) {
            postContainer = container as HTMLElement;
            Logger.info('[LinkedIn] Found post container with selector:', containerSelector);
            break;
          }
        }
        
        // Strategie 2: Suche nach Parent-Elementen mit bestimmten Klassen
        if (!postContainer) {
          let parent = editorElement.parentElement;
          let depth = 0;
          while (parent && depth < 10) {
            const classes = parent.className || '';
            if (classes.includes('feed-shared') || 
                classes.includes('main-feed') ||
                classes.includes('update-v2') ||
                parent.hasAttribute('data-test-id')) {
              postContainer = parent;
              Logger.info('[LinkedIn] Found post container by parent traversal');
              break;
            }
            parent = parent.parentElement;
            depth++;
          }
        }
        
        if (postContainer) {
          Logger.info('[LinkedIn] Searching within post container');
          
          // Suche innerhalb des Post-Containers
          for (const selector of postContentSelectors) {
            try {
              const elements = postContainer.querySelectorAll(selector);
              for (const element of Array.from(elements)) {
                const el = element as HTMLElement;
                // Überspringe Kommentare (sollten nicht der Post-Content sein)
                if (el.closest('.comments-comment-entity') || 
                    el.closest('.comments-comment-box') ||
                    el.closest('.feed-shared-update-v2__comments-container')) {
                  continue;
                }
                
                if (el.offsetParent !== null) {
                  const text = el.innerText?.trim() || el.textContent?.trim() || '';
                  if (text && text.length > 20) {
                    Logger.info('[LinkedIn] Original post found near editor with selector:', selector, 'length:', text.length);
                    return text.substring(0, 1000);
                  }
                }
              }
            } catch (e) {
              Logger.debug('[LinkedIn] Error with selector:', selector, e);
            }
          }
          
          // Fallback: Suche nach allen Text-Elementen im Container
          const allTextElements = postContainer.querySelectorAll('span, p, div');
          for (const element of Array.from(allTextElements)) {
            const el = element as HTMLElement;
            // Überspringe Kommentare
            if (el.closest('.comments-comment-entity') || 
                el.closest('.comments-comment-box') ||
                el.closest('.feed-shared-update-v2__comments-container')) {
              continue;
            }
            
            if (el.offsetParent !== null) {
              const text = el.innerText?.trim() || el.textContent?.trim() || '';
              // Suche nach längeren Textblöcken (wahrscheinlich Post-Content)
              if (text && text.length > 50 && text.length < 5000) {
                // Prüfe ob es nicht nur ein einzelnes Wort oder ein sehr kurzer Text ist
                const words = text.split(/\s+/).filter(w => w.length > 0);
                if (words.length > 5) {
                  Logger.info('[LinkedIn] Original post found via fallback search, length:', text.length);
                  return text.substring(0, 1000);
                }
              }
            }
          }
        } else {
          Logger.warn('[LinkedIn] Could not find post container near editor');
        }
      }

      // Fallback: Suche im gesamten Dokument (aber ignoriere Kommentare)
      Logger.info('[LinkedIn] Falling back to document-wide search');
      for (const selector of postContentSelectors) {
        try {
          const elements = document.querySelectorAll(selector);
          for (const element of Array.from(elements)) {
            const el = element as HTMLElement;
            // Überspringe Kommentare
            if (el.closest('.comments-comment-entity') || 
                el.closest('.comments-comment-box') ||
                el.closest('.feed-shared-update-v2__comments-container')) {
              continue;
            }
            
            // Prüfe ob Element sichtbar ist und Text enthält
            if (el.offsetParent !== null) {
              const text = el.innerText?.trim() || el.textContent?.trim() || '';
              if (text && text.length > 20) {
                Logger.info('[LinkedIn] Original post found with selector:', selector, 'length:', text.length);
                return text.substring(0, 1000);
              }
            }
          }
        } catch (e) {
          Logger.debug('[LinkedIn] Error with selector:', selector, e);
        }
      }

      Logger.warn('[LinkedIn] No original post found for comment context');
      return null;
    } catch (error) {
      Logger.error('[LinkedIn] Error extracting original post:', error);
      return null;
    }
  }

  /**
   * Extrahiert den Chat-Verlauf (letzte Nachrichten im Chat) mit Absender-Informationen
   * Erkennt automatisch, welche Nachrichten vom aktuellen Benutzer stammen
   */
  static extractChatHistory(maxMessages: number = 10): string | null {
    try {
      // Selektoren für Chat-Nachrichten-Container
      const messageContainerSelectors = [
        '.msg-s-event-listitem',
        '.msg-s-message-list-content .msg-s-event-listitem'
      ];

      const messages: Array<{sender: string, text: string, isFromCurrentUser: boolean}> = [];
      
      for (const containerSelector of messageContainerSelectors) {
        const containers = document.querySelectorAll(containerSelector);
        
        for (const container of Array.from(containers)) {
          const containerEl = container as HTMLElement;
          if (!containerEl || containerEl.offsetParent === null) {
            continue;
          }
          
          // Prüfe ob Nachricht vom aktuellen Benutzer stammt
          // LinkedIn verwendet verschiedene Indikatoren:
          // 1. Klasse "msg-s-event-listitem--self" oder ähnlich
          // 2. Fehlende Absender-Informationen (eigene Nachrichten haben oft keinen Absender-Namen)
          // 3. "Gesendet" Indikator statt Absender-Name
          // 4. Position im Layout (rechts für eigene Nachrichten)
          const hasSentIndicator = 
            containerEl.querySelector('[data-test-msg-cross-pillar-message-sending-indicator-presenter__sending-indicator--sent]') !== null ||
            containerEl.querySelector('.msg-s-event-with-indicator__sending-indicator--sent') !== null ||
            containerEl.querySelector('[title*="Gesendet"]') !== null ||
            containerEl.querySelector('[title*="Sent"]') !== null;
          
          const hasSenderName = containerEl.querySelector('.msg-s-message-group__name') !== null;
          
          // Wenn "Gesendet" Indikator vorhanden ist ODER kein Absender-Name vorhanden ist = eigene Nachricht
          const isFromCurrentUser = hasSentIndicator || !hasSenderName;
          
          // Extrahiere Absender-Name (nur wenn nicht vom aktuellen Benutzer)
          let senderName = '';
          if (!isFromCurrentUser) {
            const senderSelectors = [
              '.msg-s-message-group__name',
              '.msg-s-message-group__profile-link',
              '.msg-s-event-listitem__link[href*="/in/"]',
              'a[href*="/in/"] .msg-s-message-group__profile-link',
              '.msg-s-event-listitem__link img[alt]',
              '[aria-label*="Profil von"]'
            ];
            
            for (const senderSelector of senderSelectors) {
              const senderElement = containerEl.querySelector(senderSelector);
              if (senderElement) {
                // Versuche Text aus verschiedenen Quellen zu extrahieren
                let senderText = senderElement.textContent?.trim() || 
                                senderElement.getAttribute('aria-label')?.trim() ||
                                (senderElement as HTMLElement).title?.trim() ||
                                '';
                
                // Prüfe auch img alt-Attribute
                if (!senderText && senderElement.tagName === 'IMG') {
                  senderText = (senderElement as HTMLImageElement).alt?.trim() || '';
                }
                
                // Prüfe ob es ein Name ist (mehrere Wörter oder ein einzelnes Wort)
                if (senderText && senderText.length > 1 && senderText.length < 100) {
                  // Entferne "Profil von" Präfix falls vorhanden
                  senderText = senderText.replace(/^Profil von\s+/i, '').trim();
                  // Entferne "anzeigen" Suffix falls vorhanden
                  senderText = senderText.replace(/\s+anzeigen$/i, '').trim();
                  // Entferne "Profil" alleinstehend
                  if (senderText && !senderText.match(/^(Profil|Bild|Foto)$/i)) {
                    senderName = senderText;
                    break;
                  }
                }
              }
            }
          }
          
          // Extrahiere Nachrichtentext
          const messageSelectors = [
            '.msg-s-event-listitem__body',
            '.msg-s-event-listitem__message-bubble p',
            '.msg-s-event-listitem__content p',
            'p.msg-s-event-listitem__body',
            '.msg-s-event-listitem__content'
          ];
          
          let messageText = '';
          for (const messageSelector of messageSelectors) {
            const messageElement = containerEl.querySelector(messageSelector);
            if (messageElement) {
              messageText = messageElement.textContent?.trim() || 
                           (messageElement as HTMLElement).innerText?.trim() || '';
              if (messageText && messageText.length >= 2) {
                break;
              }
            }
          }
          
          // Nur relevante Nachrichten (mindestens 2 Zeichen)
          if (messageText && messageText.length >= 2) {
            // Prüfe ob diese Nachricht bereits vorhanden ist (vergleiche Text)
            const isDuplicate = messages.some(msg => msg.text === messageText);
            if (!isDuplicate) {
              messages.push({
                sender: senderName,
                text: messageText,
                isFromCurrentUser
              });
              if (messages.length >= maxMessages) {
                break;
              }
            }
          }
        }
        
        if (messages.length >= maxMessages) {
          break;
        }
      }

      if (messages.length === 0) {
        Logger.warn('[LinkedIn] No chat history found');
        return null;
      }

      // Erstelle einen lesbaren Chat-Verlauf mit Absendern (chronologisch, älteste zuerst)
      const reversedMessages = messages.reverse();
      const chatHistory = reversedMessages.map(msg => {
        // Wenn vom aktuellen Benutzer: "Du: Nachricht"
        // Wenn von anderer Person: "Absender: Nachricht"
        // Wenn Absender unbekannt: "Unbekannt: Nachricht"
        if (msg.isFromCurrentUser) {
          return `Du: ${msg.text}`;
        } else if (msg.sender && msg.sender.length > 0) {
          return `${msg.sender}: ${msg.text}`;
        } else {
          return `Unbekannt: ${msg.text}`;
        }
      }).join('\n\n');

      Logger.info('[LinkedIn] Chat history extracted:', {
        messageCount: messages.length,
        totalLength: chatHistory.length,
        preview: chatHistory.substring(0, 300),
        senders: messages.map(m => m.isFromCurrentUser ? 'Du' : (m.sender || 'Unbekannt')).filter((v, i, a) => a.indexOf(v) === i),
        fromCurrentUser: messages.filter(m => m.isFromCurrentUser).length,
        fromOthers: messages.filter(m => !m.isFromCurrentUser).length
      });

      return chatHistory.substring(0, 2000); // Maximal 2000 Zeichen für den Kontext
    } catch (error) {
      Logger.error('[LinkedIn] Error extracting chat history:', error);
      return null;
    }
  }

  /**
   * Extrahiert Chat-Nachrichten-Daten aus dem Editor
   */
  static extractChatMessage(editorElement?: HTMLElement | null): LinkedInArticle | null {
    try {
      let chatEditor: HTMLElement | null = null;

      // Wenn ein Editor-Element übergeben wurde, verwende dieses
      if (editorElement) {
        chatEditor = editorElement;
      } else {
        // Suche nach Chat-Editor
        const selectors = [
          '.msg-form__contenteditable',
          '.msg-send-form [contenteditable="true"]',
          '.msg-form__texteditor [contenteditable="true"]',
          '.msg-form__contenteditable[contenteditable="true"]',
          '[data-test-msg-form__contenteditable]',
          '.msg-form__contenteditable[role="textbox"]',
          '.msg-form [contenteditable="true"]',
          '.msg-form__editor [contenteditable="true"]',
          '.msg-form__editor div[contenteditable="true"]'
        ];

        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          for (const element of Array.from(elements)) {
            const el = element as HTMLElement;
            if (el && 
                el.getAttribute('aria-hidden') !== 'true' &&
                el.offsetParent !== null) {
              chatEditor = el;
              Logger.info('[LinkedIn] Chat editor found for extraction with selector:', selector);
              break;
            }
          }
          if (chatEditor) break;
        }
      }

      if (!chatEditor) {
        Logger.warn('[LinkedIn] No chat editor found');
        return null;
      }

      // Extrahiere Content aus dem Chat-Editor
      let content = '';
      
      // Methode 1: innerText (bevorzugt)
      if (chatEditor.innerText) {
        content = chatEditor.innerText.trim();
      }
      
      // Methode 2: textContent (Fallback)
      if (!content && chatEditor.textContent) {
        content = chatEditor.textContent.trim();
      }
      
      // Methode 3: Aus <p> Tags extrahieren (für Quill-Editoren)
      if (!content || content === '' || content === '\n') {
        const paragraphs = chatEditor.querySelectorAll('p');
        if (paragraphs.length > 0) {
          const extracted = Array.from(paragraphs)
            .map(p => {
              // Extrahiere Text aus <p> Tags, ignoriere <br> und leere Tags
              const text = p.textContent?.trim() || '';
              // Wenn der Paragraph nur ein <br> enthält, ist er leer
              if (text === '' && p.innerHTML.trim() === '<br>') {
                return '';
              }
              return text;
            })
            .filter(p => p.length > 0)
            .join('\n');
          if (extracted) {
            content = extracted;
          }
        }
      }

      // DEBUG: Logge den rohen Content aus dem Eingabefeld
      Logger.info('[LinkedIn] 🔍 RAW CONTENT from chat editor:', {
        rawContent: content,
        contentLength: content.length,
        innerText: chatEditor.innerText,
        textContent: chatEditor.textContent,
        innerHTML: chatEditor.innerHTML?.substring(0, 200) // Erste 200 Zeichen
      });

      // Bereinige Content
      const cleanedContent = this.cleanContent(content);

      Logger.info('[LinkedIn] Chat message extracted:', {
        rawContent: content,
        cleanedContent: cleanedContent,
        contentLength: cleanedContent.length,
        preview: cleanedContent.substring(0, 50)
      });

      return {
        title: '', // Chat-Nachrichten haben keinen Titel
        content: cleanedContent
      };
    } catch (error) {
      Logger.error('[LinkedIn] Error extracting chat message:', error);
      return null;
    }
  }

  /**
   * Extrahiert Kommentar-Daten aus dem Kommentar-Editor
   */
  static extractCommentData(): LinkedInArticle | null {
    try {
      // Verschiedene Selektoren für Kommentar-Editoren (mehr Selektoren für bessere Kompatibilität)
      const editorSelectors = [
        '.comments-comment-box [data-test-ql-editor-contenteditable="true"]',
        '.comments-comment-box__form [data-test-ql-editor-contenteditable="true"]',
        '.comments-comment-texteditor [data-test-ql-editor-contenteditable="true"]',
        '.comments-comment-box .ql-editor[contenteditable="true"]',
        '.comments-comment-box__form .ql-editor[contenteditable="true"]',
        '.comments-comment-texteditor .ql-editor[contenteditable="true"]',
        '.comments-comment-box [contenteditable="true"].ql-editor',
        '.comments-comment-box__form [contenteditable="true"].ql-editor',
        '.comments-comment-texteditor [contenteditable="true"].ql-editor',
        '.comments-comment-box .ql-editor',
        '.comments-comment-box__form .ql-editor',
        '.comments-comment-texteditor .ql-editor',
        '.comments-comment-box [contenteditable="true"]',
        '.comments-comment-box__form [contenteditable="true"]',
        '.comments-comment-texteditor [contenteditable="true"]',
        '.comment-box [contenteditable="true"]',
        '.comment-box .ql-editor',
        '.editor-content .ql-editor[contenteditable="true"]'
      ];

      let quillEditor: HTMLElement | null = null;
      for (const selector of editorSelectors) {
        const elements = document.querySelectorAll(selector);
        for (const element of Array.from(elements)) {
          const el = element as HTMLElement;
          // Prüfe ob Element sichtbar ist
          if (el.offsetParent !== null && el.getAttribute('aria-hidden') !== 'true') {
            quillEditor = el;
            Logger.info('[LinkedIn] Comment editor found with selector:', selector);
            break;
          }
        }
        if (quillEditor) break;
      }

      if (!quillEditor) {
        Logger.warn('[LinkedIn] No comment editor found with any selector');
        return null;
      }

      // Versuche verschiedene Methoden, um den Content zu extrahieren
      let content = '';
      
      // Methode 1: innerText (bevorzugt, da es Formatierung ignoriert)
      if (quillEditor.innerText) {
        content = quillEditor.innerText.trim();
      }
      
      // Methode 2: textContent (Fallback)
      if (!content && quillEditor.textContent) {
        content = quillEditor.textContent.trim();
      }
      
      // Methode 3: Aus den <p> Tags extrahieren (für Quill-Editor)
      // Wichtig: Auch wenn innerText/textContent leer ist, könnte Text in <p> Tags sein
      if (!content || content === '' || content === '\n') {
        const paragraphs = quillEditor.querySelectorAll('p');
        if (paragraphs.length > 0) {
          const extracted = Array.from(paragraphs)
            .map(p => {
              // Extrahiere Text aus <p> Tags, ignoriere <br> und leere Tags
              const text = p.textContent?.trim() || '';
              // Wenn der Paragraph nur ein <br> enthält, ist er leer
              if (text === '' && (p.innerHTML.trim() === '<br>' || p.innerHTML.trim() === '<br/>')) {
                return '';
              }
              return text;
            })
            .filter(p => p.length > 0)
            .join('\n');
          if (extracted) {
            content = extracted;
          }
        }
      }
      
      // Methode 4: Direkt aus innerHTML extrahieren (falls Text in anderen Tags ist)
      if (!content || content === '' || content === '\n') {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = quillEditor.innerHTML || '';
        const extracted = tempDiv.textContent?.trim() || tempDiv.innerText?.trim() || '';
        if (extracted && extracted !== '\n' && extracted.length > 0) {
          content = extracted;
        }
      }

      // Wenn immer noch kein Content, aber Editor existiert, logge das
      if (!content || content === '' || content === '\n') {
        Logger.warn('[LinkedIn] No comment content found in editor', {
          innerText: quillEditor.innerText,
          textContent: quillEditor.textContent,
          innerHTML: quillEditor.innerHTML?.substring(0, 200),
          selector: 'comment editor'
        });
        // Erlaube leeren Content, damit --du/--sie auch in leeren Editoren erkannt werden kann
        // return null; // Entfernt - erlaube leeren Content
      }

      // DEBUG: Logge den rohen Content aus dem Eingabefeld
      Logger.info('[LinkedIn] 🔍 RAW CONTENT from comment editor:', {
        rawContent: content,
        contentLength: content.length,
        innerText: quillEditor.innerText,
        textContent: quillEditor.textContent,
        innerHTML: quillEditor.innerHTML?.substring(0, 200) // Erste 200 Zeichen
      });

      // Bereinige Content
      const cleanedContent = this.cleanContent(content);

      Logger.info('[LinkedIn] Comment data extracted:', {
        rawContent: content,
        cleanedContent: cleanedContent,
        contentLength: cleanedContent.length,
        preview: cleanedContent.substring(0, 50)
      });

      return {
        title: '', // Kommentare haben keinen Titel
        content: cleanedContent
      };
    } catch (error) {
      Logger.error('[LinkedIn] Error extracting comment data:', error);
      return null;
    }
  }

  /**
   * Fügt optimierten Titel ein
   */
  static insertOptimizedTitle(optimizedTitle: string): boolean {
    try {
      const titleTextarea = document.querySelector('#article-editor-headline__textarea') as HTMLTextAreaElement;
      if (!titleTextarea) {
        Logger.error('[LinkedIn] Title textarea not found');
        return false;
      }

      titleTextarea.value = optimizedTitle;
      titleTextarea.dispatchEvent(new Event('input', { bubbles: true }));
      titleTextarea.dispatchEvent(new Event('change', { bubbles: true }));
      titleTextarea.focus();

      Logger.info('[LinkedIn] Optimized title inserted');
      return true;
    } catch (error) {
      Logger.error('[LinkedIn] Error inserting title:', error);
      return false;
    }
  }

  /**
   * Fügt optimierten Content in den Editor ein
   */
  static insertOptimizedContent(optimizedContent: string, type: 'article' | 'post' | 'comment' = 'article', useStyling: boolean = true): boolean {
    try {
      let contentEditor: HTMLElement | null = null;

      if (type === 'comment') {
        // Quill-Editor für Kommentare - erweiterte Selektoren für neue LinkedIn-Struktur
        const editorSelectors = [
          '.comment-box [contenteditable="true"]',  // Neue Struktur
          '.comment-box .ql-editor[contenteditable="true"]',
          '.comments-comment-box [data-test-ql-editor-contenteditable="true"]',
          '.comments-comment-box__form [data-test-ql-editor-contenteditable="true"]',
          '.comments-comment-texteditor [data-test-ql-editor-contenteditable="true"]',
          '.comments-comment-box .ql-editor[contenteditable="true"]',
          '.comments-comment-box__form .ql-editor[contenteditable="true"]',
          '.comments-comment-texteditor .ql-editor[contenteditable="true"]',
          '.comments-comment-box [contenteditable="true"].ql-editor',
          '.comments-comment-box__form [contenteditable="true"].ql-editor',
          '.comments-comment-texteditor [contenteditable="true"].ql-editor',
          '.comments-comment-box .ql-editor',
          '.comments-comment-box__form .ql-editor',
          '.comments-comment-texteditor .ql-editor',
          '.comments-comment-box [contenteditable="true"]',
          '.comments-comment-box__form [contenteditable="true"]',
          '.comments-comment-texteditor [contenteditable="true"]',
          '.editor-content .ql-editor[contenteditable="true"]',
          // Generische Selektoren als letzter Fallback
          'div[contenteditable="true"][aria-label*="Kommentieren"]',
          'div[contenteditable="true"][aria-label*="kommentieren"]',
          'div[role="textbox"][aria-multiline="true"]'
        ];

        for (const selector of editorSelectors) {
          const elements = document.querySelectorAll(selector);
          for (const element of Array.from(elements)) {
            const el = element as HTMLElement;
            // Prüfe ob Element sichtbar ist
            if (el.offsetParent !== null && el.getAttribute('aria-hidden') !== 'true') {
              contentEditor = el;
              Logger.info('[LinkedIn] Comment editor found for insertion with selector:', selector);
              break;
            }
          }
          if (contentEditor) break;
        }
      } else if (type === 'post') {
        // Quill-Editor für normale Posts (in Share-Box)
        const shareBox = document.querySelector('[data-test-modal-id="sharebox"]');
        contentEditor = shareBox?.querySelector('[data-test-ql-editor-contenteditable="true"]') as HTMLElement;
      } else {
        // ProseMirror-Editor für Artikel
        contentEditor = document.querySelector('[data-test-article-editor-content-textbox]') as HTMLElement;
      }

      if (!contentEditor) {
        Logger.error('[LinkedIn] Content editor not found', { type });
        return false;
      }

      // Für Artikel: Konvertiere Markdown zu ProseMirror-Format (nur für Artikel)
      if (type === 'article' && useStyling) {
        // Konvertiere Markdown zu HTML für ProseMirror
        const htmlContent = this.convertMarkdownToHTML(optimizedContent);
        contentEditor.innerHTML = htmlContent;
      } else if (type === 'post' || type === 'comment') {
        // Für Posts und Kommentare: Einfacher Text ohne Formatierung
        // Einfache Text-Formatierung - Zeilenumbrüche beibehalten
        const paragraphs = optimizedContent.split('\n\n').filter(p => p.trim());
        contentEditor.innerHTML = paragraphs.map(p => `<p>${p.trim().replace(/\n/g, '<br>')}</p>`).join('');
        
        // Für Quill: Trigger verschiedene Events für Update
        const inputEvent = new Event('input', { bubbles: true });
        const changeEvent = new Event('change', { bubbles: true });
        const keyupEvent = new KeyboardEvent('keyup', { bubbles: true, key: 'Enter' });
        
        contentEditor.dispatchEvent(inputEvent);
        contentEditor.dispatchEvent(changeEvent);
        contentEditor.dispatchEvent(keyupEvent);
        
        // Für Quill: Setze auch textContent für Fallback
        contentEditor.textContent = optimizedContent;
      } else {
        // Fallback für Artikel ohne Styling
        contentEditor.textContent = optimizedContent;
        contentEditor.innerText = optimizedContent;
      }

      // Trigger Events für React/Ember
      contentEditor.dispatchEvent(new Event('input', { bubbles: true }));
      contentEditor.dispatchEvent(new Event('change', { bubbles: true }));
      contentEditor.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
      
      // Focus setzen
      contentEditor.focus();

      Logger.info('[LinkedIn] Optimized content inserted', { type, useStyling });
      return true;
    } catch (error) {
      Logger.error('[LinkedIn] Error inserting content:', error);
      return false;
    }
  }

  /**
   * Fügt optimierten Content direkt in einen spezifischen Editor ein (für FAB)
   * Behält Erwähnungen/Mentions bei, die vor dem Text stehen
   */
  static insertOptimizedContentIntoEditor(editorElement: HTMLElement, optimizedContent: string): boolean {
    try {
      if (!editorElement) {
        Logger.error('[LinkedIn] Editor element is null');
        return false;
      }

      // Strategie: Finde Erwähnungen und behalte sie, ersetze nur den Text-Content
      // LinkedIn speichert Erwähnungen oft im ersten <p> Element oder als spezielle Elemente
      const allParagraphs = editorElement.querySelectorAll('p');
      let mentionParagraph: HTMLElement | null = null;
      let mentionContent = '';
      
      // Suche nach dem ersten <p> Element, das Erwähnungen enthält
      for (const p of Array.from(allParagraphs)) {
        const pEl = p as HTMLElement;
        const innerHTML = pEl.innerHTML;
        
        // Prüfe ob dieses <p> Erwähnungen enthält (Links zu Profilen, spezielle Attribute)
        const hasMention = pEl.querySelector('a[href*="/in/"], a[href*="/company/"], span[data-linkedin-type], a[data-linkedin-type], span.mention, a.mention') ||
                          innerHTML.includes('data-linkedin-type') ||
                          innerHTML.includes('data-entity-type');
        
        if (hasMention) {
          mentionParagraph = pEl;
          mentionContent = innerHTML;
          Logger.info('[LinkedIn] Found mention paragraph:', mentionContent.substring(0, 100));
          break;
        }
      }
      
      // Alternative: Suche nach Erwähnungen in allen Elementen
      if (!mentionParagraph) {
        const mentionSelectors = [
          'a[href*="/in/"]',
          'a[href*="/company/"]',
          'span[data-linkedin-type]',
          'a[data-linkedin-type]',
          'span.mention',
          'a.mention',
          'span[data-entity-type="person"]',
          'a[data-entity-type="person"]'
        ];
        
        for (const selector of mentionSelectors) {
          const mentionEl = editorElement.querySelector(selector);
          if (mentionEl) {
            mentionContent = (mentionEl as HTMLElement).outerHTML;
            Logger.info('[LinkedIn] Found mention element:', mentionContent.substring(0, 100));
            break;
          }
        }
      }

      // Für Kommentare: Einfacher Text ohne Formatierung
      // Einfache Text-Formatierung - Zeilenumbrüche beibehalten
      const paragraphs = optimizedContent.split('\n\n').filter(p => p.trim());
      const optimizedHTML = paragraphs.map(p => `<p>${p.trim().replace(/\n/g, '<br>')}</p>`).join('');
      
      // Wenn Erwähnungen gefunden wurden, füge sie vor dem optimierten Text ein
      let finalHTML: string;
      if (mentionContent) {
        // Erstelle HTML mit Erwähnung + optimiertem Text
        // Wenn mentionParagraph existiert, verwende dessen Struktur
        if (mentionParagraph) {
          // Behalte die Erwähnung im ersten <p>, füge optimierten Text in neue <p> ein
          finalHTML = `<p>${mentionContent}</p>${optimizedHTML}`;
        } else {
          // Füge Erwähnung als erstes Element ein
          finalHTML = `<p>${mentionContent} </p>${optimizedHTML}`;
        }
      } else {
        finalHTML = optimizedHTML;
      }
      
      // Setze den Inhalt
      editorElement.innerHTML = finalHTML;
      
      // Für Quill: Trigger verschiedene Events für Update
      const inputEvent = new Event('input', { bubbles: true });
      const changeEvent = new Event('change', { bubbles: true });
      const keyupEvent = new KeyboardEvent('keyup', { bubbles: true, key: 'Enter' });
      
      editorElement.dispatchEvent(inputEvent);
      editorElement.dispatchEvent(changeEvent);
      editorElement.dispatchEvent(keyupEvent);
      
      // Hinweis: Wir verwenden innerHTML, um Erwähnungen als HTML zu behalten
      // textContent würde Erwähnungen als Text darstellen, daher verwenden wir nur innerHTML

      // Trigger Events für React/Ember
      editorElement.dispatchEvent(new Event('input', { bubbles: true }));
      editorElement.dispatchEvent(new Event('change', { bubbles: true }));
      editorElement.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
      
      // Focus setzen
      editorElement.focus();

      Logger.info('[LinkedIn] Optimized content inserted into specific editor', {
        hasMention: !!mentionContent,
        contentLength: optimizedContent.length
      });
      return true;
    } catch (error) {
      Logger.error('[LinkedIn] Error inserting content into editor:', error);
      return false;
    }
  }

  /**
   * Konvertiert Markdown zu HTML für LinkedIn-Formatierung
   * Unterstützt ProseMirror (Artikel) und Quill (Posts/Kommentare)
   */
  private static convertMarkdownToHTML(markdown: string): string {
    let html = markdown;
    
    // Code-Blöcke (```code```) - zuerst behandeln, damit sie nicht von anderen Regeln betroffen sind
    html = html.replace(/```([\s\S]*?)```/g, (_match, code) => {
      return `<pre><code>${code.trim()}</code></pre>`;
    });
    
    // Zitate (> text) - vor Absätzen behandeln
    html = html.replace(/^&gt; (.+)$/gm, '<blockquote><p>$1</p></blockquote>');
    
    // Zeilenumbrüche zu Absätzen (nur wenn nicht bereits in Code-Blöcken oder Zitaten)
    const lines = html.split('\n');
    const processedLines: string[] = [];
    let inCodeBlock = false;
    let inQuote = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Code-Blöcke erkennen
      if (line.startsWith('<pre>')) {
        inCodeBlock = true;
        processedLines.push(lines[i]);
        continue;
      }
      if (line.endsWith('</pre>')) {
        inCodeBlock = false;
        processedLines.push(lines[i]);
        continue;
      }
      
      // Zitate erkennen
      if (line.startsWith('<blockquote>')) {
        inQuote = true;
        processedLines.push(lines[i]);
        continue;
      }
      if (line.endsWith('</blockquote>')) {
        inQuote = false;
        processedLines.push(lines[i]);
        continue;
      }
      
      // Wenn in Code-Block oder Zitat, einfach hinzufügen
      if (inCodeBlock || inQuote) {
        processedLines.push(lines[i]);
        continue;
      }
      
      // Leere Zeilen = Absatz-Trenner
      if (line === '') {
        continue;
      }
      
      // Normale Zeile: Formatierung anwenden und als Absatz wrappen
      let processedLine = line;
      
      // Inline Code (`code`) - vor anderen Formatierungen
      processedLine = processedLine.replace(/`([^`\n]+)`/g, '<code>$1</code>');
      
      // Fett (**text** oder __text__) - vor Kursiv
      processedLine = processedLine.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
      processedLine = processedLine.replace(/__([^_\n]+)__/g, '<strong>$1</strong>');
      
      // Kursiv (*text* oder _text_) - nach Fett, aber nur wenn nicht bereits fett
      processedLine = processedLine.replace(/(?<!<strong>)\*([^*\n<]+)\*(?!<\/strong>)/g, '<em>$1</em>');
      processedLine = processedLine.replace(/(?<!<strong>)_([^_\n<]+)_(?!<\/strong>)/g, '<em>$1</em>');
      
      processedLines.push(`<p>${processedLine}</p>`);
    }
    
    html = processedLines.join('\n');
    
    // Cleanup: Doppelte Absätze vermeiden
    html = html.replace(/<\/p>\s*<p>/g, '</p><p>');
    
    return html;
  }

  /**
   * Findet den Container für den Optimierungs-Button (Artikel)
   */
  static getOptimizeButtonContainer(): HTMLElement | null {
    // Suche nach der Toolbar-Gruppe, wo wir den Button hinzufügen können
    const toolbar = document.querySelector('.article-editor-toolbar');
    if (!toolbar) {
      Logger.warn('[LinkedIn] Toolbar not found, trying alternative selectors...');
      
      // Alternative Selektoren für Toolbar
      const alternativeSelectors = [
        '.article-editor-toolbar',
        '[class*="article-editor-toolbar"]',
        '[class*="toolbar"]',
        '.editor-toolbar'
      ];
      
      for (const selector of alternativeSelectors) {
        const altToolbar = document.querySelector(selector);
        if (altToolbar) {
          Logger.info('[LinkedIn] Found toolbar with alternative selector:', selector);
          const buttonGroup = document.createElement('div');
          buttonGroup.className = 'article-editor-toolbar__button-group';
          buttonGroup.style.marginLeft = '16px';
          buttonGroup.style.paddingLeft = '16px';
          buttonGroup.style.borderLeft = '1px solid rgba(0, 0, 0, 0.15)';
          return buttonGroup;
        }
      }
      
      // Fallback: Erstelle Container direkt im body (wird später zur Toolbar hinzugefügt)
      Logger.warn('[LinkedIn] Toolbar not found, creating fallback container');
      const buttonGroup = document.createElement('div');
      buttonGroup.className = 'article-editor-toolbar__button-group';
      buttonGroup.style.marginLeft = '16px';
      buttonGroup.style.paddingLeft = '16px';
      buttonGroup.style.borderLeft = '1px solid rgba(0, 0, 0, 0.15)';
      return buttonGroup;
    }

    // Erstelle einen Container für unseren Button
    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'article-editor-toolbar__button-group';
    buttonGroup.style.marginLeft = '16px';
    buttonGroup.style.paddingLeft = '16px';
    buttonGroup.style.borderLeft = '1px solid rgba(0, 0, 0, 0.15)';

    return buttonGroup;
  }

  /**
   * Findet den Container für den Optimierungs-Button (Post)
   */
  static getPostOptimizeButtonContainer(): HTMLElement | null {
    // Verschiedene Selektoren für Post-Button-Container
    const containerSelectors = [
      '.share-creation-state__footer .share-creation-state__schedule-and-post-container',
      '.share-creation-state__footer',
      '.share-creation-state__additional-toolbar',
      '.share-creation-state__content-scrollable .share-creation-state__text-editor',
      '.share-box-v2__modal .share-creation-state__footer'
    ];

    let container: HTMLElement | null = null;
    for (const selector of containerSelectors) {
      container = document.querySelector(selector) as HTMLElement;
      if (container) {
        Logger.info('[LinkedIn] Post button container found with selector:', selector);
        break;
      }
    }

    if (!container) {
      // Fallback: Suche nach dem Editor und füge Button daneben ein
      const editor = document.querySelector('.share-creation-state__text-editor .ql-editor') as HTMLElement;
      if (editor) {
        const editorContainer = editor.closest('.share-creation-state__text-editor');
        if (editorContainer) {
          // Erstelle einen Container direkt nach dem Editor
          const buttonContainer = document.createElement('div');
          buttonContainer.className = 'cos-post-button-container';
          buttonContainer.style.display = 'flex';
          buttonContainer.style.justifyContent = 'flex-end';
          buttonContainer.style.marginTop = '8px';
          buttonContainer.style.padding = '0 12px';
          return buttonContainer;
        }
      }
      Logger.warn('[LinkedIn] Post button container not found');
      return null;
    }

    // Erstelle einen Button-Container
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'cos-post-button-container';
    buttonContainer.style.display = 'flex';
    buttonContainer.style.alignItems = 'center';
    buttonContainer.style.marginRight = '12px';
    buttonContainer.style.marginLeft = '12px';
    
    // Versuche Container in Footer einzufügen
    if (container.classList.contains('share-creation-state__footer')) {
      const scheduleContainer = container.querySelector('.share-creation-state__schedule-and-post-container');
      if (scheduleContainer) {
        // Füge vor dem Schedule-Container ein
        scheduleContainer.parentElement?.insertBefore(buttonContainer, scheduleContainer);
        return buttonContainer;
      }
    }
    
    // Fallback: Füge am Ende des Containers ein
    container.appendChild(buttonContainer);
    return buttonContainer;
  }

  /**
   * Findet den Container für den Optimierungs-Button (Kommentar)
   */
  static getCommentOptimizeButtonContainer(): HTMLElement | null {
    Logger.info('[LinkedIn] Searching for comment button container...');
    
    // WICHTIG: Zuerst den sichtbaren Kommentar-Editor finden, dann den zugehörigen Button
    // Dies stellt sicher, dass wir den richtigen Button für den aktuellen Editor finden
    let visibleEditor: HTMLElement | null = null;
    
    const editorSelectors = [
      '.comments-comment-box [data-test-ql-editor-contenteditable="true"]',
      '.comments-comment-box__form [data-test-ql-editor-contenteditable="true"]',
      '.comments-comment-texteditor [data-test-ql-editor-contenteditable="true"]',
      '.comments-comment-box .ql-editor[contenteditable="true"]',
      '.comments-comment-box__form .ql-editor[contenteditable="true"]',
      '.comments-comment-texteditor .ql-editor[contenteditable="true"]',
      '.comments-comment-box [contenteditable="true"].ql-editor',
      '.comments-comment-box__form [contenteditable="true"].ql-editor',
      '.comments-comment-texteditor [contenteditable="true"].ql-editor',
      '.comments-comment-box .ql-editor',
      '.comments-comment-box__form .ql-editor',
      '.comments-comment-texteditor .ql-editor',
      '.comments-comment-box [contenteditable="true"]',
      '.comments-comment-box__form [contenteditable="true"]',
      '.comments-comment-texteditor [contenteditable="true"]',
      '.comment-box [contenteditable="true"]',
      '.comment-box .ql-editor',
      '.editor-content .ql-editor[contenteditable="true"]'
    ];
    
    // Finde den sichtbaren Editor
    for (const selector of editorSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of Array.from(elements)) {
        const editor = element as HTMLElement;
        if (editor && 
            editor.getAttribute('aria-hidden') !== 'true' &&
            editor.offsetParent !== null) {
          visibleEditor = editor;
          Logger.info('[LinkedIn] Found visible comment editor with selector:', selector);
          break;
        }
      }
      if (visibleEditor) break;
    }
    
    if (!visibleEditor) {
      Logger.warn('[LinkedIn] No visible comment editor found');
      return null;
    }
    
    // Suche den zugehörigen "Kommentieren"/"Posten"-Button innerhalb des gleichen Formulars/Containers
    let targetButton: HTMLElement | null = null;
    
    // Finde das Formular oder den Container, der den Editor enthält
    const editorForm = visibleEditor.closest('form') as HTMLElement | null;
    const editorContainer = visibleEditor.closest('.comments-comment-box__form') as HTMLElement | null;
    const searchContainer = editorForm || editorContainer || visibleEditor.parentElement;
    
    if (!searchContainer) {
      Logger.warn('[LinkedIn] Could not find container for editor');
      return null;
    }
    
    Logger.info('[LinkedIn] Searching for "Posten" or "Kommentieren" button within editor container...');
    
    // Suche nur innerhalb des Containers, der den Editor enthält
    const allElements = searchContainer.querySelectorAll('div[role="button"], button');
    for (const el of Array.from(allElements)) {
      const element = el as HTMLElement;
      const text = element.textContent?.trim() || element.innerText?.trim() || '';
      const ariaLabel = element.getAttribute('aria-label') || '';
      const className = element.className || '';
      
      // Prüfe auf "Posten" oder "Kommentieren" Button
      // WICHTIG: Ignoriere Buttons mit "comment-button" Klasse, die sind für andere Kommentare
      if ((text === 'Posten' || text === 'posten' || text === 'Post' || text === 'post' ||
           text === 'Kommentieren' || text === 'kommentieren' ||
           ariaLabel.includes('Posten') || ariaLabel.includes('posten') ||
           ariaLabel.includes('Kommentieren') || ariaLabel.includes('kommentieren') ||
           className.includes('comments-comment-box__submit-button') ||
           className.includes('comments-comment-box__submit-button--cr') ||
           className.includes('submit-button')) &&
          !className.includes('comment-button') && // Ignoriere Buttons für andere Kommentare
          element.offsetParent !== null) {
        targetButton = element;
        Logger.info('[LinkedIn] Target button found within editor container, text:', text, 'class:', className);
        break;
      }
    }
    
    // Wenn Button gefunden, finde den Container daneben
    if (targetButton) {
      // Suche zuerst nach dem direkten Parent-Container (display-flex align-items-center)
      let container = targetButton.parentElement;
      if (container) {
        const classes = container.className || '';
        const style = window.getComputedStyle(container);
        if ((classes.includes('display-flex') && classes.includes('align-items-center')) ||
            (style.display === 'flex' && style.alignItems === 'center')) {
          Logger.info('[LinkedIn] Found flex container for button:', classes);
          const existingBtn = container.querySelector('.cos-comment-optimize-btn');
          if (existingBtn) {
            Logger.info('[LinkedIn] Optimize button already exists');
            return container;
          }
          return container;
        }
      }
      
      // Suche nach dem Form-Container oder dem Parent-Container
      container = targetButton.closest('form') as HTMLElement | null;
      
      // Spezielle Suche nach comments-comment-box__form
      if (!container) {
        container = targetButton.closest('.comments-comment-box__form') as HTMLElement | null;
      }
      
      if (!container) {
        // Suche nach einem Container mit flex/display-flex, der den Button enthält
        container = targetButton.parentElement;
        while (container) {
          const classes = container.className || '';
          const style = window.getComputedStyle(container);
          if (classes.includes('flex') || 
              classes.includes('display-flex') ||
              classes.includes('comments-comment-box__form') ||
              style.display === 'flex' ||
              container.tagName.toLowerCase() === 'form') {
            Logger.info('[LinkedIn] Target button container found:', classes);
            
            const existingBtn = container.querySelector('.cos-comment-optimize-btn');
            if (existingBtn) {
              Logger.info('[LinkedIn] Optimize button already exists');
              return container;
            }
            
            return container;
          }
          container = container.parentElement;
        }
      } else {
        Logger.info('[LinkedIn] Form container found for target button');
        const existingBtn = container.querySelector('.cos-comment-optimize-btn');
        if (existingBtn) {
          Logger.info('[LinkedIn] Optimize button already exists');
          return container;
        }
        return container;
      }
      
      // Fallback: Direkter Parent
      if (targetButton.parentElement) {
        Logger.info('[LinkedIn] Using direct parent of target button as container');
        return targetButton.parentElement;
      }
    }
    
    // Fallback: Suche nach "Antworten"-Button (für Antworten auf Kommentare)
    Logger.info('[LinkedIn] Trying fallback: searching for "Antworten" button...');
    const replyButtonSelectors = [
      'button[data-feed-action="replyToComment"]',
      'button.comment__action[data-feed-action="replyToComment"]',
      'button.comment__reply',
      '.comment__actions button[data-feed-action="replyToComment"]'
    ];

    let replyButton: HTMLElement | null = null;
    
    for (const selector of replyButtonSelectors) {
      try {
        const buttons = document.querySelectorAll(selector);
        for (const btn of Array.from(buttons)) {
          const button = btn as HTMLElement;
          if (button.offsetParent !== null) {
            replyButton = button;
            Logger.info('[LinkedIn] Reply button found with selector:', selector);
            break;
          }
        }
        if (replyButton) break;
      } catch (error) {
        Logger.debug('[LinkedIn] Invalid selector:', selector);
      }
    }
    
    if (replyButton) {
      let buttonContainer = replyButton.closest('.comment__actions') as HTMLElement | null;
      
      if (buttonContainer) {
        Logger.info('[LinkedIn] Comment actions container found');
        const existingBtn = buttonContainer.querySelector('.cos-comment-optimize-btn');
        if (existingBtn) {
          Logger.info('[LinkedIn] Optimize button already exists');
          return buttonContainer;
        }
        return buttonContainer;
      }
      
      if (replyButton.parentElement) {
        Logger.info('[LinkedIn] Using direct parent as container');
        return replyButton.parentElement;
      }
    }

    Logger.warn('[LinkedIn] Could not find comment button container');
    return null;
  }
}

