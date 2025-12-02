import { AIService } from '../services/AIService';
import { ChatGPTProvider } from '../services/ChatGPTProvider';
import { ClaudeProvider } from '../services/ClaudeProvider';
import { StorageService } from '../services/StorageService';
import { DOMService } from '../services/DOMService';
import { LoggingService } from '../services/LoggingService';
import { Logger } from '../utils/logger';
import { ApiConfig, AIProvider } from '../models/ApiConfig';
import { UserProfile } from '../models/UserProfile';
import { Project } from '../models/Project';
import { GenerationLogHelper } from '../models/GenerationLog';
import { CONSTANTS } from '../utils/constants';

/**
 * Controller für den Bewerbungsprozess (MVC Pattern)
 */
export class ApplicationController {
  private aiService: AIService | null = null;

  /**
   * Initialisiert den AI-Provider basierend auf Konfiguration
   */
  async initialize(): Promise<void> {
    const config = await StorageService.load<ApiConfig>(CONSTANTS.STORAGE_KEYS.API_CONFIG);

    if (!config) {
      throw new Error('Keine API-Konfiguration gefunden. Bitte konfiguriere zuerst deine API-Einstellungen.');
    }

    // Hole den API Key für den konfigurierten Provider
    const apiKey = config.provider === AIProvider.CHATGPT
      ? (config.chatgptApiKey || config.apiKey)
      : (config.claudeApiKey || config.apiKey);

    if (!apiKey) {
      throw new Error(`Kein API Key für ${config.provider} gefunden. Bitte konfiguriere zuerst deine API-Einstellungen.`);
    }

    // Erstelle Config mit dem richtigen API Key
    const providerConfig: ApiConfig = {
      ...config,
      apiKey: apiKey,
      model: config.provider === AIProvider.CHATGPT
        ? (config.chatgptModel || config.model)
        : (config.claudeModel || config.model)
    };

    // Factory Pattern für Provider-Auswahl
    this.aiService = this.createAIService(providerConfig);
  }

  private createAIService(config: ApiConfig): AIService {
    switch (config.provider) {
      case AIProvider.CHATGPT:
        return new ChatGPTProvider(config.apiKey, config.model || CONSTANTS.DEFAULT_MODELS.CHATGPT);
      case AIProvider.CLAUDE:
        return new ClaudeProvider(config.apiKey, config.model || CONSTANTS.DEFAULT_MODELS.CLAUDE);
      default:
        throw new Error(`Unbekannter AI-Provider: ${config.provider}`);
    }
  }

  /**
   * Generiert und fügt Bewerbungsanschreiben ein
   */
  async generateAndInsertApplication(): Promise<void> {
    const startTime = Date.now();
    let project: Project | null = null;
    let userProfile: UserProfile | null = null;
    let apiConfig: ApiConfig | null = null;
    let prompt = '';
    let coverLetter = '';
    let modelUsed = '';

    try {
      // 1. Projektdaten extrahieren
      Logger.info('Extrahiere Projektdaten...');
      project = DOMService.extractProjectData();
      if (!project) {
        throw new Error('Keine Projektdaten gefunden. Öffne das Bewerbungsmodal auf einer Projektseite.');
      }
      Logger.info('Projektdaten gefunden:', { 
        title: project.title, 
        company: project.company,
        skills: project.skills.length,
        hasDescription: !!project.description
      });

      // 2. Benutzerprofil laden
      Logger.info('Lade Benutzerprofil...');
      userProfile = await StorageService.load<UserProfile>(CONSTANTS.STORAGE_KEYS.USER_PROFILE);
      if (!userProfile) {
        throw new Error('Kein Benutzerprofil gefunden. Bitte öffne die Extension (Klick auf Icon) und fülle dein Profil aus.');
      }
      
      // Validiere Benutzerprofil
      if (!userProfile.name || !userProfile.skills || userProfile.skills.length === 0) {
        throw new Error('Benutzerprofil unvollständig. Bitte fülle Name und Skills in den Einstellungen aus.');
      }
      
      Logger.info('Benutzerprofil geladen:', { 
        name: userProfile.name, 
        skills: userProfile.skills.length,
        hasExperience: !!userProfile.experience,
        hasCustomIntro: !!userProfile.customIntro
      });

      // 3. API Config laden
      apiConfig = await StorageService.load<ApiConfig>(CONSTANTS.STORAGE_KEYS.API_CONFIG);
      
      // 4. AI-Service initialisieren
      Logger.info('Initialisiere AI-Service...');
      if (!this.aiService) {
        await this.initialize();
      }

      // 5. Prompt generieren (für Logging)
      if (this.aiService) {
        // Zugriff auf buildPrompt über die Instanz
        prompt = (this.aiService as any).buildPrompt(project, userProfile);
      }

      // 6. Anschreiben generieren
      Logger.info('Generiere Anschreiben mit AI...');
      coverLetter = await this.aiService!.generateCoverLetter(project, userProfile);
      Logger.info('Anschreiben generiert:', { length: coverLetter.length });
      
      // 6.5. Validiere gegen Profil (erfundene Inhalte erkennen)
      this.validateCoverLetterAgainstProfile(coverLetter, userProfile);

      // Bestimme verwendetes Modell
      if (apiConfig) {
        modelUsed = apiConfig.provider === AIProvider.CHATGPT
          ? (apiConfig.chatgptModel || apiConfig.model || CONSTANTS.DEFAULT_MODELS.CHATGPT)
          : (apiConfig.claudeModel || apiConfig.model || CONSTANTS.DEFAULT_MODELS.CLAUDE);
      }

      // 7. In Textfeld einfügen
      Logger.info('Füge Anschreiben in Textfeld ein...');
      const success = DOMService.insertCoverLetter(coverLetter);

      if (!success) {
        throw new Error('Fehler beim Einfügen des Anschreibens. Textfeld nicht gefunden.');
      }

      // 8. Generierungs-Log erstellen und speichern
      const generationTimeMs = Date.now() - startTime;
      
      if (apiConfig) {
        const apiParams = this.getApiParams(apiConfig.provider);
        
        const log = GenerationLogHelper.createLog(
          project,
          userProfile,
          apiConfig,
          prompt,
          coverLetter,
          generationTimeMs,
          modelUsed,
          apiParams
        );
        
        // Speichere Log asynchron (nicht blockierend)
        LoggingService.saveLog(log).catch(err => 
          Logger.error('Failed to save generation log:', err)
        );
        
        Logger.info('📊 Generation log saved', {
          generationTime: `${generationTimeMs}ms`,
          model: modelUsed,
          wordCount: coverLetter.trim().split(/\s+/).length
        });
      }

      Logger.info('✅ Anschreiben erfolgreich generiert und eingefügt');

    } catch (error) {
      Logger.error('Application generation failed:', error);
      
      // Fehler-Log erstellen
      const generationTimeMs = Date.now() - startTime;
      const errorLog = GenerationLogHelper.createErrorLog(
        project,
        userProfile,
        apiConfig,
        error instanceof Error ? error : new Error(String(error)),
        generationTimeMs
      );
      
      // Speichere Fehler-Log
      LoggingService.saveLog(errorLog).catch(err => 
        Logger.error('Failed to save error log:', err)
      );
      
      throw error;
    }
  }

