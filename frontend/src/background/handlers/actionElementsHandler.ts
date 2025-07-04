import type { PlasmoMessaging } from "@plasmohq/messaging"
import { getBackgroundState, updatePageData } from "../state/backgroundState"

/**
 * Handler para atualizar actionElements no estado do background
 */
export const handleUpdateActionElements: PlasmoMessaging.MessageHandler = async (
  req,
  res
) => {
  const { actionElements, url } = req.body

  console.log("VIX Background: Atualizando actionElements")
  console.log("VIX Background: URL:", url)
  console.log("VIX Background: ActionElements recebidos:", actionElements?.length || 0)

  try {
    const currentState = getBackgroundState()
    const currentSummary = currentState.summary || "Resumo não disponível"
    const currentImages = currentState.imagesNeedingAlt || []

    // Atualizar estado com novos actionElements
    updatePageData(currentSummary, actionElements || [], currentImages)

    console.log("VIX Background: ActionElements atualizados no estado")

    res.send({ 
      success: true, 
      message: `${actionElements?.length || 0} actionElements atualizados`
    })
  } catch (error) {
    console.error("VIX Background: Erro ao atualizar actionElements:", error)
    res.send({
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido"
    })
  }
}