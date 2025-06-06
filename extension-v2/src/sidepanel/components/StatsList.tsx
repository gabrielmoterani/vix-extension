interface StatsListProps {
  stats: Array<{
    label: string
    value: string | number
    description?: string
  }>
}

export function StatsList({ stats }: StatsListProps) {
  return (
    <dl className="space-y-2">
      {stats.map((stat, index) => (
        <div key={index} className="flex justify-between items-center">
          <dt className="text-sm font-medium">
            {stat.label}:
          </dt>
          <dd 
            className="text-sm font-mono font-bold"
            title={stat.description}
            aria-describedby={stat.description ? `stat-desc-${index}` : undefined}
          >
            {stat.value}
            {stat.description && (
              <span 
                id={`stat-desc-${index}`}
                className="sr-only"
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