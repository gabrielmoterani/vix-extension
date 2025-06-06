import type { ReactNode } from "react"

interface SummaryCardProps {
  summary: string
  isLoading: boolean
  error?: string
  metadata?: {
    textLength: number
    processingTime: number
    model: string
  }
}

export function SummaryCard({ summary, isLoading, error, metadata }: SummaryCardProps) {
  if (isLoading) {
    return (
      <section 
        className="p-4 bg-blue-50 border border-blue-200 rounded-lg"
        role="status"
        aria-live="polite"
        aria-label="Gerando resumo da página"
      >
        <div className="flex items-center gap-3">
          <div 
            className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"
            aria-hidden="true"
          ></div>
          <span className="text-blue-800 font-medium">
            Gerando resumo da página...
          </span>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section 
        className="p-4 bg-red-50 border border-red-200 rounded-lg"
        role="alert"
        aria-labelledby="summary-error-heading"
      >
        <h3 
          id="summary-error-heading"
          className="font-semibold text-red-800 mb-2"
        >
          ❌ Erro ao gerar resumo
        </h3>
        <p className="text-sm text-red-700">{error}</p>
      </section>
    )
  }

  if (!summary) {
    return null
  }

  return (
    <section 
      className="p-4 bg-green-50 border border-green-200 rounded-lg"
      role="region"
      aria-labelledby="summary-heading"
    >
      <header className="flex items-center gap-2 mb-3">
        <span role="img" aria-label="Resumo">📄</span>
        <h3 
          id="summary-heading"
          className="font-semibold text-green-800"
        >
          Resumo da Página
        </h3>
      </header>
      
      <div 
        className="text-sm text-green-700 mb-3 leading-relaxed"
        tabIndex={0}
        role="article"
        aria-label="Conteúdo do resumo"
      >
        {summary}
      </div>

      {metadata && (
        <footer className="text-xs text-green-600 border-t border-green-200 pt-2">
          <div className="flex justify-between">
            <span>Texto: {metadata.textLength.toLocaleString()} chars</span>
            <span>Tempo: {(metadata.processingTime / 1000).toFixed(1)}s</span>
            <span>Modelo: {metadata.model}</span>
          </div>
        </footer>
      )}
    </section>
  )
}