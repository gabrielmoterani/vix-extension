export const TOKENS = {
  // HTTP Client
  HttpClient: Symbol('HttpClient'),
  // APIs
  ContentAPI: Symbol('ContentAPI'),
  MainAPI: Symbol('MainAPI'),
  TaskAPI: Symbol('TaskAPI'),

   // Browser Infrastructure
  BrowserEventHandler: Symbol('BrowserEventHandler'),
  
  // Services
  DomProcessingService: Symbol('DomProcessingService'),
  ImageParsingService: Symbol('ImageParsingService'),
  ConversationProcessingService: Symbol('ConversationProcessingService'),
  
  // Presentation
  LoadingIndicator: Symbol('LoadingIndicator'),
  SummaryIndicator: Symbol('SummaryIndicator'),
  DomModifier: Symbol('DomModifier'),
  ChatInterface: Symbol('ChatInterface'),
  
  // Use Cases
  ProcessPageUseCase: Symbol('ProcessPageUseCase'),
  
  // External Libraries
  AdBlock: Symbol('AdBlock'),
  WcagCheck: Symbol('WcagCheck'),

  ReactPresentationBridge: Symbol('ReactPresentationBridge'),
} as const;