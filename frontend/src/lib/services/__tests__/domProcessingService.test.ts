import { describe, it, expect, beforeEach } from 'vitest'
import { DomProcessingService, ProcessedElement } from '../domProcessingService'

let service: DomProcessingService
let processed: ProcessedElement

function setupDom() {
  document.body.innerHTML = `
    <div data-vix="1"><p>Hello <span>world</span></p></div>
    <img data-vix="2" src="/img.png" alt="sample image" />
    <img data-vix="3" src="/photo.jpg" />
    <a data-vix="4" href="/link">Link</a>
    <button data-vix="5">Click</button>
  `
}

beforeEach(() => {
  setupDom()
  service = new DomProcessingService()
  processed = service.processDom(document)! as ProcessedElement
})

describe('DomProcessingService', () => {
  it('processDom should return body element', () => {
    expect(processed.tag).toBe('body')
    expect(processed.children.length).toBeGreaterThan(0)
  })

  it('extractImages should find two images', () => {
    const images = service.extractImages(processed)
    expect(images.length).toBe(2)
    expect(images[0].id).toBe('2')
  })

  it('extractActionElements should include links and buttons', () => {
    const actions = service.extractActionElements(processed)
    const ids = actions.map(a => a.id)
    expect(ids).toContain('4')
    expect(ids).toContain('5')
  })

  it('extractAllText should combine text content', () => {
    const text = service.extractAllText(processed)
    expect(text).toContain('Hello')
    expect(text).toContain('world')
  })

  it('generateStats should count elements', () => {
    const stats = service.generateStats(processed)
    expect(stats.totalElements).toBeGreaterThan(0)
    expect(stats.images).toBeGreaterThanOrEqual(2)
    expect(stats.actionElements).toBeGreaterThan(0)
  })

  it('filterImagesNeedingAlt should return images without alt', () => {
    const images = service.extractImages(processed)
    const needing = service.filterImagesNeedingAlt(images)
    const ids = needing.map(i => i.id)
    expect(ids).toContain('3')
  })

  it('getProcessableImageUrls should convert relative to absolute', () => {
    const images = service.extractImages(processed)
    const urls = service.getProcessableImageUrls(images)
    const img = urls.find(u => u.id === '2')!
    expect(img.url).toBe(window.location.origin + '/img.png')
  })

  it('isValidImageUrl should validate urls', () => {
    expect(service.isValidImageUrl('http://example.com/photo.jpg')).toBe(true)
    expect(service.isValidImageUrl('ftp://example.com/file')).toBe(false)
  })
})
