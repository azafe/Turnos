import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { ROLE_OPTIONS, createSeedData } from './defaults'
import { exportToPdf } from './pdf'
import { buildMonthDates, computeStats, generateMonthlySchedule } from './scheduler'
import type {
  Controller,
  ControllerRole,
  DateBlockConstraint,
  ForcedAssignment,
  Holiday,
  ShiftCode,
  TurneroData,
  VacationConstraint,
  WeekdayBlockConstraint,
} from './types'
import HeaderOps, { type Page } from './components/HeaderOps'
import SetupHome from './components/pages/SetupHome'
import ControllersPage from './components/pages/ControllersPage'
import AgendaTab from './components/tabs/AgendaTab'
import StatsTab from './components/tabs/StatsTab'

const STORAGE_KEY = 'turnero_eana_v2'
const FIXED_YEAR = 2026
const CONTROLLERS_PAGE_SIZE = 8
const STATS_PAGE_SIZE = 10

interface PersistedState {
  data: TurneroData
  lastGeneratedAt: number | null
}

interface ControllerDraft {
  name: string
  role: ControllerRole
  condition: string
  pending: number
  allowedShifts: ShiftCode[]
  disallowedShifts: ShiftCode[]
  preferredShifts: ShiftCode[]
  isAdscripto: boolean
}

