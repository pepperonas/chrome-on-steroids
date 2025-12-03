/**
 * Erweiterte Popup-Funktionalität für LinkedIn
 * Diese Datei wird in popup.ts importiert
 */

import { StorageService } from '../shared/services/StorageService';
import { LinkedInSettings } from '../modules/linkedin/models/LinkedInSettings';
import { Logger } from '../shared/utils/logger';

/**
 * Fügt Event Listener für Chat-Ziel-Auswahl hinzu
 */
function attachChatGoalListeners(): void {
  const chatGoalSelect = document.getElementById('linkedin-chat-goal') as HTMLSelectElement;
  const chatGoalCustomGroup = document.getElementById('linkedin-chat-goal-custom-group') as HTMLElement;
  const chatGoalSalesGroup = document.getElementById('linkedin-chat-goal-sales-group') as HTMLElement;

  if (chatGoalSelect) {
    chatGoalSelect.addEventListener('change', () => {
      const selectedValue = chatGoalSelect.value;
      // Zeige/verstecke Custom-Feld
      if (chatGoalCustomGroup) {
        chatGoalCustomGroup.style.display = selectedValue === 'custom' ? 'block' : 'none';
      }
      // Zeige/verstecke Sales-Feld
      if (chatGoalSalesGroup) {
        chatGoalSalesGroup.style.display = selectedValue === 'sales' ? 'block' : 'none';
      }
    });
  }
}

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
      const chatGoalSelect = document.getElementById('linkedin-chat-goal') as HTMLSelectElement;
      const chatGoalCustomTextarea = document.getElementById('linkedin-chat-goal-custom') as HTMLTextAreaElement;
      const chatGoalCustomGroup = document.getElementById('linkedin-chat-goal-custom-group') as HTMLElement;
      const chatGoalSalesProductTextarea = document.getElementById('linkedin-chat-goal-sales-product') as HTMLTextAreaElement;
      const chatGoalSalesGroup = document.getElementById('linkedin-chat-goal-sales-group') as HTMLElement;

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
        if (chatGoalSelect) {
          chatGoalSelect.value = settings.chatGoal || 'networking';
          // Zeige/verstecke Custom-Feld basierend auf Auswahl
          if (chatGoalCustomGroup) {
            chatGoalCustomGroup.style.display = settings.chatGoal === 'custom' ? 'block' : 'none';
          }
          // Zeige/verstecke Sales-Feld basierend auf Auswahl
          if (chatGoalSalesGroup) {
            chatGoalSalesGroup.style.display = settings.chatGoal === 'sales' ? 'block' : 'none';
          }
        }
        if (chatGoalCustomTextarea && settings.chatGoalCustom) {
          chatGoalCustomTextarea.value = settings.chatGoalCustom;
        }
        if (chatGoalSalesProductTextarea && settings.chatGoalSalesProduct) {
          chatGoalSalesProductTextarea.value = settings.chatGoalSalesProduct;
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
        if (chatGoalSelect) {
          chatGoalSelect.value = 'networking';
        }
        if (chatGoalCustomGroup) {
          chatGoalCustomGroup.style.display = 'none';
        }
        if (chatGoalSalesGroup) {
          chatGoalSalesGroup.style.display = 'none';
        }
      }

      // Event Listener für Chat-Ziel-Auswahl
      attachChatGoalListeners();

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
      const chatGoalSelect = document.getElementById('linkedin-chat-goal') as HTMLSelectElement;
      const chatGoalCustomTextarea = document.getElementById('linkedin-chat-goal-custom') as HTMLTextAreaElement;
      const chatGoalSalesProductTextarea = document.getElementById('linkedin-chat-goal-sales-product') as HTMLTextAreaElement;

      const settings: LinkedInSettings = {
        optimizeTitle: optimizeTitleCheckbox?.checked ?? true,
        useStyling: useStylingCheckbox?.checked ?? true,
        highlightingIntensity: (highlightingIntensitySelect?.value as 'low' | 'medium' | 'high') || 'medium',
        chatGoal: (chatGoalSelect?.value as LinkedInSettings['chatGoal']) || 'networking',
        chatGoalCustom: chatGoalSelect?.value === 'custom' ? (chatGoalCustomTextarea?.value?.trim() || undefined) : undefined,
        chatGoalSalesProduct: chatGoalSelect?.value === 'sales' ? (chatGoalSalesProductTextarea?.value?.trim() || undefined) : undefined
      };

      await StorageService.save('linkedin_settings', settings);
      Logger.info('[LinkedIn] Settings saved:', settings);

    } catch (error) {
      Logger.error('[LinkedIn] Error saving settings:', error);
    }
  }

  static async resetLinkedInSettings(): Promise<void> {
    try {
      await StorageService.remove('linkedin_settings');
      await this.loadLinkedInSettings(); // Load defaults
      Logger.info('[LinkedIn] Settings reset to defaults');
    } catch (error) {
      Logger.error('[LinkedIn] Error resetting settings:', error);
    }
  }
}

