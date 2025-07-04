import type { ProcessedElement } from './types'
import { globalCache, CacheKeyGenerator } from '../cacheService'

/**
 * Extrator de texto do DOM processado
 */
export class TextExtractor {
  /**
   * Extrai todo o texto de um DOM processado para resumo
   */
  static extractAllText(processedDom: ProcessedElement, domStructureHash?: string): string {
    // Generate cache key based on DOM structure
    const structureKey = domStructureHash || this.generateSimpleHash(processedDom)
    const cacheKey = CacheKeyGenerator.pageSummary(structureKey)
    
    const cached = globalCache.get<string>(cacheKey)
    if (cached) {
      return cached
    }

    const texts: string[] = []

    const walkElements = (element: ProcessedElement) => {
      if (element.text.trim()) {
        texts.push(element.text.trim())
      }

      for (const child of element.children) {
        walkElements(child)
      }
    }

    walkElements(processedDom)
    const result = texts.join(' ')
    
    // Cache the extracted text with medium TTL
    globalCache.set(cacheKey, result, 15 * 60 * 1000) // 15 minutes
    
    return result
  }

  /**
   * Extrai elementos de ação/interativos para o chat
   */
  static extractActionElements(processedDom: ProcessedElement): Array<{
    id: string
    tag: string
    text: string
    href?: string
    type?: string
    value?: string
    placeholder?: string
    ariaLabel?: string
    name?: string
    role?: string
    elementType?: string
    isInput?: boolean
    isClickable?: boolean
  }> {
    const actions: Array<{
      id: string
      tag: string
      text: string
      href?: string
      type?: string
      value?: string
      placeholder?: string
      ariaLabel?: string
      name?: string
      role?: string
      elementType?: string
      isInput?: boolean
      isClickable?: boolean
    }> = []

    const walkElements = (element: ProcessedElement) => {
      if (element.isActionElement) {
        // Determinar tipo do elemento para melhor contexto
        const isInput = ['input', 'textarea', 'select'].includes(element.tag.toLowerCase())
        const isClickable = ['button', 'a'].includes(element.tag.toLowerCase()) || element.attributes.onclick
        
        let elementType = element.tag.toLowerCase()
        if (element.tag.toLowerCase() === 'input' && element.attributes.type) {
          elementType = `input[${element.attributes.type}]`
        }

        const action = {
          id: element.id,
          tag: element.tag,
          text: element.text.substring(0, 100), // Limitar texto
          href: element.attributes.href,
          type: element.attributes.type,
          value: element.attributes.value,
          placeholder: element.attributes.placeholder,
          ariaLabel: element.attributes['aria-label'],
          name: element.attributes.name,
          role: element.attributes.role,
          elementType,
          isInput,
          isClickable
        }

        // Incluir elementos com informação útil ou que são inputs/clickables importantes
        if (action.text || action.href || action.ariaLabel || action.placeholder || isInput || isClickable) {
          actions.push(action)
        }
      }

      // Processar filhos
      for (const child of element.children) {
        walkElements(child)
      }
    }

    walkElements(processedDom)
    return actions
  }

  /**
   * Gera hash simples para cache quando não temos hash da estrutura
   */
  private static generateSimpleHash(element: ProcessedElement): string {
    const content = this.serializeForHash(element)
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(36)
  }

  /**
   * Serializa elemento para geração de hash
   */
  private static serializeForHash(element: ProcessedElement): string {
    return `${element.tag}:${element.text.substring(0, 50)}:${element.children.length}`
  }
}