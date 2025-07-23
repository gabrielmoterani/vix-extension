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
      
      // Usar a mesma lógica consolidada
      return this.shouldProcessImage(img.alt)
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
   * Lógica consolidada para determinar se uma imagem deve ser processada
   */
  private static shouldProcessImage(alt?: string): boolean {
    // Sem alt text - definitivamente processar
    if (!alt) return true
    
    // Alt muito curto - processar
    if (alt.length < 10) return true
    
    // Alt genérico comum - processar  
    const genericAlts = ['image', 'img', 'photo', 'picture', 'icon', 'logo']
    if (genericAlts.some(generic => alt.toLowerCase().includes(generic))) return true
    
    // NOVA LÓGICA: Processar imagens com alt text bom para melhorar
    // descrições mais ricas e detalhadas
    if (alt.length >= 10) return true
    
    return false
  }

  /**
   * Verifica se uma imagem deve ser processada para alt text
   */
  private static shouldAddAltText(element: ProcessedElement): boolean {
    return this.shouldProcessImage(element.attributes.alt)
  }
}