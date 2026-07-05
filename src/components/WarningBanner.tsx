interface Props {
  message: string
  variant?: 'warning' | 'error' | 'info'
}

export function WarningBanner({ message, variant = 'warning' }: Props) {
  return (
    <div className={`warning-banner warning-banner--${variant}`} role="alert">
      {message}
    </div>
  )
}
