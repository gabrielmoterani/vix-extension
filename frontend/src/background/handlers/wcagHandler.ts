import type { PlasmoMessaging } from "@plasmohq/messaging"
import { backendClient } from "../../lib/api/backendClient"

export const handleWcagIssuesDetected: PlasmoMessaging.MessageHandler = async (
  req,
  res
) => {
  const { issues } = req.body

  try {
    const result = await backendClient.requestWCAGCheck(JSON.stringify(issues))
    console.log("VIX: WCAG raw result", result)

    let fixes: any[] = []
    try {
      const resp: any = (result as any).response ?? result

      if (Array.isArray(resp)) {
        fixes = resp
      } else if (typeof resp === "string") {
        const cleaned = resp
          .trim()
          .replace(/^```(?:json)?\r?\n/, "")
          .replace(/\r?\n```$/, "")
        const parsed = JSON.parse(cleaned)
        fixes = Array.isArray(parsed) ? parsed : parsed.elements || []
      } else if (resp && Array.isArray(resp.elements)) {
        fixes = resp.elements
      }
    } catch (err) {
      console.error("VIX: Unable to parse WCAG fixes", err)
    }

    const message = { type: "WCAG_APPLY_FIXES", data: { fixes } }
    await chrome.runtime.sendMessage(message)
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, message)
    }

    res.send({ success: true })
  } catch (error) {
    console.error("VIX: WCAG check failed:", error)
    res.send({ success: false })
  }
}