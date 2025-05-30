import { inject, injectable } from 'tsyringe';
import { TOKENS } from '../core/container/tokens';
import type { IConversationProcessingService, ITaskAPI, ConversationResponse } from '~src/core/interfaces';

interface ConversationMessage {
  direction: 'in' | 'out';
  content: string;
  role?: string;
  timestamp?: Date;
}

interface TaskResponse {
  explanation?: string;
  js_commands?: string[];
}

@injectable()
export class ConversationProcessingService implements IConversationProcessingService {
  private conversation: ConversationMessage[] = [];
  private summary: string = '';
  private htmlContent: string = '';
  private actions: any[] = [];

  constructor(
    @inject(TOKENS.TaskAPI) private taskApi: ITaskAPI
  ) {}

  async processUserMessage(message: string): Promise<ConversationResponse> {
    try {
      // Add user message to conversation
      const userMessage: ConversationMessage = {
        direction: 'out',
        content: message,
        role: 'user',
        timestamp: new Date()
      };
      this.conversation.push(userMessage);

      // Execute the prompt and get response
      const response = await this.executePrompt(message);
      
      // Execute JS commands if present
      if (response.js_commands && response.js_commands.length > 0) {
        await this.executeJsCommands(response.js_commands);
      }

      // Add assistant response to conversation
      const assistantMessage: ConversationMessage = {
        direction: 'in',
        content: response.explanation || 'Task completed successfully',
        role: 'assistant',
        timestamp: new Date()
      };
      this.conversation.push(assistantMessage);

      return {
        success: true,
        response: response.explanation || 'Task completed successfully',
        actions: response.js_commands
      };
    } catch (error) {
      console.error('Error processing user message:', error);
      
      // Add error message to conversation
      const errorMessage: ConversationMessage = {
        direction: 'in',
        content: 'Error getting response, try again later',
        role: 'assistant',
        timestamp: new Date()
      };
      this.conversation.push(errorMessage);

      return {
        success: false,
        response: 'Error getting response, try again later'
      };
    }
  }

  // Legacy method for backward compatibility with ChatInterface
  async addMessage(message: ConversationMessage, callback: (conversation: ConversationMessage[]) => void): Promise<void> {
    this.conversation.push(message);
    
    if (message.direction === 'out') {
      try {
        const response = await this.executePrompt(message.content);
        
        if (response.js_commands) {
          await this.executeJsCommands(response.js_commands);
        }
        
        if (response.explanation) {
          const assistantMessage: ConversationMessage = {
            direction: 'in',
            content: response.explanation
          };
          this.conversation.push(assistantMessage);
          callback(this.conversation);
        }
        return;
      } catch (error) {
        console.error('Error in addMessage:', error);
        this.conversation.push({
          direction: 'in',
          content: 'Error getting response, try again later'
        });
        callback(this.conversation);
        return;
      }
    }
  }

  private async executePrompt(taskPrompt: string): Promise<TaskResponse> {
    const response = await this.taskApi.requestPageTask(taskPrompt, this.actions, this.summary);
    
    if (!response.success) {
      throw new Error(`Task API failed: ${response.error}`);
    }
    
    // Parse the response to extract only explanation and js_commands
    try {
      // The response.data.response might be a JSON string, so we need to parse it
      let parsedResponse: any;
      
      if (typeof response.data === 'string') {
        parsedResponse = JSON.parse(response.data);
      } else if (response.data.response && typeof response.data.response === 'string') {
        parsedResponse = JSON.parse(response.data.response);
      } else {
        parsedResponse = response.data;
      }
      
      console.log('PARSED RESPONSE', parsedResponse);
      
      // Return only the explanation and js_commands
      return {
        explanation: parsedResponse.explanation || parsedResponse.response || 'Task completed',
        js_commands: parsedResponse.js_commands || []
      };
    } catch (error) {
      console.error('Error parsing response:', error);
      return {
        explanation: 'Error parsing response',
        js_commands: []
      };
    }
  }

  private async executeJsCommands(jsCommands: string[]): Promise<void> {
    for (const command of jsCommands) {
      try {
        // TODO: MELHORIA 1 - Sanitizar comandos JS antes de executar
        // Atualmente executa JS arbitrário, que pode ser perigoso
        await new Function(command)();
        console.log('Executed JS command:', command);
      } catch (error) {
        console.error('Error executing command:', command, error);
      }
    }
  }

  updatePageData(summary: string, htmlContent: string, actions: any[]): void {
    this.summary = summary;
    this.htmlContent = htmlContent;
    this.actions = actions;
  }

  getConversation(): ConversationMessage[] {
    return [...this.conversation]; // Return copy to prevent external mutation
  }

  clearConversation(): void {
    this.conversation = [];
  }

  // TODO: Melhorias futuras comentadas:
  
  // MELHORIA 2: Persistência da conversa no localStorage
  // saveConversation(): void; loadConversation(): void
  
  // MELHORIA 3: Limite de mensagens na conversa (evitar memory leak)
  // private readonly MAX_CONVERSATION_LENGTH = 100;
  // private trimConversation(): void
  
  // MELHORIA 4: Sanitização e validação de comandos JS
  // private validateJsCommand(command: string): boolean
  // private sanitizeJsCommand(command: string): string
  
  // MELHORIA 5: Sistema de plugins para diferentes tipos de comando
  // private commandExecutors = new Map<string, CommandExecutor>();
  // registerCommandExecutor(type: string, executor: CommandExecutor): void
  
  // MELHORIA 6: Métricas de performance e logging estruturado
  // private logCommandExecution(command: string, success: boolean, duration: number): void
  
  // MELHORIA 7: Timeout para execução de comandos JS
  // private async executeJsCommandWithTimeout(command: string, timeout: number = 5000): Promise<void>
}