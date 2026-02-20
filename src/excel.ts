import * as XLSX from 'xlsx'
import { MONTH_LABELS, ROLE_OPTIONS, createEmptyData } from './defaults'
import { type ControllerRole, type MonthlySchedule, type TurneroData } from './types'

export interface ImportResult {
  data: TurneroData
  warnings: string[]
}

export function exportToExcel(data: TurneroData, schedule: MonthlySchedule, statsRows: Array<Record<string, string | number>>): void {
  const workbook = XLSX.utils.book_new()
  const monthLabel = `${MONTH_LABELS[data.month - 1]} ${data.year}`
  const dates = schedule.days.map((day) => day.date)

  const mesRows: Array<Array<string | number>> = [
    [`LISTA DE TURNOS - ${monthLabel.toUpperCase()} - EANA`],
    [],
    ['FUNCION', 'APELLIDO Y NOMBRE', ...dates.map((date) => Number(date.slice(-2))), 'CONDICIONANTE'],
  ]

  for (const controller of data.controllers) {
    const dayValues = dates.map((date) => schedule.controllerShiftByDate[controller.id]?.[date] ?? '')
    mesRows.push([
      roleToLabel(controller.role),
      controller.name,
      ...dayValues,
      controller.condition,
    ])
  }

  const mesSheet = XLSX.utils.aoa_to_sheet(mesRows)

  const statsHeader = [
    'APELLIDO Y NOMBRE',
    'CARGO',
    'TURNOS A',
    'TURNOS B',
    'TURNOS C',
    'TOTAL',
    'FIN DE SEMANA',
    'VACACIONES',
    'FERIADOS',
    'PENDIENTES',
  ]

  const statsData: Array<Array<string | number>> = [statsHeader]
  statsRows.forEach((row) => {
    statsData.push([
      String(row.nombre ?? ''),
      String(row.cargo ?? ''),
      Number(row.turnosA ?? 0),
      Number(row.turnosB ?? 0),
      Number(row.turnosC ?? 0),
      Number(row.total ?? 0),
      Number(row.finDeSemana ?? 0),
      Number(row.vacaciones ?? 0),
      Number(row.feriados ?? 0),
      Number(row.pendientes ?? 0),
    ])
  })

  const statsSheet = XLSX.utils.aoa_to_sheet(statsData)

  XLSX.utils.book_append_sheet(workbook, mesSheet, 'MES')
  XLSX.utils.book_append_sheet(workbook, statsSheet, 'ESTADISTICAS')

  XLSX.writeFile(workbook, `turnero_${data.year}_${String(data.month).padStart(2, '0')}.xlsx`)
}

