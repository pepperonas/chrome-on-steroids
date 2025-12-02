import { ApplicationController } from './ApplicationController';

/**
 * Controller für das Overlay-Fenster
 */
export class OverlayController {
  private overlay: HTMLElement | null = null;
  private isDragging = false;
  private currentX = 0;
  private currentY = 0;
  private initialX = 0;
  private initialY = 0;
  private xOffset = 0;
  private yOffset = 0;

  /**
   * Erstellt und zeigt das Overlay an
   */
  createOverlay(): void {
    if (this.overlay) return;

    this.overlay = document.createElement('div');
    this.overlay.id = 'chrome-on-steroids-overlay';
    this.overlay.innerHTML = this.getOverlayHTML();

    document.body.appendChild(this.overlay);
    this.attachEventListeners();
  }

  private getOverlayHTML(): string {
    return `
      <div class="overlay-container">
        <div class="overlay-header">
          <div class="overlay-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="margin-right: 8px;">
              <path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <h3>Chrome On Steroids</h3>
          </div>
          <div class="overlay-controls">
            <button class="overlay-btn minimize" title="Minimieren">−</button>
            <button class="overlay-btn maximize" title="Maximieren">□</button>
            <button class="overlay-btn close" title="Schließen">×</button>
          </div>
        </div>
        <div class="overlay-body">
          <div class="status-indicator">
            <span class="status-dot"></span>
            <span class="status-text">Bereit</span>
          </div>
          <button class="generate-btn" id="generate-application-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="margin-right: 8px;">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Anschreiben generieren
          </button>
          <div class="progress-container hidden">
            <div class="progress-bar"></div>
            <span class="progress-text">Generiere Anschreiben...</span>
          </div>
          <div class="error-message hidden"></div>
        </div>
      </div>
    `;
  }

  private attachEventListeners(): void {
    if (!this.overlay) return;

    const header = this.overlay.querySelector('.overlay-header') as HTMLElement;
    const minimizeBtn = this.overlay.querySelector('.minimize') as HTMLButtonElement;
    const maximizeBtn = this.overlay.querySelector('.maximize') as HTMLButtonElement;
    const closeBtn = this.overlay.querySelector('.close') as HTMLButtonElement;
    const generateBtn = this.overlay.querySelector('#generate-application-btn') as HTMLButtonElement;

    // Dragging
    header.addEventListener('mousedown', this.dragStart.bind(this));
    document.addEventListener('mousemove', this.drag.bind(this));
    document.addEventListener('mouseup', this.dragEnd.bind(this));

    // Controls
    minimizeBtn.addEventListener('click', () => this.minimize());
    maximizeBtn.addEventListener('click', () => this.maximize());
    closeBtn.addEventListener('click', () => this.close());

    // Generate button
    generateBtn.addEventListener('click', async () => {
      await this.handleGenerate();
    });
  }

  private dragStart(e: MouseEvent): void {
    this.initialX = e.clientX - this.xOffset;
    this.initialY = e.clientY - this.yOffset;

    if ((e.target as HTMLElement).closest('.overlay-header')) {
      this.isDragging = true;
    }
  }

  private drag(e: MouseEvent): void {
    if (!this.isDragging || !this.overlay) return;

    e.preventDefault();

    this.currentX = e.clientX - this.initialX;
    this.currentY = e.clientY - this.initialY;

    this.xOffset = this.currentX;
    this.yOffset = this.currentY;

    this.setTranslate(this.currentX, this.currentY);
  }

  private dragEnd(): void {
    this.isDragging = false;
  }

  private setTranslate(xPos: number, yPos: number): void {
    if (!this.overlay) return;
    this.overlay.style.transform = `translate(${xPos}px, ${yPos}px)`;
  }

  private minimize(): void {
    if (!this.overlay) return;
    this.overlay.classList.add('minimized');
  }

  private maximize(): void {
    if (!this.overlay) return;
    this.overlay.classList.toggle('maximized');
  }

  close(): void {
    if (!this.overlay) return;
    this.overlay.remove();
    this.overlay = null;
  }

  private async handleGenerate(): Promise<void> {
    try {
      this.showProgress();
      this.hideError();

      const controller = new ApplicationController();
      await controller.generateAndInsertApplication();

      this.showSuccess('Anschreiben erfolgreich generiert!');

      // Auto-close nach 2 Sekunden
      setTimeout(() => this.close(), 2000);

    } catch (error) {
      this.showError((error as Error).message);
    } finally {
      this.hideProgress();
    }
  }

  private showProgress(): void {
    const progress = this.overlay?.querySelector('.progress-container');
    if (progress) progress.classList.remove('hidden');
  }

  private hideProgress(): void {
    const progress = this.overlay?.querySelector('.progress-container');
    if (progress) progress.classList.add('hidden');
  }

  private showSuccess(message: string): void {
    this.updateStatus('success', message);
  }

  private showError(message: string): void {
    this.updateStatus('error', 'Fehler');
    const errorDiv = this.overlay?.querySelector('.error-message');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.classList.remove('hidden');
    }
  }

  private hideError(): void {
    const errorDiv = this.overlay?.querySelector('.error-message');
    if (errorDiv) {
      errorDiv.classList.add('hidden');
    }
  }

  private updateStatus(status: 'ready' | 'success' | 'error', text: string): void {
    const statusDot = this.overlay?.querySelector('.status-dot');
    const statusText = this.overlay?.querySelector('.status-text');

    if (statusDot) {
      statusDot.className = `status-dot ${status}`;
    }
    if (statusText) {
      statusText.textContent = text;
    }
  }
}

