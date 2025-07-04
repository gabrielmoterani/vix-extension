import type { PlasmoMessaging } from "@plasmohq/messaging"
import { taskClient } from "../../lib/api/taskClient"
import { getBackgroundState } from "../state/backgroundState"

export const handleChatRequest: PlasmoMessaging.MessageHandler = async (
  req,
  res
) => {
  const { message, conversationId } = req.body

  console.log("VIX Background: Chat request:", message)
  console.log("#TODEBUG: HANDLER DE CHAT CHAMADO!")
  console.log("#TODEBUG: Mensagem:", message)
  console.log("#TODEBUG: ConversationId:", conversationId)

  try {
    const backgroundState = getBackgroundState()
    // Obter dados da página atual
    const summary = backgroundState.summary || "Resumo não disponível"
    const actions = backgroundState.actionElements || []

    console.log("VIX Background: Estado do background:", {
      hasSummary: !!backgroundState.summary,
      summaryLength: backgroundState.summary?.length || 0,
      actionElementsCount: actions.length,
      firstActions: actions.slice(0, 3) // Primeiros 3 elementos para debug
    })

    if (actions.length === 0) {
      console.warn("VIX Background: NENHUM ACTION ELEMENT ENCONTRADO! O chat não funcionará corretamente.")
    }

    console.log("VIX Background: Executando task com IA...")
    const result = await taskClient.executePageTask(message, actions, summary)
    
    console.log("#TODEBUG: Resultado do taskClient:", JSON.stringify(result, null, 2))

    // Enviar resposta para sidepanel
    const response = {
      type: "CHAT_RESPONSE",
      data: {
        message: result.explanation,
        conversationId,
        jsCommands: result.js_commands || []
      }
    }

    console.log("#TODEBUG: Resposta formatada para sidepanel:", JSON.stringify(response, null, 2))
    console.log("VIX Background: Enviando resposta do chat:", response)
    await chrome.runtime.sendMessage(response)
    res.send({ success: true })
  } catch (error) {
    console.error("VIX: Erro no chat:", error)

    // Enviar erro como resposta
    const errorResponse = {
      type: "CHAT_RESPONSE",
      data: {
        message: `Desculpe, ocorreu um erro: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
        conversationId
      }
    }

    await chrome.runtime.sendMessage(errorResponse)
    res.send({
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido"
    })
  }
}