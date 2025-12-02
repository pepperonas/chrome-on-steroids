import { KleinanzeigenDOMService } from './services/KleinanzeigenDOMService';
import { MessageGenerator } from './services/MessageGenerator';
import { DescriptionOptimizer } from './services/DescriptionOptimizer';
import { StorageService } from '../../shared/services/StorageService';
import { Logger } from '../../shared/utils/logger';
import { KleinanzeigenSettings } from './models/KleinanzeigenProduct';
import { SellerSettings } from './models/SellerSettings';

/**
 * Content Script für Kleinanzeigen.de
 */
class KleinanzeigenContentScript {
  private button: HTMLElement | null = null;
  private optimizeButton: HTMLElement | null = null;
  private isProcessing = false;

  constructor() {
    Logger.info('[Kleinanzeigen] Content Script initialized');
    this.init();
    this.injectToastStyles();
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
    `;
    document.head.appendChild(style);
  }

  private init(): void {
    // Prüfe zuerst ob wir überhaupt auf Kleinanzeigen sind
    if (!window.location.hostname.includes('kleinanzeigen.de')) {
      return; // Kein Log, da wir auf FreelancerMap sein könnten
    }

    Logger.info('[Kleinanzeigen] Checking page type...', {
      hostname: window.location.hostname,
      pathname: window.location.pathname
    });
    
    // Produktseite: Kaufanfrage-Button
    if (KleinanzeigenDOMService.isProductPage()) {
      Logger.info('[Kleinanzeigen] Product page detected! Creating purchase button...');
      this.createButton();
      return;
    }

    // Inserat-Erstellen-Seite: Beschreibungs-Optimierungs-Button
    if (KleinanzeigenDOMService.isPostAdPage()) {
      Logger.info('[Kleinanzeigen] Post-Ad page detected! Creating optimize button...');
      this.createOptimizeButton();
      return;
    }

    Logger.info('[Kleinanzeigen] Not a relevant page');
  }

  /**
   * Erstellt den "Anfrage generieren" Button im Modal
   */
  private createButton(): void {
    // Warte bis Seite geladen ist
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.createButton());
      return;
    }

    // Prüfe ob Button bereits existiert
    if (document.getElementById('kleinanzeigen-ai-btn')) {
      Logger.info('[Kleinanzeigen] Button already exists');
      return;
    }

    // Warte auf Modal (wird beim Klick auf "Nachricht schreiben" geöffnet)
    this.observeModalOpening();
    
    // Versuche auch direkt, falls Modal schon offen ist
    this.tryCreateButtonInModal();
  }

  /**
   * Beobachtet das Öffnen des Modals
   */
  private observeModalOpening(): void {
    const observer = new MutationObserver(() => {
      this.tryCreateButtonInModal();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
  }

  /**
   * Versucht Button im Modal zu erstellen
   */
  private tryCreateButtonInModal(): void {
    // Prüfe ob Button bereits existiert
    if (document.getElementById('kleinanzeigen-ai-btn')) {
      return;
    }

    // Finde das Modal
    const modal = document.querySelector('#viewad-contact-modal-form, .modal-dialog') as HTMLElement;
    if (!modal) {
      return;
    }

    // Finde den "Nachricht senden" Button im Modal
    const submitButton = modal.querySelector('.viewad-contact-submit, button[type="submit"]') as HTMLElement;
    if (!submitButton) {
      Logger.warn('[Kleinanzeigen] Submit button not found in modal');
      return;
    }

    Logger.info('[Kleinanzeigen] Modal and submit button found!');

    // Erstelle unseren Button
    const button = document.createElement('button');
    button.id = 'kleinanzeigen-ai-btn';
    button.type = 'button'; // Wichtig: nicht submit!
    button.className = 'button button-secondary taller';
    button.style.marginRight = '8px';
    button.innerHTML = `
      <i class="button-icon icon-gem"></i>
      <span>Anfrage generieren</span>
    `;
    button.title = 'Automatische Kaufanfrage mit Preisvorschlag';

    button.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await this.handleClick();
    });

    // Füge Button VOR dem "Nachricht senden" Button ein
    submitButton.parentElement?.insertBefore(button, submitButton);
    this.button = button;

    Logger.info('[Kleinanzeigen] Button created in modal next to submit button');
  }

  /**
   * Behandelt Button-Klick
   */
  private async handleClick(): Promise<void> {
    if (this.isProcessing || !this.button) return;

    this.isProcessing = true;
    const originalHTML = this.button.innerHTML;

    try {
      // Loading State
      this.button.innerHTML = `
        <i class="button-icon icon-spinner fa-spin"></i>
        <span>Generiere...</span>
      `;
      this.button.style.pointerEvents = 'none';

      // Extrahiere Produktdaten
      const product = KleinanzeigenDOMService.extractProductData();
      if (!product) {
        throw new Error('Produktdaten konnten nicht extrahiert werden');
      }

      Logger.info('[Kleinanzeigen] Product data extracted:', {
        title: product.title,
        price: product.price,
        adId: product.adId
      });

      // Lade Einstellungen
      const settings = await StorageService.load<KleinanzeigenSettings>('kleinanzeigen_settings');
      if (!settings || !settings.discount) {
        throw new Error('Bitte konfiguriere zuerst den Rabatt in den Einstellungen (Extension-Icon klicken)');
      }

      Logger.info('[Kleinanzeigen] Settings loaded:', {
        discountType: settings.discount.type,
        discountValue: settings.discount.value
      });

      // Generiere Nachricht
      const message = MessageGenerator.generatePurchaseMessage(
        product,
        settings.discount,
        settings.messageTemplate
      );

      Logger.info('[Kleinanzeigen] Message generated:', message);

      // Füge Nachricht ein (Modal ist bereits offen)
      this.button.innerHTML = `
        <i class="button-icon icon-spinner fa-spin"></i>
        <span>Füge ein...</span>
      `;

      const inserted = KleinanzeigenDOMService.insertMessage(message);
      if (!inserted) {
        throw new Error('Nachricht konnte nicht eingefügt werden');
      }

      // Success State
      this.button.innerHTML = `
        <i class="button-icon icon-check"></i>
        <span>Fertig!</span>
      `;
      this.button.style.backgroundColor = '#4caf50';

      Logger.info('[Kleinanzeigen] ✅ Message inserted successfully');

      // Reset nach 3 Sekunden
      setTimeout(() => {
        if (this.button) {
          this.button.innerHTML = originalHTML;
          this.button.style.pointerEvents = 'auto';
          this.button.style.backgroundColor = '';
        }
        this.isProcessing = false;
      }, 3000);

    } catch (error) {
      Logger.error('[Kleinanzeigen] Error:', error);

      // Error State
      if (this.button) {
        this.button.innerHTML = `
          <i class="button-icon icon-exclamation-triangle"></i>
          <span>Fehler</span>
        `;
        this.button.style.backgroundColor = '#f44336';
        this.button.title = error instanceof Error ? error.message : 'Unbekannter Fehler';

        setTimeout(() => {
          if (this.button) {
            this.button.innerHTML = originalHTML;
            this.button.style.pointerEvents = 'auto';
            this.button.style.backgroundColor = '';
            this.button.title = 'Automatische Kaufanfrage mit Preisvorschlag';
          }
          this.isProcessing = false;
        }, 3000);
      }
    }
  }

  /**
   * Erstellt den "Beschreibung optimieren" Button auf der Inserat-Seite
   */
  private createOptimizeButton(): void {
    // Warte bis Seite geladen ist
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.createOptimizeButton());
      return;
    }

    // Warte kurz, bis React das Formular gerendert hat
    setTimeout(() => {
      this.tryCreateOptimizeButton();
      
      // Beobachte das Formular auf Änderungen (z.B. Kategorieauswahl)
      this.observeFormChanges();
    }, 500);
  }

  /**
   * Versucht den Optimize-Button zu erstellen
   */
  private tryCreateOptimizeButton(): void {
    try {
      // Prüfe ob Button bereits existiert
      const existingButton = document.getElementById('kleinanzeigen-optimize-btn');
      if (existingButton) {
        Logger.info('[Kleinanzeigen] Optimize button already exists');
        return;
      }

      const labelContainer = KleinanzeigenDOMService.getDescriptionOptimizeButtonContainer();
      if (!labelContainer) {
        Logger.warn('[Kleinanzeigen] Description label not found');
        return;
      }

      // Prüfe ob Container noch im DOM ist
      if (!document.body.contains(labelContainer)) {
        Logger.warn('[Kleinanzeigen] Label container not in DOM');
        return;
      }

      // Erstelle Button
      const button = document.createElement('button');
      button.id = 'kleinanzeigen-optimize-btn';
      button.type = 'button';
      button.className = 'button button-secondary';
      button.style.marginLeft = '12px';
      button.style.verticalAlign = 'middle';
      button.style.display = 'inline-block';
      button.innerHTML = `
        <i class="icon icon-gem"></i>
        <span>Mit AI optimieren</span>
      `;
      button.title = 'Beschreibung mit KI optimieren';

      button.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await this.handleOptimizeClick();
      });

      // Füge Button neben dem Label ein
      labelContainer.appendChild(button);
      this.optimizeButton = button;

      Logger.info('[Kleinanzeigen] Optimize button created successfully');
    } catch (error) {
      Logger.error('[Kleinanzeigen] Error creating optimize button:', error);
    }
  }

  /**
   * Beobachtet das Formular auf Änderungen (z.B. Kategorieauswahl)
   */
  private observeFormChanges(): void {
    // Beobachte den gesamten Body, aber mit Debouncing
    let checkTimeout: number | null = null;

    const observer = new MutationObserver(() => {
      // Debounce: Warte 500ms nach letzter Änderung
      if (checkTimeout) {
        clearTimeout(checkTimeout);
      }

      checkTimeout = window.setTimeout(() => {
        try {
          // Prüfe ob das Beschreibungsfeld noch existiert
          const descriptionField = document.querySelector('#pstad-descrptn');
          if (!descriptionField) {
            return;
          }

          // Prüfe ob Button fehlt
          const button = document.getElementById('kleinanzeigen-optimize-btn');
          if (!button) {
            Logger.info('[Kleinanzeigen] Button missing after form update, recreating...');
            this.tryCreateOptimizeButton();
          }
        } catch (error) {
          Logger.error('[Kleinanzeigen] Error in form observer:', error);
        }
      }, 500);
    });

    // Beobachte den gesamten Body mit weniger aggressiven Optionen
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false
    });

    Logger.info('[Kleinanzeigen] Form observer started');

    // Zusätzlich: Prüfe regelmäßig (alle 2 Sekunden)
    setInterval(() => {
      try {
        const descriptionField = document.querySelector('#pstad-descrptn');
        const button = document.getElementById('kleinanzeigen-optimize-btn');
        
        if (descriptionField && !button) {
          Logger.info('[Kleinanzeigen] Button missing (interval check), recreating...');
          this.tryCreateOptimizeButton();
        }
      } catch (error) {
        // Ignoriere Fehler beim Interval-Check
      }
    }, 2000);
  }

  /**
   * Behandelt Klick auf "Beschreibung optimieren"
   */
  private async handleOptimizeClick(): Promise<void> {
    if (this.isProcessing || !this.optimizeButton) return;

    this.isProcessing = true;
    const originalHTML = this.optimizeButton.innerHTML;

    try {
      // Loading State
      this.optimizeButton.innerHTML = `
        <i class="icon icon-spinner fa-spin"></i>
        <span>Optimiere...</span>
      `;
      this.optimizeButton.style.pointerEvents = 'none';

      // Extrahiere Inserat-Daten
      const adData = KleinanzeigenDOMService.extractAdDataFromForm();
      if (!adData) {
        throw new Error('Produktdaten konnten nicht extrahiert werden');
      }
      if (!adData.title) {
        throw new Error('Produkttitel fehlt');
      }
      if (!adData.description) {
        throw new Error('Produktbeschreibung fehlt');
      }

      Logger.info('[Kleinanzeigen] Ad data extracted:', adData);

      // Lade Verkäufer-Einstellungen
      const sellerSettings = await StorageService.load<SellerSettings>('seller_settings');
      if (!sellerSettings) {
        throw new Error('Verkäufer-Einstellungen fehlen. Bitte konfiguriere deine Daten in den Einstellungen (Extension-Icon klicken).');
      }
      if (!sellerSettings.name) {
        throw new Error('Verkäufer-Name fehlt. Bitte konfiguriere deine Daten in den Einstellungen (Extension-Icon klicken).');
      }

      Logger.info('[Kleinanzeigen] Seller settings loaded');

      // Optimiere Beschreibung
      this.optimizeButton.innerHTML = `
        <i class="icon icon-spinner fa-spin"></i>
        <span>KI arbeitet...</span>
      `;

      const optimizedDescription = await DescriptionOptimizer.optimizeDescription(adData, sellerSettings);

      Logger.info('[Kleinanzeigen] Description optimized:', {
        originalLength: adData.description.length,
        optimizedLength: optimizedDescription.length
      });

      // Füge optimierte Beschreibung ein
      const inserted = KleinanzeigenDOMService.insertOptimizedDescription(optimizedDescription);
      if (!inserted) {
        throw new Error('Beschreibung konnte nicht eingefügt werden. Bitte versuche es erneut.');
      }

      // Success State
      this.optimizeButton.innerHTML = `
        <i class="icon icon-check"></i>
        <span>Optimiert!</span>
      `;
      this.optimizeButton.style.backgroundColor = '#4caf50';

      Logger.info('[Kleinanzeigen] ✅ Description optimized successfully');

      // Reset nach 3 Sekunden
      setTimeout(() => {
        if (this.optimizeButton) {
          this.optimizeButton.innerHTML = originalHTML;
          this.optimizeButton.style.pointerEvents = 'auto';
          this.optimizeButton.style.backgroundColor = '';
        }
        this.isProcessing = false;
      }, 3000);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      Logger.error('[Kleinanzeigen] Optimization error:', error);

      // Zeige Toast mit Fehlermeldung
      this.showToast(errorMessage, 'error');

      // Error State
      if (this.optimizeButton) {
        this.optimizeButton.innerHTML = `
          <i class="icon icon-exclamation-triangle"></i>
          <span>Fehler</span>
        `;
        this.optimizeButton.style.backgroundColor = '#f44336';
        this.optimizeButton.title = errorMessage;

        setTimeout(() => {
          if (this.optimizeButton) {
            this.optimizeButton.innerHTML = originalHTML;
            this.optimizeButton.style.pointerEvents = 'auto';
            this.optimizeButton.style.backgroundColor = '';
            this.optimizeButton.title = 'Beschreibung mit KI optimieren';
          }
          this.isProcessing = false;
        }, 3000);
      }
    }
  }
}

// Initialisiere Content Script
new KleinanzeigenContentScript();

