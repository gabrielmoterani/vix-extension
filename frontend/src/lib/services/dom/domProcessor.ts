import type { ProcessedElement } from './types'
import { ElementAnalyzer } from './elementAnalyzer'
import { globalCache, CacheKeyGenerator } from '../cacheService'

/**
 * Processador principal do DOM
 */
export class DomProcessor {
  private origin: string
  private processedElementsCache = new Map<string, ProcessedElement>()

  constructor() {
    this.origin = window.location.origin
  }

  /**
   * Processa DOM completo em estrutura hierárquica
   */
  processDom(node: Element | Document): ProcessedElement | null {
    // Se for document, processar o body
    if (node.nodeType === Node.DOCUMENT_NODE) {
      return this.processDom((node as Document).body)
    }

    const element = node as Element

    // Pular elementos que devem ser ignorados
    if (ElementAnalyzer.isSkippableElement(element)) {
      return null
    }

    // Generate cache key for this element
    const elementSignature = {
      tag: element.tagName?.toLowerCase() || '',
      attributes: ElementAnalyzer.processAttributes(element, this.origin),
      text: ElementAnalyzer.extractDirectText(element)
    }
    
    const cacheKey = CacheKeyGenerator.domElement(elementSignature)
    
    // Check cache first (but only for elements without data-vix to avoid ID conflicts)
    if (!element.getAttribute('data-vix')) {
      const cached = this.processedElementsCache.get(cacheKey)
      if (cached) {
        // Return cached element with new unique ID if needed
        return { ...cached }
      }
    }

    // Criar elemento processado
    const processed: ProcessedElement = {
      tag: elementSignature.tag,
      attributes: elementSignature.attributes,
      children: [],
      text: elementSignature.text,
      isActionElement: ElementAnalyzer.isActionElement(element),
      isImage: ElementAnalyzer.isImageElement(element),
      id: element.getAttribute('data-vix') || ''
    }

    // Processar filhos
    for (const child of element.children) {
      const processedChild = this.processDom(child)
      if (processedChild) {
        processed.children.push(processedChild)
      }
    }

    // Cache the processed element (but only if it doesn't have a data-vix ID)
    if (!processed.id) {
      this.processedElementsCache.set(cacheKey, { ...processed })
    }

    return processed
  }

  /**
   * Gera hash representando a estrutura do DOM
   */
  generateDomStructureHash(element: ProcessedElement): string {
    const structure = this.serializeElementStructure(element)
    let hash = 0
    for (let i = 0; i < structure.length; i++) {
      const char = structure.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }

  /**
   * Serializa estrutura de elemento para hash
   */
  private serializeElementStructure(element: ProcessedElement): string {
    const parts = [
      element.tag,
      Object.keys(element.attributes).sort().join(','),
      element.text.substring(0, 100) // Limit text for hashing
    ]
    
    const childStructures = element.children.map(child => 
      this.serializeElementStructure(child)
    )
    
    return `${parts.join('|')}[${childStructures.join(',')}]`
  }

  /**
   * Limpa cache local
   */
  clearCache(): void {
    this.processedElementsCache.clear()
  }

  /**
   * Obtém estatísticas de cache
   */
  getCacheStats(): {
    localCacheSize: number
    globalCacheStats: any
  } {
    return {
      localCacheSize: this.processedElementsCache.size,
      globalCacheStats: globalCache.getStats()
    }
  }
}