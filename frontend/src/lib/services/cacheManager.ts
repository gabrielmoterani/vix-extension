/**
 * Cache manager for coordinating cache invalidation across different services
 */

import { globalCache } from './cacheService'

export interface CacheInvalidationEvent {
  type: 'dom-change' | 'navigation' | 'manual' | 'dom-mutation'
  affectedPatterns?: RegExp[]
  reason?: string
}

export class CacheManager {
  private static instance: CacheManager
  private observers: MutationObserver[] = []
  private lastUrl = ''

  private constructor() {
    this.setupInvalidationTriggers()
  }

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager()
    }
    return CacheManager.instance
  }

  /**
   * Setup automatic cache invalidation triggers
   */
  private setupInvalidationTriggers(): void {
    // Invalidate on navigation
    this.setupNavigationInvalidation()
    
    // Invalidate on DOM mutations that affect cached data
    this.setupDomMutationInvalidation()
    
    // Invalidate on visibility change (tab switch)
    this.setupVisibilityInvalidation()
  }

  /**
   * Setup navigation-based cache invalidation
   */
  private setupNavigationInvalidation(): void {
    this.lastUrl = window.location.href

    // Listen for URL changes (SPA navigation)
    const checkUrlChange = () => {
      const currentUrl = window.location.href
      if (currentUrl !== this.lastUrl) {
        this.invalidateCache({
          type: 'navigation',
          reason: `Navigation from ${this.lastUrl} to ${currentUrl}`
        })
        this.lastUrl = currentUrl
      }
    }

    // Check URL changes periodically (fallback for history API)
    setInterval(checkUrlChange, 1000)

    // Listen for popstate events
    window.addEventListener('popstate', () => {
      setTimeout(checkUrlChange, 100)
    })
  }

  /**
   * Setup DOM mutation-based cache invalidation
   */
  private setupDomMutationInvalidation(): void {
    // Observer for accessibility-related changes
    const accessibilityObserver = new MutationObserver((mutations) => {
      let shouldInvalidateWcag = false
      let shouldInvalidateDom = false

      mutations.forEach((mutation) => {
        // Check for accessibility attribute changes
        if (mutation.type === 'attributes') {
          const target = mutation.target as Element
          const accessibilityAttrs = ['alt', 'aria-label', 'role', 'aria-describedby', 'title']
          
          if (accessibilityAttrs.includes(mutation.attributeName || '')) {
            shouldInvalidateWcag = true
          }
        }

        // Check for structural changes
        if (mutation.type === 'childList' && 
            (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0)) {
          shouldInvalidateDom = true
          shouldInvalidateWcag = true
        }
      })

      if (shouldInvalidateWcag) {
        this.invalidateWcagCache()
      }

      if (shouldInvalidateDom) {
        this.invalidateDomCache()
      }
    })

    // Start observing
    accessibilityObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['alt', 'aria-label', 'role', 'aria-describedby', 'title', 'src', 'href']
    })

    this.observers.push(accessibilityObserver)
  }

  /**
   * Setup visibility-based cache invalidation
   */
  private setupVisibilityInvalidation(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        // Invalidate short-lived caches when user returns to tab
        this.invalidateCache({
          type: 'manual',
          affectedPatterns: [/^wcag:/, /^summary:/],
          reason: 'Tab became visible - refreshing dynamic content'
        })
      }
    })
  }

  /**
   * Invalidate cache based on event
   */
  invalidateCache(event: CacheInvalidationEvent): number {
    console.log(`VIX Cache: Invalidating cache due to ${event.type}`, event.reason)

    let totalInvalidated = 0

    if (event.affectedPatterns) {
      event.affectedPatterns.forEach(pattern => {
        const count = globalCache.invalidatePattern(pattern)
        totalInvalidated += count
        console.log(`VIX Cache: Invalidated ${count} entries matching pattern ${pattern}`)
      })
    } else {
      // Full invalidation for navigation events
      if (event.type === 'navigation') {
        globalCache.clear()
        totalInvalidated = -1 // Indicate full clear
        console.log('VIX Cache: Full cache cleared due to navigation')
      }
    }

    return totalInvalidated
  }

  /**
   * Invalidate WCAG-related caches
   */
  invalidateWcagCache(): void {
    const count = globalCache.invalidatePattern(/^wcag:/)
    console.log(`VIX Cache: Invalidated ${count} WCAG cache entries`)
  }

  /**
   * Invalidate DOM processing caches
   */
  invalidateDomCache(): void {
    const count = globalCache.invalidatePattern(/^dom:/)
    console.log(`VIX Cache: Invalidated ${count} DOM processing cache entries`)
  }

  /**
   * Invalidate image alt text caches
   */
  invalidateImageAltCache(): void {
    const count = globalCache.invalidatePattern(/^image-alt:/)
    console.log(`VIX Cache: Invalidated ${count} image alt cache entries`)
  }

  /**
   * Invalidate URL processing caches
   */
  invalidateUrlCache(): void {
    const count = globalCache.invalidatePattern(/^url:/)
    console.log(`VIX Cache: Invalidated ${count} URL processing cache entries`)
  }

  /**
   * Manual cache invalidation with optional patterns
   */
  manualInvalidation(patterns?: RegExp[], reason = 'Manual invalidation'): number {
    return this.invalidateCache({
      type: 'manual',
      affectedPatterns: patterns,
      reason
    })
  }

  /**
   * Get cache statistics including invalidation info
   */
  getCacheStats(): {
    cacheStats: any
    observersActive: number
    lastUrl: string
  } {
    return {
      cacheStats: globalCache.getStats(),
      observersActive: this.observers.length,
      lastUrl: this.lastUrl
    }
  }

  /**
   * Cleanup observers and timers
   */
  destroy(): void {
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []
    globalCache.destroy()
  }
}

// Initialize cache manager singleton
export const cacheManager = CacheManager.getInstance()