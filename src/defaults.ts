import { type Controller, type ControllerRole, type TurneroData } from './types'

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
  return {
    ...createEmptyData(year, month),
    controllers: DEFAULT_EANA_CONTROLLERS.map((controller, index) => ({
      ...controller,
      id: `ctrl-${String(index + 1).padStart(2, '0')}`,
    })),
    monthlyNotes:
      'UTC fijo -3. Regla activa: Jefe de dependencia puede asignarse en A/B, pero no en turno C.',
  }
}
