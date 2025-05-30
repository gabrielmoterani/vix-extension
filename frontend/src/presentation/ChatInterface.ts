import { inject, injectable } from 'tsyringe';
import { TOKENS } from '../core/container/tokens';
import type { ChatData, IChatInterface, IConversationProcessingService } from '~src/core/interfaces';

interface ChatMessage {
  role?: string;
  direction: 'in' | 'out';
  content: string;
}

@injectable()
export class ChatInterface implements IChatInterface {
  private chatContainer: HTMLElement | null = null;
  private inputField: HTMLInputElement | null = null;
  private sendButton: HTMLButtonElement | null = null;
  private statusMessage: HTMLElement | null = null;
  private loadingIndicator: HTMLElement | null = null;
  private messageHistoryContainer: HTMLElement | null = null;
  private isLoading: boolean = false;

  constructor(
    @inject(TOKENS.ConversationProcessingService) 
    private conversationProcessingService: IConversationProcessingService
  ) {}

  initialize(data: ChatData): void {
    // Store chat data for conversation context
    console.log('ChatInterface initialized with data:', data);
    
    // The conversation service should be updated with this data
    // This matches the original updatePageData call
    if (data.summary && data.actions && data.htmlContent) {
      this.conversationProcessingService.updatePageData(
        data.summary,
        typeof data.htmlContent === 'string' ? data.htmlContent : JSON.stringify(data.htmlContent),
        data.actions as any[]
      );
    }
  }

  show(): HTMLElement {
    // Prevent duplicate chat interfaces
    const existing = document.getElementById('vix-chat-interface');
    if (existing) {
      return existing;
    }

    // Create main container
    const chatDiv = document.createElement('div');
    chatDiv.id = 'vix-chat-interface';
    chatDiv.setAttribute('role', 'region');
    chatDiv.setAttribute('aria-label', 'AI Assistant Chat Interface');

    // Style the container
    chatDiv.style.cssText = `
      position: relative;
      width: 100%;
      background-color: #ffffff;
      padding: 15px 20px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      display: flex;
      flex-direction: column;
      gap: 10px;
      font-family: Arial, sans-serif;
      box-sizing: border-box;
    `;

    // Create instructions for screen readers
    const instructions = document.createElement('div');
    instructions.id = 'vix-chat-instructions';
    instructions.setAttribute('role', 'status');
    instructions.setAttribute('aria-live', 'polite');
    instructions.textContent = 'VIX AI Assistant';
    instructions.style.cssText = `
      color: #666;
      font-size: 14px;
      margin-bottom: 10px;
    `;
    chatDiv.appendChild(instructions);

    // Create input container for better layout
    const inputContainer = document.createElement('div');
    inputContainer.style.cssText = `
      display: flex;
      gap: 10px;
      align-items: center;
    `;

    // Create input field
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'vix-chat-input';
    input.setAttribute('aria-label', 'Type your request here');
    input.setAttribute('role', 'textbox');
    input.placeholder = 'Example: "Read the main content of this page" or "Summarize this article"';
    input.style.cssText = `
      flex: 1;
      padding: 12px;
      border: 2px solid #4CAF50;
      border-radius: 4px;
      font-size: 16px;
      min-height: 44px;
      box-sizing: border-box;
    `;
    this.inputField = input;

    // Create send button
    const sendButton = document.createElement('button');
    sendButton.textContent = 'Send';
    sendButton.id = 'vix-chat-send';
    sendButton.setAttribute('aria-label', 'Send message');
    sendButton.style.cssText = `
      padding: 12px 24px;
      background-color: #4CAF50;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
      min-height: 44px;
      min-width: 44px;
      box-sizing: border-box;
    `;
    this.sendButton = sendButton;

    // Create loading indicator
    const loadingIndicator = this.createLoadingIndicator();
    this.loadingIndicator = loadingIndicator;

    // Create status message area
    const statusMessage = document.createElement('div');
    statusMessage.id = 'vix-chat-status';
    statusMessage.setAttribute('role', 'status');
    statusMessage.setAttribute('aria-live', 'polite');
    statusMessage.style.cssText = `
      color: #666;
      font-size: 14px;
      margin-top: 10px;
    `;
    this.statusMessage = statusMessage;

    // Add elements to containers
    inputContainer.appendChild(input);
    inputContainer.appendChild(sendButton);
    chatDiv.appendChild(inputContainer);
    chatDiv.appendChild(loadingIndicator);
    chatDiv.appendChild(statusMessage);

    // Add to page
    document.body.insertBefore(chatDiv, document.body.firstChild);
    this.chatContainer = chatDiv;

    // Add event listeners
    this.setupEventListeners();

    // Focus the input field
    input.focus();

    return chatDiv;
  }

  hide(): void {
    if (this.chatContainer) {
      this.chatContainer.remove();
      this.chatContainer = null;
      this.inputField = null;
      this.sendButton = null;
      this.statusMessage = null;
      this.loadingIndicator = null;
      this.messageHistoryContainer = null;
    }
  }

  private createLoadingIndicator(): HTMLElement {
    const loadingIndicator = document.createElement('div');
    loadingIndicator.id = 'vix-chat-loading';
    loadingIndicator.style.cssText = `
      display: none;
      align-items: center;
      justify-content: center;
      margin-top: 10px;
      color: #666;
      font-size: 14px;
    `;
    
    // Create loading spinner
    const spinner = document.createElement('div');
    spinner.style.cssText = `
      width: 20px;
      height: 20px;
      border: 3px solid #f3f3f3;
      border-top: 3px solid #4CAF50;
      border-radius: 50%;
      margin-right: 10px;
      animation: spin 1s linear infinite;
    `;
    
    // Add keyframes for spinner animation
    if (!document.querySelector('#vix-spinner-styles')) {
      const style = document.createElement('style');
      style.id = 'vix-spinner-styles';
      style.textContent = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }
    
    // Create loading text
    const loadingText = document.createElement('span');
    loadingText.textContent = 'Processing your request...';
    
    // Assemble loading indicator
    loadingIndicator.appendChild(spinner);
    loadingIndicator.appendChild(loadingText);
    
    return loadingIndicator;
  }

