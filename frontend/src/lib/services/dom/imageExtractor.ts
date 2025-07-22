import type { ProcessedElement, ProcessedImage } from './types'
import { ElementAnalyzer } from './elementAnalyzer'

/**
 * Extrator de imagens do DOM processado
 */
export class ImageExtractor {
  /**
   * Extrai todas as imagens do DOM processado
   */
  static extractImages(processedDom: ProcessedElement): ProcessedImage[] {
    const images: ProcessedImage[] = []

    const walkElements = (element: ProcessedElement) => {
      if (element.isImage && element.attributes.src) {
        const needsAlt = this.shouldAddAltText(element)

        images.push({
          id: element.id,
          src: element.attributes.src,
          alt: element.attributes.alt,
          needsAlt
        })
      }

      // Processar filhos
      for (const child of element.children) {
        walkElements(child)
      }
    }

    walkElements(processedDom)
    return images
  }

  /**
   * Filtra imagens que realmente precisam de alt text
   */
  static filterImagesNeedingAlt(images: ProcessedImage[]): ProcessedImage[] {
    return images.filter(img => {
      // Pular se não tem src
      if (!img.src || img.src.includes('data:')) return false
      
      // Pular gifs e svgs (geralmente decorativos)
      if (img.src.includes('.gif') || img.src.includes('.svg')) return false
      
      // Verificar se alt existe e é significativo
      if (!img.alt) return true
      
      // Alt muito curto ou genérico
      if (img.alt.length < 10) return true
      
      // Alt genérico comum
      const genericAlts = ['image', 'img', 'photo', 'picture', 'icon', 'logo']
      if (genericAlts.some(generic => img.alt!.toLowerCase().includes(generic))) return true
      
      return false
    })
  }

  /**
   * Converte imagens para formato de URLs processáveis
   */
  static getProcessableImageUrls(images: ProcessedImage[]): Array<{id: string, url: string}> {
    return images
      .filter(img => ElementAnalyzer.isValidImageUrl(img.src))
      .map(img => ({
        id: img.id,
        url: img.src
      }))
  }

  /**
   * Converte imagens para formato de URLs processáveis com alt original
   */
  static getProcessableImageUrlsWithAlt(images: ProcessedImage[]): Array<{id: string, url: string, originalAlt?: string}> {
    return images
      .filter(img => ElementAnalyzer.isValidImageUrl(img.src))
      .map(img => ({
        id: img.id,
        url: img.src,
        originalAlt: img.alt
      }))
  }

  /**
   * Verifica se uma imagem precisa de alt text
   */
  private static shouldAddAltText(element: ProcessedElement): boolean {
    const alt = element.attributes.alt
    
    // Sem alt text
    if (!alt) return true
    
    // Alt muito curto
    if (alt.length < 10) return true
    
    // Alt genérico
    const genericAlts = ['image', 'img', 'photo', 'picture', 'icon', 'logo']
    if (genericAlts.some(generic => alt.toLowerCase().includes(generic))) return true
    
    return false
  }
}