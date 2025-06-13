import { cacheManager } from './cacheManager'

/**
 * Serviço para aplicar alt text gerado às imagens no DOM
 */
export class DomAltApplier {
  private appliedIds = new Set<string>()

  /**
   * Aplica alt text a uma imagem específica
   */
  applyAltText(elementId: string, altText: string): boolean {
    try {
      // Encontrar elemento por data-vix ID
      const element = document.querySelector(
        `[data-vix="${elementId}"]`
      ) as HTMLImageElement

      if (!element) {
        console.warn(`VIX: Elemento com ID ${elementId} não encontrado`)
        return false
      }

      // Verificar se é uma imagem
      if (element.tagName.toLowerCase() !== "img") {
        console.warn(`VIX: Elemento ${elementId} não é uma imagem`)
        return false
      }

      // Aplicar alt text com prefixo VIX
      const prefixedAlt = `VIX: ${altText}`
      element.setAttribute("alt", prefixedAlt)

      // Marcar como aplicado
      this.appliedIds.add(elementId)

      // Criar indicador visual
      this.createVisualIndicator(element, altText)

      // Invalidate WCAG cache since accessibility has changed
      cacheManager.invalidateWcagCache()

      console.log(
        `VIX: Alt text aplicado ao elemento ${elementId}:`,
        altText.substring(0, 50) + "..."
      )
      return true
    } catch (error) {
      console.error(
        `VIX: Erro ao aplicar alt text ao elemento ${elementId}:`,
        error
      )
      return false
    }
  }

  /**
   * Aplica alt text a múltiplas imagens
   */
  applyMultipleAltTexts(
    results: Array<{ id: string; altText?: string; error?: string }>
  ): number {
    let successCount = 0

    results.forEach((result) => {
      if (result.altText && !result.error) {
        if (this.applyAltText(result.id, result.altText)) {
          successCount++
        }
      } else if (result.error) {
        console.warn(`VIX: Erro para imagem ${result.id}:`, result.error)
      }
    })

    console.log(
      `VIX: Aplicado alt text a ${successCount} de ${results.length} imagens`
    )
    return successCount
  }

  /**
   * Cria indicador visual para mostrar que a imagem tem alt text gerado
   */
  private createVisualIndicator(
    imageElement: HTMLImageElement,
    altText: string
  ): void {
    // Verificar se já existe container
    let container = imageElement.parentElement

    if (!container?.classList.contains("vix-image-container")) {
      container = document.createElement("div")
      container.className = "vix-image-container"
      container.style.cssText = `
        position: relative;
        display: inline-block;
        max-width: 100%;
      `

      imageElement.parentNode?.insertBefore(container, imageElement)
      container.appendChild(imageElement)
    }

    const existingIndicator = container.querySelector(".vix-alt-indicator")
    existingIndicator?.remove()

    const overlay = document.createElement("div")
    overlay.className = "vix-alt-indicator"
    overlay.setAttribute("aria-label", `Descrição automática: ${altText}`)
    overlay.style.cssText = `
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.45);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      font-size: 12px;
      line-height: 1.2;
      padding: 4px;
      box-sizing: border-box;
      z-index: 1000;
      pointer-events: none;
    `
    overlay.textContent = altText

    container.appendChild(overlay)
  }

  /**
   * Verifica se alt text já foi aplicado a um elemento
   */
  isAlreadyApplied(elementId: string): boolean {
    return this.appliedIds.has(elementId)
  }

  /**
   * Remove indicadores visuais de todas as imagens
   */
  removeAllIndicators(): void {
    const indicators = document.querySelectorAll(".vix-alt-indicator")
    indicators.forEach((indicator) => indicator.remove())

    console.log(`VIX: Removidos ${indicators.length} indicadores visuais`)
  }

  /**
   * Obtém estatísticas sobre alt texts aplicados
   */
  getStats(): { appliedCount: number; appliedIds: string[] } {
    return {
      appliedCount: this.appliedIds.size,
      appliedIds: Array.from(this.appliedIds)
    }
  }

  /**
   * Reset do estado (útil para nova página)
   */
  reset(): void {
    this.appliedIds.clear()
    this.removeAllIndicators()
    console.log("VIX: DomAltApplier resetado")
  }
}
