import "~style.css"
import { useState, useEffect } from "react"
import { useLocale } from "../../lib/i18n"

interface ImageAltProgressProps {
  total: number
  completed: number
  failed: number
  inProgress: number
  isProcessing: boolean
  onStartProcessing?: () => void
  onStopProcessing?: () => void
}

export function ImageAltProgressCard({
  total,
  completed,
  failed,
  inProgress,
  isProcessing,
  onStartProcessing,
  onStopProcessing
}: ImageAltProgressProps) {
  const { t } = useLocale()
  const [showDetails, setShowDetails] = useState(false)
  const progressPercentage = total > 0 ? Math.round(((completed + failed) / total) * 100) : 0
  const pending = total - completed - failed - inProgress

  // Auto-expandir se há erros
  useEffect(() => {
    if (failed > 0) {
      setShowDetails(true)
    }
  }, [failed])

  const getVariant = () => {
    if (failed > 0) return "warning"
    if (isProcessing) return "info"
    if (completed > 0 && !isProcessing) return "success"
    return "info"
  }

  const getIcon = () => {
    if (failed > 0) return "⚠️"
    if (isProcessing) return "🔄"
    if (completed > 0) return "✅"
    return "🖼️"
  }

  const getTitle = () => {
    if (isProcessing) return t("img_alt_processing")
    if (completed > 0) return t("img_alt_complete")
    return t("img_alt_auto")
  }

  const getStatusText = () => {
    if (isProcessing) {
      return `${t("img_alt_processing")}: ${inProgress}/${total}`
    }
    if (completed > 0 || failed > 0) {
      return `Concluído: ${completed} sucesso, ${failed} erros`
    }
    if (total > 0) {
      return `${total} ${t("stats_images_needing_alt")}`
    }
    return t("no_images")
  }

  // // Não mostrar se não há imagens para processar
  // if (total === 0 && !isProcessing) {
  //   return null
  // }

  return (
    <section 
      className={`vix-p-4 vix-rounded-lg vix-border vix-${getVariant()==="info" ? "bg-blue-50 border-blue-200 text-blue-800" :
        getVariant() === "success" ? "bg-green-50 border-green-200 text-green-800" :
        getVariant() === "warning" ? "bg-yellow-50 border-yellow-200 text-yellow-800" :
        "bg-red-50 border-red-200 text-red-800"
      }`}
      role="region"
      aria-labelledby="image-alt-heading"
      aria-live="polite"
    >
      <header className="vix-flex vix-items-center vix-justify-between vix-mb-3">
        <div className="vix-flex vix-items-center vix-gap-2">
          <span 
            role="img" 
            aria-label={isProcessing ? "Processando" : "Imagens"}
            className="vix-text-lg"
          >
            {getIcon()}
          </span>
          <h3 
            id="image-alt-heading"
            className="vix-font-semibold vix-text-lg"
          >
            {getTitle()}
          </h3>
        </div>

        <div className="vix-flex vix-gap-2">
          {!isProcessing && total > 0 && onStartProcessing && (
            <button
              onClick={onStartProcessing}
              className="vix-px-3 vix-py-1 vix-bg-blue-600 vix-text-white vix-rounded vix-text-sm vix-font-medium hover:vix-bg-blue-700 focus:vix-ring-2 focus:vix-ring-blue-500"
              aria-label={`${t("process")} ${total} ${t("stats_images")}`}
            >
              {t("process")}
            </button>
          )}
          
          {isProcessing && onStopProcessing && (
            <button
              onClick={onStopProcessing}
              className="vix-px-3 vix-py-1 vix-bg-red-600 vix-text-white vix-rounded vix-text-sm vix-font-medium hover:vix-bg-red-700 focus:vix-ring-2 focus:vix-ring-red-500"
              aria-label={t("stop")}
            >
              {t("stop")}
            </button>
          )}

          {total > 0 && (
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="vix-px-3 vix-py-1 vix-bg-gray-600 vix-text-white vix-rounded vix-text-sm vix-font-medium hover:vix-bg-gray-700 focus:vix-ring-2 focus:vix-ring-gray-500"
              aria-label={showDetails ? t("hide") : t("details")}
              aria-expanded={showDetails}
            >
              {showDetails ? t("hide") : t("details")}
            </button>
          )}
        </div>
      </header>

      <div className="vix-text-sm vix-mb-3">
        <p className="vix-font-medium">{getStatusText()}</p>
      </div>

      {/* Barra de progresso */}
      {isProcessing && total > 0 && (
        <div className="vix-mb-3">
          <div className="vix-flex vix-justify-between vix-text-xs vix-mb-1">
            <span>{t("progress")}</span>
            <span>{progressPercentage}%</span>
          </div>
          <div 
            className="vix-w-full vix-bg-white vix-bg-opacity-50 vix-rounded-full vix-h-2"
            role="progressbar"
            aria-valuenow={progressPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${t("progress")}: ${progressPercentage}%`}
          >
            <div 
              className="vix-bg-current vix-h-2 vix-rounded-full vix-transition-all vix-duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Detalhes expandidos */}
      {showDetails && total > 0 && (
        <div className="vix-border-t vix-border-current vix-border-opacity-20 vix-pt-3 vix-mt-3">
          <div className="vix-grid vix-grid-cols-2 vix-gap-2 vix-text-xs">
            <div>
              <span className="vix-font-medium">{t("total")}:</span> {total}
            </div>
            <div>
              <span className="vix-font-medium">{t("completed")}:</span> {completed}
            </div>
            <div>
              <span className="vix-font-medium">{t("in_progress")}:</span> {inProgress}
            </div>
            <div>
              <span className="vix-font-medium">{t("errors")}:</span> {failed}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}