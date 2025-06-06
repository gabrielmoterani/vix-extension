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
      const element = document.querySelector(`[data-vix="${elementId}"]`) as HTMLImageElement
      
      if (!element) {
        console.warn(`VIX: Elemento com ID ${elementId} não encontrado`)
        return false
      }

      // Verificar se é uma imagem
      if (element.tagName.toLowerCase() !== 'img') {
        console.warn(`VIX: Elemento ${elementId} não é uma imagem`)
        return false
      }

      // Aplicar alt text com prefixo VIX
      const prefixedAlt = `VIX: ${altText}`
      element.setAttribute('alt', prefixedAlt)

      // Marcar como aplicado
      this.appliedIds.add(elementId)

      // Criar indicador visual
      this.createVisualIndicator(element, altText)

      console.log(`VIX: Alt text aplicado ao elemento ${elementId}:`, altText.substring(0, 50) + '...')
      return true

    } catch (error) {
      console.error(`VIX: Erro ao aplicar alt text ao elemento ${elementId}:`, error)
      return false
    }
  }

  /**
   * Aplica alt text a múltiplas imagens
   */
  applyMultipleAltTexts(results: Array<{id: string, altText?: string, error?: string}>): number {
    let successCount = 0

    results.forEach(result => {
      if (result.altText && !result.error) {
        if (this.applyAltText(result.id, result.altText)) {
          successCount++
        }
      } else if (result.error) {
        console.warn(`VIX: Erro para imagem ${result.id}:`, result.error)
      }
    })

    console.log(`VIX: Aplicado alt text a ${successCount} de ${results.length} imagens`)
    return successCount
  }

  /**
   * Cria indicador visual para mostrar que a imagem tem alt text gerado
   */
  private createVisualIndicator(imageElement: HTMLImageElement, altText: string): void {
    // Verificar se já existe container
    let container = imageElement.parentElement
    
    if (!container?.classList.contains('vix-image-container')) {
      // Criar container wrapper
      container = document.createElement('div')
      container.className = 'vix-image-container'
      container.style.cssText = `
        position: relative;
        display: inline-block;
        max-width: 100%;
      `
      
      // Inserir container no lugar da imagem
      imageElement.parentNode?.insertBefore(container, imageElement)
      container.appendChild(imageElement)
    }

    // Remover indicador anterior se existir
    const existingIndicator = container.querySelector('.vix-alt-indicator')
    existingIndicator?.remove()

    // Criar novo indicador
    const indicator = document.createElement('div')
    indicator.className = 'vix-alt-indicator'
    indicator.setAttribute('aria-label', `Descrição automática: ${altText}`)
    indicator.style.cssText = `
      position: absolute;
      top: 4px;
      right: 4px;
      background: rgba(76, 175, 80, 0.95);
      color: white;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: bold;
      font-family: Arial, sans-serif;
      cursor: help;
      z-index: 1000;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
      border: 1px solid rgba(255,255,255,0.3);
    `
    indicator.textContent = 'ALT'
    indicator.title = altText

    // Adicionar hover effect
    indicator.addEventListener('mouseenter', () => {
      indicator.style.background = 'rgba(76, 175, 80, 1)'
      indicator.style.transform = 'scale(1.05)'
    })

    indicator.addEventListener('mouseleave', () => {
      indicator.style.background = 'rgba(76, 175, 80, 0.95)'
      indicator.style.transform = 'scale(1)'
    })

    container.appendChild(indicator)
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
    const indicators = document.querySelectorAll('.vix-alt-indicator')
    indicators.forEach(indicator => indicator.remove())
    
    console.log(`VIX: Removidos ${indicators.length} indicadores visuais`)
  }

  /**
   * Obtém estatísticas sobre alt texts aplicados
   */
  getStats(): { appliedCount: number, appliedIds: string[] } {
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
    console.log('VIX: DomAltApplier resetado')
  }
}