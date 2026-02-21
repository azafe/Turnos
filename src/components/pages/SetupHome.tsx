import { useState } from 'react'
import { MONTH_LABELS, WEEKDAY_OPTIONS } from '../../defaults'
import { SHIFT_CONFIG, SHIFT_ORDER } from '../../scheduler'
import type {
  Controller,
  CoverageOverride,
  DateBlockConstraint,
  ForcedAssignment,
  Holiday,
  ShiftCode,
  TurneroData,
  VacationConstraint,
  WeekdayBlockConstraint,
} from '../../types'

interface SetupHomeProps {
  data: TurneroData
  fixedYear: number
  defaultDate: string
  defaultControllerId: string
  controllerById: Record<string, Controller>
  monthCoverageOverrides: CoverageOverride[]
  monthVacations: VacationConstraint[]
  monthWeekdayBlocks: WeekdayBlockConstraint[]
  monthDateBlocks: DateBlockConstraint[]
  monthForcedAssignments: ForcedAssignment[]
  monthHolidays: Holiday[]
  monthConstraintsCount: number
  hasPendingGeneration: boolean
  hasSchedule: boolean
  lastGeneratedAt: number | null
  statusMessage: string
  isGenerating: boolean
  onUpdateMonth: (month: number) => void
  onUpdateMonthlyNotes: (notes: string) => void
  onGenerate: () => void
  onGoAgenda: () => void
  onGoStats: () => void
  onExportPdf: () => void
  onReset: () => void
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

export default function SetupHome({
  data,
  fixedYear,
  defaultDate,
  defaultControllerId,
  controllerById,
  monthCoverageOverrides,
  monthVacations,
  monthWeekdayBlocks,
  monthDateBlocks,
  monthForcedAssignments,
  monthHolidays,
  monthConstraintsCount,
  hasPendingGeneration,
  hasSchedule,
  lastGeneratedAt,
  statusMessage,
  isGenerating,
  onUpdateMonth,
  onUpdateMonthlyNotes,
  onGenerate,
  onGoAgenda,
  onGoStats,
  onExportPdf,
  onReset,
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
}: SetupHomeProps) {
  const [confirmResetOpen, setConfirmResetOpen] = useState(false)

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

  const generationStatus = hasPendingGeneration
    ? 'Tenés cambios sin aplicar. Generá para ver resultados.'
    : hasSchedule && lastGeneratedAt
      ? `Lista generada: ${formatGeneration(lastGeneratedAt)}`
      : 'Todavía no generaste una lista.'

  return (
    <main className="page">
      <details open className="section-card help-card">
        <summary>Cómo usar</summary>
        <ol className="steps-list">
          <li>1. Cargá reglas generales</li>
          <li>2. Agregá condicionantes del mes</li>
          <li>3. Tocá “Generar lista”</li>
          <li>4. Revisá Agenda y Estadísticas</li>
        </ol>
      </details>

      <section className="section-card">
        <h2>Reglas generales</h2>
        <div className="row-inline responsive">
          <label>
            Mes
            <select value={data.month} onChange={(event) => onUpdateMonth(Number(event.target.value))}>
              {MONTH_LABELS.map((monthLabel, index) => (
                <option key={monthLabel} value={index + 1}>
                  {monthLabel}
                </option>
              ))}
            </select>
          </label>

          <label>
            Año
            <input type="number" value={fixedYear} disabled />
          </label>
        </div>

        <label>
          Condicionantes generales del mes
          <textarea
            rows={3}
            value={data.monthlyNotes}
            onChange={(event) => onUpdateMonthlyNotes(event.target.value)}
          />
        </label>

        <ul className="rules-list">
          <li>A y B requieren supervisor.</li>
          <li>Cobertura base: A=3, B=3, C=2.</li>
          <li>Si hay practicante en turno, debe haber instructor.</li>
          <li>Quien hace C no toma A al dia siguiente.</li>
          <li>Jefa/jefe de dependencia no realiza turno C.</li>
          <li>Asignacion equilibrada por carga total y por tipo de turno.</li>
        </ul>
      </section>

      <section className="section-card">
        <h2>Condicionantes del mes</h2>
        <p className="dim strong">Total cargados: {monthConstraintsCount}</p>

        <details open>
          <summary>Cobertura puntual por fecha/turno</summary>
          <div className="row-inline responsive">
            <input
              type="date"
              value={coverageForm.date || defaultDate}
              onChange={(event) => setCoverageForm((current) => ({ ...current, date: event.target.value }))}
            />
            <select
              value={coverageForm.shift}
              onChange={(event) =>
                setCoverageForm((current) => ({
                  ...current,
                  shift: event.target.value as ShiftCode,
                }))
              }
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
            />
            <input
              placeholder="Motivo"
              value={coverageForm.note}
              onChange={(event) => setCoverageForm((current) => ({ ...current, note: event.target.value }))}
            />
            <button
              className="button"
              onClick={() => {
                onAddCoverageOverride({
                  date: coverageForm.date || defaultDate,
                  shift: coverageForm.shift,
                  required: coverageForm.required,
                  note: coverageForm.note,
                })
                setCoverageForm((current) => ({ ...current, note: '' }))
              }}
            >
              Agregar condicionante
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
            />
            <input
              type="date"
              value={vacationForm.endDate || defaultDate}
              onChange={(event) => setVacationForm((current) => ({ ...current, endDate: event.target.value }))}
            />
            <input
              placeholder="Detalle"
              value={vacationForm.note}
              onChange={(event) => setVacationForm((current) => ({ ...current, note: event.target.value }))}
            />
            <button
              className="button"
              onClick={() => {
                onAddVacation({
                  controllerId: vacationForm.controllerId || defaultControllerId,
                  startDate: vacationForm.startDate || defaultDate,
                  endDate: vacationForm.endDate || defaultDate,
                  note: vacationForm.note,
                })
                setVacationForm((current) => ({ ...current, note: '' }))
              }}
            >
              Agregar condicionante
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
            />
            <button
              className="button"
              onClick={() => {
                onAddWeekdayBlock({
                  controllerId: weekdayBlockForm.controllerId || defaultControllerId,
                  weekday: weekdayBlockForm.weekday,
                  shift: weekdayBlockForm.shift,
                  note: weekdayBlockForm.note,
                })
                setWeekdayBlockForm((current) => ({ ...current, note: '' }))
              }}
            >
              Agregar condicionante
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
            />
            <select
              value={dateBlockForm.shift}
              onChange={(event) =>
                setDateBlockForm((current) => ({
                  ...current,
                  shift: event.target.value as ShiftCode,
                }))
              }
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
            />
            <button
              className="button"
              onClick={() => {
                onAddDateBlock({
                  controllerId: dateBlockForm.controllerId || defaultControllerId,
                  date: dateBlockForm.date || defaultDate,
                  shift: dateBlockForm.shift,
                  note: dateBlockForm.note,
                })
                setDateBlockForm((current) => ({ ...current, note: '' }))
              }}
            >
              Agregar condicionante
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
            />
            <select
              value={forcedForm.shift}
              onChange={(event) =>
                setForcedForm((current) => ({
                  ...current,
                  shift: event.target.value as ShiftCode,
                }))
              }
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
            />
            <button
              className="button"
              onClick={() => {
                onAddForcedAssignment({
                  controllerId: forcedForm.controllerId || defaultControllerId,
                  date: forcedForm.date || defaultDate,
                  shift: forcedForm.shift,
                  note: forcedForm.note,
                })
                setForcedForm((current) => ({ ...current, note: '' }))
              }}
            >
              Agregar condicionante
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
            />
            <input
              placeholder="Nombre"
              value={holidayForm.name}
              onChange={(event) => setHolidayForm((current) => ({ ...current, name: event.target.value }))}
            />
            <button
              className="button"
              onClick={() => {
                onAddHoliday({
                  date: holidayForm.date || defaultDate,
                  name: holidayForm.name,
                })
                setHolidayForm((current) => ({ ...current, name: '' }))
              }}
            >
              Agregar condicionante
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
      </section>

      <section className="section-card">
        <h2>Generación</h2>
        <button className={isGenerating ? 'button primary-cta loading' : 'button primary-cta'} onClick={onGenerate} disabled={isGenerating}>
          {isGenerating ? <span className="spinner" aria-hidden="true" /> : null}
          {isGenerating ? 'Generando...' : 'Generar lista'}
        </button>
        <p className={hasPendingGeneration ? 'status-msg warn' : 'status-msg'}>{generationStatus}</p>
        {statusMessage ? <p className="status-msg">{statusMessage}</p> : null}
      </section>

      {hasSchedule && !hasPendingGeneration ? (
        <section className="section-card">
          <h2>Resultados listos</h2>
          <div className="row-inline responsive">
            <button className="button" onClick={onGoAgenda}>Ir a Agenda</button>
            <button className="button ghost-dark" onClick={onGoStats}>Ir a Estadísticas</button>
          </div>
        </section>
      ) : null}

      <section className="section-card actions-card">
        <h2>Acciones</h2>
        <div className="row-inline responsive">
          <button className="button ghost-dark" onClick={onExportPdf} disabled={!hasSchedule || isGenerating}>
            Generar PDF
          </button>

          {confirmResetOpen ? (
            <div className="confirm-inline" role="alert">
              <p>¿Seguro que querés restablecer? Se perderán los datos guardados.</p>
              <div className="confirm-actions">
                <button
                  className="button subtle-danger"
                  onClick={() => {
                    onReset()
                    setConfirmResetOpen(false)
                  }}
                >
                  Confirmar
                </button>
                <button className="button ghost-dark" onClick={() => setConfirmResetOpen(false)}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button className="button subtle-danger" onClick={() => setConfirmResetOpen(true)}>
              Restablecer datos
            </button>
          )}
        </div>
      </section>
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
    <select value={value} onChange={(event) => onChange(event.target.value)}>
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
          <button onClick={() => onDelete(item.id)} aria-label="Quitar condicionante">x</button>
        </span>
      ))}
    </div>
  )
}

function nameById(controllers: Record<string, Controller>, controllerId: string): string {
  return controllers[controllerId]?.name ?? 'N/D'
}

function formatGeneration(value: number): string {
  return new Date(value).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
