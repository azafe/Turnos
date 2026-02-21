import { type Controller, type ControllerRole, type ShiftCode, type TurneroData } from './types'

export const ROLE_OPTIONS: { value: ControllerRole; label: string }[] = [
  { value: 'JEFE_DEPENDENCIA', label: 'Jefe dependencia' },
  { value: 'SUPERVISOR', label: 'Supervisor' },
  { value: 'INSTRUCTOR', label: 'Instructor' },
  { value: 'OPERADOR', label: 'Operador' },
  { value: 'PRACTICANTE', label: 'Practicante' },
  { value: 'ADSCRIPTO', label: 'Adscripto' },
]

export const WEEKDAY_OPTIONS = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miercoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sabado' },
]

export const MONTH_LABELS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

export function createEmptyData(year: number, month: number): TurneroData {
  return {
    year,
    month,
    controllers: [],
    coverageOverrides: [],
    vacations: [],
    weekdayBlocks: [],
    dateBlocks: [],
    forcedAssignments: [],
    holidays: [],
    monthlyNotes: '',
  }
}

const DEFAULT_EANA_CONTROLLERS: Array<Omit<Controller, 'id'>> = [
  { name: 'PERSIA, MARIA EMILIA', role: 'JEFE_DEPENDENCIA', condition: '', pending: 0 },
  { name: 'BLANCAT, MARTIN GUSTAVO', role: 'INSTRUCTOR', condition: '', pending: 0 },
  { name: 'LOPEZ, DANIEL JOSIAS', role: 'INSTRUCTOR', condition: '', pending: 0 },
  { name: 'MENDEZ, SILVIA LORENA', role: 'INSTRUCTOR', condition: '', pending: 0 },
  { name: 'MIRANDA, ANDRES DE REYES', role: 'SUPERVISOR', condition: '', pending: 0 },
  { name: 'MOLINA, GUILLERMO', role: 'SUPERVISOR', condition: '', pending: 0 },
  { name: 'PEDROSO, ROMINA', role: 'SUPERVISOR', condition: '', pending: 0 },
  { name: 'BARRERA, LUCIANO JULIAN', role: 'OPERADOR', condition: '', pending: 0 },
  { name: 'BAZAN NYBROE, LEANDRO MARTIN', role: 'OPERADOR', condition: '', pending: 0 },
  { name: 'BRANDI, LUCIANO ANDRES', role: 'OPERADOR', condition: '', pending: 0 },
  { name: 'CATTANEO, CARLA GISELLA', role: 'OPERADOR', condition: '', pending: 0 },
  { name: 'CHAPOR, SOFIA NAHIR', role: 'OPERADOR', condition: '', pending: 0 },
  { name: 'FERRARI, CLAUDIO GABRIEL', role: 'OPERADOR', condition: '', pending: 0 },
  { name: 'OSSOLA, MAURICIO JOSE', role: 'OPERADOR', condition: '', pending: 0 },
  { name: 'PINTOS, JUANA MARIA JOAQUINA', role: 'OPERADOR', condition: '', pending: 0 },
  { name: 'TEJADA, GASPAR', role: 'OPERADOR', condition: '', pending: 0 },
  { name: 'TOMO, JORGE ALBERTO', role: 'OPERADOR', condition: '', pending: 0 },
  { name: 'BELASCUAIN, MARIA BERNARDITA', role: 'PRACTICANTE', condition: '', pending: 0 },
  { name: 'ALBARRACIN, ALEJANDRO', role: 'ADSCRIPTO', condition: '', pending: 0 },
  { name: 'SIAREZ, MARIA CECILIA', role: 'ADSCRIPTO', condition: '', pending: 0 },
]

export function createSeedData(year: number, month: number): TurneroData {
  const baseControllers = DEFAULT_EANA_CONTROLLERS.map((controller, index) => ({
    ...controller,
    id: `ctrl-${String(index + 1).padStart(2, '0')}`,
    allowedShifts: [] as ShiftCode[],
    disallowedShifts: [] as ShiftCode[],
    preferredShifts: [] as ShiftCode[],
    isAdscripto: controller.role === 'ADSCRIPTO',
  }))

  const controllers = applyPersonalConditionSeeds(baseControllers)

  return {
    ...createEmptyData(year, month),
    controllers,
    monthlyNotes:
      'UTC fijo -3. Regla activa: Jefe de dependencia puede asignarse en A/B, pero no en turno C.',
  }
}

const PERSONAL_SEED_RULES: Array<{
  match: string
  patch: Partial<Pick<Controller, 'allowedShifts' | 'disallowedShifts' | 'isAdscripto' | 'preferredShifts'>>
}> = [
  { match: 'tomo', patch: { allowedShifts: ['B'] } },
  { match: 'ferrari', patch: { disallowedShifts: ['C'] } },
  { match: 'albarracin', patch: { allowedShifts: ['C'], isAdscripto: true } },
  { match: 'siarez', patch: { allowedShifts: ['A'], isAdscripto: true } },
  { match: 'persia', patch: { allowedShifts: ['A'] } },
]

function applyPersonalConditionSeeds(controllers: Controller[]): Controller[] {
  const seededControllers = controllers.map((controller) => ({
    ...controller,
    allowedShifts: uniqueShiftList(controller.allowedShifts ?? []),
    disallowedShifts: uniqueShiftList(controller.disallowedShifts ?? []),
    preferredShifts: uniqueShiftList(controller.preferredShifts ?? []),
    isAdscripto: controller.isAdscripto ?? controller.role === 'ADSCRIPTO',
  }))

  for (const rule of PERSONAL_SEED_RULES) {
    const index = seededControllers.findIndex((controller) =>
      normalizeName(controller.name).includes(rule.match),
    )

    if (index === -1) {
      if (import.meta.env.DEV) {
        console.warn(`[seed] No se encontró controlador para regla "${rule.match}"`)
      }
      continue
    }

    const controller = seededControllers[index]
    seededControllers[index] = {
      ...controller,
      ...rule.patch,
      allowedShifts: uniqueShiftList(rule.patch.allowedShifts ?? controller.allowedShifts ?? []),
      disallowedShifts: uniqueShiftList(rule.patch.disallowedShifts ?? controller.disallowedShifts ?? []),
      preferredShifts: uniqueShiftList(rule.patch.preferredShifts ?? controller.preferredShifts ?? []),
      isAdscripto: rule.patch.isAdscripto ?? controller.isAdscripto,
    }
  }

  return seededControllers
}

function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function uniqueShiftList(values: ShiftCode[]): ShiftCode[] {
  const seen = new Set<ShiftCode>()
  const result: ShiftCode[] = []

  values.forEach((shift) => {
    if (!seen.has(shift)) {
      seen.add(shift)
      result.push(shift)
    }
  })

  return result
}
