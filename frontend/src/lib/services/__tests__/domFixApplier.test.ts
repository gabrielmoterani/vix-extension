import { describe, it, expect, beforeEach } from 'vitest'
import { DomFixApplier } from '../domFixApplier'
import type { DomFix } from '../domFixApplier'

let applier: DomFixApplier

beforeEach(() => {
  document.body.innerHTML = `<div data-vix="1"></div>`
  applier = new DomFixApplier()
})

describe('DomFixApplier', () => {
  it('applyFixes should set attributes on elements', () => {
    const fixes: DomFix[] = [
      { id: '1', addAttributes: [{ attributeName: 'role', value: 'button' }] }
    ]
    const count = applier.applyFixes(fixes)
    const el = document.querySelector('[data-vix="1"]')!
    expect(count).toBe(1)
    expect(el.getAttribute('role')).toBe('button')
  })
})
