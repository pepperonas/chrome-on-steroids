import { Project } from '../models/Project';
import { Logger } from '../utils/logger';

/**
 * Service für DOM-Manipulation auf freelancermap.de
 */
export class DOMService {
  /**
   * Extrahiert Projektdaten von der Seite oder aus dem Modal
   */
  static extractProjectData(): Project | null {
    // Versuche zuerst aus dem Modal zu extrahieren (wenn geöffnet)
    const modalData = this.extractProjectDataFromModal();
    if (modalData) {
      Logger.info('Projektdaten aus Modal extrahiert');
      return modalData;
    }

    // Fallback: Extrahiere von der Projektdetailseite
    const pageData = this.extractProjectDataFromPage();
    if (pageData) {
      Logger.info('Projektdaten von Seite extrahiert');
      return pageData;
    }

    Logger.warn('Keine Projektdaten gefunden');
    return null;
  }

  /**
   * Extrahiert Projektdaten aus dem Bewerbungsmodal
   */
  private static extractProjectDataFromModal(): Project | null {
    try {
      const modal = document.querySelector('.modal.search-result-modal.show');
      if (!modal) return null;

      // Titel aus dem Modal-Header
      const titleElement = modal.querySelector('.modal-header h5') ||
        modal.querySelector('.modal-title') ||
        modal.querySelector('h5') ||
        modal.querySelector('h4');
      
      // Projektbeschreibung aus dem Modal
      const descriptionElement = modal.querySelector('.project-description') ||
        modal.querySelector('.description') ||
        modal.querySelector('[class*="description"]') ||
        modal.querySelector('.modal-body p');

      // Firma/Unternehmen
      const companyElement = modal.querySelector('.company-name') ||
        modal.querySelector('[class*="company"]') ||
        modal.querySelector('.client-name');

      // Skills/Tags
      const badgeElements = modal.querySelectorAll('.badge') ||
        modal.querySelectorAll('.skill-badge') ||
        modal.querySelectorAll('[class*="skill"]');

      // Ort
      const locationElement = modal.querySelector('[class*="location"]') ||
        modal.querySelector('[class*="city"]') ||
        modal.querySelector('.location');

      // Remote
      const remoteElement = modal.querySelector('[class*="remote"]');
      const modalText = modal.textContent || '';
      const remote = remoteElement?.textContent?.toLowerCase().includes('remote') ||
        modalText.toLowerCase().includes('remote') || false;

      // Dauer
      const durationElement = modal.querySelector('[class*="duration"]') ||
        modal.querySelector('.duration');

      // Startdatum
      const startElement = modal.querySelector('[class*="start"]') ||
        modal.querySelector('[class*="beginning"]');

      // Extrahiere Werte
      const title = titleElement?.textContent?.trim() || '';
      
      // Beschreibung: Versuche verschiedene Quellen
      let description = descriptionElement?.textContent?.trim() || '';
      if (!description) {
        // Versuche aus dem Modal-Body mehr Text zu holen
        const modalBody = modal.querySelector('.modal-body');
        if (modalBody) {
          // Sammle alle Textinhalte außer Buttons und Inputs
          const textNodes = modalBody.querySelectorAll('p, div:not(.buttons):not(.form-group)');
          description = Array.from(textNodes)
            .map(el => el.textContent?.trim())
            .filter(text => text && text.length > 20)
            .join(' ');
        }
      }

      const company = companyElement?.textContent?.trim() || '';
      
      const skills = Array.from(badgeElements)
        .map(badge => badge.textContent?.trim() || '')
        .filter(skill => skill && 
          !skill.includes('Top-Projekt') && 
          !skill.includes('Remote') &&
          skill.length > 1);

      const location = locationElement?.textContent?.trim() || '';
      const duration = durationElement?.textContent?.trim() || '';
      const startDate = startElement?.textContent?.trim() || '';

      // Mindestens Titel oder Beschreibung sollte vorhanden sein
      if (!title && !description) {
        return null;
      }

      // Generiere eine ID basierend auf Titel
      const projectId = title ? title.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 50) : 'modal-project';

      return {
        id: projectId,
        title: title || 'Projekt aus Modal',
        description: description || 'Keine Beschreibung verfügbar',
        company,
        location,
        remote,
        skills,
        startDate,
        duration,
        workload: ''
      };

    } catch (error) {
      Logger.error('Error extracting project data from modal:', error);
      return null;
    }
  }

  /**
   * Extrahiert Projektdaten von der Projektdetailseite
   */
  private static extractProjectDataFromPage(): Project | null {
    try {
      const titleElement = document.querySelector('.project-header h1') ||
        document.querySelector('h1[data-testid="project-title"]') ||
        document.querySelector('h1');
      
      const descriptionElement = document.querySelector('.project-body-description') ||
        document.querySelector('[data-testid="project-description"]') ||
        document.querySelector('.project-description');
      
      const companyElement = document.querySelector('.project-body-info .info-item:first-child div:last-child') ||
        document.querySelector('[data-testid="company-name"]') ||
        document.querySelector('.company-name');

      const badgeElements = document.querySelectorAll('.project-body-badges .badge') ||
        document.querySelectorAll('[data-testid="skill-badge"]') ||
        document.querySelectorAll('.skill-badge, .badge');

      if (!titleElement || !descriptionElement) {
        return null;
      }

      const title = titleElement.textContent?.trim() || '';
      const description = descriptionElement.textContent?.trim() || '';
      const company = companyElement?.textContent?.trim() || '';
      
      const skills = Array.from(badgeElements)
        .map(badge => badge.textContent?.trim() || '')
        .filter(skill => skill && !skill.includes('Top-Projekt') && !skill.includes('Remote'));

      // Weitere Datenextraktion basierend auf dem HTML-Dokument
      const locationElement = document.querySelector('[data-testid="city"]') ||
        document.querySelector('.location') ||
        document.querySelector('[class*="location"]');
      const location = locationElement?.textContent?.trim() || '';

      const remoteElement = document.querySelector('[data-testid="remoteInPercent"]') ||
        document.querySelector('[class*="remote"]') ||
        document.querySelector('[class*="Remote"]');
      const remote = remoteElement?.textContent?.includes('Remote') ||
        remoteElement?.textContent?.includes('remote') ||
        document.body.textContent?.toLowerCase().includes('remote') || false;

      const durationElement = document.querySelector('[data-testid="duration"]') ||
        document.querySelector('.duration') ||
        document.querySelector('[class*="duration"]');
      const duration = durationElement?.textContent?.trim() || '';

      const beginningElement = document.querySelector('[data-testid="beginningMonth"]') ||
        document.querySelector('[data-testid="beginningText"]') ||
        document.querySelector('.start-date') ||
        document.querySelector('[class*="start"]');
      const startDate = beginningElement?.textContent?.trim() || '';

      const workloadElement = document.querySelector('.project-header-info-list') ||
        document.querySelector('[data-testid="workload"]') ||
        document.querySelector('.workload');
      const workloadText = workloadElement?.textContent || '';
      const workloadMatch = workloadText.match(/(\d+)%\s*(Auslastung|Workload)/i);
      const workload = workloadMatch ? workloadMatch[1] + '%' : '';

      // Extract project ID from URL
      const urlParts = window.location.pathname.split('/');
      const projectId = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2] || '';

      return {
        id: projectId,
        title,
        description,
        company,
        location,
        remote,
        skills,
        startDate,
        duration,
        workload
      };

    } catch (error) {
      Logger.error('Error extracting project data from page:', error);
      return null;
    }
  }

  /**
   * Fügt generierten Text in das Anschreibenfeld ein
   */
  static insertCoverLetter(text: string): boolean {
    try {
      // Try multiple selectors for the cover letter textarea
      const textarea = document.querySelector('#cover-letter') as HTMLTextAreaElement ||
        document.querySelector('textarea[name="coverLetter"]') as HTMLTextAreaElement ||
        document.querySelector('textarea[name="cover-letter"]') as HTMLTextAreaElement ||
        document.querySelector('textarea[placeholder*="Anschreiben"]') as HTMLTextAreaElement ||
        document.querySelector('textarea[placeholder*="anschreiben"]') as HTMLTextAreaElement ||
        document.querySelector('textarea[data-testid="cover-letter"]') as HTMLTextAreaElement ||
        document.querySelector('textarea') as HTMLTextAreaElement;

      if (!textarea) {
        throw new Error('Anschreibenfeld nicht gefunden');
      }

      textarea.value = text;

      // Trigger input event für React/Vue Kompatibilität
      const inputEvent = new Event('input', { bubbles: true });
      textarea.dispatchEvent(inputEvent);

      // Trigger change event
      const changeEvent = new Event('change', { bubbles: true });
      textarea.dispatchEvent(changeEvent);

      // Also try setting value property directly for React
      Object.defineProperty(textarea, 'value', {
        writable: true,
        value: text
      });

      // Focus the textarea
      textarea.focus();

      return true;
    } catch (error) {
      Logger.error('Error inserting cover letter:', error);
      return false;
    }
  }

  /**
   * Prüft ob wir auf einer Projektseite sind
   */
  static isProjectPage(): boolean {
    return window.location.href.includes('freelancermap.de/projekt/') ||
      window.location.href.includes('freelancermap.de/project/') ||
      window.location.pathname.includes('/projekt/') ||
      window.location.pathname.includes('/project/');
  }

  /**
   * Prüft ob ein Anschreiben-Feld auf der Seite vorhanden ist
   */
  static hasCoverLetterField(): boolean {
    // Prüfe zuerst im Modal (Bewerbungsdialog)
    const modal = document.querySelector('.modal.search-result-modal.show');
    if (modal) {
      const modalTextarea = modal.querySelector('#cover-letter') as HTMLTextAreaElement;
      if (modalTextarea) return true;
    }

    // Fallback: Prüfe auf der Seite
    const textarea = document.querySelector('#cover-letter') as HTMLTextAreaElement ||
      document.querySelector('textarea[name="coverLetter"]') as HTMLTextAreaElement ||
      document.querySelector('textarea[name="cover-letter"]') as HTMLTextAreaElement ||
      document.querySelector('textarea[placeholder*="Anschreiben"]') as HTMLTextAreaElement ||
      document.querySelector('textarea[placeholder*="anschreiben"]') as HTMLTextAreaElement ||
      document.querySelector('textarea[data-testid="cover-letter"]') as HTMLTextAreaElement;

    return !!textarea;
  }

  /**
   * Gibt das Anschreiben-Feld zurück, falls vorhanden
   */
  static getCoverLetterField(): HTMLTextAreaElement | null {
    // Prüfe zuerst im Modal (Bewerbungsdialog)
    const modal = document.querySelector('.modal.search-result-modal.show');
    if (modal) {
      const modalTextarea = modal.querySelector('#cover-letter') as HTMLTextAreaElement;
      if (modalTextarea) return modalTextarea;
    }

    // Fallback: Prüfe auf der Seite
    return document.querySelector('#cover-letter') as HTMLTextAreaElement ||
      document.querySelector('textarea[name="coverLetter"]') as HTMLTextAreaElement ||
      document.querySelector('textarea[name="cover-letter"]') as HTMLTextAreaElement ||
      document.querySelector('textarea[placeholder*="Anschreiben"]') as HTMLTextAreaElement ||
      document.querySelector('textarea[placeholder*="anschreiben"]') as HTMLTextAreaElement ||
      document.querySelector('textarea[data-testid="cover-letter"]') as HTMLTextAreaElement ||
      null;
  }
}

