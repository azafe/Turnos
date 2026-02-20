import {
  type Controller,
  type ControllerStats,
  type MonthlySchedule,
  type ShiftCode,
  type TurneroData,
} from './types'

export const SHIFT_ORDER: ShiftCode[] = ['A', 'B', 'C']

export const SHIFT_CONFIG: Record<
  ShiftCode,
  {
    local: string
    utc: string
    defaultRequired: number
    requiresSupervisor: boolean
  }
> = {
  A: {
    local: '07:00-15:00',
    utc: '10:00-18:00',
    defaultRequired: 3,
    requiresSupervisor: true,
  },
  B: {
    local: '15:00-23:00',
    utc: '18:00-02:00',
    defaultRequired: 3,
    requiresSupervisor: true,
  },
  C: {
    local: '23:00-07:00',
    utc: '02:00-10:00',
    defaultRequired: 2,
    requiresSupervisor: false,
  },
}

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab']

interface AllocationCounter {
  total: number
  byShift: Record<ShiftCode, number>
  weekend: number
}

interface PickContext {
  shift: ShiftCode
  weekend: boolean
  preferInstructor: boolean
}

interface AvailabilityResult {
  available: boolean
  reason?: string
}

export function buildMonthDates(year: number, month: number): string[] {
  const totalDays = new Date(year, month, 0).getDate()
  return Array.from({ length: totalDays }, (_, i) => {
    const date = new Date(year, month - 1, i + 1)
    return toIsoDate(date)
  })
}

