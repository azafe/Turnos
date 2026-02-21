import { useState } from 'react'
import { ROLE_OPTIONS } from '../../defaults'
import type { Controller, ControllerRole, ShiftCode } from '../../types'
import Pagination from '../Pagination'

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

interface PaginationResult<T> {
  items: T[]
  currentPage: number
  totalPages: number
  totalItems: number
  startItem: number
  endItem: number
}

interface ControllersPageProps {
  controllerQuery: string
  onControllerQueryChange: (value: string) => void
  controllerPagination: PaginationResult<Controller>
  onControllerPageChange: (nextPage: number) => void
  onAddController: (draft: ControllerDraft) => void
  onUpdateController: (controllerId: string, draft: ControllerDraft) => void
  onRemoveController: (controllerId: string) => void
}

const SHIFT_OPTIONS: ShiftCode[] = ['A', 'B', 'C']

const EMPTY_CONTROLLER_DRAFT: ControllerDraft = {
  name: '',
  role: 'OPERADOR',
  condition: '',
  pending: 0,
  allowedShifts: [],
  disallowedShifts: [],
  preferredShifts: [],
  isAdscripto: false,
}

export default function ControllersPage({
  controllerQuery,
  onControllerQueryChange,
  controllerPagination,
  onControllerPageChange,
  onAddController,
  onUpdateController,
  onRemoveController,
}: ControllersPageProps) {
  const [controllerForm, setControllerForm] = useState<ControllerDraft>(EMPTY_CONTROLLER_DRAFT)
  const [editingControllerId, setEditingControllerId] = useState<string | null>(null)
  const [editingControllerForm, setEditingControllerForm] = useState<ControllerDraft>(EMPTY_CONTROLLER_DRAFT)

  const openEditControllerModal = (controller: Controller): void => {
    setEditingControllerId(controller.id)
    setEditingControllerForm({
      name: controller.name,
      role: controller.role,
      condition: controller.condition,
      pending: controller.pending,
      allowedShifts: [...(controller.allowedShifts ?? [])],
      disallowedShifts: [...(controller.disallowedShifts ?? [])],
      preferredShifts: [...(controller.preferredShifts ?? [])],
      isAdscripto:
        typeof controller.isAdscripto === 'boolean'
          ? controller.isAdscripto
          : controller.role === 'ADSCRIPTO',
    })
  }

  const closeEditControllerModal = (): void => {
    setEditingControllerId(null)
    setEditingControllerForm(EMPTY_CONTROLLER_DRAFT)
  }

  const addControllerAndReset = (): void => {
    onAddController(controllerForm)
    setControllerForm(EMPTY_CONTROLLER_DRAFT)
  }

  return (
    <main className="page">
      <section className="section-card">
        <h2>Controladores</h2>

        <div className="search-row">
          <input
            placeholder="Buscar controlador por nombre"
            value={controllerQuery}
            onChange={(event) => onControllerQueryChange(event.target.value)}
            aria-label="Buscar controlador"
          />
          <span className="dim">
            Mostrando {controllerPagination.startItem}-{controllerPagination.endItem} de {controllerPagination.totalItems}
          </span>
        </div>

        <div className="controller-form">
          <div className="controller-form-grid">
            <input
              placeholder="Nombre"
              value={controllerForm.name}
              onChange={(event) =>
                setControllerForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              aria-label="Nombre del controlador"
            />

            <select
              value={controllerForm.role}
              onChange={(event) =>
                setControllerForm((current) => ({
                  ...current,
                  role: event.target.value as ControllerRole,
                  isAdscripto:
                    event.target.value === 'ADSCRIPTO'
                      ? true
                      : current.isAdscripto,
                }))
              }
              aria-label="Cargo del controlador"
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
              onChange={(event) =>
                setControllerForm((current) => ({
                  ...current,
                  condition: event.target.value,
                }))
              }
              aria-label="Condicionante del controlador"
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
              aria-label="Turnos pendientes"
            />

            <label className="toggle-inline">
              <input
                type="checkbox"
                checked={controllerForm.isAdscripto}
                onChange={(event) =>
                  setControllerForm((current) => ({
                    ...current,
                    isAdscripto: event.target.checked,
                    preferredShifts: event.target.checked ? current.preferredShifts : [],
                  }))
                }
                aria-label="Marcar como adscripto"
              />
              Es adscripto
            </label>
          </div>

          <div className="shift-groups">
            <ShiftPicker
              label="Turnos permitidos"
              selected={controllerForm.allowedShifts}
              onToggle={(shift) =>
                setControllerForm((current) => {
                  const nextAllowed = toggleShift(current.allowedShifts, shift)
                  return {
                    ...current,
                    allowedShifts: nextAllowed,
                    disallowedShifts: current.disallowedShifts.filter((item) => item !== shift),
                  }
                })
              }
            />

            <ShiftPicker
              label="Turnos no permitidos"
              selected={controllerForm.disallowedShifts}
              onToggle={(shift) =>
                setControllerForm((current) => {
                  const nextDisallowed = toggleShift(current.disallowedShifts, shift)
                  return {
                    ...current,
                    disallowedShifts: nextDisallowed,
                    allowedShifts: current.allowedShifts.filter((item) => item !== shift),
                    preferredShifts: current.preferredShifts.filter((item) => item !== shift),
                  }
                })
              }
            />

            {controllerForm.isAdscripto ? (
              <ShiftPicker
                label="Preferencias (solo adscripto)"
                selected={controllerForm.preferredShifts}
                onToggle={(shift) =>
                  setControllerForm((current) => {
                    if (current.disallowedShifts.includes(shift)) {
                      return current
                    }

                    const nextPreferred = toggleShift(current.preferredShifts, shift)
                    return {
                      ...current,
                      preferredShifts: nextPreferred,
                    }
                  })
                }
              />
            ) : (
              <p className="dim">Activa "Es adscripto" para cargar preferencias de turno.</p>
            )}
          </div>

          <button className="button" onClick={addControllerAndReset} aria-label="Agregar controlador">
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
                <th>Perfil</th>
                <th>Pendiente</th>
              </tr>
            </thead>
            <tbody>
              {controllerPagination.items.map((controller) => (
                <tr key={controller.id}>
                  <td>
                    <button
                      className="name-link"
                      onClick={() => openEditControllerModal(controller)}
                      aria-label={`Editar controlador ${controller.name}`}
                    >
                      {controller.name}
                    </button>
                  </td>
                  <td>
                    <RoleBadge role={controller.role} />
                  </td>
                  <td>{controller.condition || '-'}</td>
                  <td>{profileSummary(controller) || '-'}</td>
                  <td>{controller.pending}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mobile-only stack-list">
          {controllerPagination.items.map((controller) => (
            <article key={`mobile-${controller.id}`} className="stack-card">
              <div className="stack-head">
                <button
                  className="name-link"
                  onClick={() => openEditControllerModal(controller)}
                  aria-label={`Editar controlador ${controller.name}`}
                >
                  {controller.name}
                </button>
              </div>
              <div className="stack-grid">
                <p>
                  <strong>Cargo:</strong> <RoleBadge role={controller.role} compact />
                </p>
                <p>
                  <strong>Pendiente:</strong> {controller.pending}
                </p>
                <p>
                  <strong>Condicionante:</strong> {controller.condition || '-'}
                </p>
                <p>
                  <strong>Perfil:</strong> {profileSummary(controller) || '-'}
                </p>
              </div>
            </article>
          ))}
        </div>

        <Pagination
          page={controllerPagination.currentPage}
          totalPages={controllerPagination.totalPages}
          onPageChange={onControllerPageChange}
        />
      </section>

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
                  aria-label="Nombre del controlador"
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
                      isAdscripto:
                        event.target.value === 'ADSCRIPTO'
                          ? true
                          : current.isAdscripto,
                    }))
                  }
                  aria-label="Cargo del controlador"
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
                  aria-label="Condicionante del controlador"
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
                  aria-label="Turnos pendientes"
                />
              </label>

              <label className="toggle-inline">
                <input
                  type="checkbox"
                  checked={editingControllerForm.isAdscripto}
                  onChange={(event) =>
                    setEditingControllerForm((current) => ({
                      ...current,
                      isAdscripto: event.target.checked,
                      preferredShifts: event.target.checked ? current.preferredShifts : [],
                    }))
                  }
                  aria-label="Marcar como adscripto"
                />
                Es adscripto
              </label>

              <ShiftPicker
                label="Turnos permitidos"
                selected={editingControllerForm.allowedShifts}
                onToggle={(shift) =>
                  setEditingControllerForm((current) => ({
                    ...current,
                    allowedShifts: toggleShift(current.allowedShifts, shift),
                    disallowedShifts: current.disallowedShifts.filter((item) => item !== shift),
                  }))
                }
              />

              <ShiftPicker
                label="Turnos no permitidos"
                selected={editingControllerForm.disallowedShifts}
                onToggle={(shift) =>
                  setEditingControllerForm((current) => ({
                    ...current,
                    disallowedShifts: toggleShift(current.disallowedShifts, shift),
                    allowedShifts: current.allowedShifts.filter((item) => item !== shift),
                    preferredShifts: current.preferredShifts.filter((item) => item !== shift),
                  }))
                }
              />

              {editingControllerForm.isAdscripto ? (
                <ShiftPicker
                  label="Preferencias (solo adscripto)"
                  selected={editingControllerForm.preferredShifts}
                  onToggle={(shift) =>
                    setEditingControllerForm((current) => {
                      if (current.disallowedShifts.includes(shift)) {
                        return current
                      }

                      return {
                        ...current,
                        preferredShifts: toggleShift(current.preferredShifts, shift),
                      }
                    })
                  }
                />
              ) : null}
            </div>

            <div className="modal-actions">
              <button
                className="button subtle-danger"
                onClick={() => {
                  if (!editingControllerId) {
                    return
                  }
                  onRemoveController(editingControllerId)
                  closeEditControllerModal()
                }}
                aria-label="Quitar controlador"
              >
                Quitar controlador
              </button>

              <button
                className="button"
                onClick={() => {
                  if (!editingControllerId) {
                    return
                  }
                  onUpdateController(editingControllerId, editingControllerForm)
                  closeEditControllerModal()
                }}
                aria-label="Guardar cambios del controlador"
              >
                Guardar cambios
              </button>

              <button className="button ghost-dark" onClick={closeEditControllerModal} aria-label="Cancelar edición">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}

function ShiftPicker({
  label,
  selected,
  onToggle,
}: {
  label: string
  selected: ShiftCode[]
  onToggle: (shift: ShiftCode) => void
}) {
  return (
    <div className="shift-group">
      <span>{label}</span>
      <div className="shift-toggle-group" role="group" aria-label={label}>
        {SHIFT_OPTIONS.map((shift) => {
          const active = selected.includes(shift)
          return (
            <button
              key={`${label}-${shift}`}
              type="button"
              className={active ? 'shift-toggle active' : 'shift-toggle'}
              onClick={() => onToggle(shift)}
              aria-pressed={active}
              aria-label={`${label} ${shift}`}
            >
              {shift}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function toggleShift(values: ShiftCode[], shift: ShiftCode): ShiftCode[] {
  if (values.includes(shift)) {
    return values.filter((item) => item !== shift)
  }

  return [...values, shift]
}

function profileSummary(controller: Controller): string {
  const pieces: string[] = []
  const allowed = controller.allowedShifts?.length ? `Solo ${controller.allowedShifts.join('/')}` : ''
  const disallowed = controller.disallowedShifts?.length ? `No ${controller.disallowedShifts.join('/')}` : ''
  const isAdscripto = typeof controller.isAdscripto === 'boolean' ? controller.isAdscripto : controller.role === 'ADSCRIPTO'
  const preferred =
    isAdscripto && controller.preferredShifts?.length
      ? `Pref ${controller.preferredShifts.join('/')}`
      : ''

  if (allowed) {
    pieces.push(allowed)
  }

  if (disallowed) {
    pieces.push(disallowed)
  }

  if (isAdscripto) {
    pieces.push(preferred || 'Adscripto')
  }

  return pieces.join(' | ')
}

function RoleBadge({ role, compact = false }: { role: ControllerRole; compact?: boolean }) {
  const text = compact ? roleShort(role) : roleLabel(role)
  return <span className={`role-badge role-${role.toLowerCase()}`}>{text}</span>
}

function roleLabel(role: ControllerRole): string {
  return ROLE_OPTIONS.find((item) => item.value === role)?.label ?? role
}

function roleShort(role: ControllerRole): string {
  if (role === 'JEFE_DEPENDENCIA') {
    return 'JD'
  }
  if (role === 'SUPERVISOR') {
    return 'SUP'
  }
  if (role === 'INSTRUCTOR') {
    return 'INST'
  }
  if (role === 'OPERADOR') {
    return 'OP'
  }
  if (role === 'PRACTICANTE') {
    return 'PRAC'
  }
  return 'ADS'
}
