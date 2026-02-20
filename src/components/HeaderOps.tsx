import { useMemo, useState } from 'react'
import { MONTH_LABELS } from '../defaults'

interface HeaderOpsProps {
  month: number
  year: number
  hasPendingGeneration: boolean
  hasSchedule: boolean
  hasPreviousGeneration: boolean
  lastGeneratedAt: number | null
  isCompact: boolean
  isGenerating: boolean
  pendingSections: string[]
  coverageWarning: string
  onGenerate: () => void
  onExportPdf: () => void
  onReset: () => void
  onViewChanges: () => void
}

export default function HeaderOps({
  month,
  year,
  hasPendingGeneration,
  hasSchedule,
  hasPreviousGeneration,
  lastGeneratedAt,
  isCompact,
  isGenerating,
  pendingSections,
  coverageWarning,
  onGenerate,
  onExportPdf,
  onReset,
  onViewChanges,
}: HeaderOpsProps) {
  const [confirmResetOpen, setConfirmResetOpen] = useState(false)

  const generationLabel = useMemo(() => {
    if (isGenerating) {
      return 'Generando...'
    }
    if (hasPendingGeneration) {
      return 'Generar (pendiente)'
    }
    return 'Generar lista'
  }, [hasPendingGeneration, isGenerating])

  const statusClass = hasPendingGeneration ? 'status-chip warn' : hasSchedule ? 'status-chip ok' : 'status-chip'
  const statusText = hasPendingGeneration ? 'Pendiente de generar' : hasSchedule ? 'Resultados vigentes' : 'Sin generar'

  const lastGenerationText = lastGeneratedAt
    ? `Ultima generacion: ${new Date(lastGeneratedAt).toLocaleDateString('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
      })}`
    : 'Aun no generado'

  const pendingTitle = hasPreviousGeneration
    ? 'Cambios detectados. La planilla mostrada ya no esta vigente.'
    : 'Listo para generar tu primer mes.'

  const pendingSubtitle = hasPreviousGeneration
    ? 'Genera para aplicar los cambios.'
    : 'Genera para crear la primera planilla operativa del mes.'

  return (
    <>
      <header className={isCompact ? 'hero sticky-ops compact' : 'hero sticky-ops'}>
        <div className="hero-main">
          <p className="brand">EANA | Torre de Control</p>
          <h1>Control Room Scheduler</h1>
          <p className="subtitle">
            Mes activo: <strong>{MONTH_LABELS[month - 1]} {year}</strong>
          </p>
          <div className="hero-meta">
            <span className={statusClass} aria-live="polite">
              {statusText}
            </span>
            <small className="last-generated">{lastGenerationText}</small>
          </div>
        </div>

        <div className="hero-actions" role="group" aria-label="Acciones principales">
          <button
            className={isGenerating ? 'button min-touch loading' : 'button min-touch'}
            onClick={onGenerate}
            disabled={isGenerating}
            aria-label="Generar lista mensual"
          >
            {isGenerating ? <span className="spinner" aria-hidden="true" /> : null}
            {generationLabel}
          </button>
          <button
            className="button ghost-dark min-touch"
            onClick={onExportPdf}
            disabled={!hasSchedule || isGenerating}
            aria-label="Exportar PDF"
          >
            PDF
          </button>

          {confirmResetOpen ? (
            <div className="confirm-inline" role="alert">
              <p>
                ¿Restablecer todo? Se perderan los datos guardados.
                {hasPendingGeneration ? ' Ademas hay cambios sin generar.' : ''}
              </p>
              <div className="confirm-actions">
                <button
                  className="button subtle-danger min-touch"
                  onClick={() => {
                    onReset()
                    setConfirmResetOpen(false)
                  }}
                  aria-label="Confirmar restablecimiento"
                >
                  Confirmar
                </button>
                <button
                  className="button ghost-dark min-touch"
                  onClick={() => setConfirmResetOpen(false)}
                  aria-label="Cancelar restablecimiento"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              className="button subtle-danger min-touch"
              onClick={() => setConfirmResetOpen(true)}
              aria-label="Restablecer planificacion"
            >
              Restablecer
            </button>
          )}
        </div>

        {coverageWarning ? <p className="status-msg warn subtle">{coverageWarning}</p> : null}
      </header>

      {hasPendingGeneration ? (
        <section className="pending-banner" role="status" aria-live="polite">
          <div>
            <strong>{pendingTitle}</strong>
            <p>{pendingSubtitle}</p>
            {pendingSections.length ? (
              <p className="pending-list">Pendiente: {pendingSections.join(' / ')}</p>
            ) : null}
          </div>
          <div className="pending-actions">
            <button className="button min-touch" onClick={onGenerate} disabled={isGenerating} aria-label="Generar ahora">
              {isGenerating ? 'Generando...' : 'Generar ahora'}
            </button>
            <button
              className="button ghost-dark min-touch"
              onClick={onViewChanges}
              aria-label="Ir a cambios pendientes"
            >
              Ver cambios
            </button>
          </div>
        </section>
      ) : null}
    </>
  )
}
