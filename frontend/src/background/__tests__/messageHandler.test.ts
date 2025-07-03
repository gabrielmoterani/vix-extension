import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as handler from '../handlers/messageHandler'
import { getBackgroundState } from '../state/backgroundState'

vi.mock('../../lib/api/backendClient', () => ({
  backendClient: {
    requestSummary: vi.fn().mockResolvedValue({ response: 'sum' }),
    requestWCAGCheck: vi.fn().mockResolvedValue({ response: '[]' })
  }
}))
vi.mock('../../lib/api/taskClient', () => ({
  taskClient: { executePageTask: vi.fn().mockResolvedValue({ explanation: 'ok', js_commands: [] }) }
}))

beforeEach(() => {
  ;(global as any).chrome = {
    runtime: { sendMessage: vi.fn() },
    tabs: { query: vi.fn().mockResolvedValue([]), sendMessage: vi.fn() }
  }
})

describe('message handlers', () => {
  it('updateCurrentTab stores tab info', () => {
    handler.updateCurrentTab(1, 'u', 'active')
    expect(getBackgroundState().currentTab).toEqual({ id: 1, url: 'u', status: 'active' })
  })

  it('handleDomUpdated updates stats', async () => {
    const req = { body: { elementsWithIds: 1, totalElements: 2, actionElements: 1, images: 1, imagesNeedingAlt: 0 } }
    const res = { send: vi.fn() }
    await handler.handleDomUpdated(req as any, res as any)
    expect(res.send).toHaveBeenCalledWith({ success: true, state: getBackgroundState() })
    expect(getBackgroundState().domStats.totalElements).toBe(2)
  })

  it('handleGetState returns state', async () => {
    const res = { send: vi.fn() }
    await handler.handleGetState({} as any, res as any)
    expect(res.send).toHaveBeenCalledWith({ success: true, state: getBackgroundState() })
  })

  it('handleSummaryRequest stores summary', async () => {
    const res = { send: vi.fn() }
    await handler.handleSummaryRequest({ body: { text: 't', url: 'u' } } as any, res as any)
    expect(res.send).toHaveBeenCalledWith({ success: true, summary: 'sum' })
    expect(getBackgroundState().summary).toBe('sum')
  })
})