export function generateMonthlySchedule(data: TurneroData): MonthlySchedule {
  const dates = buildMonthDates(data.year, data.month)
  const controllers = data.controllers
  const counters = new Map<string, AllocationCounter>()
  const controllerShiftByDate: Record<string, Record<string, ShiftCode | ''>> = {}

  const coverageByDateShift = new Map<string, number>()
  data.coverageOverrides.forEach((item) => {
    coverageByDateShift.set(dateShiftKey(item.date, item.shift), item.required)
  })

  const forcedByDateShift = new Map<string, string[]>()
  data.forcedAssignments.forEach((item) => {
    const key = dateShiftKey(item.date, item.shift)
    const list = forcedByDateShift.get(key)
    if (list) {
      list.push(item.controllerId)
    } else {
      forcedByDateShift.set(key, [item.controllerId])
    }
  })

  controllers.forEach((controller) => {
    counters.set(controller.id, {
      total: 0,
      byShift: { A: 0, B: 0, C: 0 },
      weekend: 0,
    })

    controllerShiftByDate[controller.id] = {}
    dates.forEach((date) => {
      controllerShiftByDate[controller.id][date] = ''
    })
  })

  const days = dates.map((date) => {
    const dayIndex = dayOfWeek(date)
    const weekend = dayIndex === 0 || dayIndex === 6

    const shifts = { A: null, B: null, C: null } as unknown as MonthlySchedule['days'][number]['shifts']

    for (const shift of SHIFT_ORDER) {
      const required =
        coverageByDateShift.get(dateShiftKey(date, shift)) ?? SHIFT_CONFIG[shift].defaultRequired

      const assignedControllerIds: string[] = []
      const conflicts: string[] = []

      const forcedControllerIds = forcedByDateShift.get(dateShiftKey(date, shift)) ?? []
      for (const controllerId of forcedControllerIds) {
        const controller = controllers.find((item) => item.id === controllerId)
        if (!controller) {
          conflicts.push('Asignacion forzada con controlador inexistente.')
          continue
        }

        const availability = canAssign({
          controller,
          shift,
          date,
          data,
          controllerShiftByDate,
        })

        if (!availability.available) {
          conflicts.push(
            `${controller.name}: no se pudo cumplir asignacion forzada (${availability.reason ?? 'sin detalle'}).`,
          )
          continue
        }

        assignController({
          controller,
          shift,
          date,
          assignedControllerIds,
          counters,
          controllerShiftByDate,
        })
      }

      if (SHIFT_CONFIG[shift].requiresSupervisor && !hasSupervisor(assignedControllerIds, controllers)) {
        const supervisor = pickBestCandidate({
          candidates: controllers.filter((controller) => controller.role === 'SUPERVISOR'),
          date,
          data,
          shift,
          counters,
          controllerShiftByDate,
          context: {
            shift,
            weekend,
            preferInstructor: false,
          },
        })

        if (supervisor) {
          assignController({
            controller: supervisor,
            shift,
            date,
            assignedControllerIds,
            counters,
            controllerShiftByDate,
          })
        } else if (required > 0) {
          conflicts.push(`No hay supervisor disponible para turno ${shift}.`)
        }
      }

      while (assignedControllerIds.length < required) {
        const alreadyHasTrainee = hasTrainee(assignedControllerIds, controllers)
        const alreadyHasInstructor = hasInstructor(assignedControllerIds, controllers)

        const candidate = pickBestCandidate({
          candidates: controllers,
          date,
          data,
          shift,
          counters,
          controllerShiftByDate,
          context: {
            shift,
            weekend,
            preferInstructor: alreadyHasTrainee && !alreadyHasInstructor,
          },
        })

        if (!candidate) {
          break
        }

        assignController({
          controller: candidate,
          shift,
          date,
          assignedControllerIds,
          counters,
          controllerShiftByDate,
        })
      }

      const needsInstructor = hasTrainee(assignedControllerIds, controllers) && !hasInstructor(assignedControllerIds, controllers)
      if (needsInstructor) {
        const instructor = pickBestCandidate({
          candidates: controllers.filter((controller) => controller.role === 'INSTRUCTOR'),
          date,
          data,
          shift,
          counters,
          controllerShiftByDate,
          context: {
            shift,
            weekend,
            preferInstructor: true,
          },
        })

        if (instructor) {
          if (assignedControllerIds.length < required) {
            assignController({
              controller: instructor,
              shift,
              date,
              assignedControllerIds,
              counters,
              controllerShiftByDate,
            })
          } else {
            const replaceableId = findReplaceableController({
              assignedControllerIds,
              controllers,
              shift,
            })

            if (replaceableId) {
              const replacedController = controllers.find((item) => item.id === replaceableId)
              if (replacedController) {
                unassignController({
                  controller: replacedController,
                  shift,
                  date,
                  assignedControllerIds,
                  counters,
                  controllerShiftByDate,
                })

                assignController({
                  controller: instructor,
                  shift,
                  date,
                  assignedControllerIds,
                  counters,
                  controllerShiftByDate,
                })
              }
            } else {
              conflicts.push('Hay personal en instruccion sin instructor disponible en el turno.')
            }
          }
        } else {
          conflicts.push('Hay personal en instruccion sin instructor disponible en el turno.')
        }
      }

      if (assignedControllerIds.length < required) {
        conflicts.push(
          `Cobertura incompleta: faltan ${required - assignedControllerIds.length} controladores para turno ${shift}.`,
        )
      }

      shifts[shift] = {
        shift,
        required,
        assignedControllerIds,
        conflicts,
      }
    }

    return {
      date,
      dayLabel: DAY_LABELS[dayIndex],
      shifts,
    }
  })

  return {
    days,
    controllerShiftByDate,
  }
}

export function computeStats(data: TurneroData, schedule: MonthlySchedule): Record<string, ControllerStats> {
  const monthDates = buildMonthDates(data.year, data.month)

  return data.controllers.reduce<Record<string, ControllerStats>>((acc, controller) => {
    let shiftsA = 0
    let shiftsB = 0
    let shiftsC = 0
    let weekendShifts = 0
    let holidayShifts = 0

    for (const date of monthDates) {
      const shift = schedule.controllerShiftByDate[controller.id]?.[date]
      if (!shift) {
        continue
      }

      if (shift === 'A') {
        shiftsA += 1
      } else if (shift === 'B') {
        shiftsB += 1
      } else if (shift === 'C') {
        shiftsC += 1
      }

      if (isWeekend(date)) {
        weekendShifts += 1
      }

      if (data.holidays.some((holiday) => holiday.date === date)) {
        holidayShifts += 1
      }
    }

    const vacationDays = countVacationDays(controller.id, data, monthDates)

    acc[controller.id] = {
      controllerId: controller.id,
      shiftsA,
      shiftsB,
      shiftsC,
      totalShifts: shiftsA + shiftsB + shiftsC,
      weekendShifts,
      vacationDays,
      holidayShifts,
      pending: controller.pending,
    }

    return acc
  }, {})
}

