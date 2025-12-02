import { Project } from './Project';
import { UserProfile } from './UserProfile';
import { ApiConfig } from './ApiConfig';

/**
 * Log-Eintrag für jede Anschreiben-Generierung
 */
export interface GenerationLog {
  // Metadaten
  timestamp: string;
  sessionId: string;
  
  // API-Konfiguration
  provider: string;
  model: string;
  
  // Projektdaten (Input)
  project: {
    id: string;
    title: string;
    description: string;
    company: string;
    location: string;
    remote: boolean;
    skills: string[];
    startDate: string;
    duration: string;
    workload: string;
  };
  
  // Benutzerprofil (Input)
  userProfile: {
    name: string;
    email: string;
    phone: string;
    skills: string[];
    experience: string;
    customIntro?: string;
  };
  
  // Skill-Matching
  matchingSkills: string[];
  otherSkills: string[];
  matchingPercentage: number;
  
  // Generierter Prompt
  prompt: {
    fullPrompt: string;
    promptLength: number;
    estimatedTokens: number;
  };
  
  // API-Anfrage
  apiRequest: {
    temperature?: number;
    maxTokens?: number;
    presencePenalty?: number;
    frequencyPenalty?: number;
  };
  
  // Generiertes Anschreiben (Output)
  coverLetter: {
    text: string;
    length: number;
    wordCount: number;
    hasGreeting: boolean;
    hasClosing: boolean;
    mentionedSkills: string[];
  };
  
  // Performance
  performance: {
    generationTimeMs: number;
    modelUsed: string;
    success: boolean;
    error?: string;
  };
}

/**
 * Helper-Klasse für Generierungs-Logs
 */
export class GenerationLogHelper {
  /**
   * Erstellt einen neuen Log-Eintrag
   */
  static createLog(
    project: Project,
    userProfile: UserProfile,
    apiConfig: ApiConfig,
    prompt: string,
    coverLetter: string,
    generationTimeMs: number,
    modelUsed: string,
    apiParams: {
      temperature?: number;
      maxTokens?: number;
      presencePenalty?: number;
      frequencyPenalty?: number;
    }
  ): GenerationLog {
    // Skill-Matching berechnen
    const projectSkillsLower = project.skills.map(s => s.toLowerCase());
    const matchingSkills = userProfile.skills.filter(skill => 
      projectSkillsLower.some(ps => ps.includes(skill.toLowerCase()) || skill.toLowerCase().includes(ps))
    );
    const otherSkills = userProfile.skills.filter(skill => !matchingSkills.includes(skill));
    const matchingPercentage = project.skills.length > 0 
      ? Math.round((matchingSkills.length / project.skills.length) * 100)
      : 0;
    
    // Anschreiben analysieren
    const wordCount = coverLetter.trim().split(/\s+/).length;
    const hasGreeting = /^(Guten Tag|Hallo|Sehr geehrte)/i.test(coverLetter);
    const hasClosing = /(Viele Grüße|Beste Grüße|Mit freundlichen Grüßen)/i.test(coverLetter);
    
    // Erwähnte Skills im Anschreiben finden
    const mentionedSkills = userProfile.skills.filter(skill => 
      coverLetter.toLowerCase().includes(skill.toLowerCase())
    );
    
    // Session-ID generieren (eindeutig pro Browser-Session)
    const sessionId = this.getOrCreateSessionId();
    
    return {
      timestamp: new Date().toISOString(),
      sessionId,
      
      provider: apiConfig.provider,
      model: modelUsed,
      
      project: {
        id: project.id,
        title: project.title,
        description: project.description,
        company: project.company,
        location: project.location,
        remote: project.remote,
        skills: project.skills,
        startDate: project.startDate,
        duration: project.duration,
        workload: project.workload
      },
      
      userProfile: {
        name: userProfile.name,
        email: userProfile.email,
        phone: userProfile.phone,
        skills: userProfile.skills,
        experience: userProfile.experience,
        customIntro: userProfile.customIntro
      },
      
      matchingSkills,
      otherSkills,
      matchingPercentage,
      
      prompt: {
        fullPrompt: prompt,
        promptLength: prompt.length,
        estimatedTokens: Math.ceil(prompt.length / 4) // Grobe Schätzung
      },
      
      apiRequest: apiParams,
      
      coverLetter: {
        text: coverLetter,
        length: coverLetter.length,
        wordCount,
        hasGreeting,
        hasClosing,
        mentionedSkills
      },
      
      performance: {
        generationTimeMs,
        modelUsed,
        success: true
      }
    };
  }
  
  /**
   * Erstellt einen Fehler-Log
   */
  static createErrorLog(
    project: Project | null,
    userProfile: UserProfile | null,
    apiConfig: ApiConfig | null,
    error: Error,
    generationTimeMs: number
  ): Partial<GenerationLog> {
    const sessionId = this.getOrCreateSessionId();
    
    return {
      timestamp: new Date().toISOString(),
      sessionId,
      provider: apiConfig?.provider || 'unknown',
      model: apiConfig?.model || 'unknown',
      project: project ? {
        id: project.id,
        title: project.title,
        description: project.description,
        company: project.company,
        location: project.location,
        remote: project.remote,
        skills: project.skills,
        startDate: project.startDate,
        duration: project.duration,
        workload: project.workload
      } : undefined,
      userProfile: userProfile ? {
        name: userProfile.name,
        email: userProfile.email,
        phone: userProfile.phone,
        skills: userProfile.skills,
        experience: userProfile.experience,
        customIntro: userProfile.customIntro
      } : undefined,
      performance: {
        generationTimeMs,
        modelUsed: apiConfig?.model || 'unknown',
        success: false,
        error: error.message
      }
    };
  }
  
  /**
   * Holt oder erstellt eine Session-ID
   */
  private static getOrCreateSessionId(): string {
    const key = 'applyai_session_id';
    let sessionId = sessionStorage.getItem(key);
    
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem(key, sessionId);
    }
    
    return sessionId;
  }
}

