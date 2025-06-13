import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ImageAltService } from '../imageAltService'
import { backendClient } from '../../api/backendClient'

vi.mock('../../api/backendClient', () => ({
  backendClient: {
    requestImageAlt: vi.fn(async (url: string) => ({ response: 'alt for ' + url }))
  }
}))

describe('ImageAltService', () => {
  let service: ImageAltService

  beforeEach(() => {
    service = new ImageAltService()
  })

  it('processImages should process all urls', async () => {
    const result = await service.processImages([
      { id: '1', url: 'http://img/a.png' },
      { id: '2', url: 'http://img/b.png' }
    ], 'sum')
    expect(result.completed).toBe(2)
    expect(service.getCompletedJobs().length).toBe(2)
  })

  it('clearJobs resets state', async () => {
    await service.processImages([{ id: '1', url: 'http://img/a.png' }], 's')
    service.clearJobs()
    expect(service.getCurrentStats().totalJobs).toBe(0)
  })

  it('cancelProcessing marks pending as failed', async () => {
    service['jobs'].set('1', { id: '1', url: 'u', status: 'pending' })
    service.cancelProcessing()
    expect(service.getJobById('1')?.status).toBe('failed')
  })
})
