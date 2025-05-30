export interface IBrowserEventHandler {
  setupEventListeners(): void;
  handleLoad(): Promise<void>;
  cleanup(): void;
}