import {
  handleChatRequest,
  handleDomUpdated,
  handleGetState,
  handleImageAltRequest,
  handleImagesDetected,
  handleSummaryRequest,
  handleWcagIssuesDetected,
  updateCurrentTab
} from "./handlers/messageHandler"

// Configuração do sidepanel
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  console.log("VIX: Extensão instalada")
})

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    await chrome.sidePanel.open({ tabId: tab.id })
    console.log("VIX: Sidepanel aberto")
  }
})

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

    // ADICIONAR novo case:
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

// Monitoramento de abas
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId)
  if (tab.url) {
    updateCurrentTab(activeInfo.tabId, tab.url, "active")
    console.log("VIX: Aba ativada:", tab.url)
  }
})

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    updateCurrentTab(tabId, tab.url, "complete")
    console.log("VIX: Página carregada:", tab.url)
  }
})

export {}
