import { useState, useEffect } from "react"
import { StatusCard } from "./components/StatusCard"
import { StatsList } from "./components/StatsList"
import { SummaryCard } from "./components/SummaryCard"
import { ImageAltProgressCard } from "./components/ImageAltProgressCard"
import type { BackgroundState } from "../lib/types/messaging"
import { ChatInterface } from './components/ChatInterface'

function IndexSidePanel() {
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

  useEffect(() => {
  // Solicitar estado inicial
  chrome.runtime.sendMessage({ type: "GET_STATE" }, (response) => {
    if (response?.success) {
      setState(response.state)
      setIsConnected(true)
      console.log('ENTRA NO GET_STATE', response.state)
      if (response.state.imagesNeedingAlt) {
      setImageAltState(prev => ({
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
          console.log('RESPONSE SUCCESS', response.state)
          
          // USAR callback function para acessar estado atual
          setState(prevState => {
            // Se URL mudou, limpar resumo
            if (prevState?.currentTab?.url !== response.state.currentTab?.url) {
              console.log('VIX: URL mudou, limpando resumo e resetando alt text')
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
            }
            return response.state
          })
        }
      })

      // USAR callback function para acessar summaryState atual
      setSummaryState(prevSummary => {
        // Só iniciar loading se ainda não temos resumo
        if (message.data.status === "completed" && !prevSummary.summary) {
          return { ...prevSummary, isLoading: true, error: undefined }
        }
        return prevSummary
      })
    }

    if (message.type === "PAGE_SUMMARY_GENERATED") {
      console.log('VIX: Resumo recebido no sidepanel:', message.data)
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
      console.log('VIX: Imagens detectadas:', message.data.images.length)
      setImageAltState(prev => ({
        ...prev,
        total: message.data.images.length,
        completed: 0,
        failed: 0,
        inProgress: 0,
        isProcessing: false
      }))
    }

    if (message.type === "IMAGE_ALT_PROGRESS") {
      setImageAltState(prev => ({
        ...prev,
        completed: message.data.completed,
        failed: message.data.failed,
        inProgress: message.data.inProgress,
        isProcessing: true
      }))
    }

    if (message.type === "IMAGE_ALT_COMPLETED") {
      setImageAltState(prev => ({
        ...prev,
        completed: message.data.completed,
        failed: message.data.failed,
        inProgress: 0,
        isProcessing: false
      }))
    }
  }

  chrome.runtime.onMessage.addListener(messageListener)
  
  return () => {
    chrome.runtime.onMessage.removeListener(messageListener)
  }
}, [])

  const handleStartImageProcessing = () => {
    if (!summaryState.summary) {
      alert('Aguarde a geração do resumo da página antes de processar imagens.')
      return
    }

    setImageAltState(prev => ({ ...prev, isProcessing: true }))
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
        className="w-full h-full flex items-center justify-center p-4"
        role="status"
        aria-live="polite"
      >
        <div className="text-center">
          <div 
            className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"
            aria-hidden="true"
          ></div>
          <span className="text-sm text-gray-600">Conectando...</span>
        </div>
      </div>
    )
  }

  const domStats = state?.domStats ? [
    { 
      label: "Elementos com ID", 
      value: state.domStats.elementsWithIds,
      description: "Elementos que receberam identificadores únicos para acessibilidade" 
    },
    { 
      label: "Total de elementos", 
      value: state.domStats.totalElements || "N/A" 
    },
    { 
      label: "Elementos interativos", 
      value: state.domStats.actionElements || "N/A",
      description: "Botões, links e campos de formulário detectados"
    },
    { 
      label: "Imagens encontradas", 
      value: state.domStats.images || "N/A" 
    },
    { 
      label: "Imagens sem alt adequado", 
      value: state.domStats.imagesNeedingAlt || "N/A",
      description: "Imagens que precisam de descrição alternativa"
    }
  ] : []

  return (
    <main 
      className="w-full h-full p-4 bg-gray-50"
      role="main"
      aria-labelledby="main-heading"
    >
      <header className="mb-6">
        <h1 
          id="main-heading"
          className="text-xl font-bold text-gray-800"
        >
          VIX Assistente de Acessibilidade
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Sistema inteligente para melhorar a acessibilidade web
        </p>
      </header>

      <div className="space-y-4" role="region" aria-label="Status e estatísticas">
        <StatusCard
          title="Status do DOM"
          variant="success"
          icon="🔍"
        >
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
    </main>
  )
}

export default IndexSidePanel