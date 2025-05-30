import { inject, injectable } from 'tsyringe';
import { IProcessPageUseCase } from '../../core/interfaces/IProcessPageUseCase';
import { TOKENS } from '../../core/container/tokens';
import type { IBrowserEventHandler } from '~src/core/interfaces/IBrowserEventHandler';

@injectable()
export class BrowserEventHandler implements IBrowserEventHandler {
  private listeners: Array<{ element: EventTarget; event: string; handler: EventListener }> = [];

  constructor(
    @inject(TOKENS.ProcessPageUseCase) private processPageUseCase: IProcessPageUseCase
  ) {}

  setupEventListeners(): void {
    const loadHandler = () => this.handleLoad();
    const domContentLoadedHandler = () => {
      if (!(window as any).loadHandlerCalled) {
        this.handleLoad();
      }
    };

    // Store listeners for cleanup
    this.listeners.push(
      { element: window, event: 'load', handler: loadHandler },
      { element: document, event: 'DOMContentLoaded', handler: domContentLoadedHandler }
    );

    // Add event listeners
    window.addEventListener('load', loadHandler);
    document.addEventListener('DOMContentLoaded', domContentLoadedHandler);

    // Handle already loaded state
    if (document.readyState === 'complete') {
      this.handleLoad();
    }
  }

  async handleLoad(): Promise<void> {
    if ((window as any).loadHandlerCalled) return;
    (window as any).loadHandlerCalled = true;
    
    try {
      await this.processPageUseCase.execute(document);
    } catch (error) {
      console.error('Error processing page:', error);
      // TODO: Implementar retry mechanism ou fallback
    }
  }

  cleanup(): void {
    // Remove all event listeners
    this.listeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.listeners = [];
    
    // Reset load flag
    delete (window as any).loadHandlerCalled;
  }

  // TODO: Melhorias futuras comentadas:
  
  // MELHORIA 1: Throttling/Debouncing para eventos frequentes
  // private throttledHandlers = new Map<string, Function>();
  
  // MELHORIA 2: Observador de mudanças dinâmicas (SPA navigation)
  // setupSPANavigation(): void
  
  // MELHORIA 3: Health check e recovery automático
  // private healthCheck(): boolean; private recover(): void;
  
  // MELHORIA 4: Métricas de eventos e performance
  // private eventMetrics = { loadTime: 0, errorCount: 0, successCount: 0 };
}