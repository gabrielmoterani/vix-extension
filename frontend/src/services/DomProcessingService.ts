import type { ActionElement, IDomProcessingService, ProcessedElement } from '~src/core/interfaces/IDomProcessingService';


export class DomProcessingService implements IDomProcessingService {
  private origin: string;

  constructor() {
    this.origin = window.location.origin;
  }

  processDom(node: Node): ProcessedElement | null {
    // Skip if node is null or is a comment node
    if (!node || node.nodeType === Node.COMMENT_NODE) {
      return null;
    }

    const isActionElement = this._isActionElement(node);

    // Handle text nodes
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim() || '';
      if (text) {
        return { 
          type: 'text', 
          text: text, 
          isActionElement: isActionElement,
          attributes: {},
          children: []
        };
      }
      return null;
    }

    // Skip certain elements
    if (this.isSkippableElement(node)) {
      return null;
    }

    const element = node as Element;

    // Create element object
    const processedElement: ProcessedElement = {
      tag: element.tagName ? element.tagName.toLowerCase() : undefined,
      attributes: this.processAttributes(element),
      children: [],
      text: element.textContent ? element.textContent.trim() : '',
      isActionElement: isActionElement
    };

    // Add GTKN identifier
    const uniqueId = `vix-${Math.random().toString(36).substr(2, 9)}`;
    processedElement.attributes['data-vix'] = uniqueId;
    element.setAttribute('data-vix', uniqueId);

    if (!element.attributes.getNamedItem('id')) {
      processedElement.attributes.id = uniqueId;
    }

    // Process background images for divs
    if (element.tagName?.toLowerCase() === 'div') {
      const computedStyle = window.getComputedStyle(element);
      if (computedStyle.backgroundImage !== 'none') {
        this.processBackgroundImage(processedElement, element, computedStyle);
      }
    }

    // Process children
    if (element.childNodes) {
      for (const child of element.childNodes) {
        const processedChild = this.processDom(child);
        if (processedChild) {
          processedElement.children.push(processedChild);
        }
      }
    }

