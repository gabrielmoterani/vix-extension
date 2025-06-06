import { DomProcessingService } from "../lib/services/domProcessingService"
import { DomAltApplier } from "../lib/services/domAltApplier"

// Função para gerar ID único (baseada na extensão antiga)
const generateUniqueId = (): string => {
  return `vix-${Math.random().toString(36).substr(2, 9)}`
}

const domService = new DomProcessingService()
const altApplier = new DomAltApplier()

// Função para verificar se elemento deve ser pulado
const isSkippableElement = (node: Element): boolean => {
  const skippableTags = ['script', 'style', 'svg', 'iframe']
  const tag = node.tagName?.toLowerCase()
  return tag && (
    skippableTags.includes(tag) || 
    (tag === 'link' && node.getAttribute('rel') === 'stylesheet')
  )
}

// Função para verificar se é elemento interativo
const isActionElement = (node: Element): boolean => {
  const actionTags = [
    'button', 'a', 'input', 'select', 'textarea', 'label', 
    'form', 'option'
  ]
  
  const tag = node.tagName?.toLowerCase()
  if (!tag) return false

  // Tags básicas de ação
  if (actionTags.includes(tag)) return true

  // Verificar tipos de input
  if (tag === 'input') {
    const type = node.getAttribute('type')?.toLowerCase()
    return type && ['button', 'submit', 'reset', 'checkbox', 'radio'].includes(type)
  }

  // Verificar role ARIA
  const role = node.getAttribute('role')?.toLowerCase()
  if (role && ['button', 'link', 'checkbox', 'radio', 'textbox', 'combobox'].includes(role)) {
    return true
  }

  // Verificar click handlers
  if (node.getAttribute('onclick')) return true

  // Verificar classes interativas
  const interactiveClasses = ['btn', 'button', 'clickable', 'interactive']
  const classList = node.className?.toString().toLowerCase() || ''
  if (interactiveClasses.some(cls => classList.includes(cls))) return true

  return false
}

// Função para verificar se é imagem
const isImageElement = (node: Element): boolean => {
  const tag = node.tagName?.toLowerCase()
  if (tag === 'img') return true
  
  // Verificar div com background-image
  if (tag === 'div') {
    const computedStyle = window.getComputedStyle(node)
    return computedStyle.backgroundImage !== 'none'
  }
  
  return false
}

// Função principal para processar DOM e coletar estatísticas
const processAndAnalyzeDOM = (rootElement: Element = document.body) => {
  let processedCount = 0
  let totalElements = 0
  let actionElements = 0
  let imageElements = 0
  
  const walkNodes = (node: Element) => {
    totalElements++
    
    // Pular elementos que não precisam de ID
    if (isSkippableElement(node)) {
      return
    }

    // Adicionar ID único se não existir
    if (!node.getAttribute('data-vix')) {
      const uniqueId = generateUniqueId()
      node.setAttribute('data-vix', uniqueId)
      
      // Adicionar id normal se não existir
      if (!node.id) {
        node.setAttribute('id', uniqueId)
      }
      
      processedCount++
    }

    // Contar elementos interativos
    if (isActionElement(node)) {
      actionElements++
    }

    // Contar imagens
    if (isImageElement(node)) {
      imageElements++
    }

    // Processar filhos
    for (const child of node.children) {
      walkNodes(child)
    }
  }

  walkNodes(rootElement)
  
  return {
    elementsWithIds: processedCount,
    totalElements,
    actionElements,
    images: imageElements
  }
}

// Função para detectar mudanças no DOM
const setupDomObserver = () => {
  let debounceTimeout: ReturnType<typeof setTimeout>
  const observer = new MutationObserver((mutations) => {
    let hasNewElements = false
    
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element
            if (!isSkippableElement(element)) {
              hasNewElements = true
            }
          }
        })
      }
    })

    if (hasNewElements) {
      // Debounce para evitar spam
      clearTimeout(debounceTimeout)
      debounceTimeout = setTimeout(() => {
        const stats = processAndAnalyzeDOM()
        if (stats.elementsWithIds > 0) {
          console.log(`VIX: Adicionados IDs a ${stats.elementsWithIds} novos elementos`)
          notifyBackgroundDomUpdated(stats)
        }
      }, 1000) // Aguardar 1 segundo entre updates
    }
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true
  })

  return observer
}

let currentUrl = window.location.href
let hasGeneratedSummary = false

const detectPageChange = () => {
  if (window.location.href !== currentUrl) {
    console.log('VIX: Nova página detectada:', window.location.href)
    currentUrl = window.location.href
    hasGeneratedSummary = false // Reset flag
    
    // Reset alt applier para nova página
    altApplier.reset()
    
    // Aguardar DOM carregar e processar nova página
    setTimeout(() => {
      initialize()
    }, 1000)
  }
}

const setupUrlObserver = () => {
  // Observer para SPAs que mudam URL sem reload
  const originalPushState = history.pushState
  const originalReplaceState = history.replaceState
  
  history.pushState = function(...args) {
    originalPushState.apply(history, args)
    setTimeout(detectPageChange, 100)
  }
  
  history.replaceState = function(...args) {
    originalReplaceState.apply(history, args)
    setTimeout(detectPageChange, 100)
  }
  
  window.addEventListener('popstate', detectPageChange)
}

