// Tipos para representar elementos processados
export interface ProcessedElement {
  tag: string
  attributes: Record<string, string>
  children: ProcessedElement[]
  text: string
  isActionElement: boolean
  isImage: boolean
  id: string // data-vix ID
}

export interface ProcessedImage {
  id: string
  src: string
  alt?: string
  needsAlt: boolean
}

export interface ProcessedAction {
  id: string
  tag: string
  text: string
  href?: string
  type?: string
  value?: string
  placeholder?: string
  ariaLabel?: string
}

export interface DomStats {
  totalElements: number
  elementsWithIds: number
  actionElements: number
  images: number
  imagesWithoutAlt: number
  textLength: number
}

export interface ReadabilityStats {
  originalTextLength: number
  cleanedTextLength: number
  compressionRatio: number
  readabilitySuccess: boolean
}

export interface DomProcessingResult {
  originalDom: ProcessedElement | null
  cleanedContent?: any
  shouldUseReadability: boolean
  stats: ReadabilityStats
}