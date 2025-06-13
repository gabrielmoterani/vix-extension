// Tipos para mensagens entre componentes
export interface BaseMessage {
  type: string
  timestamp: number
  tabId?: number
}

export interface DomUpdatedMessage extends BaseMessage {
  type: "DOM_UPDATED"
  data: {
    url: string
    elementsWithIds: number
    totalElements: number
    actionElements: number
    images: number
    imagesNeedingAlt: number
  }
}

export interface PageAnalyzedMessage extends BaseMessage {
  type: "PAGE_ANALYZED"
  data: {
    summary?: string
    status: "analyzing" | "completed" | "error"
    error?: string
  }
}

export interface BackgroundState {
  currentTab: {
    id: number
    url: string
    status: string
  } | null
  domStats: {
    elementsWithIds: number
    totalElements: number
    actionElements: number
    images: number
    imagesNeedingAlt?: number // ← Esta linha
    totalImagesFound?: number
  }
  analysisStatus: "idle" | "analyzing" | "completed" | "error"
  imagesNeedingAlt?: Array<{ id: string; url: string }> // ← ADICIONAR esta linha se não existir
}

export interface PageSummaryMessage extends BaseMessage {
  type: "PAGE_SUMMARY_GENERATED"
  data: {
    summary: string
    textLength: number
    processingTime: number
    model: string
  }
}

export interface SummaryRequest extends BaseMessage {
  type: "REQUEST_SUMMARY"
  data: {
    text: string
    url: string
  }
}

// ADICIONAR novos tipos:
export interface ChatMessage {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: number
}

export interface ChatRequest extends BaseMessage {
  type: "CHAT_REQUEST"
  data: {
    message: string
    conversationId: string
  }
}

export interface ChatResponse extends BaseMessage {
  type: "CHAT_RESPONSE"
  data: {
    message: string
    conversationId: string
    jsCommands?: string[]
  }
}
export interface ImageAltRequest extends BaseMessage {
  type: "IMAGE_ALT_REQUEST"
  data: {
    images: Array<{ id: string; url: string }>
    summary: string
  }
}

export interface ImageAltProgress extends BaseMessage {
  type: "IMAGE_ALT_PROGRESS"
  data: {
    total: number
    completed: number
    failed: number
    inProgress: number
    completedJobs: Array<{ id: string; altText: string }>
  }
}

export interface ImageAltCompleted extends BaseMessage {
  type: "IMAGE_ALT_COMPLETED"
  data: {
    total: number
    completed: number
    failed: number
    results: Array<{ id: string; altText?: string; error?: string }>
  }
}

export interface WcagIssuesDetected extends BaseMessage {
  type: "WCAG_ISSUES_DETECTED"
  data: {
    issues: any[]
  }
}

export interface WcagApplyFixes extends BaseMessage {
  type: "WCAG_APPLY_FIXES"
  data: {
    fixes: Array<{
      id: string
      addAttributes: Array<{ attributeName: string; value: string }>
    }>
  }
}

export interface ExecuteJsRequest extends BaseMessage {
  type: "EXECUTE_JS"
  data: {
    command: string
  }
}

export interface ExecuteJsResult extends BaseMessage {
  type: "EXECUTE_JS_RESULT"
  data: {
    command: string
    success: boolean
    result?: string
    error?: string
  }
}

export type ExtensionMessage =
  | DomUpdatedMessage
  | PageAnalyzedMessage
  | PageSummaryMessage
  | SummaryRequest
  | ChatRequest
  | ChatResponse
  | ImageAltRequest
  | ImageAltProgress
  | ImageAltCompleted
  | ExecuteJsRequest
  | ExecuteJsResult
  | WcagIssuesDetected
  | WcagApplyFixes
