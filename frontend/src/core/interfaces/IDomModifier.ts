export interface ModificationRequest {
  id: string;
  attributeName: string;
  attributeValue: string;
}

export interface IDomModifier {
  modifyElement(id: string, attributeName: string, attributeValue: string): boolean;
  queueModification(id: string, attributeName: string, attributeValue: string): void;
  applyQueuedModifications(): void;
  clearQueue(): void;
  getQueueSize(): number;
}