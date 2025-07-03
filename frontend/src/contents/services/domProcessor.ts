import { isSkippableElement, isActionElement, isImageElement } from "../utils/elementUtils"

export const generateUniqueId = (): string => {
  return `vix-${Math.random().toString(36).substring(2, 11)}`
}

export const processAndAnalyzeDOM = (rootElement: Element = document.body) => {
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
    if (!node.getAttribute("data-vix")) {
      const uniqueId = generateUniqueId()
      node.setAttribute("data-vix", uniqueId)

      // Adicionar id normal se não existir
      if (!node.id) {
        node.setAttribute("id", uniqueId)
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