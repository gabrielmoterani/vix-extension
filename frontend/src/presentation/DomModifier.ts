import type { IDomModifier } from '~src/core/interfaces/IDomModifier';

export class DomModifier implements IDomModifier {
  private modificationQueue: Map<string, Map<string, string>>;

  constructor() {
    this.modificationQueue = new Map();
  }

  modifyElement(id: string, attributeName: string, attributeValue: string): boolean {
    let element = document.getElementById(id);
    if (!element) {
      element = document.querySelector(`[data-vix="${id}"]`);
    }
    if (!element) {
      console.warn(`Element with id ${id} not found`);
      return false;
    }

    try {
      element.setAttribute(attributeName, attributeValue);
      
      // If we're setting an alt attribute, also create a visible text element
      if (attributeName === 'alt' && element.tagName.toLowerCase() === 'img') {
        this._createVisibleAltText(element as HTMLImageElement, attributeValue);
      }
      
      return true;
    } catch (error) {
      console.error(`Error modifying element ${id}:`, error);
      return false;
    }
  }

  queueModification(id: string, attributeName: string, attributeValue: string): void {
    if (!this.modificationQueue.has(id)) {
      this.modificationQueue.set(id, new Map());
    }
    this.modificationQueue.get(id)!.set(attributeName, attributeValue);
  }

  applyQueuedModifications(): void {
    for (const [id, attributes] of this.modificationQueue) {
      for (const [attributeName, attributeValue] of attributes) {
        this.modifyElement(id, attributeName, attributeValue);
      }
    }
    this.modificationQueue.clear();
  }

  clearQueue(): void {
    this.modificationQueue.clear();
  }

  getQueueSize(): number {
    return this.modificationQueue.size;
  }

  private _createVisibleAltText(imageElement: HTMLImageElement, altText: string): void {
    // Create a container if it doesn't exist
    let container = imageElement.parentElement;
    if (!container?.classList.contains('vix-image-container')) {
      const newContainer = document.createElement('div');
      newContainer.className = 'vix-image-container';
      newContainer.style.cssText = `
        position: relative;
        display: inline-block;
      `;
      imageElement.parentNode?.insertBefore(newContainer, imageElement);
      newContainer.appendChild(imageElement);
      container = newContainer;
    }

    // Create or update the alt text element
    let altTextElement = container.querySelector('.vix-alt-text') as HTMLElement;
    if (!altTextElement) {
      altTextElement = document.createElement('div');
      altTextElement.className = 'vix-alt-text';
      altTextElement.style.cssText = `
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        background: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 4px 8px;
        font-size: 12px;
        text-align: center;
        border-radius: 0 0 4px 4px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `;
      container.appendChild(altTextElement);
    }

    altTextElement.textContent = altText;
  }

  // TODO: Melhorias futuras comentadas:
  
  // MELHORIA 1: Batch operations para múltiplas modificações simultâneas
  // batchModify(modifications: ModificationRequest[]): Promise<boolean[]>
  
  // MELHORIA 2: Undo/Redo functionality
  // private modificationHistory: ModificationRequest[] = [];
  // undo(): boolean; redo(): boolean;
  
  // MELHORIA 3: Observer pattern para notificar mudanças
  // private observers: ((change: ModificationRequest) => void)[] = [];
  
  // MELHORIA 4: Validação de modificações antes de aplicar
  // validateModification(id: string, attributeName: string, attributeValue: string): boolean
  
  // MELHORIA 5: Métricas de performance das modificações
  // private metrics = { successfulMods: 0, failedMods: 0, avgTime: 0 };
}