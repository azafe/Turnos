import type { KeyboardEvent } from 'react'
import { SHIFT_CONFIG, SHIFT_ORDER } from '../../scheduler'
import type { Controller, MonthlySchedule } from '../../types'

interface AgendaTabProps {
  schedule: MonthlySchedule | null
  agendaDate: string
  selectedAgendaPlan: MonthlySchedule['days'][number] | undefined
  calendarCells: string[]
  dayPlanByDate: Record<string, MonthlySchedule['days'][number]>
  controllerById: Record<string, Controller>
  onSelectAgendaDate: (date: string) => void
  onGenerateMonthList: () => void
  isGenerating: boolean
}

export default function AgendaTab({
  schedule,
  agendaDate,
  selectedAgendaPlan,
  calendarCells,
  dayPlanByDate,
  controllerById,
  onSelectAgendaDate,
  onGenerateMonthList,
  isGenerating,
}: AgendaTabProps) {
  const focusGridCell = (startIndex: number, step: number): void => {
    let nextIndex = startIndex
    while (nextIndex >= 0 && nextIndex < calendarCells.length) {
      if (calendarCells[nextIndex]) {
        const target = document.querySelector<HTMLButtonElement>(`button[data-grid-index='${nextIndex}']`)
        target?.focus()
        return
      }
      nextIndex += step
    }
  }

  const handleCellKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    date: string,
    index: number,
  ): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelectAgendaDate(date)
      return
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault()
      focusGridCell(index + 1, 1)
      return
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      focusGridCell(index - 1, -1)
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      focusGridCell(index + 7, 7)
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      focusGridCell(index - 7, -7)
    }
  }

  return (
    <main className="content-grid">
      <article className="panel" id="section-agenda">
        {schedule ? (
          <div className="agenda-layout">
            <div>
              <h2>Almanaque de turnos</h2>
              <p className="dim">Click en un dia para ver el detalle de A/B/C.</p>
              <div className="calendar-grid">
                {['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'].map((label) => (
                  <div key={label} className="calendar-head">
                    {label}
                  </div>
                ))}

                {calendarCells.map((date, index) => {
                  if (!date) {
                    return <div key={`blank-${index}`} className="calendar-cell blank" />
                  }

                  const plan = dayPlanByDate[date]
                  const isSelected = date === agendaDate
                  const dayNumber = Number(date.slice(-2))
                  return (
                    <button
                      key={date}
                      data-grid-index={index}
                      className={isSelected ? 'calendar-cell selected' : 'calendar-cell'}
                      onClick={() => onSelectAgendaDate(date)}
                      onKeyDown={(event) => handleCellKeyDown(event, date, index)}
                      tabIndex={0}
                      aria-label={`Dia ${dayNumber}: turno A ${plan?.shifts.A.assignedControllerIds.length ?? 0}, turno B ${plan?.shifts.B.assignedControllerIds.length ?? 0}, turno C ${plan?.shifts.C.assignedControllerIds.length ?? 0}`}
                    >
                      <div className="calendar-day">{dayNumber}</div>
                      <div className="calendar-mini">
                        <span>A {plan?.shifts.A.assignedControllerIds.length ?? 0}</span>
                        <span>B {plan?.shifts.B.assignedControllerIds.length ?? 0}</span>
                        <span>C {plan?.shifts.C.assignedControllerIds.length ?? 0}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="agenda-detail">
              <h3>Detalle del dia {agendaDate ? formatDate(agendaDate) : '-'}</h3>
              {selectedAgendaPlan ? (
                <>
                  {SHIFT_ORDER.map((shift) => {
                    const shiftPlan = selectedAgendaPlan.shifts[shift]
                    return (
                      <section key={shift} className="agenda-shift">
                        <h4>
                          Turno {shift} ({SHIFT_CONFIG[shift].local} local / {SHIFT_CONFIG[shift].utc} UTC)
                        </h4>
                        <p className="dim">
                          Cobertura {shiftPlan.assignedControllerIds.length}/{shiftPlan.required}
                        </p>
                        <ul className="assignment-list">
                          {shiftPlan.assignedControllerIds.map((controllerId) => (
                            <li key={controllerId}>{nameById(controllerById, controllerId)}</li>
                          ))}
                        </ul>
                        {shiftPlan.conflicts.length ? (
                          <ul className="conflict-list">
                            {shiftPlan.conflicts.map((conflict, index) => (
                              <li key={`${shift}-agenda-${index}`}>{conflict}</li>
                            ))}
                          </ul>
                        ) : null}
                      </section>
                    )
                  })}
                </>
              ) : (
                <p className="dim">No hay datos para el dia seleccionado.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <p>Genera la lista mensual para habilitar la agenda.</p>
            <button className="button" onClick={onGenerateMonthList} disabled={isGenerating}>
              {isGenerating ? 'Generando...' : 'Generar lista del mes'}
            </button>
          </div>
        )}
      </article>
    </main>
  )
}

function nameById(controllers: Record<string, Controller>, controllerId: string): string {
  return controllers[controllerId]?.name ?? 'N/D'
}

function formatDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
  })
}
