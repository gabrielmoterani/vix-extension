import { DomProcessingService } from "../../lib/services/domProcessingService"
import { detectAndProcessImages, notifyBackgroundAboutImages } from "./imageDetectionService"
import { requestPageSummary } from "./backgroundCommunicator"

export interface DomAnalysisResult {
  success: boolean
  textForSummary: string
  imageResult: ReturnType<typeof detectAndProcessImages>
  advancedStats: any
  totalImagesNeedingAlt: number
  shouldRequestSummary: boolean
}

let hasGeneratedSummary = false

export const performAdvancedDomAnalysis = (
  domService: DomProcessingService
): DomAnalysisResult => {
  console.log("VIX: Iniciando processamento avançado...")
  
  const processingResult = domService.processDocumentWithReadability(document)
  
  if (!processingResult.originalDom) {
    return {
      success: false,
      textForSummary: '',
      imageResult: {
        normalImages: [],
        backgroundImages: [],
        totalCount: 0,
        normalImageUrls: [],
        backgroundImageUrls: [],
        allImageUrls: []
      },
      advancedStats: {},
      totalImagesNeedingAlt: 0,
      shouldRequestSummary: false
    }
  }

  console.log("VIX: DOM processado com sucesso")
  
  const { originalDom, cleanedContent, shouldUseReadability, stats } = processingResult
  
  // Gerar estatísticas avançadas
  const advancedStats = domService.generateStats(originalDom)
  const actions = domService.extractActionElements(originalDom)
  
  // Extrair texto para resumo
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

  // Detectar e processar imagens
  const imageResult = detectAndProcessImages(domService, originalDom)
  
  // Log estatísticas completas
  console.log("VIX: Estatísticas avançadas:", {
    ...advancedStats,
    ...stats,
    imagesNeedingAlt: imageResult.normalImages.length,
    backgroundImagesNeedingAlt: imageResult.backgroundImages.length,
    actionElements: actions.length,
    readabilityUsed: shouldUseReadability
  })

  // Log cache statistics
  const cacheStats = domService.getCacheStats()
  console.log("VIX: Cache statistics:", cacheStats)

  // Notificar background sobre imagens detectadas
  notifyBackgroundAboutImages(imageResult)

  // Verificar se deve solicitar resumo
  const shouldRequestSummary = textForSummary.length > 500 && !hasGeneratedSummary

  return {
    success: true,
    textForSummary,
    imageResult,
    advancedStats: {
      ...advancedStats,
      ...stats,
      actionElements: actions.length,
      readabilityUsed: shouldUseReadability
    },
    totalImagesNeedingAlt: imageResult.totalCount,
    shouldRequestSummary
  }
}

export const handleSummaryRequest = async (textForSummary: string) => {
  if (hasGeneratedSummary) {
    console.log("VIX: Resumo já foi gerado para esta página")
    return
  }

  if (textForSummary.length <= 500) {
    console.log("VIX: Texto insuficiente para resumo:", textForSummary.length)
    return
  }

  console.log("VIX: Texto suficiente, solicitando resumo...")
  hasGeneratedSummary = true
  await requestPageSummary(textForSummary)
}

export const resetSummaryFlag = () => {
  hasGeneratedSummary = false
}