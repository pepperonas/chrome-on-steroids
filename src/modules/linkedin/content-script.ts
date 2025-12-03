import { LinkedInDOMService } from './services/LinkedInDOMService';
import { ArticleOptimizer } from './services/ArticleOptimizer';
import { StorageService } from '../../shared/services/StorageService';
import { LinkedInSettings } from './models/LinkedInSettings';
import { LinkedInArticle } from './models/LinkedInArticle';
import { Logger } from '../../shared/utils/logger';

/**
 * Content Script für LinkedIn Artikel-Editor und Posts
 */
class LinkedInContentScript {
  private optimizeButton: HTMLElement | null = null;
  private postOptimizeButton: HTMLElement | null = null;
  private commentOptimizeButton: HTMLElement | null = null;
  private isProcessing = false;
  private shareBoxObserver: MutationObserver | null = null;
  private commentObserver: MutationObserver | null = null;

  constructor() {
    Logger.info('[LinkedIn] Content Script initialized');
    this.injectToastStyles();
    this.init();
  }

  private init(): void {
    // Prüfe ob wir auf der Artikel-Seite sind
    if (LinkedInDOMService.isArticleEditorPage()) {
      Logger.info('[LinkedIn] Article editor page detected! Creating optimize button...');
      this.waitForEditor(() => {
        this.createOptimizeButton();
      });
    }

    // Beobachte das Share-Box-Modal für normale Posts
    this.observeShareBox();
    
    // Beobachte Kommentar-Editoren
    this.observeCommentEditors();
  }

