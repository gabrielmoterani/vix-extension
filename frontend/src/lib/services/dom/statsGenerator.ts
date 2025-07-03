import type { ProcessedElement, DomStats } from './types'
import { TextExtractor } from './textExtractor'

/**
 * Gerador de estatísticas do DOM
 */
export class StatsGenerator {
  /**
   * Gera estatísticas completas do DOM processado
   */
  static generateStats(processedDom: ProcessedElement): DomStats {
    let totalElements = 0
    let elementsWithIds = 0
    let actionElements = 0
    let images = 0
    let imagesWithoutAlt = 0

    const walkElements = (element: ProcessedElement) => {
      totalElements++
      
      if (element.id) {
        elementsWithIds++
      }

      if (element.isActionElement) {
        actionElements++
      }

      if (element.isImage) {
        images++
        if (!element.attributes.alt || element.attributes.alt.length < 10) {
          imagesWithoutAlt++
        }
      }

      for (const child of element.children) {
        walkElements(child)
      }
    }

    walkElements(processedDom)
    const allText = TextExtractor.extractAllText(processedDom)

    return {
      totalElements,
      elementsWithIds,
      actionElements,
      images,
      imagesWithoutAlt,
      textLength: allText.length
    }
  }
}