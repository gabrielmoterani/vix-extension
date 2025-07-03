import type { PlasmoMessaging } from "@plasmohq/messaging"
import type { PageSummaryMessage } from "../../lib/types/messaging"
import { backendClient } from "../../lib/api/backendClient"
import { updateSummary } from "../state/backgroundState"
import { startImageAltProcessing } from "../services/imageProcessor"

export const handleSummaryRequest: PlasmoMessaging.MessageHandler = async (
  req,
  res
) => {
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

    // Salvar resumo para uso em outras rotas
    updateSummary(result.response)

    // Tenta iniciar o processamento automático de alt text
    await startImageAltProcessing()

    res.send({ success: true, summary: result.response })
  } catch (error) {
    console.error("VIX: Erro detalhado ao gerar resumo:", error)

    // Fallback com resumo mock para teste
    console.log("VIX: Enviando resumo de fallback...")
    const fallbackNotification: PageSummaryMessage = {
      type: "PAGE_SUMMARY_GENERATED",
      timestamp: Date.now(),
      data: {
        summary: `[FALLBACK] Esta página contém ${text.length} caracteres de texto. O backend retornou erro: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
        textLength: text.length,
        processingTime: 0,
        model: "fallback"
      }
    }

    await chrome.runtime.sendMessage(fallbackNotification)

    updateSummary(fallbackNotification.data.summary)
    await startImageAltProcessing()

    res.send({
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido"
    })
  }
}