import type { ArticleContent, ReadabilityResult, ReadabilityService } from './readabilityService'

// Tipos para representar elementos processados
export interface ProcessedElement {
  tag: string
  attributes: Record<string, string>
  children: ProcessedElement[]
  text: string
  isActionElement: boolean
  isImage: boolean
  id: string // data-vix ID
}

export interface ProcessedImage {
  id: string
  src: string
  alt?: string
  needsAlt: boolean
}

export interface ProcessedAction {
  id: string
  tag: string
  text: string
  href?: string
  type?: string
  value?: string
  placeholder?: string
  ariaLabel?: string
}

export interface DomStats {
  totalElements: number
  elementsWithIds: number
  actionElements: number
  images: number
  imagesWithoutAlt: number
  textLength: number
}

export class DomProcessingService {
  private origin: string

  constructor(private readonly readabilityService: ReadabilityService) {
    this.origin = window.location.origin
    this.readabilityService = readabilityService
  }

  processDocumentWithReadability(document: Document): {
    originalDom: ProcessedElement | null;
    cleanedContent?: ArticleContent;
    shouldUseReadability: boolean;
    stats: {
      originalTextLength: number;
      cleanedTextLength: number;
      compressionRatio: number;
      readabilitySuccess: boolean;
    };
  } {
    // Processar DOM original sempre
    const originalDom = this.processDom(document);
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
          originalTextLength: this.extractAllText(originalDom).length,
          cleanedTextLength: 0,
          compressionRatio: 1,
          readabilitySuccess: false
        }
      };
    }

    // Tentar Readability
    const readabilityResult = this.readabilityService.parseDocument(document);
    
    const originalText = this.extractAllText(originalDom);
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

  // Processar DOM completo em estrutura hierárquica
  processDom(node: Element | Document): ProcessedElement | null {
    // Se for document, processar o body
    if (node.nodeType === Node.DOCUMENT_NODE) {
      return this.processDom((node as Document).body)
    }

    const element = node as Element

    // Pular elementos que devem ser ignorados
    if (this.isSkippableElement(element)) {
      return null
    }

    // Criar elemento processado
    const processed: ProcessedElement = {
      tag: element.tagName?.toLowerCase() || '',
      attributes: this.processAttributes(element),
      children: [],
      text: this.extractText(element),
      isActionElement: this.isActionElement(element),
      isImage: this.isImageElement(element),
      id: element.getAttribute('data-vix') || ''
    }

    // Processar filhos
    for (const child of element.children) {
      const processedChild = this.processDom(child)
      if (processedChild) {
        processed.children.push(processedChild)
      }
    }

    return processed
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
  

  // Extrair apenas imagens que precisam de alt text
  extractImages(processedDom: ProcessedElement): ProcessedImage[] {
    const images: ProcessedImage[] = []

    const walkElements = (element: ProcessedElement) => {
      if (element.isImage && element.attributes.src) {
        const needsAlt = !element.attributes.alt || 
                        element.attributes.alt.length < 10 ||
                        element.attributes.alt.toLowerCase().includes('image')

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

  // Extrair elementos interativos para o chat
  extractActionElements(processedDom: ProcessedElement): ProcessedAction[] {
    const actions: ProcessedAction[] = []

    const walkElements = (element: ProcessedElement) => {
      if (element.isActionElement) {
        const action: ProcessedAction = {
          id: element.id,
          tag: element.tag,
          text: element.text.substring(0, 100), // Limitar texto
          href: element.attributes.href,
          type: element.attributes.type,
          value: element.attributes.value,
          placeholder: element.attributes.placeholder,
          ariaLabel: element.attributes['aria-label']
        }

        // Só adicionar se tem informação útil
        if (action.text || action.href || action.ariaLabel) {
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

  // Extrair todo texto para resumo
  extractAllText(processedDom: ProcessedElement): string {
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
    return texts.join(' ')
  }

  // Gerar estatísticas completas
  generateStats(processedDom: ProcessedElement): DomStats {
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
    const allText = this.extractAllText(processedDom)

    return {
      totalElements,
      elementsWithIds,
      actionElements,
      images,
      imagesWithoutAlt,
      textLength: allText.length
    }
  }

  // Métodos auxiliares privados
  private isSkippableElement(element: Element): boolean {
    const skippableTags = ['script', 'style', 'svg', 'iframe', 'noscript']
    const tag = element.tagName?.toLowerCase()
    return tag && (
      skippableTags.includes(tag) || 
      (tag === 'link' && element.getAttribute('rel') === 'stylesheet')
    )
  }

  private isActionElement(element: Element): boolean {
    const actionTags = [
      'button', 'a', 'input', 'select', 'textarea', 'label', 
      'form', 'option'
    ]
    
    const tag = element.tagName?.toLowerCase()
    if (!tag) return false

    if (actionTags.includes(tag)) return true

    // Verificar tipos específicos de input
    if (tag === 'input') {
      const type = element.getAttribute('type')?.toLowerCase()
      return type && ['button', 'submit', 'reset', 'checkbox', 'radio'].includes(type)
    }

    // Verificar roles ARIA
    const role = element.getAttribute('role')?.toLowerCase()
    if (role && ['button', 'link', 'checkbox', 'radio', 'textbox', 'combobox'].includes(role)) {
      return true
    }

    // Verificar handlers de click
    if (element.getAttribute('onclick')) return true

    return false
  }

  private isImageElement(element: Element): boolean {
    const tag = element.tagName?.toLowerCase()
    if (tag === 'img') return true
    
    // Verificar background images em divs
    if (tag === 'div') {
      const style = window.getComputedStyle(element)
      return style.backgroundImage !== 'none'
    }
    
    return false
  }

  private processAttributes(element: Element): Record<string, string> {
    const attributes: Record<string, string> = {}

    for (const attr of element.attributes) {
      // Processar URLs relativas
      if (attr.name === 'src' || attr.name === 'href') {
        attributes[attr.name] = this.processUrl(attr.value)
      } else {
        attributes[attr.name] = attr.value
      }
    }

    return attributes
  }

  private processUrl(url: string): string {
    if (this.isLocalUrl(url)) {
      return this.origin + url
    }
    return url
  }

  private isLocalUrl(url: string): boolean {
    return url.startsWith('/') || url.startsWith('./') || url.startsWith('../')
  }

  private extractText(element: Element): string {
    // Pegar apenas texto direto, não de elementos filhos
    let text = ''
    for (const node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent?.trim() + ' '
      }
    }
    return text.trim()
  }

  // Filtrar imagens que realmente precisam de alt text
  filterImagesNeedingAlt(images: ProcessedImage[]): ProcessedImage[] {
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

  // Obter URLs de imagens processáveis
  getProcessableImageUrls(images: ProcessedImage[]): Array<{id: string, url: string}> {
    return images.map(img => ({
      id: img.id,
      url: this.processUrl(img.src)
    }))
  }

  // Validar se URL de imagem é acessível
  isValidImageUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url)
      // Verificar se é http/https
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) return false
      
      // Verificar extensões de imagem comuns
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.bmp']
      const hasImageExtension = imageExtensions.some(ext => 
        parsedUrl.pathname.toLowerCase().includes(ext)
      )
      
      return hasImageExtension || parsedUrl.pathname.includes('image') || parsedUrl.search.includes('image')
    } catch {
      return false
    }
  }
}