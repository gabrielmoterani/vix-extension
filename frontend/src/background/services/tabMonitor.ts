import { updateCurrentTab } from "../handlers/messageHandler"

export const setupTabMonitor = () => {
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
}