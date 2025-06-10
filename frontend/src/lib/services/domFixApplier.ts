export interface DomFix {
  id: string
  addAttributes: Array<{ attributeName: string; value: string }>
}

export class DomFixApplier {
  applyFixes(fixes: DomFix[]): number {
    let count = 0
    fixes.forEach((fix) => {
      const element = document.querySelector(`[data-vix="${fix.id}"]`)
      if (!element) return
      fix.addAttributes.forEach((attr) => {
        element.setAttribute(attr.attributeName, attr.value)
      })
      count++
    })
    return count
  }
}
