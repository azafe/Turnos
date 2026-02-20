import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { MONTH_LABELS, ROLE_OPTIONS } from './defaults'
import { SHIFT_CONFIG } from './scheduler'
import { type ControllerRole, type MonthlySchedule, type TurneroData } from './types'

export function exportToPdf(
  data: TurneroData,
  schedule: MonthlySchedule,
  statsRows: Array<Record<string, string | number>>,
): void {
  const monthLabel = `${MONTH_LABELS[data.month - 1]} ${data.year}`
  const dates = schedule.days.map((day) => day.date)

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a3',
  })

  doc.setFontSize(14)
  doc.text(`LISTA DE TURNOS - ${monthLabel.toUpperCase()} - EANA`, 28, 34)

  doc.setFontSize(9)
  doc.text(
    `A ${SHIFT_CONFIG.A.local} (local) / ${SHIFT_CONFIG.A.utc} UTC | B ${SHIFT_CONFIG.B.local} / ${SHIFT_CONFIG.B.utc} UTC | C ${SHIFT_CONFIG.C.local} / ${SHIFT_CONFIG.C.utc} UTC`,
    28,
    52,
  )

  const mesHead = [['Funcion', 'Apellido y nombre', ...dates.map((date) => Number(date.slice(-2))), 'Condicionante']]
  const mesBody = data.controllers.map((controller) => {
    const dayValues = dates.map((date) => schedule.controllerShiftByDate[controller.id]?.[date] ?? '')
    return [roleToLabel(controller.role), controller.name, ...dayValues, controller.condition || '']
  })

  autoTable(doc, {
    head: mesHead,
    body: mesBody,
    startY: 68,
    margin: { left: 24, right: 24 },
    theme: 'grid',
    styles: {
      fontSize: 6.9,
      cellPadding: 2,
      overflow: 'linebreak',
      valign: 'middle',
    },
    headStyles: {
      fillColor: [220, 232, 239],
      textColor: [22, 36, 47],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 86 },
      1: { cellWidth: 162 },
      [mesHead[0].length - 1]: { cellWidth: 132 },
    },
  })

  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 68
  if (data.monthlyNotes.trim()) {
    doc.setFontSize(8.2)
    doc.text(`Condicionantes del mes: ${data.monthlyNotes}`, 28, finalY + 18)
  }

  doc.addPage('a4', 'landscape')
  doc.setFontSize(13)
  doc.text(`ESTADISTICAS - ${monthLabel.toUpperCase()}`, 28, 32)

  const statsHead = [[
    'Apellido y nombre',
    'Cargo',
    'Turnos A',
    'Turnos B',
    'Turnos C',
    'Total',
    'Fin de semana',
    'Vacaciones',
    'Feriados',
    'Pendientes',
  ]]

  const statsBody = statsRows.map((row) => [
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

  autoTable(doc, {
    head: statsHead,
    body: statsBody,
    startY: 46,
    margin: { left: 24, right: 24 },
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 4,
    },
    headStyles: {
      fillColor: [220, 232, 239],
      textColor: [22, 36, 47],
      fontStyle: 'bold',
    },
  })

  doc.save(`turnero_${data.year}_${String(data.month).padStart(2, '0')}.pdf`)
}

function roleToLabel(role: ControllerRole): string {
  return ROLE_OPTIONS.find((item) => item.value === role)?.label ?? role
}
