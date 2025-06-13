import { useEffect, useState } from "react"
import enMessages from "../locales/en/messages.json"
import ptMessages from "../locales/pt/messages.json"

export type Locale = "en" | "pt"

const catalogs = {
  en: enMessages as Record<string, { message: string }>,
  pt: ptMessages as Record<string, { message: string }>
}

export function useLocale() {
  const [locale, setLocale] = useState<Locale>("en")

  useEffect(() => {
    chrome.storage.local.get("lang", (res) => {
      if (res.lang === "pt" || res.lang === "en") {
        setLocale(res.lang)
      } else {
        const browser = chrome.i18n.getUILanguage?.().split("-")[0]
        if (browser === "pt") {
          setLocale("pt")
        }
      }
    })
  }, [])

  useEffect(() => {
    chrome.storage.local.set({ lang: locale })
  }, [locale])

  const t = (key: string): string => {
    return catalogs[locale][key]?.message || key
  }

  return { t, locale, setLocale }
}
