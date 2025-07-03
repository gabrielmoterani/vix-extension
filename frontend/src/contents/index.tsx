import cssText from "data-text:~style.css"
import type { PlasmoCSConfig } from "plasmo"

import { DomAltApplier } from "../lib/services/domAltApplier"
import { DomFixApplier } from "../lib/services/domFixApplier"
import { DomProcessingService } from "../lib/services/domProcessingService"
import { WcagCheckService } from "../lib/services/wcagCheckService"
import { ReadabilityService } from "../lib/services/readabilityService"
import { AdBlockService } from "../lib/services/adBlockService"
import { setupMessageHandler } from "./handlers/messageHandler"
import { setupUrlObserver } from "./observers/urlObserver"
import { initialize, resetSummaryFlag } from "./services/pageInitializer"
import { generateUniqueId, processAndAnalyzeDOM } from "./services/domProcessor"
import { isSkippableElement, isActionElement, isImageElement } from "./utils/elementUtils"

export const getStyle = (): HTMLStyleElement => {
  const baseFontSize = 16

  let updatedCssText = cssText.replaceAll(":root", ":host(plasmo-csui)")
  const remRegex = /([\d.]+)rem/g
  updatedCssText = updatedCssText.replace(remRegex, (_match, remValue) => {
    const pixelsValue = parseFloat(remValue) * baseFontSize

    return `${pixelsValue}px`
  })

  const styleElement = document.createElement("style")

  styleElement.textContent = updatedCssText

  return styleElement
}

const readabilityService = new ReadabilityService()
const domService = new DomProcessingService(readabilityService)
const altApplier = new DomAltApplier()
const wcagService = new WcagCheckService()
const fixApplier = new DomFixApplier()
const adBlockService = new AdBlockService()

let currentUrl = window.location.href

const detectPageChange = () => {
  if (window.location.href !== currentUrl) {
    console.log("VIX: Nova página detectada:", window.location.href)
    currentUrl = window.location.href
    resetSummaryFlag()

    // Reset alt applier para nova página
    altApplier.reset()

    // Aguardar DOM carregar e processar nova página
    setTimeout(async () => {
      await initialize(domService, adBlockService, wcagService, altApplier)
    }, 1000)
  }
}

// Configurar handlers e observers
setupMessageHandler(altApplier, fixApplier)
setupUrlObserver(detectPageChange)

// Executar quando DOM estiver pronto
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => initialize(domService, adBlockService, wcagService, altApplier))
} else {
  initialize(domService, adBlockService, wcagService, altApplier)
}

export {
  generateUniqueId,
  isSkippableElement,
  isActionElement,
  isImageElement,
  processAndAnalyzeDOM
}
