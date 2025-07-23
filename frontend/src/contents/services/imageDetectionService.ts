import { DomProcessingService } from "../../lib/services/domProcessingService"
import { BackgroundImageProcessor } from "../../lib/services/backgroundImageProcessor"
import { ImageFilterService } from "../../lib/services/imageFilterService"
import { notifyImagesDetected } from "./backgroundCommunicator"

export interface ImageDetectionResult {
  normalImages: any[]
  backgroundImages: any[]
  totalCount: number
  normalImageUrls: Array<{id: string, url: string, originalAlt?: string}>
  backgroundImageUrls: Array<{id: string, url: string, isBackground: boolean}>
  allImageUrls: Array<{id: string, url: string, originalAlt?: string, isBackground?: boolean}>
  filterStats: {
    totalDetected: number
    totalFiltered: number
    totalProcessable: number
    filterRate: string
    categoryBreakdown: Record<string, number>
  }
}

export const detectAndProcessImages = (
  domService: DomProcessingService,
  originalDom: any
): ImageDetectionResult => {
  console.log("VIX: Iniciando detecção de imagens...")

  // Extrair imagens normais
  const images = domService.extractImages(originalDom)
  const imagesNeedingAlt = domService.filterImagesNeedingAlt(images)
  
  // Detectar elementos com background-image que precisam de alt text
  const backgroundImages = BackgroundImageProcessor.detectBackgroundImages()
  const backgroundImagesNeedingAlt = backgroundImages.filter(img => img.needsAlt)
  
  console.log("VIX: Resultados da detecção de imagens:", {
    imagesNeedingAlt: imagesNeedingAlt.length,
    backgroundImagesNeedingAlt: backgroundImagesNeedingAlt.length,
    totalImages: imagesNeedingAlt.length + backgroundImagesNeedingAlt.length
  })

  // Aplicar filtro inteligente para remover logos, ícones e imagens decorativas
  console.log("VIX: Aplicando filtro inteligente...")
  
  const normalImageFilter = ImageFilterService.filterImages(imagesNeedingAlt)
  const backgroundImageFilter = ImageFilterService.filterBackgroundImages(backgroundImagesNeedingAlt)
  
  const filteredNormalImages = normalImageFilter.processable
  const filteredBackgroundImages = backgroundImageFilter.processable
  
  // Estatísticas do filtro
  const totalDetected = imagesNeedingAlt.length + backgroundImagesNeedingAlt.length
  const totalProcessable = filteredNormalImages.length + filteredBackgroundImages.length
  const totalFiltered = totalDetected - totalProcessable
  
  // Breakdown por categoria
  const categoryBreakdown: Record<string, number> = {}
  
  normalImageFilter.filtered.forEach(img => {
    const category = img.filterResult.category
    categoryBreakdown[category] = (categoryBreakdown[category] || 0) + 1
  })
  
  backgroundImageFilter.filtered.forEach(img => {
    const category = img.filterResult.category
    categoryBreakdown[category] = (categoryBreakdown[category] || 0) + 1
  })

  console.log("VIX: Resultados do filtro:", {
    totalDetected,
    totalFiltered,
    totalProcessable,
    filterRate: ((totalFiltered / totalDetected) * 100).toFixed(1) + '%',
    categoryBreakdown
  })

  // Log das imagens filtradas para debug
  if (normalImageFilter.filtered.length > 0) {
    console.log("VIX: Imagens normais filtradas:", 
      normalImageFilter.filtered.map(img => ({
        src: img.src.substring(0, 50) + '...',
        reason: img.filterResult.reason,
        category: img.filterResult.category
      }))
    )
  }
  
  if (backgroundImageFilter.filtered.length > 0) {
    console.log("VIX: Background images filtradas:", 
      backgroundImageFilter.filtered.map(img => ({
        url: img.backgroundUrl.substring(0, 50) + '...',
        reason: img.filterResult.reason,
        category: img.filterResult.category
      }))
    )
  }

  // Preparar URLs para processamento com alt original (apenas as que passaram no filtro)
  const normalImageUrls = domService.getProcessableImageUrlsWithAlt(filteredNormalImages)
  const backgroundImageUrls = BackgroundImageProcessor.toImageAltFormat(filteredBackgroundImages)
    .map(img => ({ ...img, isBackground: true }))

  const allImageUrls = [...normalImageUrls, ...backgroundImageUrls]

  return {
    normalImages: filteredNormalImages,
    backgroundImages: filteredBackgroundImages,
    totalCount: filteredNormalImages.length + filteredBackgroundImages.length,
    normalImageUrls,
    backgroundImageUrls,
    allImageUrls,
    filterStats: {
      totalDetected,
      totalFiltered,
      totalProcessable,
      filterRate: ((totalFiltered / totalDetected) * 100).toFixed(1) + '%',
      categoryBreakdown
    }
  }
}

export const notifyBackgroundAboutImages = (imageResult: ImageDetectionResult) => {
  if (imageResult.totalCount > 0) {
    notifyImagesDetected(imageResult.allImageUrls)
    console.log(`VIX: Detectadas ${imageResult.normalImageUrls.length} imagens normais e ${imageResult.backgroundImageUrls.length} background-images`)
  }
}