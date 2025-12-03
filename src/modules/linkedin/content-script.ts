import { LinkedInDOMService } from './services/LinkedInDOMService';
import { ArticleOptimizer } from './services/ArticleOptimizer';
import { PostOptimizer } from './services/PostOptimizer';
import { CommentOptimizer } from './services/CommentOptimizer';
import { ChatOptimizer } from './services/ChatOptimizer';
// ReplyOptimizer wird später verwendet, wenn Antworten auf Kommentare implementiert werden
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
  private floatingActionButton: HTMLElement | null = null;
  private focusedCommentEditor: HTMLElement | null = null;
  private isProcessing = false;
  private shareBoxObserver: MutationObserver | null = null;
  private commentObserver: MutationObserver | null = null;
  private articleObserver: MutationObserver | null = null;
  private shareBoxCheckTimeout: number | null = null;
  private commentCheckTimeout: number | null = null;
  private articleCheckTimeout: number | null = null;

  constructor() {
    Logger.info('[LinkedIn] Content Script initialized');
    this.injectToastStyles();
    this.init();
  }

  private init(): void {
    // Prüfe ob wir auf der Artikel-Seite sind
    if (LinkedInDOMService.isArticleEditorPage()) {
      Logger.info('[LinkedIn] Article editor page detected! Creating optimize button...');
      
      // Sofortige Prüfung und mehrfache Versuche mit verschiedenen Delays
      const tryCreateButton = () => {
        const editor = document.querySelector('[data-test-article-editor-content-textbox]');
        const toolbar = document.querySelector('.article-editor-toolbar');
        if (editor || toolbar) {
          Logger.info('[LinkedIn] Editor or toolbar found, creating button...');
          this.createOptimizeButton();
          return true;
        }
        return false;
      };
      
      // Versuche sofort
      if (!tryCreateButton()) {
        // Mehrfache Versuche mit verschiedenen Delays
        setTimeout(() => tryCreateButton(), 100);
        setTimeout(() => tryCreateButton(), 300);
        setTimeout(() => tryCreateButton(), 500);
        setTimeout(() => tryCreateButton(), 1000);
        setTimeout(() => tryCreateButton(), 2000);
        setTimeout(() => tryCreateButton(), 3000);
      }
      
      // Verwende auch die waitForEditor Methode als Fallback
      this.waitForEditor(() => {
        this.createOptimizeButton();
      });
      
      // Beobachte auch Änderungen für Artikel-Editoren (z.B. bei Navigation zu /article/edit/)
      this.observeArticleEditor();
    }

    // Beobachte das Share-Box-Modal für normale Posts
    this.observeShareBox();
    
    // Beobachte Kommentar- und Chat-Editoren mit FAB-Logik
    this.observeCommentEditorsWithFAB();
    this.observeChatEditorsWithFAB();
    
    // Beobachte URL-Änderungen für Artikel-Editor (pushstate und popstate)
    this.observeUrlChanges();
  }
  
  /**
   * Beobachtet URL-Änderungen für Artikel-Editor
   */
  private observeUrlChanges(): void {
    // Interceptiere pushState und replaceState
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    const handleUrlChange = () => {
      if (LinkedInDOMService.isArticleEditorPage()) {
        Logger.info('[LinkedIn] URL changed to article editor page, checking for button...');
        
        // Mehrfache Versuche mit verschiedenen Delays
        const tryCreate = () => {
          const editor = document.querySelector('[data-test-article-editor-content-textbox]');
          const toolbar = document.querySelector('.article-editor-toolbar');
          
          if ((editor || toolbar) && (!this.optimizeButton || !document.body.contains(this.optimizeButton))) {
            Logger.info('[LinkedIn] Editor or toolbar found after URL change, creating button...');
            this.createOptimizeButton();
            return true;
          }
          return false;
        };
        
        // Versuche sofort und mit Delays
        if (!tryCreate()) {
          setTimeout(() => tryCreate(), 200);
          setTimeout(() => tryCreate(), 500);
          setTimeout(() => tryCreate(), 1000);
          setTimeout(() => tryCreate(), 2000);
        }
      }
    };
    
    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      setTimeout(handleUrlChange, 100);
    };
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      setTimeout(handleUrlChange, 100);
    };
    
    window.addEventListener('popstate', handleUrlChange);
    
    // Prüfe auch initial, ob wir bereits auf einer Artikel-Seite sind
    // (für den Fall, dass das Script nach dem Laden der Seite injiziert wird)
    if (LinkedInDOMService.isArticleEditorPage()) {
      setTimeout(handleUrlChange, 100);
    }
  }

  /**
   * Beobachtet den Artikel-Editor für dynamische Änderungen
   */
  private observeArticleEditor(): void {
    const checkArticleEditor = () => {
      if (!LinkedInDOMService.isArticleEditorPage()) {
        return;
      }
      
      // Prüfe ob Button bereits existiert (durchsuche alle Buttons nach dem Text)
      const allButtons = document.querySelectorAll('.artdeco-button--secondary');
      for (const btn of Array.from(allButtons)) {
        const button = btn as HTMLElement;
        const text = button.textContent?.trim() || button.innerText?.trim() || '';
        if (text.includes('💎 Optimieren')) {
          this.optimizeButton = button;
          return;
        }
      }
      
      if (this.optimizeButton && document.body.contains(this.optimizeButton)) {
        return;
      }
      
      // Prüfe auf Editor ODER Toolbar (Toolbar kann auch ohne Editor vorhanden sein)
      const editor = document.querySelector('[data-test-article-editor-content-textbox]');
      const toolbar = document.querySelector('.article-editor-toolbar');
      
      if (editor || toolbar) {
        Logger.info('[LinkedIn] Article editor or toolbar detected, creating button...', {
          hasEditor: !!editor,
          hasToolbar: !!toolbar
        });
        this.createOptimizeButton();
      }
    };
    
    // Prüfe sofort und nach Delays (mehr Versuche für bessere Erkennung)
    checkArticleEditor();
    setTimeout(checkArticleEditor, 100);
    setTimeout(checkArticleEditor, 300);
    setTimeout(checkArticleEditor, 600);
    setTimeout(checkArticleEditor, 1000);
    setTimeout(checkArticleEditor, 1500);
    setTimeout(checkArticleEditor, 2000);
    setTimeout(checkArticleEditor, 3000);
    setTimeout(checkArticleEditor, 5000);
    
    this.articleObserver = new MutationObserver(() => {
      // Debounce: Lösche vorherigen Timeout
      if (this.articleCheckTimeout) {
        clearTimeout(this.articleCheckTimeout);
      }
      
      this.articleCheckTimeout = window.setTimeout(() => {
        checkArticleEditor();
      }, 500);
    });

    // Beobachte sowohl den Editor als auch die Toolbar
    this.articleObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-test-article-editor-content-textbox', 'class']
    });
    
    // Beobachte auch spezifisch die Toolbar
    const toolbarObserver = new MutationObserver(() => {
      if (LinkedInDOMService.isArticleEditorPage()) {
        const toolbar = document.querySelector('.article-editor-toolbar');
        if (toolbar && (!this.optimizeButton || !document.body.contains(this.optimizeButton))) {
          Logger.info('[LinkedIn] Toolbar detected via MutationObserver, creating button...');
          setTimeout(() => this.createOptimizeButton(), 100);
        }
      }
    });
    
    toolbarObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });
  }

  /**
   * Beobachtet das Share-Box-Modal für normale Posts
   */
  private observeShareBox(): void {
    let lastCheckTime = 0;
    const MIN_CHECK_INTERVAL = 1000; // Mindestens 1 Sekunde zwischen Checks
    
    // Prüfe initial ob Modal bereits offen ist
    const checkInitial = () => {
      if (LinkedInDOMService.isShareBoxOpen()) {
        // Prüfe ob bereits ein Button existiert
        const container = LinkedInDOMService.getPostOptimizeButtonContainer();
        if (container && !container.querySelector('.cos-post-optimize-btn')) {
          setTimeout(() => {
            this.createPostOptimizeButton();
          }, 300);
        } else if (container && container.querySelector('.cos-post-optimize-btn')) {
          // Button existiert bereits, setze Referenz
          this.postOptimizeButton = container.querySelector('.cos-post-optimize-btn') as HTMLElement;
        }
      }
    };
    
    // Mehrfache Versuche, da Share-Box dynamisch geladen wird
    checkInitial();
    setTimeout(checkInitial, 500);
    setTimeout(checkInitial, 1000);
    setTimeout(checkInitial, 2000);

    // Beobachte Änderungen am Modal
    this.shareBoxObserver = new MutationObserver((mutations) => {
      // Ignoriere Mutationen, die von unserem eigenen Button stammen
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (node instanceof HTMLElement && 
              (node.classList.contains('cos-post-optimize-btn') || 
               node.querySelector('.cos-post-optimize-btn'))) {
            return; // Ignoriere unsere eigenen Änderungen
          }
        }
      }
      
      // Rate limiting: Verhindere zu häufige Checks
      const now = Date.now();
      if (now - lastCheckTime < MIN_CHECK_INTERVAL) {
        return;
      }
      lastCheckTime = now;
      
      // Debounce: Lösche vorherigen Timeout
      if (this.shareBoxCheckTimeout) {
        clearTimeout(this.shareBoxCheckTimeout);
      }
      
      this.shareBoxCheckTimeout = window.setTimeout(() => {
        // Prüfe ob Share-Box noch offen ist
        if (!LinkedInDOMService.isShareBoxOpen()) {
          // Share-Box ist geschlossen, prüfe ob Button noch im DOM ist
          if (this.postOptimizeButton && !document.body.contains(this.postOptimizeButton)) {
            this.postOptimizeButton = null;
          }
          return;
        }
        
        // Share-Box ist offen, prüfe ob Button existiert
        const container = LinkedInDOMService.getPostOptimizeButtonContainer();
        if (!container) {
          return; // Container nicht gefunden, warte auf nächsten Check
        }
        
        const existingButton = container.querySelector('.cos-post-optimize-btn');
        if (existingButton && document.body.contains(existingButton)) {
          // Button existiert bereits, setze Referenz
          this.postOptimizeButton = existingButton as HTMLElement;
          return;
        }
        
        // Button existiert nicht, erstelle ihn
        this.createPostOptimizeButton();
      }, 500);
    });

    this.shareBoxObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-hidden', 'class', 'style']
    });
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
      // Ignoriere, wenn Share-Box offen ist
      if (LinkedInDOMService.isShareBoxOpen()) {
        return;
      }
      
      // Finde alle Kommentar-Editoren
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
      
      for (const selector of editorSelectors) {
        const editors = document.querySelectorAll(selector);
        for (const editor of Array.from(editors)) {
          const editorElement = editor as HTMLElement;
          
          // Prüfe ob Editor sichtbar ist
          if (editorElement.offsetParent === null || 
              editorElement.getAttribute('aria-hidden') === 'true') {
            continue;
          }
          
          // Prüfe ob bereits Listener angehängt wurden
          if (editorElement.hasAttribute('data-cos-fab-listener')) {
            continue;
          }
          
          // Markiere als bearbeitet
          editorElement.setAttribute('data-cos-fab-listener', 'true');
          
          // Handler-Funktion für Editor-Aktivierung
          const handleEditorActivation = () => {
            if (LinkedInDOMService.isShareBoxOpen()) {
              return;
            }
            this.focusedCommentEditor = editorElement;
            this.showFloatingActionButton();
            Logger.info('[LinkedIn] Comment editor activated, showing FAB');
          };
          
          // Focus Event: Zeige FAB und speichere Editor
          editorElement.addEventListener('focus', handleEditorActivation, true);
          
          // Click Event: Zeige FAB auch bei Klick (falls Focus nicht ausgelöst wird)
          editorElement.addEventListener('click', () => {
            setTimeout(handleEditorActivation, 50);
          }, true);
          
          // Input Event: Zeige FAB wenn Text eingegeben wird
          editorElement.addEventListener('input', () => {
            if (document.activeElement === editorElement || 
                editorElement.contains(document.activeElement) ||
                editorElement === document.activeElement) {
              handleEditorActivation();
            }
          }, true);
          
          // Prüfe ob dieser Editor bereits fokussiert ist
          if (document.activeElement === editorElement || 
              editorElement.contains(document.activeElement) ||
              editorElement === document.activeElement) {
            handleEditorActivation();
          }
          
          // Blur Event: Verstecke FAB nach kurzer Verzögerung (falls nicht zu einem anderen Editor gewechselt wird)
          editorElement.addEventListener('blur', () => {
            // Kurze Verzögerung, um zu prüfen, ob ein anderer Editor fokussiert wird
            setTimeout(() => {
              const activeElement = document.activeElement as HTMLElement;
              // Prüfe ob ein anderer Kommentar-Editor fokussiert ist
              const isCommentEditor = activeElement && (
                activeElement.closest('.comments-comment-box') ||
                activeElement.closest('.comments-comment-box__form') ||
                activeElement.closest('.comments-comment-texteditor') ||
                activeElement.closest('.comment-box') ||
                activeElement.classList.contains('ql-editor') ||
                activeElement.hasAttribute('data-test-ql-editor-contenteditable')
              );
              
              if (!isCommentEditor) {
                this.focusedCommentEditor = null;
                this.hideFloatingActionButton();
                Logger.info('[LinkedIn] Comment editor blurred, hiding FAB');
              } else {
                // Ein anderer Editor wurde fokussiert, aktualisiere Referenz
                const newEditor = activeElement.closest('.ql-editor') || 
                                 activeElement.closest('[contenteditable="true"]') ||
                                 activeElement;
                if (newEditor instanceof HTMLElement) {
                  this.focusedCommentEditor = newEditor;
                  this.showFloatingActionButton();
                }
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
      const editor = target.closest('.ql-editor[contenteditable="true"]') ||
                    target.closest('[data-test-ql-editor-contenteditable="true"]') ||
                    target.closest('.comments-comment-box [contenteditable="true"]') ||
                    target.closest('.comments-comment-box__form [contenteditable="true"]') ||
                    target.closest('.comments-comment-texteditor [contenteditable="true"]') ||
                    (target.hasAttribute('contenteditable') && 
                     (target.closest('.comments-comment-box') || 
                      target.closest('.comments-comment-box__form') ||
                      target.closest('.comments-comment-texteditor')));
      
      if (editor instanceof HTMLElement && 
          !LinkedInDOMService.isShareBoxOpen() &&
          editor.offsetParent !== null) {
        setTimeout(() => {
          this.focusedCommentEditor = editor;
          this.showFloatingActionButton();
          Logger.info('[LinkedIn] Editor clicked, showing FAB');
        }, 100);
      }
    }, true);
    
    // Prüfe initial, ob bereits ein Editor fokussiert ist
    setTimeout(() => {
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement) {
        const isCommentEditor = activeElement.closest('.comments-comment-box') ||
                               activeElement.closest('.comments-comment-box__form') ||
                               activeElement.closest('.comments-comment-texteditor') ||
                               activeElement.closest('.comment-box') ||
                               activeElement.classList.contains('ql-editor') ||
                               activeElement.hasAttribute('data-test-ql-editor-contenteditable');
        
        if (isCommentEditor && !LinkedInDOMService.isShareBoxOpen()) {
          const editor = activeElement.closest('.ql-editor') || 
                        activeElement.closest('[contenteditable="true"]') ||
                        activeElement;
          if (editor instanceof HTMLElement && editor.offsetParent !== null) {
            this.focusedCommentEditor = editor;
            this.showFloatingActionButton();
            Logger.info('[LinkedIn] Initial check: Editor already focused, showing FAB');
          }
        }
      }
    }, 500);
    
    // Beobachte Änderungen im DOM, um neue Editoren zu finden
    this.commentObserver = new MutationObserver(() => {
      // Ignoriere, wenn Share-Box offen ist
      if (LinkedInDOMService.isShareBoxOpen()) {
        this.hideFloatingActionButton();
        return;
      }
      
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
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement) {
          const isCommentEditor = activeElement.closest('.comments-comment-box') ||
                                 activeElement.closest('.comments-comment-box__form') ||
                                 activeElement.closest('.comments-comment-texteditor') ||
                                 activeElement.closest('.comment-box') ||
                                 activeElement.classList.contains('ql-editor') ||
                                 activeElement.hasAttribute('data-test-ql-editor-contenteditable');
          
          if (isCommentEditor && !LinkedInDOMService.isShareBoxOpen()) {
            const editor = activeElement.closest('.ql-editor') || 
                          activeElement.closest('[contenteditable="true"]') ||
                          activeElement;
            if (editor instanceof HTMLElement && editor.offsetParent !== null) {
              this.focusedCommentEditor = editor;
              this.showFloatingActionButton();
            }
          }
        }
      }, 300);
    });

    this.commentObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-hidden', 'class', 'style', 'contenteditable']
    });
  }
  
  /**
   * Beobachtet Chat-Editoren mit Floating Action Button (FAB) Logik
   * Der FAB erscheint nur, wenn ein Chat-Editor fokussiert ist
   */
  private observeChatEditorsWithFAB(): void {
    Logger.info('[LinkedIn] Starting to observe chat editors with FAB');
    
    // Erstelle den FAB einmalig (wird bereits in observeCommentEditorsWithFAB erstellt)
    if (!this.floatingActionButton) {
      this.createFloatingActionButton();
    }
    
    // Funktion zum Finden und Anhängen von Event Listenern an alle Chat-Editoren
    const attachFocusListeners = () => {
      // Finde alle Chat-Editoren (priorisiere spezifische Selektoren)
      const editorSelectors = [
        '.msg-form__contenteditable[contenteditable="true"][role="textbox"]',
        '.msg-form__contenteditable[contenteditable="true"]',
        '.msg-form__contenteditable[role="textbox"]',
        '.msg-form__contenteditable',
        '.msg-send-form [contenteditable="true"]',
        '.msg-form__texteditor [contenteditable="true"]',
        '[data-test-msg-form__contenteditable]',
        '.msg-form [contenteditable="true"]',
        '.msg-form__editor [contenteditable="true"]',
        '.msg-form__editor div[contenteditable="true"]',
        'div.msg-form__contenteditable',
        '[contenteditable="true"][role="textbox"][aria-multiline="true"]'
      ];
      
      let foundEditors = 0;
      
      for (const selector of editorSelectors) {
        const editors = document.querySelectorAll(selector);
        Logger.debug(`[LinkedIn] Checking selector "${selector}": found ${editors.length} elements`);
        
        for (const editor of Array.from(editors)) {
          const editorElement = editor as HTMLElement;
          
          // Prüfe ob Editor sichtbar ist
          if (editorElement.offsetParent === null) {
            Logger.debug(`[LinkedIn] Editor with selector "${selector}" has offsetParent === null, skipping`);
            continue;
          }
          
          if (editorElement.getAttribute('aria-hidden') === 'true') {
            Logger.debug(`[LinkedIn] Editor with selector "${selector}" has aria-hidden="true", skipping`);
            continue;
          }
          
          const computedStyle = window.getComputedStyle(editorElement);
          if (computedStyle.display === 'none') {
            Logger.debug(`[LinkedIn] Editor with selector "${selector}" has display="none", skipping`);
            continue;
          }
          
          if (computedStyle.visibility === 'hidden') {
            Logger.debug(`[LinkedIn] Editor with selector "${selector}" has visibility="hidden", skipping`);
            continue;
          }
          
          // Prüfe ob bereits Listener angehängt wurden
          if (editorElement.hasAttribute('data-cos-chat-fab-listener')) {
            Logger.debug(`[LinkedIn] Editor with selector "${selector}" already has listener, skipping`);
            continue;
          }
          
          // Markiere als bearbeitet
          editorElement.setAttribute('data-cos-chat-fab-listener', 'true');
          foundEditors++;
          Logger.info(`[LinkedIn] Attaching FAB listener to chat editor with selector: ${selector}`);
          
          // Handler-Funktion für Editor-Aktivierung
          const handleEditorActivation = () => {
            this.focusedCommentEditor = editorElement; // Verwende gleiche Variable für beide Typen
            this.showFloatingActionButton();
            Logger.info('[LinkedIn] Chat editor activated, showing FAB');
          };
          
          // Focus Event: Zeige FAB und speichere Editor
          editorElement.addEventListener('focus', handleEditorActivation, true);
          
          // Click Event: Zeige FAB auch bei Klick (falls Focus nicht ausgelöst wird)
          editorElement.addEventListener('click', () => {
            setTimeout(handleEditorActivation, 50);
          }, true);
          
          // Input Event: Zeige FAB wenn Text eingegeben wird
          editorElement.addEventListener('input', () => {
            if (document.activeElement === editorElement) {
              handleEditorActivation();
            }
          }, true);
          
          // Prüfe ob dieser Editor bereits fokussiert ist
          if (document.activeElement === editorElement) {
            handleEditorActivation();
          }
          
          // Blur Event: Verstecke FAB nach kurzer Verzögerung (falls nicht zu einem anderen Editor gewechselt wird)
          editorElement.addEventListener('blur', () => {
            // Kurze Verzögerung, um zu prüfen, ob ein anderer Editor fokussiert wird
            setTimeout(() => {
              const activeElement = document.activeElement;
              // Prüfe ob ein anderer Chat- oder Kommentar-Editor fokussiert ist
              if (!activeElement || 
                  !(activeElement instanceof HTMLElement) ||
                  (!LinkedInDOMService.isChatEditorVisible() && 
                   !LinkedInDOMService.isCommentEditorVisible())) {
                this.focusedCommentEditor = null;
                this.hideFloatingActionButton();
                Logger.info('[LinkedIn] Chat editor blurred, hiding FAB');
              } else {
                // Ein anderer Editor wurde fokussiert, aktualisiere Referenz
                this.focusedCommentEditor = activeElement as HTMLElement;
                this.showFloatingActionButton();
              }
            }, 150);
          }, true);
        }
      }
    };
    
    // Initiale Anhänge
    attachFocusListeners();
    
    // Globaler Click-Handler für Chat-Editoren (Fallback, falls Focus nicht funktioniert)
    // Verwende ein separates Event, um Konflikte mit dem Kommentar-Handler zu vermeiden
    const chatClickHandler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;
      
      // Prüfe ob auf einen Chat-Editor geklickt wurde (nicht auf Kommentar-Editor)
      const isCommentEditor = target.closest('.comments-comment-box') ||
                             target.closest('.comments-comment-box__form') ||
                             target.closest('.comments-comment-texteditor') ||
                             target.closest('.comment-box');
      
      if (isCommentEditor) {
        return; // Ignoriere Kommentar-Editoren
      }
      
      // Prüfe ob es ein Chat-Editor ist
      const editor = target.classList.contains('msg-form__contenteditable') ? target :
                    target.closest('.msg-form__contenteditable') ||
                    (target.hasAttribute('contenteditable') && 
                     target.closest('.msg-form') &&
                     !target.closest('.comments-comment-box'));
      
      if (editor instanceof HTMLElement && 
          editor.offsetParent !== null &&
          LinkedInDOMService.isChatPage()) {
        setTimeout(() => {
          this.focusedCommentEditor = editor;
          this.showFloatingActionButton();
          Logger.info('[LinkedIn] Chat editor clicked, showing FAB');
        }, 100);
      }
    };
    
    document.addEventListener('click', chatClickHandler, true);
    
    // Prüfe initial, ob bereits ein Chat-Editor fokussiert ist (mehrfache Versuche)
    const checkInitialFocus = () => {
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement) {
        // Prüfe ob es ein Chat-Editor ist
        const isChatEditor = activeElement.classList.contains('msg-form__contenteditable') ||
                            activeElement.closest('.msg-form__contenteditable') ||
                            (activeElement.hasAttribute('contenteditable') && 
                             activeElement.closest('.msg-form') &&
                             !activeElement.closest('.comments-comment-box'));
        
        if (isChatEditor && LinkedInDOMService.isChatEditorVisible()) {
          const editor = activeElement.classList.contains('msg-form__contenteditable') ? activeElement :
                        activeElement.closest('.msg-form__contenteditable') as HTMLElement ||
                        activeElement.closest('[contenteditable="true"]') as HTMLElement ||
                        activeElement;
          if (editor instanceof HTMLElement && editor.offsetParent !== null) {
            this.focusedCommentEditor = editor;
            this.showFloatingActionButton();
            Logger.info('[LinkedIn] Initial check: Chat editor already focused, showing FAB');
            return true;
          }
        }
      }
      return false;
    };
    
    // Mehrfache Versuche
    setTimeout(() => checkInitialFocus(), 500);
    setTimeout(() => checkInitialFocus(), 1000);
    setTimeout(() => checkInitialFocus(), 2000);
    
    // Beobachte Änderungen im DOM, um neue Chat-Editoren zu finden
    const chatObserver = new MutationObserver(() => {
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
        
        // Prüfe ob ein Chat-Editor bereits fokussiert ist
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement) {
          // Prüfe ob es ein Chat-Editor ist
          const isChatEditor = activeElement.classList.contains('msg-form__contenteditable') ||
                              activeElement.closest('.msg-form__contenteditable') ||
                              (activeElement.hasAttribute('contenteditable') && 
                               activeElement.closest('.msg-form'));
          
          if (isChatEditor && LinkedInDOMService.isChatEditorVisible()) {
            const editor = activeElement.classList.contains('msg-form__contenteditable') ? activeElement :
                          activeElement.closest('.msg-form__contenteditable') as HTMLElement ||
                          activeElement.closest('[contenteditable="true"]') as HTMLElement ||
                          activeElement;
            if (editor instanceof HTMLElement && editor.offsetParent !== null) {
              this.focusedCommentEditor = editor;
              this.showFloatingActionButton();
              Logger.info('[LinkedIn] MutationObserver: Chat editor focused, showing FAB');
            }
          }
        }
      }, 300);
    });

    chatObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-hidden', 'class', 'style', 'contenteditable']
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
    fab.className = 'cos-floating-action-button';
    fab.innerHTML = `
      <span class="cos-fab-icon">💎</span>
      <span class="cos-fab-text">Optimieren</span>
    `;
    fab.title = 'Nachricht optimieren';
    fab.setAttribute('aria-label', 'Nachricht optimieren');
    
    // Styling
    fab.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 100000;
      display: none;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
    
    // Longpress Detection (2 Sekunden für "Sie")
    let pressTimer: number | null = null;
    let isLongPress = false;
    
    fab.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      isLongPress = false;
      pressTimer = window.setTimeout(() => {
        isLongPress = true;
        // Visual Feedback für Longpress
        fab.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
        fab.innerHTML = `
          <span class="cos-fab-icon">👔</span>
          <span class="cos-fab-text">Sie-Form</span>
        `;
      }, 2000); // 2 Sekunden
    });
    
    fab.addEventListener('mouseup', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
      
      // Stelle sicher, dass der Editor noch fokussiert ist oder fokussiere ihn wieder
      if (this.focusedCommentEditor && document.body.contains(this.focusedCommentEditor)) {
        setTimeout(() => {
          this.focusedCommentEditor?.focus();
        }, 50);
      }
      
      // Bestimme Ansprache-Form: Longpress = "sie", normaler Klick = "du"
      const addressForm: 'du' | 'sie' = isLongPress ? 'sie' : 'du';
      
      // Reset Button-Style
      fab.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
      fab.innerHTML = `
        <span class="cos-fab-icon">💎</span>
        <span class="cos-fab-text">Optimieren</span>
      `;
      
      this.handleFABOptimizeClick(addressForm);
      isLongPress = false;
    });
    
    fab.addEventListener('mouseleave', () => {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
      // Reset Button-Style wenn Maus verlassen wird
      fab.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
      fab.innerHTML = `
        <span class="cos-fab-icon">💎</span>
        <span class="cos-fab-text">Optimieren</span>
      `;
      isLongPress = false;
    });
    
    // Touch Events für Mobile
    fab.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      isLongPress = false;
      pressTimer = window.setTimeout(() => {
        isLongPress = true;
        fab.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
        fab.innerHTML = `
          <span class="cos-fab-icon">👔</span>
          <span class="cos-fab-text">Sie-Form</span>
        `;
      }, 2000);
    });
    
    fab.addEventListener('touchend', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
      
      if (this.focusedCommentEditor && document.body.contains(this.focusedCommentEditor)) {
        setTimeout(() => {
          this.focusedCommentEditor?.focus();
        }, 50);
      }
      
      const addressForm: 'du' | 'sie' = isLongPress ? 'sie' : 'du';
      
      fab.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
      fab.innerHTML = `
        <span class="cos-fab-icon">💎</span>
        <span class="cos-fab-text">Optimieren</span>
      `;
      
      this.handleFABOptimizeClick(addressForm);
      isLongPress = false;
    });
    
    document.body.appendChild(fab);
    this.floatingActionButton = fab;
    
    Logger.info('[LinkedIn] Floating Action Button created');
  }
  
  /**
   * Zeigt den Floating Action Button an
   */
  private showFloatingActionButton(): void {
    if (!this.floatingActionButton) {
      Logger.warn('[LinkedIn] FAB not created yet');
      return;
    }
    
    // Stelle sicher, dass der FAB im DOM ist
    if (!document.body.contains(this.floatingActionButton)) {
      document.body.appendChild(this.floatingActionButton);
    }
    
    this.floatingActionButton.style.display = 'flex';
    
    // Animation - verwende setTimeout für bessere Kompatibilität
    setTimeout(() => {
      if (this.floatingActionButton) {
        this.floatingActionButton.style.opacity = '1';
        this.floatingActionButton.style.transform = 'translateY(0) scale(1)';
        Logger.info('[LinkedIn] FAB shown');
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
   * @param addressForm Die Ansprache-Form: 'du' für normalen Klick, 'sie' für Longpress
   */
  private async handleFABOptimizeClick(addressForm: 'du' | 'sie' = 'du'): Promise<void> {
    if (this.isProcessing || !this.focusedCommentEditor || !this.floatingActionButton) {
      return;
    }
    
    // Speichere Editor-Referenz und Post-Kontext VOR dem Klick (wenn Editor noch fokussiert ist)
    const editorElement = this.focusedCommentEditor;
    
    // Stelle sicher, dass der Editor noch im DOM ist
    if (!document.body.contains(editorElement)) {
      Logger.error('[LinkedIn] Editor element no longer in DOM');
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
      
      // Prüfe ob es sich um einen Chat-Editor oder Kommentar-Editor handelt
      const isChatEditor = LinkedInDOMService.isChatEditorVisible() && 
                          (editorElement.closest('.msg-form') || 
                           editorElement.classList.contains('msg-form__contenteditable'));
      
      let optimizedContent: string;
      
      if (isChatEditor) {
        // Extrahiere Chat-Verlauf für Kontext
        const chatHistory = LinkedInDOMService.extractChatHistory(10);
        
        if (!chatHistory) {
          throw new Error('Chat-Verlauf konnte nicht gefunden werden. Bitte öffne einen Chat mit Nachrichten.');
        }
        
        Logger.info('[LinkedIn] Chat history extracted:', {
          historyLength: chatHistory.length
        });
        
        // Generiere neue Chat-Antwort basierend auf Verlauf
        this.floatingActionButton.innerHTML = `
          <span class="cos-fab-icon" style="animation: spin 1s linear infinite;">⏳</span>
          <span class="cos-fab-text">KI arbeitet...</span>
        `;
        
        // Lade LinkedIn-Einstellungen für Chat-Ziel
        const linkedInSettings = await StorageService.load<LinkedInSettings>('linkedin_settings');
        const chatGoal = linkedInSettings?.chatGoal || 'networking';
        let chatGoalText = chatGoal === 'custom' && linkedInSettings?.chatGoalCustom 
          ? linkedInSettings.chatGoalCustom 
          : chatGoal;
        
        // Wenn Verkauf ausgewählt ist, füge Produkt-Information hinzu
        if (chatGoal === 'sales' && linkedInSettings?.chatGoalSalesProduct) {
          chatGoalText = `sales:${linkedInSettings.chatGoalSalesProduct}`;
        }
        
        // Erstelle leeres Chat-Message-Objekt (wird nicht verwendet, nur für API-Kompatibilität)
        const chatMessage: LinkedInArticle = {
          title: '',
          content: '' // Leer, da wir eine neue Antwort generieren, nicht optimieren
        };
        
        optimizedContent = await ChatOptimizer.optimizeChat(
          { ...chatMessage, addressForm },
          chatHistory, // Chat-Verlauf als Kontext
          chatGoalText // Chat-Ziel
        );
        
        Logger.info('[LinkedIn] Chat response generated:', {
          historyLength: chatHistory.length,
          responseLength: optimizedContent.length
        });
      } else {
        // Kommentar optimieren
        // Extrahiere Original-Post-Kontext basierend auf dem Editor-Element (nicht auf dem aktuell fokussierten Element)
        const originalPostContext = LinkedInDOMService.extractOriginalPostForComment(editorElement);
        
        // Extrahiere Kommentar-Daten aus dem Editor-Element
        const commentContent = editorElement.innerText?.trim() || 
                              editorElement.textContent?.trim() || '';
        
        // Wenn weder Post-Kontext noch Kommentar-Text vorhanden ist, Fehler werfen
        if (!originalPostContext && !commentContent) {
          throw new Error('Post-Kontext konnte nicht gefunden werden und kein Kommentar-Text vorhanden. Bitte öffne einen Post und gib einen Kommentar ein.');
        }
        
        // Wenn kein Post-Kontext gefunden wurde, aber Text vorhanden ist, optimiere nur den Text
        if (!originalPostContext && commentContent) {
          Logger.warn('[LinkedIn] Post context not found, but comment text available. Optimizing comment without context.');
        }
        
        const commentData: LinkedInArticle = {
          title: '',
          content: commentContent,
          addressForm
        };
        
        Logger.info('[LinkedIn] Comment data extracted from focused editor:', {
          commentLength: commentData.content.length,
          hasPostContext: !!originalPostContext,
          isEmpty: !commentData.content,
          addressForm
        });
        
        // Optimiere Kommentar
        this.floatingActionButton.innerHTML = `
          <span class="cos-fab-icon" style="animation: spin 1s linear infinite;">⏳</span>
          <span class="cos-fab-text">KI arbeitet...</span>
        `;
        
        // Optimiere Kommentar (mit oder ohne Post-Kontext)
        optimizedContent = await CommentOptimizer.optimizeComment(
          commentData, 
          originalPostContext || undefined
        );
      
        Logger.info('[LinkedIn] Comment optimized:', {
          originalLength: commentData.content.length,
          optimizedLength: optimizedContent.length,
          wasGeneratedFromContext: !commentData.content
        });
      }
      
      // Füge optimierten Content in den Editor ein (verwende gespeicherte Referenz)
      const inserted = LinkedInDOMService.insertOptimizedContentIntoEditor(
        editorElement,
        optimizedContent
      );
      
      // Stelle sicher, dass der Editor wieder fokussiert ist
      setTimeout(() => {
        editorElement.focus();
      }, 100);
      
      if (!inserted) {
        throw new Error(isChatEditor ? 'Chat-Nachricht konnte nicht eingefügt werden. Bitte versuche es erneut.' : 'Kommentar konnte nicht eingefügt werden. Bitte versuche es erneut.');
      }
      
      // Success State
      this.floatingActionButton.innerHTML = `
        <span class="cos-fab-icon">✅</span>
        <span class="cos-fab-text">Optimiert!</span>
      `;
      this.floatingActionButton.style.background = 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)';
      
      Logger.info(`[LinkedIn] ✅ ${isChatEditor ? 'Chat message' : 'Comment'} optimized successfully`);
      
      // Zeige Toast
      this.showToast(isChatEditor ? 'Chat-Nachricht erfolgreich optimiert!' : 'Kommentar erfolgreich optimiert!', 'success');
      
      // Reset nach 2 Sekunden
      setTimeout(() => {
        if (this.floatingActionButton) {
          this.floatingActionButton.innerHTML = originalHTML;
          this.floatingActionButton.style.pointerEvents = 'auto';
          this.floatingActionButton.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        }
        this.isProcessing = false;
      }, 2000);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      Logger.error('[LinkedIn] Comment optimization error:', error);
      
      // Zeige Toast mit Fehlermeldung
      this.showToast(errorMessage, 'error');
      
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
            this.floatingActionButton.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            this.floatingActionButton.title = 'Kommentar optimieren';
          }
          this.isProcessing = false;
        }, 2000);
      }
    }
  }

  /**
   * Wartet bis der Editor geladen ist
   */
  private waitForEditor(callback: () => void, maxAttempts: number = 50): void {
    let attempts = 0;
    const checkEditor = () => {
      const editor = document.querySelector('[data-test-article-editor-content-textbox]');
      const toolbar = document.querySelector('.article-editor-toolbar');
      
      // Editor ODER Toolbar reicht aus, um den Button zu erstellen
      if (editor || toolbar) {
        Logger.info('[LinkedIn] Editor or toolbar found, executing callback', {
          hasEditor: !!editor,
          hasToolbar: !!toolbar
        });
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
    if (this.optimizeButton && document.body.contains(this.optimizeButton)) {
      return; // Button bereits vorhanden und im DOM
    }

    const container = LinkedInDOMService.getOptimizeButtonContainer();
    if (!container) {
      Logger.warn('[LinkedIn] Could not find button container');
      return;
    }

    // Prüfe ob bereits ein Button im Container existiert (durchsuche alle Buttons nach dem Text)
    const allButtons = container.querySelectorAll('.artdeco-button--secondary');
    for (const btn of Array.from(allButtons)) {
      const button = btn as HTMLElement;
      const text = button.textContent?.trim() || button.innerText?.trim() || '';
      if (text.includes('💎 Optimieren')) {
        this.optimizeButton = button;
        Logger.info('[LinkedIn] Optimize button already exists in container');
        return;
      }
    }

    // Erstelle Button
    const button = document.createElement('button');
    button.className = 'artdeco-button artdeco-button--secondary artdeco-button--2';
    button.innerHTML = `
      <span>💎 Optimieren</span>
    `;
    button.style.display = 'flex';
    button.style.alignItems = 'center';
    button.style.gap = '8px';
    button.style.cursor = 'pointer';
    button.title = 'Artikel-Inhalt mit KI optimieren';

    // Longpress Detection (2 Sekunden für "Sie")
    let pressTimer: number | null = null;
    let isLongPress = false;
    
    button.addEventListener('mousedown', (e) => {
      e.preventDefault();
      isLongPress = false;
      pressTimer = window.setTimeout(() => {
        isLongPress = true;
        button.style.backgroundColor = '#f5576c';
        button.innerHTML = `
          <svg role="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <span>Sie-Form</span>
        `;
      }, 2000);
    });
    
    button.addEventListener('mouseup', () => {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
      const addressForm: 'du' | 'sie' = isLongPress ? 'sie' : 'du';
      button.style.backgroundColor = '';
      button.innerHTML = `
        <svg role="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        <span>💎 Optimieren</span>
      `;
      this.handleOptimizeClick(addressForm);
      isLongPress = false;
    });
    
    button.addEventListener('mouseleave', () => {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
      button.style.backgroundColor = '';
      button.innerHTML = `
        <svg role="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        <span>💎 Optimieren</span>
      `;
      isLongPress = false;
    });
    
    // Touch Events für Mobile
    button.addEventListener('touchstart', (e) => {
      e.preventDefault();
      isLongPress = false;
      pressTimer = window.setTimeout(() => {
        isLongPress = true;
        button.style.backgroundColor = '#f5576c';
        button.innerHTML = `
          <svg role="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <span>Sie-Form</span>
        `;
      }, 2000);
    });
    
    button.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
      const addressForm: 'du' | 'sie' = isLongPress ? 'sie' : 'du';
      button.style.backgroundColor = '';
      button.innerHTML = `
        <svg role="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        <span>💎 Optimieren</span>
      `;
      this.handleOptimizeClick(addressForm);
      isLongPress = false;
    });

    container.appendChild(button);
    this.optimizeButton = button;

    // Füge Container zur Toolbar hinzu (wenn Toolbar vorhanden ist)
    const toolbar = document.querySelector('.article-editor-toolbar') ||
                    document.querySelector('[class*="article-editor-toolbar"]') ||
                    document.querySelector('[class*="toolbar"]');
    
    if (toolbar && !toolbar.contains(container)) {
      toolbar.appendChild(container);
      Logger.info('[LinkedIn] Button container added to toolbar');
    } else if (!toolbar) {
      // Wenn Toolbar noch nicht vorhanden ist, füge Container temporär zum body hinzu
      // und versuche später, ihn zur Toolbar hinzuzufügen
      document.body.appendChild(container);
      Logger.info('[LinkedIn] Toolbar not found yet, button container added to body temporarily');
      
      // Versuche später, Container zur Toolbar hinzuzufügen
      const tryMoveToToolbar = () => {
        const foundToolbar = document.querySelector('.article-editor-toolbar') ||
                            document.querySelector('[class*="article-editor-toolbar"]');
        if (foundToolbar && document.body.contains(container)) {
          foundToolbar.appendChild(container);
          Logger.info('[LinkedIn] Button container moved to toolbar');
        } else if (!foundToolbar) {
          // Versuche es erneut nach kurzer Verzögerung
          setTimeout(tryMoveToToolbar, 500);
        }
      };
      
      setTimeout(tryMoveToToolbar, 500);
      setTimeout(tryMoveToToolbar, 1000);
      setTimeout(tryMoveToToolbar, 2000);
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
      <span>💎 Optimieren</span>
    `;
    button.style.display = 'flex';
    button.style.alignItems = 'center';
    button.style.gap = '8px';
    button.style.cursor = 'pointer';
    button.style.marginRight = '8px';
    button.title = 'Beitrag mit KI optimieren';

    // Longpress Detection (2 Sekunden für "Sie")
    let pressTimer: number | null = null;
    let isLongPress = false;
    
    button.addEventListener('mousedown', (e) => {
      e.preventDefault();
      isLongPress = false;
      pressTimer = window.setTimeout(() => {
        isLongPress = true;
        button.style.backgroundColor = '#f5576c';
        button.innerHTML = `
          <svg role="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <span>Sie-Form</span>
        `;
      }, 2000);
    });
    
    button.addEventListener('mouseup', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
      const addressForm: 'du' | 'sie' = isLongPress ? 'sie' : 'du';
      button.style.backgroundColor = '';
      button.innerHTML = `
        <svg role="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        <span>💎 Optimieren</span>
      `;
      this.handlePostOptimizeClick(addressForm);
      isLongPress = false;
    });
    
    button.addEventListener('mouseleave', () => {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
      button.style.backgroundColor = '';
      button.innerHTML = `
        <svg role="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        <span>💎 Optimieren</span>
      `;
      isLongPress = false;
    });
    
    // Touch Events für Mobile
    button.addEventListener('touchstart', (e) => {
      e.preventDefault();
      isLongPress = false;
      pressTimer = window.setTimeout(() => {
        isLongPress = true;
        button.style.backgroundColor = '#f5576c';
        button.innerHTML = `
          <svg role="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <span>Sie-Form</span>
        `;
      }, 2000);
    });
    
    button.addEventListener('touchend', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
      const addressForm: 'du' | 'sie' = isLongPress ? 'sie' : 'du';
      button.style.backgroundColor = '';
      button.innerHTML = `
        <svg role="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        <span>💎 Optimieren</span>
      `;
      this.handlePostOptimizeClick(addressForm);
      isLongPress = false;
    });

    container.appendChild(button);
    this.postOptimizeButton = button;

    Logger.info('[LinkedIn] Post optimize button created and added to container');
  }


  /**
   * Behandelt Klick auf "Post optimieren"
   * @param addressForm Die Ansprache-Form: 'du' für normalen Klick, 'sie' für Longpress
   */
  private async handlePostOptimizeClick(addressForm: 'du' | 'sie' = 'du'): Promise<void> {
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

      const optimizedContent = await PostOptimizer.optimizePost({ ...post, addressForm });

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
   * Behandelt Klick auf "Artikel optimieren"
   */
  /**
   * Behandelt Klick auf "Artikel optimieren"
   * @param addressForm Die Ansprache-Form: 'du' für normalen Klick, 'sie' für Longpress
   */
  private async handleOptimizeClick(addressForm: 'du' | 'sie' = 'du'): Promise<void> {
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

      const optimizedContent = await ArticleOptimizer.optimizeArticle({ ...articleForOptimization, addressForm });

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

