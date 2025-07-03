export const setupUrlObserver = (onPageChange: () => void) => {
  // Observer para SPAs que mudam URL sem reload
  const originalPushState = history.pushState
  const originalReplaceState = history.replaceState

  history.pushState = function (...args) {
    originalPushState.apply(history, args)
    setTimeout(onPageChange, 100)
  }

  history.replaceState = function (...args) {
    originalReplaceState.apply(history, args)
    setTimeout(onPageChange, 100)
  }

  window.addEventListener("popstate", onPageChange)
}