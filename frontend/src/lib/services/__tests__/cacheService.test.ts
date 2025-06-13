/**
 * Basic performance tests for cache service
 */

import { CacheService, CacheKeyGenerator } from '../cacheService'

describe('CacheService Performance Tests', () => {
  let cache: CacheService

  beforeEach(() => {
    cache = new CacheService({
      maxSize: 100,
      defaultTtl: 5000,
      cleanupInterval: 1000
    })
  })

  afterEach(() => {
    cache.destroy()
  })

  test('should cache and retrieve data efficiently', () => {
    const testData = { id: 1, name: 'test', large: 'x'.repeat(1000) }
    const key = 'test-key'

    // Measure set performance
    const setStart = performance.now()
    cache.set(key, testData)
    const setTime = performance.now() - setStart

    // Measure get performance
    const getStart = performance.now()
    const retrieved = cache.get(key)
    const getTime = performance.now() - getStart

    expect(retrieved).toEqual(testData)
    expect(setTime).toBeLessThan(1) // Should be very fast
    expect(getTime).toBeLessThan(1) // Should be very fast
  })

  test('should handle cache misses efficiently', () => {
    const start = performance.now()
    const result = cache.get('non-existent-key')
    const time = performance.now() - start

    expect(result).toBeNull()
    expect(time).toBeLessThan(1)
  })

  test('should generate consistent cache keys', () => {
    const element1 = {
      tag: 'div',
      attributes: { class: 'test', id: 'element1' },
      text: 'Hello World'
    }

    const element2 = {
      tag: 'div',
      attributes: { id: 'element1', class: 'test' }, // Different order
      text: 'Hello World'
    }

    const key1 = CacheKeyGenerator.domElement(element1)
    const key2 = CacheKeyGenerator.domElement(element2)

    expect(key1).toBe(key2) // Should be same despite attribute order
  })

  test('should invalidate patterns efficiently', () => {
    // Add multiple entries with different patterns
    cache.set('dom:element1', { data: 1 })
    cache.set('dom:element2', { data: 2 })
    cache.set('image-alt:url1', 'alt text 1')
    cache.set('image-alt:url2', 'alt text 2')
    cache.set('wcag:check1', [])

    const start = performance.now()
    const invalidated = cache.invalidatePattern(/^dom:/)
    const time = performance.now() - start

    expect(invalidated).toBe(2)
    expect(time).toBeLessThan(5)
    expect(cache.has('dom:element1')).toBe(false)
    expect(cache.has('dom:element2')).toBe(false)
    expect(cache.has('image-alt:url1')).toBe(true)
  })
})

describe('CacheKeyGenerator Tests', () => {
  test('should generate different keys for different content', () => {
    const key1 = CacheKeyGenerator.imageAlt('http://example.com/image1.jpg', 'context1')
    const key2 = CacheKeyGenerator.imageAlt('http://example.com/image2.jpg', 'context1')
    const key3 = CacheKeyGenerator.imageAlt('http://example.com/image1.jpg', 'context2')

    expect(key1).not.toBe(key2)
    expect(key1).not.toBe(key3)
    expect(key2).not.toBe(key3)
  })

  test('should generate same keys for same content', () => {
    const url = 'http://example.com/image.jpg'
    const context = 'page about products'

    const key1 = CacheKeyGenerator.imageAlt(url, context)
    const key2 = CacheKeyGenerator.imageAlt(url, context)

    expect(key1).toBe(key2)
  })
})