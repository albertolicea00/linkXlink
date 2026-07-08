export type StatVariant = 'total' | 'pending' | 'active' | 'banned' | 'approved'

export function StatCard({
  value,
  label,
  variant,
  title,
  wide,
}: {
  value: number | string
  label: string
  variant: StatVariant
  /** Native tooltip — used for cards whose value format needs a hint (e.g. "3/10"). */
  title?: string
  /** Spans 2 grid columns — for combined values like "3/10". */
  wide?: boolean
}) {
  return (
    <div className={`stat-card stat-card--${variant}${wide ? ' stat-card--wide' : ''}`} title={title}>
      <span className="stat-card__value">{value}</span>
      <span className="stat-card__label">{label}</span>
    </div>
  )
}
