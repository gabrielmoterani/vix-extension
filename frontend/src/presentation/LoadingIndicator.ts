import type { ILoadingIndicator } from '~src/core/interfaces/ILoadingIndicator';

export class LoadingIndicator implements ILoadingIndicator  {
  private readonly LOADING_MESSAGE = 'Loading VIX';
  private readonly LOADED_MESSAGE = 'Added alternative content';
  private readonly LABELED_MESSAGE = 'VIX MESSAGE: ';

  show(): HTMLElement {
    // Prevent duplicate indicators
    const existing = document.getElementById('alt-content-loading');
    if (existing) {
      return existing;
    }

    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'alt-content-loading';
    loadingDiv.textContent = this.LABELED_MESSAGE + this.LOADING_MESSAGE;

    // Add CSS styles to make it float on top and look better
    loadingDiv.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      width: 100%;
      background-color: #2196F3;
      color: white;
      padding: 10px 20px;
      z-index: 999998;
      text-align: center;
      font-family: Arial, sans-serif;
      font-size: 14px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      cursor: pointer;
      box-sizing: border-box;
    `;

    // Add click handler to dismiss
    loadingDiv.addEventListener('click', () => {
      loadingDiv.remove();
    });

    // Add ARIA attributes for accessibility
    loadingDiv.setAttribute('role', 'status');
    loadingDiv.setAttribute('aria-live', 'polite');
    loadingDiv.setAttribute('aria-label', 'Loading indicator');

    document.body.insertBefore(loadingDiv, document.body.firstChild);
    return loadingDiv;
  }

  updateStatus(element: HTMLElement | null, message: string): void {
    if (!element) {
      console.warn('LoadingIndicator: Cannot update status - element is null');
      return;
    }
    element.textContent = this.LABELED_MESSAGE + message;
    
    // Update aria-label for screen readers
    element.setAttribute('aria-label', `Loading status: ${message}`);
  }

  showError(element: HTMLElement | null, error: Error): void {
    if (!element) {
      console.warn('LoadingIndicator: Cannot show error - element is null');
      return;
    }
    
    const errorMessage = `Error loading alt content: ${error?.message || 'Unknown error'}`;
    element.textContent = errorMessage;
    element.style.backgroundColor = '#f44336'; // Red background for errors
    
    // Update ARIA for accessibility
    element.setAttribute('role', 'alert');
    element.setAttribute('aria-label', `Error: ${errorMessage}`);
    
    console.error('LoadingIndicator Error:', error);
  }

  fadeOut(element: HTMLElement | null): void {
    if (!element) {
      console.warn('LoadingIndicator: Cannot fade out - element is null');
      return;
    }

    element.style.transition = 'opacity 1s';
    
    // Start fade after 9 seconds
    setTimeout(() => {
      element.style.opacity = '0';
      
      // Remove after fade completes (1 second transition)
      setTimeout(() => {
        if (element.parentNode) {
          element.remove();
        }
      }, 1000);
    }, 9000);
  }

  // TODO: Melhorias futuras comentadas:
  
  // MELHORIA 1: Queue de mensagens para múltiplos indicadores
  // private messageQueue: Array<{message: string, type: 'info' | 'error' | 'success'}> = [];
  
  // MELHORIA 2: Animações mais suaves e configuráveis
  // showWithAnimation(message: string, animation: 'slide' | 'fade' = 'slide'): HTMLElement
  
  // MELHORIA 3: Posicionamento configurável
  // show(message?: string, position: 'top' | 'bottom' | 'center' = 'bottom'): HTMLElement
  
  // MELHORIA 4: Progress bar para operações longas
  // showProgress(message: string, progress: number): HTMLElement
}