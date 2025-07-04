import { processAndAnalyzeDOM } from "./domProcessor"

export const notifyBackgroundDomUpdated = async (
  stats: ReturnType<typeof processAndAnalyzeDOM>,
  imagesNeedingAlt?: number
) => {
  try {
    chrome.runtime.sendMessage(
      {
        type: "DOM_UPDATED",
        body: {
          url: window.location.href,
          timestamp: Date.now(),
          ...stats,
          imagesNeedingAlt: imagesNeedingAlt || 0
        }
      },
      (response) => {
        if (response?.success) {
          console.log("VIX: Stats enviadas para background:", stats)
        }
      }
    )
  } catch (error) {
    console.error("VIX: Erro ao notificar background:", error)
  }
}

export const requestPageSummary = async (text: string) => {
  try {
    // Limitar texto para não estourar limite de tokens
    const truncatedText =
      text.length > 50000 ? text.substring(0, 50000) + "..." : text

    console.log(
      `VIX: Solicitando resumo para ${truncatedText.length} caracteres`
    )

    chrome.runtime.sendMessage(
      {
        type: "REQUEST_SUMMARY",
        body: {
          text: truncatedText,
          url: window.location.href
        }
      },
      (response) => {
        console.log("VIX: Resposta da solicitação de resumo:", response)
        if (!response?.success) {
          console.error("VIX: Erro na solicitação:", response?.error)
        }
      }
    )

    console.log("VIX: Mensagem enviada para background")
  } catch (error) {
    console.error("VIX: Erro ao solicitar resumo:", error)
  }
}

export const notifyImagesDetected = (images: Array<{id: string, url: string, isBackground?: boolean}>) => {
  chrome.runtime.sendMessage({
    type: "IMAGES_DETECTED",
    body: {
      images,
      url: window.location.href
    }
  })
}

export const notifyWcagIssues = (issues: any[]) => {
  chrome.runtime.sendMessage({
    type: "WCAG_ISSUES_DETECTED",
    body: { issues }
  })
}

/**
 * Envia actionElements para o background independentemente do resumo
 * Útil para casos onde o resumo já foi gerado mas os actionElements não foram enviados
 */
export const sendActionElements = async (actionElements: any[]) => {
  try {
    console.log("VIX: Enviando actionElements diretamente:", actionElements.length)
    
    chrome.runtime.sendMessage(
      {
        type: "UPDATE_ACTION_ELEMENTS",
        body: {
          actionElements,
          url: window.location.href
        }
      },
      (response) => {
        if (response?.success) {
          console.log("VIX: ActionElements enviados com sucesso")
        } else {
          console.error("VIX: Erro ao enviar actionElements:", response?.error)
        }
      }
    )
  } catch (error) {
    console.error("VIX: Erro ao enviar actionElements:", error)
  }
}