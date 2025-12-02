/**
 * Erweiterte Popup-Funktionalität für Kleinanzeigen
 * Diese Datei wird in popup.ts importiert
 */

import { StorageService } from '../shared/services/StorageService';
import { KleinanzeigenSettings } from '../modules/kleinanzeigen/models/KleinanzeigenProduct';
import { Logger } from '../shared/utils/logger';

export class KleinanzeigenPopupExtension {
  /**
   * Lädt Kleinanzeigen-Einstellungen
   */
  static async loadKleinanzeigenSettings(): Promise<void> {
    try {
      const settings = await StorageService.load<KleinanzeigenSettings>('kleinanzeigen_settings');
      
      const discountTypeSelect = document.getElementById('discount-type') as HTMLSelectElement;
      const discountValueInput = document.getElementById('discount-value') as HTMLInputElement;
      const messageTemplateTextarea = document.getElementById('message-template') as HTMLTextAreaElement;

      if (settings) {
        if (discountTypeSelect) {
          discountTypeSelect.value = settings.discount?.type || 'percentage';
        }
        if (discountValueInput) {
          discountValueInput.value = settings.discount?.value?.toString() || '15';
        }
        if (messageTemplateTextarea) {
          messageTemplateTextarea.value = settings.messageTemplate || '';
        }
      } else {
        // Default-Werte setzen wenn keine Settings vorhanden
        if (discountTypeSelect) {
          discountTypeSelect.value = 'percentage';
        }
        if (discountValueInput) {
          discountValueInput.value = '15';
        }
      }

      // Update hint basierend auf Typ
      this.updateDiscountHint();

    } catch (error) {
      Logger.error('[Kleinanzeigen] Error loading settings:', error);
    }
  }

  /**
   * Speichert Kleinanzeigen-Einstellungen
   */
  static async saveKleinanzeigenSettings(): Promise<void> {
    try {
      const discountTypeSelect = document.getElementById('discount-type') as HTMLSelectElement;
      const discountValueInput = document.getElementById('discount-value') as HTMLInputElement;
      const messageTemplateTextarea = document.getElementById('message-template') as HTMLTextAreaElement;

      const settings: KleinanzeigenSettings = {
        discount: {
          type: discountTypeSelect?.value as 'percentage' | 'fixed' || 'percentage',
          value: parseInt(discountValueInput?.value || '10')
        },
        messageTemplate: messageTemplateTextarea?.value || undefined,
        autoSend: false
      };

      await StorageService.save('kleinanzeigen_settings', settings);
      Logger.info('[Kleinanzeigen] Settings saved:', settings);

    } catch (error) {
      Logger.error('[Kleinanzeigen] Error saving settings:', error);
      throw error;
    }
  }

  /**
   * Aktualisiert den Hinweistext basierend auf Rabatt-Typ
   */
  static updateDiscountHint(): void {
    const discountTypeSelect = document.getElementById('discount-type') as HTMLSelectElement;
    const discountHint = document.getElementById('discount-hint');

    if (!discountTypeSelect || !discountHint) return;

    if (discountTypeSelect.value === 'percentage') {
      discountHint.textContent = 'Gib 15 ein für 15% Rabatt (Standard)';
    } else {
      discountHint.textContent = 'Gib 50 ein für 50€ Rabatt';
    }
  }

  /**
   * Fügt Event Listener hinzu
   */
  static attachEventListeners(): void {
    // Discount Type Change
    const discountTypeSelect = document.getElementById('discount-type');
    if (discountTypeSelect) {
      discountTypeSelect.addEventListener('change', () => {
        this.updateDiscountHint();
      });
    }
  }

  /**
   * Setzt Kleinanzeigen-Einstellungen zurück
   */
  static async resetKleinanzeigenSettings(): Promise<void> {
    const discountTypeSelect = document.getElementById('discount-type') as HTMLSelectElement;
    const discountValueInput = document.getElementById('discount-value') as HTMLInputElement;
    const messageTemplateTextarea = document.getElementById('message-template') as HTMLTextAreaElement;

    if (discountTypeSelect) discountTypeSelect.value = 'percentage';
    if (discountValueInput) discountValueInput.value = '15';
    if (messageTemplateTextarea) messageTemplateTextarea.value = '';

    this.updateDiscountHint();

    await StorageService.save('kleinanzeigen_settings', {
      discount: { type: 'percentage', value: 15 },
      messageTemplate: undefined,
      autoSend: false
    });
  }
}

