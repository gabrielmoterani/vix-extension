import { DomProcessingService } from "../../lib/services/domProcessingService"
import { AdBlockService } from "../../lib/services/adBlockService"
import { WcagCheckService } from "../../lib/services/wcagCheckService"
import { DomAltApplier } from "../../lib/services/domAltApplier"
import { processAndAnalyzeDOM } from "./domProcessor"
import { setupDomObserver } from "../observers/domObserver"
import { notifyBackgroundDomUpdated, notifyWcagIssues } from "./backgroundCommunicator"
import { performAdvancedDomAnalysis, handleSummaryRequest, resetSummaryFlag } from "./domAnalysisService"
import { initializeAdBlock } from "./adBlockInitializer"

export const initialize = async (
  domService: DomProcessingService,
  adBlockService: AdBlockService,
  wcagService: WcagCheckService,
  _altApplier: DomAltApplier
) => {
  console.log("VIX: Content script inicializado para:", window.location.href)

  // 1. Inicializar AdBlock
  await initializeAdBlock(adBlockService)

  // 2. Processamento básico do DOM
  const basicStats = processAndAnalyzeDOM()
  console.log("VIX: Estatísticas básicas:", basicStats)

  // 3. Processamento avançado
  const analysisResult = await performAdvancedDomAnalysis(domService)
  
  if (analysisResult.success) {
    // Sucesso no processamento avançado
    const enhancedStats = {
      ...basicStats,
      imagesNeedingAlt: analysisResult.totalImagesNeedingAlt
    }

    // Solicitar resumo se necessário
    if (analysisResult.shouldRequestSummary) {
      await handleSummaryRequest(analysisResult.textForSummary)
    }

    // Configurar observadores e notificar background
    setupDomObserver((stats) => notifyBackgroundDomUpdated(stats))
    notifyBackgroundDomUpdated(enhancedStats, analysisResult.totalImagesNeedingAlt)

    // Executar verificação WCAG
    runWcagCheck(wcagService)
  } else {
    // Fallback para quando processamento avançado falha
    handleProcessingFailure(basicStats, wcagService)
  }
}

const runWcagCheck = (wcagService: WcagCheckService) => {
  wcagService.runCheck().then((issues) => {
    notifyWcagIssues(issues)
  })
}

const handleProcessingFailure = (
  basicStats: ReturnType<typeof processAndAnalyzeDOM>,
  wcagService: WcagCheckService
) => {
  console.log("VIX: Falha ao processar DOM - usando fallback")
  setupDomObserver((stats) => notifyBackgroundDomUpdated(stats))
  notifyBackgroundDomUpdated(basicStats)
  runWcagCheck(wcagService)
}

export { resetSummaryFlag }