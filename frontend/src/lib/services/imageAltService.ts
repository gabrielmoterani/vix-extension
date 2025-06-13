import { backendClient } from "../api/backendClient"
import { globalCache, CacheKeyGenerator } from './cacheService'

export interface ImageAltJob {
  id: string
  url: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  altText?: string
  error?: string
}

export interface ImageAltProgress {
  total: number
  completed: number
  failed: number
  inProgress: number
  jobs: ImageAltJob[]
}

export class ImageAltService {
  private jobs: Map<string, ImageAltJob> = new Map()
  private concurrentLimit = 3 // Processar máximo 3 imagens simultâneas
  private activeRequests = 0

  async processImages(
    imageUrls: Array<{id: string, url: string}>, 
    pageSummary: string,
    onProgress?: (progress: ImageAltProgress) => void
  ): Promise<ImageAltProgress> {
    
    console.log(`VIX: Iniciando processamento de ${imageUrls.length} imagens`)
    
    // Inicializar jobs
    this.jobs.clear()
    imageUrls.forEach(({id, url}) => {
      this.jobs.set(id, {
        id,
        url,
        status: 'pending'
      })
    })

    // Processar imagens em lotes
    const promises = imageUrls.map(async ({id, url}) => {
      // Aguardar slot disponível
      while (this.activeRequests >= this.concurrentLimit) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      return this.processingleImage(id, url, pageSummary, onProgress)
    })

    await Promise.allSettled(promises)

    const finalProgress = this.getProgress()
    console.log('VIX: Processamento de imagens concluído:', finalProgress)
    
    return finalProgress
  }

  private async processingleImage(
    id: string, 
    url: string, 
    summary: string,
    onProgress?: (progress: ImageAltProgress) => void
  ): Promise<void> {
    this.activeRequests++
    
    const job = this.jobs.get(id)!
    job.status = 'processing'
    
    onProgress?.(this.getProgress())

    try {
      console.log(`VIX: Processando imagem ${id}:`, url.substring(0, 50) + '...')
      
      // Check cache first
      const cacheKey = CacheKeyGenerator.imageAlt(url, summary)
      const cachedAlt = globalCache.get<string>(cacheKey)
      
      if (cachedAlt) {
        console.log(`VIX: Alt text encontrado no cache para ${id}`)
        job.status = 'completed'
        job.altText = cachedAlt
      } else {
        // Request from backend
        const result = await backendClient.requestImageAlt(url, summary)
        
        job.status = 'completed'
        job.altText = result.response
        
        // Cache the result with longer TTL since alt texts are expensive to generate
        globalCache.set(cacheKey, result.response, 2 * 60 * 60 * 1000) // 2 hours
        
        console.log(`VIX: Alt text gerado para ${id}:`, result.response.substring(0, 100) + '...')
      }
      
    } catch (error) {
      console.error(`VIX: Erro ao processar imagem ${id}:`, error)
      job.status = 'failed'
      job.error = error instanceof Error ? error.message : 'Erro desconhecido'
    } finally {
      this.activeRequests--
      onProgress?.(this.getProgress())
    }
  }

  private getProgress(): ImageAltProgress {
    const jobs = Array.from(this.jobs.values())
    
    return {
      total: jobs.length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      inProgress: jobs.filter(j => j.status === 'processing').length,
      jobs: jobs
    }
  }

  getJobById(id: string): ImageAltJob | undefined {
    return this.jobs.get(id)
  }

  getCompletedJobs(): ImageAltJob[] {
    return Array.from(this.jobs.values()).filter(j => j.status === 'completed')
  }

  // Método para obter estatísticas atuais
  getCurrentStats(): {
    totalJobs: number
    completedJobs: number
    failedJobs: number
    pendingJobs: number
    activeRequests: number
  } {
    const jobs = Array.from(this.jobs.values())
    
    return {
      totalJobs: jobs.length,
      completedJobs: jobs.filter(j => j.status === 'completed').length,
      failedJobs: jobs.filter(j => j.status === 'failed').length,
      pendingJobs: jobs.filter(j => j.status === 'pending').length,
      activeRequests: this.activeRequests
    }
  }

  // Método para limpar jobs antigos
  clearJobs(): void {
    this.jobs.clear()
    console.log('VIX: ImageAltService jobs cleared')
  }

  // Método para cancelar processamento (para implementação futura)
  cancelProcessing(): void {
    // Por enquanto, apenas marca jobs pendentes como failed
    for (const job of this.jobs.values()) {
      if (job.status === 'pending') {
        job.status = 'failed'
        job.error = 'Processamento cancelado pelo usuário'
      }
    }
    console.log('VIX: Processamento cancelado')
  }

  // Método para retry de jobs que falharam
  async retryFailedJobs(
    pageSummary: string,
    onProgress?: (progress: ImageAltProgress) => void
  ): Promise<void> {
    const failedJobs = Array.from(this.jobs.values()).filter(j => j.status === 'failed')
    
    if (failedJobs.length === 0) {
      console.log('VIX: Nenhum job falhou, nada para retry')
      return
    }

    console.log(`VIX: Retry de ${failedJobs.length} jobs que falharam`)

    // Reset status dos jobs que falharam
    failedJobs.forEach(job => {
      job.status = 'pending'
      job.error = undefined
    })

    // Processar apenas os jobs que falharam
    const retryPromises = failedJobs.map(async (job) => {
      while (this.activeRequests >= this.concurrentLimit) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      return this.processingleImage(job.id, job.url, pageSummary, onProgress)
    })

    await Promise.allSettled(retryPromises)
    console.log('VIX: Retry concluído')
  }
}