function App() {
  const [storedState] = useState<PersistedState>(() => readStoredState())
  const [activePage, setActivePage] = useState<Page>('inicio')
  const [data, setData] = useState<TurneroData>(storedState.data)
  const [lastGeneratedAt, setLastGeneratedAt] = useState<number | null>(storedState.lastGeneratedAt)
  const [generatedData, setGeneratedData] = useState<TurneroData | null>(null)
  const [hasPendingGeneration, setHasPendingGeneration] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [selectedAgendaDate, setSelectedAgendaDate] = useState('')
  const [controllerQuery, setControllerQuery] = useState('')
  const [controllersPage, setControllersPage] = useState(1)
  const [statsPage, setStatsPage] = useState(1)

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

  const dayPlanByDate = useMemo(() => {
    if (!schedule) {
      return {}
    }
    return schedule.days.reduce<Record<string, (typeof schedule.days)[number]>>((acc, day) => {
      acc[day.date] = day
      return acc
    }, {})
  }, [schedule])

  const statsRows = useMemo(() => {
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
  }, [data.controllers, generatedData, statsMap])

  const normalizedControllerQuery = controllerQuery.trim().toLowerCase()

  const filteredControllers = useMemo(() => {
    if (!normalizedControllerQuery) {
      return data.controllers
    }
    return data.controllers.filter((controller) =>
      controller.name.toLowerCase().includes(normalizedControllerQuery),
    )
  }, [data.controllers, normalizedControllerQuery])

  const filteredStatsRows = useMemo(() => {
    if (!normalizedControllerQuery) {
      return statsRows
    }
    return statsRows.filter((row) => String(row.nombre).toLowerCase().includes(normalizedControllerQuery))
  }, [normalizedControllerQuery, statsRows])

  const controllerPagination = useMemo(
    () => paginate(filteredControllers, controllersPage, CONTROLLERS_PAGE_SIZE),
    [filteredControllers, controllersPage],
  )

  const statsPagination = useMemo(
    () => paginate(filteredStatsRows, statsPage, STATS_PAGE_SIZE),
    [filteredStatsRows, statsPage],
  )

  const agendaDate = monthDates.includes(selectedAgendaDate) ? selectedAgendaDate : defaultDate
  const selectedAgendaPlan = schedule && agendaDate ? dayPlanByDate[agendaDate] ?? schedule.days[0] : undefined

  const calendarCells = useMemo(() => buildCalendarCells(data.year, data.month, monthDates), [data.year, data.month, monthDates])

  const monthCoverageOverrides = useMemo(
    () => data.coverageOverrides.filter((item) => isDateInActiveMonth(item.date, data.month, data.year)),
    [data.coverageOverrides, data.month, data.year],
  )

  const monthVacations = useMemo(
    () =>
      data.vacations.filter((item) =>
        doesRangeOverlapActiveMonth(item.startDate, item.endDate, data.month, data.year),
      ),
    [data.vacations, data.month, data.year],
  )

  const monthWeekdayBlocks = useMemo(
    () =>
      data.weekdayBlocks.filter((item) =>
        matchesMonthRule(item.month, item.year, data.month, data.year),
      ),
    [data.weekdayBlocks, data.month, data.year],
  )

  const monthDateBlocks = useMemo(
    () => data.dateBlocks.filter((item) => isDateInActiveMonth(item.date, data.month, data.year)),
    [data.dateBlocks, data.month, data.year],
  )

  const monthForcedAssignments = useMemo(
    () => data.forcedAssignments.filter((item) => isDateInActiveMonth(item.date, data.month, data.year)),
    [data.forcedAssignments, data.month, data.year],
  )

  const monthHolidays = useMemo(
    () => data.holidays.filter((item) => isDateInActiveMonth(item.date, data.month, data.year)),
    [data.holidays, data.month, data.year],
  )

  const monthConstraintsCount =
    monthCoverageOverrides.length +
    monthVacations.length +
    monthWeekdayBlocks.length +
    monthDateBlocks.length +
    monthForcedAssignments.length +
    monthHolidays.length

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        data,
        lastGeneratedAt,
      }),
    )
  }, [data, lastGeneratedAt])

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

  const onControllerQueryChange = (value: string): void => {
    setControllerQuery(value)
    setControllersPage(1)
    setStatsPage(1)
  }

  const addController = (draft: ControllerDraft): void => {
    const name = draft.name.trim()
    if (!name) {
      setStatusMessage('Ingresa nombre para agregar controlador.')
      return
    }

    const metadata = normalizeControllerMetadata({
      role: draft.role,
      allowedShifts: draft.allowedShifts,
      disallowedShifts: draft.disallowedShifts,
      preferredShifts: draft.preferredShifts,
      isAdscripto: draft.isAdscripto,
    })

    const nextController: Controller = {
      id: createId('controller'),
      name,
      role: draft.role,
      condition: draft.condition.trim(),
      pending: Math.max(0, Number(draft.pending) || 0),
      ...metadata,
    }

    handleDataUpdate((current) => ({
      ...current,
      controllers: [...current.controllers, nextController],
    }))

    setStatusMessage('Controlador agregado.')
  }

  const updateController = (
    controllerId: string,
    draft: ControllerDraft,
  ): void => {
    const name = draft.name.trim()
    if (!name) {
      setStatusMessage('El nombre del controlador no puede estar vacio.')
      return
    }

    const metadata = normalizeControllerMetadata({
      role: draft.role,
      allowedShifts: draft.allowedShifts,
      disallowedShifts: draft.disallowedShifts,
      preferredShifts: draft.preferredShifts,
      isAdscripto: draft.isAdscripto,
    })

    handleDataUpdate((current) => ({
      ...current,
      controllers: current.controllers.map((controller) =>
        controller.id === controllerId
          ? {
              ...controller,
              name,
              role: draft.role,
              condition: draft.condition.trim(),
              pending: Math.max(0, Number(draft.pending) || 0),
              ...metadata,
            }
          : controller,
      ),
    }))

    setStatusMessage('Controlador actualizado.')
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

    setStatusMessage('Controlador eliminado.')
  }

  const addCoverageOverride = (payload: {
    date: string
    shift: ShiftCode
    required: number
    note: string
  }): void => {
    const date = payload.date || defaultDate
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
          shift: payload.shift,
          required: Math.max(1, Number(payload.required) || 1),
          note: payload.note.trim(),
        },
      ],
    }))
  }

  const addVacation = (payload: {
    controllerId: string
    startDate: string
    endDate: string
    note: string
  }): void => {
    const controllerId = payload.controllerId || defaultControllerId
    const startDate = payload.startDate || defaultDate
    const endDate = payload.endDate || defaultDate

    if (!controllerId || !startDate || !endDate) {
      setStatusMessage('Completa controlador y rango de vacaciones.')
      return
    }

    const nextVacation: VacationConstraint = {
      id: createId('vacation'),
      controllerId,
      startDate,
      endDate,
      note: payload.note.trim(),
    }

    handleDataUpdate((current) => ({
      ...current,
      vacations: [...current.vacations, nextVacation],
    }))
  }

  const addWeekdayBlock = (payload: {
    controllerId: string
    weekday: number
    shift: ShiftCode
    note: string
  }): void => {
    const controllerId = payload.controllerId || defaultControllerId
    if (!controllerId) {
      setStatusMessage('Selecciona controlador para bloqueo semanal.')
      return
    }

    const nextBlock: WeekdayBlockConstraint = {
      id: createId('weekday-block'),
      controllerId,
      weekday: payload.weekday,
      shift: payload.shift,
      note: payload.note.trim(),
      month: data.month,
      year: FIXED_YEAR,
    }

    handleDataUpdate((current) => ({
      ...current,
      weekdayBlocks: [...current.weekdayBlocks, nextBlock],
    }))
  }

  const addDateBlock = (payload: {
    controllerId: string
    date: string
    shift: ShiftCode
    note: string
  }): void => {
    const controllerId = payload.controllerId || defaultControllerId
    const date = payload.date || defaultDate

    if (!controllerId || !date) {
      setStatusMessage('Selecciona controlador y fecha para bloqueo puntual.')
      return
    }

    const nextBlock: DateBlockConstraint = {
      id: createId('date-block'),
      controllerId,
      date,
      shift: payload.shift,
      note: payload.note.trim(),
    }

    handleDataUpdate((current) => ({
      ...current,
      dateBlocks: [...current.dateBlocks, nextBlock],
    }))
  }

  const addForcedAssignment = (payload: {
    controllerId: string
    date: string
    shift: ShiftCode
    note: string
  }): void => {
    const controllerId = payload.controllerId || defaultControllerId
    const date = payload.date || defaultDate

    if (!controllerId || !date) {
      setStatusMessage('Selecciona controlador y fecha para asignacion forzada.')
      return
    }

    const nextAssignment: ForcedAssignment = {
      id: createId('forced'),
      controllerId,
      date,
      shift: payload.shift,
      note: payload.note.trim(),
    }

    handleDataUpdate((current) => ({
      ...current,
      forcedAssignments: [...current.forcedAssignments, nextAssignment],
    }))
  }

  const addHoliday = (payload: { date: string; name: string }): void => {
    const date = payload.date || defaultDate
    if (!date) {
      setStatusMessage('Selecciona fecha de feriado.')
      return
    }

    const nextHoliday: Holiday = {
      id: createId('holiday'),
      date,
      name: payload.name.trim() || 'Feriado',
    }

    handleDataUpdate((current) => ({
      ...current,
      holidays: [...current.holidays, nextHoliday],
    }))
  }

  const deleteCoverageOverride = (id: string): void => {
    handleDataUpdate((current) => ({
      ...current,
      coverageOverrides: current.coverageOverrides.filter((entry) => entry.id !== id),
    }))
  }

  const deleteVacation = (id: string): void => {
    handleDataUpdate((current) => ({
      ...current,
      vacations: current.vacations.filter((item) => item.id !== id),
    }))
  }

  const deleteWeekdayBlock = (id: string): void => {
    handleDataUpdate((current) => ({
      ...current,
      weekdayBlocks: current.weekdayBlocks.filter((item) => item.id !== id),
    }))
  }

  const deleteDateBlock = (id: string): void => {
    handleDataUpdate((current) => ({
      ...current,
      dateBlocks: current.dateBlocks.filter((item) => item.id !== id),
    }))
  }

  const deleteForcedAssignment = (id: string): void => {
    handleDataUpdate((current) => ({
      ...current,
      forcedAssignments: current.forcedAssignments.filter((item) => item.id !== id),
    }))
  }

  const deleteHoliday = (id: string): void => {
    handleDataUpdate((current) => ({
      ...current,
      holidays: current.holidays.filter((item) => item.id !== id),
    }))
  }

  const updateMonth = (month: number): void => {
    const safeMonth = Math.max(1, Math.min(12, month))

    handleDataUpdate((current) => ({
      ...current,
      year: FIXED_YEAR,
      month: safeMonth,
    }))

    setSelectedAgendaDate('')
    setStatsPage(1)
  }

  const resetAll = (): void => {
    const today = new Date()
    setData(createSeedData(FIXED_YEAR, today.getMonth() + 1))
    setGeneratedData(null)
    setHasPendingGeneration(true)
    setLastGeneratedAt(null)
    setSelectedAgendaDate('')
    setControllerQuery('')
    setControllersPage(1)
    setStatsPage(1)
    setStatusMessage('Se restablecio la planificacion con la dotacion base del Excel.')
  }

  const generateMonthList = async (): Promise<void> => {
    if (isGenerating) {
      return
    }

    if (!data.controllers.length) {
      setStatusMessage('No hay controladores para generar la lista.')
      return
    }

    setIsGenerating(true)

    try {
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve())
      })

      const nextGeneratedData = cloneData({
        ...data,
        year: FIXED_YEAR,
        coverageOverrides: monthCoverageOverrides,
        vacations: monthVacations,
        weekdayBlocks: monthWeekdayBlocks,
        dateBlocks: monthDateBlocks,
        forcedAssignments: monthForcedAssignments,
        holidays: monthHolidays,
      })

      setGeneratedData(nextGeneratedData)
      setHasPendingGeneration(false)
      setSelectedAgendaDate('')
      setStatsPage(1)
      setLastGeneratedAt(Date.now())
      setStatusMessage(`Lista generada para ${monthLabel(data.month)} ${FIXED_YEAR}.`)
    } catch {
      setStatusMessage('No se pudo generar la lista.')
    } finally {
      setIsGenerating(false)
    }
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
      <HeaderOps
        activePage={activePage}
        hasPendingGeneration={hasPendingGeneration}
        hasSchedule={Boolean(schedule)}
        onNavigate={setActivePage}
      />

      {activePage === 'inicio' ? (
        <SetupHome
          data={data}
          fixedYear={FIXED_YEAR}
          defaultDate={defaultDate}
          defaultControllerId={defaultControllerId}
          controllerById={controllerById}
          monthCoverageOverrides={monthCoverageOverrides}
          monthVacations={monthVacations}
          monthWeekdayBlocks={monthWeekdayBlocks}
          monthDateBlocks={monthDateBlocks}
          monthForcedAssignments={monthForcedAssignments}
          monthHolidays={monthHolidays}
          monthConstraintsCount={monthConstraintsCount}
          hasPendingGeneration={hasPendingGeneration}
          hasSchedule={Boolean(schedule)}
          lastGeneratedAt={lastGeneratedAt}
          statusMessage={statusMessage}
          isGenerating={isGenerating}
          onUpdateMonth={updateMonth}
          onUpdateMonthlyNotes={(notes) =>
            handleDataUpdate((current) => ({
              ...current,
              monthlyNotes: notes,
            }))
          }
          onGenerate={() => {
            void generateMonthList()
          }}
          onGoAgenda={() => setActivePage('agenda')}
          onGoStats={() => setActivePage('stats')}
          onExportPdf={onExportPdf}
          onReset={resetAll}
          onAddCoverageOverride={addCoverageOverride}
          onDeleteCoverageOverride={deleteCoverageOverride}
          onAddVacation={addVacation}
          onDeleteVacation={deleteVacation}
          onAddWeekdayBlock={addWeekdayBlock}
          onDeleteWeekdayBlock={deleteWeekdayBlock}
          onAddDateBlock={addDateBlock}
          onDeleteDateBlock={deleteDateBlock}
          onAddForcedAssignment={addForcedAssignment}
          onDeleteForcedAssignment={deleteForcedAssignment}
          onAddHoliday={addHoliday}
          onDeleteHoliday={deleteHoliday}
        />
      ) : null}

      {activePage === 'controladores' ? (
        <ControllersPage
          controllerQuery={controllerQuery}
          onControllerQueryChange={onControllerQueryChange}
          controllerPagination={controllerPagination}
          onControllerPageChange={setControllersPage}
          onAddController={addController}
          onUpdateController={updateController}
          onRemoveController={removeController}
        />
      ) : null}

      {activePage === 'agenda' ? (
        schedule && selectedAgendaPlan ? (
          <AgendaTab
            agendaDate={agendaDate}
            selectedAgendaPlan={selectedAgendaPlan}
            calendarCells={calendarCells}
            dayPlanByDate={dayPlanByDate}
            controllerById={controllerById}
            onSelectAgendaDate={setSelectedAgendaDate}
          />
        ) : (
          <BlockedPage onGoHome={() => setActivePage('inicio')} />
        )
      ) : null}

      {activePage === 'stats' ? (
        schedule ? (
          <StatsTab
            controllerQuery={controllerQuery}
            onControllerQueryChange={onControllerQueryChange}
            statsPagination={statsPagination}
            filteredStatsCount={filteredStatsRows.length}
            onStatsPageChange={setStatsPage}
            summary={{
              controllers: data.controllers.length,
              coverageOverrides: monthCoverageOverrides.length,
              vacations: monthVacations.length,
              weekdayBlocks: monthWeekdayBlocks.length,
              dateBlocks: monthDateBlocks.length,
              forcedAssignments: monthForcedAssignments.length,
              holidays: monthHolidays.length,
            }}
          />
        ) : (
          <BlockedPage onGoHome={() => setActivePage('inicio')} />
        )
      ) : null}
    </div>
  )
}

