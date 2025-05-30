export interface ConversationResponse {
  success: boolean;
  response: string;
  actions?: string[];
}

export interface IConversationProcessingService {
  processUserMessage(message: string): Promise<ConversationResponse>;
  updatePageData(summary: string, htmlContent: string, actions: any[]): void;
  getConversation(): any[];
  clearConversation(): void;
  
  // Legacy method for backward compatibility
  addMessage(message: any, callback: (conversation: any[]) => void): Promise<void>;
}