import { InstagramDOMService } from './services/InstagramDOMService';
import { CommentOptimizer } from './services/CommentOptimizer';
import { Logger } from '../../shared/utils/logger';

/**
 * Content Script für Instagram Kommentare
 */
class InstagramContentScript {
  private commentOptimizeButton: HTMLElement | null = null;
  private isProcessing = false;
  private commentObserver: MutationObserver | null = null;

  constructor() {
    Logger.info('[Instagram] Content Script initialized');
    this.injectToastStyles();
    this.init();
  }

  private init(): void {
    // Beobachte Kommentar-Editoren
    this.observeCommentEditors();
  }

  /**
   * Beobachtet Kommentar-Editoren
   */
  private observeCommentEditors(): void {
    // Prüfe initial ob Kommentar-Editor bereits sichtbar ist
    const checkInitial = () => {
      if (InstagramDOMService.isCommentEditorVisible() && !this.commentOptimizeButton) {
        setTimeout(() => {
          this.createCommentOptimizeButton();
        }, 300);
      }
    };
    
    // Mehrfache Versuche, da Kommentar-Editoren dynamisch geladen werden
    checkInitial();
    setTimeout(checkInitial, 500);
    setTimeout(checkInitial, 1000);
    setTimeout(checkInitial, 2000);

    // Beobachte Änderungen für Kommentar-Editoren
    this.commentObserver = new MutationObserver(() => {
      if (InstagramDOMService.isCommentEditorVisible() && !this.commentOptimizeButton) {
        setTimeout(() => {
          this.createCommentOptimizeButton();
        }, 300);
      } else if (!InstagramDOMService.isCommentEditorVisible() && this.commentOptimizeButton) {
        // Prüfe ob Button noch im DOM ist, bevor wir ihn zurücksetzen
        if (!document.body.contains(this.commentOptimizeButton)) {
          this.commentOptimizeButton = null;
        }
      }
    });

    this.commentObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-hidden', 'class', 'style']
    });
  }

  /**
   * Erstellt den Optimierungs-Button für Kommentare
   */
  private createCommentOptimizeButton(): void {
    if (this.commentOptimizeButton && document.body.contains(this.commentOptimizeButton)) {
      Logger.info('[Instagram] Comment optimize button already exists in DOM');
      return; // Button bereits vorhanden und im DOM
    }

    Logger.info('[Instagram] Creating comment optimize button...');
    const container = InstagramDOMService.getCommentOptimizeButtonContainer();
    if (!container) {
      Logger.warn('[Instagram] Could not find comment button container');
      return;
    }

    Logger.info('[Instagram] Comment button container found:', container);

    // Prüfe ob Button bereits im Container existiert
    const existingButton = container.querySelector('.cos-instagram-optimize-btn');
    if (existingButton) {
      Logger.info('[Instagram] Comment optimize button already exists in container');
      this.commentOptimizeButton = existingButton as HTMLElement;
      return;
    }

    // Erstelle Button
    const button = document.createElement('button');
    button.className = 'cos-instagram-optimize-btn';
    button.innerHTML = '🚀';
    button.style.display = 'inline-flex';
    button.style.alignItems = 'center';
    button.style.justifyContent = 'center';
    button.style.cursor = 'pointer';
    button.style.fontSize = '20px';
    button.style.padding = '8px 12px';
    button.style.marginRight = '8px'; // Abstand zum Posten-Button
    button.style.verticalAlign = 'middle';
    button.style.background = 'transparent';
    button.style.border = 'none';
    button.style.color = 'inherit';
    button.style.opacity = '0.8';
    button.style.transition = 'opacity 0.2s';
    button.title = 'Kommentar mit KI optimieren';
    
    // Hover-Effekt
    button.addEventListener('mouseenter', () => {
      button.style.opacity = '1';
    });
    button.addEventListener('mouseleave', () => {
      if (!this.isProcessing) {
        button.style.opacity = '0.8';
      }
    });

    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleCommentOptimizeClick();
    });

    // Füge Button vor dem Posten-Button ein
    // Suche nach dem "Posten"-Button durch Text-Inhalt
    const allButtons = container.querySelectorAll('div[role="button"]');
    let postButton: HTMLElement | null = null;
    
    for (const btn of Array.from(allButtons)) {
      const btnElement = btn as HTMLElement;
      const text = btnElement.textContent?.trim() || btnElement.innerText?.trim() || '';
      if (text === 'Posten' || text === 'posten' || text === 'Post' || text === 'post') {
        postButton = btnElement;
        break;
      }
    }
    
    if (postButton) {
      // Füge Button direkt vor dem Posten-Button ein
      container.insertBefore(button, postButton);
      Logger.info('[Instagram] Button inserted before Posten button');
    } else {
      // Fallback: Füge am Ende des Containers ein
      container.appendChild(button);
      Logger.info('[Instagram] Posten button not found, appended to container');
    }
    
    this.commentOptimizeButton = button;

    Logger.info('[Instagram] Comment optimize button created and added to container', {
      container: container.className,
      buttonInDOM: document.body.contains(button),
      containerInDOM: document.body.contains(container),
      buttonVisible: button.offsetParent !== null
    });
  }

  /**
   * Behandelt Klick auf "Kommentar optimieren"
   */
  private async handleCommentOptimizeClick(): Promise<void> {
    if (this.isProcessing || !this.commentOptimizeButton) return;

    this.isProcessing = true;
    const originalHTML = this.commentOptimizeButton.innerHTML;

    try {
      // Loading State
      this.commentOptimizeButton.innerHTML = '⏳';
      this.commentOptimizeButton.style.pointerEvents = 'none';

      // Extrahiere Kommentar-Daten
      const comment = InstagramDOMService.extractCommentData();
      if (!comment) {
        throw new Error('Kommentar-Daten konnten nicht extrahiert werden');
      }
      if (!comment.content) {
        throw new Error('Bitte fülle zuerst den Kommentar aus');
      }

      // Extrahiere Original-Post-Kontext (falls vorhanden)
      const originalPostContext = InstagramDOMService.extractOriginalPostForComment();

      Logger.info('[Instagram] Comment data extracted:', {
        commentLength: comment.content.length,
        hasPostContext: !!originalPostContext
      });

      // Optimiere Kommentar
      this.commentOptimizeButton.innerHTML = '🤖';

      const optimizedContent = await CommentOptimizer.optimizeComment(comment, originalPostContext || undefined);

      Logger.info('[Instagram] Comment optimized:', {
        originalLength: comment.content.length,
        optimizedLength: optimizedContent.length
      });

      // Füge optimierten Content ein
      const inserted = InstagramDOMService.insertOptimizedContent(optimizedContent);
      if (!inserted) {
        throw new Error('Kommentar konnte nicht eingefügt werden. Bitte versuche es erneut.');
      }

      // Success State
      this.commentOptimizeButton.innerHTML = '✅';
      this.commentOptimizeButton.style.backgroundColor = '#4caf50';
      this.commentOptimizeButton.style.color = '#fff';

      this.showToast('Kommentar erfolgreich optimiert!', 'success');
      Logger.info('[Instagram] ✅ Comment optimized successfully');

      // Reset nach 3 Sekunden
      setTimeout(() => {
        if (this.commentOptimizeButton) {
          this.commentOptimizeButton.innerHTML = originalHTML;
          this.commentOptimizeButton.style.pointerEvents = 'auto';
          this.commentOptimizeButton.style.backgroundColor = '';
          this.commentOptimizeButton.style.color = '';
        }
        this.isProcessing = false;
      }, 3000);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      Logger.error('[Instagram] Comment optimization error:', error);

      // Zeige Toast mit Fehlermeldung
      this.showToast(errorMessage, 'error');

      // Error State
      if (this.commentOptimizeButton) {
        this.commentOptimizeButton.innerHTML = '❌';
        this.commentOptimizeButton.style.backgroundColor = '#f44336';
        this.commentOptimizeButton.style.color = '#fff';
        this.commentOptimizeButton.title = errorMessage;

        setTimeout(() => {
          if (this.commentOptimizeButton) {
            this.commentOptimizeButton.innerHTML = originalHTML;
            this.commentOptimizeButton.style.pointerEvents = 'auto';
            this.commentOptimizeButton.style.backgroundColor = '';
            this.commentOptimizeButton.style.color = '';
          }
          this.isProcessing = false;
        }, 3000);
      }
    }
  }

  /**
   * Zeigt eine Toast-Benachrichtigung an
   */
  private showToast(message: string, type: 'success' | 'error' = 'error'): void {
    const toast = document.createElement('div');
    toast.className = `cos-toast cos-toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#4caf50' : '#f44336'};
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      font-size: 14px;
      font-weight: 500;
      max-width: 400px;
      animation: slideIn 0.3s ease-out;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => {
        if (toast.parentElement) {
          toast.parentElement.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }

  /**
   * Injiziert Toast-Styles
   */
  private injectToastStyles(): void {
    if (document.getElementById('cos-toast-styles')) {
      return; // Styles bereits injiziert
    }

    const style = document.createElement('style');
    style.id = 'cos-toast-styles';
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

// Initialisiere nur wenn wir auf Instagram sind
if (InstagramDOMService.isInstagramPage()) {
  new InstagramContentScript();
}

