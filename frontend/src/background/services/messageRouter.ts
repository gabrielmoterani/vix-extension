import {
  handleChatRequest,
  handleDomUpdated,
  handleGetState,
  handleImageAltRequest,
  handleImagesDetected,
  handleSummaryRequest,
  handleWcagIssuesDetected
} from "../handlers/messageHandler"

export const setupMessageRouter = () => {
  // Sistema de mensagens robusto
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const tabId = sender.tab?.id || 0

    switch (message.name || message.type) {
      case "dom-updated":
      case "DOM_UPDATED":
        handleDomUpdated(
          { body: message.body || message.data } as any,
          { send: sendResponse } as any
        )
        break

      case "get-state":
      case "GET_STATE":
        handleGetState({ body: {} } as any, { send: sendResponse } as any)
        break

      case "request-summary":
      case "REQUEST_SUMMARY":
        console.log("FICA ENTRANDO NO SWITCH:", message.name)
        handleSummaryRequest(
          { body: message.body || message.data } as any,
          { send: sendResponse } as any
        )
        break

      case "chat-request":
      case "CHAT_REQUEST":
        handleChatRequest(
          { body: message.body || message.data } as any,
          { send: sendResponse } as any
        )
        break

      case "image-alt-request":
      case "IMAGE_ALT_REQUEST":
        handleImageAltRequest(
          { body: message.body || message.data } as any,
          { send: sendResponse } as any
        )
        break

      case "images-detected":
      case "IMAGES_DETECTED":
        handleImagesDetected(
          { body: message.body || message.data } as any,
          { send: sendResponse } as any
        )
        break

      case "WCAG_ISSUES_DETECTED":
        handleWcagIssuesDetected(
          { body: message.body || message.data } as any,
          { send: sendResponse } as any
        )
        break

      default:
        console.log("VIX: Mensagem não reconhecida:", message)
        sendResponse({ success: false, error: "Unknown message type" })
    }

    return true
  })
}