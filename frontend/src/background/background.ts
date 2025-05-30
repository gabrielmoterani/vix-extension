// Apenas para comunicação entre content script e popup/options
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle messages from content script or popup
  console.log('Background received message:', message);
});