import type { ProcessedElement } from './IDomProcessingService';

export interface ImageProcessingResult {
  success: number;
  imagesTime: number;
}

export interface IImageParsingService {
  execute(imageNodes: ProcessedElement[], summary: string, model?: string): Promise<ImageProcessingResult>;
}