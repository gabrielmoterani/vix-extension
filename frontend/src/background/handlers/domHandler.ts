import type { PlasmoMessaging } from "@plasmohq/messaging"
import type { DomUpdatedMessage, PageAnalyzedMessage } from "../../lib/types/messaging"
import { getBackgroundState, updateDomStats } from "../state/backgroundState"

// Handler para mensagens DOM_UPDATED
export const handleDomUpdated: PlasmoMessaging.MessageHandler = async (
  req,
  res
) => {
  const message = req.body as DomUpdatedMessage["data"]

  console.log("VIX Background: DOM atualizado", message)

  // Atualizar estado
  updateDomStats({
    elementsWithIds: message.elementsWithIds,
    totalElements: message.totalElements || 0,
    actionElements: message.actionElements || 0,
    images: message.images || 0,
    imagesNeedingAlt: message.imagesNeedingAlt || 0
  })

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
    res.send({ success: true, state: getBackgroundState() })
  } catch (error) {
    console.log("VIX: Sidepanel não está aberto")
    res.send({ success: true, state: getBackgroundState() })
  }
}

// Handler para obter estado atual
export const handleGetState: PlasmoMessaging.MessageHandler = async (
  req,
  res
) => {
  res.send({ success: true, state: getBackgroundState() })
}