function hasSupervisor(assignedControllerIds: string[], controllers: Controller[]): boolean {
  return assignedControllerIds.some((id) => controllers.find((controller) => controller.id === id)?.role === 'SUPERVISOR')
}

function hasInstructor(assignedControllerIds: string[], controllers: Controller[]): boolean {
  return assignedControllerIds.some((id) => controllers.find((controller) => controller.id === id)?.role === 'INSTRUCTOR')
}

function hasTrainee(assignedControllerIds: string[], controllers: Controller[]): boolean {
  return assignedControllerIds.some(
    (id) => controllers.find((item) => item.id === id)?.role === 'PRACTICANTE',
  )
}

function findReplaceableController({
  assignedControllerIds,
  controllers,
  shift,
}: {
  assignedControllerIds: string[]
  controllers: Controller[]
  shift: ShiftCode
}): string | undefined {
  const withRole = assignedControllerIds
    .map((id) => controllers.find((controller) => controller.id === id))
    .filter((controller): controller is Controller => Boolean(controller))

  const candidates = withRole.filter((controller) => {
    if (controller.role === 'INSTRUCTOR') {
      return false
    }

    if (SHIFT_CONFIG[shift].requiresSupervisor && controller.role === 'SUPERVISOR') {
      return false
    }

    return true
  })

  return candidates.at(0)?.id
}

function pickBestCandidate({
  candidates,
  date,
  data,
  shift,
  counters,
  controllerShiftByDate,
  context,
}: {
  candidates: Controller[]
  date: string
  data: TurneroData
  shift: ShiftCode
  counters: Map<string, AllocationCounter>
  controllerShiftByDate: Record<string, Record<string, ShiftCode | ''>>
  context: PickContext
}): Controller | undefined {
  const available = candidates.filter((controller) =>
    canAssign({
      controller,
      shift,
      date,
      data,
      controllerShiftByDate,
    }).available,
  )

  available.sort((a, b) => {
    const counterA = counters.get(a.id)
    const counterB = counters.get(b.id)

    if (!counterA || !counterB) {
      return 0
    }

    if (context.preferInstructor) {
      const instructorDiff = rolePriority(a, true) - rolePriority(b, true)
      if (instructorDiff !== 0) {
        return instructorDiff
      }
    }

    const scoreA = fairnessScore({
      controller: a,
      counter: counterA,
      shift: context.shift,
      weekend: context.weekend,
    })
    const scoreB = fairnessScore({
      controller: b,
      counter: counterB,
      shift: context.shift,
      weekend: context.weekend,
    })
    const totalDiff = scoreA - scoreB
    if (totalDiff !== 0) {
      return totalDiff
    }

    const roleDiff = rolePriority(a, false) - rolePriority(b, false)
    if (roleDiff !== 0) {
      return roleDiff
    }

    return a.name.localeCompare(b.name, 'es')
  })

  return available[0]
}

function rolePriority(controller: Controller, preferInstructor: boolean): number {
  if (preferInstructor && controller.role === 'INSTRUCTOR') {
    return 0
  }

  if (controller.role === 'OPERADOR') {
    return 1
  }

  if (controller.role === 'INSTRUCTOR') {
    return 2
  }

  if (controller.role === 'ADSCRIPTO') {
    return 3
  }

  if (controller.role === 'JEFE_DEPENDENCIA') {
    return 4
  }

  if (controller.role === 'SUPERVISOR') {
    return 5
  }

  return 6
}

