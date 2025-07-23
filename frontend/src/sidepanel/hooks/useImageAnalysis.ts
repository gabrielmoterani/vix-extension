import { useState, useCallback } from "react"

interface SimpleImage {
  id: string
  url: string
  originalAlt?: string
  generatedAlt?: string
  status?: 'pending' | 'processing' | 'completed' | 'failed'
}

interface UseSimpleImagesResult {
  images: SimpleImage[]
  addImages: (newImages: Array<{id: string, url: string, originalAlt?: string}>) => void
  updateImageAlt: (imageId: string, generatedAlt: string, status: 'completed' | 'failed') => void
  setImageStatus: (imageId: string, status: 'pending' | 'processing' | 'completed' | 'failed') => void
  clearImages: () => void
}

export function useSimpleImages(): UseSimpleImagesResult {
  const [images, setImages] = useState<SimpleImage[]>([])

  const addImages = useCallback((newImages: Array<{id: string, url: string, originalAlt?: string}>) => {
    setImages(prevImages => {
      const existingIds = new Set(prevImages.map(img => img.id))
      const imagesToAdd = newImages
        .filter(img => !existingIds.has(img.id))
        .map(img => ({
          id: img.id,
          url: img.url,
          originalAlt: img.originalAlt,
          status: 'pending' as const
        }))
      
      return [...prevImages, ...imagesToAdd]
    })
  }, [])

  const updateImageAlt = useCallback((imageId: string, generatedAlt: string, status: 'completed' | 'failed') => {
    setImages(prevImages => 
      prevImages.map(img => 
        img.id === imageId 
          ? { ...img, generatedAlt, status }
          : img
      )
    )
  }, [])

  const setImageStatus = useCallback((imageId: string, status: 'pending' | 'processing' | 'completed' | 'failed') => {
    setImages(prevImages => 
      prevImages.map(img => 
        img.id === imageId 
          ? { ...img, status }
          : img
      )
    )
  }, [])

  const clearImages = useCallback(() => {
    setImages([])
  }, [])

  return {
    images,
    addImages,
    updateImageAlt,
    setImageStatus,
    clearImages
  }
}