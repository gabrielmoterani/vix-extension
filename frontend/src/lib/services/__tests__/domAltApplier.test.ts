import { describe, it, expect, beforeEach } from 'vitest'
import { DomAltApplier } from '../domAltApplier'

let applier: DomAltApplier

beforeEach(() => {
  document.body.innerHTML = `<img data-vix="1" src="/a.png" />`
  applier = new DomAltApplier()
})

describe('DomAltApplier', () => {
  it('applyAltText should set prefixed alt and indicator', () => {
    const result = applier.applyAltText('1', 'desc')
    const img = document.querySelector('[data-vix="1"]') as HTMLImageElement
    expect(result).toBe(true)
    expect(img.getAttribute('alt')).toBe('VIX: desc')
    expect(applier.isAlreadyApplied('1')).toBe(true)
  })

  it('applyMultipleAltTexts applies multiple entries', () => {
    document.body.innerHTML += `<img data-vix="2" src="/b.png" />`
    const count = applier.applyMultipleAltTexts([
      { id: '1', altText: 'one' },
      { id: '2', altText: 'two' }
    ])
    expect(count).toBe(2)
  })

  it('removeAllIndicators removes overlay elements', () => {
    applier.applyAltText('1', 'desc')
    applier.removeAllIndicators()
    expect(document.querySelector('.vix-alt-indicator')).toBeNull()
  })

  it('getStats returns applied ids', () => {
    applier.applyAltText('1', 'd')
    const stats = applier.getStats()
    expect(stats.appliedCount).toBe(1)
    expect(stats.appliedIds).toContain('1')
  })

  it('reset clears state', () => {
    applier.applyAltText('1', 'd')
    applier.reset()
    expect(applier.getStats().appliedCount).toBe(0)
  })
})
