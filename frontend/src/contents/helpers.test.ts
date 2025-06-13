import { describe, it, expect, vi, beforeEach } from 'vitest'
vi.mock('data-text:~style.css', () => ({ default: '' }))

const loadModule = async () => {
  const g: any = global
  g.chrome = { runtime: { onMessage: { addListener: vi.fn() }, sendMessage: vi.fn() } }
  return await import('./index')
}

describe('content helpers', () => {
  let mod: any
  beforeEach(async () => {
    mod = await loadModule()
  })

  it('generateUniqueId returns unique id', () => {
    const id1 = mod.generateUniqueId()
    const id2 = mod.generateUniqueId()
    expect(id1).not.toBe(id2)
    expect(id1).toMatch(/^vix-/)
  })

  it('isSkippableElement detects script and stylesheet', () => {
    const script = document.createElement('script')
    const link = document.createElement('link')
    link.setAttribute('rel', 'stylesheet')
    expect(mod.isSkippableElement(script)).toBe(true)
    expect(mod.isSkippableElement(link)).toBe(true)
  })

  it('isActionElement checks interactive hints', () => {
    const btn = document.createElement('button')
    const input = document.createElement('input')
    input.type = 'submit'
    const div = document.createElement('div')
    div.setAttribute('role', 'button')
    expect(mod.isActionElement(btn)).toBe(true)
    expect(mod.isActionElement(input)).toBe(true)
    expect(mod.isActionElement(div)).toBe(true)
  })

  it('isImageElement handles img and background images', () => {
    const img = document.createElement('img')
    const div = document.createElement('div')
    div.style.backgroundImage = 'url(x.png)'
    expect(mod.isImageElement(img)).toBe(true)
    expect(mod.isImageElement(div)).toBe(true)
  })

  it('processAndAnalyzeDOM counts elements', () => {
    document.body.innerHTML = `<div id='a'><button></button><img src=''/></div>`
    const stats = mod.processAndAnalyzeDOM(document.body)
    expect(stats.totalElements).toBe(4)
    expect(stats.actionElements).toBe(1)
    expect(stats.images).toBe(2)
    expect(stats.elementsWithIds).toBeGreaterThan(0)
  })
})
