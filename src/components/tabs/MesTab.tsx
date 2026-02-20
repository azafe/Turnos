import { useMemo, useRef, useState } from 'react'
import { MONTH_LABELS, ROLE_OPTIONS, WEEKDAY_OPTIONS } from '../../defaults'
import { SHIFT_CONFIG, SHIFT_ORDER } from '../../scheduler'
import type {
  Controller,
  ControllerRole,
  CoverageOverride,
  DateBlockConstraint,
  ForcedAssignment,
  Holiday,
  MonthlySchedule,
  ShiftCode,
  TurneroData,
  VacationConstraint,
  WeekdayBlockConstraint,
} from '../../types'
import Pagination from '../Pagination'

interface PaginationResult<T> {
  items: T[]
  currentPage: number
  totalPages: number
  totalItems: number
  startItem: number
  endItem: number
}

interface ControllerDraft {
  name: string
  role: ControllerRole
  condition: string
  pending: number
}

interface MesTabProps {
  data: TurneroData
  fixedYear: number
  controllerById: Record<string, Controller>
  controllerQuery: string
  onControllerQueryChange: (value: string) => void
  controllerPagination: PaginationResult<Controller>
  onControllerPageChange: (nextPage: number) => void
  schedule: MonthlySchedule | null
  schedulePagination: PaginationResult<MonthlySchedule['days'][number]>
  scheduleTotalDays: number
  onSchedulePageChange: (nextPage: number) => void
  defaultDate: string
  defaultControllerId: string
  monthCoverageOverrides: CoverageOverride[]
  monthVacations: VacationConstraint[]
  monthWeekdayBlocks: WeekdayBlockConstraint[]
  monthDateBlocks: DateBlockConstraint[]
  monthForcedAssignments: ForcedAssignment[]
  monthHolidays: Holiday[]
  onlyProblemDays: boolean
  onToggleOnlyProblemDays: (nextValue: boolean) => void
  onGenerateMonthList: () => void
  isGenerating: boolean
  onAddController: (draft: ControllerDraft) => void
  onUpdateController: (controllerId: string, draft: ControllerDraft) => void
  onRemoveController: (controllerId: string) => void
  onAddCoverageOverride: (payload: { date: string; shift: ShiftCode; required: number; note: string }) => void
  onDeleteCoverageOverride: (id: string) => void
  onAddVacation: (payload: { controllerId: string; startDate: string; endDate: string; note: string }) => void
  onDeleteVacation: (id: string) => void
  onAddWeekdayBlock: (payload: { controllerId: string; weekday: number; shift: ShiftCode; note: string }) => void
  onDeleteWeekdayBlock: (id: string) => void
  onAddDateBlock: (payload: { controllerId: string; date: string; shift: ShiftCode; note: string }) => void
  onDeleteDateBlock: (id: string) => void
  onAddForcedAssignment: (payload: { controllerId: string; date: string; shift: ShiftCode; note: string }) => void
  onDeleteForcedAssignment: (id: string) => void
  onAddHoliday: (payload: { date: string; name: string }) => void
  onDeleteHoliday: (id: string) => void
}

const EMPTY_CONTROLLER_DRAFT: ControllerDraft = {
  name: '',
  role: 'OPERADOR',
  condition: '',
  pending: 0,
}

