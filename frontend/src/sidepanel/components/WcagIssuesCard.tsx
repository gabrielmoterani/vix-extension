import "~style.css"
import { useLocale } from "../../lib/i18n"

interface WcagIssuesCardProps {
  issues: any[]
}

export function WcagIssuesCard({ issues }: WcagIssuesCardProps) {
  const { t } = useLocale()
  if (issues.length === 0) {
    return null
  }

  return (
    <section
      className="vix-p-4 vix-rounded-lg vix-border vix-bg-red-50 vix-border-red-200 vix-text-red-800"
      role="region"
      aria-labelledby="wcag-heading">
      <header className="vix-flex vix-items-center vix-gap-2 vix-mb-3">
        <span role="img" aria-label={t("accessibility_label")} className="vix-text-lg">
          ♿
        </span>
        <h3 id="wcag-heading" className="vix-font-semibold vix-text-lg">
          {t("wcag_issues")}
        </h3>
      </header>
      <ul className="vix-list-disc vix-ml-5 vix-text-sm">
        {issues.slice(0, 5).map((issue, idx) => (
          <li key={idx}>
            {issue.id}: {issue.description}
          </li>
        ))}
      </ul>
    </section>
  )
}
