// src/content.tsx
export {}

chrome.runtime.onMessage.addListener((req, _, sendResponse) => {
  if (req.action === "get-page-data") {
    const html = document.documentElement.outerHTML
    const title = document.title
    const url = window.location.href

    sendResponse({ html, title, url })
  }

  if (req.action === "apply-suggestions") {
    req.data?.suggestions?.forEach((sug: { selector: string; alt: string }) => {
      try {
        const el = document.querySelector(sug.selector)
        if (el && el.tagName === "IMG") {
          el.setAttribute("alt", sug.alt)
          el.setAttribute("data-accessiai", "true")
          el.setAttribute("title", `alt aplicado: ${sug.alt}`)
          el.classList.add("accessiai-highlight")
        }
      } catch (e) {
        console.warn("Erro ao aplicar sugestão:", e)
      }
    })
  }

  return true
})
