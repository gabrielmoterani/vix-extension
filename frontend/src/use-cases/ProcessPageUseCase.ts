import { inject, injectable } from 'tsyringe';
import { Readability } from '@mozilla/readability';
import { TOKENS } from '../core/container/tokens';
import type { IProcessPageUseCase } from '~src/core/interfaces/IProcessPageUseCase';
import type { IDomProcessingService, ProcessedElement } from '~src/core/interfaces/IDomProcessingService';
import type { IContentAPI } from '~src/core/interfaces/IContentAPI';
import type { IDomModifier } from '~src/core/interfaces/IDomModifier';
import type { IImageParsingService } from '~src/core/interfaces/IImageParsingService';
import type { IChatInterface, ILoadingIndicator, ISummaryIndicator } from '~src/core/interfaces';

@injectable()
export class ProcessPageUseCase implements IProcessPageUseCase {
  public summary: string = '';
  public htmlContent: ProcessedElement | string = '';
  public actions: any[] = [];

  constructor(
    @inject(TOKENS.DomProcessingService) private domProcessingService: IDomProcessingService,
    @inject(TOKENS.ContentAPI) private altContentApi: IContentAPI,
    @inject(TOKENS.LoadingIndicator) private loadingIndicator: ILoadingIndicator,
    @inject(TOKENS.DomModifier) private domModifier: IDomModifier,
    @inject(TOKENS.ImageParsingService) private imageParsingService: IImageParsingService,
    @inject(TOKENS.SummaryIndicator) private summaryIndicator: ISummaryIndicator,
    @inject(TOKENS.ChatInterface) private chatInterface: IChatInterface,
    @inject(TOKENS.AdBlock) private adBlock: any,
    @inject(TOKENS.WcagCheck) private wcagCheck: any,
  ) {}

