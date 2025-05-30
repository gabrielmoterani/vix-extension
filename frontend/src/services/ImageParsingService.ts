import { inject, injectable } from 'tsyringe';
import { TOKENS } from '../core/container/tokens';
import type { IContentAPI, IDomModifier, IImageParsingService, ImageProcessingResult, ProcessedElement } from '~src/core/interfaces';

interface ImageUrlData {
  url: string;
  id: string;
}

@injectable()
export class ImageParsingService implements IImageParsingService {
  constructor(
    @inject(TOKENS.ContentAPI) private altContentApi: IContentAPI,
    @inject(TOKENS.DomModifier) private domModifier: IDomModifier
  ) {}

  async execute(imageNodes: ProcessedElement[], summary: string, model?: string): Promise<ImageProcessingResult> {
    let success = 0;
    const imageUrls = this.extractImageUrls(imageNodes);
    let imagesTime = 0;

    for (const { url, id } of imageUrls) {
      try {
        const now = new Date();
        const altTextResponse = await this.requestImageAltText(url, summary, model);
        const time = new Date().getTime() - now.getTime();
        imagesTime += time;

        // Extract the actual alt text from response
        const altText = this.extractAltTextFromResponse(altTextResponse);
        
        // Queue modification and apply immediately (matching original behavior)
        this.domModifier.queueModification(id, 'alt', `VIX: ${altText}`);
        this.domModifier.applyQueuedModifications();
        success++;
      } catch (error) {
        console.error('Error processing image:', error);
        // Continue processing other images even if one fails
      }
    }

    return { success, imagesTime };
  }

  private extractImageUrls(imageNodes: ProcessedElement[]): ImageUrlData[] {
    const imageUrls = imageNodes
      .filter(node => node.attributes?.src && node.attributes?.['data-vix'])
      .map((node) => ({
        url: node.attributes.src,
        id: node.attributes['data-vix'],
      }));
    
    return imageUrls;
  }

  private async requestImageAltText(imageUrl: string, summary: string, model?: string): Promise<any> {
    const response = await this.altContentApi.requestImageAltText(imageUrl, summary, model);
    
    if (!response.success) {
      throw new Error(`Failed to get alt text: ${response.error}`);
    }
    
    return response.data;
  }

  private extractAltTextFromResponse(response: any): string {
    // Handle different response formats
    if (typeof response === 'string') {
      return response;
    }
    
    if (response.response) {
      return response.response;
    }
    
    if (response.alt_text) {
      return response.alt_text;
    }
    
    // Fallback to stringified response
    return JSON.stringify(response);
  }

  // TODO: Melhorias futuras comentadas (código comentado no original):
  
  // MELHORIA 1: Adicionar overlay visual abaixo da imagem
  // async addAltContentBelowImage(id: string, altText: string): Promise<void>
  // async addAltContentBelowImageElement(image: HTMLElement, altText: string): Promise<void>
  
  // MELHORIA 2: Processamento em batch para múltiplas imagens
  // async executeBatch(imageNodes: ProcessedElement[], summary: string, batchSize: number = 5): Promise<ImageProcessingResult>
  
  // MELHORIA 3: Cache de alt text para URLs já processadas
  // private altTextCache = new Map<string, string>();
  // private getCachedAltText(url: string): string | null
  
  // MELHORIA 4: Retry automático para falhas de rede
  // private async requestImageAltTextWithRetry(imageUrl: string, summary: string, maxRetries: number = 3): Promise<any>
  
  // MELHORIA 5: Validação de qualidade do alt text gerado
  // private validateAltText(altText: string, imageUrl: string): boolean
  
  // MELHORIA 6: Suporte a diferentes formatos de imagem e lazy loading
  // private resolveImageUrl(imageNode: ProcessedElement): string
}