import "~style.css"

import { useEffect, useState } from "react"

import { useLocale } from "../lib/i18n"
import { LanguageSelector } from "./components/LanguageSelector"

import type { BackgroundState } from "../lib/types/messaging"
import { ChatInterface } from "./components/ChatInterface"
import { ImageAltProgressCard } from "./components/ImageAltProgressCard"
import { SimpleThumbnails } from "./components/ImageAnalysisCard"
import { StatsList } from "./components/StatsList"
import { StatusCard } from "./components/StatusCard"
import { SummaryCard } from "./components/SummaryCard"
import { TabsContainer } from "./components/TabsContainer"
import { WcagIssuesCard } from "./components/WcagIssuesCard"
import { useSimpleImages } from "./hooks/useImageAnalysis"

function IndexSidePanel() {
  const { t, locale, setLocale } = useLocale()
  const [state, setState] = useState<BackgroundState | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [summaryState, setSummaryState] = useState<{
    summary: string
    isLoading: boolean
    error?: string
    metadata?: any
  }>({
    summary: "",
    isLoading: false
  })
  const [imageAltState, setImageAltState] = useState<{
    total: number
    completed: number
    failed: number
    inProgress: number
    isProcessing: boolean
  }>({
    total: 0,
    completed: 0,
    failed: 0,
    inProgress: 0,
    isProcessing: false
  })
  const [wcagIssues, setWcagIssues] = useState<any[]>([])
  const { images, addImages, updateImageAlt, setImageStatus, clearImages } = useSimpleImages()

  useEffect(() => {
    // Solicitar estado inicial
    chrome.runtime.sendMessage({ type: "GET_STATE" }, (response) => {
      if (response?.success) {
        setState(response.state)
        setIsConnected(true)
        console.log("ENTRA NO GET_STATE", response.state)
        if (response.state.imagesNeedingAlt) {
          setImageAltState((prev) => ({
            ...prev,
            total: response.state.imagesNeedingAlt?.length || 0
          }))
        }
      }
    })

    // MODIFICAR o messageListener para usar refs em vez de state diretamente:
    const messageListener = (message: any) => {
      if (message.type === "PAGE_ANALYZED") {
        // Solicitar estado atualizado
        chrome.runtime.sendMessage({ type: "GET_STATE" }, (response) => {
          if (response?.success) {
            console.log("RESPONSE SUCCESS", response.state)

            // USAR callback function para acessar estado atual
            setState((prevState) => {
              // Se URL mudou, limpar resumo
              if (
                prevState?.currentTab?.url !== response.state.currentTab?.url
              ) {
                console.log(
                  "VIX: URL mudou, limpando resumo e resetando alt text"
                )
                setSummaryState({
                  summary: "",
                  isLoading: false
                })
                setImageAltState({
                  total: 0,
                  completed: 0,
                  failed: 0,
                  inProgress: 0,
                  isProcessing: false
                })
                clearImages()
              }
              return response.state
            })
          }
        })

        // USAR callback function para acessar summaryState atual
        setSummaryState((prevSummary) => {
          // Só iniciar loading se ainda não temos resumo
          if (message.data.status === "completed" && !prevSummary.summary) {
            return { ...prevSummary, isLoading: true, error: undefined }
          }
          return prevSummary
        })
      }

      if (message.type === "PAGE_SUMMARY_GENERATED") {
        console.log("VIX: Resumo recebido no sidepanel:", message.data)
        setSummaryState({
          summary: message.data.summary,
          isLoading: false,
          metadata: {
            textLength: message.data.textLength,
            processingTime: message.data.processingTime,
            model: message.data.model
          }
        })
      }

      if (message.type === "IMAGES_DETECTED") {
        console.log("VIX: Imagens detectadas:", message.data.images.length)
        setImageAltState((prev) => ({
          ...prev,
          total: message.data.images.length,
          completed: 0,
          failed: 0,
          inProgress: 0,
          isProcessing: false
        }))

        // Adicionar imagens ao contexto simples
        if (message.data.images && Array.isArray(message.data.images)) {
          addImages(message.data.images.map((img: any) => ({
            id: img.id,
            url: img.url,
            originalAlt: img.originalAlt
          })))
        }
      }

      if (message.type === "IMAGE_ALT_PROGRESS") {
        setImageAltState((prev) => ({
          ...prev,
          completed: message.data.completed,
          failed: message.data.failed,
          inProgress: message.data.inProgress,
          isProcessing: true
        }))

        // Atualizar alts gerados individualmente
        if (message.data.completedJobs && Array.isArray(message.data.completedJobs)) {
          message.data.completedJobs.forEach((job: any) => {
            updateImageAlt(job.id, job.altText, 'completed')
          })
        }
      }

      if (message.type === "IMAGE_ALT_COMPLETED") {
        setImageAltState((prev) => ({
          ...prev,
          completed: message.data.completed,
          failed: message.data.failed,
          inProgress: 0,
          isProcessing: false
        }))

        // Processar resultados finais
        if (message.data.results && Array.isArray(message.data.results)) {
          message.data.results.forEach((result: any) => {
            if (result.altText) {
              updateImageAlt(result.id, result.altText, 'completed')
            } else if (result.error) {
              updateImageAlt(result.id, '', 'failed')
            }
          })
        }
      }

      if (message.type === "WCAG_APPLY_FIXES") {
        setWcagIssues(message.data.fixes || [])
      }
    }

    chrome.runtime.onMessage.addListener(messageListener)

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener)
    }
  }, [])

  const handleStartImageProcessing = () => {
    if (!summaryState.summary) {
      alert(t("wait_summary"))
      return
    }

    setImageAltState((prev) => ({ ...prev, isProcessing: true }))
    
    // Marcar todas as imagens como processando
    images.forEach(img => {
      if (img.status === 'pending') {
        setImageStatus(img.id, 'processing')
      }
    })

    chrome.runtime.sendMessage({
      type: "IMAGE_ALT_REQUEST",
      body: {
        images: state?.imagesNeedingAlt || [],
        summary: summaryState.summary
      }
    })
  }

  if (!isConnected) {
    return (
      <div
        className="vix-w-full vix-h-full vix-flex vix-items-center vix-justify-center vix-p-4"
        role="status"
        aria-live="polite">
        <div className="vix-text-center">
          <div
            className="vix-animate-spin vix-rounded-full vix-h-8 vix-w-8 vix-border-b-2 vix-border-blue-600 vix-mx-auto vix-mb-2"
            aria-hidden="true"></div>
          <span className="vix-text-sm vix-text-gray-600">{t("connecting")}</span>
        </div>
      </div>
    )
  }

  const domStats = state?.domStats
    ? [
        {
          label: t("stats_elements_with_id"),
          value: state.domStats.elementsWithIds,
          description: t("stats_desc_elements_with_id")
        },
        {
          label: t("stats_total_elements"),
          value: state.domStats.totalElements || "N/A"
        },
        {
          label: t("stats_action_elements"),
          value: state.domStats.actionElements || "N/A",
          description: t("stats_desc_action_elements")
        },
        {
          label: t("stats_images"),
          value: state.domStats.images || "N/A"
        },
        {
          label: t("stats_images_needing_alt"),
          value: state.domStats.imagesNeedingAlt || "N/A",
          description: t("stats_desc_images_needing_alt")
        }
      ]
    : []

  return (
    <main
      className="vix-w-full vix-h-full vix-p-4 vix-bg-gray-50"
      role="main"
      aria-labelledby="main-heading">
      <header className="vix-mb-6">
        <h1
          id="main-heading"
          className="vix-text-xl vix-font-bold vix-text-gray-800">
          {t("app_title")}
        </h1>
        <p className="vix-text-sm vix-text-gray-600 vix-mt-1">
          {t("app_description")}
        </p>
        <div className="vix-mt-2">
          <LanguageSelector locale={locale} setLocale={setLocale} />
        </div>
      </header>

      <TabsContainer
        defaultTab="essential"
        tabs={[
          {
            id: "essential",
            label: t("tab_essential"),
            icon: "⭐",
            content: (
              <div className="vix-space-y-4">
                <SummaryCard
                  summary={summaryState.summary}
                  isLoading={summaryState.isLoading}
                  error={summaryState.error}
                  metadata={summaryState.metadata}
                />
                <ChatInterface
                  isReady={!!summaryState.summary}
                  disabled={summaryState.isLoading}
                />
              </div>
            )
          },
          {
            id: "analysis",
            label: t("tab_analysis"),
            icon: "📊",
            content: (
              <div className="vix-space-y-4">
                <StatusCard title={t("dom_status")} variant="success" icon="🔍">
                  <StatsList stats={domStats} />
                </StatusCard>
                <ImageAltProgressCard
                  total={imageAltState.total}
                  completed={imageAltState.completed}
                  failed={imageAltState.failed}
                  inProgress={imageAltState.inProgress}
                  isProcessing={imageAltState.isProcessing}
                  onStartProcessing={handleStartImageProcessing}
                />
                <WcagIssuesCard issues={wcagIssues} />
              </div>
            )
          },
          {
            id: "images",
            label: t("tab_image_analysis"),
            icon: "🖼️",
            content: (
              <div className="vix-space-y-4">
                <SimpleThumbnails images={images} />
              </div>
            )
          }
        ]}
      />
    </main>
  )
}

export default IndexSidePanel
