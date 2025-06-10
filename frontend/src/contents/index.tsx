import cssText from "data-text:~style.css"
import type { PlasmoCSConfig } from "plasmo"

import { DomAltApplier } from "../lib/services/domAltApplier"
import { DomFixApplier } from "../lib/services/domFixApplier"
import { DomProcessingService } from "../lib/services/domProcessingService"
import { WcagCheckService } from "../lib/services/wcagCheckService"
import { ReadabilityService } from "../lib/services/readabilityService"

export const getStyle = (): HTMLStyleElement => {
  const baseFontSize = 16

  let updatedCssText = cssText.replaceAll(":root", ":host(plasmo-csui)")
  const remRegex = /([\d.]+)rem/g
  updatedCssText = updatedCssText.replace(remRegex, (match, remValue) => {
    const pixelsValue = parseFloat(remValue) * baseFontSize

    return `${pixelsValue}px`
  })

  const styleElement = document.createElement("style")

  styleElement.textContent = updatedCssText

  return styleElement
}

// Função para gerar ID único (baseada na extensão antiga)
const generateUniqueId = (): string => {
  return `vix-${Math.random().toString(36).substr(2, 9)}`
}

const readabilityService = new ReadabilityService()
const domService = new DomProcessingService(readabilityService)
const altApplier = new DomAltApplier()
const wcagService = new WcagCheckService()
const fixApplier = new DomFixApplier()
let jsPermissionGranted = false

// Função para verificar se elemento deve ser pulado
const isSkippableElement = (node: Element): boolean => {
  const skippableTags = ["script", "style", "svg", "iframe"]
  const tag = node.tagName?.toLowerCase()
  return (
    tag &&
    (skippableTags.includes(tag) ||
      (tag === "link" && node.getAttribute("rel") === "stylesheet"))
  )
}

// Função para verificar se é elemento interativo
const isActionElement = (node: Element): boolean => {
  const actionTags = [
    "button",
    "a",
    "input",
    "select",
    "textarea",
    "label",
    "form",
    "option"
  ]

  const tag = node.tagName?.toLowerCase()
  if (!tag) return false

  // Tags básicas de ação
  if (actionTags.includes(tag)) return true

  // Verificar tipos de input
  if (tag === "input") {
    const type = node.getAttribute("type")?.toLowerCase()
    return (
      type && ["button", "submit", "reset", "checkbox", "radio"].includes(type)
    )
  }

  // Verificar role ARIA
  const role = node.getAttribute("role")?.toLowerCase()
  if (
    role &&
    ["button", "link", "checkbox", "radio", "textbox", "combobox"].includes(
      role
    )
  ) {
    return true
  }

  // Verificar click handlers
  if (node.getAttribute("onclick")) return true

  // Verificar classes interativas
  const interactiveClasses = ["btn", "button", "clickable", "interactive"]
  const classList = node.className?.toString().toLowerCase() || ""
  if (interactiveClasses.some((cls) => classList.includes(cls))) return true

  return false
}

// Função para verificar se é imagem
const isImageElement = (node: Element): boolean => {
  const tag = node.tagName?.toLowerCase()
  if (tag === "img") return true

  // Verificar div com background-image
  if (tag === "div") {
    const computedStyle = window.getComputedStyle(node)
    return computedStyle.backgroundImage !== "none"
  }

  return false
}

// Função principal para processar DOM e coletar estatísticas
const processAndAnalyzeDOM = (rootElement: Element = document.body) => {
  let processedCount = 0
  let totalElements = 0
  let actionElements = 0
  let imageElements = 0

  const walkNodes = (node: Element) => {
    totalElements++

    // Pular elementos que não precisam de ID
    if (isSkippableElement(node)) {
      return
    }

    // Adicionar ID único se não existir
    if (!node.getAttribute("data-vix")) {
      const uniqueId = generateUniqueId()
      node.setAttribute("data-vix", uniqueId)

      // Adicionar id normal se não existir
      if (!node.id) {
        node.setAttribute("id", uniqueId)
      }

      processedCount++
    }

    // Contar elementos interativos
    if (isActionElement(node)) {
      actionElements++
    }

    // Contar imagens
    if (isImageElement(node)) {
      imageElements++
    }

    // Processar filhos
    for (const child of node.children) {
      walkNodes(child)
    }
  }

  walkNodes(rootElement)

  return {
    elementsWithIds: processedCount,
    totalElements,
    actionElements,
    images: imageElements
  }
}

// Função para detectar mudanças no DOM
const setupDomObserver = () => {
  let debounceTimeout: ReturnType<typeof setTimeout>
  const observer = new MutationObserver((mutations) => {
    let hasNewElements = false

    mutations.forEach((mutation) => {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element
            if (!isSkippableElement(element)) {
              hasNewElements = true
            }
          }
        })
      }
    })

    if (hasNewElements) {
      // Debounce para evitar spam
      clearTimeout(debounceTimeout)
      debounceTimeout = setTimeout(() => {
        const stats = processAndAnalyzeDOM()
        if (stats.elementsWithIds > 0) {
          console.log(
            `VIX: Adicionados IDs a ${stats.elementsWithIds} novos elementos`
          )
          notifyBackgroundDomUpdated(stats)
        }
      }, 1000) // Aguardar 1 segundo entre updates
    }
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true
  })

  return observer
}

let currentUrl = window.location.href
let hasGeneratedSummary = false

const detectPageChange = () => {
  if (window.location.href !== currentUrl) {
    console.log("VIX: Nova página detectada:", window.location.href)
    currentUrl = window.location.href
    hasGeneratedSummary = false // Reset flag

    // Reset alt applier para nova página
    altApplier.reset()

    // Aguardar DOM carregar e processar nova página
    setTimeout(() => {
      initialize()
    }, 1000)
  }
}

