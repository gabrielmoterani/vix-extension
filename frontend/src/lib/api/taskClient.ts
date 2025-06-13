export interface TaskRequest {
  taskPrompt: string
  actions: any[]
  summary: string
}

export interface TaskResponse {
  explanation: string
  js_commands?: string[]
}

export class TaskClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  async executePageTask(taskPrompt: string, actions: any[], summary: string): Promise<TaskResponse> {
    const startTime = Date.now()
    
    try {
      console.log('VIX: Enviando task para backend:', { taskPrompt, actionsCount: actions.length })

      const response = await fetch(`${this.baseUrl}/execute_page_task`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          html_content: JSON.stringify(actions),
          task_prompt: taskPrompt,
          page_summary: summary
        }),
        signal: AbortSignal.timeout(30000)
      })

      if (!response.ok) {
        const errorBody = await response.text()
        throw new Error(`Task failed: HTTP ${response.status} - ${errorBody}`)
      }

      const result = await response.json()
      console.log(`VIX: Task concluída em ${(Date.now() - startTime) / 1000}s`)

      // Parse da resposta se necessário
      if (typeof result.response === 'string') {
        try {
          const parsed = JSON.parse(result.response)
          return {
            explanation: parsed.explanation || result.response,
            js_commands: parsed.js_commands || []
          }
        } catch {
          return {
            explanation: result.response,
            js_commands: []
          }
        }
      }

      return result
    } catch (error) {
      console.error('VIX: Erro na execução de task:', error)
      throw new Error(`Falha na execução: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    }
  }
}

// Instância singleton
export const taskClient = new TaskClient('https://vix-monorepo.fly.dev/api')