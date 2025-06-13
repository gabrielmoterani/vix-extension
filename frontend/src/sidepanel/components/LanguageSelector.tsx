import "~style.css"
import type { Locale } from "../../lib/i18n"

interface Props {
  locale: Locale
  setLocale: (l: Locale) => void
}

export function LanguageSelector({ locale, setLocale }: Props) {
  return (
    <label className="vix-flex vix-items-center vix-gap-2">
      <span className="vix-sr-only">Select language</span>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="vix-border vix-rounded vix-p-1 vix-text-sm"
        aria-label="Select language"
      >
        <option value="en">English</option>
        <option value="pt">Português</option>
      </select>
    </label>
  )
}
