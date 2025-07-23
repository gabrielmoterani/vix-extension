import type { ProcessedImage } from './dom/types'
import type { BackgroundImageElement } from './backgroundImageProcessor'

export interface ImageFilterCriteria {
  // Dimensões
  minWidth: number
  minHeight: number
  maxLogoWidth: number
  maxLogoHeight: number
  
  // Localização
  excludeNavigation: boolean
  excludeFooter: boolean
  excludeHeader: boolean
  excludeSidebar: boolean
  
  // Conteúdo
  excludeLogos: boolean
  excludeIcons: boolean
  excludeDecorative: boolean
  
  // URLs
  logoUrlPatterns: string[]
  iconUrlPatterns: string[]
  decorativeUrlPatterns: string[]
}

export interface ImageFilterResult {
  shouldProcess: boolean
  reason: string
  category: 'content' | 'logo' | 'icon' | 'decorative' | 'navigation' | 'small'
  confidence: number // 0-1, quão confiante está na classificação
}

export class ImageFilterService {
  private static readonly DEFAULT_CRITERIA: ImageFilterCriteria = {
    minWidth: 50,  // Reduzido de 100 para 50
    minHeight: 50, // Reduzido de 100 para 50
    maxLogoWidth: 100, // Reduzido de 200 para 100
    maxLogoHeight: 100, // Reduzido de 200 para 100
    excludeNavigation: false, // Desabilitado por padrão
    excludeFooter: false,     // Desabilitado por padrão
    excludeHeader: false,     // Desabilitado por padrão
    excludeSidebar: false,    // Desabilitado por padrão
    excludeLogos: false,      // Desabilitado por padrão
    excludeIcons: true,       // Mantido ativo apenas para ícones óbvios
    excludeDecorative: true,  // Mantido ativo apenas para decorações óbvias
    logoUrlPatterns: [
      'logo', 'brand', 'company-logo', 'trademark', 'emblem', 'favicon'
    ],
    iconUrlPatterns: [
      'icon', 'favicon', 'sprite', 'bullet', 'arrow-', 
      'check-', 'close-', 'menu-', 'search-', 'star-', 'heart-'
    ],
    decorativeUrlPatterns: [
      'decoration', 'ornament', 'divider', 'separator', 
      'pattern', 'texture', 'gradient', 'shadow', 'spacer'
    ]
  }

  /**
   * Filtra uma imagem normal (img tag) para determinar se deve ser processada
   */
  static shouldProcessImage(
    image: ProcessedImage, 
    element?: Element,
    criteria: Partial<ImageFilterCriteria> = {}
  ): ImageFilterResult {
    const config = { ...this.DEFAULT_CRITERIA, ...criteria }
    
    // Verificar dimensões se elemento disponível
    if (element) {
      const dimensionCheck = this.checkImageDimensions(element, config)
      if (!dimensionCheck.shouldProcess) {
        return dimensionCheck
      }
    }
    
    // Verificar URL da imagem
    const urlCheck = this.checkImageUrl(image.src, config)
    if (!urlCheck.shouldProcess) {
      return urlCheck
    }
    
    // Verificar localização no DOM se elemento disponível
    if (element) {
      const locationCheck = this.checkElementLocation(element, config)
      if (!locationCheck.shouldProcess) {
        return locationCheck
      }
    }
    
    // Verificar atributos da imagem
    const attributeCheck = this.checkImageAttributes(image, element)
    if (!attributeCheck.shouldProcess) {
      return attributeCheck
    }
    return {
      shouldProcess: true,
      reason: 'Imagem parece ser conteúdo principal',
      category: 'content',
      confidence: 0.8
    }
  }