function readStoredState(): PersistedState {
  const today = new Date()
  const fallbackData = createSeedData(FIXED_YEAR, today.getMonth() + 1)

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return {
        data: fallbackData,
        lastGeneratedAt: null,
      }
    }

    const parsed = JSON.parse(raw) as unknown

    if (isWrappedPersistedState(parsed)) {
      return {
        data: normalizeData(parsed.data, fallbackData),
        lastGeneratedAt: typeof parsed.lastGeneratedAt === 'number' ? parsed.lastGeneratedAt : null,
      }
    }

    return {
      data: normalizeData(parsed as Partial<TurneroData>, fallbackData),
      lastGeneratedAt: null,
    }
  } catch {
    return {
      data: fallbackData,
      lastGeneratedAt: null,
    }
  }
}

function normalizeData(parsed: Partial<TurneroData>, fallback: TurneroData): TurneroData {
  if (!parsed || typeof parsed !== 'object') {
    return fallback
  }

  const controllers = Array.isArray(parsed.controllers)
    ? (parsed.controllers as Array<Partial<Controller>>).map((item) => {
        const role = isControllerRole(item.role) ? item.role : 'OPERADOR'
        const metadata = normalizeControllerMetadata({
          role,
          allowedShifts: item.allowedShifts,
          disallowedShifts: item.disallowedShifts,
          preferredShifts: item.preferredShifts,
          isAdscripto: item.isAdscripto,
        })

        return {
          id: String(item.id ?? createId('controller')),
          name: String(item.name ?? ''),
          role,
          condition: String(item.condition ?? ''),
          pending: Math.max(0, Number(item.pending) || 0),
          ...metadata,
        }
      })
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
}

