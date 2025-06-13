import axe from "axe-core"
import { globalCache, CacheKeyGenerator } from './cacheService'

export interface WcagViolation {
  id: string
  impact?: string
  description: string
  nodes: Array<{ target: string[]; html: string }>
}

export class WcagCheckService {
  async runCheck(): Promise<WcagViolation[]> {
    // Generate cache key based on current DOM state
    const domHash = this.generateDomHash()
    const cacheKey = CacheKeyGenerator.wcagCheck(domHash)
    
    // Check cache first
    const cached = globalCache.get<WcagViolation[]>(cacheKey)
    if (cached) {
      console.log('VIX: WCAG check results found in cache')
      return cached
    }

    console.log('VIX: Running WCAG check...')
    const results = await axe.run()
    
    const violations = results.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      description: v.description,
      nodes: v.nodes.map((n) => ({
        target: n.target as string[],
        html: n.html
      }))
    }))

    // Cache results with medium TTL since DOM can change frequently
    globalCache.set(cacheKey, violations, 10 * 60 * 1000) // 10 minutes
    
    console.log(`VIX: WCAG check completed, found ${violations.length} violations`)
    return violations
  }

  private generateDomHash(): string {
    // Generate a hash based on DOM structure that affects accessibility
    const elements = document.querySelectorAll('img, button, a, input, [role], [aria-label], [alt]')
    const signatures: string[] = []

    elements.forEach(el => {
      const signature = [
        el.tagName,
        el.getAttribute('role') || '',
        el.getAttribute('aria-label') || '',
        el.getAttribute('alt') || '',
        el.textContent?.substring(0, 50) || ''
      ].join('|')
      signatures.push(signature)
    })

    const combined = signatures.join(';;')
    let hash = 0
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(36)
  }
}