  /**
   * Filtra uma imagem de background para determinar se deve ser processada
   */
  static shouldProcessBackgroundImage(
    backgroundImage: BackgroundImageElement,
    criteria: Partial<ImageFilterCriteria> = {}
  ): ImageFilterResult {
    const config = { ...this.DEFAULT_CRITERIA, ...criteria }
    
    // Verificar dimensões do elemento
    const dimensionCheck = this.checkImageDimensions(backgroundImage.element, config)
    if (!dimensionCheck.shouldProcess) {
      return dimensionCheck
    }
    
    // Verificar URL da imagem
    const urlCheck = this.checkImageUrl(backgroundImage.backgroundUrl, config)
    if (!urlCheck.shouldProcess) {
      return urlCheck
    }
    
    // Verificar localização no DOM
    const locationCheck = this.checkElementLocation(backgroundImage.element, config)
    if (!locationCheck.shouldProcess) {
      return locationCheck
    }
    
    // Background images têm maior chance de serem decorativas
    const decorativeCheck = this.checkBackgroundImagePurpose(backgroundImage)
    if (!decorativeCheck.shouldProcess) {
      return decorativeCheck
    }
    
    return {
      shouldProcess: true,
      reason: 'Background image parece ser conteúdo significativo',
      category: 'content',
      confidence: 0.7 // Menor confiança para background images
    }
  }

  /**
   * Verifica dimensões da imagem/elemento
   */
  private static checkImageDimensions(
    element: Element, 
    config: ImageFilterCriteria
  ): ImageFilterResult {
    const rect = element.getBoundingClientRect()
    const { width, height } = rect
    
    // Imagens muito pequenas provavelmente são ícones
    if (width < config.minWidth || height < config.minHeight) {
      return {
        shouldProcess: false,
        reason: `Imagem muito pequena (${Math.round(width)}x${Math.round(height)}px)`,
        category: 'small',
        confidence: 0.9
      }
    }
    
    // Logos são tipicamente pequenos E quadrados E em áreas específicas
    // Uma imagem retangular de notícia não é um logo
    const aspectRatio = Math.max(width, height) / Math.min(width, height)
    const isSquarish = aspectRatio < 1.5 // Menos de 1.5:1 de proporção
    const isSmall = width <= config.maxLogoWidth && height <= config.maxLogoHeight
    
    if (isSmall && isSquarish && config.excludeLogos) {
      return {
        shouldProcess: false,
        reason: `Possível logo (${Math.round(width)}x${Math.round(height)}px, proporção ${aspectRatio.toFixed(1)}:1)`,
        category: 'logo',
        confidence: 0.6
      }
    }
    
    return {
      shouldProcess: true,
      reason: `Dimensões adequadas (${Math.round(width)}x${Math.round(height)}px, proporção ${aspectRatio.toFixed(1)}:1)`,
      category: 'content',
      confidence: 0.8
    }
  }

  /**
   * Verifica URL da imagem para padrões conhecidos
   */
  private static checkImageUrl(url: string, config: ImageFilterCriteria): ImageFilterResult {
    const urlLower = url.toLowerCase()
    
    // Verificar padrões de logo
    if (config.excludeLogos) {
      for (const pattern of config.logoUrlPatterns) {
        if (urlLower.includes(pattern)) {
          return {
            shouldProcess: false,
            reason: `URL contém padrão de logo: "${pattern}"`,
            category: 'logo',
            confidence: 0.85
          }
        }
      }
    }
    
    // Verificar padrões de ícone
    if (config.excludeIcons) {
      for (const pattern of config.iconUrlPatterns) {
        if (urlLower.includes(pattern)) {
          return {
            shouldProcess: false,
            reason: `URL contém padrão de ícone: "${pattern}"`,
            category: 'icon',
            confidence: 0.85
          }
        }
      }
    }
    
    // Verificar padrões decorativos
    if (config.excludeDecorative) {
      for (const pattern of config.decorativeUrlPatterns) {
        if (urlLower.includes(pattern)) {
          return {
            shouldProcess: false,
            reason: `URL contém padrão decorativo: "${pattern}"`,
            category: 'decorative',
            confidence: 0.8
          }
        }
      }
    }
    
    return {
      shouldProcess: true,
      reason: 'URL não contém padrões conhecidos de logo/ícone',
      category: 'content',
      confidence: 0.6
    }
  }

