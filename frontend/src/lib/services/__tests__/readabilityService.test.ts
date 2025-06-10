// src/lib/services/__tests__/readabilityService.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { ReadabilityService } from '../readabilityService'

describe('ReadabilityService', () => {
  let service: ReadabilityService
  let mockDocument: Document

  beforeEach(() => {
    service = new ReadabilityService()
    mockDocument = new DOMParser().parseFromString(`
      <html>
        <head>
          <title>Test Article</title>
          <meta property="og:site_name" content="Test Site">
        </head>
        <body>
          <header>Header</header>
          <nav>Navigation</nav>
          <main>
            <article>
              <h1>Main Article Title</h1>
              <div class="byline">By Test Author</div>
              <p>This is the first paragraph of the main article content.</p>
              <p>This is another paragraph with more content to make it substantial.</p>
              <p>And here's a third paragraph to ensure we have enough content.</p>
            </article>
          </main>
          <aside class="ad">Advertisement</aside>
          <footer>Footer</footer>
        </body>
      </html>
    `, 'text/html')
  })

  it('should successfully parse document with Readability', () => {
    const result = service.parseDocument(mockDocument)
    
    expect(result.success).toBe(true)
    expect(result.article).toBeDefined()
    expect(result.article!.title).toBe('Test Article')
    expect(result.article!.textContent).toContain('main article content')
    expect(result.fallbackUsed).toBe(false)
  })

  it('should use fallback when Readability fails', () => {
    // Criar documento que vai falhar no Readability
    const badDocument = new DOMParser().parseFromString(`
      <html><body><div>Not enough content</div></body></html>
    `, 'text/html')
    
    const result = service.parseDocument(badDocument)
    
    expect(result.success).toBe(true)
    expect(result.fallbackUsed).toBe(true)
  })

  it('should identify readability candidates correctly', () => {
    expect(service.isReadabilityCandidate(mockDocument)).toBe(true)
    
    const tinyDocument = new DOMParser().parseFromString(
      '<html><body>tiny</body></html>', 
      'text/html'
    )
    expect(service.isReadabilityCandidate(tinyDocument)).toBe(false)
  })

  it('should extract text content', () => {
    const text = service.extractTextContent(mockDocument)
    expect(text).toContain('main article content')
    expect(text.length).toBeGreaterThan(50)
  })

  it('should cache results', () => {
    service.parseDocument(mockDocument)
    service.parseDocument(mockDocument) // Segunda chamada deve usar cache
    
    const stats = service.getCacheStats()
    expect(stats.size).toBe(1)
  })

  it('should clear cache', () => {
    service.parseDocument(mockDocument)
    service.clearCache()
    
    const stats = service.getCacheStats()
    expect(stats.size).toBe(0)
  })
})