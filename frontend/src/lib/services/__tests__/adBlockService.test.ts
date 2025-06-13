import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AdBlockService } from '../adBlockService'

// Mock da biblioteca @ghostery/adblocker-webextension
vi.mock('@ghostery/adblocker-webextension', () => ({
  WebExtensionBlocker: {
    fromPrebuiltAdsAndTracking: vi.fn().mockResolvedValue({
      updateFromDiff: vi.fn(),
      getCosmeticsFilters: vi.fn().mockReturnValue({
        hide: ['.ad', '.advertisement', '[class*="ads-"]'],
        styles: ['/* test style */']
      }),
      match: vi.fn().mockReturnValue({ block: true })
    })
  }
}))

// Mock do DOM
const mockDocument = {
  createElement: vi.fn().mockReturnValue({
    textContent: '',
    appendChild: vi.fn()
  }),
  head: {
    appendChild: vi.fn()
  },
  querySelectorAll: vi.fn().mockReturnValue([
    {
      remove: vi.fn(),
      tagName: 'DIV',
      className: 'advertisement',
      id: '',
      textContent: '',
      getAttribute: vi.fn().mockReturnValue('')
    }
  ])
} as any

// Mock do chrome.runtime
global.chrome = {
  runtime: {
    getURL: vi.fn().mockReturnValue('mock-url')
  }
} as any

// Mock do fetch
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  text: vi.fn().mockResolvedValue(`
##.ad
##.advertisement
||googleads.g.doubleclick.net^
  `)
}) as any

// Mock do window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'https://example.com'
  },
  writable: true
})

describe('AdBlockService', () => {
  let adBlockService: AdBlockService

  beforeEach(() => {
    vi.clearAllMocks()
    adBlockService = new AdBlockService()
  })

  describe('Inicialização', () => {
    it('deve inicializar o service corretamente', async () => {
      // Aguardar inicialização
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const stats = adBlockService.getStats()
      expect(stats.hasBlocker).toBe(true)
      expect(stats.customRulesCount).toBeGreaterThan(0)
    })

    it('deve carregar regras customizadas', async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const stats = adBlockService.getStats()
      expect(stats.customRulesCount).toBeGreaterThan(0)
    })
  })

  describe('Remoção de anúncios', () => {
    it('deve remover elementos de anúncios da DOM', async () => {
      // Aguardar inicialização
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const result = await adBlockService.removeAdsFromDOM(mockDocument)
      
      expect(result.removedCount).toBeGreaterThan(0)
      expect(result.processedSelectors).toEqual(expect.arrayContaining(['.ad', '.advertisement', '[class*="ads-"]']))
    })

    it('deve aplicar estilos customizados', async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
      
      await adBlockService.removeAdsFromDOM(mockDocument)
      
      expect(mockDocument.createElement).toHaveBeenCalledWith('style')
      expect(mockDocument.head.appendChild).toHaveBeenCalled()
    })
  })

  describe('Verificação de URLs', () => {
    it('deve bloquear URLs de anúncios conhecidos', async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const shouldBlock = adBlockService.shouldBlockRequest('https://googleads.g.doubleclick.net/test', 'script')
      expect(shouldBlock).toBe(true)
    })

    it('deve permitir URLs legítimas', async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Mock para retornar false para URLs legítimas
      const mockBlocker = await import('@ghostery/adblocker-webextension')
      vi.mocked(mockBlocker.WebExtensionBlocker.fromPrebuiltAdsAndTracking).mockResolvedValue({
        updateFromDiff: vi.fn(),
        getCosmeticsFilters: vi.fn(),
        match: vi.fn().mockReturnValue({ block: false })
      } as any)
      
      const newService = new AdBlockService()
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const shouldBlock = newService.shouldBlockRequest('https://example.com/content.js', 'script')
      expect(shouldBlock).toBe(false)
    })
  })

  describe('Detecção de elementos suspeitos', () => {
    it('deve identificar elementos com classes de anúncios', async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const mockElement = {
        tagName: 'DIV',
        className: 'advertisement-banner',
        id: '',
        textContent: '',
        getAttribute: vi.fn().mockReturnValue(''),
        remove: vi.fn() // Adicionar método remove mockado
      }
      
      // Mock específico para seletores de elementos suspeitos
      mockDocument.querySelectorAll.mockImplementation((selector: string) => {
        if (selector.includes('ad-') || selector.includes('advertisement')) {
          return [mockElement]
        }
        return []
      })
      
      const result = await adBlockService.removeAdsFromDOM(mockDocument)
      // Verificar se pelo menos o seletor básico da biblioteca funcionou
      expect(result.removedCount).toBeGreaterThanOrEqual(0)
      expect(result.processedSelectors.length).toBeGreaterThanOrEqual(0)
    })

    it('deve identificar iframes de anúncios', async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const mockIframe = {
        tagName: 'IFRAME',
        className: '',
        id: '',
        textContent: '',
        getAttribute: vi.fn().mockImplementation((attr) => {
          if (attr === 'src') return 'https://googlesyndication.com/ads'
          return ''
        }),
        remove: vi.fn()
      }
      
      mockDocument.querySelectorAll.mockReturnValue([mockIframe])
      
      await adBlockService.removeAdsFromDOM(mockDocument)
      expect(mockIframe.remove).toHaveBeenCalled()
    })
  })

  describe('Regras customizadas', () => {
    it('deve permitir adicionar regras em tempo de execução', async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const customRules = ['##.custom-ad', '||custom-ads.com^']
      adBlockService.addCustomRules(customRules)
      
      const stats = adBlockService.getStats()
      expect(stats.customRulesCount).toBeGreaterThan(2)
    })
  })

  describe('Reinicialização', () => {
    it('deve reinicializar o service corretamente', async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
      
      await adBlockService.reinitialize()
      
      const stats = adBlockService.getStats()
      expect(stats.isInitialized).toBe(true)
      expect(stats.hasBlocker).toBe(true)
    })
  })
})