import type { ArticleContent, ReadabilityResult, ReadabilityService } from './readabilityService'
import type { ProcessedElement, ProcessedImage, DomProcessingResult, ReadabilityStats } from './dom/types'
import { DomProcessor } from './dom/domProcessor'
import { ImageExtractor } from './dom/imageExtractor'
import { TextExtractor } from './dom/textExtractor'
import { StatsGenerator } from './dom/statsGenerator'

// Re-export types for backward compatibility
export type { ProcessedElement, ProcessedImage, DomStats } from './dom/types'

export class DomProcessingService {
  private domProcessor: DomProcessor

  constructor(private readonly readabilityService: ReadabilityService) {
    this.domProcessor = new DomProcessor()
  }

  processDocumentWithReadability(document: Document): DomProcessingResult {
    // Processar DOM original sempre
    const originalDom = this.domProcessor.processDom(document);
    if (!originalDom) {
      throw new Error('Failed to process original DOM');
    }

    // Verificar se vale a pena usar Readability
    const isCandidate = this.readabilityService.isReadabilityCandidate(document);
    if (!isCandidate) {
      console.log('VIX: Page is not a good candidate for Readability');
      return {
        originalDom,
        shouldUseReadability: false,
        stats: {
          originalTextLength: TextExtractor.extractAllText(originalDom).length,
          cleanedTextLength: 0,
          compressionRatio: 1,
          readabilitySuccess: false
        }
      };
    }

    // Tentar Readability
    const readabilityResult = this.readabilityService.parseDocument(document);
    
    const originalText = TextExtractor.extractAllText(originalDom);
    const cleanedText = readabilityResult.article?.textContent || '';
    
    const stats = {
      originalTextLength: originalText.length,
      cleanedTextLength: cleanedText.length,
      compressionRatio: cleanedText.length / originalText.length,
      readabilitySuccess: readabilityResult.success && !readabilityResult.fallbackUsed
    };

    // Decidir se usar Readability baseado na qualidade
    const shouldUseReadability = this.shouldUseReadabilityResult(stats, readabilityResult);

    console.log('VIX: Readability processing stats:', {
      ...stats,
      shouldUse: shouldUseReadability,
      fallbackUsed: readabilityResult.fallbackUsed,
      processingTime: readabilityResult.processingTime
    });

    return {
      originalDom,
      cleanedContent: readabilityResult.article,
      shouldUseReadability,
      stats
    };
  }

  // Delegated method for backward compatibility
  processDom(node: Element | Document): ProcessedElement | null {
    return this.domProcessor.processDom(node)
  }

  /**
   * Decidir se deve usar resultado do Readability
   */
  private shouldUseReadabilityResult(
    stats: any, 
    readabilityResult: ReadabilityResult
  ): boolean {
    // Não usar se falhou completamente
    if (!readabilityResult.success) return false;
    
    // Não usar se o texto ficou muito pequeno (compressão excessiva)
    if (stats.compressionRatio < 0.1) return false;
    
    // Não usar se o texto final é muito pequeno
    if (stats.cleanedTextLength < 300) return false;
    
    // Usar se foi bem-sucedido e não usou fallback
    if (readabilityResult.success && !readabilityResult.fallbackUsed) return true;
    
    // Para fallback, só usar se realmente melhorou a compressão
    return stats.compressionRatio < 0.7 && stats.cleanedTextLength > 500;
  }
  

  // Delegated method for backward compatibility
  extractImages(processedDom: ProcessedElement): ProcessedImage[] {
    return ImageExtractor.extractImages(processedDom)
  }

  // Delegated method for backward compatibility
  extractActionElements(processedDom: ProcessedElement) {
    return TextExtractor.extractActionElements(processedDom)
  }

  // Delegated method for backward compatibility
  extractAllText(processedDom: ProcessedElement): string {
    const domStructureHash = this.domProcessor.generateDomStructureHash(processedDom)
    return TextExtractor.extractAllText(processedDom, domStructureHash)
  }

  // Delegated method for backward compatibility
  generateStats(processedDom: ProcessedElement) {
    return StatsGenerator.generateStats(processedDom)
  }

  // All helper methods moved to specialized classes

  // Delegated method for backward compatibility
  filterImagesNeedingAlt(images: ProcessedImage[]): ProcessedImage[] {
    return ImageExtractor.filterImagesNeedingAlt(images)
  }

  // Delegated method for backward compatibility
  getProcessableImageUrls(images: ProcessedImage[]): Array<{id: string, url: string}> {
    return ImageExtractor.getProcessableImageUrls(images)
  }

  // Delegated method for backward compatibility
  isValidImageUrl(url: string): boolean {
    return true // Moved to ElementAnalyzer.isValidImageUrl
  }

  // Hash generation moved to DomProcessor

  // Delegated cache methods
  clearCache(): void {
    this.domProcessor.clearCache()
  }

  getCacheStats() {
    return this.domProcessor.getCacheStats()
  }
}