// Função para notificar background sobre mudanças
const notifyBackgroundDomUpdated = async (stats: ReturnType<typeof processAndAnalyzeDOM>, imagesNeedingAlt?: number) => {
  try {
    chrome.runtime.sendMessage({
      type: "DOM_UPDATED",
      body: {
        url: window.location.href,
        timestamp: Date.now(),
        ...stats,
        imagesNeedingAlt: imagesNeedingAlt || 0
      }
    }, (response) => {
      if (response?.success) {
        console.log('VIX: Stats enviadas para background:', stats)
      }
    })
  } catch (error) {
    console.error('VIX: Erro ao notificar background:', error)
  }
}

// Listener para comandos de processamento de alt text
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handler para aplicar alt text quando concluído
  if (message.type === "IMAGE_ALT_COMPLETED") {
    console.log('VIX: Aplicando alt text para', message.data.results.length, 'imagens')
    
    const appliedCount = altApplier.applyMultipleAltTexts(message.data.results)
    
    console.log(`VIX: Alt text aplicado a ${appliedCount} imagens`)
    sendResponse({ success: true, appliedCount })
    return
  }

  // Handler para executar JavaScript
  if (message.type === "EXECUTE_JS") {
    console.log('VIX: Executando comando JS:', message.command)
    try {
      // Executar comando JavaScript de forma segura
      const result = new Function(message.command)()
      sendResponse({ success: true, result })
    } catch (error) {
      console.error('VIX: Erro ao executar comando JS:', error)
      sendResponse({ success: false, error: error instanceof Error ? error.message : 'Erro na execução' })
    }
  }

  // Handler para reset (útil para debugging)
  if (message.type === "RESET_ALT_APPLIER") {
    altApplier.reset()
    sendResponse({ success: true })
  }
})

// Inicialização quando página carrega
const initialize = () => {
  console.log('VIX: Content script inicializado para:', window.location.href)
  
  // Processamento básico atual
  const basicStats = processAndAnalyzeDOM()
  console.log('VIX: Estatísticas básicas:', basicStats)
  
  // Processamento avançado
  try {
    console.log('VIX: Iniciando processamento avançado...')
    const processedDom = domService.processDom(document)
    if (processedDom) {
      console.log('VIX: DOM processado com sucesso')
      const advancedStats = domService.generateStats(processedDom)
      const images = domService.extractImages(processedDom)
      const actions = domService.extractActionElements(processedDom)
      
      // Extrair texto para resumo
      const allText = domService.extractAllText(processedDom)
      console.log(`VIX: Texto extraído: ${allText.length} caracteres`)
      
      // Filtrar imagens que precisam de alt text usando método da nova abordagem
      const imagesNeedingAlt = domService.filterImagesNeedingAlt(images)
      
      console.log('VIX: Estatísticas avançadas:', {
        ...advancedStats,
        imagesNeedingAlt: imagesNeedingAlt.length,
        actionElements: actions.length,
        textLength: allText.length
      })

      // Incluir dados de imagem nas notificações
      const enhancedStats = {
        ...basicStats,
        imagesNeedingAlt: imagesNeedingAlt.length
      }

      // Enviar dados das imagens que precisam de alt text para o background
      if (imagesNeedingAlt.length > 0) {
        const imageUrls = domService.getProcessableImageUrls(imagesNeedingAlt)
        console.log('####VIX: Images needing ALT',imagesNeedingAlt.length)
        // Enviar lista de imagens que precisam de alt text
        chrome.runtime.sendMessage({
          type: "IMAGES_DETECTED",
          body: {
            images: imageUrls,
            url: window.location.href
          }
        })
      }

      // Só solicitar resumo se ainda não foi gerado para esta página
      if (allText.length > 500 && !hasGeneratedSummary) {
        console.log('VIX: Texto suficiente, solicitando resumo...')
        hasGeneratedSummary = true // Marcar como gerado
        requestPageSummary(allText)
      } else if (hasGeneratedSummary) {
        console.log('VIX: Resumo já foi gerado para esta página')
      } else {
        console.log('VIX: Texto insuficiente para resumo:', allText.length)
      }

      // Observer e notificação atuais
      setupDomObserver()
      notifyBackgroundDomUpdated(enhancedStats, imagesNeedingAlt.length)
    } else {
      console.log('VIX: Falha ao processar DOM')
      setupDomObserver()
      notifyBackgroundDomUpdated(basicStats)
    }
  } catch (error) {
    console.error('VIX: Erro no processamento avançado:', error)
    setupDomObserver()
    notifyBackgroundDomUpdated(basicStats)
  }
}

const requestPageSummary = async (text: string) => {
  try {
    // Limitar texto para não estourar limite de tokens
    const truncatedText = text.length > 50000 
      ? text.substring(0, 50000) + '...'
      : text

    console.log(`VIX: Solicitando resumo para ${truncatedText.length} caracteres`)

    chrome.runtime.sendMessage({
      type: "REQUEST_SUMMARY",
      body: {
        text: truncatedText,
        url: window.location.href
      }
    }, (response) => {
      console.log('VIX: Resposta da solicitação de resumo:', response)
      if (!response?.success) {
        console.error('VIX: Erro na solicitação:', response?.error)
      }
    })

    console.log('VIX: Mensagem enviada para background')
    
  } catch (error) {
    console.error('VIX: Erro ao solicitar resumo:', error)
  }
}

// Executar quando DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize)
} else {
  initialize()
}

setupUrlObserver()

export {}