export async function importFromExcel(file: File): Promise<ImportResult> {
  const warnings: string[] = []
  const arrayBuffer = await file.arrayBuffer()
  const workbook = XLSX.read(arrayBuffer, { type: 'array' })

  if (!workbook.SheetNames.length) {
    throw new Error('El archivo no contiene hojas')
  }

  const firstSheetName = workbook.SheetNames[0]
  const firstSheet = workbook.Sheets[firstSheetName]
  if (!firstSheet) {
    throw new Error('No se encontro la primera hoja')
  }

  const parsedMonth = parseMonthYearFromSheetName(firstSheetName)
  const today = new Date()
  const year = parsedMonth?.year ?? today.getFullYear()
  const month = parsedMonth?.month ?? today.getMonth() + 1

  const data = createEmptyData(year, month)
  const rows = XLSX.utils.sheet_to_json(firstSheet, {
    header: 1,
    raw: false,
    blankrows: false,
  }) as Array<Array<string | number>>

  const headerRowIndex = rows.findIndex((row) => {
    const normalized = row.map((cell) => normalize(String(cell ?? '')))
    return normalized.includes('FUNCION') && normalized.some((cell) => cell.includes('APELLIDO'))
  })

  if (headerRowIndex === -1) {
    throw new Error('No se encontro encabezado de planilla en hoja MES')
  }

  const headerRow = rows[headerRowIndex] ?? []
  const roleCol = headerRow.findIndex((cell) => normalize(String(cell ?? '')) === 'FUNCION')
  const nameCol = headerRow.findIndex((cell) => normalize(String(cell ?? '')).includes('APELLIDO'))

  if (roleCol === -1 || nameCol === -1) {
    throw new Error('No se encontraron columnas de FUNCION y APELLIDO')
  }

  const dayRows = [rows[headerRowIndex], rows[headerRowIndex + 1], rows[headerRowIndex + 2]].filter(
    (row): row is Array<string | number> => Array.isArray(row),
  )

  const dayColumnsByIndex = new Map<number, number>()
  dayRows.forEach((row) => {
    row.forEach((value, index) => {
      const day = parseInt(String(value ?? '').trim(), 10)
      if (Number.isInteger(day) && day >= 1 && day <= 31) {
        dayColumnsByIndex.set(index, day)
      }
    })
  })

  const dayColumns = Array.from(dayColumnsByIndex.entries()).map(([index, day]) => ({ index, day }))

  if (!dayColumns.length) {
    warnings.push('No se encontraron columnas de dias; se importaron solo los controladores.')
  }

  for (let rowIndex = headerRowIndex + 2; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] ?? []
    const roleRaw = String(row[roleCol] ?? '').trim()
    const nameRaw = String(row[nameCol] ?? '').trim()

    if (!roleRaw && !nameRaw) {
      continue
    }

    const normalizedName = normalize(nameRaw)
    if (normalizedName.includes('TOTAL PERSONAL')) {
      break
    }

    if (!nameRaw) {
      continue
    }

    const id = createId('controller')
    const role = mapRole(roleRaw)

    data.controllers.push({
      id,
      name: nameRaw,
      role,
      condition: '',
      pending: 0,
    })

    dayColumns.forEach(({ index, day }) => {
      const cellValue = String(row[index] ?? '').trim()
      const shift = parseShift(cellValue)
      if (!shift) {
        return
      }

      const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      data.forcedAssignments.push({
        id: createId('forced'),
        controllerId: id,
        date,
        shift,
        note: 'Importado desde Excel',
      })
    })
  }

  if (!data.controllers.length) {
    warnings.push('No se detectaron controladores en la hoja importada.')
  }

  return { data, warnings }
}

function parseMonthYearFromSheetName(name: string): { year: number; month: number } | null {
  const normalizedName = normalize(name)
  const yearMatch = normalizedName.match(/(19|20)\d{2}/)

  const monthIndex = MONTH_LABELS.findIndex((month) => normalizedName.includes(normalize(month)))
  if (monthIndex === -1) {
    return null
  }

  return {
    year: yearMatch ? Number(yearMatch[0]) : new Date().getFullYear(),
    month: monthIndex + 1,
  }
}

function mapRole(raw: string): ControllerRole {
  const value = normalize(raw)

  if (value.includes('JEFE')) {
    return 'JEFE_DEPENDENCIA'
  }

  if (value.includes('SUPERVISOR')) {
    return 'SUPERVISOR'
  }

  if (value.includes('INSTRUCTOR')) {
    return 'INSTRUCTOR'
  }

  if (value.includes('PRACTICANTE')) {
    return 'PRACTICANTE'
  }

  if (value.includes('ADSCRIPTO')) {
    return 'ADSCRIPTO'
  }

  return 'OPERADOR'
}

function parseShift(value: string): 'A' | 'B' | 'C' | null {
  const normalized = normalize(value)
  if (!normalized) {
    return null
  }

  if (normalized === 'A' || normalized.startsWith('OJTA')) {
    return 'A'
  }

  if (normalized === 'B' || normalized.startsWith('OJTB')) {
    return 'B'
  }

  if (normalized === 'C' || normalized.startsWith('OJTC')) {
    return 'C'
  }

  return null
}

function roleToLabel(role: ControllerRole): string {
  return ROLE_OPTIONS.find((item) => item.value === role)?.label ?? role
}

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toUpperCase()
    .trim()
}
