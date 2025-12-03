import { StorageService } from '../shared/services/StorageService';
import { InstagramSettings, InstagramMood } from '../modules/instagram/models/InstagramSettings';
import { Logger } from '../shared/utils/logger';

export class InstagramPopupExtension {
  static async loadInstagramSettings(): Promise<void> {
    try {
      const settings = await StorageService.load<InstagramSettings>('instagram_settings');

      const moodSelect = document.getElementById('instagram-mood') as HTMLSelectElement;

      if (settings) {
        if (moodSelect) {
          moodSelect.value = settings.mood || 'neutral';
        }
      } else {
        // Default-Werte setzen wenn keine Settings vorhanden
        if (moodSelect) {
          moodSelect.value = 'neutral';
        }
      }

    } catch (error) {
      Logger.error('[Instagram] Error loading settings:', error);
    }
  }

  static async saveInstagramSettings(): Promise<void> {
    try {
      const moodSelect = document.getElementById('instagram-mood') as HTMLSelectElement;

      const settings: InstagramSettings = {
        mood: (moodSelect?.value as InstagramMood) || 'neutral'
      };

      await StorageService.save('instagram_settings', settings);
      Logger.info('[Instagram] Settings saved:', settings);

    } catch (error) {
      Logger.error('[Instagram] Error saving settings:', error);
    }
  }

  static async resetInstagramSettings(): Promise<void> {
    try {
      await StorageService.remove('instagram_settings');
      await this.loadInstagramSettings(); // Load defaults
      Logger.info('[Instagram] Settings reset to defaults');
    } catch (error) {
      Logger.error('[Instagram] Error resetting settings:', error);
    }
  }

  static attachEventListeners(): void {
    document.getElementById('instagram-mood')?.addEventListener('change', () => this.saveInstagramSettings());
  }
}

