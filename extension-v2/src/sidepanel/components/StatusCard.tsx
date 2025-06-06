import type { ReactNode } from "react"

interface StatusCardProps {
  title: string
  children: ReactNode
  variant: "info" | "success" | "warning" | "error"
  icon?: string
}

export function StatusCard({ title, children, variant, icon }: StatusCardProps) {
  const variantStyles = {
    info: "bg-blue-50 border-blue-200 text-blue-800",
    success: "bg-green-50 border-green-200 text-green-800", 
    warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
    error: "bg-red-50 border-red-200 text-red-800"
  }

  const iconLabels = {
    info: "ℹ️ Informação",
    success: "✅ Sucesso", 
    warning: "⚠️ Aviso",
    error: "❌ Erro"
  }

  return (
    <section 
      className={`p-4 rounded-lg border ${variantStyles[variant]}`}
      role="region"
      aria-labelledby={`status-${variant}-heading`}
    >
      <header className="flex items-center gap-2 mb-3">
        {icon && (
          <span 
            aria-label={iconLabels[variant]}
            role="img"
            className="text-lg"
          >
            {icon}
          </span>
        )}
        <h2 
          id={`status-${variant}-heading`}
          className="font-semibold text-lg"
        >
          {title}
        </h2>
      </header>
      
      <div className="text-sm">
        {children}
      </div>
    </section>
  )
}