const setupUrlObserver = () => {
  // Observer para SPAs que mudam URL sem reload
  const originalPushState = history.pushState
  const originalReplaceState = history.replaceState

  history.pushState = function (...args) {
    originalPushState.apply(history, args)
    setTimeout(detectPageChange, 100)
  }

  history.replaceState = function (...args) {
    originalReplaceState.apply(history, args)
    setTimeout(detectPageChange, 100)
  }

  window.addEventListener("popstate", detectPageChange)
}

// Função para notificar background sobre mudanças
const notifyBackgroundDomUpdated = async (
  stats: ReturnType<typeof processAndAnalyzeDOM>,
  imagesNeedingAlt?: number
) => {
  try {
    chrome.runtime.sendMessage(
      {
        type: "DOM_UPDATED",
        body: {
          url: window.location.href,
          timestamp: Date.now(),
          ...stats,
          imagesNeedingAlt: imagesNeedingAlt || 0
        }
      },
      (response) => {
        if (response?.success) {
          console.log("VIX: Stats enviadas para background:", stats)
        }
      }
    )
  } catch (error) {
    console.error("VIX: Erro ao notificar background:", error)
  }
}

// Listener para comandos de processamento de alt text
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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

// Inicialização quando página carrega
const initialize = () => {
  console.log("VIX: Content script inicializado para:", window.location.href)

  // Processamento básico atual
  const basicStats = processAndAnalyzeDOM()
  console.log("VIX: Estatísticas básicas:", basicStats)

  // Processamento avançado
  try {
    console.log("VIX: Iniciando processamento avançado...")
    const processingResult = domService.processDocumentWithReadability(document)
    if(processingResult.originalDom){
      console.log("VIX: DOM processado com sucesso")
      
      const { originalDom, cleanedContent, shouldUseReadability, stats } = processingResult
      
      const advancedStats = domService.generateStats(originalDom)
      const images = domService.extractImages(originalDom)
      const actions = domService.extractActionElements(originalDom)
      let textForSummary = ''
      
      if (shouldUseReadability && cleanedContent) {
        console.log("VIX: Usando texto limpo do Readability")
        textForSummary = cleanedContent.textContent
      } else {
        console.log("VIX: Usando texto original extraído")
        textForSummary = domService.extractAllText(originalDom)
      }

      console.log(`VIX: Texto para resumo: ${textForSummary.length} caracteres`)
      console.log("VIX: Estatísticas de processamento:", stats)

      // Filtrar imagens que precisam de alt text
      const imagesNeedingAlt = domService.filterImagesNeedingAlt(images)
      
      console.log("VIX: Estatísticas avançadas:", {
        ...advancedStats,
        ...stats,
        imagesNeedingAlt: imagesNeedingAlt.length,
        actionElements: actions.length,
        readabilityUsed: shouldUseReadability
      })

      // Resto da lógica continua igual...
      const enhancedStats = {
        ...basicStats,
        imagesNeedingAlt: imagesNeedingAlt.length
      }

      if (imagesNeedingAlt.length > 0) {
        const imageUrls = domService.getProcessableImageUrls(imagesNeedingAlt)
        chrome.runtime.sendMessage({
          type: "IMAGES_DETECTED",
          body: {
            images: imageUrls,
            url: window.location.href
          }
        })
      }

      if (textForSummary.length > 500 && !hasGeneratedSummary) {
        console.log("VIX: Texto suficiente, solicitando resumo...")
        hasGeneratedSummary = true
        requestPageSummary(textForSummary)
      } else if (hasGeneratedSummary) {
        console.log("VIX: Resumo já foi gerado para esta página")
      } else {
        console.log("VIX: Texto insuficiente para resumo:", textForSummary.length)
      }

      setupDomObserver()
      notifyBackgroundDomUpdated(enhancedStats, imagesNeedingAlt.length)

      wcagService.runCheck().then((issues) => {
        chrome.runtime.sendMessage({
          type: "WCAG_ISSUES_DETECTED",
          body: { issues }
        })
      })
    } else {
      console.log("VIX: Falha ao processar DOM")
      setupDomObserver()
      notifyBackgroundDomUpdated(basicStats)
      wcagService.runCheck().then((issues) => {
        chrome.runtime.sendMessage({
          type: "WCAG_ISSUES_DETECTED",
          body: { issues }
        })
      })
    }
  } catch (error) {
    console.error("VIX: Erro no processamento avançado:", error)
    setupDomObserver()
    notifyBackgroundDomUpdated(basicStats)
    wcagService.runCheck().then((issues) => {
      chrome.runtime.sendMessage({
        type: "WCAG_ISSUES_DETECTED",
        body: { issues }
      })
    })
  }
}

const requestPageSummary = async (text: string) => {
  try {
    // Limitar texto para não estourar limite de tokens
    const truncatedText =
      text.length > 50000 ? text.substring(0, 50000) + "..." : text

    console.log(
      `VIX: Solicitando resumo para ${truncatedText.length} caracteres`
    )

    chrome.runtime.sendMessage(
      {
        type: "REQUEST_SUMMARY",
        body: {
          text: truncatedText,
          url: window.location.href
        }
      },
      (response) => {
        console.log("VIX: Resposta da solicitação de resumo:", response)
        if (!response?.success) {
          console.error("VIX: Erro na solicitação:", response?.error)
        }
      }
    )

    console.log("VIX: Mensagem enviada para background")
  } catch (error) {
    console.error("VIX: Erro ao solicitar resumo:", error)
  }
}

// Executar quando DOM estiver pronto
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize)
} else {
  initialize()
}

setupUrlObserver()

export {
  generateUniqueId,
  isSkippableElement,
  isActionElement,
  isImageElement,
  processAndAnalyzeDOM
}
