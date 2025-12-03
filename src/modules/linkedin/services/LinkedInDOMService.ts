import { Logger } from '../../../shared/utils/logger';
import { LinkedInArticle } from '../models/LinkedInArticle';

/**
 * DOM-Service für LinkedIn Artikel-Editor und Posts
 */
export class LinkedInDOMService {
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
      if (element) {
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
   * Prüft ob ein Kommentar-Editor sichtbar ist
   */
  static isCommentEditorVisible(): boolean {
    // Verschiedene Selektoren für Kommentar-Editoren
    const selectors = [
      '.comments-comment-box [data-test-ql-editor-contenteditable="true"]',
      '.comments-comment-box .ql-editor',
      '.comments-comment-box__editor [contenteditable="true"]',
      '.comments-comment-box__editor .ql-editor',
      '.comments-comment-box__form [contenteditable="true"]',
      '.comments-comment-box__form .ql-editor',
      '.comment-box [contenteditable="true"]',
      '.comment-box .ql-editor'
    ];

    for (const selector of selectors) {
      const commentEditor = document.querySelector(selector) as HTMLElement;
      if (commentEditor && 
          commentEditor.getAttribute('aria-hidden') !== 'true' &&
          commentEditor.offsetParent !== null) {
        Logger.info('[LinkedIn] Comment editor found with selector:', selector);
        return true;
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

      // Content extrahieren
      const contentEditor = document.querySelector('[data-test-article-editor-content-textbox]') as HTMLElement;
      const content = contentEditor?.innerText?.trim() || contentEditor?.textContent?.trim() || '';

      if (!title && !content) {
        Logger.warn('[LinkedIn] No article data found');
        return null;
      }

      Logger.info('[LinkedIn] Article data extracted:', {
        titleLength: title.length,
        contentLength: content.length
      });

      return {
        title,
        content
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
      const quillEditor = shareBox?.querySelector('[data-test-ql-editor-contenteditable="true"]') as HTMLElement;
      const content = quillEditor?.innerText?.trim() || quillEditor?.textContent?.trim() || '';

      if (!content) {
        Logger.warn('[LinkedIn] No post data found');
        return null;
      }

      Logger.info('[LinkedIn] Post data extracted:', {
        contentLength: content.length
      });

      return {
        title: '', // Posts haben keinen Titel
        content
      };
    } catch (error) {
      Logger.error('[LinkedIn] Error extracting post data:', error);
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
        '.comments-comment-box .ql-editor[contenteditable="true"]',
        '.comments-comment-box__form .ql-editor[contenteditable="true"]',
        '.comments-comment-box [contenteditable="true"].ql-editor',
        '.comments-comment-box__form [contenteditable="true"].ql-editor',
        '.comments-comment-box .ql-editor',
        '.comments-comment-box__form .ql-editor',
        '.comments-comment-box [contenteditable="true"]',
        '.comments-comment-box__form [contenteditable="true"]',
        '.comment-box [contenteditable="true"]',
        '.comment-box .ql-editor',
        '.editor-content .ql-editor[contenteditable="true"]',
        '.comments-comment-texteditor .ql-editor[contenteditable="true"]'
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
      if (!content) {
        const paragraphs = quillEditor.querySelectorAll('p');
        if (paragraphs.length > 0) {
          content = Array.from(paragraphs)
            .map(p => p.textContent?.trim() || '')
            .filter(p => p.length > 0)
            .join('\n');
        }
      }

      if (!content) {
        Logger.warn('[LinkedIn] No comment content found in editor');
        return null;
      }

      Logger.info('[LinkedIn] Comment data extracted:', {
        contentLength: content.length,
        preview: content.substring(0, 50)
      });

      return {
        title: '', // Kommentare haben keinen Titel
        content
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
        // Quill-Editor für Kommentare - verwende die gleichen Selektoren wie in extractCommentData
        const editorSelectors = [
          '.comments-comment-box [data-test-ql-editor-contenteditable="true"]',
          '.comments-comment-box__form [data-test-ql-editor-contenteditable="true"]',
          '.comments-comment-box .ql-editor[contenteditable="true"]',
          '.comments-comment-box__form .ql-editor[contenteditable="true"]',
          '.comments-comment-box [contenteditable="true"].ql-editor',
          '.comments-comment-box__form [contenteditable="true"].ql-editor',
          '.comments-comment-box .ql-editor',
          '.comments-comment-box__form .ql-editor',
          '.comments-comment-box [contenteditable="true"]',
          '.comments-comment-box__form [contenteditable="true"]',
          '.editor-content .ql-editor[contenteditable="true"]',
          '.comments-comment-texteditor .ql-editor[contenteditable="true"]'
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
      Logger.warn('[LinkedIn] Toolbar not found');
      return null;
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
    
    // Suche nach dem "Kommentieren"-Button (verschiedene Selektoren)
    const submitButtonSelectors = [
      '.comments-comment-box__submit-button--cr',
      '.comments-comment-box__submit-button',
      'button[id*="ember"][class*="submit-button"]',
      '.comments-comment-box__form button[class*="primary"]',
      'button:has(span:contains("Kommentieren"))'
    ];

    let submitButton: HTMLElement | null = null;
    for (const selector of submitButtonSelectors) {
      const buttons = document.querySelectorAll(selector);
      for (const btn of Array.from(buttons)) {
        const button = btn as HTMLElement;
        const text = button.textContent?.trim() || button.innerText?.trim() || '';
        if (text.includes('Kommentieren') || button.getAttribute('aria-label')?.includes('Kommentieren')) {
          submitButton = button;
          Logger.info('[LinkedIn] Comment submit button found with selector:', selector);
          break;
        }
      }
      if (submitButton) break;
    }
    
    if (submitButton) {
      // Finde den Parent-Container, der den Submit-Button enthält
      let buttonContainer = submitButton.parentElement;
      
      // Gehe weiter nach oben, bis wir einen Container mit display-flex und align-items-center finden
      while (buttonContainer) {
        const classes = buttonContainer.className || '';
        if (classes.includes('display-flex') && classes.includes('align-items-center')) {
          Logger.info('[LinkedIn] Comment button container found (display-flex align-items-center parent)');
          
          // Prüfe ob bereits ein Optimieren-Button existiert
          const existingBtn = buttonContainer.querySelector('.cos-comment-optimize-btn');
          if (existingBtn) {
            Logger.info('[LinkedIn] Optimize button already exists, returning existing container');
            return buttonContainer; // Gib den Container zurück, nicht den Button-Parent
          }
        
          // Gib den Container direkt zurück - der Button wird direkt eingefügt
          Logger.info('[LinkedIn] Comment button container found, returning container for direct button insertion', {
            containerClasses: buttonContainer.className,
            submitButtonId: submitButton.id
          });
          return buttonContainer;
        }
        buttonContainer = buttonContainer.parentElement;
      }
      
      // Fallback: Wenn kein display-flex align-items-center Container gefunden wurde,
      // versuche es mit dem direkten Parent
      if (submitButton.parentElement) {
        Logger.info('[LinkedIn] Using direct parent as container');
        const parent = submitButton.parentElement;
        
        // Prüfe ob bereits ein Optimieren-Button existiert
        const existingBtn2 = parent.querySelector('.cos-comment-optimize-btn');
        if (existingBtn2) {
          Logger.info('[LinkedIn] Optimize button already exists in parent');
          return parent; // Gib den Parent-Container zurück
        }
        
        // Gib den Parent-Container direkt zurück - der Button wird direkt eingefügt
        Logger.info('[LinkedIn] Using direct parent as container for button insertion');
        return parent;
      }
    }

    // Fallback: Suche nach der Toolbar mit justify-space-between
    Logger.info('[LinkedIn] Trying fallback selectors for comment toolbar...');
    const commentForm = document.querySelector('.comments-comment-box__form');
    if (!commentForm) {
      Logger.warn('[LinkedIn] Comment form not found');
      return null;
    }

    const toolbarSelectors = [
      '.comments-comment-box__form .display-flex.justify-space-between > .display-flex.align-items-center',
      '.comments-comment-box__form .display-flex.justify-space-between > .display-flex:last-child',
      '.comments-comment-box__form .display-flex.justify-space-between',
      '.comments-comment-box__form .display-flex.align-items-center:last-child',
      '.comments-comment-box__form .display-flex:last-child'
    ];

    let toolbar: HTMLElement | null = null;
    for (const selector of toolbarSelectors) {
      toolbar = commentForm.querySelector(selector) as HTMLElement;
      if (toolbar) {
        Logger.info('[LinkedIn] Comment toolbar found with selector:', selector);
        break;
      }
    }

    if (!toolbar) {
      Logger.warn('[LinkedIn] Comment editor toolbar not found with any selector');
      return null;
    }

    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'cos-comment-button-container';
    buttonGroup.style.display = 'flex';
    buttonGroup.style.alignItems = 'center';
    buttonGroup.style.marginRight = '8px';
    return buttonGroup;
  }
}

