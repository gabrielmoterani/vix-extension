import { DomAltApplier } from "../../lib/services/domAltApplier"
import { DomFixApplier } from "../../lib/services/domFixApplier"

let jsPermissionGranted = false

export const setupMessageHandler = (altApplier: DomAltApplier, fixApplier: DomFixApplier) => {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    // Handler para aplicar alt text quando concluído
    if (message.type === "IMAGE_ALT_COMPLETED") {
      console.log(
        "VIX: Aplicando alt text para",
        message.data.results.length,
        "imagens"
      )

      const appliedCount = altApplier.applyMultipleAltTexts(message.data.results)

      console.log(`VIX: Alt text aplicado a ${appliedCount} imagens`)
      sendResponse({ success: true, appliedCount })
      return
    }

    // Handler para executar JavaScript
    if (message.type === "EXECUTE_JS") {
      console.log("VIX: Executando comando JS:", message.command)

      const sanitizeCommand = (cmd: string) => cmd.trim()
      const isCommandSafe = (cmd: string) => {
        const blocked = [
          "chrome.runtime",
          "fetch(",
          "XMLHttpRequest",
          "localStorage",
          "sessionStorage",
          "document.cookie",
          "window.location"
        ]
        return !blocked.some((b) => cmd.includes(b))
      }

      const sanitized = sanitizeCommand(message.command)

      if (!isCommandSafe(sanitized)) {
        sendResponse({ success: false, error: "Comando não permitido" })
        return
      }

      if (!jsPermissionGranted) {
        jsPermissionGranted = window.confirm(
          `Permitir execução deste comando JS?\n${sanitized}`
        )
      }

      if (!jsPermissionGranted) {
        sendResponse({ success: false, error: "Permissão negada pelo usuário" })
        return
      }

      try {
        const result = new Function(sanitized)()
        sendResponse({ success: true, result: String(result) })
      } catch (error) {
        console.error("VIX: Erro ao executar comando JS:", error)
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Erro na execução"
        })
      }
    }

    if (message.type === "WCAG_APPLY_FIXES") {
      const applied = fixApplier.applyFixes(message.data.fixes)
      sendResponse({ success: true, applied })
      return
    }

    // Handler para reset (útil para debugging)
    if (message.type === "RESET_ALT_APPLIER") {
      altApplier.reset()
      sendResponse({ success: true })
    }
  })
}