export const isSkippableElement = (node: Element): boolean => {
  const skippableTags = ["script", "style", "svg", "iframe"]
  const tag = node.tagName?.toLowerCase()
  return (
    tag &&
    (skippableTags.includes(tag) ||
      (tag === "link" && node.getAttribute("rel") === "stylesheet"))
  )
}

export const isActionElement = (node: Element): boolean => {
  const actionTags = [
    "button",
    "a",
    "input",
    "select",
    "textarea",
    "label",
    "form",
    "option"
  ]

  const tag = node.tagName?.toLowerCase()
  if (!tag) return false

  // Tags básicas de ação
  if (actionTags.includes(tag)) return true

  // Verificar tipos de input
  if (tag === "input") {
    const type = node.getAttribute("type")?.toLowerCase()
    return (
      type && ["button", "submit", "reset", "checkbox", "radio"].includes(type)
    )
  }

  // Verificar role ARIA
  const role = node.getAttribute("role")?.toLowerCase()
  if (
    role &&
    ["button", "link", "checkbox", "radio", "textbox", "combobox"].includes(
      role
    )
  ) {
    return true
  }

  // Verificar click handlers
  if (node.getAttribute("onclick")) return true

  // Verificar classes interativas
  const interactiveClasses = ["btn", "button", "clickable", "interactive"]
  const classList = node.className?.toString().toLowerCase() || ""
  if (interactiveClasses.some((cls) => classList.includes(cls))) return true

  return false
}

export const isImageElement = (node: Element): boolean => {
  const tag = node.tagName?.toLowerCase()
  if (tag === "img") return true

  // Verificar div com background-image
  if (tag === "div") {
    const computedStyle = window.getComputedStyle(node)
    return computedStyle.backgroundImage !== "none"
  }

  return false
}