function canAssign({
  controller,
  shift,
  date,
  data,
  controllerShiftByDate,
}: {
  controller: Controller
  shift: ShiftCode
  date: string
  data: TurneroData
  controllerShiftByDate: Record<string, Record<string, ShiftCode | ''>>
}): AvailabilityResult {
  if (controllerShiftByDate[controller.id]?.[date]) {
    return { available: false, reason: 'ya tiene otro turno ese dia' }
  }

  if (controller.role === 'JEFE_DEPENDENCIA' && shift === 'C') {
    return { available: false, reason: 'jefa/jefe no realiza turno C' }
  }

  const dateDay = dayOfWeek(date)
  const hasWeekdayBlock = data.weekdayBlocks.some(
    (item) => item.controllerId === controller.id && item.weekday === dateDay && item.shift === shift,
  )

  if (hasWeekdayBlock) {
    return { available: false, reason: 'bloqueado por regla semanal' }
  }

  const hasDateBlock = data.dateBlocks.some(
    (item) => item.controllerId === controller.id && item.date === date && item.shift === shift,
  )

  if (hasDateBlock) {
    return { available: false, reason: 'bloqueado por fecha puntual' }
  }

  const onVacation = data.vacations.some(
    (item) => item.controllerId === controller.id && isDateInRange(date, item.startDate, item.endDate),
  )

  if (onVacation) {
    return { available: false, reason: 'vacaciones/licencia' }
  }

  if (shift === 'A') {
    const previousDate = toIsoDate(addDays(new Date(`${date}T00:00:00`), -1))
    if (controllerShiftByDate[controller.id]?.[previousDate] === 'C') {
      return { available: false, reason: 'descanso minimo tras turno C nocturno' }
    }
  }

  return { available: true }
}

function assignController({
  controller,
  shift,
  date,
  assignedControllerIds,
  counters,
  controllerShiftByDate,
}: {
  controller: Controller
  shift: ShiftCode
  date: string
  assignedControllerIds: string[]
  counters: Map<string, AllocationCounter>
  controllerShiftByDate: Record<string, Record<string, ShiftCode | ''>>
}): void {
  if (assignedControllerIds.includes(controller.id)) {
    return
  }

  assignedControllerIds.push(controller.id)
  controllerShiftByDate[controller.id][date] = shift

  const counter = counters.get(controller.id)
  if (!counter) {
    return
  }

  counter.total += 1
  counter.byShift[shift] += 1

  if (isWeekend(date)) {
    counter.weekend += 1
  }
}

function unassignController({
  controller,
  shift,
  date,
  assignedControllerIds,
  counters,
  controllerShiftByDate,
}: {
  controller: Controller
  shift: ShiftCode
  date: string
  assignedControllerIds: string[]
  counters: Map<string, AllocationCounter>
  controllerShiftByDate: Record<string, Record<string, ShiftCode | ''>>
}): void {
  const index = assignedControllerIds.findIndex((id) => id === controller.id)
  if (index === -1) {
    return
  }

  assignedControllerIds.splice(index, 1)
  controllerShiftByDate[controller.id][date] = ''

  const counter = counters.get(controller.id)
  if (!counter) {
    return
  }

  counter.total = Math.max(0, counter.total - 1)
  counter.byShift[shift] = Math.max(0, counter.byShift[shift] - 1)

  if (isWeekend(date)) {
    counter.weekend = Math.max(0, counter.weekend - 1)
  }
}

function countVacationDays(controllerId: string, data: TurneroData, monthDates: string[]): number {
  let total = 0
  for (const date of monthDates) {
    if (data.vacations.some((vacation) => vacation.controllerId === controllerId && isDateInRange(date, vacation.startDate, vacation.endDate))) {
      total += 1
    }
  }
  return total
}

function dayOfWeek(date: string): number {
  return new Date(`${date}T00:00:00`).getDay()
}

function isWeekend(date: string): boolean {
  const day = dayOfWeek(date)
  return day === 0 || day === 6
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

function dateShiftKey(date: string, shift: ShiftCode): string {
  return `${date}__${shift}`
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isDateInRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end
}

function fairnessScore({
  controller,
  counter,
  shift,
  weekend,
}: {
  controller: Controller
  counter: AllocationCounter
  shift: ShiftCode
  weekend: boolean
}): number {
  const weekendPenalty = weekend ? counter.weekend * 8 : 0
  const shiftPenalty = counter.byShift[shift] * 16
  const totalPenalty = counter.total * 24
  const rolePenalty = controller.role === 'SUPERVISOR' ? 7 : controller.role === 'JEFE_DEPENDENCIA' ? 6 : 0
  return totalPenalty + shiftPenalty + weekendPenalty + rolePenalty
}
