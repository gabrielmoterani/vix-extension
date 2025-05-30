// Types para manter compatibilidade com o código existente
export interface ProcessedElement {
  tag?: string;
  attributes: Record<string, any>;
  children: ProcessedElement[];
  text: string;
  isActionElement: boolean;
  type?: string; // para text nodes
}

export interface ActionElement {
  tag?: string;
  text?: string;
  id?: string;
  href?: string;
  type?: string;
  value?: string;
  placeholder?: string;
  ariaLabel?: string;
  ariaLabelledby?: string;
}

export interface IDomProcessingService {
  processDom(node: Node): ProcessedElement | null;
  isSkippableElement(node: Node): boolean;
  processAttributes(node: Element): Record<string, any>;
  processUrl(url: string): string;
  isLocalUrl(url: string): boolean;
  processBackgroundImage(element: ProcessedElement, node: Element, computedStyle: CSSStyleDeclaration): void;
  isValidImageUrl(url: string): boolean;
  retrieveImages(node: ProcessedElement): ProcessedElement[];
  retrieveActionElements(node: ProcessedElement): ActionElement[];
  retrieveTexts(node: ProcessedElement): string[];
  processHTML(node: Element): string;
  countElements(node: ProcessedElement): number;
}