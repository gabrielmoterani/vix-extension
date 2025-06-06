import { useState, useEffect } from "react"

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
    if (isProcessing) return "Processando Alt Text"
    if (completed > 0) return "Alt Text Concluído"
    return "Alt Text Automático"
  }

  const getStatusText = () => {
    if (isProcessing) {
      return `Processando ${inProgress} de ${total} imagens...`
    }
    if (completed > 0 || failed > 0) {
      return `Concluído: ${completed} sucesso, ${failed} erros`
    }
    if (total > 0) {
      return `${total} imagens precisam de alt text`
    }
    return "Nenhuma imagem necessita de alt text"
  }

  // // Não mostrar se não há imagens para processar
  // if (total === 0 && !isProcessing) {
  //   return null
  // }

  return (
    <section 
      className={`p-4 rounded-lg border ${
        getVariant() === "info" ? "bg-blue-50 border-blue-200 text-blue-800" :
        getVariant() === "success" ? "bg-green-50 border-green-200 text-green-800" :
        getVariant() === "warning" ? "bg-yellow-50 border-yellow-200 text-yellow-800" :
        "bg-red-50 border-red-200 text-red-800"
      }`}
      role="region"
      aria-labelledby="image-alt-heading"
      aria-live="polite"
    >
      <header className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span 
            role="img" 
            aria-label={isProcessing ? "Processando" : "Imagens"}
            className="text-lg"
          >
            {getIcon()}
          </span>
          <h3 
            id="image-alt-heading"
            className="font-semibold text-lg"
          >
            {getTitle()}
          </h3>
        </div>

        <div className="flex gap-2">
          {!isProcessing && total > 0 && onStartProcessing && (
            <button
              onClick={onStartProcessing}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
              aria-label={`Processar ${total} imagens`}
            >
              Processar
            </button>
          )}
          
          {isProcessing && onStopProcessing && (
            <button
              onClick={onStopProcessing}
              className="px-3 py-1 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 focus:ring-2 focus:ring-red-500"
              aria-label="Parar processamento"
            >
              Parar
            </button>
          )}

          {total > 0 && (
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="px-3 py-1 bg-gray-600 text-white rounded text-sm font-medium hover:bg-gray-700 focus:ring-2 focus:ring-gray-500"
              aria-label={showDetails ? "Ocultar detalhes" : "Mostrar detalhes"}
              aria-expanded={showDetails}
            >
              {showDetails ? "Ocultar" : "Detalhes"}
            </button>
          )}
        </div>
      </header>

      <div className="text-sm mb-3">
        <p className="font-medium">{getStatusText()}</p>
      </div>

      {/* Barra de progresso */}
      {isProcessing && total > 0 && (
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span>Progresso</span>
            <span>{progressPercentage}%</span>
          </div>
          <div 
            className="w-full bg-white bg-opacity-50 rounded-full h-2"
            role="progressbar"
            aria-valuenow={progressPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Processamento ${progressPercentage}% concluído`}
          >
            <div 
              className="bg-current h-2 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Detalhes expandidos */}
      {showDetails && total > 0 && (
        <div className="border-t border-current border-opacity-20 pt-3 mt-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="font-medium">Total:</span> {total}
            </div>
            <div>
              <span className="font-medium">Concluídas:</span> {completed}
            </div>
            <div>
              <span className="font-medium">Em processo:</span> {inProgress}
            </div>
            <div>
              <span className="font-medium">Erros:</span> {failed}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}