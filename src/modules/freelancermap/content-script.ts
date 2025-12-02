import { FreelancerMapDOMService } from './services/FreelancerMapDOMService';
import { FreelancerMapController } from './controllers/FreelancerMapController';
import { Logger } from '../../shared/utils/logger';

/**
 * Content Script für FreelancerMap.de
 */
class FreelancerMapContentScript {
  private generateButton: HTMLElement | null = null;
  private observer: MutationObserver | null = null;
  private isCreatingButton = false;

  constructor() {
    // Prüfe zuerst ob wir überhaupt auf FreelancerMap sind
    if (!window.location.hostname.includes('freelancermap.de')) {
      return; // Kein Log, da wir auf Kleinanzeigen sein könnten
    }

    Logger.info('[FreelancerMap] Content Script initialized');
    this.initialize();
  }

  private initialize(): void {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.onPageLoad());
    } else {
      this.onPageLoad();
    }
  }

  private onPageLoad(): void {
    this.observeModalChanges();
    this.observeDOMChanges();
    this.checkForApplicationForm();
  }

  private checkForApplicationForm(): void {
    const modal = document.querySelector('.modal.search-result-modal.show') as HTMLElement;
    const modalCoverLetterField = document.getElementById('cover-letter') as HTMLTextAreaElement;
    
    if (modal && modalCoverLetterField && modal.contains(modalCoverLetterField)) {
      const isModalVisible = modal.classList.contains('show');
      if (isModalVisible) {
        this.checkAndCreateButtonInModal();
        return;
      }
    }

    const inlineForm = FreelancerMapDOMService.getCoverLetterField();
    if (inlineForm && inlineForm.offsetParent !== null) {
      this.checkAndCreateButtonInForm();
    }
  }

  private checkAndCreateButtonInModal(): void {
    const textarea = document.getElementById('cover-letter') as HTMLTextAreaElement;
    if (!textarea) {
      this.removeButton('chrome-on-steroids-generate-btn');
      return;
    }

    const modal = textarea.closest('.modal.search-result-modal');
    if (!modal || !modal.classList.contains('show')) {
      this.removeButton('chrome-on-steroids-generate-btn');
      return;
    }

    if (document.getElementById('chrome-on-steroids-generate-btn')) {
      return;
    }

    if (this.isCreatingButton) {
      return;
    }

    this.isCreatingButton = true;
    Logger.info('[FreelancerMap] Creating button in modal');

    try {
      this.createGenerateButtonInModal(textarea);
    } finally {
      setTimeout(() => {
        this.isCreatingButton = false;
      }, 500);
    }
  }

  private checkAndCreateButtonInForm(): void {
    const textarea = FreelancerMapDOMService.getCoverLetterField();
    if (!textarea) {
      this.removeButton('chrome-on-steroids-generate-btn-form');
      return;
    }

    if (document.getElementById('chrome-on-steroids-generate-btn-form')) {
      return;
    }

    if (this.isCreatingButton) {
      return;
    }

    this.isCreatingButton = true;
    Logger.info('[FreelancerMap] Creating button in form');

    try {
      this.createGenerateButtonInForm(textarea);
    } finally {
      setTimeout(() => {
        this.isCreatingButton = false;
      }, 500);
    }
  }

  private createGenerateButtonInModal(textarea: HTMLTextAreaElement): void {
    const buttonsContainer = textarea.closest('.cover-letter')?.querySelector('.title-and-buttons .buttons');
    if (!buttonsContainer) {
      Logger.warn('[FreelancerMap] Buttons container not found in modal');
      return;
    }

    const textGenerateButton = buttonsContainer.querySelector('[data-id="ai-application-button"]') as HTMLElement;
    const button = this.createButtonElement('chrome-on-steroids-generate-btn');
    
    if (textGenerateButton) {
      textGenerateButton.insertAdjacentElement('afterend', button);
    } else {
      buttonsContainer.appendChild(button);
    }
    
    this.generateButton = button;
  }

  private createGenerateButtonInForm(textarea: HTMLTextAreaElement): void {
    const buttonsContainer = textarea.closest('.cover-letter')?.querySelector('.title-and-buttons .buttons');
    if (!buttonsContainer) {
      Logger.warn('[FreelancerMap] Buttons container not found in form');
      return;
    }

    const textGenerateButton = buttonsContainer.querySelector('[data-id="ai-application-button"]') as HTMLElement;
    const button = this.createButtonElement('chrome-on-steroids-generate-btn-form');
    
    if (textGenerateButton) {
      textGenerateButton.insertAdjacentElement('afterend', button);
    } else {
      buttonsContainer.appendChild(button);
    }
    
    this.generateButton = button;
  }

  private createButtonElement(id: string): HTMLButtonElement {
    const button = document.createElement('a');
    button.id = id;
    button.href = '#';
    button.className = 'fm-btn fm-btn-secondary';
    button.innerHTML = `
      <i class="far fa-gem"></i>
      <span>Chrome On Steroids</span>
    `;
    button.title = 'Anschreiben mit AI generieren';

    button.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await this.handleGenerate();
    });

    return button as unknown as HTMLButtonElement;
  }

  private async handleGenerate(): Promise<void> {
    if (!this.generateButton) return;

    const originalHTML = this.generateButton.innerHTML;
    this.generateButton.style.pointerEvents = 'none';

    try {
      this.generateButton.innerHTML = `
        <i class="far fa-spinner fa-spin"></i>
        <span>Generiere...</span>
      `;

      const controller = new FreelancerMapController();
      await controller.generateAndInsertApplication();

      this.generateButton.innerHTML = `
        <i class="far fa-check"></i>
        <span>Fertig!</span>
      `;

      setTimeout(() => {
        if (this.generateButton) {
          this.generateButton.innerHTML = originalHTML;
          this.generateButton.style.pointerEvents = 'auto';
        }
      }, 2000);

    } catch (error) {
      Logger.error('[FreelancerMap] Generation error:', error);

      if (error instanceof Error && error.message.includes('Extension context invalidated')) {
        this.generateButton.innerHTML = `
          <i class="far fa-exclamation-triangle"></i>
          <span>⚠️ Seite neu laden</span>
        `;
        this.generateButton.title = 'Extension wurde aktualisiert. Bitte Seite neu laden (F5)';
      } else {
        this.generateButton.innerHTML = `
          <i class="far fa-exclamation-triangle"></i>
          <span>Fehler</span>
        `;
        this.generateButton.title = error instanceof Error ? error.message : 'Unbekannter Fehler';
      }

      setTimeout(() => {
        if (this.generateButton) {
          this.generateButton.innerHTML = originalHTML;
          this.generateButton.style.pointerEvents = 'auto';
          this.generateButton.title = 'Anschreiben mit AI generieren';
        }
      }, 3000);
    }
  }

  private removeButton(id: string): void {
    const button = document.getElementById(id);
    if (button) {
      button.remove();
      if (id === 'chrome-on-steroids-generate-btn' || id === 'chrome-on-steroids-generate-btn-form') {
        this.generateButton = null;
      }
    }
  }

  private observeModalChanges(): void {
    const modalObserver = new MutationObserver(() => {
      this.checkForApplicationForm();
    });

    modalObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'aria-hidden']
    });
  }

  private observeDOMChanges(): void {
    this.observer = new MutationObserver(() => {
      this.checkForApplicationForm();
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
}

// Initialisiere Content Script
new FreelancerMapContentScript();

