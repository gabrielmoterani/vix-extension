import "~style.css"

interface StatsListProps {
  stats: Array<{
    label: string
    value: string | number
    description?: string
  }>
}

export function StatsList({ stats }: StatsListProps) {
  return (
    <dl className="vix-space-y-2">
      {stats.map((stat, index) => (
        <div key={index} className="vix-flex vix-justify-between vix-items-center">
          <dt className="vix-text-sm vix-font-medium">
            {stat.label}:
          </dt>
          <dd 
            className="vix-text-sm vix-font-mono vix-font-bold"
            title={stat.description}
            aria-describedby={stat.description ? `stat-desc-${index}` : undefined}
          >
            {stat.value}
            {stat.description && (
              <span 
                id={`stat-desc-${index}`}
                className="vix-sr-only"
              >
                {stat.description}
              </span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}
