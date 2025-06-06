import 'reflect-metadata';
import { container } from 'tsyringe';
import { TOKENS } from './tokens';

// Infrastructure
import { HttpClient } from '../../infrastructure/http/HttpClient';
import { ContentAPI } from '~src/infrastructure/api/ContentApi';
import { TaskAPI } from '~src/infrastructure/api/TaskApi';
import { DomProcessingService } from '~src/services/DomProcessingService';
import { BrowserEventHandler } from '~src/infrastructure/browser/BrowserEventHandler';
import { LoadingIndicator } from '~src/presentation/LoadingIndicator';
import { SummaryIndicator } from '~src/presentation/SummaryIndicator';
import { ChatInterface } from '~src/presentation/ChatInterface';
import { DomModifier } from '~src/presentation/DomModifier';
import { ImageParsingService } from '~src/services/ImageParsingService';
import { ConversationProcessingService } from '~src/services/ConversationProcessingService';
import { ProcessPageUseCase } from '~src/use-cases/ProcessPageUseCase';

import { Readability } from '@mozilla/readability';
import * as axe from 'axe-core';
import { AdBlock } from '~src/external-libs/AdBlock';
import { ReactPresentationBridge } from '~src/services/ReactPresentationBridge';


export class DIContainer {
  private static instance: DIContainer;
  private isConfigured = false;
  
  private constructor() {}
  
  static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }
  
  configure(): void {
    if (this.isConfigured) return;
    
    this.registerInfrastructure();
    this.registerServices();
    this.registerPresentation();
    this.registerUseCases();
    this.registerExternalLibs();
    
    this.isConfigured = true;
  }
  
  private registerInfrastructure(): void {
    // HTTP Client
    container.register(TOKENS.HttpClient, {
      useClass: HttpClient
    });

    container.register(TOKENS.BrowserEventHandler, {
      useFactory: () => new BrowserEventHandler(
        container.resolve(TOKENS.ProcessPageUseCase)
      )
    });
    
    // APIs
    container.register(TOKENS.ContentAPI, {
      useFactory: () => new ContentAPI(container.resolve(TOKENS.HttpClient))
    });
    
    container.register(TOKENS.TaskAPI, {
      useFactory: () => new TaskAPI(container.resolve(TOKENS.HttpClient))
    });


    
  }
  
  private registerServices(): void {
    // DOM Processing Service
    container.register(TOKENS.DomProcessingService, {
      useClass: DomProcessingService
    });
    
    // Image Processing Service
    container.register(TOKENS.ImageParsingService, {
      useClass: ImageParsingService
    });
    
    // Conversation Processing Service
    container.register(TOKENS.ConversationProcessingService, {
      useClass: ConversationProcessingService
    });
  }
  
  private registerPresentation(): void {
    // Presentation components
    container.register(TOKENS.LoadingIndicator, {
      useClass: LoadingIndicator
    });
    
    container.register(TOKENS.SummaryIndicator, {
      useClass: SummaryIndicator
    });
    
    container.register(TOKENS.ChatInterface, {
      useClass: ChatInterface
    });
    
    container.register(TOKENS.DomModifier, {
      useClass: DomModifier
    });

    container.register(TOKENS.ReactPresentationBridge, {
      useClass: ReactPresentationBridge
    });
  }
  
  private registerUseCases(): void {
    container.register(TOKENS.ProcessPageUseCase, {
      useClass: ProcessPageUseCase
    });
  }
  
  
  private registerExternalLibs(): void {
    // AdBlock - configurar com regras
    container.register(TOKENS.AdBlock, {
    useFactory: () => {
      const adBlock = new AdBlock();
      
      // Carregar regras adicionais se necessário
      const customRules = [
        'googletag',
        'adsystem',
        'amazon-adsystem',
        'advertising'
      ];
      adBlock.loadRules(customRules);
      
      return adBlock;
    }
  });
    
    // Axe-core para WCAG checking
    container.register(TOKENS.WcagCheck, {
      useFactory: () => {
        return axe;
      }
    });
  }
  
  resolve<T>(token: symbol): T {
    return container.resolve(token);
  }
}

export const diContainer = DIContainer.getInstance();