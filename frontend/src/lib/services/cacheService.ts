/**
 * Cache service for storing and retrieving processed data
 * Supports multiple cache strategies and automatic cleanup
 */

export interface CacheEntry<T = any> {
  data: T
  timestamp: number
  ttl: number // Time to live in milliseconds
  hits: number
}

export interface CacheConfig {
  maxSize: number
  defaultTtl: number // Default TTL in milliseconds
  cleanupInterval: number // Cleanup interval in milliseconds
}

export class CacheService {
  private cache = new Map<string, CacheEntry>()
  private config: CacheConfig
  private cleanupTimer?: NodeJS.Timeout

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: config.maxSize || 500,
      defaultTtl: config.defaultTtl || 30 * 60 * 1000, // 30 minutes
      cleanupInterval: config.cleanupInterval || 5 * 60 * 1000 // 5 minutes
    }

    this.startCleanupTimer()
  }

  /**
   * Store data in cache with optional TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    // Remove oldest entries if at max capacity
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest()
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTtl,
      hits: 0
    })
  }

  /**
   * Retrieve data from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.cache.delete(key)
      return null
    }

    // Update hit count
    entry.hits++
    
    return entry.data as T
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key)
    return entry ? !this.isExpired(entry) : false
  }

  /**
   * Remove specific key from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number
    maxSize: number
    hitRate: number
    totalHits: number
    oldestEntry?: number
    newestEntry?: number
  } {
    const entries = Array.from(this.cache.values())
    const totalHits = entries.reduce((sum, entry) => sum + entry.hits, 0)
    const timestamps = entries.map(e => e.timestamp)

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: totalHits > 0 ? totalHits / entries.length : 0,
      totalHits,
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : undefined,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : undefined
    }
  }

  /**
   * Get or set pattern - fetch data if not cached
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T> | T,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key)
    
    if (cached !== null) {
      return cached
    }

    const data = await fetcher()
    this.set(key, data, ttl)
    return data
  }

  /**
   * Invalidate cache entries by pattern
   */
  invalidatePattern(pattern: RegExp): number {
    let count = 0
    const keysToDelete: string[] = []

    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key)
      count++
    })

    return count
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): number {
    let removed = 0
    const now = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
        removed++
      }
    }

    return removed
  }

  /**
   * Destroy cache and cleanup timers
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }
    this.clear()
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl
  }

  private evictOldest(): void {
    let oldestKey = ''
    let oldestTime = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, this.config.cleanupInterval)
  }
}

/**
 * Specialized cache keys generators for different data types
 */
export class CacheKeyGenerator {
  /**
   * Generate cache key for DOM element
   */
  static domElement(element: {
    tag: string
    attributes: Record<string, string>
    text: string
  }): string {
    const attrHash = this.hashObject(element.attributes)
    const textHash = this.hashString(element.text)
    return `dom:${element.tag}:${attrHash}:${textHash}`
  }

  /**
   * Generate cache key for image alt text
   */
  static imageAlt(url: string, context?: string): string {
    const urlHash = this.hashString(url)
    const contextHash = context ? this.hashString(context) : 'no-context'
    return `image-alt:${urlHash}:${contextHash}`
  }

  /**
   * Generate cache key for WCAG check
   */
  static wcagCheck(domHash: string): string {
    return `wcag:${domHash}`
  }

  /**
   * Generate cache key for URL processing
   */
  static processedUrl(url: string, origin: string): string {
    return `url:${origin}:${this.hashString(url)}`
  }

  /**
   * Generate cache key for page summary
   */
  static pageSummary(textContent: string): string {
    const contentHash = this.hashString(textContent)
    return `summary:${contentHash}`
  }

  private static hashString(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }

  private static hashObject(obj: Record<string, any>): string {
    const sorted = Object.keys(obj)
      .sort()
      .map(key => `${key}:${obj[key]}`)
      .join('|')
    return this.hashString(sorted)
  }
}

// Singleton cache instance
export const globalCache = new CacheService({
  maxSize: 1000,
  defaultTtl: 30 * 60 * 1000, // 30 minutes
  cleanupInterval: 10 * 60 * 1000 // 10 minutes
})