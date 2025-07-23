import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ImageFilterService } from '../imageFilterService'
import type { ProcessedImage } from '../dom/types'
import type { BackgroundImageElement } from '../backgroundImageProcessor'

// Mock DOM APIs
Object.defineProperty(window, 'getComputedStyle', {
  value: vi.fn(() => ({
    backgroundImage: 'none',
    display: 'block',
    visibility: 'visible'
  })),
  writable: true
})

const mockGetBoundingClientRect = vi.fn(() => ({
  width: 200,
  height: 150,
  top: 0,
  left: 0,
  right: 200,
  bottom: 150
}))

const createMockElement = (overrides: Partial<Element> = {}): Element => {
  const element = {
    tagName: 'IMG',
    classList: [],
    getAttribute: vi.fn(),
    hasAttribute: vi.fn(),
    parentElement: null,
    getBoundingClientRect: mockGetBoundingClientRect,
    textContent: '',
    id: '',
    ...overrides
  } as unknown as Element

  return element
}

const createMockImage = (overrides: Partial<ProcessedImage> = {}): ProcessedImage => ({
  id: 'test-image-1',
  src: 'https://example.com/image.jpg',
  alt: '',
  needsAlt: true,
  ...overrides
})

const createMockBackgroundImage = (overrides: Partial<BackgroundImageElement> = {}): BackgroundImageElement => ({
  id: 'test-bg-1',
  element: createMockElement(),
  backgroundUrl: 'https://example.com/bg.jpg',
  needsAlt: true,
  ...overrides
})

