export interface ChatData {
  summary?: string;
  actions?: Record<string, any>;
  htmlContent?: string | any;
}

export interface IChatInterface {
  initialize(data: ChatData): void;
  show(): HTMLElement;
  hide(): void;
}