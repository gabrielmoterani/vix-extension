import { useLocale } from "../../lib/i18n"

interface SimpleImage {
  id: string
  url: string
  originalAlt?: string
  generatedAlt?: string
  status?: 'pending' | 'processing' | 'completed' | 'failed'
}

interface SimpleThumbnailsProps {
  images: SimpleImage[]
}

export function SimpleThumbnails({ images }: SimpleThumbnailsProps) {
  const { t } = useLocale()

  const formatAltText = (alt: string | undefined) => {
    if (!alt || alt.trim() === '') {
      return t('alt_empty')
    }
    return alt
  }

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'processing':
        return '🔄'
      case 'completed':
        return '✅'
      case 'failed':
        return '❌'
      default:
        return '⏳'
    }
  }

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'processing':
        return t('image_status_processing')
      case 'completed':
        return t('image_status_completed')
      case 'failed':
        return t('image_status_failed')
      default:
        return t('image_status_pending')
    }
  }

  if (images.length === 0) {
    return (
      <div className="vix-bg-white vix-rounded-lg vix-border vix-border-gray-200 vix-p-4">
        <h3 className="vix-text-lg vix-font-semibold vix-text-gray-800 vix-mb-2">
          🖼️ {t('tab_image_analysis')}
        </h3>
        <div className="vix-text-center vix-py-8 vix-text-gray-500">
          <span className="vix-text-4xl vix-block vix-mb-2">📷</span>
          <p>{t('no_images_found')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="vix-bg-white vix-rounded-lg vix-border vix-border-gray-200 vix-p-4">
      <h3 className="vix-text-lg vix-font-semibold vix-text-gray-800 vix-mb-4">
        🖼️ {t('tab_image_analysis')} ({images.length})
      </h3>
      
      <div className="vix-space-y-4">
        {images.map((image) => (
          <div 
            key={image.id}
            className="vix-border vix-border-gray-200 vix-rounded-lg vix-overflow-hidden"
          >
            <div className="vix-w-full vix-h-32 vix-bg-gray-100 vix-flex vix-items-center vix-justify-center">
              <img
                src={image.url}
                alt="Imagem da página"
                className="vix-max-w-full vix-max-h-full vix-object-contain"
                loading="lazy"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  const parent = target.parentElement
                  if (parent) {
                    parent.innerHTML = '<div class="vix-w-full vix-h-full vix-flex vix-items-center vix-justify-center vix-text-gray-400 vix-text-2xl">🖼️</div>'
                  }
                }}
              />
            </div>
            <div className="vix-p-3 vix-bg-gray-50 vix-space-y-3">
              <div className="vix-text-sm vix-text-blue-700 vix-font-medium vix-break-words">
                <span className="vix-text-gray-600 vix-font-normal">{t('original_alt')}: </span>
                {formatAltText(image.originalAlt)}
              </div>
              
              <div className="vix-border-t vix-border-gray-200 vix-pt-3">
                <div className="vix-flex vix-items-center vix-gap-2 vix-mb-2">
                  <span className="vix-text-sm vix-text-gray-600">{t('generated_alt')}: </span>
                  <span className="vix-text-xs">{getStatusIcon(image.status)}</span>
                  <span className="vix-text-xs vix-text-gray-500">{getStatusText(image.status)}</span>
                </div>
                {image.generatedAlt ? (
                  <div className="vix-text-sm vix-text-green-700 vix-font-medium vix-break-words vix-bg-green-50 vix-p-2 vix-rounded">
                    {image.generatedAlt}
                  </div>
                ) : (
                  <div className="vix-text-sm vix-text-gray-500 vix-italic">
                    {image.status === 'failed' ? t('error_label') : 'Aguardando processamento...'}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}