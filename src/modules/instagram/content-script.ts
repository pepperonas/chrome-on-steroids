import { InstagramDOMService } from './services/InstagramDOMService';
import { CommentOptimizer } from './services/CommentOptimizer';
import { Logger } from '../../shared/utils/logger';

/**
 * Content Script für Instagram Kommentare
 */
class InstagramContentScript {
  private floatingActionButton: HTMLElement | null = null;
  private focusedCommentEditor: HTMLTextAreaElement | null = null;
  private isProcessing = false;
  private commentObserver: MutationObserver | null = null;
  private commentCheckTimeout: number | null = null;

  constructor() {
    Logger.info('[Instagram] Content Script initialized');
    this.injectToastStyles();
    this.init();
  }

  private init(): void {
    // Beobachte Kommentar-Editoren mit FAB-Logik
    this.observeCommentEditorsWithFAB();
  }

  /**
   * Beobachtet Kommentar-Editoren mit Floating Action Button (FAB) Logik
   * Der FAB erscheint nur, wenn ein Kommentar-Editor fokussiert ist
   */
  private observeCommentEditorsWithFAB(): void {
    // Erstelle den FAB einmalig
    this.createFloatingActionButton();
    
    // Funktion zum Finden und Anhängen von Event Listenern an alle Kommentar-Editoren
    const attachFocusListeners = () => {
      // Finde alle Kommentar-Editoren
      const editorSelectors = [
        'textarea[aria-label*="Kommentieren"]',
        'textarea[aria-label*="kommentieren"]',
        'textarea[aria-label*="Comment"]',
        'textarea[placeholder*="Kommentieren"]',
        'textarea[placeholder*="kommentieren"]',
        'textarea[placeholder*="Comment"]'
      ];
      
      for (const selector of editorSelectors) {
        const textareas = document.querySelectorAll(selector);
        for (const textarea of Array.from(textareas)) {
          const textareaElement = textarea as HTMLTextAreaElement;
          
          // Prüfe ob Textarea sichtbar ist
          if (textareaElement.offsetParent === null) {
            continue;
          }
          
          // Prüfe ob bereits Listener angehängt wurden
          if (textareaElement.hasAttribute('data-cos-fab-listener')) {
            continue;
          }
          
          // Markiere als bearbeitet
          textareaElement.setAttribute('data-cos-fab-listener', 'true');
          
          // Handler-Funktion für Editor-Aktivierung
          const handleEditorActivation = () => {
            this.focusedCommentEditor = textareaElement;
            this.showFloatingActionButton();
            Logger.info('[Instagram] Comment editor activated, showing FAB');
          };
          
          // Focus Event: Zeige FAB und speichere Editor
          textareaElement.addEventListener('focus', handleEditorActivation, true);
          
          // Click Event: Zeige FAB auch bei Klick (falls Focus nicht ausgelöst wird)
          textareaElement.addEventListener('click', () => {
            setTimeout(handleEditorActivation, 50);
          }, true);
          
          // Input Event: Zeige FAB wenn Text eingegeben wird
          textareaElement.addEventListener('input', () => {
            if (document.activeElement === textareaElement) {
              handleEditorActivation();
            }
          }, true);
          
          // Prüfe ob dieser Editor bereits fokussiert ist
          if (document.activeElement === textareaElement) {
            handleEditorActivation();
          }
          
          // Blur Event: Verstecke FAB nach kurzer Verzögerung (falls nicht zu einem anderen Editor gewechselt wird)
          textareaElement.addEventListener('blur', () => {
            // Kurze Verzögerung, um zu prüfen, ob ein anderer Editor fokussiert wird
            setTimeout(() => {
              const activeElement = document.activeElement;
              // Prüfe ob ein anderer Kommentar-Editor fokussiert ist
              if (!activeElement || 
                  !(activeElement instanceof HTMLTextAreaElement) ||
                  !activeElement.matches('textarea[aria-label*="Kommentieren"], textarea[aria-label*="Comment"], textarea[placeholder*="Kommentieren"], textarea[placeholder*="Comment"]')) {
                this.focusedCommentEditor = null;
                this.hideFloatingActionButton();
                Logger.info('[Instagram] Comment editor blurred, hiding FAB');
              } else {
                // Ein anderer Editor wurde fokussiert, aktualisiere Referenz
                this.focusedCommentEditor = activeElement as HTMLTextAreaElement;
                this.showFloatingActionButton();
              }
            }, 150);
          }, true);
        }
      }
    };
    
    // Initiale Anhänge
    attachFocusListeners();
    
    // Globaler Click-Handler für Kommentar-Editoren (Fallback, falls Focus nicht funktioniert)
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (!target) return;
      
      // Prüfe ob auf einen Kommentar-Editor geklickt wurde
      const textarea = target.closest('textarea[aria-label*="Kommentieren"], textarea[aria-label*="Comment"], textarea[placeholder*="Kommentieren"], textarea[placeholder*="Comment"]') ||
                      (target instanceof HTMLTextAreaElement && 
                       (target.matches('textarea[aria-label*="Kommentieren"]') ||
                        target.matches('textarea[aria-label*="Comment"]') ||
                        target.matches('textarea[placeholder*="Kommentieren"]') ||
                        target.matches('textarea[placeholder*="Comment"]')));
      
      if (textarea instanceof HTMLTextAreaElement && 
          textarea.offsetParent !== null) {
        setTimeout(() => {
          this.focusedCommentEditor = textarea;
          this.showFloatingActionButton();
          Logger.info('[Instagram] Editor clicked, showing FAB');
        }, 100);
      }
    }, true);
    
    // Prüfe initial, ob bereits ein Editor fokussiert ist
    setTimeout(() => {
      const activeElement = document.activeElement;
      if (activeElement instanceof HTMLTextAreaElement) {
        const isCommentEditor = activeElement.matches('textarea[aria-label*="Kommentieren"], textarea[aria-label*="Comment"], textarea[placeholder*="Kommentieren"], textarea[placeholder*="Comment"]');
        if (isCommentEditor && activeElement.offsetParent !== null) {
          this.focusedCommentEditor = activeElement;
          this.showFloatingActionButton();
          Logger.info('[Instagram] Initial check: Editor already focused, showing FAB');
        }
      }
    }, 500);
    
    // Beobachte Änderungen im DOM, um neue Editoren zu finden
    this.commentObserver = new MutationObserver(() => {
      // Debounce: Lösche vorherigen Timeout
      if (this.commentCheckTimeout) {
        clearTimeout(this.commentCheckTimeout);
      }
      
      this.commentCheckTimeout = window.setTimeout(() => {
        attachFocusListeners();
        
        // Prüfe ob aktuell fokussierter Editor noch existiert
        if (this.focusedCommentEditor && !document.body.contains(this.focusedCommentEditor)) {
          this.focusedCommentEditor = null;
          this.hideFloatingActionButton();
        }
        
        // Prüfe ob ein Editor bereits fokussiert ist (für bereits geöffnete Editoren)
        const activeElement = document.activeElement;
        if (activeElement instanceof HTMLTextAreaElement) {
          const isCommentEditor = activeElement.matches('textarea[aria-label*="Kommentieren"], textarea[aria-label*="Comment"], textarea[placeholder*="Kommentieren"], textarea[placeholder*="Comment"]');
          if (isCommentEditor && activeElement.offsetParent !== null) {
            this.focusedCommentEditor = activeElement;
            this.showFloatingActionButton();
          }
        }
      }, 300);
    });

    this.commentObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-hidden', 'class', 'style', 'aria-label', 'placeholder']
    });
  }
  
  /**
   * Erstellt den Floating Action Button (FAB)
   */
  private createFloatingActionButton(): void {
    if (this.floatingActionButton) {
      return;
    }
    
    const fab = document.createElement('button');
    fab.className = 'cos-instagram-fab';
    fab.innerHTML = `
      <span class="cos-fab-icon">🚀</span>
      <span class="cos-fab-text">Optimieren</span>
    `;
    fab.title = 'Kommentar optimieren';
    fab.setAttribute('aria-label', 'Kommentar optimieren');
    
    // Styling (Instagram-ähnlich)
    fab.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 100000;
      display: none;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      background: linear-gradient(135deg, #E4405F 0%, #C13584 100%);
      color: white;
      border: none;
      border-radius: 28px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2);
      cursor: pointer;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 600;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      opacity: 0;
      transform: translateY(20px) scale(0.9);
    `;
    
    // Hover-Effekt
    fab.addEventListener('mouseenter', () => {
      fab.style.transform = 'translateY(0) scale(1.05)';
      fab.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.4), 0 4px 8px rgba(0, 0, 0, 0.3)';
    });
    
    fab.addEventListener('mouseleave', () => {
      if (fab.style.display !== 'none') {
        fab.style.transform = 'translateY(0) scale(1)';
        fab.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2)';
      }
    });
    
    // Click Event
    fab.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Stelle sicher, dass der Editor noch fokussiert ist oder fokussiere ihn wieder
      if (this.focusedCommentEditor && document.body.contains(this.focusedCommentEditor)) {
        setTimeout(() => {
          this.focusedCommentEditor?.focus();
        }, 50);
      }
      
      this.handleFABOptimizeClick();
    });
    
    document.body.appendChild(fab);
    this.floatingActionButton = fab;
    
    Logger.info('[Instagram] Floating Action Button created');
  }
  
  /**
   * Zeigt den Floating Action Button an
   */
  private showFloatingActionButton(): void {
    if (!this.floatingActionButton) {
      Logger.warn('[Instagram] FAB not created yet');
      return;
    }
    
    // Stelle sicher, dass der FAB im DOM ist
    if (!document.body.contains(this.floatingActionButton)) {
      document.body.appendChild(this.floatingActionButton);
    }
    
    this.floatingActionButton.style.display = 'flex';
    
    // Animation
    setTimeout(() => {
      if (this.floatingActionButton) {
        this.floatingActionButton.style.opacity = '1';
        this.floatingActionButton.style.transform = 'translateY(0) scale(1)';
        Logger.info('[Instagram] FAB shown');
      }
    }, 10);
  }
  
  /**
   * Versteckt den Floating Action Button
   */
  private hideFloatingActionButton(): void {
    if (!this.floatingActionButton) {
      return;
    }
    
    // Animation
    this.floatingActionButton.style.opacity = '0';
    this.floatingActionButton.style.transform = 'translateY(20px) scale(0.9)';
    
    setTimeout(() => {
      if (this.floatingActionButton) {
        this.floatingActionButton.style.display = 'none';
      }
    }, 300);
  }
  
  /**
   * Behandelt Klick auf den Floating Action Button
   */
  private async handleFABOptimizeClick(): Promise<void> {
    if (this.isProcessing || !this.focusedCommentEditor || !this.floatingActionButton) {
      return;
    }
    
    // Speichere Editor-Referenz VOR dem Klick
    const editorElement = this.focusedCommentEditor;
    
    // Stelle sicher, dass der Editor noch im DOM ist
    if (!document.body.contains(editorElement)) {
      Logger.error('[Instagram] Editor element no longer in DOM');
      this.showToast('Editor nicht mehr gefunden. Bitte versuche es erneut.', 'error');
      return;
    }
    
    this.isProcessing = true;
    const originalHTML = this.floatingActionButton.innerHTML;
    
    try {
      // Loading State
      this.floatingActionButton.innerHTML = `
        <span class="cos-fab-icon" style="animation: spin 1s linear infinite;">⏳</span>
        <span class="cos-fab-text">Optimiere...</span>
      `;
      this.floatingActionButton.style.pointerEvents = 'none';
      
      // Extrahiere Original-Post-Kontext basierend auf dem Editor-Element
      const originalPostContext = InstagramDOMService.extractOriginalPostForComment(editorElement);
      
      // Extrahiere Kommentar-Daten aus dem Editor-Element
      const commentContent = editorElement.value?.trim() || '';
      
      // Wenn weder Post-Kontext noch Kommentar-Text vorhanden ist, Fehler werfen
      if (!originalPostContext && !commentContent) {
        throw new Error('Post-Kontext konnte nicht gefunden werden und kein Kommentar-Text vorhanden. Bitte öffne einen Post und gib einen Kommentar ein.');
      }
      
      // Wenn kein Post-Kontext gefunden wurde, aber Text vorhanden ist, optimiere nur den Text
      if (!originalPostContext && commentContent) {
        Logger.warn('[Instagram] Post context not found, but comment text available. Optimizing comment without context.');
      }
      
      const comment = {
        content: commentContent
      };
      
      Logger.info('[Instagram] Comment data extracted from focused editor:', {
        commentLength: comment.content.length,
        hasPostContext: !!originalPostContext,
        isEmpty: !comment.content
      });
      
      // Optimiere Kommentar
      this.floatingActionButton.innerHTML = `
        <span class="cos-fab-icon" style="animation: spin 1s linear infinite;">⏳</span>
        <span class="cos-fab-text">KI arbeitet...</span>
      `;
      
      const optimizedContent = await CommentOptimizer.optimizeComment(comment, originalPostContext || undefined);
      
      Logger.info('[Instagram] Comment optimized:', {
        originalLength: comment.content.length,
        optimizedLength: optimizedContent.length,
        wasGeneratedFromContext: !comment.content
      });
      
      // Füge optimierten Content in den Editor ein (verwende gespeicherte Referenz)
      const inserted = InstagramDOMService.insertOptimizedContentIntoEditor(
        editorElement,
        optimizedContent
      );
      
      // Stelle sicher, dass der Editor wieder fokussiert ist
      setTimeout(() => {
        editorElement.focus();
      }, 100);
      
      if (!inserted) {
        throw new Error('Kommentar konnte nicht eingefügt werden. Bitte versuche es erneut.');
      }
      
      // Success State
      this.floatingActionButton.innerHTML = `
        <span class="cos-fab-icon">✅</span>
        <span class="cos-fab-text">Optimiert!</span>
      `;
      this.floatingActionButton.style.background = 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)';
      
      Logger.info('[Instagram] ✅ Comment optimized successfully');
      
      // Zeige Toast
      this.showToast('Kommentar erfolgreich optimiert!', 'success');
      
      // Reset nach 2 Sekunden
      setTimeout(() => {
        if (this.floatingActionButton) {
          this.floatingActionButton.innerHTML = originalHTML;
          this.floatingActionButton.style.pointerEvents = 'auto';
          this.floatingActionButton.style.background = 'linear-gradient(135deg, #E4405F 0%, #C13584 100%)';
        }
        this.isProcessing = false;
      }, 2000);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      Logger.error('[Instagram] Comment optimization error:', error);
      
      // Spezielle Behandlung für Extension Context Invalidated
      let displayMessage = errorMessage;
      if (errorMessage.includes('Extension context invalidated') || 
          errorMessage.includes('Extension wurde neu geladen') ||
          errorMessage.includes('invalidated')) {
        displayMessage = 'Extension wurde neu geladen. Bitte lade die Seite neu (F5 oder Strg+R).';
      }
      
      // Zeige Toast mit Fehlermeldung
      this.showToast(displayMessage, 'error');
      
      // Error State
      if (this.floatingActionButton) {
        this.floatingActionButton.innerHTML = `
          <span class="cos-fab-icon">❌</span>
          <span class="cos-fab-text">Fehler</span>
        `;
        this.floatingActionButton.style.background = 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)';
        this.floatingActionButton.title = errorMessage;
        
        setTimeout(() => {
          if (this.floatingActionButton) {
            this.floatingActionButton.innerHTML = originalHTML;
            this.floatingActionButton.style.pointerEvents = 'auto';
            this.floatingActionButton.style.background = 'linear-gradient(135deg, #E4405F 0%, #C13584 100%)';
            this.floatingActionButton.title = 'Kommentar optimieren';
          }
          this.isProcessing = false;
        }, 2000);
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
   * Injiziert Toast-Styles und FAB-Animationen
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
      @keyframes spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
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

