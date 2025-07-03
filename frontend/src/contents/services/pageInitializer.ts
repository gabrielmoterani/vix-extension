import { DomProcessingService } from "../../lib/services/domProcessingService"
import { AdBlockService } from "../../lib/services/adBlockService"
import { WcagCheckService } from "../../lib/services/wcagCheckService"
import { DomAltApplier } from "../../lib/services/domAltApplier"
import { BackgroundImageProcessor } from "../../lib/services/backgroundImageProcessor"
import { processAndAnalyzeDOM } from "./domProcessor"
import { setupDomObserver } from "../observers/domObserver"

let hasGeneratedSummary = false

export const notifyBackgroundDomUpdated = async (
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

export const requestPageSummary = async (text: string) => {
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

export const initialize = async (
  domService: DomProcessingService,
  adBlockService: AdBlockService,
  wcagService: WcagCheckService,
  altApplier: DomAltApplier
) => {
  console.log("VIX: Content script inicializado para:", window.location.href)

  // Primeiro, remover anúncios da DOM antes de qualquer processamento
  try {
    console.log("VIX: Removendo anúncios da página...")
    const adBlockResult = await adBlockService.removeAdsFromDOM(document)
    console.log(`VIX: Anúncios removidos: ${adBlockResult.removedCount} elementos`)
    if (adBlockResult.processedSelectors.length > 0) {
      console.log("VIX: Seletores processados:", adBlockResult.processedSelectors)
    }
  } catch (error) {
    console.error("VIX: Erro ao remover anúncios:", error)
  }

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
      
      // Detectar elementos com background-image que precisam de alt text
      const backgroundImages = BackgroundImageProcessor.detectBackgroundImages()
      const backgroundImagesNeedingAlt = backgroundImages.filter(img => img.needsAlt)
      
      console.log("VIX: Estatísticas avançadas:", {
        ...advancedStats,
        ...stats,
        imagesNeedingAlt: imagesNeedingAlt.length,
        backgroundImagesNeedingAlt: backgroundImagesNeedingAlt.length,
        actionElements: actions.length,
        readabilityUsed: shouldUseReadability
      })

      // Log cache statistics
      const cacheStats = domService.getCacheStats()
      console.log("VIX: Cache statistics:", cacheStats)

      // Incluir dados de imagem nas notificações (incluindo background images)
      const totalImagesNeedingAlt = imagesNeedingAlt.length + backgroundImagesNeedingAlt.length
      const enhancedStats = {
        ...basicStats,
        imagesNeedingAlt: totalImagesNeedingAlt
      }

      // Processar imagens normais e background juntas
      if (imagesNeedingAlt.length > 0 || backgroundImagesNeedingAlt.length > 0) {
        const normalImageUrls = domService.getProcessableImageUrls(imagesNeedingAlt)
        const backgroundImageUrls = BackgroundImageProcessor.toImageAltFormat(backgroundImagesNeedingAlt)
          .map(img => ({ ...img, isBackground: true }))

        const allImageUrls = [...normalImageUrls, ...backgroundImageUrls]
        
        chrome.runtime.sendMessage({
          type: "IMAGES_DETECTED",
          body: {
            images: allImageUrls,
            url: window.location.href
          }
        })
        
        console.log(`VIX: Detectadas ${normalImageUrls.length} imagens normais e ${backgroundImageUrls.length} background-images`)
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

      setupDomObserver((stats) => notifyBackgroundDomUpdated(stats))
      notifyBackgroundDomUpdated(enhancedStats, totalImagesNeedingAlt)

      wcagService.runCheck().then((issues) => {
        chrome.runtime.sendMessage({
          type: "WCAG_ISSUES_DETECTED",
          body: { issues }
        })
      })
    } else {
      console.log("VIX: Falha ao processar DOM")
      setupDomObserver((stats) => notifyBackgroundDomUpdated(stats))
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
    setupDomObserver((stats) => notifyBackgroundDomUpdated(stats))
    notifyBackgroundDomUpdated(basicStats)
    wcagService.runCheck().then((issues) => {
      chrome.runtime.sendMessage({
        type: "WCAG_ISSUES_DETECTED",
        body: { issues }
      })
    })
  }
}

export const resetSummaryFlag = () => {
  hasGeneratedSummary = false
}