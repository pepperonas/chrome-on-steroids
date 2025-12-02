import { ApplicationController } from '../controllers/ApplicationController';
import { DOMService } from '../services/DOMService';
import { Logger } from '../utils/logger';

/**
 * Content Script - Läuft auf freelancermap.de
 */
class ApplyAIAssistant {
  private generateButton: HTMLElement | null = null;
  private observer: MutationObserver | null = null;
  private isCreatingButton = false; // Verhindert mehrfache Button-Erstellung

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    // Warte auf vollständiges Laden der Seite
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.onPageLoad());
    } else {
      this.onPageLoad();
    }
  }

  private onPageLoad(): void {
    // Beobachte Modal/Dialog-Öffnung für Bewerbungsformular (funktioniert auf allen Seiten)
    this.observeModalChanges();

    // Prüfe ob wir auf einer Projektseite sind
    if (DOMService.isProjectPage()) {
      // Prüfe ob Anschreiben-Feld vorhanden ist und erstelle Button
      this.checkAndCreateButton();

      // Beobachte DOM-Änderungen für dynamisch geladene Inhalte
      this.observeDOMChanges();

      // Beobachte URL-Änderungen (für SPA-Navigation)
      this.observeUrlChanges();
    } else {
      Logger.info('Nicht auf einer Projektseite, aber Modal-Observer ist aktiv');
      // Beobachte auch DOM-Änderungen für Modal-Erkennung
      this.observeDOMChanges();
    }
  }

  private checkAndCreateButton(): void {
    // Prüfe ob Anschreiben-Feld vorhanden ist
    if (!DOMService.hasCoverLetterField()) {
      Logger.info('Kein Anschreiben-Feld gefunden');
      this.removeButton();
      return;
    }

    // Prüfe ob Button bereits existiert
    if (document.getElementById('apply-ai-generate-btn')) {
      return;
    }

    this.createGenerateButton();
  }

  private createGenerateButton(): void {
    const textarea = DOMService.getCoverLetterField();
    if (!textarea) return;

    // Finde das Parent-Element des Textareas (Form-Group oder ähnliches)
    const formGroup: Element | null = textarea.closest('.form-group') || 
                                      textarea.closest('.form-control') ||
                                      textarea.closest('div') ||
                                      textarea.parentElement;

    if (!formGroup) return;

    // Erstelle Button
    const button = document.createElement('button');
    button.id = 'apply-ai-generate-btn';
    button.type = 'button';
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="margin-right: 6px;">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>Mit AI generieren</span>
    `;
    button.title = 'Anschreiben mit AI generieren';
    
    // Styling
    button.style.cssText = `
      display: inline-flex;
      align-items: center;
      padding: 10px 16px;
      margin-top: 8px;
      background: linear-gradient(135deg, #4A90E2 0%, #357ABD 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(74, 144, 226, 0.3);
      transition: all 0.2s ease;
      z-index: 1000;
    `;

    button.addEventListener('mouseenter', () => {
      button.style.transform = 'translateY(-2px)';
      button.style.boxShadow = '0 4px 12px rgba(74, 144, 226, 0.4)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.transform = 'translateY(0)';
      button.style.boxShadow = '0 2px 8px rgba(74, 144, 226, 0.3)';
    });

    button.addEventListener('click', async () => {
      await this.handleGenerate();
    });

    // Füge Button nach dem Textarea ein
    formGroup.appendChild(button);

    this.generateButton = button;
  }

  private removeButton(): void {
    const button = document.getElementById('apply-ai-generate-btn');
    if (button) {
      button.remove();
      this.generateButton = null;
    }
  }

  private async handleGenerate(): Promise<void> {
    const button = this.generateButton as HTMLElement | null;
    if (!button) return;

    try {
      // Button deaktivieren und Loading-State zeigen
      button.style.pointerEvents = 'none';
      button.style.opacity = '0.7';
      button.style.cursor = 'wait';
      const originalHTML = button.innerHTML;
      button.innerHTML = `
        <i class="far fa-spinner fa-spin"></i>
        <span>Generiere...</span>
      `;

      const controller = new ApplicationController();
      await controller.generateAndInsertApplication();

      // Erfolg anzeigen
      button.innerHTML = `
        <i class="far fa-check"></i>
        <span>Generiert!</span>
      `;
      button.style.pointerEvents = 'auto';

      // Nach 2 Sekunden zurücksetzen
      setTimeout(() => {
        button.innerHTML = originalHTML;
        button.style.opacity = '1';
        button.style.cursor = 'pointer';
      }, 2000);

    } catch (error) {
      // Prüfe ob es ein Context-Error ist
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isContextInvalidated = errorMessage.includes('Extension context invalidated') || 
                                    errorMessage.includes('invalidated') ||
                                    errorMessage.includes('neu geladen');

      // Fehler anzeigen
      if (isContextInvalidated) {
        button.innerHTML = `
          <i class="far fa-exclamation-triangle"></i>
          <span>Seite neu laden</span>
        `;
        button.title = 'Extension wurde neu geladen. Bitte lade die Seite neu (F5).';
      } else {
        button.innerHTML = `
          <i class="far fa-xmark"></i>
          <span>Fehler</span>
        `;
      }
      
      button.style.pointerEvents = 'auto';
      button.style.opacity = '1';
      button.style.cursor = 'pointer';

      Logger.error('Generation failed:', error);
      
      // Nach 5 Sekunden zurücksetzen (länger bei Context-Error)
      setTimeout(() => {
        button.innerHTML = `
          <i class="far fa-gem"></i>
          <span>ApplyAI</span>
        `;
        button.title = 'Anschreiben mit AI generieren';
      }, isContextInvalidated ? 5000 : 3000);
    }
  }

  private observeModalChanges(): void {
    // Beobachte Modal-Öffnung für Bewerbungsdialog
    const modalObserver = new MutationObserver(() => {
      const modal = document.querySelector('.modal.search-result-modal.show') as HTMLElement;
      const coverLetterField = document.getElementById('cover-letter') as HTMLTextAreaElement;
      
      // Prüfe ob Modal sichtbar ist (show Klasse und nicht hidden)
      const isModalVisible = modal && 
        modal.classList.contains('show') && 
        !modal.classList.contains('hidden') &&
        modal.getAttribute('aria-hidden') !== 'true';
      
      if (isModalVisible && coverLetterField && modal.contains(coverLetterField)) {
        // Modal ist geöffnet und enthält Anschreiben-Feld
        this.checkAndCreateButtonInModal(coverLetterField);
      } else {
        // Modal ist geschlossen oder kein Anschreiben-Feld vorhanden
        // Entferne Button nur wenn er im Modal war
        const existingButton = document.getElementById('apply-ai-generate-btn');
        if (existingButton && modal && modal.contains(existingButton)) {
          this.removeButton();
        }
      }
    });

    // Initiale Prüfung
    setTimeout(() => {
      const modal = document.querySelector('.modal.search-result-modal.show') as HTMLElement;
      const coverLetterField = document.getElementById('cover-letter') as HTMLTextAreaElement;
      if (modal && coverLetterField && modal.contains(coverLetterField)) {
        this.checkAndCreateButtonInModal(coverLetterField);
      }
    }, 500);

    modalObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'aria-hidden']
    });
  }

  private checkAndCreateButtonInModal(textarea: HTMLTextAreaElement): void {
    // Prüfe ob Button bereits existiert
    if (document.getElementById('apply-ai-generate-btn')) {
      return; // Button existiert bereits, nichts tun
    }

    // Verhindere mehrfache gleichzeitige Erstellung
    if (this.isCreatingButton) {
      return;
    }

    this.isCreatingButton = true;
    Logger.info('Erstelle ApplyAI Button im Modal');
    
    try {
      this.createGenerateButtonInModal(textarea);
    } finally {
      // Reset nach kurzer Verzögerung (falls Observer mehrfach triggert)
      setTimeout(() => {
        this.isCreatingButton = false;
      }, 500);
    }
  }

  private createGenerateButtonInModal(textarea: HTMLTextAreaElement): void {
    // Finde den Container mit den Buttons (title-and-buttons)
    const titleAndButtons = textarea.closest('.cover-letter')?.querySelector('.title-and-buttons .buttons');
    
    if (!titleAndButtons) {
      Logger.warn('Button-Container nicht gefunden');
      return;
    }

    // Finde den "Text generieren" Button
    const textGenerateButton = titleAndButtons.querySelector('[data-id="ai-application-button"]') as HTMLElement;
    
    if (textGenerateButton) {
      // Füge Button rechts neben dem "Text generieren" Button ein
      const button = this.createButtonElement();
      // Füge nach dem Text generieren Button ein
      textGenerateButton.insertAdjacentElement('afterend', button);
      this.generateButton = button;
    } else {
      // Fallback: Füge am Ende der Button-Gruppe ein
      const button = this.createButtonElement();
      titleAndButtons.appendChild(button);
      this.generateButton = button;
    }
  }

  private createButtonElement(): HTMLButtonElement {
    const button = document.createElement('a');
    button.id = 'apply-ai-generate-btn';
    button.href = '#';
    button.className = 'fm-btn fm-btn-secondary';
    button.setAttribute('target', '_blank');
    button.innerHTML = `
      <i class="far fa-gem"></i>
      <span>ApplyAI</span>
    `;
    button.title = 'Anschreiben mit AI generieren';
    
    // Kein zusätzliches Styling - verwendet das Standard-Styling von fm-btn fm-btn-secondary
    // Entferne nur das target="_blank" Verhalten
    button.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await this.handleGenerate();
    });

    return button as unknown as HTMLButtonElement;
  }

  private observeDOMChanges(): void {
    // Beobachte DOM-Änderungen, um dynamisch geladene Anschreiben-Felder zu erkennen
    this.observer = new MutationObserver(() => {
      // Prüfe immer auf Modal (funktioniert auf allen Seiten)
      const modal = document.querySelector('.modal.search-result-modal.show') as HTMLElement;
      const coverLetterField = document.getElementById('cover-letter') as HTMLTextAreaElement;
      
      if (modal && coverLetterField && modal.contains(coverLetterField)) {
        const isModalVisible = modal.classList.contains('show') && 
          !modal.classList.contains('hidden') &&
          modal.getAttribute('aria-hidden') !== 'true';
        
        if (isModalVisible) {
          this.checkAndCreateButtonInModal(coverLetterField);
        }
      } else if (DOMService.isProjectPage()) {
        // Nur auf Projektseiten: Prüfe auf normales Anschreiben-Feld
        this.checkAndCreateButton();
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  private observeUrlChanges(): void {
    let lastUrl = location.href;

    new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        this.onUrlChange();
      }
    }).observe(document, { subtree: true, childList: true });

    // Also listen to popstate for browser navigation
    window.addEventListener('popstate', () => {
      setTimeout(() => this.onUrlChange(), 100);
    });
  }

  private onUrlChange(): void {
    if (!DOMService.isProjectPage()) {
      // Entferne Button wenn nicht auf Projektseite
      this.removeButton();
    } else {
      // Prüfe und erstelle Button wenn auf Projektseite
      this.checkAndCreateButton();
    }
  }
}

// Initialisiere Assistant
new ApplyAIAssistant();

