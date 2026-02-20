export type ShiftCode = 'A' | 'B' | 'C'

export type ControllerRole =
  | 'JEFE_DEPENDENCIA'
  | 'SUPERVISOR'
  | 'INSTRUCTOR'
  | 'OPERADOR'
  | 'PRACTICANTE'
  | 'ADSCRIPTO'

export interface Controller {
  id: string
  name: string
  role: ControllerRole
  condition: string
  pending: number
}

export interface CoverageOverride {
  id: string
  date: string
  shift: ShiftCode
  required: number
  note: string
}

export interface VacationConstraint {
  id: string
  controllerId: string
  startDate: string
  endDate: string
  note: string
}

export interface WeekdayBlockConstraint {
  id: string
  controllerId: string
  weekday: number
  shift: ShiftCode
  note: string
  month?: number
  year?: number
}

export interface DateBlockConstraint {
  id: string
  controllerId: string
  date: string
  shift: ShiftCode
  note: string
}

export interface ForcedAssignment {
  id: string
  controllerId: string
  date: string
  shift: ShiftCode
  note: string
}

export interface Holiday {
  id: string
  date: string
  name: string
}

export interface TurneroData {
  year: number
  month: number
  controllers: Controller[]
  coverageOverrides: CoverageOverride[]
  vacations: VacationConstraint[]
  weekdayBlocks: WeekdayBlockConstraint[]
  dateBlocks: DateBlockConstraint[]
  forcedAssignments: ForcedAssignment[]
  holidays: Holiday[]
  monthlyNotes: string
}

export interface ShiftPlan {
  shift: ShiftCode
  required: number
  assignedControllerIds: string[]
  conflicts: string[]
}

export interface DayPlan {
  date: string
  dayLabel: string
  shifts: Record<ShiftCode, ShiftPlan>
}

export interface MonthlySchedule {
  days: DayPlan[]
  controllerShiftByDate: Record<string, Record<string, ShiftCode | ''>>
}

export interface ControllerStats {
  controllerId: string
  shiftsA: number
  shiftsB: number
  shiftsC: number
  totalShifts: number
  weekendShifts: number
  vacationDays: number
  holidayShifts: number
  pending: number
}
