// src/background.ts
export {}

chrome.runtime.onMessage.addListener(async (req, sender, sendResponse) => {
  if (req.action === "analyze-page" && sender.tab?.id) {
    try {
      // 1. Captura DOM
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

      const pageData = await chrome.tabs.sendMessage(tab.id!, { action: "get-page-data" })

      // 2. Captura screenshot
      const screenshot = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" })

      // 3. Envia para backend
      console.log("Enviando para backend")
      const response = await fetch("http://localhost:8000/analise_pagina", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...pageData,
          screenshot
        })
      })

      const result = await response.json()

      // 4. Envia sugestões para o content script aplicar
      await chrome.tabs.sendMessage(tab.id!, {
        action: "apply-suggestions",
        data: result
      })

      sendResponse({ status: "ok" })
    } catch (err) {
      console.error("Erro no background:", err)
      sendResponse({ status: "error", error: String(err) })
    }
  }

  return true
})
