import "~style.css"
import type { ReactNode } from "react"
import { useLocale } from "../../lib/i18n"

interface StatusCardProps {
  title: string
  children: ReactNode
  variant: "info" | "success" | "warning" | "error"
  icon?: string
}

export function StatusCard({ title, children, variant, icon }: StatusCardProps) {
  const { t } = useLocale()
  const variantStyles = {
    info: "vix-bg-blue-50 vix-border-blue-200 vix-text-blue-800",
    success: "vix-bg-green-50 vix-border-green-200 vix-text-green-800", 
    warning: "vix-bg-yellow-50 vix-border-yellow-200 vix-text-yellow-800",
    error: "vix-bg-red-50 vix-border-red-200 vix-text-red-800"
  }

  const iconLabels = {
    info: t("info_label"),
    success: t("success_label"),
    warning: t("warning_label"),
    error: t("error_label")
  }

  return (
    <section 
      className={`vix-p-4 vix-rounded-lg vix-border vix-${variantStyles[variant]}`}
      role="region"
      aria-labelledby={`status-${variant}-heading`}
    >
      <header className="vix-flex vix-items-center vix-gap-2 vix-mb-3">
        {icon && (
          <span 
            aria-label={iconLabels[variant]}
            role="img"
            className="vix-text-lg"
          >
            {icon}
          </span>
        )}
        <h2 
          id={`status-${variant}-heading`}
          className="vix-font-semibold vix-text-lg"
        >
          {title}
        </h2>
      </header>
      
      <div className="vix-text-sm">
        {children}
      </div>
    </section>
  )
}
