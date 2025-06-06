import type { PlasmoMessaging } from "@plasmohq/messaging"
import type { ExtensionMessage, BackgroundState, DomUpdatedMessage, PageAnalyzedMessage, PageSummaryMessage } from "../../lib/types/messaging"
import { backendClient } from "../../lib/api/backendClient"
import { taskClient } from "../../lib/api/taskClient"
import { ImageAltService } from "../../lib/services/imageAltService"

const imageAltService = new ImageAltService()

// Estado global do background
let backgroundState: BackgroundState & {
  summary?: string
  actionElements?: any[],
  imagesNeedingAlt?: Array<{id: string, url: string}>
} = {
  currentTab: null,
  domStats: {
    elementsWithIds: 0,
    totalElements: 0,
    actionElements: 0,
    images: 0,
    imagesNeedingAlt: 0
  },
  analysisStatus: "idle",
  imagesNeedingAlt: []
}


// Handler para mensagens DOM_UPDATED
export const handleDomUpdated: PlasmoMessaging.MessageHandler = async (req, res) => {
  const message = req.body as DomUpdatedMessage["data"]
  
  console.log("VIX Background: DOM atualizado", message)
  
  // Atualizar estado
  backgroundState.domStats = {
    elementsWithIds: message.elementsWithIds,
    totalElements: message.totalElements || 0,
    actionElements: message.actionElements || 0,
    images: message.images || 0,
    imagesNeedingAlt: message.imagesNeedingAlt || 0
  }
  
  // Notificar sidepanel com dados estruturados
  const notification: PageAnalyzedMessage = {
    type: "PAGE_ANALYZED",
    timestamp: Date.now(),
    data: {
      status: "completed"
    }
  }
  
  try {
    await chrome.runtime.sendMessage(notification)
    res.send({ success: true, state: backgroundState })
  } catch (error) {
    console.log("VIX: Sidepanel não está aberto")
    res.send({ success: true, state: backgroundState })
  }
}

// Handler para obter estado atual
export const handleGetState: PlasmoMessaging.MessageHandler = async (req, res) => {
  res.send({ success: true, state: backgroundState })
}

export const handleSummaryRequest: PlasmoMessaging.MessageHandler = async (req, res) => {
  const { text, url } = req.body
  
  console.log("VIX Background: Solicitando resumo para:", url)
  console.log("VIX Background: Tamanho do texto:", text.length)
  
  try {
    console.log("VIX Background: VAI COMEÇAR...")
    const startTime = Date.now()
    console.log("VIX Background: Chamando requestSummary...")
    const result = await backendClient.requestSummary(text)
    console.log("VIX Background: Resultado recebido:", result)
    const processingTime = Date.now() - startTime

    // Notificar sidepanel com resumo
    const notification: PageSummaryMessage = {
      type: "PAGE_SUMMARY_GENERATED",
      timestamp: Date.now(),
      data: {
        summary: result.response,
        textLength: text.length,
        processingTime,
        model: result.model || "o4-mini"
      }
    }

    console.log("VIX Background: Enviando notificação:", notification)
    await chrome.runtime.sendMessage(notification)
    res.send({ success: true, summary: result.response })
    
  } catch (error) {
    console.error("VIX: Erro detalhado ao gerar resumo:", error)
    
    // ADICIONAR: Fallback com resumo mock para teste
    console.log("VIX: Enviando resumo de fallback...")
    const fallbackNotification: PageSummaryMessage = {
      type: "PAGE_SUMMARY_GENERATED",
      timestamp: Date.now(),
      data: {
        summary: `[FALLBACK] Esta página contém ${text.length} caracteres de texto. O backend retornou erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        textLength: text.length,
        processingTime: 0,
        model: "fallback"
      }
    }
    
    await chrome.runtime.sendMessage(fallbackNotification)
    res.send({ success: false, error: error instanceof Error ? error.message : "Erro desconhecido" })
  }
}

export const handleChatRequest: PlasmoMessaging.MessageHandler = async (req, res) => {
  const { message, conversationId } = req.body
  
  console.log("VIX Background: Chat request:", message)
  
  try {
    // Obter dados da página atual
    const summary = backgroundState.summary || "Resumo não disponível"
    const actions = backgroundState.actionElements || []
    
    console.log("VIX Background: Executando task com IA...")
    const result = await taskClient.executePageTask(message, actions, summary)
    
    // Enviar resposta para sidepanel
    const response = {
      type: "CHAT_RESPONSE",
      data: {
        message: result.explanation,
        conversationId,
        jsCommands: result.js_commands || []
      }
    }
    
    console.log("VIX Background: Enviando resposta do chat:", response)
    await chrome.runtime.sendMessage(response)
    res.send({ success: true })
    
  } catch (error) {
    console.error("VIX: Erro no chat:", error)
    
    // Enviar erro como resposta
    const errorResponse = {
      type: "CHAT_RESPONSE", 
      data: {
        message: `Desculpe, ocorreu um erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        conversationId
      }
    }
    
    await chrome.runtime.sendMessage(errorResponse)
    res.send({ success: false, error: error instanceof Error ? error.message : "Erro desconhecido" })
  }
}

export const handleImageAltRequest: PlasmoMessaging.MessageHandler = async (req, res) => {
  const { images, summary } = req.body
  
  console.log("VIX Background: Processando alt text para", images.length, "imagens")
  
  try {
    const progress = await imageAltService.processImages(
      images,
      summary || "Descrição da página não disponível",
      (progressUpdate) => {
        // Enviar progresso em tempo real
        chrome.runtime.sendMessage({
          type: "IMAGE_ALT_PROGRESS",
          data: {
            total: progressUpdate.total,
            completed: progressUpdate.completed,
            failed: progressUpdate.failed,
            inProgress: progressUpdate.inProgress,
            completedJobs: progressUpdate.jobs
              .filter(j => j.status === 'completed')
              .map(j => ({id: j.id, altText: j.altText!}))
          }
        })
      }
    )

    // Enviar resultado final
    const finalResult = {
      type: "IMAGE_ALT_COMPLETED",
      data: {
        total: progress.total,
        completed: progress.completed,
        failed: progress.failed,
        results: progress.jobs.map(j => ({
          id: j.id,
          altText: j.altText,
          error: j.error
        }))
      }
    }

    await chrome.runtime.sendMessage(finalResult)
    res.send({ success: true, progress })
    
  } catch (error) {
    console.error("VIX: Erro no processamento de alt text:", error)
    res.send({ success: false, error: error instanceof Error ? error.message : "Erro desconhecido" })
  }
}

export const handleImagesDetected: PlasmoMessaging.MessageHandler = async (req, res) => {
  const { images, url } = req.body
  
  console.log("VIX Background: Imagens detectadas:", images.length)
  
  // Armazenar imagens que precisam de alt text
  backgroundState.imagesNeedingAlt = images
  
  // Atualizar estatísticas
  if (backgroundState.domStats) {
    backgroundState.domStats.imagesNeedingAlt = images.length
  }

  res.send({ success: true })
}

// Função para atualizar tab ativa
export const updateCurrentTab = (tabId: number, url: string, status: string) => {
  backgroundState.currentTab = { id: tabId, url, status }
}

// função para atualizar dados da página
export const updatePageData = (summary: string, actionElements: any[], imagesNeedingAlt: Array<{id: string, url: string}>) => {
  backgroundState.summary = summary
  backgroundState.actionElements = actionElements
  backgroundState.imagesNeedingAlt = imagesNeedingAlt
}

// Exportar estado para outros módulos
export const getBackgroundState = () => backgroundState