function isWrappedPersistedState(value: unknown): value is {
  data: Partial<TurneroData>
  lastGeneratedAt?: number | null
} {
  return Boolean(value && typeof value === 'object' && 'data' in value)
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

function paginate<T>(items: T[], page: number, pageSize: number): {
  items: T[]
  currentPage: number
  totalPages: number
  totalItems: number
  startItem: number
  endItem: number
} {
  const totalItems = items.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage = Math.max(1, Math.min(page, totalPages))
  const start = (safePage - 1) * pageSize
  const end = start + pageSize
  const pageItems = items.slice(start, end)
  const startItem = totalItems === 0 ? 0 : start + 1
  const endItem = totalItems === 0 ? 0 : Math.min(end, totalItems)

  return {
    items: pageItems,
    currentPage: safePage,
    totalPages,
    totalItems,
    startItem,
    endItem,
  }
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

function monthLabel(month: number): string {
  return new Date(2000, month - 1, 1).toLocaleString('es-AR', { month: 'long' })
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

function isDateInActiveMonth(isoDate: string, month: number, year: number): boolean {
  const [y, m] = isoDate.split('-').map(Number)
  return y === year && m === month
}

function doesRangeOverlapActiveMonth(startIso: string, endIso: string, month: number, year: number): boolean {
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
  const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(
    new Date(year, month, 0).getDate(),
  ).padStart(2, '0')}`

  return !(endIso < monthStart || startIso > monthEnd)
}

function matchesMonthRule(
  ruleMonth: number | undefined,
  ruleYear: number | undefined,
  activeMonth: number,
  activeYear: number,
): boolean {
  if (ruleMonth !== undefined && ruleMonth !== activeMonth) {
    return false
  }

  if (ruleYear !== undefined && ruleYear !== activeYear) {
    return false
  }

  return true
}

function isControllerRole(role: unknown): role is ControllerRole {
  return role === 'JEFE_DEPENDENCIA' || role === 'SUPERVISOR' || role === 'INSTRUCTOR' || role === 'OPERADOR' || role === 'PRACTICANTE' || role === 'ADSCRIPTO'
}

function normalizeControllerMetadata({
  role,
  allowedShifts,
  disallowedShifts,
  preferredShifts,
  isAdscripto,
}: {
  role: ControllerRole
  allowedShifts: unknown
  disallowedShifts: unknown
  preferredShifts: unknown
  isAdscripto: unknown
}): Pick<Controller, 'allowedShifts' | 'disallowedShifts' | 'preferredShifts' | 'isAdscripto'> {
  const normalizedAllowed = parseShiftList(allowedShifts)
  const normalizedDisallowed = parseShiftList(disallowedShifts).filter(
    (shift) => !normalizedAllowed.includes(shift),
  )
  const normalizedIsAdscripto = typeof isAdscripto === 'boolean' ? isAdscripto : role === 'ADSCRIPTO'
  const normalizedPreferred = normalizedIsAdscripto ? parseShiftList(preferredShifts) : []

  return {
    allowedShifts: normalizedAllowed,
    disallowedShifts: normalizedDisallowed,
    preferredShifts: normalizedPreferred,
    isAdscripto: normalizedIsAdscripto,
  }
}

function parseShiftList(value: unknown): ShiftCode[] {
  if (!Array.isArray(value)) {
    return []
  }

  const seen = new Set<ShiftCode>()
  const result: ShiftCode[] = []

  value.forEach((item) => {
    const shift = typeof item === 'string' ? item.toUpperCase() : item
    if (!isShiftCode(shift) || seen.has(shift)) {
      return
    }

    seen.add(shift)
    result.push(shift)
  })

  return result
}

function isShiftCode(value: unknown): value is ShiftCode {
  return value === 'A' || value === 'B' || value === 'C'
}

function BlockedPage({ onGoHome }: { onGoHome: () => void }) {
  return (
    <main className="page">
      <section className="section-card empty-state">
        <p>Primero generá la lista desde Inicio.</p>
        <button className="button" onClick={onGoHome}>Ir a Inicio</button>
      </section>
    </main>
  )
}

export default App
