import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { MONTH_LABELS, ROLE_OPTIONS, WEEKDAY_OPTIONS, createSeedData } from './defaults'
import { exportToPdf } from './pdf'
import { SHIFT_CONFIG, SHIFT_ORDER, buildMonthDates, computeStats, generateMonthlySchedule } from './scheduler'
import {
  type Controller,
  type ControllerRole,
  type DateBlockConstraint,
  type ForcedAssignment,
  type Holiday,
  type ShiftCode,
  type TurneroData,
  type VacationConstraint,
  type WeekdayBlockConstraint,
} from './types'

const STORAGE_KEY = 'turnero_eana_v2'
const FIXED_YEAR = 2026

type TabId = 'mes' | 'agenda' | 'estadisticas'

interface ControllerDraft {
  name: string
  role: ControllerRole
  condition: string
  pending: number
}

const EMPTY_CONTROLLER_DRAFT: ControllerDraft = {
  name: '',
  role: 'OPERADOR',
  condition: '',
  pending: 0,
}

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('mes')
  const [data, setData] = useState<TurneroData>(() => readStoredData())
  const [generatedData, setGeneratedData] = useState<TurneroData | null>(null)
  const [hasPendingGeneration, setHasPendingGeneration] = useState(true)
  const [statusMessage, setStatusMessage] = useState('')
  const [selectedAgendaDate, setSelectedAgendaDate] = useState('')

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

  const monthDates = useMemo(() => buildMonthDates(data.year, data.month), [data.year, data.month])
  const defaultDate = monthDates[0] ?? ''

  const schedule = useMemo(
    () => (generatedData ? generateMonthlySchedule(generatedData) : null),
    [generatedData],
  )
  const statsMap = useMemo(() => {
    if (!generatedData || !schedule) {
      return {}
    }
    return computeStats(generatedData, schedule)
  }, [generatedData, schedule])

  const controllerById = useMemo(
    () =>
      data.controllers.reduce<Record<string, Controller>>((acc, controller) => {
        acc[controller.id] = controller
        return acc
      }, {}),
    [data.controllers],
  )

  const dayPlanByDate = useMemo(
    () => {
      if (!schedule) {
        return {}
      }
      return schedule.days.reduce<Record<string, (typeof schedule.days)[number]>>((acc, day) => {
        acc[day.date] = day
        return acc
      }, {})
    },
    [schedule],
  )

  const totalConflicts = useMemo(
    () => {
      if (!schedule) {
        return 0
      }
      return schedule.days.reduce(
        (acc, day) => acc + SHIFT_ORDER.reduce((sum, shift) => sum + day.shifts[shift].conflicts.length, 0),
        0,
      )
    },
    [schedule],
  )

  const statsRows = useMemo(
    () => {
      const sourceControllers = generatedData?.controllers ?? data.controllers
      return sourceControllers.map((controller) => {
        const stats = statsMap[controller.id]
        return {
          nombre: controller.name,
          cargo: roleLabel(controller.role),
          turnosA: stats?.shiftsA ?? 0,
          turnosB: stats?.shiftsB ?? 0,
          turnosC: stats?.shiftsC ?? 0,
          total: stats?.totalShifts ?? 0,
          finDeSemana: stats?.weekendShifts ?? 0,
          vacaciones: stats?.vacationDays ?? 0,
          feriados: stats?.holidayShifts ?? 0,
          pendientes: stats?.pending ?? controller.pending,
        }
      })
    },
    [data.controllers, generatedData, statsMap],
  )

  const agendaDate = monthDates.includes(selectedAgendaDate) ? selectedAgendaDate : defaultDate
  const selectedAgendaPlan = agendaDate ? dayPlanByDate[agendaDate] : undefined

  const calendarCells = useMemo(() => buildCalendarCells(data.year, data.month, monthDates), [data.year, data.month, monthDates])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [data])

  const handleDataUpdate = (updater: (current: TurneroData) => TurneroData): void => {
    setData((current) => {
      const updated = updater(current)
      return {
        ...updated,
        year: FIXED_YEAR,
      }
    })
    setGeneratedData(null)
    setHasPendingGeneration(true)
  }

  const defaultControllerId = data.controllers[0]?.id ?? ''

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

  const saveControllerModal = (): void => {
    if (!editingControllerId) {
      return
    }

    const name = editingControllerForm.name.trim()
    if (!name) {
      setStatusMessage('El nombre del controlador no puede estar vacio.')
      return
    }

    handleDataUpdate((current) => ({
      ...current,
      controllers: current.controllers.map((controller) =>
        controller.id === editingControllerId
          ? {
              ...controller,
              name,
              role: editingControllerForm.role,
              condition: editingControllerForm.condition.trim(),
              pending: Math.max(0, Number(editingControllerForm.pending) || 0),
            }
          : controller,
      ),
    }))

    closeEditControllerModal()
    setStatusMessage('Controlador actualizado.')
  }

  const addController = (): void => {
    const name = controllerForm.name.trim()
    if (!name) {
      setStatusMessage('Ingresa nombre para agregar controlador.')
      return
    }

    const nextController: Controller = {
      id: createId('controller'),
      name,
      role: controllerForm.role,
      condition: controllerForm.condition.trim(),
      pending: Math.max(0, Number(controllerForm.pending) || 0),
    }

    handleDataUpdate((current) => ({
      ...current,
      controllers: [...current.controllers, nextController],
    }))

    setControllerForm(EMPTY_CONTROLLER_DRAFT)
    setStatusMessage('Controlador agregado.')
  }

  const removeController = (controllerId: string): void => {
    handleDataUpdate((current) => ({
      ...current,
      controllers: current.controllers.filter((controller) => controller.id !== controllerId),
      vacations: current.vacations.filter((item) => item.controllerId !== controllerId),
      weekdayBlocks: current.weekdayBlocks.filter((item) => item.controllerId !== controllerId),
      dateBlocks: current.dateBlocks.filter((item) => item.controllerId !== controllerId),
      forcedAssignments: current.forcedAssignments.filter((item) => item.controllerId !== controllerId),
    }))
  }

  const addCoverageOverride = (): void => {
    const date = coverageForm.date || defaultDate
    if (!date) {
      setStatusMessage('Selecciona fecha para la cobertura puntual.')
      return
    }

    handleDataUpdate((current) => ({
      ...current,
      coverageOverrides: [
        ...current.coverageOverrides,
        {
          id: createId('coverage'),
          date,
          shift: coverageForm.shift,
          required: Math.max(1, Number(coverageForm.required) || 1),
          note: coverageForm.note.trim(),
        },
      ],
    }))

    setCoverageForm((current) => ({ ...current, note: '' }))
  }

  const addVacation = (): void => {
    const controllerId = vacationForm.controllerId || defaultControllerId
    const startDate = vacationForm.startDate || defaultDate
    const endDate = vacationForm.endDate || defaultDate

    if (!controllerId || !startDate || !endDate) {
      setStatusMessage('Completa controlador y rango de vacaciones.')
      return
    }

    const nextVacation: VacationConstraint = {
      id: createId('vacation'),
      controllerId,
      startDate,
      endDate,
      note: vacationForm.note.trim(),
    }

    handleDataUpdate((current) => ({
      ...current,
      vacations: [...current.vacations, nextVacation],
    }))

    setVacationForm((current) => ({ ...current, note: '' }))
  }

  const addWeekdayBlock = (): void => {
    const controllerId = weekdayBlockForm.controllerId || defaultControllerId
    if (!controllerId) {
      setStatusMessage('Selecciona controlador para bloqueo semanal.')
      return
    }

    const nextBlock: WeekdayBlockConstraint = {
      id: createId('weekday-block'),
      controllerId,
      weekday: weekdayBlockForm.weekday,
      shift: weekdayBlockForm.shift,
      note: weekdayBlockForm.note.trim(),
    }

    handleDataUpdate((current) => ({
      ...current,
      weekdayBlocks: [...current.weekdayBlocks, nextBlock],
    }))

    setWeekdayBlockForm((current) => ({ ...current, note: '' }))
  }

  const addDateBlock = (): void => {
    const controllerId = dateBlockForm.controllerId || defaultControllerId
    const date = dateBlockForm.date || defaultDate

    if (!controllerId || !date) {
      setStatusMessage('Selecciona controlador y fecha para bloqueo puntual.')
      return
    }

    const nextBlock: DateBlockConstraint = {
      id: createId('date-block'),
      controllerId,
      date,
      shift: dateBlockForm.shift,
      note: dateBlockForm.note.trim(),
    }

    handleDataUpdate((current) => ({
      ...current,
      dateBlocks: [...current.dateBlocks, nextBlock],
    }))

    setDateBlockForm((current) => ({ ...current, note: '' }))
  }

  const addForcedAssignment = (): void => {
    const controllerId = forcedForm.controllerId || defaultControllerId
    const date = forcedForm.date || defaultDate

    if (!controllerId || !date) {
      setStatusMessage('Selecciona controlador y fecha para asignacion forzada.')
      return
    }

    const nextAssignment: ForcedAssignment = {
      id: createId('forced'),
      controllerId,
      date,
      shift: forcedForm.shift,
      note: forcedForm.note.trim(),
    }

    handleDataUpdate((current) => ({
      ...current,
      forcedAssignments: [...current.forcedAssignments, nextAssignment],
    }))

    setForcedForm((current) => ({ ...current, note: '' }))
  }

  const addHoliday = (): void => {
    const date = holidayForm.date || defaultDate
    if (!date) {
      setStatusMessage('Selecciona fecha de feriado.')
      return
    }

    const nextHoliday: Holiday = {
      id: createId('holiday'),
      date,
      name: holidayForm.name.trim() || 'Feriado',
    }

    handleDataUpdate((current) => ({
      ...current,
      holidays: [...current.holidays, nextHoliday],
    }))

    setHolidayForm((current) => ({ ...current, name: '' }))
  }

  const updateMonth = (month: number): void => {
    const safeMonth = Math.max(1, Math.min(12, month))

    handleDataUpdate((current) => ({
      ...current,
      year: FIXED_YEAR,
      month: safeMonth,
    }))

    setSelectedAgendaDate('')
  }

  const resetAll = (): void => {
    const today = new Date()
    setData(createSeedData(FIXED_YEAR, today.getMonth() + 1))
    setGeneratedData(null)
    setHasPendingGeneration(true)
    setSelectedAgendaDate('')
    setStatusMessage('Se restablecio la planificacion con la dotacion base del Excel.')
  }

  const generateMonthList = (): void => {
    if (!data.controllers.length) {
      setStatusMessage('No hay controladores para generar la lista.')
      return
    }

    const nextGeneratedData = cloneData({
      ...data,
      year: FIXED_YEAR,
    })

    setGeneratedData(nextGeneratedData)
    setHasPendingGeneration(false)
    setSelectedAgendaDate('')
    setStatusMessage(`Lista generada para ${MONTH_LABELS[data.month - 1]} ${FIXED_YEAR}.`)
  }

  const onExportPdf = (): void => {
    if (!generatedData || !schedule) {
      setStatusMessage('Primero debes generar la lista del mes para exportar PDF.')
      return
    }

    exportToPdf(generatedData, schedule, statsRows)
    setStatusMessage('Archivo PDF exportado.')
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="brand">EANA | Torre de Control</p>
          <h1>Turnero mensual</h1>
          <p className="subtitle">
            UTC fijo -3. A {SHIFT_CONFIG.A.local} local ({SHIFT_CONFIG.A.utc} UTC) | B {SHIFT_CONFIG.B.local} local ({SHIFT_CONFIG.B.utc} UTC) | C {SHIFT_CONFIG.C.local} local ({SHIFT_CONFIG.C.utc} UTC)
          </p>
        </div>

        <div className="hero-actions">
          <button className="button" onClick={generateMonthList}>
            Generar lista del mes
          </button>
          <button className="button" onClick={onExportPdf} disabled={!schedule}>
            Exportar PDF
          </button>
          <button className="button danger" onClick={resetAll}>
            Restablecer base
          </button>
        </div>
      </header>

      <section className="top-grid">
        <article className="panel">
          <h2>Mes operativo</h2>
          <div className="row-inline">
            <label>
              Mes
              <select value={data.month} onChange={(event) => updateMonth(Number(event.target.value))}>
                {MONTH_LABELS.map((monthLabel, index) => (
                  <option key={monthLabel} value={index + 1}>
                    {monthLabel}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Año
              <input type="number" value={FIXED_YEAR} disabled />
            </label>
          </div>

          <label>
            Condicionantes generales del mes
            <textarea
              rows={3}
              value={data.monthlyNotes}
              onChange={(event) =>
                handleDataUpdate((current) => ({
                  ...current,
                  monthlyNotes: event.target.value,
                }))
              }
            />
          </label>

          <div className="summary-cards">
            <div>
              <strong>{data.controllers.length}</strong>
              <span>controladores</span>
            </div>
            <div>
              <strong>{monthDates.length}</strong>
              <span>dias</span>
            </div>
            <div>
              <strong>{schedule ? totalConflicts : '--'}</strong>
              <span>{schedule ? 'alertas de cobertura' : 'lista no generada'}</span>
            </div>
          </div>
        </article>

        <article className="panel">
          <h2>Reglas generales</h2>
          <ul className="rules-list">
            <li>A y B requieren supervisor.</li>
            <li>Cobertura base: A=3, B=3, C=2.</li>
            <li>Si hay practicante en turno, debe haber instructor.</li>
            <li>Quien hace C no toma A al dia siguiente.</li>
            <li>Jefa/jefe de dependencia no realiza turno C.</li>
            <li>Asignacion equilibrada por carga total y por tipo de turno.</li>
          </ul>
          <h3 className="section-subtitle">Reglas del mes</h3>
          <ul className="rules-list">
            <li>Condicionantes cargados: {data.coverageOverrides.length + data.vacations.length + data.weekdayBlocks.length + data.dateBlocks.length + data.forcedAssignments.length}</li>
            <li>Feriados del mes: {data.holidays.length}</li>
            <li>Estado: {schedule ? 'lista generada' : 'pendiente de generar'}</li>
            <li>{data.monthlyNotes.trim() ? data.monthlyNotes.trim() : 'Sin notas mensuales cargadas.'}</li>
          </ul>
          {hasPendingGeneration ? (
            <p className="status-msg warn">Hay cambios nuevos. Presiona \"Generar lista del mes\" para aplicar condicionantes.</p>
          ) : null}
          {statusMessage ? <p className="status-msg">{statusMessage}</p> : null}
        </article>
      </section>

      <nav className="tabs">
        <button className={activeTab === 'mes' ? 'tab active' : 'tab'} onClick={() => setActiveTab('mes')}>
          Mes
        </button>
        <button className={activeTab === 'agenda' ? 'tab active' : 'tab'} onClick={() => setActiveTab('agenda')}>
          Agenda
        </button>
        <button className={activeTab === 'estadisticas' ? 'tab active' : 'tab'} onClick={() => setActiveTab('estadisticas')}>
          Estadisticas
        </button>
      </nav>

      {activeTab === 'mes' ? (
        <main className="content-grid">
          <article className="panel">
            <h2>Controladores</h2>
            <div className="row-inline responsive">
              <input
                placeholder="Nombre"
                value={controllerForm.name}
                onChange={(event) => setControllerForm((current) => ({ ...current, name: event.target.value }))}
              />

              <select
                value={controllerForm.role}
                onChange={(event) =>
                  setControllerForm((current) => ({
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

              <input
                placeholder="Condicionante"
                value={controllerForm.condition}
                onChange={(event) => setControllerForm((current) => ({ ...current, condition: event.target.value }))}
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
              />

              <button className="button" onClick={addController}>
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
                  {data.controllers.map((controller) => (
                    <tr key={controller.id}>
                      <td>
                        <button className="name-link" onClick={() => openEditControllerModal(controller)}>
                          {controller.name}
                        </button>
                      </td>
                      <td>{roleLabel(controller.role)}</td>
                      <td>{controller.condition || '-'}</td>
                      <td>{controller.pending}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mobile-only stack-list">
              {data.controllers.map((controller) => (
                <article key={`mobile-${controller.id}`} className="stack-card">
                  <div className="stack-head">
                    <button className="name-link" onClick={() => openEditControllerModal(controller)}>
                      {controller.name}
                    </button>
                  </div>
                  <div className="stack-grid">
                    <p>
                      <strong>Cargo:</strong> {roleLabel(controller.role)}
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
          </article>

          <article className="panel">
            <h2>Condicionantes</h2>

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
                <button className="button small" onClick={addCoverageOverride}>
                  Agregar
                </button>
              </div>

              <ConstraintList
                items={data.coverageOverrides.map((item) => ({
                  id: item.id,
                  text: `${item.date} | ${item.shift} = ${item.required} ${item.note ? `(${item.note})` : ''}`,
                }))}
                onDelete={(id) =>
                  handleDataUpdate((current) => ({
                    ...current,
                    coverageOverrides: current.coverageOverrides.filter((entry) => entry.id !== id),
                  }))
                }
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
                <button className="button small" onClick={addVacation}>
                  Agregar
                </button>
              </div>
              <ConstraintList
                items={data.vacations.map((item) => ({
                  id: item.id,
                  text: `${nameById(controllerById, item.controllerId)} | ${item.startDate} a ${item.endDate}`,
                }))}
                onDelete={(id) =>
                  handleDataUpdate((current) => ({
                    ...current,
                    vacations: current.vacations.filter((item) => item.id !== id),
                  }))
                }
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
                <button className="button small" onClick={addWeekdayBlock}>
                  Agregar
                </button>
              </div>
              <ConstraintList
                items={data.weekdayBlocks.map((item) => ({
                  id: item.id,
                  text: `${nameById(controllerById, item.controllerId)} | ${WEEKDAY_OPTIONS.find((day) => day.value === item.weekday)?.label} | ${item.shift}`,
                }))}
                onDelete={(id) =>
                  handleDataUpdate((current) => ({
                    ...current,
                    weekdayBlocks: current.weekdayBlocks.filter((item) => item.id !== id),
                  }))
                }
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
                <button className="button small" onClick={addDateBlock}>
                  Agregar
                </button>
              </div>
              <ConstraintList
                items={data.dateBlocks.map((item) => ({
                  id: item.id,
                  text: `${nameById(controllerById, item.controllerId)} | ${item.date} | ${item.shift}`,
                }))}
                onDelete={(id) =>
                  handleDataUpdate((current) => ({
                    ...current,
                    dateBlocks: current.dateBlocks.filter((item) => item.id !== id),
                  }))
                }
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
                <button className="button small" onClick={addForcedAssignment}>
                  Agregar
                </button>
              </div>
              <ConstraintList
                items={data.forcedAssignments.map((item) => ({
                  id: item.id,
                  text: `${nameById(controllerById, item.controllerId)} | ${item.date} | ${item.shift}`,
                }))}
                onDelete={(id) =>
                  handleDataUpdate((current) => ({
                    ...current,
                    forcedAssignments: current.forcedAssignments.filter((item) => item.id !== id),
                  }))
                }
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
                <button className="button small" onClick={addHoliday}>
                  Agregar
                </button>
              </div>
              <ConstraintList
                items={data.holidays.map((item) => ({
                  id: item.id,
                  text: `${item.date} | ${item.name}`,
                }))}
                onDelete={(id) =>
                  handleDataUpdate((current) => ({
                    ...current,
                    holidays: current.holidays.filter((item) => item.id !== id),
                  }))
                }
              />
            </details>
          </article>

          <article className="panel schedule-panel">
            <h2>
              Planilla mensual ({MONTH_LABELS[data.month - 1]} {data.year})
            </h2>

            {data.monthlyNotes ? <p className="monthly-note">Notas: {data.monthlyNotes}</p> : null}

            {schedule ? (
              <>
                <div className="table-wrapper desktop-only">
                  <table className="schedule-table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Turno A</th>
                        <th>Turno B</th>
                        <th>Turno C</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schedule.days.map((day) => (
                        <tr key={day.date}>
                          <td>
                            <strong>{formatDate(day.date)}</strong>
                            <div className="dim">{day.dayLabel}</div>
                          </td>

                          {SHIFT_ORDER.map((shift) => {
                            const plan = day.shifts[shift]
                            return (
                              <td key={`${day.date}-${shift}`}>
                                <div className="shift-meta">
                                  <span>
                                    {plan.assignedControllerIds.length}/{plan.required}
                                  </span>
                                  <small>
                                    {SHIFT_CONFIG[shift].local} | {SHIFT_CONFIG[shift].utc} UTC
                                  </small>
                                </div>

                                <ul className="assignment-list">
                                  {plan.assignedControllerIds.map((controllerId) => (
                                    <li key={controllerId}>{nameById(controllerById, controllerId)}</li>
                                  ))}
                                </ul>

                                {plan.conflicts.length ? (
                                  <ul className="conflict-list">
                                    {plan.conflicts.map((conflict, index) => (
                                      <li key={`${shift}-${index}`}>{conflict}</li>
                                    ))}
                                  </ul>
                                ) : null}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mobile-only stack-list">
                  {schedule.days.map((day) => (
                    <article key={`mobile-day-${day.date}`} className="stack-card">
                      <h3>
                        {formatDate(day.date)} <span className="dim">({day.dayLabel})</span>
                      </h3>
                      {SHIFT_ORDER.map((shift) => {
                        const plan = day.shifts[shift]
                        return (
                          <section key={`mobile-${day.date}-${shift}`} className="stack-shift">
                            <p>
                              <strong>Turno {shift}:</strong> {plan.assignedControllerIds.length}/{plan.required}
                            </p>
                            <p className="dim">
                              {SHIFT_CONFIG[shift].local} local | {SHIFT_CONFIG[shift].utc} UTC
                            </p>
                            <ul className="assignment-list">
                              {plan.assignedControllerIds.map((controllerId) => (
                                <li key={`${day.date}-${shift}-${controllerId}`}>
                                  {nameById(controllerById, controllerId)}
                                </li>
                              ))}
                            </ul>
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
              </>
            ) : (
              <div className="empty-state">
                <p>Aun no hay lista generada para este mes.</p>
                <button className="button" onClick={generateMonthList}>
                  Generar lista del mes
                </button>
              </div>
            )}
          </article>
        </main>
      ) : null}

      {activeTab === 'agenda' ? (
        <main className="content-grid">
          <article className="panel">
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
                      return (
                        <button
                          key={date}
                          className={isSelected ? 'calendar-cell selected' : 'calendar-cell'}
                          onClick={() => setSelectedAgendaDate(date)}
                        >
                          <div className="calendar-day">{Number(date.slice(-2))}</div>
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
                <button className="button" onClick={generateMonthList}>
                  Generar lista del mes
                </button>
              </div>
            )}
          </article>
        </main>
      ) : null}

      {activeTab === 'estadisticas' ? (
        <main className="content-grid">
          <article className="panel">
            <h2>Estadisticas por controlador</h2>
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
                      {statsRows.map((row) => (
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
                  {statsRows.map((row) => (
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
              </>
            ) : (
              <div className="empty-state">
                <p>Genera la lista mensual para calcular las estadisticas.</p>
                <button className="button" onClick={generateMonthList}>
                  Generar lista del mes
                </button>
              </div>
            )}
          </article>

          <article className="panel">
            <h2>Resumen del mes</h2>
            <ul className="rules-list">
              <li>Controladores cargados: {data.controllers.length}</li>
              <li>Condicionantes de cobertura: {data.coverageOverrides.length}</li>
              <li>Vacaciones/licencias: {data.vacations.length}</li>
              <li>Bloqueos semanales: {data.weekdayBlocks.length}</li>
              <li>Bloqueos puntuales: {data.dateBlocks.length}</li>
              <li>Asignaciones forzadas: {data.forcedAssignments.length}</li>
              <li>Feriados: {data.holidays.length}</li>
            </ul>
          </article>
        </main>
      ) : null}

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
                className="button danger"
                onClick={() => {
                  if (!editingControllerId) {
                    return
                  }
                  removeController(editingControllerId)
                  closeEditControllerModal()
                  setStatusMessage('Controlador eliminado.')
                }}
              >
                Quitar controlador
              </button>
              <button className="button" onClick={saveControllerModal}>
                Guardar cambios
              </button>
              <button className="button ghost-dark" onClick={closeEditControllerModal}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
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
          <button onClick={() => onDelete(item.id)}>x</button>
        </span>
      ))}
    </div>
  )
}

function readStoredData(): TurneroData {
  const today = new Date()
  const fallback = createSeedData(FIXED_YEAR, today.getMonth() + 1)

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return fallback
    }

    const parsed = JSON.parse(raw) as Partial<TurneroData>
    if (!parsed.year || !parsed.month) {
      return fallback
    }

    const controllers = Array.isArray(parsed.controllers)
      ? (parsed.controllers as Array<Partial<Controller>>).map((item) => ({
          id: String(item.id ?? createId('controller')),
          name: String(item.name ?? ''),
          role: isControllerRole(item.role) ? item.role : 'OPERADOR',
          condition: String(item.condition ?? ''),
          pending: Math.max(0, Number(item.pending) || 0),
        }))
      : fallback.controllers

    return {
      year: FIXED_YEAR,
      month: clampMonth(parsed.month),
      controllers,
      coverageOverrides: parsed.coverageOverrides ?? [],
      vacations: parsed.vacations ?? [],
      weekdayBlocks: parsed.weekdayBlocks ?? [],
      dateBlocks: parsed.dateBlocks ?? [],
      forcedAssignments: parsed.forcedAssignments ?? [],
      holidays: parsed.holidays ?? [],
      monthlyNotes: parsed.monthlyNotes ?? '',
    }
  } catch {
    return fallback
  }
}

function clampMonth(value: unknown): number {
  const numeric = Number(value)
  if (!Number.isInteger(numeric)) {
    return 1
  }
  return Math.max(1, Math.min(12, numeric))
}

function cloneData<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value)
  }
  return JSON.parse(JSON.stringify(value)) as T
}

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`
}

function roleLabel(role: ControllerRole): string {
  return ROLE_OPTIONS.find((item) => item.value === role)?.label ?? role
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

function buildCalendarCells(year: number, month: number, dates: string[]): string[] {
  const firstWeekday = new Date(year, month - 1, 1).getDay()
  const cells = Array.from({ length: firstWeekday }, () => '')
  cells.push(...dates)

  while (cells.length % 7 !== 0) {
    cells.push('')
  }

  return cells
}

function isControllerRole(role: unknown): role is ControllerRole {
  return role === 'JEFE_DEPENDENCIA' || role === 'SUPERVISOR' || role === 'INSTRUCTOR' || role === 'OPERADOR' || role === 'PRACTICANTE' || role === 'ADSCRIPTO'
}

export default App
