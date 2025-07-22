import type { PlasmoMessaging } from "@plasmohq/messaging"
import { updateImagesNeedingAlt, updateSummary } from "../state/backgroundState"
import { startImageAltProcessing } from "../services/imageProcessor"

export const handleImageAltRequest: PlasmoMessaging.MessageHandler = async (
  req,
  res
) => {
  const { images, summary } = req.body
  console.log("VIX####handleImageAltRequest1")
  
  // Atualizar estado com dados recebidos
  updateImagesNeedingAlt(images)
  updateSummary(summary)

  try {
    await startImageAltProcessing()
    res.send({ success: true })
  } catch (error) {
    console.error("VIX: Erro no processamento de alt text:", error)
    res.send({
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido"
    })
  }
}

export const handleImagesDetected: PlasmoMessaging.MessageHandler = async (
  req,
  res
) => {
  const { images, url } = req.body

  console.log("VIX Background: Imagens detectadas:", images.length)

  // Armazenar imagens que precisam de alt text
  updateImagesNeedingAlt(images)

  // Enviar imagens para o sidepanel
  chrome.runtime.sendMessage({
    type: "IMAGES_DETECTED",
    data: { images }
  })

  // Reativar processamento automático de IA
  try {
    await startImageAltProcessing()
  } catch (error) {
    console.error("VIX: Erro ao iniciar processamento automático de alt:", error)
  }

  res.send({ success: true })
}