/**
 * Analisador de elementos para identificar tipos e características
 */
export class ElementAnalyzer {
  /**
   * Verifica se um elemento deve ser ignorado no processamento
   */
  static isSkippableElement(element: Element): boolean {
    const skippableTags = ['script', 'style', 'svg', 'iframe', 'noscript']
    const tag = element.tagName?.toLowerCase()
    return tag && (
      skippableTags.includes(tag) || 
      (tag === 'link' && element.getAttribute('rel') === 'stylesheet')
    )
  }

  /**
   * Verifica se um elemento é interativo/acionável
   */
  static isActionElement(element: Element): boolean {
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

  /**
   * Verifica se um elemento é uma imagem
   */
  static isImageElement(element: Element): boolean {
    const tag = element.tagName?.toLowerCase()
    if (tag === 'img') return true
    
    // Verificar background images em divs
    if (tag === 'div') {
      const style = window.getComputedStyle(element)
      return style.backgroundImage !== 'none'
    }
    
    return false
  }

  /**
   * Extrai texto direto de um elemento (não recursivo)
   */
  static extractDirectText(element: Element): string {
    let text = ''
    for (const node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent?.trim() + ' '
      }
    }
    return text.trim()
  }

  /**
   * Processa atributos de um elemento, tratando URLs
   */
  static processAttributes(element: Element, origin: string): Record<string, string> {
    const attributes: Record<string, string> = {}

    for (const attr of element.attributes) {
      // Processar URLs relativas
      if (attr.name === 'src' || attr.name === 'href') {
        attributes[attr.name] = this.processUrl(attr.value, origin)
      } else {
        attributes[attr.name] = attr.value
      }
    }

    return attributes
  }

  /**
   * Processa URLs convertendo relativas para absolutas
   */
  private static processUrl(url: string, origin: string): string {
    return this.isLocalUrl(url) ? origin + url : url
  }

  /**
   * Verifica se uma URL é local/relativa
   */
  private static isLocalUrl(url: string): boolean {
    return url.startsWith('/') || url.startsWith('./') || url.startsWith('../')
  }

  /**
   * Valida se uma URL de imagem é acessível
   */
  static isValidImageUrl(url: string): boolean {
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