export default function MesTab({
  data,
  fixedYear,
  controllerById,
  controllerQuery,
  onControllerQueryChange,
  controllerPagination,
  onControllerPageChange,
  schedule,
  schedulePagination,
  scheduleTotalDays,
  onSchedulePageChange,
  defaultDate,
  defaultControllerId,
  monthCoverageOverrides,
  monthVacations,
  monthWeekdayBlocks,
  monthDateBlocks,
  monthForcedAssignments,
  monthHolidays,
  onlyProblemDays,
  onToggleOnlyProblemDays,
  onGenerateMonthList,
  isGenerating,
  onAddController,
  onUpdateController,
  onRemoveController,
  onAddCoverageOverride,
  onDeleteCoverageOverride,
  onAddVacation,
  onDeleteVacation,
  onAddWeekdayBlock,
  onDeleteWeekdayBlock,
  onAddDateBlock,
  onDeleteDateBlock,
  onAddForcedAssignment,
  onDeleteForcedAssignment,
  onAddHoliday,
  onDeleteHoliday,
}: MesTabProps) {
  const nameInputRef = useRef<HTMLInputElement | null>(null)

  const [controllerForm, setControllerForm] = useState<ControllerDraft>(EMPTY_CONTROLLER_DRAFT)
  const [editingControllerId, setEditingControllerId] = useState<string | null>(null)
  const [editingControllerForm, setEditingControllerForm] = useState<ControllerDraft>(EMPTY_CONTROLLER_DRAFT)

  const [coverageForm, setCoverageForm] = useState({
    date: '',
    shift: 'A' as ShiftCode,
    required: SHIFT_CONFIG.A.defaultRequired,
    note: '',
  })

  const [vacationForm, setVacationForm] = useState({
    controllerId: '',
    startDate: '',
    endDate: '',
    note: '',
  })

  const [weekdayBlockForm, setWeekdayBlockForm] = useState({
    controllerId: '',
    weekday: 4,
    shift: 'C' as ShiftCode,
    note: '',
  })

  const [dateBlockForm, setDateBlockForm] = useState({
    controllerId: '',
    date: '',
    shift: 'A' as ShiftCode,
    note: '',
  })

  const [forcedForm, setForcedForm] = useState({
    controllerId: '',
    date: '',
    shift: 'A' as ShiftCode,
    note: '',
  })

  const [holidayForm, setHolidayForm] = useState({
    date: '',
    name: '',
  })

  const selectedController = useMemo(
    () => data.controllers.find((controller) => controller.id === editingControllerId),
    [data.controllers, editingControllerId],
  )

  const openEditControllerModal = (controller: Controller): void => {
    setEditingControllerId(controller.id)
    setEditingControllerForm({
      name: controller.name,
      role: controller.role,
      condition: controller.condition,
      pending: controller.pending,
    })
  }

  const closeEditControllerModal = (): void => {
    setEditingControllerId(null)
    setEditingControllerForm(EMPTY_CONTROLLER_DRAFT)
  }

  const scrollToSection = (sectionId: string): void => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const focusAddController = (): void => {
    document.getElementById('section-controllers')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.requestAnimationFrame(() => {
      nameInputRef.current?.focus()
    })
  }

  return (
    <main className="content-grid">
      <section className="mes-toolbar" aria-label="Herramientas del mes">
        <input
          className="toolbar-input"
          placeholder="Buscar controlador por nombre"
          value={controllerQuery}
          onChange={(event) => onControllerQueryChange(event.target.value)}
          aria-label="Buscar controlador"
        />
        <div className="toolbar-actions">
          <button className="button ghost-dark min-touch" onClick={focusAddController} aria-label="Agregar controlador">
            + Controlador
          </button>
          <button
            className={onlyProblemDays ? 'chip-toggle active' : 'chip-toggle'}
            onClick={() => onToggleOnlyProblemDays(!onlyProblemDays)}
            aria-pressed={onlyProblemDays}
            aria-label="Filtrar solo dias con problemas"
          >
            Solo problemas
          </button>
          <button className="chip-toggle" onClick={() => scrollToSection('section-constraints')} aria-label="Mostrar condicionantes">
            Mostrar: Condicionantes
          </button>
          <button className="chip-toggle" onClick={() => scrollToSection('section-month-grid')} aria-label="Mostrar planilla mensual">
            Mostrar: Planilla
          </button>
          <button className="chip-toggle" onClick={() => scrollToSection('section-constraints')} aria-label="Ir a condicionantes">
            Ir a condicionantes
          </button>
        </div>
      </section>

      <article className="panel" id="section-controllers">
        <h2>Controladores</h2>
        <div className="search-row">
          <span className="dim">
            Mostrando {controllerPagination.startItem}-{controllerPagination.endItem} de {controllerPagination.totalItems}
          </span>
        </div>
        <div className="row-inline responsive">
          <input
            ref={nameInputRef}
            placeholder="Nombre"
            value={controllerForm.name}
            onChange={(event) => setControllerForm((current) => ({ ...current, name: event.target.value }))}
            aria-label="Nombre del controlador"
          />

          <select
            value={controllerForm.role}
            onChange={(event) =>
              setControllerForm((current) => ({
                ...current,
                role: event.target.value as ControllerRole,
              }))
            }
            aria-label="Cargo del controlador"
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <input
            placeholder="Condicionante"
            value={controllerForm.condition}
            onChange={(event) => setControllerForm((current) => ({ ...current, condition: event.target.value }))}
            aria-label="Condicionante del controlador"
          />

          <input
            type="number"
            min={0}
            value={controllerForm.pending}
            onChange={(event) =>
              setControllerForm((current) => ({
                ...current,
                pending: Number(event.target.value),
              }))
            }
            placeholder="Pendientes"
            aria-label="Turnos pendientes"
          />

          <button
            className="button"
            onClick={() => {
              onAddController(controllerForm)
              setControllerForm(EMPTY_CONTROLLER_DRAFT)
            }}
            aria-label="Agregar nuevo controlador"
          >
            Agregar
          </button>
        </div>

        <div className="table-wrapper desktop-only">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Cargo</th>
                <th>Condicionante</th>
                <th>Pendiente</th>
              </tr>
            </thead>
            <tbody>
              {controllerPagination.items.map((controller) => (
                <tr key={controller.id}>
                  <td>
                    <button className="name-link" onClick={() => openEditControllerModal(controller)} aria-label={`Editar ${controller.name}`}>
                      {controller.name}
                    </button>
                  </td>
                  <td>
                    <RoleBadge role={controller.role} />
                  </td>
                  <td>{controller.condition || '-'}</td>
                  <td>{controller.pending}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mobile-only stack-list">
          {controllerPagination.items.map((controller) => (
            <article key={`mobile-${controller.id}`} className="stack-card">
              <div className="stack-head">
                <button className="name-link" onClick={() => openEditControllerModal(controller)} aria-label={`Editar ${controller.name}`}>
                  {controller.name}
                </button>
              </div>
              <div className="stack-grid">
                <p>
                  <strong>Cargo:</strong> <RoleBadge role={controller.role} compact />
                </p>
                <p>
                  <strong>Pendiente:</strong> {controller.pending}
                </p>
                <p>
                  <strong>Condicionante:</strong> {controller.condition || '-'}
                </p>
              </div>
            </article>
          ))}
        </div>

        <Pagination
          page={controllerPagination.currentPage}
          totalPages={controllerPagination.totalPages}
          onPageChange={onControllerPageChange}
        />
      </article>

      <article className="panel panel-depth" id="section-constraints">
        <h2>Condicionantes</h2>

        <details open>
          <summary>Cobertura puntual por fecha/turno</summary>
          <div className="row-inline responsive">
            <input
              type="date"
              value={coverageForm.date || defaultDate}
              onChange={(event) => setCoverageForm((current) => ({ ...current, date: event.target.value }))}
              aria-label="Fecha de cobertura puntual"
            />
            <select
              value={coverageForm.shift}
              onChange={(event) =>
                setCoverageForm((current) => ({
                  ...current,
                  shift: event.target.value as ShiftCode,
                }))
              }
              aria-label="Turno de cobertura puntual"
            >
              {SHIFT_ORDER.map((shift) => (
                <option key={shift} value={shift}>
                  {shift}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              value={coverageForm.required}
              onChange={(event) =>
                setCoverageForm((current) => ({
                  ...current,
                  required: Number(event.target.value),
                }))
              }
              aria-label="Cantidad requerida"
            />
            <input
              placeholder="Motivo"
              value={coverageForm.note}
              onChange={(event) => setCoverageForm((current) => ({ ...current, note: event.target.value }))}
              aria-label="Motivo de cobertura"
            />
            <button
              className="button small"
              onClick={() => {
                onAddCoverageOverride({
                  date: coverageForm.date || defaultDate,
                  shift: coverageForm.shift,
                  required: coverageForm.required,
                  note: coverageForm.note,
                })
                setCoverageForm((current) => ({ ...current, note: '' }))
              }}
              aria-label="Agregar cobertura puntual"
            >
              Agregar
            </button>
          </div>

          <ConstraintList
            items={monthCoverageOverrides.map((item) => ({
              id: item.id,
              text: `${item.date} | ${item.shift} = ${item.required} ${item.note ? `(${item.note})` : ''}`,
            }))}
            onDelete={onDeleteCoverageOverride}
          />
        </details>

        <details>
          <summary>Vacaciones / licencias</summary>
          <div className="row-inline responsive">
            <ControllerSelect
              value={vacationForm.controllerId || defaultControllerId}
              onChange={(controllerId) => setVacationForm((current) => ({ ...current, controllerId }))}
              controllers={data.controllers}
            />
            <input
              type="date"
              value={vacationForm.startDate || defaultDate}
              onChange={(event) => setVacationForm((current) => ({ ...current, startDate: event.target.value }))}
              aria-label="Inicio de vacaciones"
            />
            <input
              type="date"
              value={vacationForm.endDate || defaultDate}
              onChange={(event) => setVacationForm((current) => ({ ...current, endDate: event.target.value }))}
              aria-label="Fin de vacaciones"
            />
            <input
              placeholder="Detalle"
              value={vacationForm.note}
              onChange={(event) => setVacationForm((current) => ({ ...current, note: event.target.value }))}
              aria-label="Detalle de vacaciones"
            />
            <button
              className="button small"
              onClick={() => {
                onAddVacation({
                  controllerId: vacationForm.controllerId || defaultControllerId,
                  startDate: vacationForm.startDate || defaultDate,
                  endDate: vacationForm.endDate || defaultDate,
                  note: vacationForm.note,
                })
                setVacationForm((current) => ({ ...current, note: '' }))
              }}
              aria-label="Agregar vacaciones"
            >
              Agregar
            </button>
          </div>
          <ConstraintList
            items={monthVacations.map((item) => ({
              id: item.id,
              text: `${nameById(controllerById, item.controllerId)} | ${item.startDate} a ${item.endDate}`,
            }))}
            onDelete={onDeleteVacation}
          />
        </details>

        <details>
          <summary>Bloqueo semanal (ej: jueves noche)</summary>
          <div className="row-inline responsive">
            <ControllerSelect
              value={weekdayBlockForm.controllerId || defaultControllerId}
              onChange={(controllerId) => setWeekdayBlockForm((current) => ({ ...current, controllerId }))}
              controllers={data.controllers}
            />
            <select
              value={weekdayBlockForm.weekday}
              onChange={(event) =>
                setWeekdayBlockForm((current) => ({
                  ...current,
                  weekday: Number(event.target.value),
                }))
              }
              aria-label="Dia de bloqueo semanal"
            >
              {WEEKDAY_OPTIONS.map((weekday) => (
                <option key={weekday.value} value={weekday.value}>
                  {weekday.label}
                </option>
              ))}
            </select>
            <select
              value={weekdayBlockForm.shift}
              onChange={(event) =>
                setWeekdayBlockForm((current) => ({
                  ...current,
                  shift: event.target.value as ShiftCode,
                }))
              }
              aria-label="Turno bloqueado semanal"
            >
              {SHIFT_ORDER.map((shift) => (
                <option key={shift} value={shift}>
                  {shift}
                </option>
              ))}
            </select>
            <input
              placeholder="Detalle"
              value={weekdayBlockForm.note}
              onChange={(event) => setWeekdayBlockForm((current) => ({ ...current, note: event.target.value }))}
              aria-label="Detalle de bloqueo semanal"
            />
            <button
              className="button small"
              onClick={() => {
                onAddWeekdayBlock({
                  controllerId: weekdayBlockForm.controllerId || defaultControllerId,
                  weekday: weekdayBlockForm.weekday,
                  shift: weekdayBlockForm.shift,
                  note: weekdayBlockForm.note,
                })
                setWeekdayBlockForm((current) => ({ ...current, note: '' }))
              }}
              aria-label="Agregar bloqueo semanal"
            >
              Agregar
            </button>
          </div>
          <ConstraintList
            items={monthWeekdayBlocks.map((item) => ({
              id: item.id,
              text: `${nameById(controllerById, item.controllerId)} | ${WEEKDAY_OPTIONS.find((day) => day.value === item.weekday)?.label} | ${item.shift}`,
            }))}
            onDelete={onDeleteWeekdayBlock}
          />
        </details>

        <details>
          <summary>Bloqueo puntual por fecha y turno</summary>
          <div className="row-inline responsive">
            <ControllerSelect
              value={dateBlockForm.controllerId || defaultControllerId}
              onChange={(controllerId) => setDateBlockForm((current) => ({ ...current, controllerId }))}
              controllers={data.controllers}
            />
            <input
              type="date"
              value={dateBlockForm.date || defaultDate}
              onChange={(event) => setDateBlockForm((current) => ({ ...current, date: event.target.value }))}
              aria-label="Fecha de bloqueo puntual"
            />
            <select
              value={dateBlockForm.shift}
              onChange={(event) =>
                setDateBlockForm((current) => ({
                  ...current,
                  shift: event.target.value as ShiftCode,
                }))
              }
              aria-label="Turno de bloqueo puntual"
            >
              {SHIFT_ORDER.map((shift) => (
                <option key={shift} value={shift}>
                  {shift}
                </option>
              ))}
            </select>
            <input
              placeholder="Detalle"
              value={dateBlockForm.note}
              onChange={(event) => setDateBlockForm((current) => ({ ...current, note: event.target.value }))}
              aria-label="Detalle de bloqueo puntual"
            />
            <button
              className="button small"
              onClick={() => {
                onAddDateBlock({
                  controllerId: dateBlockForm.controllerId || defaultControllerId,
                  date: dateBlockForm.date || defaultDate,
                  shift: dateBlockForm.shift,
                  note: dateBlockForm.note,
                })
                setDateBlockForm((current) => ({ ...current, note: '' }))
              }}
              aria-label="Agregar bloqueo puntual"
            >
              Agregar
            </button>
          </div>
          <ConstraintList
            items={monthDateBlocks.map((item) => ({
              id: item.id,
              text: `${nameById(controllerById, item.controllerId)} | ${item.date} | ${item.shift}`,
            }))}
            onDelete={onDeleteDateBlock}
          />
        </details>

        <details>
          <summary>Asignaciones forzadas</summary>
          <div className="row-inline responsive">
            <ControllerSelect
              value={forcedForm.controllerId || defaultControllerId}
              onChange={(controllerId) => setForcedForm((current) => ({ ...current, controllerId }))}
              controllers={data.controllers}
            />
            <input
              type="date"
              value={forcedForm.date || defaultDate}
              onChange={(event) => setForcedForm((current) => ({ ...current, date: event.target.value }))}
              aria-label="Fecha de asignacion forzada"
            />
            <select
              value={forcedForm.shift}
              onChange={(event) =>
                setForcedForm((current) => ({
                  ...current,
                  shift: event.target.value as ShiftCode,
                }))
              }
              aria-label="Turno de asignacion forzada"
            >
              {SHIFT_ORDER.map((shift) => (
                <option key={shift} value={shift}>
                  {shift}
                </option>
              ))}
            </select>
            <input
              placeholder="Detalle"
              value={forcedForm.note}
              onChange={(event) => setForcedForm((current) => ({ ...current, note: event.target.value }))}
              aria-label="Detalle de asignacion forzada"
            />
            <button
              className="button small"
              onClick={() => {
                onAddForcedAssignment({
                  controllerId: forcedForm.controllerId || defaultControllerId,
                  date: forcedForm.date || defaultDate,
                  shift: forcedForm.shift,
                  note: forcedForm.note,
                })
                setForcedForm((current) => ({ ...current, note: '' }))
              }}
              aria-label="Agregar asignacion forzada"
            >
              Agregar
            </button>
          </div>
          <ConstraintList
            items={monthForcedAssignments.map((item) => ({
              id: item.id,
              text: `${nameById(controllerById, item.controllerId)} | ${item.date} | ${item.shift}`,
            }))}
            onDelete={onDeleteForcedAssignment}
          />
        </details>

        <details>
          <summary>Feriados</summary>
          <div className="row-inline responsive">
            <input
              type="date"
              value={holidayForm.date || defaultDate}
              onChange={(event) => setHolidayForm((current) => ({ ...current, date: event.target.value }))}
              aria-label="Fecha de feriado"
            />
            <input
              placeholder="Nombre"
              value={holidayForm.name}
              onChange={(event) => setHolidayForm((current) => ({ ...current, name: event.target.value }))}
              aria-label="Nombre del feriado"
            />
            <button
              className="button small"
              onClick={() => {
                onAddHoliday({
                  date: holidayForm.date || defaultDate,
                  name: holidayForm.name,
                })
                setHolidayForm((current) => ({ ...current, name: '' }))
              }}
              aria-label="Agregar feriado"
            >
              Agregar
            </button>
          </div>
          <ConstraintList
            items={monthHolidays.map((item) => ({
              id: item.id,
              text: `${item.date} | ${item.name}`,
            }))}
            onDelete={onDeleteHoliday}
          />
        </details>
      </article>

      <article className="panel schedule-panel panel-depth" id="section-month-grid">
        <h2>
          Planilla mensual ({MONTH_LABELS[data.month - 1]} {fixedYear})
        </h2>

        {data.monthlyNotes ? <p className="monthly-note">Notas: {data.monthlyNotes}</p> : null}

        {schedule ? (
          <>
            {onlyProblemDays && schedulePagination.totalItems === 0 ? (
              <div className="empty-state">
                <p>No hay dias con conflictos para el filtro actual.</p>
                <button className="button ghost-dark" onClick={() => onToggleOnlyProblemDays(false)}>
                  Mostrar todos los dias
                </button>
              </div>
            ) : (
              <>
                <p className="dim">
                  Mostrando dias {schedulePagination.startItem}-{schedulePagination.endItem} de {schedulePagination.totalItems}
                  {onlyProblemDays ? ` (filtrados de ${scheduleTotalDays})` : ''}
                </p>
                <div className="day-grid">
                  {schedulePagination.items.map((day) => (
                    <article key={`day-${day.date}`} className="day-card">
                      <div className="day-card-head">
                        <h3>
                          {formatDate(day.date)} <span className="dim">({day.dayLabel})</span>
                        </h3>
                      </div>
                      {SHIFT_ORDER.map((shift) => {
                        const plan = day.shifts[shift]
                        return (
                          <section key={`day-${day.date}-${shift}`} className="shift-card">
                            <p className="shift-title">
                              <strong>Turno {shift}</strong>
                              <span>
                                {plan.assignedControllerIds.length}/{plan.required}
                              </span>
                            </p>
                            <p className="dim">
                              {SHIFT_CONFIG[shift].local} local | {SHIFT_CONFIG[shift].utc} UTC
                            </p>
                            <div className="assignment-pills">
                              {plan.assignedControllerIds.map((controllerId) => (
                                <ControllerAssignmentTag
                                  key={`pill-${day.date}-${shift}-${controllerId}`}
                                  controller={controllerById[controllerId]}
                                />
                              ))}
                            </div>
                            {plan.conflicts.length ? (
                              <ul className="conflict-list">
                                {plan.conflicts.map((conflict, index) => (
                                  <li key={`mobile-conf-${day.date}-${shift}-${index}`}>{conflict}</li>
                                ))}
                              </ul>
                            ) : null}
                          </section>
                        )
                      })}
                    </article>
                  ))}
                </div>

                <Pagination
                  page={schedulePagination.currentPage}
                  totalPages={schedulePagination.totalPages}
                  onPageChange={onSchedulePageChange}
                />
              </>
            )}
          </>
        ) : (
          <div className="empty-state">
            <p>Aun no hay lista generada para este mes.</p>
            <button className="button" onClick={onGenerateMonthList} disabled={isGenerating}>
              {isGenerating ? 'Generando...' : 'Generar lista del mes'}
            </button>
          </div>
        )}
      </article>

      {editingControllerId ? (
        <div className="modal-backdrop" onClick={closeEditControllerModal}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <h3>Editar controlador</h3>
            <div className="modal-grid">
              <label>
                Nombre
                <input
                  value={editingControllerForm.name}
                  onChange={(event) =>
                    setEditingControllerForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Cargo
                <select
                  value={editingControllerForm.role}
                  onChange={(event) =>
                    setEditingControllerForm((current) => ({
                      ...current,
                      role: event.target.value as ControllerRole,
                    }))
                  }
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Condicionante
                <textarea
                  rows={3}
                  value={editingControllerForm.condition}
                  onChange={(event) =>
                    setEditingControllerForm((current) => ({
                      ...current,
                      condition: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Pendientes
                <input
                  type="number"
                  min={0}
                  value={editingControllerForm.pending}
                  onChange={(event) =>
                    setEditingControllerForm((current) => ({
                      ...current,
                      pending: Number(event.target.value),
                    }))
                  }
                />
              </label>
            </div>
            <div className="modal-actions">
              <button
                className="button subtle-danger"
                onClick={() => {
                  if (!selectedController) {
                    return
                  }
                  onRemoveController(selectedController.id)
                  closeEditControllerModal()
                }}
              >
                Quitar controlador
              </button>
              <button
                className="button"
                onClick={() => {
                  if (!selectedController) {
                    return
                  }
                  onUpdateController(selectedController.id, editingControllerForm)
                  closeEditControllerModal()
                }}
              >
                Guardar cambios
              </button>
              <button className="button ghost-dark" onClick={closeEditControllerModal}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}

function ControllerSelect({
  value,
  onChange,
  controllers,
}: {
  value: string
  onChange: (value: string) => void
  controllers: Controller[]
}) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} aria-label="Seleccionar controlador">
      <option value="">Selecciona controlador</option>
      {controllers.map((controller) => (
        <option key={controller.id} value={controller.id}>
          {controller.name}
        </option>
      ))}
    </select>
  )
}

function ConstraintList({
  items,
  onDelete,
}: {
  items: Array<{ id: string; text: string }>
  onDelete: (id: string) => void
}) {
  if (!items.length) {
    return <p className="dim">Sin registros.</p>
  }

  return (
    <div className="chips-wrap">
      {items.map((item) => (
        <span key={item.id} className="chip">
          {item.text}
          <button onClick={() => onDelete(item.id)} aria-label="Quitar condicionante">
            x
          </button>
        </span>
      ))}
    </div>
  )
}

function ControllerAssignmentTag({ controller }: { controller?: Controller }) {
  if (!controller) {
    return <span className="assignment-pill">N/D</span>
  }

  return (
    <span className="assignment-pill">
      <RoleBadge role={controller.role} compact />
      <span>{controller.name}</span>
    </span>
  )
}

function RoleBadge({ role, compact = false }: { role: ControllerRole; compact?: boolean }) {
  const text = compact ? roleShort(role) : roleLabel(role)
  return <span className={`role-badge role-${role.toLowerCase()}`}>{text}</span>
}

function roleLabel(role: ControllerRole): string {
  return ROLE_OPTIONS.find((item) => item.value === role)?.label ?? role
}

function roleShort(role: ControllerRole): string {
  if (role === 'JEFE_DEPENDENCIA') {
    return 'JD'
  }
  if (role === 'SUPERVISOR') {
    return 'SUP'
  }
  if (role === 'INSTRUCTOR') {
    return 'INST'
  }
  if (role === 'OPERADOR') {
    return 'OP'
  }
  if (role === 'PRACTICANTE') {
    return 'PRAC'
  }
  return 'ADS'
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