  /**
   * Holt API-Parameter basierend auf Provider
   */
  private getApiParams(provider: AIProvider): {
    temperature?: number;
    maxTokens?: number;
    presencePenalty?: number;
    frequencyPenalty?: number;
  } {
    if (provider === AIProvider.CHATGPT) {
      return {
        temperature: 0.8,
        maxTokens: 1500,
        presencePenalty: 0.3,
        frequencyPenalty: 0.3
      };
    } else {
      return {
        temperature: 0.8,
        maxTokens: 2000
      };
    }
  }

  /**
   * Validiert ob erwähnte Inhalte im Profil stehen (erfundene Inhalte erkennen)
   */
  private validateCoverLetterAgainstProfile(
    coverLetter: string,
    userProfile: UserProfile
  ): void {
    const textLower = coverLetter.toLowerCase();
    const experienceLower = userProfile.experience.toLowerCase();
    const skillsLower = userProfile.skills.map(s => s.toLowerCase());
    const profileText = (userProfile.experience + ' ' + userProfile.skills.join(' ')).toLowerCase();
    
    // Erkenne häufig erfundene Rollen/Tätigkeiten
    const suspiciousRoles = [
      'itsm-berater', 'itsm consultant', 'compliance manager', 
      'it support', 'projektmanager', 'architekt', 'berater',
      'consultant', 'manager', 'specialist'
    ];
    
    // Erkenne häufig erfundene Technologien
    const suspiciousTech = [
      'itsm', 'jira service management', 'servicenow', 'smax', 
      'opentext', 'iso 27001', 'idw ps 951', 'itil', 'cmdb'
    ];
    
    // Prüfe auf verdächtige Rollen
    suspiciousRoles.forEach(role => {
      if (textLower.includes(role) && !profileText.includes(role)) {
        Logger.warn(`⚠️ VALIDIERUNG: "${role}" wurde erwähnt, steht aber nicht im Profil!`);
      }
    });
    
    // Prüfe auf verdächtige Technologien
    suspiciousTech.forEach(tech => {
      if (textLower.includes(tech)) {
        const skillFound = skillsLower.some(skill => 
          skill.includes(tech) || tech.includes(skill)
        );
        const expFound = experienceLower.includes(tech);
        
        if (!skillFound && !expFound) {
          Logger.warn(`⚠️ VALIDIERUNG: "${tech}" wurde erwähnt, steht aber nicht im Profil!`);
        }
      }
    });
    
    // Prüfe auf erwähnte Firmen (außer bekannten aus dem Profil)
    const knownCompanies = ['intertek', 'celox', 'codinggiants'];
    const companyPattern = /\b(bei|für|als)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g;
    const matches = coverLetter.match(companyPattern);
    
    if (matches) {
      matches.forEach(match => {
        const company = match.replace(/^(bei|für|als)\s+/i, '').toLowerCase();
        const isKnown = knownCompanies.some(known => company.includes(known) || known.includes(company));
        const inProfile = profileText.includes(company);
        
        if (!isKnown && !inProfile && company.length > 3) {
          Logger.warn(`⚠️ VALIDIERUNG: Firma "${company}" wurde erwähnt, steht aber nicht im Profil!`);
        }
      });
    }
  }
}

