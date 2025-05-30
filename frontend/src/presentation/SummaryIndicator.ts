import type { ISummaryIndicator } from '~src/core/interfaces';

export class SummaryIndicator implements ISummaryIndicator {
  private readonly LOADED_MESSAGE = 'VIX SUMMARY: ';

  show(message: string): HTMLElement {
    // Prevent duplicate summaries
    const existing = document.getElementById('vix-summary-indicator');
    if (existing) {
      this.update(message);
      return existing;
    }

    const summaryDiv = document.createElement('div');
    summaryDiv.id = 'vix-summary-indicator';
    summaryDiv.textContent = this.LOADED_MESSAGE + message;

    // Add CSS styles to make it stay at top and push content down
    summaryDiv.style.cssText = `
      position: relative;
      width: 100%;
      background-color: #4CAF50;
      color: white;
      padding: 10px 20px;
      text-align: center;
      font-family: Arial, sans-serif;
      font-size: 14px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      cursor: pointer;
      box-sizing: border-box;
      word-wrap: break-word;
      line-height: 1.4;
    `;

    // Add click handler to dismiss
    summaryDiv.addEventListener('click', () => {
      summaryDiv.remove();
    });

    // Add ARIA attributes for accessibility
    summaryDiv.setAttribute('role', 'region');
    summaryDiv.setAttribute('aria-label', 'Page summary');
    summaryDiv.setAttribute('aria-live', 'polite');

    // Add keyboard support for dismissal
    summaryDiv.setAttribute('tabindex', '0');
    summaryDiv.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'Escape') {
        event.preventDefault();
        summaryDiv.remove();
      }
    });

    // Check if ChatInterface exists and append to it if it does
    const chatInterface = document.getElementById('vix-chat-interface');
    if (chatInterface) {
      chatInterface.appendChild(summaryDiv);
    } else {
      // If ChatInterface doesn't exist, append to document body as before
      document.body.insertBefore(summaryDiv, document.body.firstChild);
    }

    return summaryDiv;
  }

  hide(): void {
    const summaryDiv = document.getElementById('vix-summary-indicator');
    if (summaryDiv) {
      summaryDiv.remove();
    }
  }

  update(message: string): void {
    const summaryDiv = document.getElementById('vix-summary-indicator');
    if (summaryDiv) {
      summaryDiv.textContent = this.LOADED_MESSAGE + message;
      
      // Update aria-label for screen readers
      summaryDiv.setAttribute('aria-label', `Page summary: ${message}`);
    } else {
      // If element doesn't exist, create it
      this.show(message);
    }
  }

  // TODO: Melhorias futuras comentadas:
  
  // MELHORIA 1: Suporte a HTML rico no summary
  // showRich(htmlContent: string): HTMLElement
  
  // MELHORIA 2: Expansão/colapso para summaries longos
  // private createExpandableContent(message: string): HTMLElement
  
  // MELHORIA 3: Diferentes tipos de summary (warning, info, success)
  // show(message: string, type: 'info' | 'warning' | 'success' = 'info'): HTMLElement
  
  // MELHORIA 4: Posicionamento relativo ao ChatInterface
  // private getOptimalPosition(): 'top' | 'bottom' | 'inline'
}