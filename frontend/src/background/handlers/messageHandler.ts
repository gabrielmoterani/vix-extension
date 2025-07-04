// Re-export all handlers from their specific modules
export { handleDomUpdated, handleGetState } from "./domHandler"
export { handleSummaryRequest } from "./summaryHandler"
export { handleChatRequest } from "./chatHandler"
export { handleImageAltRequest, handleImagesDetected } from "./imageHandler"
export { handleWcagIssuesDetected } from "./wcagHandler"
export { handleUpdateActionElements } from "./actionElementsHandler"

// Re-export state management functions
export { updateCurrentTab } from "../state/backgroundState"