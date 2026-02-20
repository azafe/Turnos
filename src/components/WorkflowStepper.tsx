interface WorkflowStepperProps {
  monthConstraintsCount: number
  hasSchedule: boolean
  onStep1: () => void
  onStep2: () => void
  onStep3: () => void
}

export default function WorkflowStepper({
  monthConstraintsCount,
  hasSchedule,
  onStep1,
  onStep2,
  onStep3,
}: WorkflowStepperProps) {
  return (
    <section className="workflow-strip" aria-label="Flujo operativo">
      <button
        className={monthConstraintsCount > 0 ? 'workflow-step done' : 'workflow-step'}
        onClick={onStep1}
        aria-label="Paso 1: cargar condicionantes"
      >
        <strong>1. Cargar condicionantes</strong>
        <span>{monthConstraintsCount > 0 ? `${monthConstraintsCount} cargados` : 'Sin condicionantes'}</span>
      </button>
      <button
        className={hasSchedule ? 'workflow-step done' : 'workflow-step active'}
        onClick={onStep2}
        aria-label="Paso 2: generar lista mensual"
      >
        <strong>2. Generar lista mensual</strong>
        <span>{hasSchedule ? 'Lista generada' : 'Pendiente de generar'}</span>
      </button>
      <button
        className={hasSchedule ? 'workflow-step active' : 'workflow-step'}
        onClick={onStep3}
        aria-label="Paso 3: revisar agenda y estadisticas"
      >
        <strong>3. Revisar agenda y estadisticas</strong>
        <span>{hasSchedule ? 'Ir a agenda' : 'Disponible tras generar lista'}</span>
      </button>
    </section>
  )
}
