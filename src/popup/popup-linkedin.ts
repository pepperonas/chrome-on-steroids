/**
 * Erweiterte Popup-Funktionalität für LinkedIn
 * Diese Datei wird in popup.ts importiert
 */

import { StorageService } from '../shared/services/StorageService';
import { LinkedInSettings } from '../modules/linkedin/models/LinkedInSettings';
import { Logger } from '../shared/utils/logger';

export class LinkedInPopupExtension {
  /**
   * Lädt LinkedIn-Einstellungen
   */
  static async loadLinkedInSettings(): Promise<void> {
    try {
      const settings = await StorageService.load<LinkedInSettings>('linkedin_settings');

      const optimizeTitleCheckbox = document.getElementById('linkedin-optimize-title') as HTMLInputElement;
      const useStylingCheckbox = document.getElementById('linkedin-use-styling') as HTMLInputElement;
      const highlightingIntensitySelect = document.getElementById('linkedin-highlighting-intensity') as HTMLSelectElement;

      if (settings) {
        if (optimizeTitleCheckbox) {
          optimizeTitleCheckbox.checked = settings.optimizeTitle !== false; // Default: true
        }
        if (useStylingCheckbox) {
          useStylingCheckbox.checked = settings.useStyling !== false; // Default: true
        }
        if (highlightingIntensitySelect) {
          highlightingIntensitySelect.value = settings.highlightingIntensity || 'medium';
        }
      } else {
        // Default-Werte setzen wenn keine Settings vorhanden
        if (optimizeTitleCheckbox) {
          optimizeTitleCheckbox.checked = true;
        }
        if (useStylingCheckbox) {
          useStylingCheckbox.checked = true;
        }
        if (highlightingIntensitySelect) {
          highlightingIntensitySelect.value = 'medium';
        }
      }

    } catch (error) {
      Logger.error('[LinkedIn] Error loading settings:', error);
    }
  }

  /**
   * Speichert LinkedIn-Einstellungen
   */
  static async saveLinkedInSettings(): Promise<void> {
    try {
      const optimizeTitleCheckbox = document.getElementById('linkedin-optimize-title') as HTMLInputElement;
      const useStylingCheckbox = document.getElementById('linkedin-use-styling') as HTMLInputElement;
      const highlightingIntensitySelect = document.getElementById('linkedin-highlighting-intensity') as HTMLSelectElement;

      const settings: LinkedInSettings = {
        optimizeTitle: optimizeTitleCheckbox?.checked ?? true,
        useStyling: useStylingCheckbox?.checked ?? true,
        highlightingIntensity: (highlightingIntensitySelect?.value as 'low' | 'medium' | 'high') || 'medium'
      };

      await StorageService.save('linkedin_settings', settings);
      Logger.info('[LinkedIn] Settings saved:', settings);

    } catch (error) {
      Logger.error('[LinkedIn] Error saving settings:', error);
    }
  }
}

