// Cliente para comunicação com backend
export interface BackendConfig {
  baseUrl: string
  timeout: number
}

export interface SummaryRequest {
  content: string
  model?: string
}

export interface SummaryResponse {
  response: string
  tokens?: number
  model?: string
}

export interface ImageAltRequest {
  imageUrl: string
  summary: string
  model?: string
}

export interface ImageAltResponse {
  response: string
  model?: string
}

export class BackendClient {
  private config: BackendConfig

  constructor(config: BackendConfig) {
    this.config = config
  }

  async requestSummary(content: string, model: string = "o4-mini"): Promise<SummaryResponse> {
  const startTime = Date.now()
  
  try {
    console.log('VIX: Enviando requisição para:', `${this.config.baseUrl}/summarize_page`)
    console.log('VIX: Payload:', { content: content.substring(0, 100) + '...' })
    
    const response = await fetch(`${this.config.baseUrl}/summarize_page`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ content }),
      signal: AbortSignal.timeout(this.config.timeout)
    })

    console.log('VIX: Status da resposta:', response.status)
    console.log('VIX: Headers da resposta:', Object.fromEntries(response.headers.entries()))

    const responseText = await response.text()
    console.log('VIX: Resposta bruta:', responseText.substring(0, 200) + '...')

    if (!response.ok) {
      throw new Error(
        `Falha ao gerar resumo: HTTP ${response.status} - ${response.statusText}\n` +
        `Resposta: ${responseText}\n` +
        `Tempo: ${(Date.now() - startTime) / 1000}s`
      )
    }

    // Tentar parsear JSON
    let result
    try {
      result = JSON.parse(responseText)
    } catch (parseError) {
      console.error('VIX: Erro ao parsear JSON:', parseError)
      console.error('VIX: Resposta que falhou:', responseText)
      throw new Error(`Resposta não é JSON válido: ${responseText.substring(0, 100)}`)
    }

    console.log(`VIX: Resumo gerado em ${(Date.now() - startTime) / 1000}s`)
    console.log('VIX: Resultado parseado:', result)
    
    return result
  } catch (error) {
    console.error('VIX: Erro completo ao solicitar resumo:', error)
    throw new Error(`Erro na geração de resumo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
  }
}

  async requestImageAlt(imageUrl: string, summary: string, model: string = "o4-mini"): Promise<ImageAltResponse> {
    const startTime = Date.now()
    
    try {
      const response = await fetch(`${this.config.baseUrl}/parse_image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ 
          content: { imageUrl, summary },
          model 
        }),
        signal: AbortSignal.timeout(this.config.timeout)
      })

      if (!response.ok) {
        const errorBody = await response.text()
        throw new Error(
          `Falha ao gerar alt text: HTTP ${response.status} - ${response.statusText}\n` +
          `Resposta: ${errorBody}\n` +
          `Tempo: ${(Date.now() - startTime) / 1000}s`
        )
      }

      const result = await response.json()
      console.log(`VIX: Alt text gerado em ${(Date.now() - startTime) / 1000}s`)
      
      return result
    } catch (error) {
      console.error('VIX: Erro ao solicitar alt text:', error)
      throw new Error(`Erro na geração de alt text: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    }
  }

  // Verificar se backend está disponível
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5s timeout para health check
      })
      return response.ok
    } catch {
      return false
    }
  }
}

// Instância singleton do cliente
export const backendClient = new BackendClient({
  baseUrl: 'https://vix-monorepo.fly.dev/api',
  timeout: 30000 // 30s timeout
})