  /**
   * Verifica localização do elemento no DOM
   */
  private static checkElementLocation(
    element: Element, 
    config: ImageFilterCriteria
  ): ImageFilterResult {
    const ancestors = this.getElementAncestors(element)
    const ancestorTags = ancestors.map(el => el.tagName.toLowerCase())
    const ancestorClasses = ancestors.flatMap(el => Array.from(el.classList))
    const ancestorIds = ancestors.map(el => el.id).filter(Boolean)
    
    // Verificar se está em navegação
    if (config.excludeNavigation) {
      const navIndicators = ['nav', 'navbar', 'navigation', 'menu', 'header-nav']
      if (ancestorTags.includes('nav') || 
          this.containsAny(ancestorClasses.concat(ancestorIds), navIndicators)) {
        return {
          shouldProcess: false,
          reason: 'Localizada em área de navegação',
          category: 'navigation',
          confidence: 0.9
        }
      }
    }
    
    // Verificar se está em header
    if (config.excludeHeader) {
      const headerIndicators = ['header', 'masthead', 'top-bar', 'site-header']
      if (ancestorTags.includes('header') ||
          this.containsAny(ancestorClasses.concat(ancestorIds), headerIndicators)) {
        return {
          shouldProcess: false,
          reason: 'Localizada em header',
          category: 'navigation',
          confidence: 0.85
        }
      }
    }
    
    // Verificar se está em footer
    if (config.excludeFooter) {
      const footerIndicators = ['footer', 'site-footer', 'page-footer', 'bottom-bar']
      if (ancestorTags.includes('footer') ||
          this.containsAny(ancestorClasses.concat(ancestorIds), footerIndicators)) {
        return {
          shouldProcess: false,
          reason: 'Localizada em footer',
          category: 'navigation',
          confidence: 0.85
        }
      }
    }
    
    // Verificar se está em sidebar
    if (config.excludeSidebar) {
      const sidebarIndicators = ['sidebar', 'aside', 'widget', 'side-nav']
      if (ancestorTags.includes('aside') ||
          this.containsAny(ancestorClasses.concat(ancestorIds), sidebarIndicators)) {
        return {
          shouldProcess: false,
          reason: 'Localizada em sidebar',
          category: 'navigation',
          confidence: 0.8
        }
      }
    }
    
    return {
      shouldProcess: true,
      reason: 'Localização adequada para processamento',
      category: 'content',
      confidence: 0.7
    }
  }

  /**
   * Verifica atributos da imagem para determinar propósito
   */
  private static checkImageAttributes(
    image: ProcessedImage,
    element: Element | undefined
  ): ImageFilterResult {
    // Se já tem alt text significativo (> 20 caracteres), processar sempre
    // pois o objetivo é melhorar alt texts existentes
    if (image.alt && image.alt.length > 20) {
      return {
        shouldProcess: true,
        reason: 'Imagem já tem alt text significativo - melhorar descrição',
        category: 'content',
        confidence: 0.9
      }
    }
    
    // Verificar se alt existente indica função decorativa (apenas termos muito específicos)
    if (image.alt) {
      const altLower = image.alt.toLowerCase().trim()
      const explicitDecorative = ['decoration', 'ornament', 'divider', 'spacer', '']
      
      if (explicitDecorative.some(term => term && altLower === term)) {
        return {
          shouldProcess: false,
          reason: 'Alt text explicitamente decorativo',
          category: 'decorative',
          confidence: 0.8
        }
      }
    }
    
    // Verificar atributos do elemento se disponível
    if (element) {
      // role="presentation" ou aria-hidden="true" indicam decorativo
      if (element.getAttribute('role') === 'presentation' ||
          element.getAttribute('aria-hidden') === 'true') {
        return {
          shouldProcess: false,
          reason: 'Marcada como decorativa (role=presentation ou aria-hidden=true)',
          category: 'decorative',
          confidence: 0.95
        }
      }
      
      // Classes que indicam função decorativa (ser mais específico)
      const classes = Array.from(element.classList)
      const decorativeClasses = ['decoration-only', 'ornament-only', 'spacer-img', 'divider-img']
      
      if (this.containsAny(classes, decorativeClasses)) {
        return {
          shouldProcess: false,
          reason: 'Classes indicam função explicitamente decorativa',
          category: 'decorative',
          confidence: 0.7
        }
      }
    }
    
    return {
      shouldProcess: true,
      reason: 'Atributos não indicam função decorativa',
      category: 'content',
      confidence: 0.6
    }
  }

