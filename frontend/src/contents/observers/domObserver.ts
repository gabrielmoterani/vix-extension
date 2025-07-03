import { isSkippableElement } from "../utils/elementUtils"
import { processAndAnalyzeDOM } from "../services/domProcessor"

export const setupDomObserver = (onDomUpdate: (stats: ReturnType<typeof processAndAnalyzeDOM>) => void) => {
  let debounceTimeout: ReturnType<typeof setTimeout>
  const observer = new MutationObserver((mutations) => {
    let hasNewElements = false

    mutations.forEach((mutation) => {
      if (mutation.type === "childList") {
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
          console.log(
            `VIX: Adicionados IDs a ${stats.elementsWithIds} novos elementos`
          )
          onDomUpdate(stats)
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