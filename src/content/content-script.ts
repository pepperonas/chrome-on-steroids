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

    // Beobachte DOM-Änderungen für dynamisch geladene Inhalte (auf allen Seiten)
    this.observeDOMChanges();

    // Beobachte URL-Änderungen (für SPA-Navigation)
    this.observeUrlChanges();

    // Initiale Prüfung für Button-Platzierung
    this.checkForApplicationForm();
  }

  private checkForApplicationForm(): void {
    // Prüfe zuerst auf Modal (höchste Priorität)
    const modal = document.querySelector('.modal.search-result-modal.show') as HTMLElement;
    const modalCoverLetterField = document.getElementById('cover-letter') as HTMLTextAreaElement;
    
    if (modal && modalCoverLetterField && modal.contains(modalCoverLetterField)) {
      const isModalVisible = modal.classList.contains('show') && 
        !modal.classList.contains('hidden') &&
        modal.getAttribute('aria-hidden') !== 'true';
      
      if (isModalVisible) {
        this.checkAndCreateButtonInModal(modalCoverLetterField);
        return;
      }
    }

    // Prüfe auf Projektdetailseite mit React-Komponente
    const projectShowContainer = document.querySelector('[data-component-name="ProjectShow"]');
    if (projectShowContainer) {
      this.checkAndCreateButtonInProjectShow();
      return;
    }

    // Fallback: Prüfe auf normales Anschreiben-Feld
    if (DOMService.hasCoverLetterField()) {
      this.checkAndCreateButton();
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

  private checkAndCreateButtonInProjectShow(): void {
    // Prüfe ob Floating Button bereits existiert
    if (document.getElementById('apply-ai-floating-btn')) {
      return;
    }

    // Verhindere mehrfache gleichzeitige Erstellung
    if (this.isCreatingButton) {
      return;
    }

    this.isCreatingButton = true;
    Logger.info('Erstelle ApplyAI Buttons auf Projektdetailseite');
    
    try {
      // Erstelle Floating Button
      this.createFloatingButton();
      
      // Erstelle auch Button im Formular (neben "Text generieren")
      this.createButtonInProjectForm();
    } finally {
      setTimeout(() => {
        this.isCreatingButton = false;
      }, 500);
    }
  }

  private createButtonInProjectForm(): void {
    // Suche nach dem "Text generieren" Button im Formular
    const aiButton = document.querySelector('[data-id="ai-application-button"]') as HTMLElement;
    
    if (!aiButton) {
      Logger.info('Text generieren Button nicht gefunden');
      return;
    }

    // Prüfe ob Button bereits existiert
    if (document.getElementById('apply-ai-generate-btn-form')) {
      return;
    }

    // Erstelle ApplyAI Button
    const button = document.createElement('button');
    button.id = 'apply-ai-generate-btn-form';
    button.type = 'button';
    button.className = 'fm-btn fm-btn-secondary';
    button.setAttribute('data-id', 'apply-ai-button-form');
    button.innerHTML = `
      <i class="far fa-gem"></i>
      <span>ApplyAI</span>
    `;
    button.title = 'Anschreiben mit AI generieren';
    
    button.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      Logger.info('ApplyAI Button im Formular geklickt');
      
      // Zeige Loading-State
      const originalHTML = button.innerHTML;
      button.innerHTML = `
        <i class="far fa-spinner fa-spin"></i>
        <span>Generiere...</span>
      `;
      button.style.pointerEvents = 'none';
      
      try {
        // Starte Generierung direkt
        const controller = new ApplicationController();
        await controller.generateAndInsertApplication();
        
        Logger.info('Generierung erfolgreich');
        
        // Erfolg anzeigen
        button.innerHTML = `
          <i class="far fa-check"></i>
          <span>Generiert!</span>
        `;
        
        setTimeout(() => {
          button.innerHTML = originalHTML;
          button.style.pointerEvents = 'auto';
        }, 2000);
        
      } catch (error) {
        Logger.error('Generierung fehlgeschlagen:', error);
        button.innerHTML = `
          <i class="far fa-exclamation-triangle"></i>
          <span>Fehler</span>
        `;
        setTimeout(() => {
          button.innerHTML = originalHTML;
          button.style.pointerEvents = 'auto';
        }, 3000);
      }
    });

    // Füge Button nach dem "Text generieren" Button ein
    aiButton.insertAdjacentElement('afterend', button);
    Logger.info('ApplyAI Button neben "Text generieren" Button platziert');
  }

  private createFloatingButton(): void {
    // Erstelle Floating Action Button außerhalb des React-Baums
    const floatingButton = document.createElement('button');
    floatingButton.id = 'apply-ai-floating-btn';
    floatingButton.type = 'button';
    floatingButton.className = 'apply-ai-floating-button';
    floatingButton.innerHTML = `
      <i class="far fa-gem"></i>
      <span>ApplyAI</span>
    `;
    floatingButton.title = 'Anschreiben mit AI generieren';
    
    floatingButton.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      Logger.info('Floating Button geklickt - prüfe Formular');
      
      // Zeige Loading-State
      const originalHTML = floatingButton.innerHTML;
      floatingButton.innerHTML = `
        <i class="far fa-spinner fa-spin"></i>
        <span>Generiere...</span>
      `;
      floatingButton.style.pointerEvents = 'none';
      
      try {
        // Prüfe ob Anschreiben-Feld bereits auf der Seite ist (Projektdetailseite)
        const coverLetterField = document.getElementById('cover-letter') as HTMLTextAreaElement;
        
        if (coverLetterField && coverLetterField.offsetParent !== null) {
          // Formular ist bereits sichtbar auf der Seite
          Logger.info('Formular ist bereits sichtbar, starte direkt Generierung');
          
          // Scrolle zum Formular
          coverLetterField.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // Warte kurz für Scroll-Animation
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Starte Generierung direkt
          const controller = new ApplicationController();
          await controller.generateAndInsertApplication();
          
          Logger.info('Generierung erfolgreich');
          
          // Erfolg anzeigen
          floatingButton.innerHTML = `
            <i class="far fa-check"></i>
            <span>Generiert!</span>
          `;
          
          setTimeout(() => {
            floatingButton.innerHTML = originalHTML;
            floatingButton.style.pointerEvents = 'auto';
          }, 2000);
          
        } else {
          // Formular nicht sichtbar, versuche Modal zu öffnen
          Logger.info('Formular nicht sichtbar, öffne Modal');
          
          const contactButton = document.querySelector('[data-testid="contact-button"]') as HTMLElement;
          if (!contactButton) {
            throw new Error('Bewerben-Button nicht gefunden');
          }
          
          contactButton.click();
          Logger.info('Bewerben-Button geklickt');
          
          // Warte auf Modal
          let attempts = 0;
          const maxAttempts = 50;
          
          const checkModal = setInterval(async () => {
            attempts++;
            
            const modal = document.querySelector('.modal.search-result-modal.show') as HTMLElement;
            const modalCoverLetterField = document.getElementById('cover-letter') as HTMLTextAreaElement;
            
            if (modal && modalCoverLetterField && modal.contains(modalCoverLetterField)) {
              clearInterval(checkModal);
              Logger.info('Modal geöffnet, starte Generierung');
              
              await new Promise(resolve => setTimeout(resolve, 800));
              
              const modalApplyAIButton = document.getElementById('apply-ai-generate-btn');
              if (modalApplyAIButton) {
                Logger.info('Klicke auf ApplyAI Button im Modal');
                (modalApplyAIButton as HTMLElement).click();
              } else {
                Logger.warn('ApplyAI Button im Modal nicht gefunden, starte direkt');
                const controller = new ApplicationController();
                await controller.generateAndInsertApplication();
              }
              
              floatingButton.innerHTML = originalHTML;
              floatingButton.style.pointerEvents = 'auto';
              
            } else if (attempts >= maxAttempts) {
              clearInterval(checkModal);
              throw new Error('Timeout: Modal konnte nicht geöffnet werden');
            }
          }, 100);
        }
        
      } catch (error) {
        Logger.error('Fehler:', error);
        floatingButton.innerHTML = `
          <i class="far fa-exclamation-triangle"></i>
          <span>Fehler</span>
        `;
        setTimeout(() => {
          floatingButton.innerHTML = originalHTML;
          floatingButton.style.pointerEvents = 'auto';
        }, 3000);
      }
    });

    // Füge Button direkt zu body hinzu (außerhalb React-Baum)
    document.body.appendChild(floatingButton);
    Logger.info('ApplyAI Floating Button erstellt (außerhalb React-DOM)');
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
    
    // Entferne auch Floating Button
    const floatingButton = document.getElementById('apply-ai-floating-btn');
    if (floatingButton) {
      floatingButton.remove();
    }
    
    // Entferne auch Form Button
    const formButton = document.getElementById('apply-ai-generate-btn-form');
    if (formButton) {
      formButton.remove();
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
    
    // Erstelle Button-Element
    const button = this.createButtonElement();
    
    if (textGenerateButton) {
      // Füge Button direkt nach dem "Text generieren" Button ein
      textGenerateButton.insertAdjacentElement('afterend', button);
      Logger.info('ApplyAI Button neben "Text generieren" Button platziert');
    } else {
      // Fallback: Füge am Anfang der Button-Gruppe ein
      if (titleAndButtons.firstChild) {
        titleAndButtons.insertBefore(button, titleAndButtons.firstChild);
      } else {
        titleAndButtons.appendChild(button);
      }
      Logger.info('ApplyAI Button am Anfang der Button-Gruppe platziert (Fallback)');
    }
    
    this.generateButton = button;
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
      this.checkForApplicationForm();
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'aria-hidden']
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
    // Entferne alle Buttons
    this.removeButton();
    
    // Prüfe neue Seite
    setTimeout(() => {
      this.checkForApplicationForm();
    }, 500);
  }
}

// Initialisiere Assistant
new ApplyAIAssistant();