  private setupEventListeners(): void {
    if (!this.sendButton || !this.inputField) return;

    // Handle send button click
    this.sendButton.addEventListener('click', () => {
      this.handleSendMessage();
    });

    // Handle enter key press
    this.inputField.addEventListener('keypress', (event) => {
      if (event.key === 'Enter') {
        this.handleSendMessage();
      }
    });

    // Handle focus events for better screen reader experience
    this.inputField.addEventListener('focus', () => {
      this.updateStatus('Input field focused. Type your request and press Enter to send.');
    });

    this.sendButton.addEventListener('focus', () => {
      this.updateStatus('Send button focused. Press Enter to send your message.');
    });
  }

  private updateStatus(message: string): void {
    if (this.statusMessage) {
      this.statusMessage.textContent = message;
    }
  }

  private handleAddResponse(response: ChatMessage[]): void {
    console.log('Response:', response);
    
    // Create a message history container if it doesn't exist
    if (!this.messageHistoryContainer && this.chatContainer) {
      this.messageHistoryContainer = document.createElement('div');
      this.messageHistoryContainer.id = 'vix-message-history';
      this.messageHistoryContainer.style.cssText = `
        max-height: 300px;
        overflow-y: auto;
        margin-bottom: 10px;
        border: 1px solid #e0e0e0;
        border-radius: 4px;
        padding: 10px;
        box-sizing: border-box;
      `;
      
      // Insert the message history container before the input container
      const inputContainer = this.inputField?.parentElement;
      if (inputContainer) {
        this.chatContainer.insertBefore(this.messageHistoryContainer, inputContainer);
      }
    }
    
    if (!this.messageHistoryContainer) return;
    
    // Clear the message history container
    this.messageHistoryContainer.innerHTML = '';
    
    // Add each message to the history
    for (const message of response) {
      const messageElement = document.createElement('div');
      messageElement.style.cssText = `
        margin-bottom: 10px;
        padding: 8px 12px;
        border-radius: 4px;
        max-width: 80%;
        word-wrap: break-word;
        line-height: 1.4;
      `;
      
      // Style based on message direction
      if (message.direction === 'out') {
        messageElement.style.cssText += `
          background-color: #e3f2fd;
          margin-left: auto;
          text-align: right;
        `;
      } else {
        messageElement.style.cssText += `
          background-color: #f5f5f5;
          margin-right: auto;
        `;
      }
      
      // Add role indicator if available
      let roleText = '';
      if (message.role) {
        roleText = `<strong>${message.role}:</strong> `;
      }
      
      // Set the message content
      messageElement.innerHTML = `${roleText}${message.content}`;
      
      // Add ARIA attributes
      messageElement.setAttribute('role', 'article');
      messageElement.setAttribute('aria-label', `Message from ${message.role || 'system'}`);
      
      // Add the message to the history container
      this.messageHistoryContainer.appendChild(messageElement);
    }
    
    // Scroll to the bottom of the message history
    this.messageHistoryContainer.scrollTop = this.messageHistoryContainer.scrollHeight;
    
    // Update status to indicate response received
    this.updateStatus('Response received');
  }

  private async handleSendMessage(): Promise<void> {
    if (!this.inputField || !this.sendButton) return;
    
    const message = this.inputField.value.trim();
    if (message && !this.isLoading) {
      this.isLoading = true;
      this.updateStatus('Processing your request...');
      this.sendButton.disabled = true;
      this.sendButton.textContent = 'Sending...';
      
      // Show loading indicator
      if (this.loadingIndicator) {
        this.loadingIndicator.style.display = 'flex';
      }
      
      try {
        // Process message with conversation service
        const response = await this.conversationProcessingService.processUserMessage(message);
        
        if (response.success) {
          // Create message format expected by handleAddResponse
          const messages: ChatMessage[] = [
            {
              role: 'user',
              direction: 'out',
              content: message
            },
            {
              role: 'assistant',
              direction: 'in',
              content: response.response
            }
          ];
          
          this.handleAddResponse(messages);
        } else {
          this.updateStatus('Error processing your request. Please try again.');
        }
      } catch (error) {
        console.error('Error processing message:', error);
        this.updateStatus('Error processing your request. Please try again.');
      } finally {
        this.isLoading = false;
        this.sendButton.disabled = false;
        this.sendButton.textContent = 'Send';
        this.updateStatus('Ready for your next request');
        
        // Hide loading indicator
        if (this.loadingIndicator) {
          this.loadingIndicator.style.display = 'none';
        }
      }
      
      this.inputField.value = '';
      this.inputField.focus(); // Return focus to input after sending
    }
  }

  // TODO: Melhorias futuras comentadas:
  
  // MELHORIA 1: Persistir histórico de conversação no localStorage
  // private saveConversationHistory(): void; private loadConversationHistory(): ChatMessage[]
  
  // MELHORIA 2: Suporte a markdown/HTML rico nas mensagens
  // private renderRichMessage(content: string): HTMLElement
  
  // MELHORIA 3: Comandos de voz (Web Speech API)
  // private setupVoiceInput(): void; private startVoiceRecognition(): void
  
  // MELHORIA 4: Atalhos de teclado e comandos rápidos
  // private setupKeyboardShortcuts(): void
  
  // MELHORIA 5: Redimensionamento e posicionamento configurável
  // private makeResizable(): void; private setupPositioning(): void
}