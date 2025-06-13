import { WebExtensionBlocker } from '@ghostery/adblocker-webextension'

export class AdBlockService {
  private blocker: WebExtensionBlocker | null = null
  private isInitialized = false
  private customRules: string[] = []

  constructor() {
    this.initializeBlocker()
  }

  private async initializeBlocker(): Promise<void> {
    try {
      console.log('VIX AdBlock: Inicializando bloqueador...')
      
      // Carregar regras customizadas
      await this.loadCustomRules()
      
      // Inicializar o bloqueador com listas padrão e regras customizadas
      this.blocker = await WebExtensionBlocker.fromPrebuiltAdsAndTracking()
      
      // Adicionar regras customizadas se existirem
      if (this.customRules.length > 0) {
        const customRulesString = this.customRules.join('\n')
        this.blocker.updateFromDiff(customRulesString, '')
        console.log(`VIX AdBlock: Adicionadas ${this.customRules.length} regras customizadas`)
      }
      
      this.isInitialized = true
      console.log('VIX AdBlock: Bloqueador inicializado com sucesso')
    } catch (error) {
      console.error('VIX AdBlock: Erro ao inicializar bloqueador:', error)
      this.isInitialized = false
    }
  }

  private async loadCustomRules(): Promise<void> {
    try {
      // Regras customizadas incorporadas diretamente no código
      const rulesText = `
! VIX Extension Custom Ad Block Rules
##.ad
##.ads
##.advertisement
##.banner
##.sponsored
##.promo
##[class*="ad-"]
##[class*="ads-"]
##[id*="ad-"]
##[id*="ads-"]
||googleads.g.doubleclick.net^
||googlesyndication.com^
||googleadservices.com^
||google-analytics.com^
||facebook.com/tr^
||connect.facebook.net^
||google-analytics.com/analytics.js$script
||google-analytics.com/ga.js$script
||googletagmanager.com/gtag/js$script
||facebook.com/tr$script
##.publicidade
##.anuncio
##.banner-publicidade
##[class*="publicidade"]
##[id*="publicidade"]
##.popup
##.overlay
##.modal-ad
##[class*="popup"]
##.sidebar-ad
##.footer-ad
##.header-ad
##[class*="sidebar-ad"]
##[class*="footer-ad"]
##[width="728"][height="90"]
##[width="300"][height="250"]
##[width="160"][height="600"]
##[width="970"][height="250"]
##.adblock-message
##.ad-blocker-message
##[id*="adblock"]
##[class*="adblock"]
||doubleclick.net^$important
||googlesyndication.com^$important
||amazon-adsystem.com^$important
      `
      
      this.customRules = rulesText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('!')) // Filtrar comentários e linhas vazias
      
      console.log(`VIX AdBlock: Carregadas ${this.customRules.length} regras customizadas`)
    } catch (error) {
      console.warn('VIX AdBlock: Erro ao carregar regras customizadas:', error)
      this.customRules = []
    }
  }

  /**
   * Remove elementos de anúncios da DOM
   */
  public async removeAdsFromDOM(document: Document): Promise<{ removedCount: number; processedSelectors: string[] }> {
    if (!this.isInitialized || !this.blocker) {
      console.warn('VIX AdBlock: Bloqueador não inicializado')
      return { removedCount: 0, processedSelectors: [] }
    }

    let removedCount = 0
    const processedSelectors: string[] = []

    try {
      // Obter seletores de elementos a serem removidos
      const cosmetics = this.blocker.getCosmeticsFilters(window.location.href)
      
      if (cosmetics) {
        // Processar seletores de hide
        if (cosmetics.hide && cosmetics.hide.length > 0) {
          for (const selector of cosmetics.hide) {
            try {
              const elements = document.querySelectorAll(selector)
              if (elements.length > 0) {
                elements.forEach(element => {
                  element.remove()
                  removedCount++
                })
                processedSelectors.push(selector)
              }
            } catch (error) {
              console.warn(`VIX AdBlock: Erro ao processar seletor "${selector}":`, error)
            }
          }
        }

        // Processar injeções de estilo
        if (cosmetics.styles && cosmetics.styles.length > 0) {
          const styleElement = document.createElement('style')
          styleElement.textContent = cosmetics.styles.join('\n')
          document.head.appendChild(styleElement)
        }
      }

      // Aplicar regras customizadas adicionais
      await this.applyCustomAdRemoval(document)

      console.log(`VIX AdBlock: Removidos ${removedCount} elementos de anúncios`)
      return { removedCount, processedSelectors }
    } catch (error) {
      console.error('VIX AdBlock: Erro ao remover anúncios:', error)
      return { removedCount: 0, processedSelectors: [] }
    }
  }

  /**
   * Aplica remoção customizada de anúncios baseada em heurísticas
   */
  private async applyCustomAdRemoval(document: Document): Promise<number> {
    let removedCount = 0

    try {
      // Seletores comuns de anúncios não cobertos pelas listas padrão
      const customSelectors = [
        // Elementos com classes/IDs suspeitos
        '[class*="ad-"], [id*="ad-"]',
        '[class*="ads-"], [id*="ads-"]',
        '[class*="advertisement"], [id*="advertisement"]',
        '[class*="banner"], [id*="banner"]',
        '[class*="sponsored"], [id*="sponsored"]',
        '[class*="promo"], [id*="promo"]',
        '[class*="publicidade"], [id*="publicidade"]',
        '[class*="anuncio"], [id*="anuncio"]',
        
        // Elementos por atributos de dados
        '[data-ad], [data-ads]',
        '[data-advertisement]',
        '[data-sponsored]',
        
        // Elementos por texto
        'div:contains("Publicidade")',
        'div:contains("Anúncio")',
        'div:contains("Sponsored")',
        'div:contains("Advertisement")'
      ]

      for (const selector of customSelectors) {
        try {
          const elements = document.querySelectorAll(selector)
          elements.forEach(element => {
            // Verificar se realmente parece ser um anúncio
            if (this.isLikelyAdElement(element)) {
              element.remove()
              removedCount++
            }
          })
        } catch (error) {
          // Alguns seletores podem falhar (como :contains), ignorar silenciosamente
        }
      }

      // Remover elementos com dimensões típicas de banner
      this.removeBannerSizedElements(document)

    } catch (error) {
      console.error('VIX AdBlock: Erro na remoção customizada:', error)
    }

    return removedCount
  }

  /**
   * Verifica se um elemento provavelmente é um anúncio
   */
  private isLikelyAdElement(element: Element): boolean {
    const tagName = element.tagName.toLowerCase()
    const className = element.className?.toString().toLowerCase() || ''
    const id = element.id?.toLowerCase() || ''
    const textContent = element.textContent?.toLowerCase() || ''

    // Palavras-chave que indicam anúncios
    const adKeywords = [
      'ad', 'ads', 'advertisement', 'banner', 'sponsored', 'promo',
      'publicidade', 'anuncio', 'marketing', 'promotion'
    ]

    // Verificar classes e IDs
    const hasAdKeywordInClassOrId = adKeywords.some(keyword => 
      className.includes(keyword) || id.includes(keyword)
    )

    if (hasAdKeywordInClassOrId) return true

    // Verificar se é um iframe de anúncio
    if (tagName === 'iframe') {
      const src = element.getAttribute('src') || ''
      const adDomains = ['googlesyndication', 'doubleclick', 'googleads', 'amazon-adsystem']
      if (adDomains.some(domain => src.includes(domain))) {
        return true
      }
    }

    // Verificar por texto suspeito
    const adTexts = ['publicidade', 'anúncio', 'sponsored', 'advertisement']
    if (adTexts.some(text => textContent.includes(text))) {
      return true
    }

    return false
  }

  /**
   * Remove elementos com dimensões típicas de banner
   */
  private removeBannerSizedElements(document: Document): void {
    const bannerSizes = [
      { width: 728, height: 90 },   // Leaderboard
      { width: 300, height: 250 },  // Rectangle
      { width: 160, height: 600 },  // Skyscraper
      { width: 970, height: 250 },  // Billboard
      { width: 320, height: 50 },   // Mobile Banner
      { width: 468, height: 60 }    // Banner
    ]

    bannerSizes.forEach(size => {
      const elements = document.querySelectorAll(`[width="${size.width}"][height="${size.height}"]`)
      elements.forEach(element => {
        if (this.isLikelyAdElement(element)) {
          element.remove()
        }
      })
    })
  }

  /**
   * Verifica se uma URL deve ser bloqueada
   */
  public shouldBlockRequest(url: string, type: string = 'other'): boolean {
    if (!this.isInitialized || !this.blocker) {
      return false
    }

    try {
      const request = {
        url,
        type,
        hostname: new URL(url).hostname,
        domain: this.extractDomain(new URL(url).hostname)
      }

      const match = this.blocker.match(request)
      return match.block
    } catch (error) {
      console.warn('VIX AdBlock: Erro ao verificar URL:', url, error)
      return false
    }
  }

  /**
   * Extrai o domínio principal de um hostname
   */
  private extractDomain(hostname: string): string {
    const parts = hostname.split('.')
    if (parts.length >= 2) {
      return parts.slice(-2).join('.')
    }
    return hostname
  }

  /**
   * Adiciona regras customizadas em tempo de execução
   */
  public addCustomRules(rules: string[]): void {
    if (!this.isInitialized || !this.blocker) {
      console.warn('VIX AdBlock: Bloqueador não inicializado')
      return
    }

    try {
      const rulesString = rules.join('\n')
      this.blocker.updateFromDiff(rulesString, '')
      this.customRules.push(...rules)
      console.log(`VIX AdBlock: Adicionadas ${rules.length} regras customizadas`)
    } catch (error) {
      console.error('VIX AdBlock: Erro ao adicionar regras customizadas:', error)
    }
  }

  /**
   * Obtém estatísticas do bloqueador
   */
  public getStats(): { 
    isInitialized: boolean
    customRulesCount: number
    hasBlocker: boolean
  } {
    return {
      isInitialized: this.isInitialized,
      customRulesCount: this.customRules.length,
      hasBlocker: this.blocker !== null
    }
  }

  /**
   * Reinicializa o bloqueador
   */
  public async reinitialize(): Promise<void> {
    this.isInitialized = false
    this.blocker = null
    this.customRules = []
    await this.initializeBlocker()
  }
}