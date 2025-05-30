export interface ILoadingIndicator {
  show(): HTMLElement;
  updateStatus(element: HTMLElement | null, message: string): void;
  showError(element: HTMLElement | null, error: Error): void;
  fadeOut(element: HTMLElement | null): void;
}