  /**
   * Beobachtet das Share-Box-Modal für normale Posts
   */
  private observeShareBox(): void {
    // Prüfe initial ob Modal bereits offen ist
    const checkInitial = () => {
      if (LinkedInDOMService.isShareBoxOpen() && !this.postOptimizeButton) {
        setTimeout(() => {
          this.createPostOptimizeButton();
        }, 300);
      }
    };
    
    // Mehrfache Versuche, da Share-Box dynamisch geladen wird
    checkInitial();
    setTimeout(checkInitial, 500);
    setTimeout(checkInitial, 1000);
    setTimeout(checkInitial, 2000);

    // Beobachte Änderungen am Modal
    this.shareBoxObserver = new MutationObserver(() => {
      if (LinkedInDOMService.isShareBoxOpen() && !this.postOptimizeButton) {
        setTimeout(() => {
          this.createPostOptimizeButton();
        }, 300);
      } else if (!LinkedInDOMService.isShareBoxOpen() && this.postOptimizeButton) {
        // Prüfe ob Button noch im DOM ist, bevor wir ihn zurücksetzen
        if (!document.body.contains(this.postOptimizeButton)) {
          this.postOptimizeButton = null;
        }
      }
    });

    this.shareBoxObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-hidden', 'class', 'style']
    });
  }

  /**
   * Beobachtet Kommentar-Editoren
   */
  private observeCommentEditors(): void {
    // Prüfe initial ob Kommentar-Editor bereits sichtbar ist
    const checkInitial = () => {
      const isVisible = LinkedInDOMService.isCommentEditorVisible();
      const hasButton = this.commentOptimizeButton && document.body.contains(this.commentOptimizeButton);
      
      Logger.info('[LinkedIn] Checking comment editor:', { isVisible, hasButton });
      
      if (isVisible && !hasButton) {
        Logger.info('[LinkedIn] Comment editor visible, creating button...');
        // Versuche mehrfach mit verschiedenen Delays
        setTimeout(() => this.createCommentOptimizeButton(), 100);
        setTimeout(() => this.createCommentOptimizeButton(), 500);
        setTimeout(() => this.createCommentOptimizeButton(), 1000);
      }
    };
    
    // Mehrfache Versuche, da Kommentar-Editoren dynamisch geladen werden
    checkInitial();
    setTimeout(checkInitial, 500);
    setTimeout(checkInitial, 1000);
    setTimeout(checkInitial, 2000);
    setTimeout(checkInitial, 3000);

    // Beobachte Änderungen für Kommentar-Editoren
    this.commentObserver = new MutationObserver(() => {
      const isVisible = LinkedInDOMService.isCommentEditorVisible();
      const hasButton = this.commentOptimizeButton && document.body.contains(this.commentOptimizeButton);
      
      if (isVisible && !hasButton) {
        Logger.info('[LinkedIn] Comment editor became visible, creating button...');
        // Versuche mehrfach mit verschiedenen Delays
        setTimeout(() => this.createCommentOptimizeButton(), 100);
        setTimeout(() => this.createCommentOptimizeButton(), 500);
        setTimeout(() => this.createCommentOptimizeButton(), 1000);
      } else if (!isVisible && this.commentOptimizeButton) {
        // Prüfe ob Button noch im DOM ist, bevor wir ihn zurücksetzen
        if (!document.body.contains(this.commentOptimizeButton)) {
          Logger.info('[LinkedIn] Comment editor closed, resetting button');
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
   * Wartet bis der Editor geladen ist
   */
  private waitForEditor(callback: () => void, maxAttempts: number = 50): void {
    let attempts = 0;
    const checkEditor = () => {
      const editor = document.querySelector('[data-test-article-editor-content-textbox]');
      if (editor) {
        callback();
      } else if (attempts < maxAttempts) {
        attempts++;
        setTimeout(checkEditor, 200);
      } else {
        Logger.warn('[LinkedIn] Editor not found after max attempts');
      }
    };
    checkEditor();
  }

  /**
   * Erstellt den Optimierungs-Button
   */
  private createOptimizeButton(): void {
    if (this.optimizeButton) {
      return; // Button bereits vorhanden
    }

    const container = LinkedInDOMService.getOptimizeButtonContainer();
    if (!container) {
      Logger.warn('[LinkedIn] Could not find button container');
      return;
    }

    // Erstelle Button
    const button = document.createElement('button');
    button.className = 'artdeco-button artdeco-button--secondary artdeco-button--2';
    button.innerHTML = `
      <svg role="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
      <span>💎 Optimieren</span>
    `;
    button.style.display = 'flex';
    button.style.alignItems = 'center';
    button.style.gap = '8px';
    button.style.cursor = 'pointer';
    button.title = 'Artikel-Inhalt mit KI optimieren';

    button.addEventListener('click', () => this.handleOptimizeClick());

    container.appendChild(button);
    this.optimizeButton = button;

    // Füge Container zur Toolbar hinzu
    const toolbar = document.querySelector('.article-editor-toolbar');
    if (toolbar && !toolbar.contains(container)) {
      toolbar.appendChild(container);
    }

    Logger.info('[LinkedIn] Optimize button created');
  }

  /**
   * Erstellt den Optimierungs-Button für normale Posts
   */
  private createPostOptimizeButton(): void {
    if (this.postOptimizeButton && document.body.contains(this.postOptimizeButton)) {
      return; // Button bereits vorhanden und im DOM
    }

    const container = LinkedInDOMService.getPostOptimizeButtonContainer();
    if (!container) {
      Logger.warn('[LinkedIn] Could not find post button container');
      return;
    }

    // Prüfe ob Button bereits im Container existiert
    if (container.querySelector('.cos-post-optimize-btn')) {
      this.postOptimizeButton = container.querySelector('.cos-post-optimize-btn') as HTMLElement;
      return;
    }

    // Erstelle Button
    const button = document.createElement('button');
    button.className = 'artdeco-button artdeco-button--secondary artdeco-button--2 cos-post-optimize-btn';
    button.innerHTML = `
      <svg role="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
      <span>💎 Optimieren</span>
    `;
    button.style.display = 'flex';
    button.style.alignItems = 'center';
    button.style.gap = '8px';
    button.style.cursor = 'pointer';
    button.style.marginRight = '8px';
    button.title = 'Beitrag mit KI optimieren';

    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handlePostOptimizeClick();
    });

    container.appendChild(button);
    this.postOptimizeButton = button;

    Logger.info('[LinkedIn] Post optimize button created and added to container');
  }

  /**
   * Erstellt den Optimierungs-Button für Kommentare
   */
  private createCommentOptimizeButton(): void {
    if (this.commentOptimizeButton && document.body.contains(this.commentOptimizeButton)) {
      Logger.info('[LinkedIn] Comment optimize button already exists in DOM');
      return; // Button bereits vorhanden und im DOM
    }

    Logger.info('[LinkedIn] Creating comment optimize button...');
    const container = LinkedInDOMService.getCommentOptimizeButtonContainer();
    if (!container) {
      Logger.warn('[LinkedIn] Could not find comment button container');
      return;
    }

    Logger.info('[LinkedIn] Comment button container found:', container);

    // Prüfe ob Button bereits im Container existiert
    const existingButton = container.querySelector('.cos-comment-optimize-btn');
    if (existingButton) {
      Logger.info('[LinkedIn] Comment optimize button already exists in container');
      this.commentOptimizeButton = existingButton as HTMLElement;
      return;
    }

    // Erstelle Button
    const button = document.createElement('button');
    button.className = 'artdeco-button artdeco-button--secondary artdeco-button--2 cos-comment-optimize-btn';
    button.innerHTML = `
      <svg role="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 4px;">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
      <span>💎 Optimieren</span>
    `;
    button.style.display = 'inline-flex';
    button.style.alignItems = 'center';
    button.style.gap = '4px';
    button.style.cursor = 'pointer';
    button.style.fontSize = '13px';
    button.style.padding = '6px 12px';
    button.style.marginRight = '8px';
    button.style.verticalAlign = 'middle';
    button.title = 'Kommentar mit KI optimieren';

    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleCommentOptimizeClick();
    });

    // Füge den Button direkt VOR dem Submit-Button ein (falls vorhanden)
    const submitButton = container.querySelector('.comments-comment-box__submit-button--cr, .comments-comment-box__submit-button, button[class*="primary"]');
    if (submitButton && submitButton.parentElement === container) {
      container.insertBefore(button, submitButton);
    } else {
      container.appendChild(button);
    }
    this.commentOptimizeButton = button;

    Logger.info('[LinkedIn] Comment optimize button created and added to container', {
      container: container.className,
      buttonInDOM: document.body.contains(button),
      containerInDOM: document.body.contains(container),
      buttonVisible: button.offsetParent !== null
    });
  }

  /**
   * Behandelt Klick auf "Post optimieren"
   */
  private async handlePostOptimizeClick(): Promise<void> {
    if (this.isProcessing || !this.postOptimizeButton) return;

    this.isProcessing = true;
    const originalHTML = this.postOptimizeButton.innerHTML;

    try {
      // Loading State
      this.postOptimizeButton.innerHTML = `
        <svg role="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px; animation: spin 1s linear infinite;">
          <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
        </svg>
        <span>Optimiere...</span>
      `;
      this.postOptimizeButton.style.pointerEvents = 'none';

      // Extrahiere Post-Daten
      const post = LinkedInDOMService.extractPostData();
      if (!post) {
        throw new Error('Beitrag-Daten konnten nicht extrahiert werden');
      }
      if (!post.content) {
        throw new Error('Bitte fülle zuerst den Beitrag aus');
      }

      Logger.info('[LinkedIn] Post data extracted:', post);

      // Optimiere Post
      this.postOptimizeButton.innerHTML = `
        <svg role="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px; animation: spin 1s linear infinite;">
          <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
        </svg>
        <span>KI arbeitet...</span>
      `;

      const optimizedContent = await ArticleOptimizer.optimizeArticle(post, 'post');

      Logger.info('[LinkedIn] Post optimized:', {
        originalLength: post.content.length,
        optimizedLength: optimizedContent.length
      });

      // Füge optimierten Content ein (type = 'post', ohne Formatierung)
      const inserted = LinkedInDOMService.insertOptimizedContent(optimizedContent, 'post', false);
      if (!inserted) {
        throw new Error('Content konnte nicht eingefügt werden. Bitte versuche es erneut.');
      }

      // Success State
      this.postOptimizeButton.innerHTML = `
        <svg role="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
        <span>Optimiert!</span>
      `;
      this.postOptimizeButton.style.backgroundColor = '#4caf50';
      this.postOptimizeButton.style.color = '#fff';

      Logger.info('[LinkedIn] ✅ Post optimized successfully');

      // Zeige Toast
      this.showToast('Beitrag erfolgreich optimiert!', 'success');

      // Reset nach 3 Sekunden
      setTimeout(() => {
        if (this.postOptimizeButton) {
          this.postOptimizeButton.innerHTML = originalHTML;
          this.postOptimizeButton.style.pointerEvents = 'auto';
          this.postOptimizeButton.style.backgroundColor = '';
          this.postOptimizeButton.style.color = '';
        }
        this.isProcessing = false;
      }, 3000);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      Logger.error('[LinkedIn] Post optimization error:', error);

      // Zeige Toast mit Fehlermeldung
      this.showToast(errorMessage, 'error');

      // Error State
      if (this.postOptimizeButton) {
        this.postOptimizeButton.innerHTML = `
          <svg role="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
          <span>Fehler</span>
        `;
        this.postOptimizeButton.style.backgroundColor = '#f44336';
        this.postOptimizeButton.style.color = '#fff';
        this.postOptimizeButton.title = errorMessage;

        setTimeout(() => {
          if (this.postOptimizeButton) {
            this.postOptimizeButton.innerHTML = originalHTML;
            this.postOptimizeButton.style.pointerEvents = 'auto';
            this.postOptimizeButton.style.backgroundColor = '';
            this.postOptimizeButton.style.color = '';
            this.postOptimizeButton.title = 'Beitrag mit KI optimieren';
          }
          this.isProcessing = false;
        }, 3000);
      }
    }
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
      this.commentOptimizeButton.innerHTML = `
        <svg role="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 4px; animation: spin 1s linear infinite;">
          <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
        </svg>
        <span>Optimiere...</span>
      `;
      this.commentOptimizeButton.style.pointerEvents = 'none';

      // Extrahiere Kommentar-Daten
      const comment = LinkedInDOMService.extractCommentData();
      if (!comment) {
        throw new Error('Kommentar-Daten konnten nicht extrahiert werden');
      }
      if (!comment.content) {
        throw new Error('Bitte fülle zuerst den Kommentar aus');
      }

      Logger.info('[LinkedIn] Comment data extracted:', comment);

      // Optimiere Kommentar
      this.commentOptimizeButton.innerHTML = `
        <svg role="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 4px; animation: spin 1s linear infinite;">
          <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
        </svg>
        <span>KI arbeitet...</span>
      `;

      const optimizedContent = await ArticleOptimizer.optimizeArticle(comment, 'comment');

      Logger.info('[LinkedIn] Comment optimized:', {
        originalLength: comment.content.length,
        optimizedLength: optimizedContent.length
      });

      // Füge optimierten Content ein (type = 'comment', ohne Formatierung)
      const inserted = LinkedInDOMService.insertOptimizedContent(optimizedContent, 'comment', false);
      if (!inserted) {
        throw new Error('Kommentar konnte nicht eingefügt werden. Bitte versuche es erneut.');
      }

      // Success State
      this.commentOptimizeButton.innerHTML = `
        <svg role="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 4px;">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
        <span>Optimiert!</span>
      `;
      this.commentOptimizeButton.style.backgroundColor = '#4caf50';
      this.commentOptimizeButton.style.color = '#fff';

      Logger.info('[LinkedIn] ✅ Comment optimized successfully');

      // Zeige Toast
      this.showToast('Kommentar erfolgreich optimiert!', 'success');

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
      Logger.error('[LinkedIn] Comment optimization error:', error);

      // Zeige Toast mit Fehlermeldung
      this.showToast(errorMessage, 'error');

      // Error State
      if (this.commentOptimizeButton) {
        this.commentOptimizeButton.innerHTML = `
          <svg role="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 4px;">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
          <span>Fehler</span>
        `;
        this.commentOptimizeButton.style.backgroundColor = '#f44336';
        this.commentOptimizeButton.style.color = '#fff';
        this.commentOptimizeButton.title = errorMessage;

        setTimeout(() => {
          if (this.commentOptimizeButton) {
            this.commentOptimizeButton.innerHTML = originalHTML;
            this.commentOptimizeButton.style.pointerEvents = 'auto';
            this.commentOptimizeButton.style.backgroundColor = '';
            this.commentOptimizeButton.style.color = '';
            this.commentOptimizeButton.title = 'Kommentar mit KI optimieren';
          }
          this.isProcessing = false;
        }, 3000);
      }
    }
  }

  /**
   * Behandelt Klick auf "Artikel optimieren"
   */
  private async handleOptimizeClick(): Promise<void> {
    if (this.isProcessing || !this.optimizeButton) return;

    this.isProcessing = true;
    const originalHTML = this.optimizeButton.innerHTML;

    try {
      // Loading State
      this.optimizeButton.innerHTML = `
        <svg role="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px; animation: spin 1s linear infinite;">
          <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
        </svg>
        <span>Optimiere...</span>
      `;
      this.optimizeButton.style.pointerEvents = 'none';

      // Extrahiere Artikel-Daten
      const article = LinkedInDOMService.extractArticleData();
      if (!article) {
        throw new Error('Artikel-Daten konnten nicht extrahiert werden');
      }
      if (!article.title && !article.content) {
        throw new Error('Bitte fülle zuerst Titel oder Inhalt aus');
      }

      Logger.info('[LinkedIn] Article data extracted:', article);

      // Optimiere Artikel
      this.optimizeButton.innerHTML = `
        <svg role="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px; animation: spin 1s linear infinite;">
          <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
        </svg>
        <span>KI arbeitet...</span>
      `;

      // Lade LinkedIn-Einstellungen
      const linkedInSettings = await StorageService.load<LinkedInSettings>('linkedin_settings');
      const optimizeTitle = linkedInSettings?.optimizeTitle !== false; // Default: true
      const useStyling = linkedInSettings?.useStyling !== false; // Default: true

      // Speichere Original-Titel für später
      const originalTitle = article.title;

      // Optimiere Titel wenn aktiviert
      if (optimizeTitle && article.title) {
        this.optimizeButton.innerHTML = `
          <svg role="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px; animation: spin 1s linear infinite;">
            <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
          </svg>
          <span>Optimiere Titel...</span>
        `;

        const optimizedTitle = await ArticleOptimizer.optimizeTitle(article.title);
        LinkedInDOMService.insertOptimizedTitle(optimizedTitle);
        
        // Aktualisiere article.title für Content-Optimierung (mit optimiertem Titel)
        article.title = optimizedTitle;
      }

      // Optimiere Content (ohne Titel im Content zu wiederholen)
      this.optimizeButton.innerHTML = `
        <svg role="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px; animation: spin 1s linear infinite;">
          <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
        </svg>
        <span>Optimiere Inhalt...</span>
      `;

      // Stelle sicher, dass der Titel nicht im Content wiederholt wird
      // Entferne Titel-Erwähnungen aus dem Content
      let contentWithoutTitle = article.content;
      if (originalTitle) {
        // Entferne Titel-Erwähnungen am Anfang des Contents
        const titleVariations = [
          originalTitle,
          `**Titel:** ${originalTitle}`,
          `Titel: ${originalTitle}`,
          `# ${originalTitle}`,
          `## ${originalTitle}`
        ];
        
        for (const titleVar of titleVariations) {
          if (contentWithoutTitle.startsWith(titleVar)) {
            contentWithoutTitle = contentWithoutTitle.substring(titleVar.length).trim();
            // Entferne führende Leerzeichen und Zeilenumbrüche
            contentWithoutTitle = contentWithoutTitle.replace(/^[\s\n\r]+/, '');
          }
        }
      }

      // Erstelle Artikel-Objekt ohne Titel-Erwähnung im Content
      const articleForOptimization: LinkedInArticle = {
        title: article.title, // Optimierter Titel (falls optimiert)
        content: contentWithoutTitle
      };

      const optimizedContent = await ArticleOptimizer.optimizeArticle(articleForOptimization, 'article');

      Logger.info('[LinkedIn] Article optimized:', {
        originalLength: article.content.length,
        optimizedLength: optimizedContent.length,
        titleOptimized: optimizeTitle && !!article.title
      });

      // Füge optimierten Content ein (type = 'article' für Artikel, mit Styling)
      const inserted = LinkedInDOMService.insertOptimizedContent(optimizedContent, 'article', useStyling);
      if (!inserted) {
        throw new Error('Content konnte nicht eingefügt werden. Bitte versuche es erneut.');
      }

      // Success State
      this.optimizeButton.innerHTML = `
        <svg role="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
        <span>Optimiert!</span>
      `;
      this.optimizeButton.style.backgroundColor = '#4caf50';
      this.optimizeButton.style.color = '#fff';

      Logger.info('[LinkedIn] ✅ Article optimized successfully');

      // Zeige Toast
      this.showToast('Artikel erfolgreich optimiert!', 'success');

      // Reset nach 3 Sekunden
      setTimeout(() => {
        if (this.optimizeButton) {
          this.optimizeButton.innerHTML = originalHTML;
          this.optimizeButton.style.pointerEvents = 'auto';
          this.optimizeButton.style.backgroundColor = '';
          this.optimizeButton.style.color = '';
        }
        this.isProcessing = false;
      }, 3000);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      Logger.error('[LinkedIn] Optimization error:', error);

      // Zeige Toast mit Fehlermeldung
      this.showToast(errorMessage, 'error');

      // Error State
      if (this.optimizeButton) {
        this.optimizeButton.innerHTML = `
          <svg role="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
          <span>Fehler</span>
        `;
        this.optimizeButton.style.backgroundColor = '#f44336';
        this.optimizeButton.style.color = '#fff';
        this.optimizeButton.title = errorMessage;

        setTimeout(() => {
          if (this.optimizeButton) {
            this.optimizeButton.innerHTML = originalHTML;
            this.optimizeButton.style.pointerEvents = 'auto';
            this.optimizeButton.style.backgroundColor = '';
            this.optimizeButton.style.color = '';
            this.optimizeButton.title = 'Artikel-Inhalt mit KI optimieren';
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
    // Entferne vorhandene Toasts
    const existingToasts = document.querySelectorAll('.cos-toast');
    existingToasts.forEach(toast => toast.remove());

    // Erstelle Toast
    const toast = document.createElement('div');
    toast.className = `cos-toast cos-toast-${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);

    // Zeige Toast
    setTimeout(() => {
      toast.classList.add('cos-toast-show');
    }, 10);

    // Entferne Toast nach 5 Sekunden
    setTimeout(() => {
      toast.classList.remove('cos-toast-show');
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 5000);
  }

  /**
   * Injiziert Toast-Styles
   */
  private injectToastStyles(): void {
    if (document.getElementById('cos-toast-styles')) return;

    const style = document.createElement('style');
    style.id = 'cos-toast-styles';
    style.textContent = `
      .cos-toast {
        position: fixed;
        top: 20px;
        right: 20px;
        background: #2C2E3B;
        color: #FFFFFF;
        padding: 16px 24px;
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 100000;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 14px;
        font-weight: 500;
        max-width: 400px;
        opacity: 0;
        transform: translateX(400px);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border-left: 4px solid;
      }
      .cos-toast-show {
        opacity: 1;
        transform: translateX(0);
      }
      .cos-toast-error {
        border-left-color: #f44336;
        background: #2C2E3B;
      }
      .cos-toast-success {
        border-left-color: #4caf50;
        background: #2C2E3B;
      }
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }
}

// Initialisiere Content Script (für Artikel und Posts)
if (window.location.hostname.includes('linkedin.com')) {
  new LinkedInContentScript();
}

