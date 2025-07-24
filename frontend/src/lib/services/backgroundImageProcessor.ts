export interface BackgroundImageElement {
  id: string
  element: Element
  backgroundUrl: string
  needsAlt: boolean
  currentAlt?: string
}

export class BackgroundImageProcessor {
  /**
   * Extrai URLs de background-image de um elemento
   */
  static extractBackgroundImageUrl(element: Element): string | null {
    if (!element) return null

    const computedStyle = window.getComputedStyle(element)
    const backgroundImage = computedStyle.backgroundImage

    if (!backgroundImage || backgroundImage === 'none') {
      return null
    }

    // Extrair URL do background-image
    // backgroundImage pode ser: url("image.jpg"), url('image.jpg'), url(image.jpg)
    const urlMatch = backgroundImage.match(/url\(['"]?([^'")]+)['"]?\)/)
    if (!urlMatch) {
      return null
    }

    let url = urlMatch[1]

    // Converter URL relativa para absoluta se necessário
    try {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url
      } else if (url.startsWith('//')) {
        return window.location.protocol + url
      } else if (url.startsWith('/')) {
        return window.location.origin + url
      } else {
        // URL relativa
        const baseUrl = new URL(window.location.href)
        return new URL(url, baseUrl).href
      }
    } catch (error) {
      console.warn('VIX: Erro ao processar URL de background-image:', url, error)
      return null
    }
  }

  /**
   * Verifica se um elemento com background-image precisa de alt text
   */
  static needsAltText(element: Element): boolean {
    // Verificar se já tem aria-label
    if (element.getAttribute('aria-label')) {
      return false
    }

    // Verificar se já tem role="img" com aria-labelledby
    if (element.getAttribute('role') === 'img' && element.getAttribute('aria-labelledby')) {
      return false
    }

    // Verificar se tem texto significativo dentro
    const textContent = element.textContent?.trim()
    if (textContent && textContent.length > 10) {
      return false
    }

    return true
  }

  /**
   * Detecta todos os elementos com background-image em um documento
   */
  static detectBackgroundImages(rootElement: Element = document.body): BackgroundImageElement[] {
    const backgroundImages: BackgroundImageElement[] = []
    
    const walker = document.createTreeWalker(
      rootElement,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node) => {
          const element = node as Element
          
          // Pular elementos que não são visíveis
          const style = window.getComputedStyle(element)
          if (style.display === 'none' || style.visibility === 'hidden') {
            return NodeFilter.FILTER_REJECT
          }

          // Verificar se tem background-image
          const backgroundUrl = this.extractBackgroundImageUrl(element)
          if (backgroundUrl) {
            return NodeFilter.FILTER_ACCEPT
          }

          return NodeFilter.FILTER_SKIP
        }
      }
    )

    let node: Node | null
    while ((node = walker.nextNode())) {
      const element = node as Element
      const backgroundUrl = this.extractBackgroundImageUrl(element)
      
      if (backgroundUrl) {
        const dataVixId = element.getAttribute('data-vix')
        if (dataVixId) {
          backgroundImages.push({
            id: dataVixId,
            element,
            backgroundUrl,
            needsAlt: this.needsAltText(element),
            currentAlt: element.getAttribute('aria-label') || undefined
          })
        }
      }
    }

    return backgroundImages
  }

  /**
   * Aplica alt text a um elemento com background-image
   */
  static applyAltText(element: Element, altText: string): boolean {
    try {
      // Definir role="img" se não existir
      if (!element.getAttribute('role')) {
        element.setAttribute('role', 'img')
      }

      // Adicionar aria-label
      element.setAttribute('aria-label', altText)

      // Adicionar data-vix-bg-alt para marcar que foi processado
      element.setAttribute('data-vix-bg-alt', 'true')

      console.log(`VIX: Alt text aplicado a elemento background:`, altText)
      return true
    } catch (error) {
      console.error('VIX: Erro ao aplicar alt text a background-image:', error)
      return false
    }
  }

  /**
   * Remove alt text aplicado a um elemento background
   */
  static removeAltText(element: Element): boolean {
    try {
      element.removeAttribute('aria-label')
      element.removeAttribute('data-vix-bg-alt')
      
      // Remover role="img" apenas se foi adicionado por nós
      // (não remover se já existia)
      if (element.getAttribute('role') === 'img' && 
          !element.hasAttribute('data-original-role')) {
        element.removeAttribute('role')
      }

      return true
    } catch (error) {
      console.error('VIX: Erro ao remover alt text de background-image:', error)
      return false
    }
  }

  /**
   * Converte elementos background para formato compatível com ImageAltService
   */
  static toImageAltFormat(backgroundImages: BackgroundImageElement[]): Array<{id: string, url: string, originalAlt?: string}> {
    return backgroundImages
      .filter(img => img.needsAlt)
      .map(img => ({
        id: img.id,
        url: img.backgroundUrl,
        originalAlt: img.element.getAttribute('aria-label') || img.element.getAttribute('title') || undefined
      }))
  }
}