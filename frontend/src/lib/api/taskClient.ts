// Interface para requisição de tarefa
export interface TaskRequest {
  taskPrompt: string  // Instrução do usuário sobre o que fazer
  actions: any[]      // Lista de elementos interativos da página
  summary: string     // Resumo do conteúdo da página
}

// Interface para resposta da tarefa
export interface TaskResponse {
  explanation: string    // Explicação amigável do que será feito
  js_commands?: string[] // Comandos JavaScript para executar
}

// Cliente para comunicação com o backend para execução de tarefas
export class TaskClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  /**
   * Executa uma tarefa na página através do backend
   * @param taskPrompt - Instrução do usuário sobre o que fazer
   * @param actions - Lista de elementos interativos da página
   * @param summary - Resumo do conteúdo da página
   * @returns Promise com a resposta estruturada
   */
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
          html_content: actions,  // Não fazer JSON.stringify duplo
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
      console.log("#TODEBUG: Resposta do backend:", JSON.stringify(result, null, 2))

      // Parse da resposta se necessário
      if (typeof result.response === 'string') {
        try {
          const parsed = JSON.parse(result.response)
          console.log("#TODEBUG: JSON parseado do backend:", JSON.stringify(parsed, null, 2))
          const finalResult = {
            explanation: parsed.explanation || result.response,
            js_commands: parsed.js_commands || []
          }
          console.log("#TODEBUG: Resultado final para frontend:", JSON.stringify(finalResult, null, 2))
          return finalResult
        } catch (e) {
          console.log("#TODEBUG: ERRO - Não conseguiu fazer parse do JSON:", e)
          console.log("#TODEBUG: Conteúdo problemático:", result.response)
          // Se não conseguir fazer parse, retornar resposta como explicação
          return {
            explanation: result.response,
            js_commands: []
          }
        }
      }

      // Se result.response não é string, assumir que já está no formato correto
      const finalResult = {
        explanation: result.response?.explanation || result.explanation || 'Tarefa processada',
        js_commands: result.response?.js_commands || result.js_commands || []
      }
      console.log("#TODEBUG: Resultado final direto:", JSON.stringify(finalResult, null, 2))
      return finalResult
    } catch (error) {
      console.error('VIX: Erro na execução de task:', error)
      throw new Error(`Falha na execução: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    }
  }
}

// Instância singleton
export const taskClient = new TaskClient('http://localhost:8080/api')
// export const taskClient = new TaskClient('https://vix-monorepo.fly.dev/api')