import type { BackgroundState } from "../../lib/types/messaging"

// Estado global do background
let backgroundState: BackgroundState & {
  summary?: string
  actionElements?: any[]
  imagesNeedingAlt?: Array<{ id: string; url: string; originalAlt?: string; isBackground?: boolean }>
} = {
  currentTab: null,
  domStats: {
    elementsWithIds: 0,
    totalElements: 0,
    actionElements: 0,
    images: 0,
    imagesNeedingAlt: 0
  },
  analysisStatus: "idle",
  imagesNeedingAlt: []
}

// Função para atualizar tab ativa
export const updateCurrentTab = (
  tabId: number,
  url: string,
  status: string
) => {
  backgroundState.currentTab = { id: tabId, url, status }
}

// Função para atualizar dados da página
export const updatePageData = (
  summary: string,
  actionElements: any[],
  imagesNeedingAlt: Array<{ id: string; url: string; originalAlt?: string; isBackground?: boolean }>
) => {
  backgroundState.summary = summary
  backgroundState.actionElements = actionElements
  backgroundState.imagesNeedingAlt = imagesNeedingAlt
}

// Função para atualizar estatísticas do DOM
export const updateDomStats = (stats: {
  elementsWithIds: number
  totalElements: number
  actionElements: number
  images: number
  imagesNeedingAlt: number
}) => {
  backgroundState.domStats = stats
}

// Função para atualizar resumo
export const updateSummary = (summary: string) => {
  backgroundState.summary = summary
}

// Função para atualizar imagens que precisam de alt text
export const updateImagesNeedingAlt = (images: Array<{ id: string; url: string; originalAlt?: string; isBackground?: boolean }>) => {
  backgroundState.imagesNeedingAlt = images
  if (backgroundState.domStats) {
    backgroundState.domStats.imagesNeedingAlt = images.length
  }
}

// Exportar estado para outros módulos
export const getBackgroundState = () => backgroundState