    return processedElement;
  }

  isSkippableElement(node: Node): boolean {
    const skippableTags = ['script', 'style', 'svg', 'iframe'];
    const element = node as Element;
    const tag = element.tagName?.toLowerCase();
    
    return tag && (
      skippableTags.includes(tag) || 
      (tag === 'link' && element.getAttribute('rel') === 'stylesheet')
    );
  }

  processAttributes(node: Element): Record<string, any> {
    const attributes: Record<string, any> = {};

    if (!node.attributes) {
      return attributes;
    }

    for (const attr of Array.from(node.attributes)) {
      // Skip alt attributes as they will be processed separately
      if (attr.name === 'alt') {
        continue;
      }

      // Handle src attributes
      if (attr.name === 'src') {
        attributes[attr.name] = this.processUrl(attr.value);
      } else if (
        attr.name.includes('src') &&
        !attr.value.includes('svg') &&
        !attr.value.includes('gif')
      ) {
        attributes.src = this.processUrl(attr.value);
      } else {
        attributes[attr.name] = attr.value;
      }
    }

    return attributes;
  }

  processUrl(url: string): string {
    if (this.isLocalUrl(url)) {
      return this.origin + url;
    }
    return url;
  }

  isLocalUrl(url: string): boolean {
    return url.startsWith('/') || url.startsWith('./') || url.startsWith('../');
  }

  processBackgroundImage(element: ProcessedElement, node: Element, computedStyle: CSSStyleDeclaration): void {
    const backgroundImage = computedStyle.backgroundImage;
    let url = backgroundImage.slice(5, -2) || '';

    // Handle Nitro lazy loading
    const nitroLazyBg = node.getAttribute('nitro-lazy-bg');
    if (nitroLazyBg) {
      url = nitroLazyBg;
    }

    if (this.isValidImageUrl(url)) {
      element.tag = 'img';
      element.attributes.src = this.processUrl(url);
    }
  }

  isValidImageUrl(url: string): boolean {
    return (
      (url.includes('image') ||
        url.includes('http') ||
        url.includes('jpg') ||
        url.includes('png')) &&
      !url.includes('gif')
    );
  }

  retrieveImages(node: ProcessedElement): ProcessedElement[] {
    const images: ProcessedElement[] = [];

    // If node is an object with a tag property (from processDom output)
    if (node && typeof node === 'object') {
      // Check if this is an image element
      if (node.tag === 'img') {
        images.push(node);
      }

      // Recursively process children if they exist
      if (Array.isArray(node.children)) {
        for (const child of node.children) {
          const childImages = this.retrieveImages(child);
          images.push(...childImages);
        }
      }
    }

    return images;
  }

  retrieveActionElements(node: ProcessedElement): ActionElement[] {
    const actionElements: ActionElement[] = [];

    const _retrieveActionElements = (node: ProcessedElement): ActionElement => {
      const aux = {
        tag: node.tag,
        text: node.text,
        id: node.attributes["data-vix"],
        href: node.attributes.href || undefined,
        type: node.attributes.type || undefined,
        value: node.attributes.value || undefined,
        placeholder: node.attributes.placeholder || undefined,
        ariaLabel: node.attributes["aria-label"] || undefined,
        ariaLabelledby: node.attributes["aria-labelledby"] || undefined,
      };

      return Object.keys(aux).reduce((acc: ActionElement, key) => {
        const value = (aux as any)[key];
        if (value) {
          (acc as any)[key] = value;
        }
        return acc;
      }, {});
    };

    if (!node) {
      return actionElements;
    }

    if (node.isActionElement) {
      actionElements.push(_retrieveActionElements(node));
    }
    // Recursively process children if they exist
    else if (Array.isArray(node.children)) {
      for (const child of node.children) {
        const childActionElements = this.retrieveActionElements(child);
        actionElements.push(...childActionElements);
      }
    }

    return actionElements;
  }

  retrieveTexts(node: ProcessedElement): string[] {
    const texts: string[] = [];

    // If node is null, return empty array
    if (!node) {
      return [];
    }

    // Handle text nodes
    if (node.type === 'text') {
      return [node.text];
    }

    // If this is an element node with text content
    if (node.text && node.text.trim()) {
      texts.push(node.text);
    }

    // Recursively process children if they exist
    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        const childTexts = this.retrieveTexts(child);
        texts.push(...childTexts);
      }
    }

    return texts;
  }

  processHTML(node: Element): string {
    return node.outerHTML || node.innerHTML || '';
  }

  private _isActionElement(node: Node): boolean {
    const actionTags = [
      'button',
      'a',
      'input',
      'select',
      'textarea',
      'label',
      'form',
      'option',
      'radio',
      'checkbox',
      'submit',
      'reset'
    ];

    const element = node as Element;
    const tag = element.tagName?.toLowerCase();
    if (!tag) return false;

    // Check if it's a basic action element
    if (actionTags.includes(tag)) return true;

    // Check for input types
    if (tag === 'input') {
      const type = element.getAttribute('type')?.toLowerCase();
      return type ? actionTags.includes(type) : false;
    }

    // Check for role attributes
    const role = element.getAttribute('role')?.toLowerCase();
    if (role && ['button', 'link', 'checkbox', 'radio', 'textbox', 'combobox'].includes(role)) {
      return true;
    }

    // Check for click handlers
    const elementWithEvents = element as any;
    if (elementWithEvents.onclick || element.getAttribute('onclick')) return true;

    // Check for common interactive classes/attributes
    const interactiveClasses = ['btn', 'button', 'clickable', 'interactive'];
    const classList = element.className?.toString().toLowerCase() || '';
    if (interactiveClasses.some(cls => classList.includes(cls))) return true;

    return false;
  }

  countElements(node: ProcessedElement): number {
    let count = 0;

    const _counter = (node: ProcessedElement): void => {
      count++;
      if (Array.isArray(node.children)) {
        for (const child of node.children) {
          _counter(child);
        }
      }
    };

    _counter(node);
    return count;
  }

  // TODO: Melhorias futuras comentadas:
  
  // MELHORIA 1: Adicionar cache para evitar reprocessamento de elementos similares
  // private elementCache = new Map<string, ProcessedElement>();
  
  // MELHORIA 2: Usar Web Workers para processamento pesado em páginas grandes
  // async processLargeDocument(node: Node): Promise<ProcessedElement | null>
  
  // MELHORIA 3: Implementar observadores de mutação para atualizações dinâmicas
  // setupMutationObserver(callback: (changes: ProcessedElement[]) => void): void
  
  // MELHORIA 4: Adicionar métricas de performance e logging estruturado
  // private performanceMetrics = { processingTime: 0, elementsProcessed: 0 };
  
  // MELHORIA 5: Validação de acessibilidade integrada durante o processamento
  // validateAccessibility(element: ProcessedElement): AccessibilityIssue[]
}