describe('ImageFilterService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetBoundingClientRect.mockReturnValue({
      width: 200,
      height: 150,
      top: 0,
      left: 0,
      right: 200,
      bottom: 150
    })
  })

  describe('shouldProcessImage', () => {
    it('should process normal content images', () => {
      const image = createMockImage({
        src: 'https://example.com/content/article-photo.jpg'
      })
      const element = createMockElement()

      const result = ImageFilterService.shouldProcessImage(image, element)

      expect(result.shouldProcess).toBe(true)
      expect(result.category).toBe('content')
    })

    it('should filter out very small images', () => {
      const image = createMockImage()
      const element = createMockElement()
      mockGetBoundingClientRect.mockReturnValue({
        width: 30,  // Menor que 50px
        height: 30,
        top: 0,
        left: 0,
        right: 30,
        bottom: 30
      })

      const result = ImageFilterService.shouldProcessImage(image, element)

      expect(result.shouldProcess).toBe(false)
      expect(result.category).toBe('small')
      expect(result.reason).toContain('muito pequena')
    })

    it('should process logo images since excludeLogos is false by default', () => {
      const image = createMockImage({
        src: 'https://example.com/assets/company-logo.png'
      })

      const result = ImageFilterService.shouldProcessImage(image)

      expect(result.shouldProcess).toBe(true)
      expect(result.category).toBe('content')
    })

    it('should filter out icon images by URL pattern', () => {
      const image = createMockImage({
        src: 'https://example.com/icons/menu-icon.svg'
      })

      const result = ImageFilterService.shouldProcessImage(image)

      expect(result.shouldProcess).toBe(false)
      expect(result.category).toBe('icon')
      expect(result.reason).toContain('ícone')
    })

    it('should process images in navigation since excludeNavigation is false by default', () => {
      const image = createMockImage()
      const navElement = createMockElement({
        tagName: 'NAV'
      })
      const element = createMockElement({
        parentElement: navElement
      })

      const result = ImageFilterService.shouldProcessImage(image, element)

      expect(result.shouldProcess).toBe(true)
      expect(result.category).toBe('content')
    })

    it('should process images in header since excludeHeader is false by default', () => {
      const image = createMockImage()
      const headerElement = createMockElement({
        tagName: 'HEADER'
      })
      const element = createMockElement({
        parentElement: headerElement
      })

      const result = ImageFilterService.shouldProcessImage(image, element)

      expect(result.shouldProcess).toBe(true)
      expect(result.category).toBe('content')
    })

    it('should process images in footer since excludeFooter is false by default', () => {
      const image = createMockImage()
      const footerElement = createMockElement({
        tagName: 'FOOTER'
      })
      const element = createMockElement({
        parentElement: footerElement
      })

      const result = ImageFilterService.shouldProcessImage(image, element)

      expect(result.shouldProcess).toBe(true)
      expect(result.category).toBe('content')
    })

    it('should filter out images marked as decorative', () => {
      const image = createMockImage()
      const element = createMockElement()
      element.getAttribute = vi.fn((attr) => {
        if (attr === 'role') return 'presentation'
        return null
      })

      const result = ImageFilterService.shouldProcessImage(image, element)

      expect(result.shouldProcess).toBe(false)
      expect(result.category).toBe('decorative')
      expect(result.reason).toContain('decorativa')
    })

    it('should filter out images with aria-hidden=true', () => {
      const image = createMockImage()
      const element = createMockElement()
      element.getAttribute = vi.fn((attr) => {
        if (attr === 'aria-hidden') return 'true'
        return null
      })

      const result = ImageFilterService.shouldProcessImage(image, element)

      expect(result.shouldProcess).toBe(false)
      expect(result.category).toBe('decorative')
      expect(result.reason).toContain('aria-hidden=true')
    })

    it('should process potential logos since excludeLogos is false by default', () => {
      const image = createMockImage()
      const element = createMockElement()
      mockGetBoundingClientRect.mockReturnValue({
        width: 150,
        height: 150,
        top: 0,
        left: 0,
        right: 150,
        bottom: 150
      })

      const result = ImageFilterService.shouldProcessImage(image, element)

      expect(result.shouldProcess).toBe(true)
      expect(result.category).toBe('content')
    })
  })

  describe('shouldProcessBackgroundImage', () => {
    it('should filter out background images with significant text content', () => {
      const element = createMockElement({
        textContent: 'This is a long text content that makes the background probably decorative'
      })
      const bgImage = createMockBackgroundImage({ element })

      const result = ImageFilterService.shouldProcessBackgroundImage(bgImage)

      expect(result.shouldProcess).toBe(false)
      expect(result.category).toBe('decorative')
      expect(result.reason).toContain('texto significativo')
    })

    it('should process hero/banner background images', () => {
      const element = createMockElement({
        classList: ['hero', 'banner']
      })
      
      const bgImage = createMockBackgroundImage({ element })

      const result = ImageFilterService.shouldProcessBackgroundImage(bgImage)

      expect(result.shouldProcess).toBe(true)
      expect(result.category).toBe('content')
      // O fallback padrão é usado quando não há texto e não é um banner identificado
      expect(result.reason).toContain('significativo')
    })

    it('should filter very small background images', () => {
      const bgImage = createMockBackgroundImage()
      mockGetBoundingClientRect.mockReturnValue({
        width: 30,  // Menor que 50px
        height: 30,
        top: 0,
        left: 0,
        right: 30,
        bottom: 30
      })

      const result = ImageFilterService.shouldProcessBackgroundImage(bgImage)

      expect(result.shouldProcess).toBe(false)
      expect(result.category).toBe('small')
    })
  })

  describe('filterImages', () => {
    it('should correctly separate processable and filtered images', () => {
      const images = [
        createMockImage({ src: 'https://example.com/content.jpg' }),
        createMockImage({ src: 'https://example.com/logo.png' }),
        createMockImage({ src: 'https://example.com/icon.svg' })
      ]

      // Mock document.querySelector to return null (simulating no DOM element found)
      const originalQuerySelector = document.querySelector
      document.querySelector = vi.fn(() => null)

      const result = ImageFilterService.filterImages(images)

      expect(result.processable).toHaveLength(2)  // content.jpg e logo.png agora são processados
      expect(result.filtered).toHaveLength(1)   // apenas icon.svg é filtrado
      expect(result.processable[0].src).toContain('content.jpg')
      expect(result.filtered.map(f => f.filterResult.category)).toEqual(['icon'])

      // Restore original querySelector
      document.querySelector = originalQuerySelector
    })
  })

  describe('filterBackgroundImages', () => {
    it('should correctly separate processable and filtered background images', () => {
      const bgImages = [
        createMockBackgroundImage({
          backgroundUrl: 'https://example.com/hero-bg.jpg',
          element: createMockElement({ classList: ['hero'] })
        }),
        createMockBackgroundImage({
          backgroundUrl: 'https://example.com/decorative-bg.jpg',
          element: createMockElement({ textContent: 'This is significant text content', classList: [] })
        })
      ]

      const result = ImageFilterService.filterBackgroundImages(bgImages)

      expect(result.processable).toHaveLength(1)
      expect(result.filtered).toHaveLength(1)
      expect(result.processable[0].backgroundUrl).toContain('hero-bg.jpg')
      expect(result.filtered[0].filterResult.category).toBe('decorative')
    })
  })

  describe('getFilterStats', () => {
    it('should calculate correct statistics', () => {
      const stats = ImageFilterService.getFilterStats(
        10, // total
        6,  // processable
        { logo: 2, icon: 1, small: 1 } // filtered by category
      )

      expect(stats.total).toBe(10)
      expect(stats.processable).toBe(6)
      expect(stats.filtered).toBe(4)
      expect(stats.filterRate).toBe('40.0%')
      expect(stats.categoryBreakdown).toEqual({ logo: 2, icon: 1, small: 1 })
    })
  })
})