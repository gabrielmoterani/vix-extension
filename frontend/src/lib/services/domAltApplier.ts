import { cacheManager } from './cacheManager'
import { BackgroundImageProcessor } from './backgroundImageProcessor'

/**
 * Serviço para aplicar alt text gerado às imagens no DOM
 */
export class DomAltApplier {
  private appliedIds = new Set<string>()
  private appliedBackgroundIds = new Set<string>()

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
   * Aplica alt text a um elemento com background-image
   */
  applyBackgroundAltText(elementId: string, altText: string): boolean {
    try {
      // Encontrar elemento por data-vix ID
      const element = document.querySelector(`[data-vix="${elementId}"]`)

      if (!element) {
        console.warn(`VIX: Elemento com ID ${elementId} não encontrado`)
        return false
      }

      // Verificar se tem background-image
      const backgroundUrl = BackgroundImageProcessor.extractBackgroundImageUrl(element)
      if (!backgroundUrl) {
        console.warn(`VIX: Elemento ${elementId} não tem background-image`)
        return false
      }

      // Aplicar alt text usando BackgroundImageProcessor
      const success = BackgroundImageProcessor.applyAltText(element, altText)
      
      if (success) {
        // Marcar como aplicado
        this.appliedBackgroundIds.add(elementId)

        // Invalidate WCAG cache since accessibility has changed
        cacheManager.invalidateWcagCache()

        console.log(
          `VIX: Alt text aplicado a background-image ${elementId}:`,
          altText.substring(0, 50) + "..."
        )
      }

      return success
    } catch (error) {
      console.error(
        `VIX: Erro ao aplicar alt text a background-image ${elementId}:`,
        error
      )
      return false
    }
  }

  /**
   * Aplica alt text a múltiplas imagens (normais e background)
   */
  applyMultipleAltTexts(
    results: Array<{ id: string; altText?: string; error?: string; isBackground?: boolean }>
  ): number {
    let successCount = 0

    results.forEach((result) => {
      if (result.altText && !result.error) {
        let success = false
        
        if (result.isBackground) {
          success = this.applyBackgroundAltText(result.id, result.altText)
        } else {
          success = this.applyAltText(result.id, result.altText)
        }
        
        if (success) {
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
    // Visual indicators disabled - no overlay will be created
    return
    
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
   * Cria indicador visual para elementos com background-image
   */
  private createBackgroundVisualIndicator(element: Element, altText: string): void {
    // Visual indicators disabled - no overlay will be created
    return
    
    // Remover indicador existente se houver
    const existingIndicator = element.querySelector(".vix-bg-alt-indicator")
    existingIndicator?.remove()

    const overlay = document.createElement("div")
    overlay.className = "vix-bg-alt-indicator"
    overlay.setAttribute("aria-label", `Descrição automática de background: ${altText}`)
    overlay.style.cssText = `
      position: absolute;
      top: 4px;
      left: 4px;
      background: rgba(0, 123, 255, 0.8);
      color: #fff;
      font-size: 10px;
      line-height: 1;
      padding: 2px 6px;
      border-radius: 3px;
      z-index: 1001;
      pointer-events: none;
      font-family: system-ui, -apple-system, sans-serif;
      font-weight: 500;
      text-shadow: 0 1px 2px rgba(0,0,0,0.3);
      max-width: calc(100% - 8px);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    `
    overlay.textContent = "🖼️ ALT"
    overlay.title = altText

    // Garantir que o elemento pai tenha position relative
    const computedStyle = window.getComputedStyle(element)
    if (computedStyle.position === 'static') {
      (element as HTMLElement).style.position = 'relative'
    }

    element.appendChild(overlay)
  }

  /**
   * Verifica se alt text já foi aplicado a um elemento
   */
  isAlreadyApplied(elementId: string): boolean {
    return this.appliedIds.has(elementId)
  }

  /**
   * Verifica se alt text já foi aplicado a um elemento background
   */
  isBackgroundAlreadyApplied(elementId: string): boolean {
    return this.appliedBackgroundIds.has(elementId)
  }

  /**
   * Remove indicadores visuais de todas as imagens
   */
  removeAllIndicators(): void {
    // Visual indicators are disabled - but clean up any existing ones for backwards compatibility
    const indicators = document.querySelectorAll(".vix-alt-indicator, .vix-bg-alt-indicator")
    indicators.forEach((indicator) => indicator.remove())

    if (indicators.length > 0) {
      console.log(`VIX: Removidos ${indicators.length} indicadores visuais existentes`)
    }
  }

  /**
   * Obtém estatísticas sobre alt texts aplicados
   */
  getStats(): { 
    appliedCount: number; 
    appliedIds: string[];
    backgroundAppliedCount: number;
    backgroundAppliedIds: string[];
    totalAppliedCount: number;
  } {
    return {
      appliedCount: this.appliedIds.size,
      appliedIds: Array.from(this.appliedIds),
      backgroundAppliedCount: this.appliedBackgroundIds.size,
      backgroundAppliedIds: Array.from(this.appliedBackgroundIds),
      totalAppliedCount: this.appliedIds.size + this.appliedBackgroundIds.size
    }
  }

  /**
   * Reset do estado (útil para nova página)
   */
  reset(): void {
    this.appliedIds.clear()
    this.appliedBackgroundIds.clear()
    this.removeAllIndicators()
    console.log("VIX: DomAltApplier resetado")
  }
}