  /**
   * Verifica se background image é decorativa ou significativa
   */
  private static checkBackgroundImagePurpose(
    backgroundImage: BackgroundImageElement
  ): ImageFilterResult {
    const element = backgroundImage.element
    
    // Se elemento tem conteúdo textual significativo, background é provavelmente decorativo
    const textContent = element.textContent?.trim() || ''
    if (textContent.length > 50) {
      return {
        shouldProcess: false,
        reason: 'Elemento contém texto significativo, background provavelmente decorativo',
        category: 'decorative',
        confidence: 0.8
      }
    }
    
    // Verificar se é um banner/hero que pode precisar de descrição
    const classes = Array.from(element.classList)
    const heroIndicators = ['hero', 'banner', 'featured', 'highlight', 'showcase']
    
    if (this.containsAny(classes, heroIndicators)) {
      return {
        shouldProcess: true,
        reason: 'Parece ser uma imagem hero/banner importante',
        category: 'content',
        confidence: 0.8
      }
    }
    
    // Background images geralmente são decorativas por padrão
    return {
      shouldProcess: false,
      reason: 'Background image sem indicadores de conteúdo significativo',
      category: 'decorative',
      confidence: 0.7
    }
  }

  /**
   * Obtém todos os ancestrais de um elemento
   */
  private static getElementAncestors(element: Element): Element[] {
    const ancestors: Element[] = []
    let current = element.parentElement
    
    while (current && current !== document.body) {
      ancestors.push(current)
      current = current.parentElement
    }
    
    return ancestors
  }

  /**
   * Verifica se algum item da lista contém algum dos termos
   */
  private static containsAny(items: string[], terms: string[]): boolean {
    return items.some(item => 
      terms.some(term => item.toLowerCase().includes(term))
    )
  }

  /**
   * Filtra uma lista de imagens normais
   */
  static filterImages(
    images: ProcessedImage[],
    criteria: Partial<ImageFilterCriteria> = {}
  ): { processable: ProcessedImage[], filtered: Array<ProcessedImage & {filterResult: ImageFilterResult}> } {
    const processable: ProcessedImage[] = []
    const filtered: Array<ProcessedImage & {filterResult: ImageFilterResult}> = []
    
    images.forEach(image => {
      // Tentar encontrar o elemento DOM correspondente
      const element = document.querySelector(`[data-vix="${image.id}"]`)
      
      const filterResult = this.shouldProcessImage(image, element || undefined, criteria)
      
      if (filterResult.shouldProcess) {
        processable.push(image)
      } else {
        filtered.push({ ...image, filterResult })
      }
    })
    
    return { processable, filtered }
  }

  /**
   * Filtra uma lista de background images
   */
  static filterBackgroundImages(
    backgroundImages: BackgroundImageElement[],
    criteria: Partial<ImageFilterCriteria> = {}
  ): { processable: BackgroundImageElement[], filtered: Array<BackgroundImageElement & {filterResult: ImageFilterResult}> } {
    const processable: BackgroundImageElement[] = []
    const filtered: Array<BackgroundImageElement & {filterResult: ImageFilterResult}> = []
    
    backgroundImages.forEach(bgImage => {
      const filterResult = this.shouldProcessBackgroundImage(bgImage, criteria)
      
      if (filterResult.shouldProcess) {
        processable.push(bgImage)
      } else {
        filtered.push({ ...bgImage, filterResult })
      }
    })
    
    return { processable, filtered }
  }

  /**
   * Obtém estatísticas do filtro
   */
  static getFilterStats(
    totalImages: number,
    processableImages: number,
    filteredByCategory: Record<string, number>
  ) {
    return {
      total: totalImages,
      processable: processableImages,
      filtered: totalImages - processableImages,
      filterRate: ((totalImages - processableImages) / totalImages * 100).toFixed(1) + '%',
      categoryBreakdown: filteredByCategory
    }
  }
}