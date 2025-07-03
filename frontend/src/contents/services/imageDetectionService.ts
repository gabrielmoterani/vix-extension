import { DomProcessingService } from "../../lib/services/domProcessingService"
import { BackgroundImageProcessor } from "../../lib/services/backgroundImageProcessor"
import { notifyImagesDetected } from "./backgroundCommunicator"

export interface ImageDetectionResult {
  normalImages: any[]
  backgroundImages: any[]
  totalCount: number
  normalImageUrls: Array<{id: string, url: string}>
  backgroundImageUrls: Array<{id: string, url: string, isBackground: boolean}>
  allImageUrls: Array<{id: string, url: string, isBackground?: boolean}>
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

  // Preparar URLs para processamento
  const normalImageUrls = domService.getProcessableImageUrls(imagesNeedingAlt)
  const backgroundImageUrls = BackgroundImageProcessor.toImageAltFormat(backgroundImagesNeedingAlt)
    .map(img => ({ ...img, isBackground: true }))

  const allImageUrls = [...normalImageUrls, ...backgroundImageUrls]

  return {
    normalImages: imagesNeedingAlt,
    backgroundImages: backgroundImagesNeedingAlt,
    totalCount: imagesNeedingAlt.length + backgroundImagesNeedingAlt.length,
    normalImageUrls,
    backgroundImageUrls,
    allImageUrls
  }
}

export const notifyBackgroundAboutImages = (imageResult: ImageDetectionResult) => {
  if (imageResult.totalCount > 0) {
    notifyImagesDetected(imageResult.allImageUrls)
    console.log(`VIX: Detectadas ${imageResult.normalImageUrls.length} imagens normais e ${imageResult.backgroundImageUrls.length} background-images`)
  }
}