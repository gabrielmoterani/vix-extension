import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TaskClient } from '../taskClient'

declare global {
  var fetch: typeof fetch
}

const baseUrl = 'http://localhost'
let client: TaskClient

beforeEach(() => {
  client = new TaskClient(baseUrl)
})

describe('TaskClient', () => {
  it('executePageTask parses json response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ response: '{"explanation":"hi","js_commands":["a"]}' })
    })
    global.fetch = mockFetch as any

    const res = await client.executePageTask('do', [], 'sum')
    expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/execute_page_task`, expect.any(Object))
    expect(res).toEqual({ explanation: 'hi', js_commands: ['a'] })
  })

  it('executePageTask throws on http error', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, text: () => Promise.resolve('e') }) as any
    await expect(client.executePageTask('a', [], 's')).rejects.toThrow()
  })
})
