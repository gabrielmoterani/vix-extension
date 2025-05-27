// src/popup.tsx
import { useState } from "react"

function IndexPopup() {
  const [loading, setLoading] = useState(false)

  const handleAnalyze = () => {
    setLoading(true)
    console.log("Analisando página...")
    chrome.runtime.sendMessage({ action: "analyze-page" }, (res) => {
      setLoading(false)
      console.log("Resposta do backend: ", res)
      if (res?.status === "ok") {
        alert("Acessibilidade aplicada com sucesso!")
      } else {
        alert("Erro ao aplicar acessibilidade.")
      }
    })
  }

  return (
    <div style={{ padding: 16, fontFamily: "sans-serif" }}>
      <h1>AccessiAI</h1>
      <button onClick={handleAnalyze} disabled={loading}>
        {loading ? "Analisando..." : "Melhorar acessibilidade"}
      </button>
    </div>
  )
}

export default IndexPopup
