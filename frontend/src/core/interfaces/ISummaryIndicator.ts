export interface ISummaryIndicator {
  show(message: string): HTMLElement;
  hide(): void;
  update(message: string): void;
}