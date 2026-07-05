import './Loader.css'

interface LoaderProps {
  text?: string
}

export function Loader({ text }: LoaderProps) {
  return (
    <div className="loader-container">
      <div className="loader-spinner"></div>
      {text && <p className="loader-text">{text}</p>}
    </div>
  )
}
