export type Page = 'inicio' | 'controladores' | 'agenda' | 'stats'

interface HeaderOpsProps {
  activePage: Page
  hasPendingGeneration: boolean
  hasSchedule: boolean
  onNavigate: (page: Page) => void
}

export default function HeaderOps({
  activePage,
  hasPendingGeneration,
  hasSchedule,
  onNavigate,
}: HeaderOpsProps) {
  const statusClass = hasPendingGeneration ? 'status-chip warn' : hasSchedule ? 'status-chip ok' : 'status-chip warn'
  const statusText = hasPendingGeneration ? '⚠️ Pendiente' : hasSchedule ? '✅ Vigente' : '⚠️ Pendiente'

  return (
    <header className="app-header">
      <div className="title-block">
        <h1>EANA | TORRE DE CONTROL TUCUMÁN</h1>
        <span className={statusClass} aria-live="polite">
          {statusText}
        </span>
      </div>

      <nav className="nav-row" aria-label="Navegacion principal">
        <button
          className={activePage === 'inicio' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => onNavigate('inicio')}
          aria-label="Ir a inicio"
        >
          Inicio
        </button>
        <button
          className={activePage === 'controladores' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => onNavigate('controladores')}
          aria-label="Ir a controladores"
        >
          Controladores
        </button>
        <button
          className={activePage === 'agenda' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => onNavigate('agenda')}
          aria-label="Ir a agenda"
        >
          Agenda
        </button>
        <button
          className={activePage === 'stats' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => onNavigate('stats')}
          aria-label="Ir a estadisticas"
        >
          Estadísticas
        </button>
      </nav>
    </header>
  )
}