  async execute(document: Document): Promise<ProcessPageUseCase> {
    // DISPLAY LOADING INDICATOR
    const loadingDiv = this.loadingIndicator.show();
    const auxiliaryDocument = document.cloneNode(true) as Document;

    const reader = new Readability(auxiliaryDocument);
    const article = reader.parse();

    if (!article) {
      throw new Error('Failed to parse document with Readability');
    }
    
    const parsedDocument = new DOMParser().parseFromString(
      article.content, 
      'text/html'
    );

    const cleanedDocumentJson = this.domProcessingService.processDom(parsedDocument.body);
    const pageJson = this.domProcessingService.processDom(document.body);

    if (!cleanedDocumentJson || !pageJson) {
      throw new Error('Failed to process document');
    }

    // RETRIEVE TEXT AND IMAGES IN JSON FORMAT
    const texts = this.domProcessingService.retrieveTexts(pageJson).join(' ');
    const cleanedTexts = this.domProcessingService.retrieveTexts(cleanedDocumentJson).join(' ');
    const tokenOriginalEstimation = texts.length / 4;
    const tokenParsedEstimation = cleanedTexts.length / 4;

    const images = this.domProcessingService.retrieveImages(pageJson);
    
    // TODO: MELHORIA 2 - Extrair para método separado e tipificar melhor
    const imagesAltCounter = images.reduce((acc: any, image) => {
      const imageElement = document.querySelector(`[data-vix="${image.attributes["data-vix"]}"]`) as HTMLElement;
      const altAttribute = imageElement?.getAttribute('alt');
      
      if (altAttribute) {
        acc["altCounter"] = (acc["altCounter"] || 0) + 1;
      }

      if (altAttribute && altAttribute.length > 240) {
        acc["altMeaningfulCounter"] = (acc["altMeaningfulCounter"] || 0) + 1;
      }

      if (!altAttribute) {
        acc["altMissingCounter"] = (acc["altMissingCounter"] || 0) + 1;
      }

      return acc;
    }, { altCounter: 0, altMeaningfulCounter: 0, altMissingCounter: 0 });

    const filteredImages = images.filter((image) => {
      if (!image.attributes.src) return false;
      return !this.adBlock.matches(image.attributes.src);
    });

    const actionElements = this.domProcessingService.retrieveActionElements(pageJson);

    // QUERY WCAG CONTEXT
    const wcagTest = await this.wcagCheck.run();

    // TODO: MELHORIA 3 - Extrair métricas para service separado e adicionar types
    console.log("VIX STATISTICS", {
      htmlSize: document.body.outerHTML.length,
      parsedHtmlSize: parsedDocument.body.outerHTML.length,
      jsonSize: JSON.stringify(pageJson).length,
      cleanedJsonSize: JSON.stringify(cleanedDocumentJson).length,
      textsSize: texts.length,
      cleanedTextsSize: cleanedTexts.length,
      filteredAddImages: images.length - filteredImages.length,
      imagesCount: images.length,
      ...imagesAltCounter,
      filteredImagesSize: filteredImages.length,
      actionElementsSize: actionElements.length,
      tokenEstimationInOriginal: tokenOriginalEstimation,
      tokenEstimationInParsed: tokenParsedEstimation,
      tokenEstimationFullHTML: (document.body.outerHTML.length / 4),
      elementsCount: this.domProcessingService.countElements(pageJson),
      wcagViolations: wcagTest.inapplicable.length + wcagTest.incomplete.length,
      GPT_MINI_0: tokenParsedEstimation < 16000,
      GPT_4_1: tokenParsedEstimation < 32000,
      GPT_o3_mini: tokenParsedEstimation < 100000,
      Claude_3_5_Sonnet: tokenParsedEstimation < 20000,
      DeepSeek_R1: tokenParsedEstimation < 64000,
    });

    try {
      const now = new Date();
      
      // LOAD SUMMARY
      this.loadingIndicator.updateStatus(loadingDiv, 'Loading summary');
      let auxTexts = texts;
      const tokenLimit = 25000;
      
      // More accurate token estimation (roughly 4 characters per token)
      const estimateTokens = (text: string): number => Math.ceil(text.length / 4);
      
      // Smart text truncation that preserves important content
      // TODO: MELHORIA 4 - Mover para TextProcessingService e melhorar algoritmo
      const truncateText = (text: string, maxTokens: number): string => {
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        let truncatedText = '';
        let currentTokens = 0;
        
        for (const sentence of sentences) {
          const sentenceTokens = estimateTokens(sentence);
          if (currentTokens + sentenceTokens > maxTokens) {
            break;
          }
          truncatedText += sentence + '. ';
          currentTokens += sentenceTokens;
        }
        
        return truncatedText.trim();
      };

      const originalTokens = estimateTokens(texts);
      const cleanedTokens = estimateTokens(cleanedTexts);

      if (originalTokens > tokenLimit) {
        auxTexts = cleanedTexts;
        if (cleanedTokens > tokenLimit) {
          // Use smart truncation instead of arbitrary word limit
          auxTexts = truncateText(cleanedTexts, tokenLimit);
          console.log("VIX: Text truncated to", estimateTokens(auxTexts), "tokens");
        }
      }

      const summaryResponse = await this.altContentApi.requestSummary([auxTexts], "o4-mini");
      
      if (!summaryResponse.success) {
        throw new Error('Failed to get summary: ' + summaryResponse.error);
      }
      
      const summary = summaryResponse.data?.response || summaryResponse.data;
      const summaryTime = new Date().getTime() - now.getTime();

      this.summary = summary;
      this.htmlContent = pageJson;
      this.actions = actionElements;

      this.chatInterface.show();
      this.summaryIndicator.show(summary);
      this.loadingIndicator.updateStatus(loadingDiv, 'Loading additional images context');

      const startImagesTime = new Date();
      
      // QUERY ADDITIONAL IMAGES
      // TODO: MELHORIA 5 - Fazer await aqui ou implementar promise chain melhor
      this.imageParsingService.execute(filteredImages, summary, "o4-mini").then(({success: imagesSuccess, imagesTime: imagesTime}) => {
        this.loadingIndicator.updateStatus(
          loadingDiv,
          `Added additional alternative text to ${imagesSuccess} images`
        );
        const allImagesTime = new Date().getTime() - startImagesTime.getTime();
        
        // TODO: MELHORIA 6 - Extrair logging para service de métricas
        console.log("VIX: TIMES FOR PROCESSING PAGE", {
          summaryTime: `${summaryTime / 1000}s`,
          allImagesTime: `${allImagesTime / 1000}s`,
          imagesSuccess,
          imagesTime: `${imagesTime / 1000}s`,
          imagesTimePerImage: `${(imagesTime / imagesSuccess) / 1000}s`,
          imagesAvarageTime: `${(imagesTime / imagesSuccess) / 1000}s`,
        });
        this.loadingIndicator.fadeOut(loadingDiv);
      }).catch(error => {
        console.error('Error processing images:', error);
        this.loadingIndicator.fadeOut(loadingDiv);
      });

      // TODO: MELHORIA 7 - WCAG processing comentado, implementar quando necessário
      // Código WCAG comentado no original, manter comentado mas tipificar quando implementar
      
      return this; // Return this instance to allow chaining
    } catch (error) {
      console.error('Error processing page:', error);
      this.loadingIndicator.showError(loadingDiv, error as Error);
      throw error; // Re-throw the error to be caught by the caller
    }
  }

  // TODO: MELHORIA 8 - Tipificar o retorno e extrair para parser service
  private extractAltContentElements(data: any): any[] {
    return data.elements || [];
  }

  // TODO: Melhorias futuras comentadas:
  
  // MELHORIA 9: Implementar processamento em pipeline configurável
  // private processingSteps: ProcessingStep[] = [];
  // async executeWithPipeline(document: Document, steps: ProcessingStep[]): Promise<ProcessPageUseCase>
  
  // MELHORIA 10: Cache de resultados baseado em hash da página
  // private pageCache = new Map<string, ProcessingResult>();
  // private generatePageHash(document: Document): string
  
  // MELHORIA 11: Métricas mais detalhadas e estruturadas
  // interface ProcessingMetrics { summaryTime: number; imagesTime: number; totalTime: number; }
  // private collectMetrics(): ProcessingMetrics
  
  // MELHORIA 12: Retry automático em caso de falhas de rede
  // private async executeWithRetry(operation: () => Promise<any>, maxRetries: number = 3): Promise<any>
  
  // MELHORIA 13: Processamento incremental para páginas muito grandes
  // async executeIncremental(document: Document, batchSize: number = 100): Promise<ProcessPageUseCase>
}