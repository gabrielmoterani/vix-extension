export const setupExtensionConfig = () => {
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
}