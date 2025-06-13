import { describe, it, expect, vi } from 'vitest'
import { WcagCheckService } from '../wcagCheckService'
import axe from 'axe-core'

vi.mock('axe-core', () => ({
  default: {
    run: vi.fn(async () => ({
      violations: [
        { id: 'img-alt', impact: 'critical', description: 'missing alt', nodes: [{ target: ['img'], html: '<img>' }] }
      ]
    }))
  }
}))

describe('WcagCheckService', () => {
  it('runCheck returns formatted violations', async () => {
    const service = new WcagCheckService()
    const result = await service.runCheck()
    expect(result[0].id).toBe('img-alt')
    expect(result[0].nodes[0].target[0]).toBe('img')
  })
})
