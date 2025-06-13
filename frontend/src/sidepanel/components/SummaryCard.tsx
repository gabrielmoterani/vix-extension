import "~style.css"
import { useLocale } from "../../lib/i18n"

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
  const { t } = useLocale()
  if (isLoading) {
    return (
      <section 
        className="vix-p-4 vix-bg-blue-50 vix-border vix-border-blue-200 vix-rounded-lg"
        role="status"
        aria-live="polite"
        aria-label={t("generating_summary")}
      >
        <div className="vix-flex vix-items-center vix-gap-3">
          <div 
            className="vix-animate-spin vix-rounded-full vix-h-5 vix-w-5 vix-border-b-2 vix-border-blue-600"
            aria-hidden="true"
          ></div>
          <span className="vix-text-blue-800 vix-font-medium">
            {t("generating_summary")}
          </span>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section 
        className="vix-p-4 vix-bg-red-50 vix-border vix-border-red-200 vix-rounded-lg"
        role="alert"
        aria-labelledby="summary-error-heading"
      >
        <h3 
          id="summary-error-heading"
          className="vix-font-semibold vix-text-red-800 vix-mb-2"
        >
          ❌ {t("summary_error")}
        </h3>
        <p className="vix-text-sm vix-text-red-700">{error}</p>
      </section>
    )
  }

  if (!summary) {
    return null
  }

  return (
    <section 
      className="vix-p-4 vix-bg-green-50 vix-border vix-border-green-200 vix-rounded-lg"
      role="region"
      aria-labelledby="summary-heading"
    >
      <header className="vix-flex vix-items-center vix-gap-2 vix-mb-3">
        <span role="img" aria-label="Resumo">📄</span>
        <h3 
          id="summary-heading"
          className="vix-font-semibold vix-text-green-800"
        >
          {t("page_summary")}
        </h3>
      </header>
      
      <div 
        className="vix-text-sm vix-text-green-700 vix-mb-3 vix-leading-relaxed"
        tabIndex={0}
        role="article"
        aria-label={t("page_summary")}
      >
        {summary}
      </div>

      {metadata && (
        <footer className="vix-text-xs vix-text-green-600 vix-border-t vix-border-green-200 vix-pt-2">
          <div className="vix-flex vix-justify-between">
            <span>{t("text")}: {metadata.textLength.toLocaleString()} chars</span>
            <span>{t("time")}: {(metadata.processingTime / 1000).toFixed(1)}s</span>
            <span>{t("model")}: {metadata.model}</span>
          </div>
        </footer>
      )}
    </section>
  )
}
