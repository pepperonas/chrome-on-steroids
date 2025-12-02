import { GenerationLog } from '../models/GenerationLog';
import { Logger } from '../utils/logger';

/**
 * Service für das Speichern von Generierungs-Logs
 */
export class LoggingService {
  private static readonly STORAGE_KEY = 'generation_logs';
  private static readonly MAX_LOGS = 100; // Maximal 100 Logs speichern
  
  /**
   * Prüft ob Extension Context noch gültig ist
   */
  private static isContextValid(): boolean {
    try {
      return !!chrome?.runtime?.id;
    } catch {
      return false;
    }
  }

  /**
   * Speichert einen Log-Eintrag
   */
  static async saveLog(log: GenerationLog | Partial<GenerationLog>): Promise<void> {
    // Prüfe Context vor dem Speichern
    if (!this.isContextValid()) {
      Logger.warn('Extension context invalidated - skipping log save');
      return; // Fail silently, da Logging nicht kritisch ist
    }

    try {
      // Lade existierende Logs
      const existingLogs = await this.loadLogs();
      
      // Füge neuen Log hinzu
      existingLogs.unshift(log); // Am Anfang einfügen (neueste zuerst)
      
      // Begrenze auf MAX_LOGS
      const limitedLogs = existingLogs.slice(0, this.MAX_LOGS);
      
      // Speichere in Chrome Storage (local, nicht sync - kann größer sein)
      await chrome.storage.local.set({ [this.STORAGE_KEY]: limitedLogs });
      
      Logger.info('Generation log saved', {
        totalLogs: limitedLogs.length,
        timestamp: log.timestamp
      });
      
    } catch (error) {
      // Prüfe ob es ein Context-Error ist
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Extension context invalidated') || errorMessage.includes('invalidated')) {
        Logger.warn('Extension context invalidated during log save - skipping');
        return; // Fail silently
      }
      Logger.error('Error saving generation log:', error);
    }
  }
  
  /**
   * Lädt alle gespeicherten Logs
   */
  static async loadLogs(): Promise<Array<GenerationLog | Partial<GenerationLog>>> {
    // Prüfe Context vor dem Laden
    if (!this.isContextValid()) {
      Logger.warn('Extension context invalidated - returning empty logs');
      return [];
    }

    try {
      const result = await chrome.storage.local.get([this.STORAGE_KEY]);
      return result[this.STORAGE_KEY] || [];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Extension context invalidated') || errorMessage.includes('invalidated')) {
        Logger.warn('Extension context invalidated during log load - returning empty');
        return [];
      }
      Logger.error('Error loading generation logs:', error);
      return [];
    }
  }
  
  /**
   * Exportiert alle Logs als JSON-Datei
   */
  static async exportLogs(): Promise<void> {
    try {
      const logs = await this.loadLogs();
      
      if (logs.length === 0) {
        Logger.warn('No logs to export');
        return;
      }
      
      // Erstelle Export-Objekt
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        totalLogs: logs.length,
        logs: logs
      };
      
      // Konvertiere zu JSON
      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      
      // Erstelle Download-Link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chromeonsteroids-logs-${new Date().toISOString().split('T')[0]}.json`;
      
      // Trigger Download
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      Logger.info('Logs exported successfully', { count: logs.length });
      
    } catch (error) {
      Logger.error('Error exporting logs:', error);
      throw error;
    }
  }
  
  /**
   * Löscht alle Logs
   */
  static async clearLogs(): Promise<void> {
    try {
      await chrome.storage.local.remove(this.STORAGE_KEY);
      Logger.info('All logs cleared');
    } catch (error) {
      Logger.error('Error clearing logs:', error);
      throw error;
    }
  }
  
  /**
   * Holt Statistiken über die Logs
   */
  static async getStats(): Promise<{
    totalLogs: number;
    successfulGenerations: number;
    failedGenerations: number;
    averageGenerationTime: number;
    mostUsedProvider: string;
    mostUsedModel: string;
  }> {
    try {
      const logs = await this.loadLogs();
      
      const successful = logs.filter(log => log.performance?.success).length;
      const failed = logs.filter(log => log.performance?.success === false).length;
      
      const generationTimes = logs
        .filter(log => log.performance?.generationTimeMs)
        .map(log => log.performance!.generationTimeMs);
      
      const avgTime = generationTimes.length > 0
        ? Math.round(generationTimes.reduce((a, b) => a + b, 0) / generationTimes.length)
        : 0;
      
      // Provider-Häufigkeit
      const providerCounts: Record<string, number> = {};
      logs.forEach(log => {
        if (log.provider) {
          providerCounts[log.provider] = (providerCounts[log.provider] || 0) + 1;
        }
      });
      const mostUsedProvider = Object.keys(providerCounts).sort((a, b) => 
        providerCounts[b] - providerCounts[a]
      )[0] || 'unknown';
      
      // Modell-Häufigkeit
      const modelCounts: Record<string, number> = {};
      logs.forEach(log => {
        if (log.model) {
          modelCounts[log.model] = (modelCounts[log.model] || 0) + 1;
        }
      });
      const mostUsedModel = Object.keys(modelCounts).sort((a, b) => 
        modelCounts[b] - modelCounts[a]
      )[0] || 'unknown';
      
      return {
        totalLogs: logs.length,
        successfulGenerations: successful,
        failedGenerations: failed,
        averageGenerationTime: avgTime,
        mostUsedProvider,
        mostUsedModel
      };
      
    } catch (error) {
      Logger.error('Error getting log stats:', error);
      return {
        totalLogs: 0,
        successfulGenerations: 0,
        failedGenerations: 0,
        averageGenerationTime: 0,
        mostUsedProvider: 'unknown',
        mostUsedModel: 'unknown'
      };
    }
  }
}

