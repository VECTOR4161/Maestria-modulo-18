export function LoadingState({ message }: { message: string }) {
  return (
    <div className="status loading" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      {message}
    </div>
  )
}

export function ErrorAlert({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="status error" role="alert">
      <strong>Error:</strong> {message}
      {onRetry && (
        <button type="button" className="link" onClick={onRetry}>
          Reintentar
        </button>
      )}
    </div>
  )
}

export function WarningList({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) {
    return null
  }
  return (
    <ul className="status warning" aria-label="Advertencias">
      {warnings.map((warning) => (
        <li key={warning}>{warning}</li>
      ))}
    </ul>
  )
}
