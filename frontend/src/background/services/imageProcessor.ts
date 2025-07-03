import { ImageAltService } from "../../lib/services/imageAltService"
import { getBackgroundState } from "../state/backgroundState"

const imageAltService = new ImageAltService()
let isAltProcessing = false

// Processa as imagens armazenadas no estado com o resumo atual
export const startImageAltProcessing = async () => {
  console.log("VIX####startImageAltProcessing1")
  if (isAltProcessing) {
    return
  }
  console.log("VIX####startImageAltProcessing2")
  
  const backgroundState = getBackgroundState()
  const images = backgroundState.imagesNeedingAlt || []
  const summary = backgroundState.summary

  if (!summary || images.length === 0) {
    return
  }

  isAltProcessing = true

  try {
    console.log("VIX####startImageAltProcessing3")
    const progress = await imageAltService.processImages(
      images,
      summary,
      async (progressUpdate) => {
        const progressData = {
          total: progressUpdate.total,
          completed: progressUpdate.completed,
          failed: progressUpdate.failed,
          inProgress: progressUpdate.inProgress,
          completedJobs: progressUpdate.jobs
            .filter((j) => j.status === "completed")
            .map((j) => ({ id: j.id, altText: j.altText! }))
        }

        // Notificar runtime
        chrome.runtime.sendMessage({
          type: "IMAGE_ALT_PROGRESS",
          data: progressData
        })

        // Notificar content script da aba ativa
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true
        })
        if (tab?.id) {
          chrome.tabs.sendMessage(tab.id, {
            type: "IMAGE_ALT_PROGRESS",
            data: progressData
          })
        }
      }
    )
    
    console.log("VIX####startImageAltProcessing4")
    const finalResult = {
      type: "IMAGE_ALT_COMPLETED",
      data: {
        total: progress.total,
        completed: progress.completed,
        failed: progress.failed,
        results: progress.jobs.map((j) => ({
          id: j.id,
          altText: j.altText,
          error: j.error
        }))
      }
    }

    await chrome.runtime.sendMessage(finalResult)
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, finalResult)
    }
  } catch (error) {
    console.error("VIX: Erro no processamento de alt text:", error)
  } finally {
    isAltProcessing = false
  }
}