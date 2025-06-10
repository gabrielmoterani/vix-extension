import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BackendClient } from '../backendClient'

declare global {
  // eslint-disable-next-line no-var
  var fetch: typeof fetch
}

const baseUrl = 'http://localhost'

let client: BackendClient

beforeEach(() => {
  client = new BackendClient({ baseUrl, timeout: 1000 })
})

describe('BackendClient', () => {
  it('requestSummary sends request and returns result', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { entries: () => [] },
      text: () => Promise.resolve('{"response":"ok"}')
    })
    global.fetch = mockFetch as any

    const res = await client.requestSummary('text')
    expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/summarize_page`, expect.objectContaining({ method: 'POST' }))
    expect(res).toEqual({ response: 'ok' })
  })

  it('requestSummary throws on error status', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'err',
      headers: { entries: () => [] },
      text: () => Promise.resolve('fail')
    })
    global.fetch = mockFetch as any
    await expect(client.requestSummary('text')).rejects.toThrow()
  })

  it('healthCheck returns boolean', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true }) as any
    await expect(client.healthCheck()).resolves.toBe(true)

    global.fetch = vi.fn().mockRejectedValue(new Error('x')) as any
    await expect(client.healthCheck()).resolves.toBe(false)
  })
})
