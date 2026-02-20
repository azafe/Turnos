import type { MonthlySchedule } from '../../types'
import Pagination from '../Pagination'

interface StatsRow {
  nombre: string
  cargo: string
  turnosA: number
  turnosB: number
  turnosC: number
  total: number
  finDeSemana: number
  vacaciones: number
  feriados: number
  pendientes: number
}

interface PaginationResult<T> {
  items: T[]
  currentPage: number
  totalPages: number
  totalItems: number
  startItem: number
  endItem: number
}

interface StatsTabProps {
  schedule: MonthlySchedule | null
  controllerQuery: string
  onControllerQueryChange: (value: string) => void
  statsPagination: PaginationResult<StatsRow>
  filteredStatsCount: number
  onStatsPageChange: (nextPage: number) => void
  onGenerateMonthList: () => void
  isGenerating: boolean
  summary: {
    controllers: number
    coverageOverrides: number
    vacations: number
    weekdayBlocks: number
    dateBlocks: number
    forcedAssignments: number
    holidays: number
  }
}

export default function StatsTab({
  schedule,
  controllerQuery,
  onControllerQueryChange,
  statsPagination,
  filteredStatsCount,
  onStatsPageChange,
  onGenerateMonthList,
  isGenerating,
  summary,
}: StatsTabProps) {
  return (
    <main className="content-grid">
      <article className="panel panel-depth" id="section-stats">
        <h2>Estadisticas por controlador</h2>
        <div className="search-row">
          <input
            placeholder="Buscar controlador en estadisticas"
            value={controllerQuery}
            onChange={(event) => onControllerQueryChange(event.target.value)}
            aria-label="Buscar controlador en estadisticas"
          />
          <span className="dim">
            Mostrando {statsPagination.startItem}-{statsPagination.endItem} de {filteredStatsCount}
          </span>
        </div>
        {schedule ? (
          <>
            <div className="table-wrapper desktop-only">
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Cargo</th>
                    <th>A</th>
                    <th>B</th>
                    <th>C</th>
                    <th>Total</th>
                    <th>Fin de semana</th>
                    <th>Vacaciones</th>
                    <th>Feriados</th>
                    <th>Pendientes</th>
                  </tr>
                </thead>
                <tbody>
                  {statsPagination.items.map((row) => (
                    <tr key={String(row.nombre)}>
                      <td>{row.nombre}</td>
                      <td>{row.cargo}</td>
                      <td>{row.turnosA}</td>
                      <td>{row.turnosB}</td>
                      <td>{row.turnosC}</td>
                      <td>{row.total}</td>
                      <td>{row.finDeSemana}</td>
                      <td>{row.vacaciones}</td>
                      <td>{row.feriados}</td>
                      <td>{row.pendientes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mobile-only stack-list">
              {statsPagination.items.map((row) => (
                <article key={`mobile-stats-${String(row.nombre)}`} className="stack-card">
                  <h3>{row.nombre}</h3>
                  <div className="stack-grid">
                    <p>
                      <strong>Cargo:</strong> {row.cargo}
                    </p>
                    <p>
                      <strong>Turnos:</strong> A {row.turnosA} | B {row.turnosB} | C {row.turnosC}
                    </p>
                    <p>
                      <strong>Total:</strong> {row.total}
                    </p>
                    <p>
                      <strong>Finde:</strong> {row.finDeSemana}
                    </p>
                    <p>
                      <strong>Vacaciones:</strong> {row.vacaciones}
                    </p>
                    <p>
                      <strong>Feriados:</strong> {row.feriados}
                    </p>
                    <p>
                      <strong>Pendientes:</strong> {row.pendientes}
                    </p>
                  </div>
                </article>
              ))}
            </div>

            <Pagination
              page={statsPagination.currentPage}
              totalPages={statsPagination.totalPages}
              onPageChange={onStatsPageChange}
            />
          </>
        ) : (
          <div className="empty-state">
            <p>Genera la lista mensual para calcular las estadisticas.</p>
            <button className="button" onClick={onGenerateMonthList} disabled={isGenerating}>
              {isGenerating ? 'Generando...' : 'Generar lista del mes'}
            </button>
          </div>
        )}
      </article>

      <article className="panel">
        <h2>Resumen del mes</h2>
        <ul className="rules-list">
          <li>Controladores cargados: {summary.controllers}</li>
          <li>Condicionantes de cobertura: {summary.coverageOverrides}</li>
          <li>Vacaciones/licencias: {summary.vacations}</li>
          <li>Bloqueos semanales: {summary.weekdayBlocks}</li>
          <li>Bloqueos puntuales: {summary.dateBlocks}</li>
          <li>Asignaciones forzadas: {summary.forcedAssignments}</li>
          <li>Feriados: {summary.holidays}</li>
        </ul>
      </article>
    </main>
  )
}
